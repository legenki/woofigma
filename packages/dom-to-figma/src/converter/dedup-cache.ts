export type DedupCacheOptions<TKey, TLoaded> = {
  load: (key: TKey) => Promise<TLoaded>;
  toCacheKey: (key: TKey) => string;
};

/**
 * In-memory cache that deduplicates concurrent loads by key. Each unique key
 * is resolved at most once per cache instance: cache hits return immediately,
 * in-flight loads share a single promise, and failures clear the slot so the
 * next request can retry.
 */
export class DedupCache<TKey, TLoaded> {
  private readonly cache = new Map<string, TLoaded>();
  private readonly inFlight = new Map<string, Promise<TLoaded>>();
  private readonly load: (key: TKey) => Promise<TLoaded>;
  private readonly toCacheKey: (key: TKey) => string;

  constructor({ load, toCacheKey }: DedupCacheOptions<TKey, TLoaded>) {
    this.load = load;
    this.toCacheKey = toCacheKey;
  }

  get(key: TKey): Promise<TLoaded> {
    const cacheKey = this.toCacheKey(key);

    const cached = this.cache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    const inFlight = this.inFlight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const promise = this.load(key)
      .then((value) => {
        this.cache.set(cacheKey, value);
        this.inFlight.delete(cacheKey);
        return value;
      })
      .catch((error: unknown) => {
        this.inFlight.delete(cacheKey);
        throw error;
      });

    this.inFlight.set(cacheKey, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
    this.inFlight.clear();
  }
}
