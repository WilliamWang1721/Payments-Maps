import { useCallback, useEffect, useRef, useState } from "react";

import { locationService, type LocationBounds, type LocationCounts, type LocationMapIndexRecord } from "@/services/location-service";
import type { LocationRecord } from "@/types/location";

interface MapViewportBounds extends LocationBounds {
  center?: [number, number];
  zoom: number;
}

interface PartitionDescriptor {
  key: string;
  bounds: LocationBounds;
}

interface PartitionCacheEntry {
  bounds: LocationBounds;
  locations: LocationRecord[];
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
const BACKGROUND_PREFETCH_LIMIT = 12;
const MAX_SHARED_PARTITION_CACHE_SIZE = 72;
const MAP_INDEX_SESSION_STORAGE_KEY = "fluxa_map_index_cache_v3";
const MAP_INDEX_SESSION_TTL_MS = 15 * 60 * 1000;
export const DETAIL_LOCATION_ZOOM_THRESHOLD = 14;
const EMPTY_SUMMARY: MapPartitionSummary = {
  visibleLocationCount: 0,
  totalLocationCount: 0,
  visiblePartitionCount: 0,
  totalPartitionCount: 0,
  totalCountLoading: false
};

interface StoredMapIndexCachePayload {
  cachedAt: number;
  points: LocationMapIndexRecord[];
}

let sharedMapIndexCache: LocationMapIndexRecord[] | null = null;
let sharedMapIndexPromise: Promise<LocationMapIndexRecord[]> | null = null;
let sharedPartitionCache = new Map<string, PartitionCacheEntry>();
let didHydrateMapIndexSessionCache = false;
let sharedMapIndexCountValidationPromise: Promise<boolean> | null = null;
let sharedLocationCountsCache: LocationCounts | null = null;
let sharedLocationCountsPromise: Promise<LocationCounts> | null = null;

export function invalidateFluxaMapPartitionCaches(): void {
  sharedMapIndexCache = null;
  sharedMapIndexPromise = null;
  sharedPartitionCache = new Map<string, PartitionCacheEntry>();
  didHydrateMapIndexSessionCache = false;
  sharedMapIndexCountValidationPromise = null;
  sharedLocationCountsCache = null;
  sharedLocationCountsPromise = null;
  clearMapIndexSessionCache();
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load map partitions.";
}

function trimPartitionCache(cache: Map<string, PartitionCacheEntry>): void {
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

function readMapIndexSessionCache(): LocationMapIndexRecord[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(MAP_INDEX_SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as StoredMapIndexCachePayload;
    if (!parsed || !Array.isArray(parsed.points) || typeof parsed.cachedAt !== "number") {
      window.sessionStorage.removeItem(MAP_INDEX_SESSION_STORAGE_KEY);
      return null;
    }

    if (Date.now() - parsed.cachedAt > MAP_INDEX_SESSION_TTL_MS) {
      window.sessionStorage.removeItem(MAP_INDEX_SESSION_STORAGE_KEY);
      return null;
    }

    return parsed.points.filter((point): point is LocationMapIndexRecord => (
      typeof point?.id === "string"
      && typeof point?.lat === "number"
      && typeof point?.lng === "number"
      && typeof point?.updatedAt === "string"
    ));
  } catch {
    try {
      window.sessionStorage.removeItem(MAP_INDEX_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
    return null;
  }
}

function clearMapIndexSessionCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(MAP_INDEX_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

function persistMapIndexSessionCache(points: LocationMapIndexRecord[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: StoredMapIndexCachePayload = {
      cachedAt: Date.now(),
      points
    };
    window.sessionStorage.setItem(MAP_INDEX_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors.
  }
}

function buildDetailLayerKey(zoom: number): string {
  return `detail:${String(getPartitionSpan(zoom)).replace(".", "_")}`;
}

function buildBootstrapLayerKey(viewport: MapViewportBounds): string {
  const span = getPartitionSpan(viewport.zoom);
  const [centerLng, centerLat] = resolveViewportCenter(viewport);
  return `bootstrap:${String(span).replace(".", "_")}:${Math.round(centerLat / span)}:${Math.round(centerLng / span)}`;
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

function buildCenteredBounds(viewport: MapViewportBounds, zoom: number, radiusMultiplier = 2): LocationBounds {
  const [centerLng, centerLat] = resolveViewportCenter(viewport);
  const span = getPartitionSpan(zoom) * radiusMultiplier;

  return normalizeBounds({
    south: centerLat - span,
    west: centerLng - span,
    north: centerLat + span,
    east: centerLng + span
  });
}

function buildPartitionKey(lat: number, lng: number, zoom: number): string {
  const span = getPartitionSpan(zoom);
  const latIndex = Math.floor(clampNumber(lat, -90, 90) / span);
  const lngIndex = Math.floor(clampNumber(lng, -180, 180) / span);
  return `${String(span).replace(".", "_")}:${latIndex}:${lngIndex}`;
}

function buildPartitionDescriptors(bounds: LocationBounds, zoom: number): PartitionDescriptor[] {
  const span = getPartitionSpan(zoom);
  const normalizedBounds = normalizeBounds(bounds);
  const latStart = Math.floor(normalizedBounds.south / span);
  const latEnd = Math.floor(normalizedBounds.north / span);
  const lngStart = Math.floor(normalizedBounds.west / span);
  const lngEnd = Math.floor(normalizedBounds.east / span);
  const scaleKey = String(span).replace(".", "_");
  const partitions: PartitionDescriptor[] = [];

  for (let latIndex = latStart; latIndex <= latEnd; latIndex += 1) {
    for (let lngIndex = lngStart; lngIndex <= lngEnd; lngIndex += 1) {
      const south = clampNumber(latIndex * span, -90, 90);
      const west = clampNumber(lngIndex * span, -180, 180);
      const north = clampNumber((latIndex + 1) * span, -90, 90);
      const east = clampNumber((lngIndex + 1) * span, -180, 180);

      partitions.push({
        key: `${scaleKey}:${latIndex}:${lngIndex}`,
        bounds: { south, west, north, east }
      });
    }
  }

  return partitions;
}

function isPointInsideBounds(point: Pick<LocationMapIndexRecord, "lat" | "lng">, bounds: LocationBounds): boolean {
  return point.lat >= bounds.south && point.lat <= bounds.north && point.lng >= bounds.west && point.lng <= bounds.east;
}

function collectPartitionKeys(points: LocationMapIndexRecord[], zoom: number): Set<string> {
  return new Set(points.map((point) => buildPartitionKey(point.lat, point.lng, zoom)));
}

function buildSummary(points: LocationMapIndexRecord[], viewport: MapViewportBounds): MapPartitionSummary {
  const normalizedViewport = normalizeBounds(viewport);
  const visiblePoints = points.filter((point) => isPointInsideBounds(point, normalizedViewport));

  return {
    visibleLocationCount: visiblePoints.length,
    totalLocationCount: points.length,
    visiblePartitionCount: collectPartitionKeys(visiblePoints, viewport.zoom).size,
    totalPartitionCount: collectPartitionKeys(points, viewport.zoom).size
  };
}

function filterDescriptorsWithPoints(
  descriptors: PartitionDescriptor[],
  points: LocationMapIndexRecord[],
  zoom: number
): PartitionDescriptor[] {
  const populatedKeys = collectPartitionKeys(points, zoom);
  return descriptors.filter(({ key }) => populatedKeys.has(key));
}

function mergePartitionLocations(keys: string[], cache: Map<string, PartitionCacheEntry>): LocationRecord[] {
  const mergedById = new Map<string, LocationRecord>();

  keys.forEach((key) => {
    const entry = cache.get(key);
    if (!entry) {
      return;
    }

    entry.locations.forEach((location) => {
      const existing = mergedById.get(location.id);
      if (!existing || new Date(location.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        mergedById.set(location.id, location);
      }
    });
  });

  return Array.from(mergedById.values()).sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });
}

export function useFluxaMapPartitions({
  enabled = false
}: UseFluxaMapPartitionsOptions = {}): UseFluxaMapPartitionsResult {
  const [indexPoints, setIndexPoints] = useState<LocationMapIndexRecord[]>(sharedMapIndexCache || []);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<MapPartitionSummary>(EMPTY_SUMMARY);
  const cacheRef = useRef<Map<string, PartitionCacheEntry>>(new Map(sharedPartitionCache));
  const pendingKeysRef = useRef<Set<string>>(new Set());
  const activeKeysRef = useRef<string[]>([]);
  const activeDescriptorsRef = useRef<PartitionDescriptor[]>([]);
  const lastSignatureRef = useRef("");
  const generationRef = useRef(0);
  const mapIndexRef = useRef<LocationMapIndexRecord[] | null>(sharedMapIndexCache);
  const mapIndexPromiseRef = useRef<Promise<LocationMapIndexRecord[]> | null>(sharedMapIndexPromise);
  const lastViewportRef = useRef<MapViewportBounds | null>(null);
  const viewportTimerRef = useRef<number | null>(null);
  const prefetchTimerRef = useRef<number | null>(null);
  const detailLayerKeyRef = useRef<string | null>(null);
  const bootstrapLayerKeyRef = useRef<string | null>(null);
  const bootstrapInFlightKeyRef = useRef<string | null>(null);
  const bootstrapPendingRef = useRef(false);
  const locationCountsRef = useRef<LocationCounts | null>(sharedLocationCountsCache);

  const syncVisibleLocations = useCallback(() => {
    const nextLocations = mergePartitionLocations(activeKeysRef.current, cacheRef.current);
    const hasPendingActivePartitions = activeKeysRef.current.some((key) => pendingKeysRef.current.has(key));

    setLocations(nextLocations);
    setLoading((hasPendingActivePartitions || bootstrapPendingRef.current) && nextLocations.length === 0);
  }, []);

  const ensureLocationCounts = useCallback(async (): Promise<LocationCounts> => {
    if (locationCountsRef.current) {
      return locationCountsRef.current;
    }

    if (sharedLocationCountsCache) {
      locationCountsRef.current = sharedLocationCountsCache;
      return sharedLocationCountsCache;
    }

    if (sharedLocationCountsPromise) {
      return sharedLocationCountsPromise
        .then((counts) => {
          sharedLocationCountsCache = counts;
          locationCountsRef.current = counts;
          setSummary((current) => ({
            ...current,
            totalLocationCount: counts.total,
            totalCountLoading: false
          }));
          return counts;
        })
        .catch((nextError) => {
          const message = formatErrorMessage(nextError);
          setError(message);
          throw nextError;
        });
    }

    setLoading(true);
    setSummary((current) => ({
      ...current,
      totalCountLoading: true
    }));
    const nextPromise = locationService
      .getLocationCounts()
      .then((counts) => {
        sharedLocationCountsCache = counts;
        locationCountsRef.current = counts;
        setSummary((current) => ({
          ...current,
          totalLocationCount: counts.total,
          totalCountLoading: false
        }));
        return counts;
      })
      .catch((nextError) => {
        const message = formatErrorMessage(nextError);
        setError(message);
        throw nextError;
      })
      .finally(() => {
        if (sharedLocationCountsPromise === nextPromise) {
          sharedLocationCountsPromise = null;
        }
      });

    sharedLocationCountsPromise = nextPromise;
    return nextPromise;
  }, []);

  const ensureMapIndex = useCallback(async (): Promise<LocationMapIndexRecord[]> => {
    if (mapIndexRef.current) {
      return mapIndexRef.current;
    }

    if (!didHydrateMapIndexSessionCache) {
      didHydrateMapIndexSessionCache = true;
      const cachedPoints = readMapIndexSessionCache();
      if (cachedPoints && cachedPoints.length > 0) {
        if (!sharedMapIndexCountValidationPromise) {
          sharedMapIndexCountValidationPromise = locationService
            .getLocationCounts()
            .then((counts) => counts.total === cachedPoints.length)
            .catch(() => true)
            .finally(() => {
              sharedMapIndexCountValidationPromise = null;
            });
        }

        const isValidCachedPoints = await sharedMapIndexCountValidationPromise;
        if (isValidCachedPoints) {
          sharedMapIndexCache = cachedPoints;
          mapIndexRef.current = cachedPoints;
          setIndexPoints(cachedPoints);
          setError(null);
          return cachedPoints;
        }

        clearMapIndexSessionCache();
      }
    }

    if (sharedMapIndexCache) {
      mapIndexRef.current = sharedMapIndexCache;
      setIndexPoints(sharedMapIndexCache);
      setError(null);
      return sharedMapIndexCache;
    }

    if (mapIndexPromiseRef.current) {
      return mapIndexPromiseRef.current;
    }

    setLoading(true);
    const nextPromise = locationService
      .listLocationMapIndex()
      .then((points) => {
        sharedMapIndexCache = points;
        mapIndexRef.current = points;
        setIndexPoints(points);
        persistMapIndexSessionCache(points);
        setError(null);
        setSummary((current) => ({
          ...current,
          totalLocationCount: locationCountsRef.current?.total ?? current.totalLocationCount,
          totalCountLoading: !locationCountsRef.current
        }));
        return points;
      })
      .catch((nextError) => {
        const message = formatErrorMessage(nextError);
        setError(message);
        throw nextError;
      })
      .finally(() => {
        if (sharedMapIndexPromise === nextPromise) {
          sharedMapIndexPromise = null;
        }
        mapIndexPromiseRef.current = null;
      });

    sharedMapIndexPromise = nextPromise;
    mapIndexPromiseRef.current = nextPromise;
    return mapIndexPromiseRef.current;
  }, []);

  const loadBootstrapViewport = useCallback(async (viewport: MapViewportBounds): Promise<void> => {
    if (!enabled || viewport.zoom < DETAIL_LOCATION_ZOOM_THRESHOLD) {
      return;
    }

    if (activeKeysRef.current.length > 0) {
      return;
    }

    const bootstrapKey = buildBootstrapLayerKey(viewport);
    if (bootstrapLayerKeyRef.current === bootstrapKey || bootstrapInFlightKeyRef.current === bootstrapKey) {
      return;
    }

    bootstrapLayerKeyRef.current = bootstrapKey;
    bootstrapInFlightKeyRef.current = bootstrapKey;
    bootstrapPendingRef.current = true;
    setLoading(true);

    const span = getPartitionSpan(viewport.zoom);
    const bounds = expandBounds(viewport, PRELOAD_PADDING_RATIO, span);
    const nextPromise = locationService
      .listLocationsInBounds(bounds)
      .then((bootstrapLocations) => {
        if (bootstrapLayerKeyRef.current !== bootstrapKey || activeKeysRef.current.length > 0) {
          return;
        }

        const nextEntry = {
          bounds,
          locations: bootstrapLocations,
          loadedAt: Date.now()
        };

        cacheRef.current.set(bootstrapKey, nextEntry);
        sharedPartitionCache.set(bootstrapKey, nextEntry);
        trimPartitionCache(sharedPartitionCache);

        activeDescriptorsRef.current = [{ key: bootstrapKey, bounds }];
        activeKeysRef.current = [bootstrapKey];
        setSummary((current) => ({
          ...current,
          visibleLocationCount: bootstrapLocations.length,
          totalLocationCount: locationCountsRef.current?.total ?? current.totalLocationCount,
          visiblePartitionCount: 1,
          totalPartitionCount: 1,
          totalCountLoading: !locationCountsRef.current && current.totalLocationCount === 0
        }));
        setError(null);
        syncVisibleLocations();
      })
      .catch((nextError) => {
        if (bootstrapLayerKeyRef.current === bootstrapKey) {
          setError(formatErrorMessage(nextError));
        }
      })
      .finally(() => {
        if (bootstrapLayerKeyRef.current === bootstrapKey) {
          bootstrapPendingRef.current = false;
        }
        if (bootstrapInFlightKeyRef.current === bootstrapKey) {
          bootstrapInFlightKeyRef.current = null;
        }
        syncVisibleLocations();
      });

    await nextPromise;
  }, [enabled, syncVisibleLocations]);

  const loadPartitions = useCallback(async (
    descriptors: PartitionDescriptor[],
    options?: { background?: boolean }
  ): Promise<void> => {
    if (!enabled || descriptors.length === 0) {
      syncVisibleLocations();
      return;
    }

    const background = options?.background ?? false;
    const generation = generationRef.current;
    const queuedDescriptors = descriptors.filter(({ key }) => !pendingKeysRef.current.has(key));

    if (queuedDescriptors.length === 0) {
      syncVisibleLocations();
      return;
    }

    queuedDescriptors.forEach(({ key }) => pendingKeysRef.current.add(key));
    syncVisibleLocations();

    let nextError: string | null = null;

    try {
      for (let index = 0; index < queuedDescriptors.length; index += PARTITION_FETCH_BATCH_SIZE) {
        const batch = queuedDescriptors.slice(index, index + PARTITION_FETCH_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async ({ key, bounds }) => ({
            key,
            bounds,
            locations: await locationService.listLocationsInBounds(bounds)
          }))
        );

        if (generation !== generationRef.current) {
          return;
        }

        results.forEach((result, batchIndex) => {
          const descriptor = batch[batchIndex];
          pendingKeysRef.current.delete(descriptor.key);

          if (result.status === "fulfilled") {
            const nextEntry = {
              bounds: descriptor.bounds,
              locations: result.value.locations,
              loadedAt: Date.now()
            };
            cacheRef.current.set(descriptor.key, nextEntry);
            sharedPartitionCache.set(descriptor.key, nextEntry);
            trimPartitionCache(sharedPartitionCache);
            return;
          }

          nextError = formatErrorMessage(result.reason);
        });

        syncVisibleLocations();
      }
    } finally {
      if (generation !== generationRef.current) {
        return;
      }

      queuedDescriptors.forEach(({ key }) => pendingKeysRef.current.delete(key));
      syncVisibleLocations();
      if (!background) {
        setError(nextError);
      }
    }
  }, [enabled, syncVisibleLocations]);

  const scheduleBackgroundPrefetch = useCallback((descriptors: PartitionDescriptor[]): void => {
    if (!enabled || descriptors.length === 0 || typeof window === "undefined") {
      return;
    }

    const queuedDescriptors = descriptors
      .filter(({ key }) => !cacheRef.current.has(key) && !pendingKeysRef.current.has(key))
      .slice(0, BACKGROUND_PREFETCH_LIMIT);

    if (queuedDescriptors.length === 0) {
      return;
    }

    if (prefetchTimerRef.current !== null) {
      window.clearTimeout(prefetchTimerRef.current);
    }

    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      void loadPartitions(queuedDescriptors, { background: true });
    }, VIEWPORT_APPLY_DEBOUNCE_MS);
  }, [enabled, loadPartitions]);

  const applyViewport = useCallback(async (viewport: MapViewportBounds): Promise<void> => {
    if (!enabled) {
      return;
    }

    lastViewportRef.current = viewport;
    void ensureLocationCounts();
    const pointsPromise = ensureMapIndex();
    void loadBootstrapViewport(viewport);
    const points = await pointsPromise;
    setIndexPoints(points);
    setSummary((current) => {
      const totalLocationCount = locationCountsRef.current?.total ?? current.totalLocationCount;
      return {
        ...buildSummary(points, viewport),
        totalLocationCount,
        totalCountLoading: !locationCountsRef.current
      };
    });

    if (viewport.zoom < DETAIL_LOCATION_ZOOM_THRESHOLD) {
      detailLayerKeyRef.current = null;
      bootstrapLayerKeyRef.current = null;
      activeDescriptorsRef.current = [];
      activeKeysRef.current = [];
      lastSignatureRef.current = "";
      syncVisibleLocations();

      const futureZoomLevels = Array.from(new Set([
        Math.min(viewport.zoom + 1, DETAIL_LOCATION_ZOOM_THRESHOLD),
        Math.min(viewport.zoom + 2, DETAIL_LOCATION_ZOOM_THRESHOLD)
      ].filter((zoomLevel) => zoomLevel > viewport.zoom)));

      const deeperDescriptors = futureZoomLevels.flatMap((zoomLevel) => {
        const centeredBounds = buildCenteredBounds(viewport, zoomLevel);
        const centeredPoints = points.filter((point) => isPointInsideBounds(point, centeredBounds));
        return filterDescriptorsWithPoints(buildPartitionDescriptors(centeredBounds, zoomLevel), centeredPoints, zoomLevel);
      });

      setError(null);
      scheduleBackgroundPrefetch(deeperDescriptors);
      return;
    }

    const span = getPartitionSpan(viewport.zoom);
    const preloadBounds = expandBounds(viewport, PRELOAD_PADDING_RATIO, span);
    const retainBounds = expandBounds(viewport, RETAIN_PADDING_RATIO, span);
    const preloadPoints = points.filter((point) => isPointInsideBounds(point, preloadBounds));
    const retainPoints = points.filter((point) => isPointInsideBounds(point, retainBounds));
    const retainKeys = collectPartitionKeys(retainPoints, viewport.zoom);
    const activeDescriptors = filterDescriptorsWithPoints(buildPartitionDescriptors(preloadBounds, viewport.zoom), preloadPoints, viewport.zoom);
    const retainDescriptors = filterDescriptorsWithPoints(buildPartitionDescriptors(retainBounds, viewport.zoom), retainPoints, viewport.zoom);
    const activeKeys = activeDescriptors.map(({ key }) => key);
    const nextSignature = activeKeys.join("|");
    const nextDetailLayerKey = buildDetailLayerKey(viewport.zoom);
    const currentActiveKeys = new Set(activeKeysRef.current);
    const isSubsetOfCurrentLayer =
      detailLayerKeyRef.current === nextDetailLayerKey &&
      activeKeys.length > 0 &&
      activeKeys.every((key) => currentActiveKeys.has(key));

    const missingDescriptors = activeDescriptors.filter(({ key }) => !cacheRef.current.has(key) && !pendingKeysRef.current.has(key));
    const backgroundDescriptors = retainDescriptors.filter(({ key }) => !activeKeys.includes(key));

    if (isSubsetOfCurrentLayer && missingDescriptors.length === 0) {
      setError(null);
      return;
    }

    detailLayerKeyRef.current = nextDetailLayerKey;
    bootstrapLayerKeyRef.current = null;
    bootstrapInFlightKeyRef.current = null;
    bootstrapPendingRef.current = false;

    activeDescriptorsRef.current = activeDescriptors;
    activeKeysRef.current = activeKeys;

    Array.from(cacheRef.current.keys()).forEach((key) => {
      if (!retainKeys.has(key)) {
        cacheRef.current.delete(key);
      }
    });

    syncVisibleLocations();

    if (nextSignature === lastSignatureRef.current && missingDescriptors.length === 0) {
      scheduleBackgroundPrefetch(backgroundDescriptors);
      return;
    }

    lastSignatureRef.current = nextSignature;

    if (missingDescriptors.length === 0) {
      setError(null);
      scheduleBackgroundPrefetch(backgroundDescriptors);
      return;
    }

    setError(null);
    await loadPartitions(missingDescriptors);
    scheduleBackgroundPrefetch(backgroundDescriptors);
  }, [enabled, ensureLocationCounts, ensureMapIndex, loadBootstrapViewport, loadPartitions, scheduleBackgroundPrefetch, syncVisibleLocations]);

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
    if (!enabled || activeDescriptorsRef.current.length === 0) {
      return;
    }

    await ensureMapIndex();
    activeDescriptorsRef.current.forEach(({ key }) => {
      cacheRef.current.delete(key);
    });
    if (bootstrapLayerKeyRef.current) {
      cacheRef.current.delete(bootstrapLayerKeyRef.current);
      sharedPartitionCache.delete(bootstrapLayerKeyRef.current);
    }
    setError(null);
    syncVisibleLocations();
    await loadPartitions(activeDescriptorsRef.current);
  }, [enabled, ensureMapIndex, loadPartitions, syncVisibleLocations]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void ensureLocationCounts();
    void ensureMapIndex()
      .then(() => {
        if (lastViewportRef.current) {
          void applyViewport(lastViewportRef.current);
          return;
        }

        setSummary({
          visibleLocationCount: 0,
          totalLocationCount: locationCountsRef.current?.total ?? 0,
          visiblePartitionCount: 0,
          totalPartitionCount: 0,
          totalCountLoading: !locationCountsRef.current
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [applyViewport, enabled, ensureLocationCounts, ensureMapIndex]);

  useEffect(() => {
    if (enabled) {
      return;
    }

    if (typeof window !== "undefined") {
      if (viewportTimerRef.current !== null) {
        window.clearTimeout(viewportTimerRef.current);
      }
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }
    }

    viewportTimerRef.current = null;
    prefetchTimerRef.current = null;
    generationRef.current += 1;
    cacheRef.current = new Map(sharedPartitionCache);
    pendingKeysRef.current.clear();
    activeKeysRef.current = [];
    activeDescriptorsRef.current = [];
    lastSignatureRef.current = "";
    mapIndexRef.current = sharedMapIndexCache;
    mapIndexPromiseRef.current = sharedMapIndexPromise;
    detailLayerKeyRef.current = null;
    lastViewportRef.current = null;
    setLocations([]);
    setIndexPoints(sharedMapIndexCache || []);
    setLoading(false);
    setError(null);
    setSummary(EMPTY_SUMMARY);
    locationCountsRef.current = sharedLocationCountsCache;
    bootstrapLayerKeyRef.current = null;
    bootstrapInFlightKeyRef.current = null;
    bootstrapPendingRef.current = false;
  }, [enabled]);

  useEffect(() => () => {
    if (typeof window === "undefined") {
      return;
    }

    if (viewportTimerRef.current !== null) {
      window.clearTimeout(viewportTimerRef.current);
    }
    if (prefetchTimerRef.current !== null) {
      window.clearTimeout(prefetchTimerRef.current);
    }
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
