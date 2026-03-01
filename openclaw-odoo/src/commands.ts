import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import * as bridge from "./odoo-bridge.js";
import * as keyStore from "./key-store.js";

export function registerCommands(api: OpenClawPluginApi): void {
  api.registerCommand({
    name: "bind",
    description: "Bind your chat account to an Odoo user. Usage: /bind <login-or-email>",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx) => {
      const channel = ctx.channel;
      const userId = ctx.from ?? ctx.senderId;
      if (!userId) {
        return { text: "Could not identify your user ID." };
      }

      const loginOrEmail = ctx.args?.trim();
      if (!loginOrEmail) {
        return { text: "Usage: /bind <login-or-email>\nExample: /bind stanley@company.com" };
      }

      try {
        const result = await bridge.bindUser(channel, userId, loginOrEmail);
        if (result.success) {
          // In production the verification code is sent to the user
          // via Odoo (email/chat). The response includes it for the
          // gateway to relay to the user's DM or internal channel.
          const code = result.code as string | undefined;
          const msg = code
            ? `Verification code: **${code}**\nUse /verify ${code} to complete binding.`
            : String(result.message);
          return { text: msg };
        }
        return { text: `Binding failed: ${result.message}` };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { text: `Error: ${msg}` };
      }
    },
  });

  api.registerCommand({
    name: "verify",
    description: "Verify your Odoo binding code. Usage: /verify <6-digit-code>",
    acceptsArgs: true,
    requireAuth: false,
    handler: async (ctx) => {
      const channel = ctx.channel;
      const userId = ctx.from ?? ctx.senderId;
      if (!userId) {
        return { text: "Could not identify your user ID." };
      }

      const code = ctx.args?.trim();
      if (!code) {
        return { text: "Usage: /verify <6-digit-code>" };
      }

      try {
        const result = await bridge.verifyUser(channel, userId, code);
        if (result.success) {
          const apiKey = result.api_key as string;
          keyStore.setApiKey(channel, userId, apiKey);

          const user = result.user as { name: string; login: string };
          return {
            text: `Successfully bound to Odoo user **${user.name}** (${user.login}).\nOdoo MCP tools are now available.`,
          };
        }
        return { text: `Verification failed: ${result.message}` };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { text: `Error: ${msg}` };
      }
    },
  });

  api.registerCommand({
    name: "unbind",
    description: "Remove your Odoo account binding.",
    acceptsArgs: false,
    requireAuth: false,
    handler: async (ctx) => {
      const channel = ctx.channel;
      const userId = ctx.from ?? ctx.senderId;
      if (!userId) {
        return { text: "Could not identify your user ID." };
      }

      try {
        const result = await bridge.unbindUser(channel, userId);
        if (result.success) {
          keyStore.deleteApiKey(channel, userId);
          return { text: "Your Odoo account has been unbound. MCP tools are no longer available." };
        }
        return { text: `Unbind failed: ${result.message}` };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { text: `Error: ${msg}` };
      }
    },
  });
}
