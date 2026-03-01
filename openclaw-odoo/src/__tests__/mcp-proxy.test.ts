import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../odoo-bridge.js", () => ({
  mcpToolsList: vi.fn(),
  mcpToolCall: vi.fn(),
}));
vi.mock("../key-store.js", () => ({
  listBindings: vi.fn(),
  getApiKey: vi.fn(),
}));

import * as bridge from "../odoo-bridge.js";
import * as keyStore from "../key-store.js";
import { registerMcpTools } from "../mcp-proxy.js";

describe("mcp-proxy", () => {
  const registeredTools: Array<{
    def: { name: string; description?: string };
    opts: { handler: (args: Record<string, unknown>, ctx: Record<string, unknown>) => unknown };
  }> = [];

  const mockApi = {
    registerTool: vi.fn(
      (def: { name: string; description?: string }, opts: { handler: (args: Record<string, unknown>, ctx: Record<string, unknown>) => unknown }) => {
        registeredTools.push({ def, opts });
      },
    ),
    logger: { info: vi.fn(), warn: vi.fn() },
  } as unknown as Parameters<typeof registerMcpTools>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    registeredTools.length = 0;
  });

  it("should skip registration when no bindings exist", async () => {
    vi.mocked(keyStore.listBindings).mockReturnValue([]);

    await registerMcpTools(mockApi);
    expect(registeredTools).toHaveLength(0);
  });

  it("should register tools from Odoo MCP", async () => {
    vi.mocked(keyStore.listBindings).mockReturnValue([
      { channel: "telegram", channelUid: "u1" },
    ]);
    vi.mocked(keyStore.getApiKey).mockReturnValue("test-key");
    vi.mocked(bridge.mcpToolsList).mockResolvedValue({
      result: {
        tools: [
          { name: "search_records", description: "Search records" },
          { name: "read_records", description: "Read records" },
        ],
      },
    });

    await registerMcpTools(mockApi);
    expect(registeredTools).toHaveLength(2);
    expect(registeredTools[0].def.name).toBe("odoo_search_records");
    expect(registeredTools[1].def.name).toBe("odoo_read_records");
  });

  it("should call mcpToolCall with user API key when tool is invoked", async () => {
    vi.mocked(keyStore.listBindings).mockReturnValue([
      { channel: "telegram", channelUid: "u1" },
    ]);
    vi.mocked(keyStore.getApiKey).mockReturnValue("user-api-key");
    vi.mocked(bridge.mcpToolsList).mockResolvedValue({
      result: {
        tools: [{ name: "search_records", description: "Search" }],
      },
    });
    vi.mocked(bridge.mcpToolCall).mockResolvedValue({
      result: { content: [{ type: "text", text: "found 3 records" }] },
    });

    await registerMcpTools(mockApi);

    const handler = registeredTools[0].opts.handler;
    const result = await handler(
      { model: "res.partner" },
      { channel: "telegram", from: "u1" },
    );

    expect(bridge.mcpToolCall).toHaveBeenCalledWith(
      "user-api-key",
      "search_records",
      { model: "res.partner" },
    );
    expect(result).toHaveProperty("content");
  });

  it("should return error when user has no API key", async () => {
    vi.mocked(keyStore.listBindings).mockReturnValue([
      { channel: "telegram", channelUid: "bound-user" },
    ]);
    vi.mocked(keyStore.getApiKey).mockImplementation((ch, uid) => {
      if (ch === "telegram" && uid === "bound-user") return "key";
      return null;
    });
    vi.mocked(bridge.mcpToolsList).mockResolvedValue({
      result: {
        tools: [{ name: "search_records", description: "Search" }],
      },
    });

    await registerMcpTools(mockApi);

    const handler = registeredTools[0].opts.handler;
    const result = await handler(
      { model: "res.partner" },
      { channel: "telegram", from: "unbound-user" },
    );

    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("/bind");
  });
});
