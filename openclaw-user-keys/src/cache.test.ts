import { afterEach, describe, expect, it } from "vitest";
import { setKey, getKey, deleteKey, listKeys, clearCache } from "./cache.js";

describe("cache", () => {
  afterEach(() => {
    clearCache();
  });

  describe("setKey / getKey", () => {
    it("stores and retrieves a key", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-abc", keyType: "api-key" });
      const result = getKey("telegram", "user1", "openai");
      expect(result).toEqual({ credential: "sk-abc", keyType: "api-key" });
    });

    it("returns null for non-existent key", () => {
      expect(getKey("telegram", "user1", "openai")).toBeNull();
    });

    it("returns null for wrong provider", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-abc", keyType: "api-key" });
      expect(getKey("telegram", "user1", "anthropic")).toBeNull();
    });

    it("returns null for wrong user", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-abc", keyType: "api-key" });
      expect(getKey("telegram", "user2", "openai")).toBeNull();
    });

    it("returns null for wrong channel", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-abc", keyType: "api-key" });
      expect(getKey("discord", "user1", "openai")).toBeNull();
    });

    it("overwrites existing key", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-old", keyType: "api-key" });
      setKey("telegram", "user1", "openai", { credential: "sk-new", keyType: "oauth" });
      const result = getKey("telegram", "user1", "openai");
      expect(result).toEqual({ credential: "sk-new", keyType: "oauth" });
    });

    it("stores multiple providers per user", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-oa", keyType: "api-key" });
      setKey("telegram", "user1", "anthropic", { credential: "sk-an", keyType: "api-key" });
      expect(getKey("telegram", "user1", "openai")?.credential).toBe("sk-oa");
      expect(getKey("telegram", "user1", "anthropic")?.credential).toBe("sk-an");
    });

    it("isolates different users", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-1", keyType: "api-key" });
      setKey("telegram", "user2", "openai", { credential: "sk-2", keyType: "api-key" });
      expect(getKey("telegram", "user1", "openai")?.credential).toBe("sk-1");
      expect(getKey("telegram", "user2", "openai")?.credential).toBe("sk-2");
    });
  });

  describe("deleteKey", () => {
    it("returns true when key existed", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-abc", keyType: "api-key" });
      expect(deleteKey("telegram", "user1", "openai")).toBe(true);
    });

    it("returns false when key did not exist", () => {
      expect(deleteKey("telegram", "user1", "openai")).toBe(false);
    });

    it("makes key unretrievable after deletion", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-abc", keyType: "api-key" });
      deleteKey("telegram", "user1", "openai");
      expect(getKey("telegram", "user1", "openai")).toBeNull();
    });

    it("does not affect other providers", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-oa", keyType: "api-key" });
      setKey("telegram", "user1", "anthropic", { credential: "sk-an", keyType: "api-key" });
      deleteKey("telegram", "user1", "openai");
      expect(getKey("telegram", "user1", "anthropic")?.credential).toBe("sk-an");
    });
  });

  describe("listKeys", () => {
    it("returns empty array for unknown user", () => {
      expect(listKeys("telegram", "user1")).toEqual([]);
    });

    it("lists all providers for a user", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-oa", keyType: "api-key" });
      setKey("telegram", "user1", "anthropic", { credential: "tok", keyType: "oauth" });

      const keys = listKeys("telegram", "user1");
      expect(keys).toHaveLength(2);
      expect(keys).toContainEqual({ provider: "openai", keyType: "api-key" });
      expect(keys).toContainEqual({ provider: "anthropic", keyType: "oauth" });
    });

    it("does not leak credentials", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-secret", keyType: "api-key" });
      const keys = listKeys("telegram", "user1");
      // listKeys returns provider+keyType only, no credential
      for (const k of keys) {
        expect(k).not.toHaveProperty("credential");
      }
    });
  });

  describe("clearCache", () => {
    it("removes all entries", () => {
      setKey("telegram", "user1", "openai", { credential: "sk-1", keyType: "api-key" });
      setKey("discord", "user2", "anthropic", { credential: "sk-2", keyType: "oauth" });
      clearCache();
      expect(getKey("telegram", "user1", "openai")).toBeNull();
      expect(getKey("discord", "user2", "anthropic")).toBeNull();
    });
  });
});
