import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { PROVIDER_ENV_MAP, SUPPORTED_PROVIDERS } from "./types.js";
import type { KeyType } from "./types.js";
import * as store from "./store.js";
import * as cache from "./cache.js";

export function registerCommands(api: OpenClawPluginApi): void {
  api.registerCommand({
    name: "setkey",
    description: "Set your personal API key or OAuth token for an AI provider.",
    acceptsArgs: true,
    requireAuth: false,
    handler: (ctx) => {
      const channel = ctx.channel;
      const userId = ctx.from ?? ctx.senderId;
      if (!userId) {
        return { text: "Could not identify your user ID." };
      }

      const args = ctx.args?.trim() ?? "";
      if (!args) {
        return {
          text: `Usage:\n  /setkey <provider> <api-key>\n  /setkey <provider> --oauth <token>\n\nSupported providers: ${SUPPORTED_PROVIDERS.join(", ")}`,
        };
      }

      const tokens = args.split(/\s+/).filter(Boolean);
      const provider = tokens[0]?.toLowerCase();

      if (!provider || !PROVIDER_ENV_MAP[provider]) {
        return {
          text: `Unknown provider "${provider}".\nSupported: ${SUPPORTED_PROVIDERS.join(", ")}`,
        };
      }

      let keyType: KeyType = "api-key";
      let credential: string | undefined;

      if (tokens[1] === "--oauth") {
        keyType = "oauth";
        credential = tokens[2];
      } else {
        credential = tokens[1];
      }

      if (!credential) {
        return { text: `Please provide a credential.\nUsage: /setkey ${provider} <api-key>` };
      }

      // Check OAuth degradation
      const mapping = PROVIDER_ENV_MAP[provider];
      let degradeNotice = "";
      if (keyType === "oauth" && !mapping.oauthVar) {
        degradeNotice = `\n\nNote: ${provider} does not support OAuth env var. Your token will be injected as an API key instead.`;
      }

      store.setEntry(channel, userId, provider, { credential, keyType });
      cache.setKey(channel, userId, provider, { credential, keyType });

      const displayType = keyType === "oauth" ? "OAuth token" : "API key";
      api.logger.info?.(`user-keys: ${userId} set ${displayType} for ${provider}`);

      return {
        text: `Your ${displayType} for **${provider}** has been saved (encrypted).${degradeNotice}\n\nTip: delete the message containing your key from the chat history for security.`,
      };
    },
  });

  api.registerCommand({
    name: "delkey",
    description: "Remove your personal API key for an AI provider.",
    acceptsArgs: true,
    requireAuth: false,
    handler: (ctx) => {
      const channel = ctx.channel;
      const userId = ctx.from ?? ctx.senderId;
      if (!userId) {
        return { text: "Could not identify your user ID." };
      }

      const provider = ctx.args?.trim().toLowerCase();
      if (!provider) {
        return { text: `Usage: /delkey <provider>\nSupported: ${SUPPORTED_PROVIDERS.join(", ")}` };
      }

      if (!PROVIDER_ENV_MAP[provider]) {
        return { text: `Unknown provider "${provider}".\nSupported: ${SUPPORTED_PROVIDERS.join(", ")}` };
      }

      const existed = store.deleteEntry(channel, userId, provider);
      cache.deleteKey(channel, userId, provider);

      if (existed) {
        api.logger.info?.(`user-keys: ${userId} deleted key for ${provider}`);
        return { text: `Your key for **${provider}** has been removed. Future requests will use the shared key.` };
      }

      return { text: `No key found for **${provider}**.` };
    },
  });

  api.registerCommand({
    name: "mykeys",
    description: "List your configured AI provider keys (no secrets shown).",
    acceptsArgs: false,
    requireAuth: false,
    handler: (ctx) => {
      const channel = ctx.channel;
      const userId = ctx.from ?? ctx.senderId;
      if (!userId) {
        return { text: "Could not identify your user ID." };
      }

      const keys = cache.listKeys(channel, userId);
      if (keys.length === 0) {
        return { text: "You have no personal API keys configured. Use /setkey to add one." };
      }

      const lines = keys.map((k) => `- **${k.provider}** (${k.keyType})`);
      return { text: `Your configured keys:\n${lines.join("\n")}` };
    },
  });
}
