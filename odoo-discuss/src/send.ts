import { resolveOdooDiscussAccount } from "./accounts.js";
import { getOdooDiscussRuntime } from "./runtime.js";
import { generateOdooInboundSignature } from "./signature.js";
import type { CoreConfig, OdooDiscussSendResult } from "./types.js";

type OdooDiscussSendOpts = {
  accountId?: string;
  cfg?: CoreConfig;
};

/**
 * Send a message to an Odoo Discuss channel via the openclaw_bridge inbound webhook.
 *
 * Odoo's inbound webhook is a `type='json'` controller, which expects JSON-RPC format:
 *   {"jsonrpc": "2.0", "method": "call", "params": {...}}
 *
 * Authentication is via HMAC-SHA256 signature of the raw body.
 */
export async function sendMessageOdooDiscuss(
  to: string,
  text: string,
  opts: OdooDiscussSendOpts = {},
): Promise<OdooDiscussSendResult> {
  const cfg = (opts.cfg ?? getOdooDiscussRuntime().config.loadConfig()) as CoreConfig;
  const account = resolveOdooDiscussAccount({ cfg, accountId: opts.accountId });

  if (!account.odooUrl) {
    throw new Error("Odoo Discuss odooUrl not configured");
  }
  if (!account.hmacSecret) {
    throw new Error("Odoo Discuss hmacSecret not configured");
  }
  if (!text?.trim()) {
    throw new Error("Message must be non-empty for Odoo Discuss sends");
  }

  const channelId = normalizeChannelId(to);

  // Build the params for the Odoo inbound webhook
  const params = {
    event: "message_received",
    channel_type: "odoo_discuss",
    channel_uid: channelId,
    body: markdownToHtml(text.trim()),
    direction: "outbound",
  };

  // Wrap in JSON-RPC format (required by Odoo type='json' controllers)
  const jsonRpcBody = JSON.stringify({
    jsonrpc: "2.0",
    method: "call",
    params,
  });

  // Sign the full raw body (Odoo's verify_signature checks HMAC of raw bytes)
  const signature = generateOdooInboundSignature({
    body: jsonRpcBody,
    secret: account.hmacSecret,
  });

  const url = `${account.odooUrl}/openclaw/webhook/inbound`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OpenClaw-Signature": signature,
    },
    body: jsonRpcBody,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Odoo Discuss send failed (${response.status}): ${errorBody}`);
  }

  // Parse JSON-RPC response
  let messageId = "unknown";
  const responseText = await response.text();
  const logger = getOdooDiscussRuntime().logging.getChildLogger({ channel: "odoo-discuss" });
  logger.info(`odoo-discuss send: response status=${response.status} body=${responseText.substring(0, 4000)}`);

  try {
    const data = JSON.parse(responseText) as {
      result?: { success?: boolean; message_id?: number; channel_id?: number; message?: string; error?: string };
      error?: { message?: string };
    };
    if (data.error) {
      throw new Error(`Odoo RPC error: ${data.error.message ?? JSON.stringify(data.error)}`);
    }
    if (data.result && !data.result.success) {
      throw new Error(`Odoo webhook error: ${data.result.error ?? data.result.message ?? "unknown"}`);
    }
    if (data.result?.message_id != null) {
      messageId = String(data.result.message_id);
    }
    logger.info(`odoo-discuss send: result messageId=${messageId} channelId=${data.result?.channel_id ?? "unknown"}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Odoo")) {
      throw err;
    }
    // JSON parsing failed but HTTP was OK
  }

  getOdooDiscussRuntime().channel.activity.record({
    channel: "odoo-discuss",
    accountId: account.accountId,
    direction: "outbound",
  });

  return { messageId, channelId };
}

/**
 * Convert Markdown text to basic HTML for Odoo Discuss message_post.
 *
 * Handles: headings, bold, italic, code blocks, inline code, lists, links, newlines.
 * Keeps it simple — no full Markdown parser needed.
 */
function markdownToHtml(md: string): string {
  let html = md;

  // Fenced code blocks (```lang\n...\n```)
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_m, code: string) => {
    return `<pre>${escapeHtml(code.trimEnd())}</pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, (_m, code: string) => `<code>${escapeHtml(code)}</code>`);

  // Headings (### h3, ## h2, # h1)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  // Italic (*text*)
  html = html.replace(/\*(.+?)\*/g, "<i>$1</i>");

  // Markdown links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered list items (- item or * item)
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Horizontal rules (--- or ***)
  html = html.replace(/^[-*]{3,}$/gm, "<hr>");

  // Newlines → <br> (but not after block elements)
  html = html.replace(/\n/g, "<br>\n");

  // Clean up excessive <br> after block elements
  html = html.replace(/(<\/(?:pre|h[1-3]|ul|li|hr)>)<br>\n/g, "$1\n");
  html = html.replace(/(<(?:pre|h[1-3]|ul|hr)[^>]*>)<br>\n/g, "$1\n");

  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeChannelId(to: string): string {
  let normalized = to.trim();
  if (normalized.startsWith("odoo-discuss:")) {
    normalized = normalized.slice("odoo-discuss:".length).trim();
  } else if (normalized.startsWith("odoo:")) {
    normalized = normalized.slice("odoo:".length).trim();
  }
  if (!normalized) {
    throw new Error("Channel ID is required for Odoo Discuss sends");
  }
  return normalized;
}
