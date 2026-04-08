import type { IncomingMessage, ServerResponse } from "node:http";
import {
  registerPluginHttpRoute,
  readRequestBodyWithLimit,
  isRequestBodyLimitError,
} from "openclaw/plugin-sdk";
import { extractOdooWebhookHeaders, verifyOdooOutboundSignature } from "./signature.js";
import { handleOdooDiscussInbound } from "./inbound.js";
import { resolveOdooDiscussAccount } from "./accounts.js";
import { getOdooDiscussRuntime } from "./runtime.js";
import type {
  CoreConfig,
  OdooDiscussWebhookPayload,
  OdooDiscussInboundMessage,
} from "./types.js";

const WEBHOOK_PATH = "/odoo-discuss/webhook";
const MAX_BODY_BYTES = 1024 * 1024;
const BODY_TIMEOUT_MS = 30_000;

/** Dedupe set to avoid processing the same message twice. */
const recentMessageIds = new Set<string>();
const DEDUPE_MAX = 1000;

function dedupeKey(payload: OdooDiscussWebhookPayload): string {
  return `${payload.channel_id}:${payload.message_id}`;
}

function isDuplicate(key: string): boolean {
  if (recentMessageIds.has(key)) {
    return true;
  }
  recentMessageIds.add(key);
  if (recentMessageIds.size > DEDUPE_MAX) {
    const first = recentMessageIds.values().next().value;
    if (first) recentMessageIds.delete(first);
  }
  setTimeout(() => recentMessageIds.delete(key), 24 * 60 * 60 * 1000).unref();
  return false;
}

function writeJson(res: ServerResponse, status: number, body?: Record<string, unknown>): void {
  if (body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
    return;
  }
  res.writeHead(status);
  res.end();
}

function stripHtml(html: string): string {
  // Simple HTML tag strip for Discuss messages
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function parsePayload(body: string): OdooDiscussWebhookPayload | null {
  try {
    const data = JSON.parse(body);
    if (!data.channel_id || !data.message_id || !data.body) {
      return null;
    }
    if (data.event !== "message_posted") {
      return null;
    }
    return data as OdooDiscussWebhookPayload;
  } catch {
    return null;
  }
}

function payloadToInbound(payload: OdooDiscussWebhookPayload): OdooDiscussInboundMessage {
  return {
    channelId: String(payload.channel_id),
    channelName: payload.channel_name || `channel-${payload.channel_id}`,
    authorId: payload.author_id != null ? String(payload.author_id) : "unknown",
    authorName: payload.author_name || "",
    messageId: String(payload.message_id),
    body: stripHtml(payload.body),
    timestamp: Date.now(),
  };
}

/**
 * Register the webhook route on the Gateway HTTP server.
 */
export function registerOdooDiscussWebhookRoute(cfg: CoreConfig): () => void {
  const core = getOdooDiscussRuntime();
  const logger = core.logging.getChildLogger({ channel: "odoo-discuss" });

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (req.method !== "POST") {
      writeJson(res, 405, { error: "Method not allowed" });
      return true;
    }

    try {
      let body: string;
      try {
        body = await readRequestBodyWithLimit(req, {
          maxBytes: MAX_BODY_BYTES,
          timeoutMs: BODY_TIMEOUT_MS,
        });
      } catch (err) {
        if (isRequestBodyLimitError(err, "PAYLOAD_TOO_LARGE")) {
          writeJson(res, 413, { error: "Payload too large" });
          return true;
        }
        writeJson(res, 408, { error: "Request timeout" });
        return true;
      }

      // Verify HMAC signature
      const account = resolveOdooDiscussAccount({ cfg });
      if (!account.hmacSecret) {
        logger.warn("odoo-discuss: hmacSecret not configured, rejecting webhook");
        writeJson(res, 500, { error: "Server not configured" });
        return true;
      }

      const webhookHeaders = extractOdooWebhookHeaders(
        req.headers as Record<string, string | string[] | undefined>,
      );
      if (!webhookHeaders) {
        logger.warn("odoo-discuss: missing X-OpenClaw-Signature or X-OpenClaw-Timestamp header");
        writeJson(res, 400, { error: "Missing signature headers" });
        return true;
      }

      logger.info(`odoo-discuss: DEBUG signature=${webhookHeaders.signature} timestamp=${webhookHeaders.timestamp} bodyLen=${body.length} body=${body.substring(0, 300)}`);

      const isValid = verifyOdooOutboundSignature({
        signature: webhookHeaders.signature,
        timestamp: webhookHeaders.timestamp,
        body,
        secret: account.hmacSecret,
      });
      if (!isValid) {
        logger.warn("odoo-discuss: invalid HMAC signature");
        writeJson(res, 401, { error: "Invalid signature" });
        return true;
      }

      // Parse payload
      const payload = parsePayload(body);
      if (!payload) {
        // Not a message_posted event or invalid format — acknowledge silently
        writeJson(res, 200, { status: "ignored" });
        return true;
      }

      // Only process AI-enabled channels
      if (!payload.is_ai_channel) {
        writeJson(res, 200, { status: "not_ai_channel" });
        return true;
      }

      // Deduplicate
      const key = dedupeKey(payload);
      if (isDuplicate(key)) {
        logger.warn(`odoo-discuss: duplicate webhook ignored: ${key}`);
        writeJson(res, 200, { status: "duplicate" });
        return true;
      }

      // Respond immediately, then process async
      writeJson(res, 200, { status: "ok" });

      const message = payloadToInbound(payload);

      core.channel.activity.record({
        channel: "odoo-discuss",
        accountId: account.accountId,
        direction: "inbound",
        at: message.timestamp,
      });

      logger.info(`odoo-discuss: dispatching inbound message=${message.messageId} channel=${message.channelId} author=${message.authorId} body=${message.body.substring(0, 100)}`);

      handleOdooDiscussInbound({
        message,
        account,
        config: cfg,
      }).then(() => {
        logger.info(`odoo-discuss: inbound handling completed for message=${message.messageId}`);
      }).catch((err) => {
        logger.error(`odoo-discuss: inbound handling failed: ${String(err)}\n${(err as Error)?.stack ?? ""}`);
      });

      return true;
    } catch (err) {
      logger.error(`odoo-discuss: webhook error: ${String(err)}`);
      writeJson(res, 500, { error: "Internal server error" });
      return true;
    }
  };

  const unregister = registerPluginHttpRoute({
    path: WEBHOOK_PATH,
    handler,
    auth: "none",
    match: "exact",
    pluginId: "odoo-discuss",
    source: "odoo-discuss-webhook",
    replaceExisting: true,
    log: (msg) => logger.info(msg),
  });

  logger.info(`odoo-discuss: webhook registered at ${WEBHOOK_PATH}`);
  return unregister;
}
