import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as bridge from "./odoo-bridge.js";
import * as keyStore from "./key-store.js";

/**
 * Register Odoo MCP tools as OpenClaw agent tools.
 *
 * On gateway_start, fetches the tool list from Odoo using any valid
 * API key, then registers each tool with the plugin API.
 * When a tool is invoked, the per-user API key is used to call Odoo.
 */
export async function registerMcpTools(api: OpenClawPluginApi): Promise<void> {
  // Find any valid API key to discover the tool list
  const bindings = keyStore.listBindings();
  if (bindings.length === 0) {
    api.logger.info?.("odoo: no bindings found — skipping MCP tool registration");
    return;
  }

  let toolList: Array<{ name: string; description?: string; inputSchema?: unknown }> = [];

  for (const { channel, channelUid } of bindings) {
    const apiKey = keyStore.getApiKey(channel, channelUid);
    if (!apiKey) continue;

    try {
      const res = await bridge.mcpToolsList(apiKey);
      const result = res.result as { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> } | undefined;
      if (result?.tools) {
        toolList = result.tools;
        break;
      }
    } catch {
      // Try next binding
    }
  }

  if (toolList.length === 0) {
    api.logger.info?.("odoo: could not fetch MCP tool list from Odoo");
    return;
  }

  api.logger.info?.(`odoo: registering ${toolList.length} MCP tools`);

  for (const tool of toolList) {
    api.registerTool(
      {
        name: `odoo_${tool.name}`,
        description: tool.description ?? `Odoo MCP tool: ${tool.name}`,
        inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
      },
      {
        handler: async (args: Record<string, unknown>, ctx: { channel: string; from?: string; senderId?: string }) => {
          const channel = ctx.channel;
          const userId = ctx.from ?? ctx.senderId;
          if (!userId) {
            return { error: "Could not identify user." };
          }

          const apiKey = keyStore.getApiKey(channel, userId);
          if (!apiKey) {
            return {
              error:
                "You are not bound to an Odoo account. Use /bind <email> to connect your account first.",
            };
          }

          try {
            const res = await bridge.mcpToolCall(apiKey, tool.name, args);
            return res.result ?? res;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return { error: `Odoo MCP call failed: ${msg}` };
          }
        },
      },
    );
  }
}
