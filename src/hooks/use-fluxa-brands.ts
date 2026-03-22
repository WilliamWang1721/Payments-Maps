import { useCallback, useEffect, useState } from "react";

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

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }

  return "Unable to reach Fluxa brand backend.";
}

export function useFluxaBrands(): UseFluxaBrandsResult {
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBrands = useCallback(async () => {
    setLoading(true);
    try {
      const nextBrandOptions = await brandService.listBrandOptions();
      setBrands([]);
      setBrandOptions(nextBrandOptions);
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
      try {
        const nextBrandOptions = await brandService.listBrandOptions();
        setBrands([]);
        setBrandOptions(nextBrandOptions);
        setError(null);
        return created;
      } catch {
        setBrandOptions((prev) =>
          Array.from(new Set([created.name, ...prev.filter((option) => option !== created.name)])).sort((left, right) =>
            left.localeCompare(right, "zh-CN")
          )
        );
      }

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
