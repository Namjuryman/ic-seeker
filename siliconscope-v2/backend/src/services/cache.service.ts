type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();
let cacheGeneration = 0;

export function memoCache<T>(key: string, ttlMs: number, factory: () => T): T {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;
  const value = factory();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export async function memoCacheAsync<T>(key: string, ttlMs: number, factory: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;
  const inFlight = pending.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const generation = cacheGeneration;
  const promise = factory()
    .then((value) => {
      if (generation === cacheGeneration) cache.set(key, { value, expiresAt: Date.now() + ttlMs });
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
