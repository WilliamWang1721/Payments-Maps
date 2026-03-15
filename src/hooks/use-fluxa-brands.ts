import { useCallback, useEffect, useMemo, useState } from "react";

import { brandService } from "@/services/brand-service";
import type { BrandRecord } from "@/types/brand";

interface UseFluxaBrandsResult {
  brands: BrandRecord[];
  brandOptions: string[];
  loading: boolean;
  error: string | null;
  refreshBrands: () => Promise<void>;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to reach Fluxa brand backend.";
}

export function useFluxaBrands(): UseFluxaBrandsResult {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBrands = useCallback(async () => {
    setLoading(true);
    try {
      const nextBrands = await brandService.listBrands();
      setBrands(nextBrands);
      setError(null);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshBrands();
  }, [refreshBrands]);

  const brandOptions = useMemo(
    () =>
      Array.from(new Set(brands.map((brand) => brand.name).filter(Boolean))).sort((left, right) =>
        left.localeCompare(right, "zh-CN")
      ),
    [brands]
  );

  return {
    brands,
    brandOptions,
    loading,
    error,
    refreshBrands
  };
}
