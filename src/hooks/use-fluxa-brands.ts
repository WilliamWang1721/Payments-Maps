import { useCallback, useEffect, useMemo, useState } from "react";

import { brandService } from "@/services/brand-service";
import type { BrandRecord, CreateBrandInput } from "@/types/brand";

interface UseFluxaBrandsResult {
  brands: BrandRecord[];
  brandOptions: string[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refreshBrands: () => Promise<void>;
  createBrand: (input: CreateBrandInput) => Promise<BrandRecord>;
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
  const [saving, setSaving] = useState(false);
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

  const createBrand = useCallback(async (input: CreateBrandInput) => {
    setSaving(true);
    try {
      const created = await brandService.createBrand(input);
      setBrands((prev) => [created, ...prev.filter((brand) => brand.id !== created.id)]);
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
    saving,
    error,
    refreshBrands,
    createBrand
  };
}
