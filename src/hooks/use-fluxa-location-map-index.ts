import { useCallback, useEffect, useState } from "react";

import { locationService, type LocationMapIndexRecord } from "@/services/location-service";

interface UseFluxaLocationMapIndexOptions {
  enabled?: boolean;
}

interface UseFluxaLocationMapIndexResult {
  indexPoints: LocationMapIndexRecord[];
  loading: boolean;
  error: string | null;
  refreshIndex: () => Promise<void>;
}

const INDEX_ERROR_MESSAGE = "Unable to load location index.";

let sharedIndexCache: LocationMapIndexRecord[] | null = null;
let sharedIndexPromise: Promise<LocationMapIndexRecord[]> | null = null;

export function invalidateFluxaLocationMapIndexCache(): void {
  sharedIndexCache = null;
  sharedIndexPromise = null;
}

function formatIndexError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return INDEX_ERROR_MESSAGE;
}

export function useFluxaLocationMapIndex({
  enabled = true
}: UseFluxaLocationMapIndexOptions = {}): UseFluxaLocationMapIndexResult {
  const [indexPoints, setIndexPoints] = useState<LocationMapIndexRecord[]>(sharedIndexCache || []);
  const [loading, setLoading] = useState(enabled && !sharedIndexCache);
  const [error, setError] = useState<string | null>(null);

  const refreshIndex = useCallback(async () => {
    if (!enabled) {
      setIndexPoints([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    const nextPromise = locationService.listLocationMapIndex();
    sharedIndexPromise = nextPromise;

    try {
      const nextIndexPoints = await nextPromise;
      sharedIndexCache = nextIndexPoints;
      setIndexPoints(nextIndexPoints);
      setError(null);
    } catch (nextError) {
      setError(formatIndexError(nextError));
    } finally {
      if (sharedIndexPromise === nextPromise) {
        sharedIndexPromise = null;
      }
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setIndexPoints([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedIndexCache) {
      setIndexPoints(sharedIndexCache);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedIndexPromise) {
      setLoading(true);
      void sharedIndexPromise
        .then((nextIndexPoints) => {
          sharedIndexCache = nextIndexPoints;
          setIndexPoints(nextIndexPoints);
          setError(null);
        })
        .catch((nextError) => {
          setError(formatIndexError(nextError));
        })
        .finally(() => {
          if (sharedIndexPromise) {
            sharedIndexPromise = null;
          }
          setLoading(false);
        });
      return;
    }

    void refreshIndex();
  }, [enabled, refreshIndex]);

  return {
    indexPoints,
    loading,
    error,
    refreshIndex
  };
}
