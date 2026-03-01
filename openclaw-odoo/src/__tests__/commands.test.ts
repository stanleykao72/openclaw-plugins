import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../odoo-bridge.js", () => ({
  bindUser: vi.fn(),
  verifyUser: vi.fn(),
  unbindUser: vi.fn(),
}));
vi.mock("../key-store.js", () => ({
  setApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
}));

import * as bridge from "../odoo-bridge.js";
import * as keyStore from "../key-store.js";
import { registerCommands } from "../commands.js";

describe("commands", () => {
  const commands: Record<string, { handler: (ctx: Record<string, unknown>) => unknown }> = {};
  const mockApi = {
    registerCommand: vi.fn((cmd: { name: string; handler: (ctx: Record<string, unknown>) => unknown }) => {
      commands[cmd.name] = cmd;
    }),
  } as unknown as Parameters<typeof registerCommands>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    registerCommands(mockApi);
  });

  it("should register bind, verify, unbind commands", () => {
    expect(commands.bind).toBeDefined();
    expect(commands.verify).toBeDefined();
    expect(commands.unbind).toBeDefined();
  });

  describe("/bind", () => {
    it("should return usage when no args", async () => {
      const result = await commands.bind.handler({
        channel: "telegram",
        from: "user1",
        args: "",
      });
      expect((result as { text: string }).text).toContain("Usage");
    });

    it("should call bindUser and show verification code", async () => {
      vi.mocked(bridge.bindUser).mockResolvedValue({
        success: true,
        code: "654321",
        message: "Code sent",
      });

      const result = await commands.bind.handler({
        channel: "telegram",
        from: "user1",
        args: "user@test.com",
      });
      expect((result as { text: string }).text).toContain("654321");
      expect(bridge.bindUser).toHaveBeenCalledWith("telegram", "user1", "user@test.com");
    });

    it("should show error on failure", async () => {
      vi.mocked(bridge.bindUser).mockResolvedValue({
        success: false,
        message: "MCP not enabled",
      });

      const result = await commands.bind.handler({
        channel: "telegram",
        from: "user1",
        args: "user@test.com",
      });
      expect((result as { text: string }).text).toContain("failed");
    });
  });

  describe("/verify", () => {
    it("should store API key on success", async () => {
      vi.mocked(bridge.verifyUser).mockResolvedValue({
        success: true,
        api_key: "key-xyz",
        user: { id: 1, login: "u@t.com", name: "Test User" },
      });

      const result = await commands.verify.handler({
        channel: "telegram",
        from: "user1",
        args: "123456",
      });
      expect((result as { text: string }).text).toContain("Successfully bound");
      expect(keyStore.setApiKey).toHaveBeenCalledWith("telegram", "user1", "key-xyz");
    });
  });

  describe("/unbind", () => {
    it("should delete local API key on success", async () => {
      vi.mocked(bridge.unbindUser).mockResolvedValue({
        success: true,
        message: "Unbound",
      });

      const result = await commands.unbind.handler({
        channel: "telegram",
        from: "user1",
      });
      expect((result as { text: string }).text).toContain("unbound");
      expect(keyStore.deleteApiKey).toHaveBeenCalledWith("telegram", "user1");
    });
  });
});
