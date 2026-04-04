import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { filterLocationsBySearch } from "@/lib/location-search";
import { locationService, type LocationCounts } from "@/services/location-service";
import type { BrandRecord } from "@/types/brand";
import type { LocationRecord } from "@/types/location";

interface CurrentPosition {
  lng: number;
  lat: number;
}

interface UseFluxaBrandLocationsOptions {
  brand: BrandRecord | null;
  currentPosition?: CurrentPosition | null;
  enabled?: boolean;
  page: number;
  pageSize: number;
  pagingMode?: "paged" | "scroll";
  searchQuery: string;
  sort: "distance" | "updated" | "name";
  statusFilter: "all" | "active" | "inactive";
}

interface UseFluxaBrandLocationsResult {
  loading: boolean;
  error: string | null;
  locations: LocationRecord[];
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  summaryCountLoading: boolean;
  filteredTotalCount: number;
  pageCount: number;
  refreshLocations: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => void;
}

const BRAND_LOCATION_PREFETCH_DELAY_MS = 320;
const sharedDirectoryCache = new Map<string, LocationRecord[]>();
const sharedDirectoryPromiseCache = new Map<string, Promise<LocationRecord[]>>();
const sharedCountsCache = new Map<string, LocationCounts>();
const sharedCountsPromiseCache = new Map<string, Promise<LocationCounts>>();

function calculateDistanceKm(origin: CurrentPosition, target: Pick<LocationRecord, "lat" | "lng">): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(target.lat - origin.lat);
  const lngDelta = toRadians(target.lng - origin.lng);
  const originLat = toRadians(origin.lat);
  const targetLat = toRadians(target.lat);

  const haversine =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2)
    + Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2) * Math.cos(originLat) * Math.cos(targetLat);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatBrandLocationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load brand locations.";
}

function buildPageSlice<T>(items: T[], pageNumber: number, pageSize: number): T[] {
  const safePageSize = Math.max(1, pageSize);
  const startIndex = Math.max(0, pageNumber - 1) * safePageSize;
  return items.slice(startIndex, startIndex + safePageSize);
}

export function useFluxaBrandLocations({
  brand,
  currentPosition = null,
  enabled = false,
  page,
  pageSize,
  pagingMode = "scroll",
  searchQuery,
  sort,
  statusFilter
}: UseFluxaBrandLocationsOptions): UseFluxaBrandLocationsResult {
  const brandCacheKey = brand?.id || brand?.name || "";
  const [directory, setDirectory] = useState<LocationRecord[]>(() => (brandCacheKey ? sharedDirectoryCache.get(brandCacheKey) || [] : []));
  const [directoryResolved, setDirectoryResolved] = useState(() => (brandCacheKey ? sharedDirectoryCache.has(brandCacheKey) : false));
  const [detailVersion, setDetailVersion] = useState(0);
  const [loading, setLoading] = useState(enabled && brandCacheKey.length > 0 && !sharedDirectoryCache.has(brandCacheKey));
  const [error, setError] = useState<string | null>(null);
  const [summaryCounts, setSummaryCounts] = useState<LocationCounts | null>(() => (brandCacheKey ? sharedCountsCache.get(brandCacheKey) || null : null));
  const [summaryCountLoading, setSummaryCountLoading] = useState(enabled && brandCacheKey.length > 0 && !sharedCountsCache.has(brandCacheKey));
  const [scrollPageCount, setScrollPageCount] = useState(1);
  const cacheRef = useRef<Map<string, LocationRecord>>(new Map());
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);
  const prefetchTimerRef = useRef<number | null>(null);

  const refreshLocations = useCallback(async () => {
    if (!enabled || !brand) {
      setDirectory([]);
      setDirectoryResolved(false);
      setLoading(false);
      setError(null);
      return;
    }

    setDirectoryResolved(false);
    setLoading(true);
    const nextPromise = locationService.listLocationDirectoryByBrand({
      brandId: brand.id,
      brandName: brand.name
    });
    sharedDirectoryPromiseCache.set(brandCacheKey, nextPromise);

    try {
      const nextDirectory = await nextPromise;
      sharedDirectoryCache.set(brandCacheKey, nextDirectory);
      setDirectory(nextDirectory);
      setScrollPageCount(1);
      setError(null);
    } catch (nextError) {
      setError(formatBrandLocationError(nextError));
    } finally {
      setDirectoryResolved(true);
      if (sharedDirectoryPromiseCache.get(brandCacheKey) === nextPromise) {
        sharedDirectoryPromiseCache.delete(brandCacheKey);
      }
      setLoading(false);
    }
  }, [brand, brandCacheKey, enabled]);

  useEffect(() => {
    if (!enabled || !brand || !brandCacheKey) {
      setSummaryCounts(null);
      setSummaryCountLoading(false);
      return;
    }

    const cachedCounts = sharedCountsCache.get(brandCacheKey);
    if (cachedCounts) {
      setSummaryCounts(cachedCounts);
      setSummaryCountLoading(false);
      return;
    }

    const pendingCounts = sharedCountsPromiseCache.get(brandCacheKey);
    if (pendingCounts) {
      setSummaryCountLoading(true);
      void pendingCounts.then((nextCounts) => {
        sharedCountsCache.set(brandCacheKey, nextCounts);
        setSummaryCounts(nextCounts);
        setSummaryCountLoading(false);
      });
      return;
    }

    setSummaryCountLoading(true);
    const nextPromise = locationService.getLocationCountsByBrand({
      brandId: brand.id,
      brandName: brand.name
    });
    sharedCountsPromiseCache.set(brandCacheKey, nextPromise);

    void nextPromise
      .then((nextCounts) => {
        sharedCountsCache.set(brandCacheKey, nextCounts);
        setSummaryCounts(nextCounts);
        setSummaryCountLoading(false);
      })
      .catch((nextError) => {
        setError(formatBrandLocationError(nextError));
      })
      .finally(() => {
        if (sharedCountsPromiseCache.get(brandCacheKey) === nextPromise) {
          sharedCountsPromiseCache.delete(brandCacheKey);
        }
        setSummaryCountLoading(false);
      });
  }, [brand, brandCacheKey, enabled]);

  useEffect(() => {
    if (!enabled || !brand || !brandCacheKey) {
      setDirectory([]);
      setDirectoryResolved(false);
      setLoading(false);
      setError(null);
      return;
    }

    const cachedDirectory = sharedDirectoryCache.get(brandCacheKey);
    if (cachedDirectory) {
      setDirectory(cachedDirectory);
      setDirectoryResolved(true);
      setLoading(false);
      setError(null);
      return;
    }

    const pendingDirectory = sharedDirectoryPromiseCache.get(brandCacheKey);
    if (pendingDirectory) {
      setDirectoryResolved(false);
      setLoading(true);
      void pendingDirectory
        .then((nextDirectory) => {
          sharedDirectoryCache.set(brandCacheKey, nextDirectory);
          setDirectory(nextDirectory);
          setDirectoryResolved(true);
          setError(null);
        })
        .catch((nextError) => {
          setDirectoryResolved(true);
          setError(formatBrandLocationError(nextError));
        })
        .finally(() => {
          if (sharedDirectoryPromiseCache.get(brandCacheKey) === pendingDirectory) {
            sharedDirectoryPromiseCache.delete(brandCacheKey);
          }
          setLoading(false);
        });
      return;
    }

    void refreshLocations();
  }, [brand, brandCacheKey, enabled, refreshLocations]);

  const filteredDirectory = useMemo(() => {
    const baseDirectory = statusFilter === "all" ? directory : directory.filter((location) => location.status === statusFilter);
    const searchFiltered = filterLocationsBySearch(baseDirectory, searchQuery);

    return [...searchFiltered].sort((left, right) => {
      if (sort === "distance") {
        if (!currentPosition) {
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }

        const leftDistance = calculateDistanceKm(currentPosition, left);
        const rightDistance = calculateDistanceKm(currentPosition, right);
        return leftDistance - rightDistance;
      }

      if (sort === "name") {
        return left.name.localeCompare(right.name, "zh-CN");
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [currentPosition, directory, searchQuery, sort, statusFilter]);

  const orderedIds = useMemo(() => filteredDirectory.map((location) => location.id), [filteredDirectory]);
  const filteredDirectoryById = useMemo(
    () => new Map(filteredDirectory.map((location) => [location.id, location])),
    [filteredDirectory]
  );
  const filteredTotalCount = filteredDirectory.length;
  const totalCount = summaryCounts?.total ?? 0;
  const activeCount = summaryCounts?.active ?? 0;
  const inactiveCount = summaryCounts?.inactive ?? 0;
  const pageCount = pagingMode === "paged" ? Math.max(1, Math.ceil(filteredTotalCount / Math.max(1, pageSize))) : 1;
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

  const visibleLocations = useMemo(
    () =>
      visibleIds
        .map((id) => cacheRef.current.get(id) || filteredDirectoryById.get(id))
        .filter((location): location is LocationRecord => Boolean(location)),
    [detailVersion, filteredDirectoryById, visibleIds]
  );

  const loadLocationIds = useCallback(async (ids: string[], background = false): Promise<void> => {
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
      const nextLocations = await locationService.listLocationsByIds(missingIds);
      nextLocations.forEach((location) => {
        cacheRef.current.set(location.id, location);
      });
      setDetailVersion((current) => current + 1);
      if (!background) {
        setError(null);
      }
    } catch (nextError) {
      if (!background) {
        setError(formatBrandLocationError(nextError));
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
  }, [brand?.id, currentPosition, pageSize, pagingMode, searchQuery, sort, statusFilter]);

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
      if (!directoryResolved) {
        return;
      }

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
    void loadLocationIds(priorityIds);

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
        void loadLocationIds(nextIds, true).finally(() => {
          prefetchNextPage(pageIndex + 1);
        });
      }, BRAND_LOCATION_PREFETCH_DELAY_MS);
    };

    prefetchNextPage(0);

    return () => {
      if (prefetchTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(prefetchTimerRef.current);
      }
      prefetchTimerRef.current = null;
    };
  }, [directoryResolved, enabled, loadLocationIds, orderedIds, page, pageSize, pagingMode, scrollPageCount]);

  return {
    loading,
    error,
    locations: visibleLocations,
    totalCount,
    activeCount,
    inactiveCount,
    summaryCountLoading,
    filteredTotalCount,
    pageCount,
    refreshLocations,
    hasMore,
    loadMore
  };
}
