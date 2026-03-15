import { useEffect, useState } from "react";

import { locationService } from "@/services/location-service";
import type { LocationDetailRecord, LocationRecord } from "@/types/location";

interface UseLocationDetailResult {
  detail: LocationDetailRecord | null;
  loading: boolean;
  error: string | null;
  refreshDetail: () => Promise<void>;
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

  const refreshDetail = async (): Promise<void> => {
    if (!location) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextDetail = await locationService.getLocationDetail(location);
      setDetail(nextDetail);
      setError(null);
    } catch (nextError) {
      setError(formatErrorMessage(nextError));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!location) {
        setDetail(null);
        setError(null);
        setLoading(false);
        return;
      }

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
    error,
    refreshDetail
  };
}
