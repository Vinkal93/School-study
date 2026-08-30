/**
 * School Study — High-Performance In-Memory Query & Cache Engine
 * Features:
 * - Stale-While-Revalidate (SWR) caching
 * - In-flight Promise deduplication (prevents redundant parallel network requests)
 * - Granular cache invalidation & optimistic updates
 * - Configurable staleTime and cacheTime with memory safety
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  staleTime: number;
  cacheTime: number;
}

export interface FetchOptions {
  staleTime?: number; // ms before data is considered stale (default: 30_000ms / 30s)
  cacheTime?: number; // ms before unused data is evicted from memory (default: 300_000ms / 5min)
  forceRefresh?: boolean; // bypass cache and execute fresh fetch
}

class QueryClient {
  private cache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private subscribers = new Map<string, Set<(data: any) => void>>();

  /**
   * Fetches data with automatic SWR caching and request deduplication.
   * If a fetch for the same key is already in progress, all callers share the same Promise.
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: FetchOptions = {}
  ): Promise<T> {
    const { staleTime = 30_000, cacheTime = 300_000, forceRefresh = false } = options;
    const now = Date.now();

    // 1. Return valid unexpired cache if not forcing refresh
    if (!forceRefresh && this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      const isFresh = now - entry.timestamp < entry.staleTime;
      if (isFresh) {
        return entry.data as T;
      }
    }

    // 2. Return shared in-flight promise if a request is already running for this key
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key)! as Promise<T>;
    }

    // 3. Initiate new fetch with promise deduplication
    const promise = (async () => {
      try {
        const result = await fetcher();
        this.setCacheData(key, result, { staleTime, cacheTime });
        this.notifySubscribers(key, result);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Synchronously reads cached data if present.
   */
  getCacheData<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : undefined;
  }

  /**
   * Checks if cached data is still fresh.
   */
  isCacheFresh(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.staleTime;
  }

  /**
   * Sets or updates cache data directly (useful for optimistic updates).
   */
  setCacheData<T>(
    key: string,
    data: T,
    options: { staleTime?: number; cacheTime?: number } = {}
  ): void {
    const { staleTime = 30_000, cacheTime = 300_000 } = options;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      cacheTime,
    });
    this.notifySubscribers(key, data);
  }

  /**
   * Invalidates cache by exact key or regex pattern.
   * Example: invalidateCache('students:*')
   */
  invalidateCache(pattern?: string | RegExp): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    if (typeof pattern === "string") {
      if (pattern.includes("*")) {
        const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.cache.delete(key);
          }
        }
      } else {
        this.cache.delete(pattern);
      }
    } else if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Subscribe to cache updates for a given key.
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  private notifySubscribers(key: string, data: any): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.warn("Subscriber notification error:", e);
        }
      });
    }
  }

  /**
   * Cleans up expired cache entries to prevent memory leaks in long sessions.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.cacheTime) {
        this.cache.delete(key);
      }
    }
  }
}

// Global Singleton QueryClient
export const appQueryClient = new QueryClient();

// Periodic garbage collection every 2 minutes
if (typeof window !== "undefined") {
  setInterval(() => {
    appQueryClient.cleanup();
  }, 120_000);
}
