import { useCallback, useEffect, useState } from "react";

import { locationService } from "@/services/location-service";
import type { CreateLocationInput, LocationRecord } from "@/types/location";

interface UseFluxaLocationsResult {
  locations: LocationRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refreshLocations: () => Promise<void>;
  createLocation: (input: CreateLocationInput) => Promise<LocationRecord>;
  deleteLocation: (locationId: string) => Promise<void>;
}

interface UseFluxaLocationsOptions {
  enabled?: boolean;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to reach Fluxa backend.";
}

export function useFluxaLocations({
  enabled = true
}: UseFluxaLocationsOptions = {}): UseFluxaLocationsResult {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLocations = useCallback(async () => {
    if (!enabled) {
      setLocations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const nextLocations = await locationService.listLocations();
      setLocations(nextLocations);
      setError(null);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
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

    void refreshLocations();
  }, [enabled, refreshLocations]);

  const createLocation = useCallback(async (input: CreateLocationInput) => {
    setSaving(true);
    try {
      const created = await locationService.createLocation(input);
      setLocations((prev) => [created, ...prev]);
      setError(null);
      return created;
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteLocation = useCallback(async (locationId: string) => {
    setSaving(true);
    try {
      await locationService.deleteLocation(locationId);
      setLocations((prev) => prev.filter((location) => location.id !== locationId));
      setError(null);
    } catch (err) {
      const message = formatErrorMessage(err);
      setError(message);
      throw new Error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    locations,
    loading,
    saving,
    error,
    refreshLocations,
    createLocation,
    deleteLocation
  };
}
