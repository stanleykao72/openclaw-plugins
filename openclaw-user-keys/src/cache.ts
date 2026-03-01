import type { CachedKey } from "./types.js";

// Outer key: "channel:userId", inner key: provider
const cache = new Map<string, Map<string, CachedKey>>();

function userKey(channel: string, userId: string): string {
  return `${channel}:${userId}`;
}

export function setKey(channel: string, userId: string, provider: string, key: CachedKey): void {
  const uk = userKey(channel, userId);
  let providerMap = cache.get(uk);
  if (!providerMap) {
    providerMap = new Map();
    cache.set(uk, providerMap);
  }
  providerMap.set(provider, key);
}

export function getKey(channel: string, userId: string, provider: string): CachedKey | null {
  const providerMap = cache.get(userKey(channel, userId));
  if (!providerMap) return null;
  return providerMap.get(provider) ?? null;
}

export function deleteKey(channel: string, userId: string, provider: string): boolean {
  const providerMap = cache.get(userKey(channel, userId));
  if (!providerMap) return false;
  const existed = providerMap.delete(provider);
  if (providerMap.size === 0) cache.delete(userKey(channel, userId));
  return existed;
}

export function listKeys(channel: string, userId: string): Array<{ provider: string; keyType: string }> {
  const providerMap = cache.get(userKey(channel, userId));
  if (!providerMap) return [];
  const results: Array<{ provider: string; keyType: string }> = [];
  for (const [provider, key] of providerMap) {
    results.push({ provider, keyType: key.keyType });
  }
  return results;
}

export function clearCache(): void {
  cache.clear();
}
