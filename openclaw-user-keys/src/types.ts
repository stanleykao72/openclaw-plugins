export type KeyType = "api-key" | "oauth";

export type UserKeyEntry = {
  credential: string;
  keyType: KeyType;
};

export type EncryptedStore = {
  version: 1;
  salt: string; // hex, 32 bytes
  entries: Record<string, string>; // "channel:userId:provider" → encrypted blob
};

export type CachedKey = {
  credential: string;
  keyType: KeyType;
};

export type StashedEnv = {
  envVar: string;
  originalEnvValue: string | undefined;
  provider: string;
  originalAuthOrder: string[] | undefined;
};

// Provider → env var mapping
export type ProviderEnvMapping = {
  apiKeyVar: string;
  oauthVar?: string; // undefined = no OAuth env var support
};

export const PROVIDER_ENV_MAP: Record<string, ProviderEnvMapping> = {
  openai: { apiKeyVar: "OPENAI_API_KEY" },
  anthropic: { apiKeyVar: "ANTHROPIC_API_KEY", oauthVar: "ANTHROPIC_OAUTH_TOKEN" },
  google: { apiKeyVar: "GEMINI_API_KEY" },
  openrouter: { apiKeyVar: "OPENROUTER_API_KEY" },
  xai: { apiKeyVar: "XAI_API_KEY" },
  mistral: { apiKeyVar: "MISTRAL_API_KEY" },
  chutes: { apiKeyVar: "CHUTES_API_KEY", oauthVar: "CHUTES_OAUTH_TOKEN" },
  qwen: { apiKeyVar: "QWEN_PORTAL_API_KEY", oauthVar: "QWEN_OAUTH_TOKEN" },
  minimax: { apiKeyVar: "MINIMAX_API_KEY", oauthVar: "MINIMAX_OAUTH_TOKEN" },
};

export const SUPPORTED_PROVIDERS = Object.keys(PROVIDER_ENV_MAP);
