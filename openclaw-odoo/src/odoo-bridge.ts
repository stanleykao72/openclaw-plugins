/**
 * Odoo HTTP client for binding API and MCP message forwarding.
 *
 * Configuration is read from environment variables:
 *   OPENCLAW_ODOO_URL          — Odoo base URL (e.g. https://odoo.example.com)
 *   OPENCLAW_ODOO_CLIENT_ID    — OAuth client_id of the service user
 *   OPENCLAW_ODOO_CLIENT_SECRET — OAuth client_secret of the service user
 */

// ── OAuth token cache ──────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

function getConfig() {
  const url = process.env.OPENCLAW_ODOO_URL;
  const clientId = process.env.OPENCLAW_ODOO_CLIENT_ID;
  const clientSecret = process.env.OPENCLAW_ODOO_CLIENT_SECRET;

  if (!url || !clientId || !clientSecret) {
    throw new Error(
      "Missing Odoo config. Set OPENCLAW_ODOO_URL, OPENCLAW_ODOO_CLIENT_ID, OPENCLAW_ODOO_CLIENT_SECRET.",
    );
  }

  return { url: url.replace(/\/+$/, ""), clientId, clientSecret };
}

/**
 * Obtain an OAuth access token using client_credentials grant.
 * Caches the token and refreshes 60 s before expiry.
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { url, clientId, clientSecret } = getConfig();

  const res = await fetch(`${url}/mcp/v1/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken;
}

/**
 * Clear cached token (for gateway_stop).
 */
export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiresAt = 0;
}

// ── Binding API (uses OAuth access token) ──────────────────────────

async function bindingRequest(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const { url } = getConfig();

  const res = await fetch(`${url}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return (await res.json()) as Record<string, unknown>;
}

export function bindUser(
  channel: string,
  channelUid: string,
  loginOrEmail: string,
) {
  return bindingRequest("/api/openclaw/user/bind", {
    channel,
    channel_uid: channelUid,
    login_or_email: loginOrEmail,
  });
}

export function verifyUser(
  channel: string,
  channelUid: string,
  code: string,
) {
  return bindingRequest("/api/openclaw/user/verify", {
    channel,
    channel_uid: channelUid,
    code,
  });
}

export function lookupUser(channel: string, channelUid: string) {
  return bindingRequest("/api/openclaw/user/lookup", {
    channel,
    channel_uid: channelUid,
  });
}

export function unbindUser(channel: string, channelUid: string) {
  return bindingRequest("/api/openclaw/user/unbind", {
    channel,
    channel_uid: channelUid,
  });
}

// ── MCP forwarding (uses per-user API key) ─────────────────────────

async function mcpRequest(
  apiKey: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { url } = getConfig();

  const jsonRpcBody = {
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params: params ?? {},
  };

  const res = await fetch(`${url}/mcp/v1/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(jsonRpcBody),
  });

  return (await res.json()) as Record<string, unknown>;
}

export function mcpToolsList(apiKey: string) {
  return mcpRequest(apiKey, "tools/list");
}

export function mcpToolCall(
  apiKey: string,
  toolName: string,
  args: Record<string, unknown>,
) {
  return mcpRequest(apiKey, "tools/call", { name: toolName, arguments: args });
}
