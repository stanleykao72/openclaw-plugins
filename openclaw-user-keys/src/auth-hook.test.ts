import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROVIDER_ENV_MAP } from "./types.js";
import * as cache from "./cache.js";

// We can't directly test the private functions in auth-hook.ts since they're
// not exported. Instead we test the env var resolution logic by reproducing it,
// and test the hook integration through the exported registerAuthHooks function.

describe("auth-hook env var resolution logic", () => {
  // Replicate resolveEnvVar logic for testing
  function resolveEnvVar(provider: string, keyType: string): string {
    const mapping = PROVIDER_ENV_MAP[provider];
    if (!mapping) return `${provider.toUpperCase()}_API_KEY`;

    if (keyType === "oauth" && mapping.oauthVar) {
      return mapping.oauthVar;
    }
    return mapping.apiKeyVar;
  }

  describe("api-key mode", () => {
    it("openai → OPENAI_API_KEY", () => {
      expect(resolveEnvVar("openai", "api-key")).toBe("OPENAI_API_KEY");
    });

    it("anthropic → ANTHROPIC_API_KEY", () => {
      expect(resolveEnvVar("anthropic", "api-key")).toBe("ANTHROPIC_API_KEY");
    });

    it("google → GEMINI_API_KEY", () => {
      expect(resolveEnvVar("google", "api-key")).toBe("GEMINI_API_KEY");
    });

    it("qwen → QWEN_PORTAL_API_KEY", () => {
      expect(resolveEnvVar("qwen", "api-key")).toBe("QWEN_PORTAL_API_KEY");
    });

    it("chutes → CHUTES_API_KEY", () => {
      expect(resolveEnvVar("chutes", "api-key")).toBe("CHUTES_API_KEY");
    });

    it("minimax → MINIMAX_API_KEY", () => {
      expect(resolveEnvVar("minimax", "api-key")).toBe("MINIMAX_API_KEY");
    });

    it("unknown provider → UNKNOWN_API_KEY (fallback)", () => {
      expect(resolveEnvVar("unknown", "api-key")).toBe("UNKNOWN_API_KEY");
    });
  });

  describe("oauth mode — providers WITH OAuth env var", () => {
    it("anthropic → ANTHROPIC_OAUTH_TOKEN", () => {
      expect(resolveEnvVar("anthropic", "oauth")).toBe("ANTHROPIC_OAUTH_TOKEN");
    });

    it("chutes → CHUTES_OAUTH_TOKEN", () => {
      expect(resolveEnvVar("chutes", "oauth")).toBe("CHUTES_OAUTH_TOKEN");
    });

    it("qwen → QWEN_OAUTH_TOKEN", () => {
      expect(resolveEnvVar("qwen", "oauth")).toBe("QWEN_OAUTH_TOKEN");
    });

    it("minimax → MINIMAX_OAUTH_TOKEN", () => {
      expect(resolveEnvVar("minimax", "oauth")).toBe("MINIMAX_OAUTH_TOKEN");
    });
  });

  describe("oauth mode — providers WITHOUT OAuth env var (degrade to api-key)", () => {
    it("openai → OPENAI_API_KEY (degraded)", () => {
      expect(resolveEnvVar("openai", "oauth")).toBe("OPENAI_API_KEY");
    });

    it("google → GEMINI_API_KEY (degraded)", () => {
      expect(resolveEnvVar("google", "oauth")).toBe("GEMINI_API_KEY");
    });

    it("openrouter → OPENROUTER_API_KEY (degraded)", () => {
      expect(resolveEnvVar("openrouter", "oauth")).toBe("OPENROUTER_API_KEY");
    });

    it("xai → XAI_API_KEY (degraded)", () => {
      expect(resolveEnvVar("xai", "oauth")).toBe("XAI_API_KEY");
    });

    it("mistral → MISTRAL_API_KEY (degraded)", () => {
      expect(resolveEnvVar("mistral", "oauth")).toBe("MISTRAL_API_KEY");
    });
  });
});

describe("auth-hook resolveDefaultProvider logic", () => {
  // Replicate resolveDefaultProvider for testing
  function resolveDefaultProvider(config: any): string {
    const defaultModel = config?.models?.default;
    if (typeof defaultModel === "string" && defaultModel.includes("/")) {
      return defaultModel.split("/")[0];
    }
    if (typeof config?.models?.provider === "string") {
      return config.models.provider;
    }
    return "anthropic";
  }

  it("extracts provider from models.default (provider/model format)", () => {
    expect(resolveDefaultProvider({ models: { default: "openai/gpt-4o" } })).toBe("openai");
  });

  it("uses models.provider when models.default has no slash", () => {
    expect(resolveDefaultProvider({ models: { default: "gpt-4o", provider: "openai" } })).toBe("openai");
  });

  it("uses models.provider when no models.default", () => {
    expect(resolveDefaultProvider({ models: { provider: "google" } })).toBe("google");
  });

  it("defaults to anthropic when nothing configured", () => {
    expect(resolveDefaultProvider({})).toBe("anthropic");
    expect(resolveDefaultProvider({ models: {} })).toBe("anthropic");
    expect(resolveDefaultProvider(undefined)).toBe("anthropic");
  });
});

describe("auth-hook registerAuthHooks integration", () => {
  // Track registered hooks
  type HookEntry = {
    name: string;
    handler: Function;
    opts?: { priority?: number };
  };

  let hooks: HookEntry[];
  let mockApi: any;

  beforeEach(() => {
    hooks = [];
    mockApi = {
      config: { models: { default: "openai/gpt-4o" } },
      logger: { info: vi.fn(), warn: vi.fn() },
      on: (name: string, handler: Function, opts?: any) => {
        hooks.push({ name, handler, opts });
      },
    };
    cache.clearCache();
  });

  afterEach(() => {
    cache.clearCache();
    // Clean up any env vars we may have set
    delete process.env.__TEST_USER_KEYS_VAR__;
  });

  it("registers three hooks: message_received, before_model_resolve, agent_end", async () => {
    const { registerAuthHooks } = await import("./auth-hook.js");
    registerAuthHooks(mockApi);

    const hookNames = hooks.map((h) => h.name);
    expect(hookNames).toContain("message_received");
    expect(hookNames).toContain("before_model_resolve");
    expect(hookNames).toContain("agent_end");
    expect(hooks).toHaveLength(3);
  });

  it("message_received and before_model_resolve have priority 100", async () => {
    const { registerAuthHooks } = await import("./auth-hook.js");
    registerAuthHooks(mockApi);

    const messageReceived = hooks.find((h) => h.name === "message_received");
    const beforeModelResolve = hooks.find((h) => h.name === "before_model_resolve");
    expect(messageReceived?.opts?.priority).toBe(100);
    expect(beforeModelResolve?.opts?.priority).toBe(100);
  });

  it("before_model_resolve does nothing when no user key is cached", async () => {
    const { registerAuthHooks } = await import("./auth-hook.js");
    registerAuthHooks(mockApi);

    // Simulate message_received to set up user mapping
    const messageReceivedHook = hooks.find((h) => h.name === "message_received")!;
    messageReceivedHook.handler({ from: "user1" }, { channelId: "chan1" });

    // Call before_model_resolve — no cached key
    const beforeModelResolve = hooks.find((h) => h.name === "before_model_resolve")!;
    const originalEnv = process.env.OPENAI_API_KEY;
    beforeModelResolve.handler({}, { sessionKey: "sess1", messageProvider: "chan1" });

    // Env var should not have changed
    expect(process.env.OPENAI_API_KEY).toBe(originalEnv);
  });

  it("before_model_resolve injects env var when user has cached key", async () => {
    const { registerAuthHooks } = await import("./auth-hook.js");
    registerAuthHooks(mockApi);

    // Set up cache
    cache.setKey("chan1", "user1", "openai", { credential: "sk-user-key", keyType: "api-key" });

    // Simulate message_received
    const messageReceivedHook = hooks.find((h) => h.name === "message_received")!;
    messageReceivedHook.handler({ from: "user1" }, { channelId: "chan1" });

    // Save original
    const originalEnv = process.env.OPENAI_API_KEY;

    // Call before_model_resolve
    const beforeModelResolve = hooks.find((h) => h.name === "before_model_resolve")!;
    beforeModelResolve.handler({}, { sessionKey: "sess1", messageProvider: "chan1" });

    // Env var should be injected
    expect(process.env.OPENAI_API_KEY).toBe("sk-user-key");

    // Auth order should be cleared
    expect(mockApi.config.auth.order.openai).toEqual([]);

    // Call agent_end to restore
    const agentEnd = hooks.find((h) => h.name === "agent_end")!;
    agentEnd.handler({}, { sessionKey: "sess1" });

    // Env var should be restored
    expect(process.env.OPENAI_API_KEY).toBe(originalEnv);
  });

  it("agent_end restores env var and auth order", async () => {
    const { registerAuthHooks } = await import("./auth-hook.js");
    mockApi.config = {
      models: { default: "openai/gpt-4o" },
      auth: { order: { openai: ["profile-a", "profile-b"] } },
    };
    registerAuthHooks(mockApi);

    cache.setKey("chan1", "user1", "openai", { credential: "sk-injected", keyType: "api-key" });

    const messageReceivedHook = hooks.find((h) => h.name === "message_received")!;
    messageReceivedHook.handler({ from: "user1" }, { channelId: "chan1" });

    process.env.OPENAI_API_KEY = "sk-original-shared";

    const beforeModelResolve = hooks.find((h) => h.name === "before_model_resolve")!;
    beforeModelResolve.handler({}, { sessionKey: "sess2", messageProvider: "chan1" });

    expect(process.env.OPENAI_API_KEY).toBe("sk-injected");
    expect(mockApi.config.auth.order.openai).toEqual([]);

    const agentEnd = hooks.find((h) => h.name === "agent_end")!;
    agentEnd.handler({}, { sessionKey: "sess2" });

    expect(process.env.OPENAI_API_KEY).toBe("sk-original-shared");
    expect(mockApi.config.auth.order.openai).toEqual(["profile-a", "profile-b"]);
  });

  it("agent_end deletes env var if it was originally undefined", async () => {
    const { registerAuthHooks } = await import("./auth-hook.js");
    registerAuthHooks(mockApi);

    cache.setKey("chan1", "user1", "openai", { credential: "sk-temp", keyType: "api-key" });

    const messageReceivedHook = hooks.find((h) => h.name === "message_received")!;
    messageReceivedHook.handler({ from: "user1" }, { channelId: "chan1" });

    // Ensure env var is NOT set
    delete process.env.OPENAI_API_KEY;

    const beforeModelResolve = hooks.find((h) => h.name === "before_model_resolve")!;
    beforeModelResolve.handler({}, { sessionKey: "sess3", messageProvider: "chan1" });

    expect(process.env.OPENAI_API_KEY).toBe("sk-temp");

    const agentEnd = hooks.find((h) => h.name === "agent_end")!;
    agentEnd.handler({}, { sessionKey: "sess3" });

    expect(process.env.OPENAI_API_KEY).toBeUndefined();
  });
});
