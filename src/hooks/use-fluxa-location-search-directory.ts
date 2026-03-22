import { useCallback, useEffect, useState } from "react";

import { locationService, type LocationSearchRecord } from "@/services/location-service";

interface UseFluxaLocationSearchDirectoryOptions {
  enabled?: boolean;
}

interface UseFluxaLocationSearchDirectoryResult {
  locations: LocationSearchRecord[];
  loading: boolean;
  error: string | null;
  refreshDirectory: () => Promise<void>;
}

const DIRECTORY_ERROR_MESSAGE = "Unable to load search directory.";

let sharedDirectoryCache: LocationSearchRecord[] | null = null;
let sharedDirectoryPromise: Promise<LocationSearchRecord[]> | null = null;

export function invalidateFluxaLocationSearchDirectoryCache(): void {
  sharedDirectoryCache = null;
  sharedDirectoryPromise = null;
}

function formatDirectoryError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return DIRECTORY_ERROR_MESSAGE;
}

export function useFluxaLocationSearchDirectory({
  enabled = true
}: UseFluxaLocationSearchDirectoryOptions = {}): UseFluxaLocationSearchDirectoryResult {
  const [locations, setLocations] = useState<LocationSearchRecord[]>(sharedDirectoryCache || []);
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
    const nextPromise = locationService.listLocationSearchDirectory();
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
