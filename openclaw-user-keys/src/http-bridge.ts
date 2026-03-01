import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { PROVIDER_ENV_MAP, SUPPORTED_PROVIDERS } from "./types.js";
import type { KeyType } from "./types.js";
import * as store from "./store.js";
import * as cache from "./cache.js";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function validateAuth(req: IncomingMessage, api: OpenClawPluginApi): boolean {
  const config = api.config as any;
  const expectedToken = config?.gateway?.auth?.token ?? process.env.OPENCLAW_GATEWAY_TOKEN;
  if (!expectedToken) return true; // No auth configured

  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  return parts[1] === expectedToken;
}

export function registerHttpRoutes(api: OpenClawPluginApi): void {
  // POST /api/user-keys/set
  api.registerHttpRoute({
    path: "/api/user-keys/set",
    handler: async (req, res) => {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      if (!validateAuth(req, api)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      let body: any;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }

      const { channel, userId, provider, credential, keyType } = body;

      if (!channel || !userId || !provider || !credential) {
        sendJson(res, 400, { error: "Missing required fields: channel, userId, provider, credential" });
        return;
      }

      if (!PROVIDER_ENV_MAP[provider]) {
        sendJson(res, 400, { error: `Unknown provider. Supported: ${SUPPORTED_PROVIDERS.join(", ")}` });
        return;
      }

      const resolvedKeyType: KeyType = keyType === "oauth" ? "oauth" : "api-key";

      store.setEntry(channel, userId, provider, { credential, keyType: resolvedKeyType });
      cache.setKey(channel, userId, provider, { credential, keyType: resolvedKeyType });

      api.logger.info?.(`user-keys: HTTP set ${resolvedKeyType} for ${provider} (user: ${channel}:${userId})`);
      sendJson(res, 200, { ok: true });
    },
  });

  // DELETE /api/user-keys/delete
  api.registerHttpRoute({
    path: "/api/user-keys/delete",
    handler: async (req, res) => {
      if (req.method !== "DELETE" && req.method !== "POST") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      if (!validateAuth(req, api)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      let body: any;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        sendJson(res, 400, { error: "Invalid JSON" });
        return;
      }

      const { channel, userId, provider } = body;

      if (!channel || !userId || !provider) {
        sendJson(res, 400, { error: "Missing required fields: channel, userId, provider" });
        return;
      }

      const existed = store.deleteEntry(channel, userId, provider);
      cache.deleteKey(channel, userId, provider);

      api.logger.info?.(`user-keys: HTTP delete key for ${provider} (user: ${channel}:${userId})`);
      sendJson(res, 200, { ok: true, existed });
    },
  });

  // GET /api/user-keys/list
  api.registerHttpRoute({
    path: "/api/user-keys/list",
    handler: async (req, res) => {
      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed" });
        return;
      }

      if (!validateAuth(req, api)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const channel = url.searchParams.get("channel");
      const userId = url.searchParams.get("userId");

      if (!channel || !userId) {
        sendJson(res, 400, { error: "Missing query params: channel, userId" });
        return;
      }

      const keys = cache.listKeys(channel, userId);
      sendJson(res, 200, { keys });
    },
  });
}
