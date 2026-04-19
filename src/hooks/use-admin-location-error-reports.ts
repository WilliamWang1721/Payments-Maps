import { useCallback, useEffect, useState } from "react";

import { reportService } from "@/services/report-service";
import type { LocationErrorReportRecord } from "@/types/location-error-report";

interface UseAdminLocationErrorReportsOptions {
  enabled?: boolean;
}

interface UseAdminLocationErrorReportsResult {
  reports: LocationErrorReportRecord[];
  loading: boolean;
  error: string | null;
  refreshReports: () => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load error reports right now.";
}

export function useAdminLocationErrorReports({
  enabled = false
}: UseAdminLocationErrorReportsOptions = {}): UseAdminLocationErrorReportsResult {
  const [reports, setReports] = useState<LocationErrorReportRecord[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refreshReports = useCallback(async () => {
    if (!enabled) {
      setReports([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const nextReports = await reportService.listAdminLocationErrorReports();
      setReports(nextReports);
      setError(null);
    } catch (nextError) {
      setError(formatErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setReports([]);
      setLoading(false);
      setError(null);
      return;
    }

    void refreshReports();
  }, [enabled, refreshReports]);

  return {
    reports,
    loading,
    error,
    refreshReports
  };
}
