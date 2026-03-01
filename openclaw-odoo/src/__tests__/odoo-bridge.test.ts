import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env before importing module
process.env.OPENCLAW_ODOO_URL = "https://odoo.test.com";
process.env.OPENCLAW_ODOO_CLIENT_ID = "test-client-id";
process.env.OPENCLAW_ODOO_CLIENT_SECRET = "test-client-secret";

const bridge = await import("../odoo-bridge.js");

describe("odoo-bridge", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    bridge.clearTokenCache();
  });

  afterEach(() => {
    bridge.clearTokenCache();
  });

  describe("getAccessToken", () => {
    it("should fetch a token using client_credentials", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-123", expires_in: 86400 }),
      });

      const token = await bridge.getAccessToken();
      expect(token).toBe("tok-123");
      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe("https://odoo.test.com/mcp/v1/oauth/token");
      expect(opts.method).toBe("POST");
    });

    it("should cache the token on subsequent calls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-cached", expires_in: 86400 }),
      });

      await bridge.getAccessToken();
      const token2 = await bridge.getAccessToken();

      expect(token2).toBe("tok-cached");
      expect(mockFetch).toHaveBeenCalledOnce(); // Only 1 fetch
    });

    it("should throw on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(bridge.getAccessToken()).rejects.toThrow("401");
    });
  });

  describe("bindUser", () => {
    it("should call bind endpoint with correct body", async () => {
      // Token fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-bind", expires_in: 86400 }),
      });
      // Bind request
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, code: "123456" }),
      });

      const result = await bridge.bindUser("telegram", "uid1", "user@test.com");
      expect(result.success).toBe(true);
      expect(result.code).toBe("123456");

      const [url, opts] = mockFetch.mock.calls[1];
      expect(url).toBe("https://odoo.test.com/api/openclaw/user/bind");
      expect(opts.headers.Authorization).toBe("Bearer tok-bind");
    });
  });

  describe("verifyUser", () => {
    it("should call verify endpoint and return api_key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-v", expires_in: 86400 }),
      });
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          api_key: "key-123",
          user: { id: 1, login: "u@t.com", name: "U" },
        }),
      });

      const result = await bridge.verifyUser("telegram", "uid1", "123456");
      expect(result.success).toBe(true);
      expect(result.api_key).toBe("key-123");
    });
  });

  describe("mcpToolsList", () => {
    it("should call MCP message endpoint with tools/list", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          jsonrpc: "2.0",
          result: { tools: [{ name: "search_records" }] },
        }),
      });

      const result = await bridge.mcpToolsList("api-key-1");
      const r = result.result as { tools: Array<{ name: string }> };
      expect(r.tools).toHaveLength(1);
      expect(r.tools[0].name).toBe("search_records");

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe("https://odoo.test.com/mcp/v1/message");
      expect(opts.headers.Authorization).toBe("Bearer api-key-1");
    });
  });

  describe("mcpToolCall", () => {
    it("should call MCP message endpoint with tools/call", async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          jsonrpc: "2.0",
          result: { content: [{ type: "text", text: "ok" }] },
        }),
      });

      const result = await bridge.mcpToolCall("api-key-1", "search_records", {
        model: "res.partner",
      });
      expect(result.result).toBeTruthy();

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.method).toBe("tools/call");
      expect(body.params.name).toBe("search_records");
    });
  });
});
