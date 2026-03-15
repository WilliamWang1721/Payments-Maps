import { useCallback, useEffect, useState } from "react";

import { viewerProfileService, type UpdateViewerProfileInput, type ViewerProfileRecord } from "@/services/viewer-profile-service";

interface UseViewerProfileOptions {
  enabled?: boolean;
  viewerEmailFallback?: string;
  viewerNameFallback?: string;
}

interface UseViewerProfileResult {
  profile: ViewerProfileRecord | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  saveProfile: (input: UpdateViewerProfileInput) => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load your profile right now.";
}

export function useViewerProfile({
  enabled = false,
  viewerEmailFallback = "",
  viewerNameFallback = ""
}: UseViewerProfileOptions): UseViewerProfileResult {
  const [profile, setProfile] = useState<ViewerProfileRecord | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    try {
      const nextProfile = await viewerProfileService.getProfile(viewerNameFallback, viewerEmailFallback);
      setProfile(nextProfile);
      setError(null);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, viewerEmailFallback, viewerNameFallback]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void refreshProfile();
  }, [enabled, refreshProfile]);

  const saveProfile = useCallback(
    async (input: UpdateViewerProfileInput) => {
      setSaving(true);
      try {
        const nextProfile = await viewerProfileService.updateProfile(input, viewerNameFallback, viewerEmailFallback);
        setProfile(nextProfile);
        setError(null);
      } catch (err) {
        const message = formatErrorMessage(err);
        setError(message);
        throw new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [viewerEmailFallback, viewerNameFallback]
  );

  return {
    profile,
    loading,
    saving,
    error,
    refreshProfile,
    saveProfile
  };
}
