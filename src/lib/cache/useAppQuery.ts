"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { appQueryClient, FetchOptions } from "./queryClient";

export interface UseAppQueryOptions<T> extends FetchOptions {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  initialData?: T;
}

export interface UseAppQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: any;
  refetch: (forceRefresh?: boolean) => Promise<T | undefined>;
  setData: (updater: T | ((prev: T | undefined) => T)) => void;
}

/**
 * High-performance React hook for Stale-While-Revalidate data fetching.
 * Displays cached data immediately if available, while fetching fresh data in the background.
 */
export function useAppQuery<T>(
  key: string | null | undefined,
  fetcher: () => Promise<T>,
  options: UseAppQueryOptions<T> = {}
): UseAppQueryResult<T> {
  const {
    enabled = true,
    staleTime = 30_000,
    cacheTime = 300_000,
    forceRefresh = false,
    initialData,
    onSuccess,
    onError,
  } = options;

  // Read initial data from cache synchronously if available
  const cachedData = key ? appQueryClient.getCacheData<T>(key) : undefined;
  const isFresh = key ? appQueryClient.isCacheFresh(key) : false;

  const [data, setDataState] = useState<T | undefined>(cachedData ?? initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedData && !initialData && enabled && !!key);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const executeFetch = useCallback(
    async (force: boolean = false): Promise<T | undefined> => {
      if (!key || !enabled) return undefined;

      setIsFetching(true);
      setIsError(false);
      setError(null);

      try {
        const result = await appQueryClient.fetchWithCache<T>(
          key,
          () => fetcherRef.current(),
          { staleTime, cacheTime, forceRefresh: force }
        );
        setDataState(result);
        if (onSuccessRef.current) onSuccessRef.current(result);
        return result;
      } catch (err: any) {
        setIsError(true);
        setError(err);
        if (onErrorRef.current) onErrorRef.current(err);
        return undefined;
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [key, enabled, staleTime, cacheTime]
  );

  // Subscribe to external cache mutations
  useEffect(() => {
    if (!key) return;

    const unsubscribe = appQueryClient.subscribe(key, (newData) => {
      setDataState(newData);
    });

    return () => unsubscribe();
  }, [key]);

  // Initial & background revalidation effect
  useEffect(() => {
    if (!key || !enabled) {
      setIsLoading(false);
      return;
    }

    const currentCached = appQueryClient.getCacheData<T>(key);
    if (currentCached !== undefined) {
      setDataState(currentCached);
      setIsLoading(false);
      // Background revalidate if stale
      if (!appQueryClient.isCacheFresh(key) || forceRefresh) {
        executeFetch(forceRefresh);
      }
    } else {
      setIsLoading(true);
      executeFetch(true);
    }
  }, [key, enabled, forceRefresh, executeFetch]);

  // Direct state setter for optimistic updates
  const setData = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      if (!key) return;
      setDataState((prev) => {
        const next = typeof updater === "function" ? (updater as any)(prev) : updater;
        appQueryClient.setCacheData(key, next, { staleTime, cacheTime });
        return next;
      });
    },
    [key, staleTime, cacheTime]
  );

  return {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch: executeFetch,
    setData,
  };
}
