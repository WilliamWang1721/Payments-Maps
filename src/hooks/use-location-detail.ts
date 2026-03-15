import { useEffect, useState } from "react";

import { locationService } from "@/services/location-service";
import type { LocationDetailRecord, LocationRecord } from "@/types/location";

interface UseLocationDetailResult {
  detail: LocationDetailRecord | null;
  loading: boolean;
  error: string | null;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to load location detail.";
}

export function useLocationDetail(location: LocationRecord | null | undefined): UseLocationDetailResult {
  const [detail, setDetail] = useState<LocationDetailRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!location) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      try {
        const nextDetail = await locationService.getLocationDetail(location);
        if (!cancelled) {
          setDetail(nextDetail);
          setError(null);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(formatErrorMessage(nextError));
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [location]);

  return {
    detail,
    loading,
    error
  };
}
