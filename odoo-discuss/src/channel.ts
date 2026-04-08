import type { ChannelPlugin, OpenClawConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import {
  resolveOdooDiscussAccount,
  listOdooDiscussAccountIds,
  resolveDefaultOdooDiscussAccountId,
} from "./accounts.js";
import { isOdooDiscussConfigured } from "./config-schema.js";
import { registerOdooDiscussWebhookRoute } from "./gateway.js";
import { getOdooDiscussRuntime } from "./runtime.js";
import { sendMessageOdooDiscuss } from "./send.js";
import type { CoreConfig, ResolvedOdooDiscussAccount } from "./types.js";

export const odooDiscussPlugin: ChannelPlugin<ResolvedOdooDiscussAccount> = {
  id: "odoo-discuss",
  meta: {
    id: "odoo-discuss",
    label: "Odoo Discuss",
    selectionLabel: "Odoo Discuss (self-hosted)",
    aliases: ["odoo"],
    order: 70,
  },
  capabilities: {
    chatTypes: ["group"],
    reactions: false,
    threads: false,
    media: false,
    nativeCommands: false,
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.odoo-discuss"] },
  config: {
    listAccountIds: (cfg) => listOdooDiscussAccountIds(cfg as CoreConfig),
    resolveAccount: (cfg, accountId) =>
      resolveOdooDiscussAccount({ cfg: cfg as CoreConfig, accountId }),
    defaultAccountId: (cfg) => resolveDefaultOdooDiscussAccountId(cfg as CoreConfig),
    isConfigured: (account) =>
      Boolean(
        account.odooUrl?.trim() &&
          account.hmacSecret?.trim(),
      ),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(
        account.odooUrl?.trim() &&
          account.hmacSecret?.trim(),
      ),
      odooUrl: account.odooUrl ? "[set]" : "[missing]",
    }),
  },
  security: {
    resolveDmPolicy: ({ account }) => ({
      policy: account.config.dmPolicy ?? "open",
      allowFrom: account.config.allowFrom ?? [],
      policyPath: "channels.odoo-discuss.dmPolicy",
      allowFromPath: "channels.odoo-discuss.",
      normalizeEntry: (raw) => raw.replace(/^odoo-discuss:/i, "").toLowerCase(),
    }),
    collectWarnings: () => [],
  },
  groups: {
    resolveRequireMention: ({ cfg, groupId }) => {
      const account = resolveOdooDiscussAccount({ cfg: cfg as CoreConfig });
      const rooms = account.config.rooms;
      if (!rooms || !groupId) {
        return true;
      }
      const roomConfig = rooms[groupId];
      if (roomConfig?.requireMention !== undefined) {
        return roomConfig.requireMention;
      }
      const wildcardConfig = rooms["*"];
      if (wildcardConfig?.requireMention !== undefined) {
        return wildcardConfig.requireMention;
      }
      return true;
    },
  },
  messaging: {
    normalizeTarget: (raw) => {
      const trimmed = (raw ?? "").trim().toLowerCase();
      if (!trimmed) return undefined;
      const stripped = trimmed
        .replace(/^odoo-discuss:/, "")
        .replace(/^odoo:/, "")
        .trim();
      return stripped ? `odoo-discuss:${stripped}` : undefined;
    },
    targetResolver: {
      looksLikeId: (raw) => /^\d+$/.test(raw.replace(/^(odoo-discuss|odoo):/, "").trim()),
      hint: "<channelId>",
    },
  },
  outbound: {
    deliveryMode: "direct",
    chunker: (text, limit) => getOdooDiscussRuntime().channel.text.chunkMarkdownText(text, limit),
    chunkerMode: "markdown",
    textChunkLimit: 4000,
    sendText: async ({ cfg, to, text, accountId }) => {
      const result = await sendMessageOdooDiscuss(to, text, {
        accountId: accountId ?? undefined,
        cfg: cfg as CoreConfig,
      });
      return { channel: "odoo-discuss", ...result };
    },
  },
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      mode: "webhook",
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
    }),
    buildAccountSnapshot: ({ account, runtime }) => {
      const configured = Boolean(
        account.odooUrl?.trim() &&
          account.hmacSecret?.trim(),
      );
      return {
        accountId: account.accountId,
        name: account.name,
        enabled: account.enabled,
        configured,
        odooUrl: account.odooUrl ? "[set]" : "[missing]",
        running: runtime?.running ?? false,
        lastStartAt: runtime?.lastStartAt ?? null,
        lastStopAt: runtime?.lastStopAt ?? null,
        lastError: runtime?.lastError ?? null,
        mode: "webhook",
        lastInboundAt: runtime?.lastInboundAt ?? null,
        lastOutboundAt: runtime?.lastOutboundAt ?? null,
      };
    },
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      if (!account.odooUrl || !account.hmacSecret) {
        throw new Error(
          `Odoo Discuss not configured for account "${account.accountId}" (missing odooUrl or hmacSecret)`,
        );
      }

      ctx.log?.info(`[${account.accountId}] starting Odoo Discuss webhook handler`);

      const unregister = registerOdooDiscussWebhookRoute(ctx.cfg as CoreConfig);

      ctx.setStatus({ accountId: ctx.accountId, running: true, lastStartAt: Date.now() });

      // Wait for account lifecycle to end
      await new Promise<void>((resolve) => {
        if (ctx.abortSignal?.aborted) {
          resolve();
          return;
        }
        ctx.abortSignal?.addEventListener("abort", () => resolve(), { once: true });
      });

      unregister();
    },
  },
};
