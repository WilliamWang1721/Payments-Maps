import { useEffect, useState } from "react";

import { viewerAccessService } from "@/services/viewer-access-service";

interface UseViewerAccessOptions {
  enabled?: boolean;
}

interface UseViewerAccessResult {
  isAdmin: boolean;
  viewerId: string | null;
  isTrial: boolean;
  loading: boolean;
}

export function useViewerAccess({
  enabled = true
}: UseViewerAccessOptions = {}): UseViewerAccessResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setIsAdmin(false);
      setViewerId(null);
      setIsTrial(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    void viewerAccessService.getViewerAccess()
      .then((access) => {
        if (!cancelled) {
          setIsAdmin(access.isAdmin);
          setViewerId(access.viewerId);
          setIsTrial(access.isTrial);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
          setViewerId(null);
          setIsTrial(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    isAdmin,
    viewerId,
    isTrial,
    loading
  };
}
