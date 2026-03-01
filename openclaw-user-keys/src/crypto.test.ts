import { describe, expect, it } from "vitest";
import { deriveMasterKey, generateSalt, encrypt, decrypt } from "./crypto.js";

describe("crypto", () => {
  describe("generateSalt", () => {
    it("produces a 32-byte buffer", () => {
      const salt = generateSalt();
      expect(salt).toBeInstanceOf(Buffer);
      expect(salt.length).toBe(32);
    });

    it("produces unique salts", () => {
      const a = generateSalt();
      const b = generateSalt();
      expect(a.equals(b)).toBe(false);
    });
  });

  describe("deriveMasterKey", () => {
    it("produces a 32-byte key", () => {
      const salt = generateSalt();
      const key = deriveMasterKey("test-token", salt);
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it("is deterministic for same token + salt", () => {
      const salt = generateSalt();
      const a = deriveMasterKey("token-abc", salt);
      const b = deriveMasterKey("token-abc", salt);
      expect(a.equals(b)).toBe(true);
    });

    it("produces different keys for different tokens", () => {
      const salt = generateSalt();
      const a = deriveMasterKey("token-1", salt);
      const b = deriveMasterKey("token-2", salt);
      expect(a.equals(b)).toBe(false);
    });

    it("produces different keys for different salts", () => {
      const s1 = generateSalt();
      const s2 = generateSalt();
      const a = deriveMasterKey("same-token", s1);
      const b = deriveMasterKey("same-token", s2);
      expect(a.equals(b)).toBe(false);
    });
  });

  describe("encrypt / decrypt round-trip", () => {
    const salt = Buffer.alloc(32, 0xab);
    const masterKey = deriveMasterKey("round-trip-token", salt);

    it("round-trips a simple string", () => {
      const plaintext = "sk-test-key-12345";
      const blob = encrypt(masterKey, plaintext);
      const recovered = decrypt(masterKey, blob);
      expect(recovered).toBe(plaintext);
    });

    it("round-trips an empty string", () => {
      const blob = encrypt(masterKey, "");
      expect(decrypt(masterKey, blob)).toBe("");
    });

    it("round-trips unicode text", () => {
      const plaintext = "密鑰 🔑 clé";
      const blob = encrypt(masterKey, plaintext);
      expect(decrypt(masterKey, blob)).toBe(plaintext);
    });

    it("round-trips a JSON payload", () => {
      const obj = { credential: "sk-xxx", keyType: "api-key" };
      const plaintext = JSON.stringify(obj);
      const blob = encrypt(masterKey, plaintext);
      const recovered = JSON.parse(decrypt(masterKey, blob));
      expect(recovered).toEqual(obj);
    });

    it("produces different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "same-input";
      const a = encrypt(masterKey, plaintext);
      const b = encrypt(masterKey, plaintext);
      expect(a).not.toBe(b);
      // Both still decrypt correctly
      expect(decrypt(masterKey, a)).toBe(plaintext);
      expect(decrypt(masterKey, b)).toBe(plaintext);
    });

    it("output is valid base64", () => {
      const blob = encrypt(masterKey, "test");
      expect(() => Buffer.from(blob, "base64")).not.toThrow();
      const decoded = Buffer.from(blob, "base64");
      // Minimum: 12 (IV) + 16 (authTag) + ciphertext
      expect(decoded.length).toBeGreaterThanOrEqual(28);
    });
  });

  describe("decrypt error cases", () => {
    const salt = Buffer.alloc(32, 0xcd);
    const masterKey = deriveMasterKey("error-test-token", salt);

    it("throws on too-short blob", () => {
      const shortBlob = Buffer.alloc(20).toString("base64"); // < 28 bytes
      expect(() => decrypt(masterKey, shortBlob)).toThrow("too short");
    });

    it("throws on wrong key", () => {
      const blob = encrypt(masterKey, "secret");
      const wrongKey = deriveMasterKey("wrong-token", salt);
      expect(() => decrypt(wrongKey, blob)).toThrow();
    });

    it("throws on tampered ciphertext", () => {
      const blob = encrypt(masterKey, "secret");
      const buf = Buffer.from(blob, "base64");
      // Flip a byte in the ciphertext region
      buf[buf.length - 1] ^= 0xff;
      const tampered = buf.toString("base64");
      expect(() => decrypt(masterKey, tampered)).toThrow();
    });

    it("throws on tampered auth tag", () => {
      const blob = encrypt(masterKey, "secret");
      const buf = Buffer.from(blob, "base64");
      // Flip a byte in the auth tag region (bytes 12-27)
      buf[14] ^= 0xff;
      const tampered = buf.toString("base64");
      expect(() => decrypt(masterKey, tampered)).toThrow();
    });
  });
});
