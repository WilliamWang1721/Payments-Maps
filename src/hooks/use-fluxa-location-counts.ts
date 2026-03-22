import { useCallback, useEffect, useState } from "react";

import { locationService, type LocationCounts } from "@/services/location-service";

interface UseFluxaLocationCountsOptions {
  enabled?: boolean;
}

interface UseFluxaLocationCountsResult {
  counts: LocationCounts | null;
  loading: boolean;
  error: string | null;
  refreshCounts: () => Promise<void>;
}

const COUNTS_ERROR_MESSAGE = "Unable to load location counts.";

let sharedCountsCache: LocationCounts | null = null;
let sharedCountsPromise: Promise<LocationCounts> | null = null;

export function invalidateFluxaLocationCountsCache(): void {
  sharedCountsCache = null;
  sharedCountsPromise = null;
}

function formatCountsError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return COUNTS_ERROR_MESSAGE;
}

export function useFluxaLocationCounts({
  enabled = true
}: UseFluxaLocationCountsOptions = {}): UseFluxaLocationCountsResult {
  const [counts, setCounts] = useState<LocationCounts | null>(sharedCountsCache);
  const [loading, setLoading] = useState(enabled && !sharedCountsCache);
  const [error, setError] = useState<string | null>(null);

  const refreshCounts = useCallback(async () => {
    if (!enabled) {
      setCounts(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    const nextPromise = locationService.getLocationCounts();
    sharedCountsPromise = nextPromise;

    try {
      const nextCounts = await nextPromise;
      sharedCountsCache = nextCounts;
      setCounts(nextCounts);
      setError(null);
    } catch (nextError) {
      setError(formatCountsError(nextError));
    } finally {
      if (sharedCountsPromise === nextPromise) {
        sharedCountsPromise = null;
      }
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCounts(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedCountsCache) {
      setCounts(sharedCountsCache);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedCountsPromise) {
      setLoading(true);
      void sharedCountsPromise
        .then((nextCounts) => {
          sharedCountsCache = nextCounts;
          setCounts(nextCounts);
          setError(null);
        })
        .catch((nextError) => {
          setError(formatCountsError(nextError));
        })
        .finally(() => {
          if (sharedCountsPromise) {
            sharedCountsPromise = null;
          }
          setLoading(false);
        });
      return;
    }

    void refreshCounts();
  }, [enabled, refreshCounts]);

  return {
    counts,
    loading,
    error,
    refreshCounts
  };
}
