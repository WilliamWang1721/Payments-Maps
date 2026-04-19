import { useCallback, useEffect, useState } from "react";

import { adminService } from "@/services/admin-service";
import type { AdminStatisticsRecord } from "@/types/admin";

interface UseAdminStatisticsOptions {
  accessToken?: string;
  enabled?: boolean;
  topN?: number;
}

interface UseAdminStatisticsResult {
  loading: boolean;
  error: string | null;
  statistics: AdminStatisticsRecord | null;
  refreshStatistics: () => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load admin statistics right now.";
}

export function useAdminStatistics({
  accessToken,
  enabled = false,
  topN = 10
}: UseAdminStatisticsOptions = {}): UseAdminStatisticsResult {
  const [statistics, setStatistics] = useState<AdminStatisticsRecord | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refreshStatistics = useCallback(async () => {
    if (!enabled) {
      setStatistics(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const result = await adminService.getStatistics({
        accessToken,
        topN
      });
      setStatistics(result);
      setError(null);
    } catch (nextError) {
      setError(formatErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, enabled, topN]);

  useEffect(() => {
    void refreshStatistics();
  }, [refreshStatistics]);

  return {
    loading,
    error,
    statistics,
    refreshStatistics
  };
}
