import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

// Mock homedir to use a temp directory so tests don't touch real ~/.openclaw/
const testDir = join(tmpdir(), `user-keys-test-${randomBytes(8).toString("hex")}`);
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => testDir };
});

// Import after mock is set up
const storeModule = await import("./store.js");

const GATEWAY_TOKEN = "test-gateway-token-abc123";

describe("store", () => {
  beforeEach(() => {
    mkdirSync(join(testDir, ".openclaw"), { recursive: true });
  });

  afterEach(() => {
    storeModule.clearStore();
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("initStore", () => {
    it("creates a new store file when none exists", () => {
      const count = storeModule.initStore(GATEWAY_TOKEN);
      expect(count).toBe(0);

      const storePath = join(testDir, ".openclaw", "user-keys.enc.json");
      expect(existsSync(storePath)).toBe(true);

      const data = JSON.parse(readFileSync(storePath, "utf8"));
      expect(data.version).toBe(1);
      expect(data.salt).toBeDefined();
      expect(typeof data.salt).toBe("string");
      expect(data.salt.length).toBe(64); // 32 bytes hex
      expect(data.entries).toEqual({});
    });

    it("loads an existing store file", () => {
      // First init creates the file
      storeModule.initStore(GATEWAY_TOKEN);
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-test",
        keyType: "api-key",
      });
      storeModule.clearStore();

      // Second init loads from disk
      const count = storeModule.initStore(GATEWAY_TOKEN);
      expect(count).toBe(1);
    });
  });

  describe("setEntry / getEntry round-trip", () => {
    beforeEach(() => {
      storeModule.initStore(GATEWAY_TOKEN);
    });

    it("stores and retrieves an api-key entry", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-abc123",
        keyType: "api-key",
      });

      const entry = storeModule.getEntry("telegram", "user1", "openai");
      expect(entry).toEqual({ credential: "sk-abc123", keyType: "api-key" });
    });

    it("stores and retrieves an oauth entry", () => {
      storeModule.setEntry("discord", "user2", "anthropic", {
        credential: "oauth-token-xyz",
        keyType: "oauth",
      });

      const entry = storeModule.getEntry("discord", "user2", "anthropic");
      expect(entry).toEqual({ credential: "oauth-token-xyz", keyType: "oauth" });
    });

    it("returns null for non-existent entry", () => {
      expect(storeModule.getEntry("telegram", "user1", "openai")).toBeNull();
    });

    it("overwrites existing entry", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-old",
        keyType: "api-key",
      });
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-new",
        keyType: "oauth",
      });

      const entry = storeModule.getEntry("telegram", "user1", "openai");
      expect(entry).toEqual({ credential: "sk-new", keyType: "oauth" });
    });

    it("persists entries to disk (encrypted)", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-secret",
        keyType: "api-key",
      });

      // Read raw file — credential should NOT appear in plaintext
      const storePath = join(testDir, ".openclaw", "user-keys.enc.json");
      const raw = readFileSync(storePath, "utf8");
      expect(raw).not.toContain("sk-secret");

      // The entry key should be visible (it's not encrypted)
      const data = JSON.parse(raw);
      expect(data.entries["telegram:user1:openai"]).toBeDefined();
      expect(typeof data.entries["telegram:user1:openai"]).toBe("string");
    });

    it("survives store reload", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-persist",
        keyType: "api-key",
      });
      storeModule.setEntry("telegram", "user1", "anthropic", {
        credential: "oauth-persist",
        keyType: "oauth",
      });

      // Reload
      storeModule.clearStore();
      storeModule.initStore(GATEWAY_TOKEN);

      expect(storeModule.getEntry("telegram", "user1", "openai")).toEqual({
        credential: "sk-persist",
        keyType: "api-key",
      });
      expect(storeModule.getEntry("telegram", "user1", "anthropic")).toEqual({
        credential: "oauth-persist",
        keyType: "oauth",
      });
    });

    it("fails to decrypt with wrong gateway token after reload", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-secret",
        keyType: "api-key",
      });

      storeModule.clearStore();
      storeModule.initStore("wrong-token");

      // getEntry catches decrypt errors and returns null
      expect(storeModule.getEntry("telegram", "user1", "openai")).toBeNull();
    });
  });

  describe("deleteEntry", () => {
    beforeEach(() => {
      storeModule.initStore(GATEWAY_TOKEN);
    });

    it("returns true when entry existed", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-abc",
        keyType: "api-key",
      });
      expect(storeModule.deleteEntry("telegram", "user1", "openai")).toBe(true);
    });

    it("returns false when entry did not exist", () => {
      expect(storeModule.deleteEntry("telegram", "user1", "openai")).toBe(false);
    });

    it("makes entry unretrievable", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-abc",
        keyType: "api-key",
      });
      storeModule.deleteEntry("telegram", "user1", "openai");
      expect(storeModule.getEntry("telegram", "user1", "openai")).toBeNull();
    });

    it("persists deletion to disk", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-abc",
        keyType: "api-key",
      });
      storeModule.deleteEntry("telegram", "user1", "openai");

      storeModule.clearStore();
      storeModule.initStore(GATEWAY_TOKEN);
      expect(storeModule.getEntry("telegram", "user1", "openai")).toBeNull();
    });
  });

  describe("listEntries", () => {
    beforeEach(() => {
      storeModule.initStore(GATEWAY_TOKEN);
    });

    it("returns empty for unknown user", () => {
      expect(storeModule.listEntries("telegram", "user1")).toEqual([]);
    });

    it("lists all providers with keyType", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-oa",
        keyType: "api-key",
      });
      storeModule.setEntry("telegram", "user1", "anthropic", {
        credential: "tok",
        keyType: "oauth",
      });

      const list = storeModule.listEntries("telegram", "user1");
      expect(list).toHaveLength(2);
      expect(list).toContainEqual({ provider: "openai", keyType: "api-key" });
      expect(list).toContainEqual({ provider: "anthropic", keyType: "oauth" });
    });

    it("does not include other users' entries", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-1",
        keyType: "api-key",
      });
      storeModule.setEntry("telegram", "user2", "anthropic", {
        credential: "sk-2",
        keyType: "api-key",
      });

      const list = storeModule.listEntries("telegram", "user1");
      expect(list).toHaveLength(1);
      expect(list[0].provider).toBe("openai");
    });
  });

  describe("getAllEntries", () => {
    beforeEach(() => {
      storeModule.initStore(GATEWAY_TOKEN);
    });

    it("returns all entries for cache warming", () => {
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-1",
        keyType: "api-key",
      });
      storeModule.setEntry("discord", "user2", "anthropic", {
        credential: "tok-2",
        keyType: "oauth",
      });

      const all = storeModule.getAllEntries();
      expect(all).toHaveLength(2);
      expect(all).toContainEqual({
        channel: "telegram",
        userId: "user1",
        provider: "openai",
        entry: { credential: "sk-1", keyType: "api-key" },
      });
      expect(all).toContainEqual({
        channel: "discord",
        userId: "user2",
        provider: "anthropic",
        entry: { credential: "tok-2", keyType: "oauth" },
      });
    });
  });

  describe("entryKey", () => {
    it("builds composite key", () => {
      expect(storeModule.entryKey("telegram", "12345", "openai")).toBe(
        "telegram:12345:openai",
      );
    });
  });

  describe("clearStore", () => {
    it("makes getEntry return null", () => {
      storeModule.initStore(GATEWAY_TOKEN);
      storeModule.setEntry("telegram", "user1", "openai", {
        credential: "sk-abc",
        keyType: "api-key",
      });
      storeModule.clearStore();
      expect(storeModule.getEntry("telegram", "user1", "openai")).toBeNull();
    });
  });
});
