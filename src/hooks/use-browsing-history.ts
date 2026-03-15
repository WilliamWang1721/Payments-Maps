import { useCallback, useEffect, useState } from "react";

import { browsingHistoryService, type BrowsingHistoryRecord } from "@/services/browsing-history-service";

interface UseBrowsingHistoryOptions {
  enabled?: boolean;
}

interface UseBrowsingHistoryResult {
  entries: BrowsingHistoryRecord[];
  loading: boolean;
  clearing: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load browsing history right now.";
}

export function useBrowsingHistory({ enabled = true }: UseBrowsingHistoryOptions = {}): UseBrowsingHistoryResult {
  const [entries, setEntries] = useState<BrowsingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(async () => {
    setLoading(true);

    try {
      const nextEntries = await browsingHistoryService.list();
      setEntries(nextEntries);
      setError(null);
    } catch (nextError) {
      setError(formatErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(async () => {
    setClearing(true);

    try {
      await browsingHistoryService.clear();
      setEntries([]);
      setError(null);
    } catch (nextError) {
      setError(formatErrorMessage(nextError));
      throw nextError;
    } finally {
      setClearing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshHistory();
  }, [enabled, refreshHistory]);

  return {
    entries,
    loading,
    clearing,
    error,
    refreshHistory,
    clearHistory
  };
}
