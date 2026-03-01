/**
 * Encrypted per-user API key storage for Odoo bindings.
 *
 * Reuses the crypto pattern from @openclaw/user-keys:
 *   PBKDF2 key derivation + AES-256-GCM encryption.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";

const STORE_PATH = join(homedir(), ".openclaw", "odoo-bindings.enc.json");
const PBKDF2_ITERATIONS = 600_000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_DIGEST = "sha512";
const AES_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

type EncryptedStore = {
  version: 1;
  salt: string;
  entries: Record<string, string>; // "channel:channelUid" → encrypted blob
};

let masterKey: Buffer | null = null;
let store: EncryptedStore | null = null;

// ── crypto helpers ────────────────────────────────────────────────

function deriveMasterKey(secret: string, salt: Buffer): Buffer {
  return pbkdf2Sync(
    secret,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST,
  );
}

function encrypt(key: Buffer, plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decrypt(key: Buffer, blob: string): string {
  const combined = Buffer.from(blob, "base64");
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted blob: too short");
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}

// ── store lifecycle ───────────────────────────────────────────────

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadFromDisk(): EncryptedStore | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as EncryptedStore;
  } catch {
    return null;
  }
}

function saveToDisk(s: EncryptedStore): void {
  ensureDir(STORE_PATH);
  writeFileSync(STORE_PATH, JSON.stringify(s, null, 2), { mode: 0o600 });
}

function entryKey(channel: string, channelUid: string): string {
  return `${channel}:${channelUid}`;
}

/**
 * Initialize store from the client secret (used as encryption passphrase).
 */
export function initStore(secret: string): number {
  store = loadFromDisk();
  if (store) {
    const salt = Buffer.from(store.salt, "hex");
    masterKey = deriveMasterKey(secret, salt);
  } else {
    const salt = randomBytes(32);
    masterKey = deriveMasterKey(secret, salt);
    store = { version: 1, salt: salt.toString("hex"), entries: {} };
    saveToDisk(store);
  }
  return Object.keys(store.entries).length;
}

export function clearStore(): void {
  masterKey = null;
  store = null;
}

// ── CRUD ──────────────────────────────────────────────────────────

export function setApiKey(
  channel: string,
  channelUid: string,
  apiKey: string,
): void {
  if (!masterKey || !store) throw new Error("Store not initialized");
  const key = entryKey(channel, channelUid);
  store.entries[key] = encrypt(masterKey, apiKey);
  saveToDisk(store);
}

export function getApiKey(
  channel: string,
  channelUid: string,
): string | null {
  if (!masterKey || !store) return null;
  const blob = store.entries[entryKey(channel, channelUid)];
  if (!blob) return null;
  try {
    return decrypt(masterKey, blob);
  } catch {
    return null;
  }
}

export function deleteApiKey(
  channel: string,
  channelUid: string,
): boolean {
  if (!masterKey || !store) return false;
  const key = entryKey(channel, channelUid);
  if (!(key in store.entries)) return false;
  delete store.entries[key];
  saveToDisk(store);
  return true;
}

export function listBindings(): Array<{
  channel: string;
  channelUid: string;
}> {
  if (!store) return [];
  return Object.keys(store.entries).map((k) => {
    const idx = k.indexOf(":");
    return {
      channel: k.slice(0, idx),
      channelUid: k.slice(idx + 1),
    };
  });
}
