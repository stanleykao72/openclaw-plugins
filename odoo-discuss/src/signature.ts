import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify HMAC-SHA256 signature on an inbound webhook from Odoo.
 *
 * Odoo's build_webhook_headers() signs: HMAC-SHA256(timestamp + "." + sorted_json, secret)
 * and sends X-OpenClaw-Signature + X-OpenClaw-Timestamp headers.
 *
 * We verify by re-sorting the parsed JSON body to match Odoo's sort_keys=True.
 */
export function verifyOdooOutboundSignature(params: {
  signature: string;
  timestamp: string;
  body: string;
  secret: string;
}): boolean {
  const { signature, timestamp, body, secret } = params;
  if (!signature || !timestamp || !secret) {
    return false;
  }

  // Odoo signs: HMAC(timestamp + "." + json.dumps(payload, sort_keys=True), secret)
  // We need to re-sort the JSON body to match.
  let sortedBody: string;
  try {
    const parsed = JSON.parse(body);
    sortedBody = jsonSortedStringify(parsed);
  } catch {
    return false;
  }

  const signInput = `${timestamp}.${sortedBody}`;
  const expected = createHmac("sha256", secret).update(signInput).digest("hex");

  if (signature.length !== expected.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/**
 * Generate HMAC-SHA256 signature for an outbound request to Odoo.
 *
 * Odoo's verify_signature() checks: HMAC-SHA256(raw_body_bytes, secret)
 * against the X-OpenClaw-Signature header.
 */
export function generateOdooInboundSignature(params: {
  body: string;
  secret: string;
}): string {
  return createHmac("sha256", params.secret).update(params.body).digest("hex");
}

/**
 * Extract signature and timestamp headers from an incoming request.
 */
export function extractOdooWebhookHeaders(
  headers: Record<string, string | string[] | undefined>,
): { signature: string; timestamp: string } | null {
  const getHeader = (name: string): string | undefined => {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  const signature = getHeader("X-OpenClaw-Signature") ?? getHeader("x-openclaw-signature");
  const timestamp = getHeader("X-OpenClaw-Timestamp") ?? getHeader("x-openclaw-timestamp");

  if (!signature || !timestamp) {
    return null;
  }

  return { signature, timestamp };
}

/**
 * JSON.stringify with sorted keys, matching Python's json.dumps(sort_keys=True).
 *
 * Python's json.dumps defaults to ensure_ascii=True, escaping all non-ASCII
 * characters as \uXXXX. We must do the same to produce matching signatures.
 */
function jsonSortedStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }
  if (typeof obj !== "object") {
    return ensureAscii(JSON.stringify(obj));
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => jsonSortedStringify(item)).join(", ") + "]";
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const value = (obj as Record<string, unknown>)[key];
    return ensureAscii(JSON.stringify(key)) + ": " + jsonSortedStringify(value);
  });
  return "{" + pairs.join(", ") + "}";
}

/**
 * Escape non-ASCII characters as \uXXXX to match Python's ensure_ascii=True.
 */
function ensureAscii(s: string): string {
  return s.replace(/[^\x00-\x7F]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code > 0xffff) {
      // Surrogate pair for characters outside BMP
      const hi = Math.floor((code - 0x10000) / 0x400) + 0xd800;
      const lo = ((code - 0x10000) % 0x400) + 0xdc00;
      return `\\u${hi.toString(16).padStart(4, "0")}\\u${lo.toString(16).padStart(4, "0")}`;
    }
    return `\\u${code.toString(16).padStart(4, "0")}`;
  });
}
