import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";

import { locationService, type LocationBounds, type LocationCounts, type LocationMapIndexRecord } from "@/services/location-service";
import type { LocationRecord } from "@/types/location";

interface MapViewportBounds extends LocationBounds {
  center?: [number, number];
  zoom: number;
}

interface PartitionDescriptor {
  key: string;
  bounds: LocationBounds;
  distanceKm: number;
}

interface PartitionCacheEntry<T> {
  bounds: LocationBounds;
  items: T[];
  loadedAt: number;
}

export interface MapPartitionSummary {
  visibleLocationCount: number;
  totalLocationCount: number;
  visiblePartitionCount: number;
  totalPartitionCount: number;
  totalCountLoading?: boolean;
}

interface UseFluxaMapPartitionsOptions {
  enabled?: boolean;
}

interface UseFluxaMapPartitionsResult {
  indexPoints: LocationMapIndexRecord[];
  locations: LocationRecord[];
  loading: boolean;
  error: string | null;
  summary: MapPartitionSummary;
  handleViewportChange: (viewport: MapViewportBounds) => void;
  refreshVisiblePartitions: () => Promise<void>;
}

const PARTITION_FETCH_BATCH_SIZE = 6;
const PRELOAD_PADDING_RATIO = 0.35;
const RETAIN_PADDING_RATIO = 1.1;
const VIEWPORT_APPLY_DEBOUNCE_MS = 120;
const MAX_SHARED_PARTITION_CACHE_SIZE = 96;
const FETCH_RADIUS_KM = 100;
export const DETAIL_LOCATION_ZOOM_THRESHOLD = 14;

const EMPTY_SUMMARY: MapPartitionSummary = {
  visibleLocationCount: 0,
  totalLocationCount: 0,
  visiblePartitionCount: 0,
  totalPartitionCount: 0,
  totalCountLoading: false
};

let sharedIndexPartitionCache = new Map<string, PartitionCacheEntry<LocationMapIndexRecord>>();
let sharedDetailPartitionCache = new Map<string, PartitionCacheEntry<LocationRecord>>();
let sharedLocationCountsCache: LocationCounts | null = null;
let sharedLocationCountsPromise: Promise<LocationCounts> | null = null;

export function invalidateFluxaMapPartitionCaches(): void {
  sharedIndexPartitionCache = new Map<string, PartitionCacheEntry<LocationMapIndexRecord>>();
  sharedDetailPartitionCache = new Map<string, PartitionCacheEntry<LocationRecord>>();
  sharedLocationCountsCache = null;
  sharedLocationCountsPromise = null;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: [number, number], to: [number, number]): number {
  const earthRadiusKm = 6371;
  const fromLat = toRadians(from[1]);
  const toLat = toRadians(to[1]);
  const deltaLat = toRadians(to[1] - from[1]);
  const deltaLng = toRadians(to[0] - from[0]);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load map partitions.";
}

function trimPartitionCache<T>(cache: Map<string, PartitionCacheEntry<T>>): void {
  if (cache.size <= MAX_SHARED_PARTITION_CACHE_SIZE) {
    return;
  }

  const removableKeys = Array.from(cache.entries())
    .sort((left, right) => left[1].loadedAt - right[1].loadedAt)
    .slice(0, cache.size - MAX_SHARED_PARTITION_CACHE_SIZE)
    .map(([key]) => key);

  removableKeys.forEach((key) => {
    cache.delete(key);
  });
}

function getPartitionSpan(zoom: number): number {
  if (zoom >= 16) return 0.015;
  if (zoom >= 15) return 0.025;
  if (zoom >= 14) return 0.04;
  if (zoom >= 13) return 0.06;
  if (zoom >= 12) return 0.1;
  if (zoom >= 11) return 0.16;
  return 0.24;
}

function normalizeBounds(bounds: LocationBounds): LocationBounds {
  return {
    south: clampNumber(Math.min(bounds.south, bounds.north), -90, 90),
    west: clampNumber(Math.min(bounds.west, bounds.east), -180, 180),
    north: clampNumber(Math.max(bounds.south, bounds.north), -90, 90),
    east: clampNumber(Math.max(bounds.west, bounds.east), -180, 180)
  };
}

function expandBounds(bounds: LocationBounds, paddingRatio: number, minimumSpan: number): LocationBounds {
  const normalizedBounds = normalizeBounds(bounds);
  const latSpan = Math.max(minimumSpan, normalizedBounds.north - normalizedBounds.south);
  const lngSpan = Math.max(minimumSpan, normalizedBounds.east - normalizedBounds.west);
  const latPadding = latSpan * paddingRatio;
  const lngPadding = lngSpan * paddingRatio;

  return normalizeBounds({
    south: normalizedBounds.south - latPadding,
    west: normalizedBounds.west - lngPadding,
    north: normalizedBounds.north + latPadding,
    east: normalizedBounds.east + lngPadding
  });
}

function resolveViewportCenter(viewport: MapViewportBounds): [number, number] {
  if (viewport.center) {
    return viewport.center;
  }

  return [
    (viewport.west + viewport.east) / 2,
    (viewport.south + viewport.north) / 2
  ];
}

function buildRadiusCapBounds(center: [number, number], radiusKm: number): LocationBounds {
  const [lng, lat] = center;
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / Math.max(111.32 * Math.cos(toRadians(lat)), 0.0001);

  return normalizeBounds({
    south: lat - latDelta,
    west: lng - lngDelta,
    north: lat + latDelta,
    east: lng + lngDelta
  });
}

function intersectBounds(left: LocationBounds, right: LocationBounds): LocationBounds | null {
  const nextBounds = normalizeBounds({
    south: Math.max(left.south, right.south),
    west: Math.max(left.west, right.west),
    north: Math.min(left.north, right.north),
    east: Math.min(left.east, right.east)
  });

  if (nextBounds.south > nextBounds.north || nextBounds.west > nextBounds.east) {
    return null;
  }

  return nextBounds;
}

function buildFetchBounds(viewport: MapViewportBounds, paddingRatio: number, zoom = viewport.zoom): LocationBounds | null {
  const expandedBounds = expandBounds(viewport, paddingRatio, getPartitionSpan(zoom));
  const radiusCapBounds = buildRadiusCapBounds(resolveViewportCenter(viewport), FETCH_RADIUS_KM);
  return intersectBounds(expandedBounds, radiusCapBounds);
}

function buildPartitionDescriptors(bounds: LocationBounds, zoom: number, center: [number, number]): PartitionDescriptor[] {
  const span = getPartitionSpan(zoom);
  const normalizedBounds = normalizeBounds(bounds);
  const latStart = Math.floor(normalizedBounds.south / span);
  const latEnd = Math.floor(normalizedBounds.north / span);
  const lngStart = Math.floor(normalizedBounds.west / span);
  const lngEnd = Math.floor(normalizedBounds.east / span);
  const scaleKey = String(span).replace(".", "_");
  const descriptors: PartitionDescriptor[] = [];

  for (let latIndex = latStart; latIndex <= latEnd; latIndex += 1) {
    for (let lngIndex = lngStart; lngIndex <= lngEnd; lngIndex += 1) {
      const south = clampNumber(latIndex * span, -90, 90);
      const west = clampNumber(lngIndex * span, -180, 180);
      const north = clampNumber((latIndex + 1) * span, -90, 90);
      const east = clampNumber((lngIndex + 1) * span, -180, 180);
      const partitionCenter: [number, number] = [(west + east) / 2, (south + north) / 2];

      descriptors.push({
        key: `${scaleKey}:${latIndex}:${lngIndex}`,
        bounds: { south, west, north, east },
        distanceKm: calculateDistanceKm(center, partitionCenter)
      });
    }
  }

  return descriptors.sort((left, right) => left.distanceKm - right.distanceKm);
}

function buildOverviewDescriptor(bounds: LocationBounds, zoom: number, center: [number, number]): PartitionDescriptor {
  const normalizedBounds = normalizeBounds(bounds);
  const span = getPartitionSpan(zoom);
  const latCells = Math.max(1, Math.round((normalizedBounds.north - normalizedBounds.south) / span));
  const lngCells = Math.max(1, Math.round((normalizedBounds.east - normalizedBounds.west) / span));

  return {
    key: `overview:${String(span).replace(".", "_")}:${Math.round(center[1] / span)}:${Math.round(center[0] / span)}:${latCells}:${lngCells}`,
    bounds: normalizedBounds,
    distanceKm: 0
  };
}

function isPointInsideBounds(point: Pick<LocationMapIndexRecord, "lat" | "lng">, bounds: LocationBounds): boolean {
  return point.lat >= bounds.south && point.lat <= bounds.north && point.lng >= bounds.west && point.lng <= bounds.east;
}

function mergePartitionPayload<T extends { id: string; updatedAt: string }>(
  keys: string[],
  cache: Map<string, PartitionCacheEntry<T>>
): T[] {
  const mergedById = new Map<string, T>();

  keys.forEach((key) => {
    const entry = cache.get(key);
    if (!entry) {
      return;
    }

    entry.items.forEach((item) => {
      const existing = mergedById.get(item.id);
      if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        mergedById.set(item.id, item);
      }
    });
  });

  return Array.from(mergedById.values()).sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });
}

function prunePartitionCache<T>(
  cacheRef: MutableRefObject<Map<string, PartitionCacheEntry<T>>>,
  sharedCache: Map<string, PartitionCacheEntry<T>>,
  retainKeys: Set<string>
): void {
  Array.from(cacheRef.current.keys()).forEach((key) => {
    if (retainKeys.has(key)) {
      return;
    }

    cacheRef.current.delete(key);
    sharedCache.delete(key);
  });
}

function buildSummary(
  viewport: MapViewportBounds | null,
  indexPoints: LocationMapIndexRecord[],
  locations: LocationRecord[],
  activeIndexCount: number,
  activeDetailCount: number,
  totalLocationCount: number,
  totalCountLoading: boolean
): MapPartitionSummary {
  if (!viewport) {
    return {
      ...EMPTY_SUMMARY,
      totalLocationCount,
      totalCountLoading
    };
  }

  const normalizedViewport = normalizeBounds(viewport);
  const visibleIndexCount = indexPoints.filter((point) => isPointInsideBounds(point, normalizedViewport)).length;
  const visibleDetailCount = locations.filter((location) => isPointInsideBounds(location, normalizedViewport)).length;
  const usingDetailLayer = viewport.zoom >= DETAIL_LOCATION_ZOOM_THRESHOLD && locations.length > 0;

  return {
    visibleLocationCount: usingDetailLayer ? visibleDetailCount : visibleIndexCount,
    totalLocationCount,
    visiblePartitionCount: usingDetailLayer ? activeDetailCount : activeIndexCount,
    totalPartitionCount: usingDetailLayer ? activeDetailCount : activeIndexCount,
    totalCountLoading
  };
}

export function useFluxaMapPartitions({
  enabled = false
}: UseFluxaMapPartitionsOptions = {}): UseFluxaMapPartitionsResult {
  const [indexPoints, setIndexPoints] = useState<LocationMapIndexRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MapPartitionSummary>({
    ...EMPTY_SUMMARY,
    totalLocationCount: sharedLocationCountsCache?.total ?? 0,
    totalCountLoading: enabled && !sharedLocationCountsCache
  });

  const indexCacheRef = useRef<Map<string, PartitionCacheEntry<LocationMapIndexRecord>>>(new Map(sharedIndexPartitionCache));
  const detailCacheRef = useRef<Map<string, PartitionCacheEntry<LocationRecord>>>(new Map(sharedDetailPartitionCache));
  const pendingIndexKeysRef = useRef<Set<string>>(new Set());
  const pendingDetailKeysRef = useRef<Set<string>>(new Set());
  const activeIndexDescriptorsRef = useRef<PartitionDescriptor[]>([]);
  const activeDetailDescriptorsRef = useRef<PartitionDescriptor[]>([]);
  const activeIndexKeysRef = useRef<string[]>([]);
  const activeDetailKeysRef = useRef<string[]>([]);
  const lastViewportRef = useRef<MapViewportBounds | null>(null);
  const viewportTimerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const locationCountsRef = useRef<LocationCounts | null>(sharedLocationCountsCache);
  const locationCountsLoadingRef = useRef(enabled && !sharedLocationCountsCache);

  const syncViewState = useCallback((viewport = lastViewportRef.current) => {
    const nextIndexPoints = mergePartitionPayload(activeIndexKeysRef.current, indexCacheRef.current);
    const nextLocations = mergePartitionPayload(activeDetailKeysRef.current, detailCacheRef.current);
    const hasPendingActivePartitions =
      activeIndexKeysRef.current.some((key) => pendingIndexKeysRef.current.has(key))
      || activeDetailKeysRef.current.some((key) => pendingDetailKeysRef.current.has(key));

    setIndexPoints(nextIndexPoints);
    setLocations(nextLocations);
    setLoading(hasPendingActivePartitions);
    setSummary(buildSummary(
      viewport,
      nextIndexPoints,
      nextLocations,
      activeIndexDescriptorsRef.current.length,
      activeDetailDescriptorsRef.current.length,
      locationCountsRef.current?.total ?? 0,
      locationCountsLoadingRef.current
    ));
  }, []);

  const ensureLocationCounts = useCallback(async (): Promise<LocationCounts> => {
    if (locationCountsRef.current) {
      return locationCountsRef.current;
    }

    if (sharedLocationCountsCache) {
      locationCountsRef.current = sharedLocationCountsCache;
      locationCountsLoadingRef.current = false;
      syncViewState();
      return sharedLocationCountsCache;
    }

    if (sharedLocationCountsPromise) {
      return sharedLocationCountsPromise;
    }

    locationCountsLoadingRef.current = true;
    syncViewState();

    const nextPromise = locationService
      .getLocationCounts()
      .then((counts) => {
        sharedLocationCountsCache = counts;
        locationCountsRef.current = counts;
        locationCountsLoadingRef.current = false;
        syncViewState();
        return counts;
      })
      .catch((nextError) => {
        locationCountsLoadingRef.current = false;
        setError(formatErrorMessage(nextError));
        syncViewState();
        throw nextError;
      })
      .finally(() => {
        if (sharedLocationCountsPromise === nextPromise) {
          sharedLocationCountsPromise = null;
        }
      });

    sharedLocationCountsPromise = nextPromise;
    return nextPromise;
  }, [syncViewState]);

  const loadPartitions = useCallback(async <T extends { id: string; updatedAt: string }>(
    descriptors: PartitionDescriptor[],
    options: {
      cacheRef: MutableRefObject<Map<string, PartitionCacheEntry<T>>>;
      sharedCache: Map<string, PartitionCacheEntry<T>>;
      pendingKeysRef: MutableRefObject<Set<string>>;
      fetchPartition: (bounds: LocationBounds) => Promise<T[]>;
      background?: boolean;
    }
  ): Promise<void> => {
    if (!enabled || descriptors.length === 0) {
      syncViewState();
      return;
    }

    const background = options.background ?? false;
    const generation = generationRef.current;
    const queuedDescriptors = descriptors.filter(({ key }) => (
      !options.cacheRef.current.has(key) && !options.pendingKeysRef.current.has(key)
    ));

    if (queuedDescriptors.length === 0) {
      syncViewState();
      return;
    }

    queuedDescriptors.forEach(({ key }) => options.pendingKeysRef.current.add(key));
    syncViewState();

    let nextError: string | null = null;

    try {
      for (let index = 0; index < queuedDescriptors.length; index += PARTITION_FETCH_BATCH_SIZE) {
        const batch = queuedDescriptors.slice(index, index + PARTITION_FETCH_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async ({ key, bounds }) => ({
            key,
            bounds,
            items: await options.fetchPartition(bounds)
          }))
        );

        if (generation !== generationRef.current) {
          return;
        }

        results.forEach((result, batchIndex) => {
          const descriptor = batch[batchIndex];
          options.pendingKeysRef.current.delete(descriptor.key);

          if (result.status === "fulfilled") {
            const nextEntry: PartitionCacheEntry<T> = {
              bounds: descriptor.bounds,
              items: result.value.items,
              loadedAt: Date.now()
            };

            options.cacheRef.current.set(descriptor.key, nextEntry);
            options.sharedCache.set(descriptor.key, nextEntry);
            return;
          }

          nextError = formatErrorMessage(result.reason);
        });

        trimPartitionCache(options.cacheRef.current);
        trimPartitionCache(options.sharedCache);
        syncViewState();
      }
    } finally {
      if (generation !== generationRef.current) {
        return;
      }

      queuedDescriptors.forEach(({ key }) => options.pendingKeysRef.current.delete(key));
      syncViewState();

      if (!background) {
        setError(nextError);
      }
    }
  }, [enabled, syncViewState]);

  const applyViewport = useCallback(async (viewport: MapViewportBounds): Promise<void> => {
    if (!enabled) {
      return;
    }

    lastViewportRef.current = viewport;
    void ensureLocationCounts();

    const center = resolveViewportCenter(viewport);
    const indexZoom = Math.min(Math.max(0, Math.floor(viewport.zoom)), DETAIL_LOCATION_ZOOM_THRESHOLD);
    const usesOverviewIndexLayer = viewport.zoom < DETAIL_LOCATION_ZOOM_THRESHOLD;
    const activeIndexBounds = usesOverviewIndexLayer
      ? normalizeBounds(viewport)
      : buildFetchBounds(viewport, PRELOAD_PADDING_RATIO, indexZoom);
    const retainIndexBounds = usesOverviewIndexLayer
      ? activeIndexBounds
      : buildFetchBounds(viewport, RETAIN_PADDING_RATIO, indexZoom);
    const activeIndexDescriptors = activeIndexBounds
      ? (usesOverviewIndexLayer
          ? [buildOverviewDescriptor(activeIndexBounds, indexZoom, center)]
          : buildPartitionDescriptors(activeIndexBounds, indexZoom, center))
      : [];
    const retainIndexDescriptors = retainIndexBounds
      ? (usesOverviewIndexLayer
          ? [buildOverviewDescriptor(retainIndexBounds, indexZoom, center)]
          : buildPartitionDescriptors(retainIndexBounds, indexZoom, center))
      : [];
    const retainIndexKeys = new Set(retainIndexDescriptors.map(({ key }) => key));

    activeIndexDescriptorsRef.current = activeIndexDescriptors;
    activeIndexKeysRef.current = activeIndexDescriptors.map(({ key }) => key);
    prunePartitionCache(indexCacheRef, sharedIndexPartitionCache, retainIndexKeys);

    let activeDetailDescriptors: PartitionDescriptor[] = [];
    let retainDetailDescriptors: PartitionDescriptor[] = [];

    if (viewport.zoom >= DETAIL_LOCATION_ZOOM_THRESHOLD) {
      const detailZoom = Math.max(DETAIL_LOCATION_ZOOM_THRESHOLD, Math.floor(viewport.zoom));
      const activeDetailBounds = buildFetchBounds(viewport, PRELOAD_PADDING_RATIO, detailZoom);
      const retainDetailBounds = buildFetchBounds(viewport, RETAIN_PADDING_RATIO, detailZoom);
      activeDetailDescriptors = activeDetailBounds ? buildPartitionDescriptors(activeDetailBounds, detailZoom, center) : [];
      retainDetailDescriptors = retainDetailBounds ? buildPartitionDescriptors(retainDetailBounds, detailZoom, center) : [];

      activeDetailDescriptorsRef.current = activeDetailDescriptors;
      activeDetailKeysRef.current = activeDetailDescriptors.map(({ key }) => key);
      prunePartitionCache(
        detailCacheRef,
        sharedDetailPartitionCache,
        new Set(retainDetailDescriptors.map(({ key }) => key))
      );
    } else {
      activeDetailDescriptorsRef.current = [];
      activeDetailKeysRef.current = [];
      prunePartitionCache(detailCacheRef, sharedDetailPartitionCache, new Set());
    }

    setError(null);
    syncViewState(viewport);

    await Promise.all([
      loadPartitions(activeIndexDescriptors, {
        cacheRef: indexCacheRef,
        sharedCache: sharedIndexPartitionCache,
        pendingKeysRef: pendingIndexKeysRef,
        fetchPartition: (bounds) => locationService.listLocationMapIndexInBounds(bounds)
      }),
      loadPartitions(activeDetailDescriptors, {
        cacheRef: detailCacheRef,
        sharedCache: sharedDetailPartitionCache,
        pendingKeysRef: pendingDetailKeysRef,
        fetchPartition: (bounds) => locationService.listLocationsInBounds(bounds)
      })
    ]);

    const activeIndexKeySet = new Set(activeIndexDescriptors.map(({ key }) => key));
    const backgroundIndexDescriptors = retainIndexDescriptors.filter(({ key }) => !activeIndexKeySet.has(key));
    void loadPartitions(backgroundIndexDescriptors, {
      cacheRef: indexCacheRef,
      sharedCache: sharedIndexPartitionCache,
      pendingKeysRef: pendingIndexKeysRef,
      fetchPartition: (bounds) => locationService.listLocationMapIndexInBounds(bounds),
      background: true
    });

    const activeDetailKeySet = new Set(activeDetailDescriptors.map(({ key }) => key));
    const backgroundDetailDescriptors = retainDetailDescriptors.filter(({ key }) => !activeDetailKeySet.has(key));
    void loadPartitions(backgroundDetailDescriptors, {
      cacheRef: detailCacheRef,
      sharedCache: sharedDetailPartitionCache,
      pendingKeysRef: pendingDetailKeysRef,
      fetchPartition: (bounds) => locationService.listLocationsInBounds(bounds),
      background: true
    });
  }, [enabled, ensureLocationCounts, loadPartitions, syncViewState]);

  const handleViewportChange = useCallback((viewport: MapViewportBounds) => {
    if (!enabled) {
      return;
    }

    lastViewportRef.current = viewport;

    if (typeof window === "undefined") {
      void applyViewport(viewport);
      return;
    }

    if (viewportTimerRef.current !== null) {
      window.clearTimeout(viewportTimerRef.current);
    }

    viewportTimerRef.current = window.setTimeout(() => {
      viewportTimerRef.current = null;
      const nextViewport = lastViewportRef.current;
      if (!nextViewport) {
        return;
      }
      void applyViewport(nextViewport);
    }, VIEWPORT_APPLY_DEBOUNCE_MS);
  }, [applyViewport, enabled]);

  const refreshVisiblePartitions = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    activeIndexDescriptorsRef.current.forEach(({ key }) => {
      indexCacheRef.current.delete(key);
      sharedIndexPartitionCache.delete(key);
    });
    activeDetailDescriptorsRef.current.forEach(({ key }) => {
      detailCacheRef.current.delete(key);
      sharedDetailPartitionCache.delete(key);
    });

    setError(null);
    syncViewState();

    await Promise.all([
      loadPartitions(activeIndexDescriptorsRef.current, {
        cacheRef: indexCacheRef,
        sharedCache: sharedIndexPartitionCache,
        pendingKeysRef: pendingIndexKeysRef,
        fetchPartition: (bounds) => locationService.listLocationMapIndexInBounds(bounds)
      }),
      loadPartitions(activeDetailDescriptorsRef.current, {
        cacheRef: detailCacheRef,
        sharedCache: sharedDetailPartitionCache,
        pendingKeysRef: pendingDetailKeysRef,
        fetchPartition: (bounds) => locationService.listLocationsInBounds(bounds)
      })
    ]);
  }, [enabled, loadPartitions, syncViewState]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void ensureLocationCounts();
    syncViewState();
  }, [enabled, ensureLocationCounts, syncViewState]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    if (typeof window !== "undefined" && viewportTimerRef.current !== null) {
      window.clearTimeout(viewportTimerRef.current);
    }

    viewportTimerRef.current = null;
    generationRef.current += 1;
    pendingIndexKeysRef.current.clear();
    pendingDetailKeysRef.current.clear();
    activeIndexDescriptorsRef.current = [];
    activeDetailDescriptorsRef.current = [];
    activeIndexKeysRef.current = [];
    activeDetailKeysRef.current = [];
    lastViewportRef.current = null;
    locationCountsRef.current = sharedLocationCountsCache;
    locationCountsLoadingRef.current = false;
    indexCacheRef.current = new Map(sharedIndexPartitionCache);
    detailCacheRef.current = new Map(sharedDetailPartitionCache);
    setIndexPoints([]);
    setLocations([]);
    setLoading(false);
    setError(null);
    setSummary({
      ...EMPTY_SUMMARY,
      totalLocationCount: sharedLocationCountsCache?.total ?? 0,
      totalCountLoading: false
    });
  }, [enabled]);

  useEffect(() => () => {
    if (typeof window === "undefined" || viewportTimerRef.current === null) {
      return;
    }

    window.clearTimeout(viewportTimerRef.current);
  }, []);

  return {
    indexPoints,
    locations,
    loading,
    error,
    summary,
    handleViewportChange,
    refreshVisiblePartitions
  };
}
