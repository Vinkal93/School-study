"use client";

/**
 * Ultra-Fast Zero-Flicker SWR Data Cache
 * Enables instant data rendering from memory / localStorage before revalidating from Firestore
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { hasConsent } from "@/lib/cookies/cookie-consent";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh window

export function getFastCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  // 1. Check in-memory store (0ms instant lookup)
  const mem = memoryStore.get(key);
  if (mem) {
    if (Date.now() - mem.timestamp < mem.ttlMs) {
      return mem.data as T;
    }
  }

  // 2. Check localStorage if performance cookies/cache are allowed or default
  try {
    const raw = localStorage.getItem(`ss_fast_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      if (parsed && parsed.data !== undefined) {
        // Cache entry exists; populate memoryStore
        memoryStore.set(key, parsed as CacheEntry<unknown>);
        return parsed.data;
      }
    }
  } catch {}

  return null;
}

export function setFastCache<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (typeof window === "undefined" || data === undefined || data === null) return;

  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttlMs,
  };

  memoryStore.set(key, entry as CacheEntry<unknown>);

  // Check consent before writing large blobs to localStorage
  try {
    if (hasConsent("performance")) {
      localStorage.setItem(`ss_fast_${key}`, JSON.stringify(entry));
    }
  } catch {}
}

export function invalidateFastCache(keyPrefix?: string): void {
  if (typeof window === "undefined") return;

  if (!keyPrefix) {
    memoryStore.clear();
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("ss_fast_")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
    return;
  }

  // Remove matching keys
  for (const k of Array.from(memoryStore.keys())) {
    if (k.startsWith(keyPrefix)) {
      memoryStore.delete(k);
    }
  }

  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(`ss_fast_${keyPrefix}`)) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

interface UseFastDataOptions<T> {
  ttlMs?: number;
  initialData?: T;
  enabled?: boolean;
}

/**
 * React Hook for Zero-Flicker instant data rendering
 */
export function useFastData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseFastDataOptions<T> = {}
) {
  const { ttlMs = DEFAULT_TTL_MS, initialData, enabled = true } = options;

  // Initialize state synchronously with cached data to avoid render flicker
  const [data, setData] = useState<T>(() => {
    if (typeof window !== "undefined") {
      const cached = getFastCache<T>(cacheKey);
      if (cached !== null) return cached;
    }
    return initialData as T;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = getFastCache<T>(cacheKey);
      if (cached !== null) return false; // Already have data! No loading spinner needed
    }
    return enabled;
  });

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef<boolean>(true);

  const revalidate = useCallback(
    async (showLoadingSpinner: boolean = false) => {
      if (!enabled) return;
      if (showLoadingSpinner) setLoading(true);
      setIsRefreshing(true);

      try {
        const freshData = await fetcher();
        if (isMounted.current && freshData !== undefined) {
          setData(freshData);
          setFastCache(cacheKey, freshData, ttlMs);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [cacheKey, enabled, fetcher, ttlMs]
  );

  useEffect(() => {
    isMounted.current = true;

    // Check if we have cached data
    const cached = getFastCache<T>(cacheKey);
    if (cached !== null) {
      setData(cached);
      setLoading(false);
      // Background revalidate without showing a spinner
      revalidate(false);
    } else if (enabled) {
      revalidate(true);
    }

    return () => {
      isMounted.current = false;
    };
  }, [cacheKey, enabled, revalidate]);

  return {
    data,
    loading,
    isRefreshing,
    error,
    setData: (newData: T) => {
      setData(newData);
      setFastCache(cacheKey, newData, ttlMs);
    },
    refresh: () => revalidate(true),
    mutate: (newData: T) => {
      setData(newData);
      setFastCache(cacheKey, newData, ttlMs);
    },
  };
}
