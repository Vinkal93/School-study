"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to debounce any fast-changing value (e.g. search input).
 * Suppresses rapid Firebase/API calls while the user is typing.
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
