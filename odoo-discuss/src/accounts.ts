import type {
  CoreConfig,
  OdooDiscussAccountConfig,
  ResolvedOdooDiscussAccount,
} from "./types.js";

const DEFAULT_ACCOUNT_ID = "default";

function mergeAccountConfig(cfg: CoreConfig): OdooDiscussAccountConfig {
  return cfg.channels?.["odoo-discuss"] ?? {};
}

export function resolveOdooDiscussAccount(params: {
  cfg: CoreConfig;
  accountId?: string | null;
}): ResolvedOdooDiscussAccount {
  const accountId = params.accountId ?? DEFAULT_ACCOUNT_ID;
  const merged = mergeAccountConfig(params.cfg);
  const baseEnabled = merged.enabled !== false;

  return {
    accountId,
    enabled: baseEnabled,
    name: merged.name?.trim() || undefined,
    odooUrl: merged.odooUrl?.trim()?.replace(/\/$/, "") ?? "",
    hmacSecret: merged.hmacSecret?.trim() ?? "",
    config: merged,
  };
}

export function listOdooDiscussAccountIds(_cfg: CoreConfig): string[] {
  return [DEFAULT_ACCOUNT_ID];
}

export function resolveDefaultOdooDiscussAccountId(_cfg: CoreConfig): string {
  return DEFAULT_ACCOUNT_ID;
}
