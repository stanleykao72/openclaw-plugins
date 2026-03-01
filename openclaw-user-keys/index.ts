import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as store from "./src/store.js";
import * as cache from "./src/cache.js";
import { registerCommands } from "./src/commands.js";
import { registerAuthHooks } from "./src/auth-hook.js";
import { registerHttpRoutes } from "./src/http-bridge.js";

export default function register(api: OpenClawPluginApi) {
  // Register chat commands: /setkey, /delkey, /mykeys
  registerCommands(api);

  // Register auth hooks: message_received, before_model_resolve, agent_end
  registerAuthHooks(api);

  // Register HTTP bridge routes for external integration (e.g., Odoo)
  registerHttpRoutes(api);

  // Lifecycle: gateway_start — load encrypted store, warm cache
  api.on("gateway_start", () => {
    const config = api.config as any;
    const gatewayToken =
      config?.gateway?.auth?.token ?? process.env.OPENCLAW_GATEWAY_TOKEN;

    if (!gatewayToken) {
      api.logger.warn?.(
        "user-keys: no OPENCLAW_GATEWAY_TOKEN found — cannot derive encryption key. " +
          "User keys will not be available until a gateway token is configured.",
      );
      return;
    }

    const entryCount = store.initStore(gatewayToken);

    // Warm cache from decrypted store entries
    const allEntries = store.getAllEntries();
    for (const { channel, userId, provider, entry } of allEntries) {
      cache.setKey(channel, userId, provider, {
        credential: entry.credential,
        keyType: entry.keyType,
      });
    }

    api.logger.info?.(
      `user-keys: loaded ${entryCount} encrypted entries, ${allEntries.length} cached`,
    );
  });

  // Lifecycle: gateway_stop — clear sensitive data from memory
  api.on("gateway_stop", () => {
    cache.clearCache();
    store.clearStore();
    api.logger.info?.("user-keys: cleared in-memory cache and store");
  });
}
