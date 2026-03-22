import { useEffect, useState } from "react";

import { brandService } from "@/services/brand-service";
import type { BrandRecord } from "@/types/brand";

interface UseFluxaBrandRecordOptions {
  brandId?: string | null;
  enabled?: boolean;
  initialBrand?: BrandRecord | null;
}

interface UseFluxaBrandRecordResult {
  brand: BrandRecord | null;
  loading: boolean;
  error: string | null;
}

const sharedBrandRecordCache = new Map<string, BrandRecord>();
const sharedBrandRecordPromiseCache = new Map<string, Promise<BrandRecord | null>>();

function formatBrandRecordError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load brand detail.";
}

export function useFluxaBrandRecord({
  brandId = null,
  enabled = false,
  initialBrand = null
}: UseFluxaBrandRecordOptions): UseFluxaBrandRecordResult {
  const normalizedBrandId = brandId?.trim() || initialBrand?.id || "";
  const [brand, setBrand] = useState<BrandRecord | null>(() => {
    if (initialBrand) {
      sharedBrandRecordCache.set(initialBrand.id, initialBrand);
      return initialBrand;
    }

    return normalizedBrandId ? sharedBrandRecordCache.get(normalizedBrandId) || null : null;
  });
  const [loading, setLoading] = useState(enabled && Boolean(normalizedBrandId) && !brand);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialBrand) {
      sharedBrandRecordCache.set(initialBrand.id, initialBrand);
      setBrand(initialBrand);
      setLoading(false);
      setError(null);
      return;
    }

    if (!enabled || !normalizedBrandId) {
      setBrand(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cachedBrand = sharedBrandRecordCache.get(normalizedBrandId);
    if (cachedBrand) {
      setBrand(cachedBrand);
      setLoading(false);
      setError(null);
      return;
    }

    const pendingBrand = sharedBrandRecordPromiseCache.get(normalizedBrandId);
    if (pendingBrand) {
      setLoading(true);
      void pendingBrand
        .then((nextBrand) => {
          if (nextBrand) {
            sharedBrandRecordCache.set(normalizedBrandId, nextBrand);
          }
          setBrand(nextBrand);
          setError(null);
        })
        .catch((nextError) => {
          setError(formatBrandRecordError(nextError));
        })
        .finally(() => {
          if (sharedBrandRecordPromiseCache.get(normalizedBrandId) === pendingBrand) {
            sharedBrandRecordPromiseCache.delete(normalizedBrandId);
          }
          setLoading(false);
        });
      return;
    }

    setLoading(true);
    const nextPromise = brandService.getBrandById(normalizedBrandId);
    sharedBrandRecordPromiseCache.set(normalizedBrandId, nextPromise);

    void nextPromise
      .then((nextBrand) => {
        if (nextBrand) {
          sharedBrandRecordCache.set(normalizedBrandId, nextBrand);
        }
        setBrand(nextBrand);
        setError(null);
      })
      .catch((nextError) => {
        setError(formatBrandRecordError(nextError));
      })
      .finally(() => {
        if (sharedBrandRecordPromiseCache.get(normalizedBrandId) === nextPromise) {
          sharedBrandRecordPromiseCache.delete(normalizedBrandId);
        }
        setLoading(false);
      });
  }, [enabled, initialBrand, normalizedBrandId]);

  return {
    brand,
    loading,
    error
  };
}
