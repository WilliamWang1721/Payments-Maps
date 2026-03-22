import { useCallback, useEffect, useState } from "react";

import { locationService } from "@/services/location-service";
import type { LocationRecord } from "@/types/location";

interface UseFluxaLocationDirectoryOptions {
  enabled?: boolean;
}

interface UseFluxaLocationDirectoryResult {
  locations: LocationRecord[];
  loading: boolean;
  error: string | null;
  refreshDirectory: () => Promise<void>;
}

const DIRECTORY_ERROR_MESSAGE = "Unable to load location directory.";

let sharedDirectoryCache: LocationRecord[] | null = null;
let sharedDirectoryPromise: Promise<LocationRecord[]> | null = null;

export function invalidateFluxaLocationDirectoryCache(): void {
  sharedDirectoryCache = null;
  sharedDirectoryPromise = null;
}

function formatDirectoryError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return DIRECTORY_ERROR_MESSAGE;
}

export function useFluxaLocationDirectory({
  enabled = true
}: UseFluxaLocationDirectoryOptions = {}): UseFluxaLocationDirectoryResult {
  const [locations, setLocations] = useState<LocationRecord[]>(sharedDirectoryCache || []);
  const [loading, setLoading] = useState(enabled && !sharedDirectoryCache);
  const [error, setError] = useState<string | null>(null);

  const refreshDirectory = useCallback(async () => {
    if (!enabled) {
      setLocations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    const nextPromise = locationService.listLocationDirectory();
    sharedDirectoryPromise = nextPromise;

    try {
      const nextLocations = await nextPromise;
      sharedDirectoryCache = nextLocations;
      setLocations(nextLocations);
      setError(null);
    } catch (nextError) {
      setError(formatDirectoryError(nextError));
    } finally {
      if (sharedDirectoryPromise === nextPromise) {
        sharedDirectoryPromise = null;
      }
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLocations([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedDirectoryCache) {
      setLocations(sharedDirectoryCache);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedDirectoryPromise) {
      setLoading(true);
      void sharedDirectoryPromise
        .then((nextLocations) => {
          sharedDirectoryCache = nextLocations;
          setLocations(nextLocations);
          setError(null);
        })
        .catch((nextError) => {
          setError(formatDirectoryError(nextError));
        })
        .finally(() => {
          if (sharedDirectoryPromise) {
            sharedDirectoryPromise = null;
          }
          setLoading(false);
        });
      return;
    }

    void refreshDirectory();
  }, [enabled, refreshDirectory]);

  return {
    locations,
    loading,
    error,
    refreshDirectory
  };
}
