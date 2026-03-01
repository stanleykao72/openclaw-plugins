import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { registerCommands } from "./src/commands.js";
import { registerMcpTools } from "./src/mcp-proxy.js";
import * as keyStore from "./src/key-store.js";
import { clearTokenCache } from "./src/odoo-bridge.js";

export default function register(api: OpenClawPluginApi) {
  // Register chat commands: /bind, /verify, /unbind
  registerCommands(api);

  // Lifecycle: gateway_start — init key store, register MCP tools
  api.on("gateway_start", async () => {
    const clientSecret = process.env.OPENCLAW_ODOO_CLIENT_SECRET;
    if (!clientSecret) {
      api.logger.warn?.(
        "odoo: OPENCLAW_ODOO_CLIENT_SECRET not set — cannot initialize key store.",
      );
      return;
    }

    const count = keyStore.initStore(clientSecret);
    api.logger.info?.(`odoo: loaded ${count} encrypted binding(s)`);

    // Register Odoo MCP tools from discovered tool list
    try {
      await registerMcpTools(api);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      api.logger.warn?.(`odoo: failed to register MCP tools: ${msg}`);
    }
  });

  // Lifecycle: gateway_stop — clear sensitive data
  api.on("gateway_stop", () => {
    keyStore.clearStore();
    clearTokenCache();
    api.logger.info?.("odoo: cleared in-memory state");
  });
}
