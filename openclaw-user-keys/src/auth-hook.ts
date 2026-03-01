import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { PROVIDER_ENV_MAP } from "./types.js";
import type { StashedEnv } from "./types.js";
import * as cache from "./cache.js";

// Map sessionKey → user identity (populated by message_received)
const sessionUserMap = new Map<string, { channel: string; userId: string }>();

// Map sessionKey → stashed original env var + auth order (for restoration in agent_end)
const stash = new Map<string, StashedEnv>();

/**
 * Resolve the env var name to inject based on provider, keyType, and OAuth support.
 */
function resolveEnvVar(provider: string, keyType: string): string {
  const mapping = PROVIDER_ENV_MAP[provider];
  if (!mapping) return `${provider.toUpperCase()}_API_KEY`;

  if (keyType === "oauth" && mapping.oauthVar) {
    return mapping.oauthVar;
  }
  return mapping.apiKeyVar;
}

/**
 * Resolve the default provider from config.
 * Falls back to provider in config.models.default or "anthropic".
 */
function resolveDefaultProvider(config: any): string {
  const defaultModel = config?.models?.default;
  if (typeof defaultModel === "string" && defaultModel.includes("/")) {
    return defaultModel.split("/")[0];
  }
  // Check if there's a provider set directly
  if (typeof config?.models?.provider === "string") {
    return config.models.provider;
  }
  return "anthropic";
}

function deepCloneArray(arr: unknown[] | undefined): string[] | undefined {
  if (!arr) return undefined;
  return [...arr] as string[];
}

export function registerAuthHooks(api: OpenClawPluginApi): void {
  // Hook 1: message_received — record session ↔ user mapping
  api.on("message_received", (_event, ctx) => {
    const channelId = (ctx as any).channelId;
    const from = (_event as any).from;
    if (!channelId || !from) return;

    // Use channelId as the session-user mapping key
    // Multiple mapping strategies: by channelId (for message context)
    sessionUserMap.set(channelId, { channel: channelId, userId: from });

    // Also map by a combined key if sessionKey is available
    // This is used by before_model_resolve which has agentContext
  }, { priority: 100 });

  // Hook 2: before_model_resolve — inject user key/token
  api.on("before_model_resolve", (_event, ctx) => {
    // Try to find user from sessionKey or messageProvider
    const sessionKey = ctx.sessionKey;
    const messageProvider = ctx.messageProvider;

    // Find user identity — try multiple lookup strategies
    let user: { channel: string; userId: string } | undefined;

    // Strategy 1: lookup by sessionKey
    if (sessionKey) {
      user = sessionUserMap.get(sessionKey);
    }

    // Strategy 2: lookup by messageProvider (channelId)
    if (!user && messageProvider) {
      user = sessionUserMap.get(messageProvider);
    }

    // Strategy 3: iterate recent entries (fallback)
    if (!user) {
      // Try to find any recent mapping — this is a best-effort fallback
      for (const [_key, value] of sessionUserMap) {
        user = value;
        break; // Use the most recently set entry (Map preserves insertion order)
      }
    }

    if (!user) return;

    // Determine the provider to override
    const provider = resolveDefaultProvider(api.config);
    const cached = cache.getKey(user.channel, user.userId, provider);
    if (!cached) return; // No user key → use shared auth profile

    const envVar = resolveEnvVar(provider, cached.keyType);

    // 1. Stash original values
    const originalAuthOrder = deepCloneArray(
      (api.config as any)?.auth?.order?.[provider],
    );

    stash.set(ctx.sessionKey ?? "default", {
      envVar,
      originalEnvValue: process.env[envVar],
      provider,
      originalAuthOrder,
    });

    // 2. Inject user credential into env var
    process.env[envVar] = cached.credential;

    // 3. Clear auth profile order for this provider → forces fallback to env var
    const config = api.config as any;
    if (!config.auth) config.auth = {};
    if (!config.auth.order) config.auth.order = {};
    config.auth.order[provider] = [];

    api.logger.info?.(
      `user-keys: injected ${cached.keyType} for ${provider} (user: ${user.userId}, env: ${envVar})`,
    );
  }, { priority: 100 });

  // Hook 3: agent_end — restore original env var and auth order
  api.on("agent_end", (_event, ctx) => {
    const key = ctx.sessionKey ?? "default";
    const s = stash.get(key);
    if (!s) return;

    // Restore env var
    if (s.originalEnvValue === undefined) {
      delete process.env[s.envVar];
    } else {
      process.env[s.envVar] = s.originalEnvValue;
    }

    // Restore auth order
    const config = api.config as any;
    if (s.originalAuthOrder === undefined) {
      if (config.auth?.order) {
        delete config.auth.order[s.provider];
      }
    } else {
      if (config.auth?.order) {
        config.auth.order[s.provider] = s.originalAuthOrder;
      }
    }

    stash.delete(key);

    api.logger.info?.(`user-keys: restored env for ${s.provider}`);
  });
}
