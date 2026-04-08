import type { OdooDiscussAccountConfig, OdooDiscussConfig, CoreConfig } from "./types.js";

const CHANNEL_KEY = "odoo-discuss" as const;

/** Validate and extract the odoo-discuss config section. */
export function resolveOdooDiscussConfig(cfg: CoreConfig): OdooDiscussConfig | undefined {
  return cfg.channels?.[CHANNEL_KEY];
}

/** Check if the minimal required fields are present. */
export function isOdooDiscussConfigured(config: OdooDiscussAccountConfig): boolean {
  return Boolean(
    config.odooUrl?.trim() &&
      config.hmacSecret?.trim(),
  );
}
