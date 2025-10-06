"use client";

import { useEffect, useMemo, useState } from "react";

type UseImageRetryOptions = {
  maxRetries?: number;
  delayMs?: number;
};

export function useImageRetry(
  src: string | null,
  { maxRetries = 2, delayMs = 300 }: UseImageRetryOptions = {},
) {
  const [retryCount, setRetryCount] = useState(0);
  const [fallback, setFallback] = useState(false);

  // Reset state when src changes
  useEffect(() => {
    // Reference src so linters recognize the dependency is necessary
    if (src !== undefined) {
      setRetryCount(0);
      setFallback(false);
    }
  }, [src]);

  const imageKey = useMemo(() => retryCount, [retryCount]);

  const handleError = () => {
    setTimeout(() => {
      if (retryCount < maxRetries) {
        setRetryCount((c) => c + 1);
      } else {
        setFallback(true);
      }
    }, delayMs);
  };

  return {
    retryCount,
    imageKey,
    showFallback: fallback || !src,
    handleError,
  } as const;
}
