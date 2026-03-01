import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { deriveMasterKey, generateSalt, encrypt, decrypt } from "./crypto.js";
import type { EncryptedStore, UserKeyEntry } from "./types.js";

const STORE_PATH = join(homedir(), ".openclaw", "user-keys.enc.json");

let masterKey: Buffer | null = null;
let store: EncryptedStore | null = null;

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function createEmptyStore(salt: Buffer): EncryptedStore {
  return { version: 1, salt: salt.toString("hex"), entries: {} };
}

function loadStoreFromDisk(): EncryptedStore | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    return JSON.parse(raw) as EncryptedStore;
  } catch {
    return null;
  }
}

function saveStoreToDisk(s: EncryptedStore): void {
  ensureDir(STORE_PATH);
  writeFileSync(STORE_PATH, JSON.stringify(s, null, 2), { mode: 0o600 });
}

/**
 * Build the composite key for store entries.
 */
export function entryKey(channel: string, userId: string, provider: string): string {
  return `${channel}:${userId}:${provider}`;
}

/**
 * Initialize the store: derive master key from gateway token, load or create encrypted file.
 * Returns the number of loaded entries.
 */
export function initStore(gatewayToken: string): number {
  store = loadStoreFromDisk();

  if (store) {
    const salt = Buffer.from(store.salt, "hex");
    masterKey = deriveMasterKey(gatewayToken, salt);
  } else {
    const salt = generateSalt();
    masterKey = deriveMasterKey(gatewayToken, salt);
    store = createEmptyStore(salt);
    saveStoreToDisk(store);
  }

  return Object.keys(store.entries).length;
}

/**
 * Set (upsert) an encrypted entry.
 */
export function setEntry(channel: string, userId: string, provider: string, entry: UserKeyEntry): void {
  if (!masterKey || !store) throw new Error("Store not initialized");

  const key = entryKey(channel, userId, provider);
  const plaintext = JSON.stringify(entry);
  store.entries[key] = encrypt(masterKey, plaintext);
  saveStoreToDisk(store);
}

/**
 * Get a decrypted entry, or null if not found.
 */
export function getEntry(channel: string, userId: string, provider: string): UserKeyEntry | null {
  if (!masterKey || !store) return null;

  const key = entryKey(channel, userId, provider);
  const blob = store.entries[key];
  if (!blob) return null;

  try {
    const plaintext = decrypt(masterKey, blob);
    return JSON.parse(plaintext) as UserKeyEntry;
  } catch {
    return null;
  }
}

/**
 * Delete an entry. Returns true if it existed.
 */
export function deleteEntry(channel: string, userId: string, provider: string): boolean {
  if (!masterKey || !store) return false;

  const key = entryKey(channel, userId, provider);
  if (!(key in store.entries)) return false;

  delete store.entries[key];
  saveStoreToDisk(store);
  return true;
}

/**
 * List all providers (with keyType) for a given user.
 */
export function listEntries(channel: string, userId: string): Array<{ provider: string; keyType: string }> {
  if (!masterKey || !store) return [];

  const prefix = `${channel}:${userId}:`;
  const results: Array<{ provider: string; keyType: string }> = [];

  for (const key of Object.keys(store.entries)) {
    if (!key.startsWith(prefix)) continue;
    const provider = key.slice(prefix.length);
    const entry = getEntry(channel, userId, provider);
    if (entry) {
      results.push({ provider, keyType: entry.keyType });
    }
  }

  return results;
}

/**
 * Get all entries (decrypted) for cache warming.
 */
export function getAllEntries(): Array<{ channel: string; userId: string; provider: string; entry: UserKeyEntry }> {
  if (!masterKey || !store) return [];

  const results: Array<{ channel: string; userId: string; provider: string; entry: UserKeyEntry }> = [];

  for (const key of Object.keys(store.entries)) {
    const parts = key.split(":");
    if (parts.length < 3) continue;

    // channel:userId:provider — channel and userId may contain colons,
    // but provider is always the last segment
    const provider = parts[parts.length - 1];
    const channelAndUser = parts.slice(0, -1).join(":");
    // Split channelAndUser into channel and userId
    // Convention: first segment is channel, rest is userId
    const firstColon = channelAndUser.indexOf(":");
    if (firstColon === -1) continue;
    const channel = channelAndUser.slice(0, firstColon);
    const userId = channelAndUser.slice(firstColon + 1);

    const blob = store.entries[key];
    try {
      const plaintext = decrypt(masterKey!, blob);
      const entry = JSON.parse(plaintext) as UserKeyEntry;
      results.push({ channel, userId, provider, entry });
    } catch {
      // Skip corrupted entries
    }
  }

  return results;
}

/**
 * Clear in-memory state (for gateway_stop).
 */
export function clearStore(): void {
  masterKey = null;
  store = null;
}
