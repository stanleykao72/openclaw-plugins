import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import * as keyStore from "../key-store.js";

const STORE_PATH = join(homedir(), ".openclaw", "odoo-bindings.enc.json");

describe("key-store", () => {
  const SECRET = "test-secret-for-encryption";

  beforeEach(() => {
    keyStore.clearStore();
    // Remove test store if exists
    if (existsSync(STORE_PATH)) {
      unlinkSync(STORE_PATH);
    }
  });

  afterEach(() => {
    keyStore.clearStore();
    if (existsSync(STORE_PATH)) {
      unlinkSync(STORE_PATH);
    }
  });

  it("should initialize an empty store", () => {
    const count = keyStore.initStore(SECRET);
    expect(count).toBe(0);
    expect(existsSync(STORE_PATH)).toBe(true);
  });

  it("should set and get an API key", () => {
    keyStore.initStore(SECRET);
    keyStore.setApiKey("telegram", "user1", "api-key-abc");

    const retrieved = keyStore.getApiKey("telegram", "user1");
    expect(retrieved).toBe("api-key-abc");
  });

  it("should return null for non-existent key", () => {
    keyStore.initStore(SECRET);
    const retrieved = keyStore.getApiKey("telegram", "nonexistent");
    expect(retrieved).toBeNull();
  });

  it("should delete an API key", () => {
    keyStore.initStore(SECRET);
    keyStore.setApiKey("telegram", "user2", "api-key-def");

    const deleted = keyStore.deleteApiKey("telegram", "user2");
    expect(deleted).toBe(true);

    const retrieved = keyStore.getApiKey("telegram", "user2");
    expect(retrieved).toBeNull();
  });

  it("should return false when deleting non-existent key", () => {
    keyStore.initStore(SECRET);
    const deleted = keyStore.deleteApiKey("telegram", "nobody");
    expect(deleted).toBe(false);
  });

  it("should persist across re-initialization", () => {
    keyStore.initStore(SECRET);
    keyStore.setApiKey("discord", "d1", "key-persist");
    keyStore.clearStore();

    const count = keyStore.initStore(SECRET);
    expect(count).toBe(1);

    const retrieved = keyStore.getApiKey("discord", "d1");
    expect(retrieved).toBe("key-persist");
  });

  it("should list bindings", () => {
    keyStore.initStore(SECRET);
    keyStore.setApiKey("telegram", "t1", "k1");
    keyStore.setApiKey("discord", "d1", "k2");

    const bindings = keyStore.listBindings();
    expect(bindings).toHaveLength(2);
    expect(bindings).toEqual(
      expect.arrayContaining([
        { channel: "telegram", channelUid: "t1" },
        { channel: "discord", channelUid: "d1" },
      ]),
    );
  });

  it("should throw when setting key without initialization", () => {
    expect(() => keyStore.setApiKey("t", "u", "k")).toThrow(
      "Store not initialized",
    );
  });

  it("should overwrite existing key", () => {
    keyStore.initStore(SECRET);
    keyStore.setApiKey("telegram", "u1", "old-key");
    keyStore.setApiKey("telegram", "u1", "new-key");

    const retrieved = keyStore.getApiKey("telegram", "u1");
    expect(retrieved).toBe("new-key");
  });
});
