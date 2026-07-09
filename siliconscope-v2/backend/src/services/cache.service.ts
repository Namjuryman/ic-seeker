type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 500;
let cacheGeneration = 0;

function readCache<T>(key: string, now = Date.now()) {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (!hit) return { found: false as const, value: undefined };
  if (hit.expiresAt <= now) {
    cache.delete(key);
    return { found: false as const, value: undefined };
  }
  cache.delete(key);
  cache.set(key, hit);
  return { found: true as const, value: hit.value };
}

function writeCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export function memoCache<T>(key: string, ttlMs: number, factory: () => T): T {
  const now = Date.now();
  const hit = readCache<T>(key, now);
  if (hit.found) return hit.value;
  const value = factory();
  writeCache(key, value, ttlMs);
  return value;
}

export async function memoCacheAsync<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = readCache<T>(key, now);
  if (hit.found) return hit.value;
  const inFlight = pending.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const generation = cacheGeneration;
  const promise = factory()
    .then((value) => {
      if (generation === cacheGeneration) writeCache(key, value, ttlMs);
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    cacheGeneration += 1;
    cache.clear();
    pending.clear();
    return;
  }
  cacheGeneration += 1;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of pending.keys()) {
    if (key.startsWith(prefix)) pending.delete(key);
  }
}
