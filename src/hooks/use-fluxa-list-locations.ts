import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { filterLocationsBySearch } from "@/lib/location-search";
import { locationService, type LocationCounts, type LocationMapIndexRecord } from "@/services/location-service";
import type { LocationRecord } from "@/types/location";

interface CurrentPosition {
  lng: number;
  lat: number;
}

interface UseFluxaListLocationsOptions {
  counts?: LocationCounts | null;
  currentPosition?: CurrentPosition | null;
  directoryLocations?: LocationRecord[];
  enabled?: boolean;
  indexPoints?: LocationMapIndexRecord[];
  listPagingMode?: "paged" | "scroll";
  page: number;
  pageSize: number;
  searchMatchedIds?: string[];
  searchQuery: string;
  sort: "distance" | "updated";
}

interface UseFluxaListLocationsResult {
  loading: boolean;
  locations: LocationRecord[];
  refreshLocations: () => Promise<void>;
  error: string | null;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  pageCount: number;
  hasMore: boolean;
  loadMore: () => void;
}

interface SortableLocationLike {
  id: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

const EMPTY_COUNTS: LocationCounts = {
  total: 0,
  active: 0,
  inactive: 0
};
const PAGE_PREFETCH_DELAY_MS = 320;

function calculateDistanceKm(origin: CurrentPosition, target: Pick<SortableLocationLike, "lat" | "lng">): number {
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

function compareLocationOrder(
  left: SortableLocationLike,
  right: SortableLocationLike,
  sort: "distance" | "updated",
  currentPosition: CurrentPosition | null
): number {
  if (sort === "distance") {
    if (!currentPosition) {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    const leftDistance = calculateDistanceKm(currentPosition, left);
    const rightDistance = calculateDistanceKm(currentPosition, right);
    return leftDistance - rightDistance;
  }

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

function formatListError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load paged locations.";
}

function buildPageSlice<T>(items: T[], pageNumber: number, pageSize: number): T[] {
  const safePageSize = Math.max(1, pageSize);
  const startIndex = Math.max(0, pageNumber - 1) * safePageSize;
  return items.slice(startIndex, startIndex + safePageSize);
}

function buildLightweightListLocation(point: LocationMapIndexRecord): LocationRecord {
  return {
    id: point.id,
    name: point.name,
    address: point.address,
    brand: point.brand,
    city: point.city,
    status: point.status,
    lat: point.lat,
    lng: point.lng,
    createdAt: point.updatedAt,
    updatedAt: point.updatedAt
  };
}

export function useFluxaListLocations({
  counts = null,
  currentPosition = null,
  directoryLocations = [],
  enabled = false,
  indexPoints = [],
  listPagingMode = "paged",
  page,
  pageSize,
  searchMatchedIds = [],
  searchQuery,
  sort
}: UseFluxaListLocationsOptions): UseFluxaListLocationsResult {
  const [cacheVersion, setCacheVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrollPageCount, setScrollPageCount] = useState(1);
  const cacheRef = useRef<Map<string, LocationRecord>>(new Map());
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const generationRef = useRef(0);
  const prefetchTimerRef = useRef<number | null>(null);

  const normalizedSearchQuery = searchQuery.trim();
  const usesLightIndexMode = enabled && listPagingMode === "paged" && directoryLocations.length === 0;
  const resolvedCounts = counts || EMPTY_COUNTS;
  const searchMatchedIdSet = useMemo(() => new Set(searchMatchedIds), [searchMatchedIds]);

  const orderedDirectoryLocations = useMemo(() => {
    const filteredLocations = filterLocationsBySearch(directoryLocations, searchQuery);

    return [...filteredLocations].sort((left, right) => compareLocationOrder(left, right, sort, currentPosition));
  }, [currentPosition, directoryLocations, searchQuery, sort]);

  const orderedIndexPoints = useMemo(() => {
    if (!usesLightIndexMode) {
      return [];
    }

    const filteredPoints = normalizedSearchQuery
      ? indexPoints.filter((point) => searchMatchedIdSet.has(point.id))
      : indexPoints;

    return [...filteredPoints].sort((left, right) => compareLocationOrder(left, right, sort, currentPosition));
  }, [currentPosition, indexPoints, normalizedSearchQuery, searchMatchedIdSet, sort, usesLightIndexMode]);

  const orderedIds = useMemo(
    () => (usesLightIndexMode ? orderedIndexPoints.map((point) => point.id) : orderedDirectoryLocations.map((location) => location.id)),
    [orderedDirectoryLocations, orderedIndexPoints, usesLightIndexMode]
  );

  const totalCount = usesLightIndexMode ? orderedIds.length : orderedDirectoryLocations.length;
  const activeCount = usesLightIndexMode ? resolvedCounts.active : orderedDirectoryLocations.filter((location) => location.status === "active").length;
  const inactiveCount = usesLightIndexMode ? resolvedCounts.inactive : orderedDirectoryLocations.length - activeCount;
  const pageCount = listPagingMode === "paged" ? Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize))) : 1;
  const totalScrollPages = Math.max(1, Math.ceil(orderedIds.length / Math.max(1, pageSize)));
  const hasMore = listPagingMode === "scroll" && scrollPageCount < totalScrollPages;

  const visibleIds = useMemo(() => {
    if (!enabled) {
      return [];
    }

    if (listPagingMode === "scroll") {
      return buildPageSlice(orderedIds, 1, scrollPageCount * pageSize);
    }

    return buildPageSlice(orderedIds, page, pageSize);
  }, [enabled, listPagingMode, orderedIds, page, pageSize, scrollPageCount]);

  const visibleLocations = useMemo(() => {
    if (!enabled) {
      return [];
    }

    if (usesLightIndexMode) {
      const pointsById = new Map(orderedIndexPoints.map((point) => [point.id, point]));

      return visibleIds
        .map((id) => {
          const cachedLocation = cacheRef.current.get(id);
          if (cachedLocation) {
            return cachedLocation;
          }

          const point = pointsById.get(id);
          return point ? buildLightweightListLocation(point) : null;
        })
        .filter((location): location is LocationRecord => Boolean(location));
    }

    const baseLocations =
      listPagingMode === "scroll"
        ? buildPageSlice(orderedDirectoryLocations, 1, scrollPageCount * pageSize)
        : buildPageSlice(orderedDirectoryLocations, page, pageSize);

    return baseLocations.map((location) => cacheRef.current.get(location.id) || location);
  }, [cacheVersion, enabled, listPagingMode, orderedDirectoryLocations, orderedIndexPoints, page, pageSize, scrollPageCount, usesLightIndexMode, visibleIds]);

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
      setCacheVersion((current) => current + 1);
      if (!background) {
        setError(null);
      }
    } catch (nextError) {
      if (!background) {
        setError(formatListError(nextError));
      }
    } finally {
      missingIds.forEach((id) => pendingIdsRef.current.delete(id));
      if (!background) {
        setLoading(false);
      }
    }
  }, [enabled]);

  const refreshLocations = useCallback(async () => {
    cacheRef.current.clear();
    pendingIdsRef.current.clear();
    generationRef.current += 1;
    setCacheVersion((current) => current + 1);
    setScrollPageCount(1);
    setError(null);

    if (!enabled) {
      setLoading(false);
      return;
    }

    const initialPages =
      listPagingMode === "scroll"
        ? [1]
        : [page, page + 1].filter((pageNumber) => pageNumber > 0);
    const initialIds = initialPages.flatMap((pageNumber) => buildPageSlice(orderedIds, pageNumber, pageSize));

    await loadLocationIds(initialIds);
  }, [enabled, listPagingMode, loadLocationIds, orderedIds, page, pageSize]);

  const loadMore = useCallback(() => {
    if (listPagingMode !== "scroll") {
      return;
    }

    setScrollPageCount((current) => (current < totalScrollPages ? current + 1 : current));
  }, [listPagingMode, totalScrollPages]);

  useEffect(() => {
    setScrollPageCount(1);
  }, [currentPosition, listPagingMode, pageSize, searchQuery, sort]);

  useEffect(() => {
    if (!enabled) {
      if (prefetchTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(prefetchTimerRef.current);
      }
      prefetchTimerRef.current = null;
      setLoading(false);
      setError(null);
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
      listPagingMode === "scroll"
        ? Array.from({ length: Math.min(scrollPageCount, totalPages) }, (_, index) => index + 1)
        : Array.from(new Set([page, page + 1, page - 1].filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)));

    const priorityIds = priorityPages.flatMap((pageNumber) => buildPageSlice(orderedIds, pageNumber, pageSize));
    void loadLocationIds(priorityIds);

    const deferredPageNumbers =
      listPagingMode === "scroll"
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
      }, PAGE_PREFETCH_DELAY_MS);
    };

    prefetchNextPage(0);

    return () => {
      if (prefetchTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(prefetchTimerRef.current);
      }
      prefetchTimerRef.current = null;
    };
  }, [enabled, listPagingMode, loadLocationIds, orderedIds, page, pageSize, scrollPageCount]);

  return {
    loading,
    locations: visibleLocations,
    refreshLocations,
    error,
    totalCount,
    activeCount,
    inactiveCount,
    pageCount,
    hasMore,
    loadMore
  };
}
