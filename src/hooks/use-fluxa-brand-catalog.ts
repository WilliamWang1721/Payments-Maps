import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { brandService } from "@/services/brand-service";
import type { BrandRecord, BrandSegment } from "@/types/brand";

interface UseFluxaBrandCatalogOptions {
  enabled?: boolean;
  page: number;
  pageSize: number;
  pagingMode?: "paged" | "scroll";
  searchQuery: string;
  segment: BrandSegment;
  sort: "updated" | "name";
}

interface UseFluxaBrandCatalogResult {
  brands: BrandRecord[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  summaryTotalCount: number;
  summaryCountLoading: boolean;
  pageCount: number;
  refreshBrands: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => void;
}

const BRAND_PREFETCH_DELAY_MS = 320;

let sharedBrandDirectoryCache: BrandRecord[] | null = null;
let sharedBrandDirectoryPromise: Promise<BrandRecord[]> | null = null;
let sharedBrandCountCache: number | null = null;
let sharedBrandCountPromise: Promise<number> | null = null;

function formatBrandCatalogError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load brand catalog.";
}

function buildPageSlice<T>(items: T[], pageNumber: number, pageSize: number): T[] {
  const safePageSize = Math.max(1, pageSize);
  const startIndex = Math.max(0, pageNumber - 1) * safePageSize;
  return items.slice(startIndex, startIndex + safePageSize);
}

export function invalidateFluxaBrandDirectoryCache(): void {
  sharedBrandDirectoryCache = null;
  sharedBrandDirectoryPromise = null;
  sharedBrandCountCache = null;
  sharedBrandCountPromise = null;
}

export function useFluxaBrandCatalog({
  enabled = false,
  page,
  pageSize,
  pagingMode = "scroll",
  searchQuery,
  segment,
  sort
}: UseFluxaBrandCatalogOptions): UseFluxaBrandCatalogResult {
  const [directory, setDirectory] = useState<BrandRecord[]>(sharedBrandDirectoryCache || []);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [detailVersion, setDetailVersion] = useState(0);
  const [loading, setLoading] = useState(enabled && !sharedBrandDirectoryCache);
  const [error, setError] = useState<string | null>(null);
  const [summaryTotalCount, setSummaryTotalCount] = useState(sharedBrandCountCache || 0);
  const [summaryCountLoading, setSummaryCountLoading] = useState(enabled && sharedBrandCountCache === null);
  const [scrollPageCount, setScrollPageCount] = useState(1);
  const cacheRef = useRef<Map<string, BrandRecord>>(new Map());
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);
  const prefetchTimerRef = useRef<number | null>(null);

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase("en-US");

  const refreshBrands = useCallback(async () => {
    if (!enabled) {
      setDirectory([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    const nextPromise = brandService.listBrandDirectory();
    sharedBrandDirectoryPromise = nextPromise;

    try {
      const nextDirectory = await nextPromise;
      sharedBrandDirectoryCache = nextDirectory;
      setDirectory(nextDirectory);
      setDirectoryVersion((current) => current + 1);
      setScrollPageCount(1);
      setError(null);
    } catch (nextError) {
      setError(formatBrandCatalogError(nextError));
    } finally {
      if (sharedBrandDirectoryPromise === nextPromise) {
        sharedBrandDirectoryPromise = null;
      }
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setDirectory([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedBrandDirectoryCache) {
      setDirectory(sharedBrandDirectoryCache);
      setLoading(false);
      setError(null);
      return;
    }

    if (sharedBrandDirectoryPromise) {
      setLoading(true);
      void sharedBrandDirectoryPromise
        .then((nextDirectory) => {
          sharedBrandDirectoryCache = nextDirectory;
          setDirectory(nextDirectory);
          setDirectoryVersion((current) => current + 1);
          setError(null);
        })
        .catch((nextError) => {
          setError(formatBrandCatalogError(nextError));
        })
        .finally(() => {
          if (sharedBrandDirectoryPromise) {
            sharedBrandDirectoryPromise = null;
          }
          setLoading(false);
        });
      return;
    }

    void refreshBrands();
  }, [enabled, refreshBrands]);

  useEffect(() => {
    if (!enabled) {
      setSummaryTotalCount(sharedBrandCountCache || 0);
      setSummaryCountLoading(false);
      return;
    }

    if (sharedBrandCountCache !== null) {
      setSummaryTotalCount(sharedBrandCountCache);
      setSummaryCountLoading(false);
      return;
    }

    if (sharedBrandCountPromise) {
      setSummaryCountLoading(true);
      void sharedBrandCountPromise.then((count) => {
        sharedBrandCountCache = count;
        setSummaryTotalCount(count);
        setSummaryCountLoading(false);
      });
      return;
    }

    setSummaryCountLoading(true);
    const nextPromise = brandService.getBrandCount();
    sharedBrandCountPromise = nextPromise;

    void nextPromise
      .then((count) => {
        sharedBrandCountCache = count;
        setSummaryTotalCount(count);
        setSummaryCountLoading(false);
      })
      .catch((nextError) => {
        setError(formatBrandCatalogError(nextError));
      })
      .finally(() => {
        if (sharedBrandCountPromise === nextPromise) {
          sharedBrandCountPromise = null;
        }
        setSummaryCountLoading(false);
      });
  }, [enabled]);

  const orderedDirectory = useMemo(() => {
    const segmentFiltered = directory.filter((brand) => brand.uiSegment === segment);
    const searchFiltered = normalizedSearchQuery
      ? segmentFiltered.filter((brand) =>
          [
            brand.name,
            brand.uiCategoryLabel,
            brand.primaryCity,
            brand.website || "",
            brand.description || "",
            brand.notes || ""
          ]
            .join(" ")
            .toLocaleLowerCase("en-US")
            .includes(normalizedSearchQuery)
        )
      : segmentFiltered;

    return [...searchFiltered].sort((left, right) => {
      if (sort === "name") {
        return left.name.localeCompare(right.name, "zh-CN");
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [directory, normalizedSearchQuery, segment, sort]);

  const orderedIds = useMemo(() => orderedDirectory.map((brand) => brand.id), [orderedDirectory]);
  const orderedDirectoryById = useMemo(
    () => new Map(orderedDirectory.map((brand) => [brand.id, brand])),
    [orderedDirectory]
  );
  const totalCount = orderedDirectory.length;
  const pageCount = pagingMode === "paged" ? Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))) : 1;
  const totalScrollPages = Math.max(1, Math.ceil(orderedIds.length / Math.max(1, pageSize)));
  const hasMore = pagingMode === "scroll" && scrollPageCount < totalScrollPages;

  const visibleIds = useMemo(() => {
    if (!enabled) {
      return [];
    }

    if (pagingMode === "scroll") {
      return buildPageSlice(orderedIds, 1, scrollPageCount * pageSize);
    }

    return buildPageSlice(orderedIds, page, pageSize);
  }, [enabled, orderedIds, page, pageSize, pagingMode, scrollPageCount]);

  const visibleBrands = useMemo(
    () =>
      visibleIds
        .map((id) => cacheRef.current.get(id) || orderedDirectoryById.get(id))
        .filter((brand): brand is BrandRecord => Boolean(brand)),
    [detailVersion, orderedDirectoryById, visibleIds]
  );

  const loadBrandIds = useCallback(async (ids: string[], background = false): Promise<void> => {
    if (!enabled || ids.length === 0) {
      return;
    }

    const missingIds = Array.from(
      new Set(ids.filter((id) => id && !cacheRef.current.has(id) && !pendingIdsRef.current.has(id)))
    );

    if (missingIds.length === 0) {
      return;
    }

    missingIds.forEach((id) => pendingIdsRef.current.add(id));

    if (!background) {
      setLoading(true);
    }

    try {
      const nextBrands = await brandService.listBrandsByIds(missingIds);
      nextBrands.forEach((brand) => {
        cacheRef.current.set(brand.id, brand);
      });
      setDetailVersion((current) => current + 1);
      if (!background) {
        setError(null);
      }
    } catch (nextError) {
      if (!background) {
        setError(formatBrandCatalogError(nextError));
      }
    } finally {
      missingIds.forEach((id) => pendingIdsRef.current.delete(id));
      if (!background) {
        setLoading(false);
      }
    }
  }, [enabled]);

  const loadMore = useCallback(() => {
    if (pagingMode !== "scroll") {
      return;
    }

    setScrollPageCount((current) => (current < totalScrollPages ? current + 1 : current));
  }, [pagingMode, totalScrollPages]);

  useEffect(() => {
    setScrollPageCount(1);
  }, [pageSize, pagingMode, searchQuery, segment, sort]);

  useEffect(() => {
    if (!enabled) {
      if (prefetchTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(prefetchTimerRef.current);
      }
      prefetchTimerRef.current = null;
      return;
    }

    if (prefetchTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }

    if (orderedIds.length === 0) {
      setLoading(false);
      setError(null);
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const totalPages = Math.max(1, Math.ceil(orderedIds.length / Math.max(1, pageSize)));
    const priorityPages =
      pagingMode === "scroll"
        ? Array.from({ length: Math.min(scrollPageCount, totalPages) }, (_, index) => index + 1)
        : Array.from(new Set([page, page + 1, page - 1].filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)));

    const priorityIds = priorityPages.flatMap((pageNumber) => buildPageSlice(orderedIds, pageNumber, pageSize));
    void loadBrandIds(priorityIds);

    const deferredPageNumbers =
      pagingMode === "scroll"
        ? []
        : [
            ...Array.from({ length: Math.max(0, totalPages - (page + 1)) }, (_, index) => page + index + 2),
            ...Array.from({ length: Math.max(0, page - 2) }, (_, index) => page - index - 2)
          ].filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages);

    const prefetchNextPage = (pageIndex: number) => {
      if (typeof window === "undefined" || pageIndex >= deferredPageNumbers.length) {
        return;
      }

      prefetchTimerRef.current = window.setTimeout(() => {
        if (generationRef.current !== generation) {
          return;
        }

        const nextPageNumber = deferredPageNumbers[pageIndex];
        const nextIds = buildPageSlice(orderedIds, nextPageNumber, pageSize);
        void loadBrandIds(nextIds, true).finally(() => {
          prefetchNextPage(pageIndex + 1);
        });
      }, BRAND_PREFETCH_DELAY_MS);
    };

    prefetchNextPage(0);

    return () => {
      if (prefetchTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(prefetchTimerRef.current);
      }
      prefetchTimerRef.current = null;
    };
  }, [directoryVersion, enabled, loadBrandIds, orderedIds, page, pageSize, pagingMode, scrollPageCount]);

  return {
    brands: visibleBrands,
    loading,
    error,
    totalCount,
    summaryTotalCount,
    summaryCountLoading,
    pageCount,
    refreshBrands,
    hasMore,
    loadMore
  };
}
