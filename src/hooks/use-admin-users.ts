import { useCallback, useEffect, useState } from "react";

import { adminService } from "@/services/admin-service";
import type { AdminUserRecord } from "@/types/admin";

interface UseAdminUsersOptions {
  accessToken?: string;
  enabled?: boolean;
  limit?: number;
  query?: string;
}

interface UseAdminUsersResult {
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
  total: number;
  users: AdminUserRecord[];
  refreshUsers: () => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load admin users right now.";
}

export function useAdminUsers({
  accessToken,
  enabled = false,
  limit = 50,
  query = ""
}: UseAdminUsersOptions = {}): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refreshUsers = useCallback(async () => {
    if (!enabled) {
      setUsers([]);
      setTotal(0);
      setGeneratedAt(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const result = await adminService.listUsers({
        accessToken,
        limit,
        query
      });
      setUsers(result.results);
      setTotal(result.total);
      setGeneratedAt(result.generatedAt);
      setError(null);
    } catch (nextError) {
      setError(formatErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [accessToken, enabled, limit, query]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  return {
    generatedAt,
    loading,
    error,
    total,
    users,
    refreshUsers
  };
}
