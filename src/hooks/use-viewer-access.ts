import { useEffect, useState } from "react";

import { viewerAccessService } from "@/services/viewer-access-service";

interface UseViewerAccessOptions {
  enabled?: boolean;
}

interface UseViewerAccessResult {
  isAdmin: boolean;
  loading: boolean;
}

export function useViewerAccess({
  enabled = true
}: UseViewerAccessOptions = {}): UseViewerAccessResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    void viewerAccessService.getViewerAccess()
      .then((access) => {
        if (!cancelled) {
          setIsAdmin(access.isAdmin);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
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
    loading
  };
}
