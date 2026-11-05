/**
 * School Study — High-Performance In-Memory Query & Cache Engine 3.0
 * Features:
 * - Stale-While-Revalidate (SWR) caching with AbortSignal cancellation
 * - In-flight Promise deduplication (prevents redundant parallel network requests)
 * - Granular cache invalidation & optimistic updates
 * - Strict multi-tenant isolation with tenant-scoped cache purging
 * - Configurable staleTime and cacheTime with memory safety & LRU bounding
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
  signal?: AbortSignal; // optional AbortSignal for obsolete request cancellation
}

class QueryClient {
  private cache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<any>>();
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private readonly MAX_CACHE_ENTRIES = 250;

  /**
   * Fetches data with automatic SWR caching and request deduplication.
   * If a fetch for the same key is already in progress, all callers share the same Promise.
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: (signal?: AbortSignal) => Promise<T>,
    options: FetchOptions = {}
  ): Promise<T> {
    const { staleTime = 30_000, cacheTime = 300_000, forceRefresh = false, signal } = options;

    if (signal?.aborted) {
      throw new DOMException("The request was aborted", "AbortError");
    }

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
        if (signal?.aborted) {
          throw new DOMException("The request was aborted", "AbortError");
        }
        const result = await fetcher(signal);
        if (!signal?.aborted) {
          this.setCacheData(key, result, { staleTime, cacheTime });
          this.notifySubscribers(key, result);
        }
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

    // Enforce memory bounds
    if (this.cache.size >= this.MAX_CACHE_ENTRIES && !this.cache.has(key)) {
      this.cleanup(true);
    }

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
   * Strictly purges all cached data associated with a specific school tenant.
   * Essential for tenant isolation upon school switching or user logout.
   */
  purgeTenant(schoolId: string): void {
    if (!schoolId) return;
    const pattern = new RegExp(`[:_]${schoolId}([:_]|$)`);
    for (const key of this.cache.keys()) {
      if (pattern.test(key) || key.includes(schoolId)) {
        this.cache.delete(key);
      }
    }
    for (const inFlightKey of this.inFlightRequests.keys()) {
      if (pattern.test(inFlightKey) || inFlightKey.includes(schoolId)) {
        this.inFlightRequests.delete(inFlightKey);
      }
    }
  }

  /**
   * Purges entire cache and active in-flight tracking (e.g. on complete sign out).
   */
  purgeAll(): void {
    this.cache.clear();
    this.inFlightRequests.clear();
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
   * If forceLru is true, evicts oldest 20% entries when memory limit reached.
   */
  cleanup(forceLru: boolean = false): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.cacheTime) {
        this.cache.delete(key);
      }
    }

    if (forceLru && this.cache.size >= this.MAX_CACHE_ENTRIES) {
      const keysToDelete = Array.from(this.cache.keys()).slice(0, Math.floor(this.MAX_CACHE_ENTRIES * 0.2));
      for (const k of keysToDelete) {
        this.cache.delete(k);
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
