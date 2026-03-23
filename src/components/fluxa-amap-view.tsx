import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { MapPinned, Navigation, RefreshCw } from "lucide-react";
import Supercluster from "supercluster";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DETAIL_LOCATION_ZOOM_THRESHOLD, type MapPartitionSummary } from "@/hooks/use-fluxa-map-partitions";
import { DEFAULT_FLUXA_MAP_CENTER, SHANGHAI_GOVERNMENT_FALLBACK, getAMapConfig, loadAMap } from "@/lib/amap";
import { MAP_THEME_PRESETS, type MarkerVariant, type MapThemeKey } from "@/lib/map-theme";
import type { LocationMapIndexRecord, LocationSearchRecord } from "@/services/location-service";
import type { LocationRecord } from "@/types/location";

export interface MapViewportSnapshot {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number;
  center: [number, number];
}

interface FluxaAmapViewProps {
  active?: boolean;
  mapIndexPoints?: LocationMapIndexRecord[];
  locationSearchDirectory?: LocationSearchRecord[];
  locations: LocationRecord[];
  loading?: boolean;
  locateRequestKey?: number;
  mapFocusLocation?: LocationRecord | null;
  mapFocusRequestKey?: number;
  onLocationResolved?: (position: { lng: number; lat: number }) => void;
  onRefresh?: () => Promise<void> | void;
  onOpenDetail?: (location: LocationRecord) => void;
  onLocatingChange?: (locating: boolean) => void;
  onViewportChange?: (viewport: MapViewportSnapshot) => void;
  mapSummary?: MapPartitionSummary;
  mapTheme: MapThemeKey;
}

interface CachedMapViewport {
  center: [number, number];
  zoom: number;
  focusPoint: [number, number] | null;
}

interface RenderedLocationMarker {
  type: "location";
  location: LocationRecord;
}

interface RenderedClusterMarker {
  type: "cluster";
  count: number;
  locations: LocationRecord[];
  position: [number, number];
}

type RenderedMapMarker = RenderedLocationMarker | RenderedClusterMarker;

interface RenderedIndexClusterMarker {
  type: "index-cluster";
  count: number;
  clusterId: number;
  position: [number, number];
}

interface RenderedIndexPointMarker {
  type: "index-point";
  point: LocationMapIndexRecord;
  position: [number, number];
}

type RenderedIndexMarker = RenderedIndexClusterMarker | RenderedIndexPointMarker;

interface ClusterBucket {
  locations: LocationRecord[];
  sumLng: number;
  sumLat: number;
  sumX: number;
  sumY: number;
  pixelCount: number;
}

let cachedMapViewport: CachedMapViewport | null = null;
const CLUSTER_BREAK_ZOOM = 15;
const INDEX_RENDER_DETAIL_ZOOM_THRESHOLD = DETAIL_LOCATION_ZOOM_THRESHOLD + 1;
const FOCUS_POINT_RELEASE_TOLERANCE = 0.0008;

function createClusterMarkerContent(count: number): string {
  return `
    <div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;background:#2563EB;border:3px solid rgba(255,255,255,0.98);box-shadow:0 0 0 1px rgba(15,23,42,0.06),0 2px 5px rgba(15,23,42,0.10);color:#ffffff;font-size:13px;font-weight:700;">
      ${count}
    </div>
  `;
}

function getClusterGridSize(zoom: number): number {
  if (zoom >= CLUSTER_BREAK_ZOOM) return 0;
  if (zoom >= 13) return 84;
  if (zoom >= 11) return 108;
  return 132;
}

function getClusterMarkerSpacing(zoom: number): number {
  if (zoom >= 13) return 66;
  if (zoom >= 11) return 80;
  return 96;
}

function getPixelPoint(pixel: any): { x: number; y: number } | null {
  const x = typeof pixel?.x === "number" ? pixel.x : typeof pixel?.getX?.() === "number" ? pixel.getX() : null;
  const y = typeof pixel?.y === "number" ? pixel.y : typeof pixel?.getY?.() === "number" ? pixel.getY() : null;

  if (typeof x !== "number" || typeof y !== "number") {
    return null;
  }

  return { x, y };
}

function isLocationWithinBounds(map: any, location: LocationRecord): boolean {
  const bounds = map?.getBounds?.();
  const southWest = bounds?.getSouthWest?.();
  const northEast = bounds?.getNorthEast?.();

  if (!southWest || !northEast) {
    return true;
  }

  return (
    location.lng >= southWest.lng &&
    location.lng <= northEast.lng &&
    location.lat >= southWest.lat &&
    location.lat <= northEast.lat
  );
}

function getBucketPixel(bucket: ClusterBucket): { x: number; y: number } | null {
  if (bucket.pixelCount === 0) {
    return null;
  }

  return {
    x: bucket.sumX / bucket.pixelCount,
    y: bucket.sumY / bucket.pixelCount
  };
}

function mergeClusterBuckets(left: ClusterBucket, right: ClusterBucket): ClusterBucket {
  return {
    locations: [...left.locations, ...right.locations],
    sumLng: left.sumLng + right.sumLng,
    sumLat: left.sumLat + right.sumLat,
    sumX: left.sumX + right.sumX,
    sumY: left.sumY + right.sumY,
    pixelCount: left.pixelCount + right.pixelCount
  };
}

function mergeNearbyClusterBuckets(buckets: ClusterBucket[], minSpacing: number): ClusterBucket[] {
  const mergedBuckets = [...buckets];
  let hasOverlap = true;

  while (hasOverlap) {
    hasOverlap = false;

    for (let index = 0; index < mergedBuckets.length; index += 1) {
      const currentBucket = mergedBuckets[index];
      const currentPixel = getBucketPixel(currentBucket);
      if (!currentPixel) {
        continue;
      }

      for (let nextIndex = index + 1; nextIndex < mergedBuckets.length; nextIndex += 1) {
        const nextBucket = mergedBuckets[nextIndex];
        const nextPixel = getBucketPixel(nextBucket);
        if (!nextPixel) {
          continue;
        }

        if (Math.hypot(currentPixel.x - nextPixel.x, currentPixel.y - nextPixel.y) >= minSpacing) {
          continue;
        }

        mergedBuckets[index] = mergeClusterBuckets(currentBucket, nextBucket);
        mergedBuckets.splice(nextIndex, 1);
        hasOverlap = true;
        break;
      }

      if (hasOverlap) {
        break;
      }
    }
  }

  return mergedBuckets;
}

function buildRenderedMapMarkers(map: any, locations: LocationRecord[]): {
  visibleCount: number;
  markers: RenderedMapMarker[];
} {
  const visibleLocations = locations.filter((location) => isLocationWithinBounds(map, location));
  const zoom = typeof map?.getZoom?.() === "number" ? map.getZoom() : 11;
  const gridSize = getClusterGridSize(zoom);

  if (gridSize === 0) {
    return {
      visibleCount: visibleLocations.length,
      markers: visibleLocations.map((location) => ({ type: "location", location }))
    };
  }

  const buckets = new Map<string, ClusterBucket>();

  visibleLocations.forEach((location) => {
    const pixel = getPixelPoint(map?.lngLatToContainer?.(new window.AMap.LngLat(location.lng, location.lat)));
    const key = pixel ? `${Math.floor(pixel.x / gridSize)}:${Math.floor(pixel.y / gridSize)}` : `fallback:${location.id}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.locations.push(location);
      bucket.sumLng += location.lng;
      bucket.sumLat += location.lat;
      if (pixel) {
        bucket.sumX += pixel.x;
        bucket.sumY += pixel.y;
        bucket.pixelCount += 1;
      }
      return;
    }

    buckets.set(key, {
      locations: [location],
      sumLng: location.lng,
      sumLat: location.lat,
      sumX: pixel?.x ?? 0,
      sumY: pixel?.y ?? 0,
      pixelCount: pixel ? 1 : 0
    });
  });

  const spacedBuckets = mergeNearbyClusterBuckets(Array.from(buckets.values()), getClusterMarkerSpacing(zoom));
  const clusteredMarkers = spacedBuckets.flatMap<RenderedMapMarker>((bucket) => {
    if (bucket.locations.length === 1) {
      return [{ type: "location", location: bucket.locations[0] }];
    }

    return [{
      type: "cluster",
      count: bucket.locations.length,
      locations: bucket.locations,
      position: [bucket.sumLng / bucket.locations.length, bucket.sumLat / bucket.locations.length]
    }];
  });

  return {
    visibleCount: visibleLocations.length,
    markers: clusteredMarkers
  };
}

function buildRenderedIndexMarkers(
  map: any,
  clusterIndex: Supercluster<any, any>
): {
  visibleCount: number;
  markers: RenderedIndexMarker[];
} {
  const snapshot = readViewportSnapshot(map);
  if (!snapshot) {
    return {
      visibleCount: 0,
      markers: []
    };
  }

  const zoom = Math.max(0, Math.floor(snapshot.zoom));
  const features = clusterIndex.getClusters([snapshot.west, snapshot.south, snapshot.east, snapshot.north], zoom);
  let visibleCount = 0;

  const markers = features.flatMap<RenderedIndexMarker>((feature) => {
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const properties = feature.properties as {
      cluster?: boolean;
      cluster_id?: number;
      point_count?: number;
      locationId?: string;
      name?: string;
      address?: string;
      brand?: string;
      city?: string;
      status?: LocationRecord["status"];
      updatedAt?: string;
    };

    if (properties.cluster && typeof properties.cluster_id === "number") {
      const count = typeof properties.point_count === "number" ? properties.point_count : 0;
      visibleCount += count;
      return [{
        type: "index-cluster",
        count,
        clusterId: properties.cluster_id,
        position: [lng, lat]
      }];
    }

    visibleCount += 1;
    return properties.locationId
      ? [{
          type: "index-point",
          point: {
            id: properties.locationId,
            name: properties.name || "Untitled Location",
            address: properties.address || "Unknown address",
            brand: properties.brand || "Unknown",
            city: properties.city || "Unknown",
            status: properties.status === "inactive" ? "inactive" : "active",
            lat,
            lng,
            updatedAt: properties.updatedAt || new Date().toISOString()
          },
          position: [lng, lat]
        }]
      : [];
  });

  return {
    visibleCount,
    markers
  };
}

function readViewportSnapshot(map: any): MapViewportSnapshot | null {
  const bounds = map?.getBounds?.();
  const southWest = bounds?.getSouthWest?.();
  const northEast = bounds?.getNorthEast?.();
  const center = map?.getCenter?.();
  const zoom = map?.getZoom?.();

  if (
    typeof southWest?.lat !== "number" ||
    typeof southWest?.lng !== "number" ||
    typeof northEast?.lat !== "number" ||
    typeof northEast?.lng !== "number" ||
    typeof center?.lat !== "number" ||
    typeof center?.lng !== "number" ||
    typeof zoom !== "number"
  ) {
    return null;
  }

  return {
    south: southWest.lat,
    west: southWest.lng,
    north: northEast.lat,
    east: northEast.lng,
    zoom,
    center: [center.lng, center.lat]
  };
}

function isNearPoint(left: [number, number], right: [number, number], tolerance = FOCUS_POINT_RELEASE_TOLERANCE): boolean {
  return Math.abs(left[0] - right[0]) <= tolerance && Math.abs(left[1] - right[1]) <= tolerance;
}

function markerColor(status: LocationRecord["status"]): string {
  return status === "active" ? "#2563EB" : "#F97316";
}

function buildLightweightLocation(
  point: LocationMapIndexRecord,
  searchRecord?: LocationSearchRecord
): LocationRecord {
  const timestamp = searchRecord?.updatedAt || point.updatedAt || new Date().toISOString();

  return {
    id: point.id,
    name: searchRecord?.name || point.name || "地图地点",
    address: searchRecord?.address || point.address || "Unknown address",
    brand: searchRecord?.brand || point.brand || "Unknown",
    city: searchRecord?.city || point.city || "Unknown",
    addedBy: searchRecord?.addedBy,
    status: searchRecord?.status || point.status || "active",
    lat: point.lat,
    lng: point.lng,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function createMarkerContent(location: LocationRecord, variant: MarkerVariant): string {
  const safeName = location.name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const color = markerColor(location.status);
  const initial = location.brand.slice(0, 1).toUpperCase() || "F";

  if (variant === "apple") {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:7px;">
        <div style="
          position:relative;
          width:28px;
          height:28px;
          border-radius:28px 28px 28px 4px;
          transform:rotate(-45deg);
          background:linear-gradient(180deg, #52A8FF 0%, #0A84FF 100%);
          border:3px solid rgba(255,255,255,0.96);
          box-shadow:0 12px 28px rgba(10,132,255,0.28), 0 6px 14px rgba(15,23,42,0.14);
        ">
          <span style="
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(45deg);
            color:#ffffff;
            font-size:10px;
            font-weight:700;
            letter-spacing:0.02em;
          ">${initial}</span>
        </div>
        <div style="
          max-width:148px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          padding:4px 10px;
          border-radius:999px;
          background:rgba(255,255,255,0.88);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          color:#111827;
          font-size:11px;
          font-weight:600;
          box-shadow:0 10px 24px rgba(15,23,42,0.12);
          border:1px solid rgba(255,255,255,0.72);
        ">${safeName}</div>
      </div>
    `;
  }

  if (variant === "minimal") {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="
          width:18px;
          height:18px;
          border-radius:999px;
          background:${color};
          border:3px solid rgba(255,255,255,0.96);
          box-shadow:0 8px 18px rgba(15,23,42,0.24);
        "></div>
        <div style="
          max-width:132px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          padding:2px 8px;
          border-radius:999px;
          background:rgba(255,255,255,0.96);
          color:#0F172A;
          font-size:11px;
          font-weight:600;
          box-shadow:0 6px 18px rgba(15,23,42,0.12);
        ">${safeName}</div>
      </div>
    `;
  }

  if (variant === "pin") {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="
          position:relative;
          width:30px;
          height:30px;
          border-radius:30px 30px 30px 0;
          transform:rotate(-45deg);
          background:${color};
          border:3px solid rgba(255,255,255,0.94);
          box-shadow:0 10px 24px rgba(15,23,42,0.24);
        ">
          <span style="
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(45deg);
            color:#fff;
            font-size:11px;
            font-weight:700;
          ">${initial}</span>
        </div>
        <div style="
          max-width:140px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          padding:3px 10px;
          border-radius:999px;
          background:rgba(255,255,255,0.96);
          color:#0F172A;
          font-size:11px;
          font-weight:600;
          box-shadow:0 6px 18px rgba(15,23,42,0.12);
        ">${safeName}</div>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <div style="
        width:34px;
        height:34px;
        border-radius:999px;
        background:${color};
        border:3px solid rgba(255,255,255,0.92);
        box-shadow:0 10px 24px rgba(15,23,42,0.22);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-weight:700;
        font-size:12px;
      ">
        ${initial}
      </div>
      <div style="
        max-width:140px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        padding:3px 10px;
        border-radius:999px;
        background:rgba(255,255,255,0.96);
        color:#0F172A;
        font-size:11px;
        font-weight:600;
        box-shadow:0 6px 18px rgba(15,23,42,0.12);
      ">
        ${safeName}
      </div>
    </div>
  `;
}

function createFocusMarkerContent(name: string, variant: MarkerVariant): string {
  const safeName = name
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  if (variant === "apple") {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:7px;">
        <div style="
          position:relative;
          width:30px;
          height:30px;
          border-radius:30px 30px 30px 4px;
          transform:rotate(-45deg);
          background:#F97316;
          border:3px solid rgba(255,255,255,0.98);
        ">
          <span style="
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(45deg);
            color:#ffffff;
            font-size:13px;
            font-weight:700;
          ">◎</span>
        </div>
        <div style="
          max-width:156px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          padding:4px 10px;
          border-radius:999px;
          background:#FFF7ED;
          color:#9A3412;
          font-size:11px;
          font-weight:700;
          border:1px solid #FDBA74;
        ">${safeName}</div>
      </div>
    `;
  }

  if (variant === "minimal") {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="
          width:20px;
          height:20px;
          border-radius:999px;
          background:#F97316;
          border:3px solid rgba(255,255,255,0.98);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#fff;
          font-size:10px;
          font-weight:700;
        ">◎</div>
        <div style="
          max-width:140px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          padding:2px 8px;
          border-radius:999px;
          background:#FFF7ED;
          color:#9A3412;
          font-size:11px;
          font-weight:700;
          border:1px solid #FDBA74;
        ">${safeName}</div>
      </div>
    `;
  }

  if (variant === "pin") {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <div style="
          position:relative;
          width:32px;
          height:32px;
          border-radius:32px 32px 32px 0;
          transform:rotate(-45deg);
          background:#F97316;
          border:3px solid rgba(255,255,255,0.98);
        ">
          <span style="
            position:absolute;
            inset:0;
            display:flex;
            align-items:center;
            justify-content:center;
            transform:rotate(45deg);
            color:#fff;
            font-size:13px;
            font-weight:700;
          ">◎</span>
        </div>
        <div style="
          max-width:148px;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          padding:3px 10px;
          border-radius:999px;
          background:#FFF7ED;
          color:#9A3412;
          font-size:11px;
          font-weight:700;
          border:1px solid #FDBA74;
        ">${safeName}</div>
      </div>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <div style="
        width:36px;
        height:36px;
        border-radius:999px;
        background:#F97316;
        border:3px solid rgba(255,255,255,0.98);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
        font-weight:700;
        font-size:14px;
      ">
        ◎
      </div>
      <div style="
        max-width:148px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        padding:3px 10px;
        border-radius:999px;
        background:#FFF7ED;
        color:#9A3412;
        font-size:11px;
        font-weight:700;
        border:1px solid #FDBA74;
      ">
        ${safeName}
      </div>
    </div>
  `;
}

export function FluxaAmapView({
  active = true,
  mapIndexPoints = [],
  locationSearchDirectory = [],
  locations,
  loading = false,
  locateRequestKey = 0,
  mapFocusLocation = null,
  mapFocusRequestKey = 0,
  onLocationResolved,
  onRefresh,
  onOpenDetail,
  onLocatingChange,
  onViewportChange,
  mapSummary = {
    visibleLocationCount: 0,
    totalLocationCount: 0,
    visiblePartitionCount: 0,
    totalPartitionCount: 0
  },
  mapTheme
}: FluxaAmapViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const currentLocationMarkerRef = useRef<any | null>(null);
  const lastLocateRequestRef = useRef(0);
  const lastMapFocusRequestRef = useRef(0);
  const focusPointRef = useRef<[number, number] | null>(null);
  const focusTimerRefs = useRef<number[]>([]);
  const openDetailRef = useRef(onOpenDetail);
  const viewportChangeRef = useRef(onViewportChange);
  const locationsRef = useRef(locations);
  const selectedLocationIdRef = useRef<string | null>(null);
  const renderVisibleMarkersRef = useRef<(() => void) | null>(null);
  const emitViewportSnapshotRef = useRef<(() => void) | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fallbackDialogMessage, setFallbackDialogMessage] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [visibleLocationCount, setVisibleLocationCount] = useState(locations.length);
  const clusterIndex = useMemo(() => {
    if (mapIndexPoints.length === 0) {
      return null;
    }

    const nextIndex = new Supercluster<any, any>({
      radius: 76,
      maxZoom: DETAIL_LOCATION_ZOOM_THRESHOLD,
      minPoints: 2
    });

    nextIndex.load(
      mapIndexPoints.map((point) => ({
        type: "Feature" as const,
        id: point.id,
        properties: {
          locationId: point.id,
          name: point.name,
          address: point.address,
          brand: point.brand,
          city: point.city,
          status: point.status,
          updatedAt: point.updatedAt
        },
        geometry: {
          type: "Point" as const,
          coordinates: [point.lng, point.lat] as [number, number]
        }
      }))
    );

    return nextIndex;
  }, [mapIndexPoints]);
  const locationSearchById = useMemo(
    () => new Map(locationSearchDirectory.map((location) => [location.id, location])),
    [locationSearchDirectory]
  );

  const center = useMemo<[number, number]>(() => {
    if (cachedMapViewport?.center) {
      return cachedMapViewport.center;
    }
    const first = locations[0];
    if (!first) return DEFAULT_FLUXA_MAP_CENTER;
    return [first.lng, first.lat];
  }, [locations]);

  const themePreset = MAP_THEME_PRESETS[mapTheme];

  useEffect(() => {
    openDetailRef.current = onOpenDetail;
  }, [onOpenDetail]);

  useEffect(() => {
    viewportChangeRef.current = onViewportChange;
  }, [onViewportChange]);

  useEffect(() => {
    locationsRef.current = locations;
    if (active) {
      renderVisibleMarkersRef.current?.();
    }
  }, [active, locations]);

  useEffect(() => {
    selectedLocationIdRef.current = selectedLocationId;
    if (active) {
      renderVisibleMarkersRef.current?.();
    }
  }, [active, selectedLocationId]);

  useEffect(() => {
    if (active) {
      renderVisibleMarkersRef.current?.();
    }
  }, [active, clusterIndex]);

  useEffect(() => {
    if (active) {
      renderVisibleMarkersRef.current?.();
    }
  }, [active, locationSearchById]);

  renderVisibleMarkersRef.current = () => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    if (!active) {
      return;
    }

    markersRef.current.forEach((marker) => marker.setMap?.(null));
    markersRef.current = [];

    const currentZoom = typeof map?.getZoom?.() === "number" ? map.getZoom() : 11;

    const shouldUseIndexMarkers =
      Boolean(clusterIndex)
      && (locationsRef.current.length === 0 || currentZoom < INDEX_RENDER_DETAIL_ZOOM_THRESHOLD);

    if (shouldUseIndexMarkers && clusterIndex) {
      const { visibleCount, markers } = buildRenderedIndexMarkers(map, clusterIndex);
      const locationsById = new Map(locationsRef.current.map((location) => [location.id, location]));
      setVisibleLocationCount(visibleCount);

      const nextMarkers = markers.map((item) => {
        if (item.type === "index-cluster") {
          const marker = new window.AMap.Marker({
            position: item.position,
            offset: new window.AMap.Pixel(-20, -20),
            content: createClusterMarkerContent(item.count),
            zIndex: 40
          });

          marker.on("click", () => {
            const expansionZoom = clusterIndex.getClusterExpansionZoom(item.clusterId);
            map.stopMove?.();
            map.setZoomAndCenter(Math.min(expansionZoom, 18), item.position);
          });

          marker.setMap(map);
          return marker;
        }

        const matchedLocation =
          locationsById.get(item.point.id)
          || buildLightweightLocation(item.point, locationSearchById.get(item.point.id));
        const isSelected = selectedLocationIdRef.current === matchedLocation.id;
        const marker = new window.AMap.Marker({
          position: item.position,
          title: matchedLocation.name,
          offset: new window.AMap.Pixel(-17, -34),
          content: createMarkerContent(matchedLocation, themePreset.markerVariant),
          extData: matchedLocation,
          zIndex: isSelected ? 90 : 60
        });

        marker.on("click", () => {
          setSelectedLocationId(matchedLocation.id);
          openDetailRef.current?.(matchedLocation);
        });

        marker.setMap(map);
        return marker;
      });

      markersRef.current = nextMarkers;
      return;
    }

    const { visibleCount, markers } = buildRenderedMapMarkers(map, locationsRef.current);
    setVisibleLocationCount(visibleCount);

    const nextMarkers = markers.map((item) => {
      if (item.type === "cluster") {
        const marker = new window.AMap.Marker({
          position: item.position,
          offset: new window.AMap.Pixel(-20, -20),
          content: createClusterMarkerContent(item.count),
          zIndex: 40
        });

        marker.on("click", () => {
          const currentZoom = typeof map.getZoom?.() === "number" ? map.getZoom() : 11;
          map.stopMove?.();
          map.setZoomAndCenter(Math.min(currentZoom + 2, 18), item.position);
        });

        marker.setMap(map);
        return marker;
      }

      const isSelected = selectedLocationIdRef.current === item.location.id;
      const marker = new window.AMap.Marker({
        position: [item.location.lng, item.location.lat],
        title: item.location.name,
        offset: new window.AMap.Pixel(-17, -34),
        content: createMarkerContent(item.location, themePreset.markerVariant),
        extData: item.location,
        zIndex: isSelected ? 90 : 60
      });

      marker.on("click", () => {
        setSelectedLocationId(item.location.id);
        openDetailRef.current?.(item.location);
      });

      marker.setMap(map);
      return marker;
    });

    markersRef.current = nextMarkers;
  };

  emitViewportSnapshotRef.current = () => {
    if (!active) {
      return;
    }

    const snapshot = readViewportSnapshot(mapRef.current);
    if (snapshot) {
      viewportChangeRef.current?.(snapshot);
    }
  };

  const renderFocusMarker = (point: [number, number], name: string): void => {
    const map = mapRef.current;
    if (!map || !window.AMap) return;

    focusPointRef.current = point;
    focusTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    focusTimerRefs.current = [];
    currentLocationMarkerRef.current?.setMap?.(null);
    currentLocationMarkerRef.current = new window.AMap.Marker({
      position: point,
      title: name,
      offset: new window.AMap.Pixel(-17, -34),
      content: createFocusMarkerContent(name, themePreset.markerVariant)
    });
    currentLocationMarkerRef.current.setMap(map);
    map.stopMove?.();
    map.setZoomAndCenter(15, point);
    cachedMapViewport = {
      center: point,
      zoom: 15,
      focusPoint: point
    };
    focusTimerRefs.current = [240, 900].map((delay) =>
      window.setTimeout(() => {
        const latestPoint = focusPointRef.current;
        if (!latestPoint || mapRef.current !== map) return;
        map.stopMove?.();
        map.setZoomAndCenter(15, latestPoint);
        cachedMapViewport = {
          center: latestPoint,
          zoom: 15,
          focusPoint: latestPoint
        };
      }, delay)
    );
  };

  const focusFallbackLocation = (): void => {
    renderFocusMarker(
      SHANGHAI_GOVERNMENT_FALLBACK.center,
      SHANGHAI_GOVERNMENT_FALLBACK.name
    );
  };

  useEffect(() => {
    let destroyed = false;

    const initMap = async () => {
      if (!containerRef.current) return;

      try {
        setMapError(null);
        const AMap = await loadAMap();
        if (destroyed || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: cachedMapViewport?.zoom ?? (locations.length > 0 ? 11 : 10),
          center: cachedMapViewport?.center || focusPointRef.current || center,
          viewMode: "2D",
          mapStyle: themePreset.mapStyle,
          resizeEnable: true,
          dragEnable: true,
          zoomEnable: true
        });

        map.plugin(["AMap.Scale", "AMap.ToolBar"], () => {
          map.addControl(new AMap.Scale());
          map.addControl(new AMap.ToolBar({ position: { right: "16px", bottom: "24px" } }));
        });

        mapRef.current = map;
        if (cachedMapViewport?.focusPoint) {
          focusPointRef.current = cachedMapViewport.focusPoint;
        }

        const persistViewport = () => {
          const nextCenter = map.getCenter?.();
          const lng = nextCenter?.lng;
          const lat = nextCenter?.lat;
          const zoom = map.getZoom?.();
          if (typeof lng !== "number" || typeof lat !== "number" || typeof zoom !== "number") {
            return;
          }
          const nextCenterPoint: [number, number] = [lng, lat];
          const retainedFocusPoint =
            focusPointRef.current && isNearPoint(nextCenterPoint, focusPointRef.current)
              ? focusPointRef.current
              : null;

          focusPointRef.current = retainedFocusPoint;
          cachedMapViewport = {
            center: nextCenterPoint,
            zoom,
            focusPoint: retainedFocusPoint
          };
        };

        const handleMoveEnd = () => {
          persistViewport();
          emitViewportSnapshotRef.current?.();
        };

        const handleZoomEnd = () => {
          persistViewport();
          renderVisibleMarkersRef.current?.();
          emitViewportSnapshotRef.current?.();
        };

        map.on?.("moveend", handleMoveEnd);
        map.on?.("zoomend", handleZoomEnd);
        setMapReady(true);
        renderVisibleMarkersRef.current?.();
        emitViewportSnapshotRef.current?.();
      } catch (error) {
        setMapReady(false);
        setMapError(error instanceof Error ? error.message : "高德地图初始化失败。");
      }
    };

    void initMap();

    return () => {
      destroyed = true;
      const map = mapRef.current;
      const currentCenter = map?.getCenter?.();
      const currentZoom = map?.getZoom?.();
      if (typeof currentCenter?.lng === "number" && typeof currentCenter?.lat === "number" && typeof currentZoom === "number") {
        cachedMapViewport = {
          center: [currentCenter.lng, currentCenter.lat],
          zoom: currentZoom,
          focusPoint: focusPointRef.current
        };
      }
      focusTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      focusTimerRefs.current = [];
      markersRef.current.forEach((marker) => marker.setMap?.(null));
      markersRef.current = [];
      currentLocationMarkerRef.current?.setMap?.(null);
      currentLocationMarkerRef.current = null;
      mapRef.current?.destroy?.();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setMapStyle(themePreset.mapStyle);
    if (active) {
      renderVisibleMarkersRef.current?.();
    }
  }, [active, themePreset.mapStyle]);

  useEffect(() => {
    if (active) {
      renderVisibleMarkersRef.current?.();
    }
  }, [active, locations, themePreset.markerVariant]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      window.requestAnimationFrame(() => {
        map.resize?.();
        renderVisibleMarkersRef.current?.();
        emitViewportSnapshotRef.current?.();
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!mapReady) {
      return;
    }

    if (active) {
      renderVisibleMarkersRef.current?.();
      emitViewportSnapshotRef.current?.();
    }
  }, [active, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.AMap) return;
    if (!locateRequestKey || locateRequestKey === lastLocateRequestRef.current) return;

    lastLocateRequestRef.current = locateRequestKey;
    onLocatingChange?.(true);
    setMapError(null);

    if (!navigator.geolocation) {
      focusFallbackLocation();
      setFallbackDialogMessage(`当前浏览器不支持定位，地图已切换到默认位置：${SHANGHAI_GOVERNMENT_FALLBACK.name}。`);
      onLocatingChange?.(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const map = mapRef.current;
        if (!map || !window.AMap) {
          onLocatingChange?.(false);
          return;
        }

        const lng = position.coords.longitude;
        const lat = position.coords.latitude;
        const point: [number, number] = [lng, lat];
        onLocationResolved?.({ lng, lat });
        renderFocusMarker(point, "当前位置");
        onLocatingChange?.(false);
      },
      (error) => {
        focusFallbackLocation();
        const code = error?.code;
        const nextMessage =
          code === 1
            ? `未获得定位权限，地图已切换到默认位置：${SHANGHAI_GOVERNMENT_FALLBACK.name}。`
            : code === 2
              ? `无法获取当前位置，地图已切换到默认位置：${SHANGHAI_GOVERNMENT_FALLBACK.name}。`
              : code === 3
                ? `定位超时，地图已切换到默认位置：${SHANGHAI_GOVERNMENT_FALLBACK.name}。`
                : `定位失败，地图已切换到默认位置：${SHANGHAI_GOVERNMENT_FALLBACK.name}。`;
        setFallbackDialogMessage(nextMessage);
        onLocatingChange?.(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [locateRequestKey, mapReady, onLocationResolved, onLocatingChange, themePreset.markerVariant]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!mapFocusRequestKey || mapFocusRequestKey === lastMapFocusRequestRef.current) return;
    if (!mapFocusLocation) return;

    const nextPoint: [number, number] = [mapFocusLocation.lng, mapFocusLocation.lat];
    if (!Number.isFinite(nextPoint[0]) || !Number.isFinite(nextPoint[1])) {
      return;
    }

    lastMapFocusRequestRef.current = mapFocusRequestKey;
    setSelectedLocationId(mapFocusLocation.id);
    renderFocusMarker(nextPoint, mapFocusLocation.name);
  }, [mapFocusLocation, mapFocusRequestKey, mapReady, themePreset.markerVariant]);

  const handleRefresh = async (): Promise<void> => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const config = getAMapConfig();
  const missingKey = !config.key;
  const showBlockingOverlay = missingKey || Boolean(mapError) || !mapReady;
  const totalCountLoading = mapSummary.totalCountLoading ?? (loading && mapSummary.totalLocationCount === 0 && mapIndexPoints.length === 0);
  const summaryVisibleCount = mapSummary.totalLocationCount > 0 || totalCountLoading ? mapSummary.visibleLocationCount : visibleLocationCount;
  const summaryTotalCount = mapSummary.totalLocationCount;
  const summaryVisibleLabel = loading && summaryVisibleCount === 0 ? "正在加载" : String(summaryVisibleCount);
  const summaryTotalLabel = totalCountLoading ? "正在加载" : String(summaryTotalCount);
  const showLoadingHint = loading || totalCountLoading;
  const overlayTitle = missingKey
    ? "AMap key 未配置"
    : mapError
      ? "AMap 加载失败"
      : showLoadingHint
        ? "地图正在加载"
        : "正在加载 AMap";
  const overlayDescription = missingKey
    ? "请在 .env 中添加 VITE_AMAP_KEY；如果启用了安全密钥，再补 VITE_AMAP_SECURITY_JS_CODE。"
      : mapError
        ? mapError
      : showLoadingHint
        ? "正在优先加载当前位置附近地点，完整数据稍后补齐。"
        : "地图 SDK 初始化中，请稍候。";

  return (
    <div
      className={`relative h-full min-h-0 w-full overflow-hidden rounded-[28px] border bg-[#F8FAFC] ${
        mapTheme === "apple"
          ? "border-white/70 shadow-[0_20px_50px_-18px_rgba(15,23,42,0.28)]"
          : "border-[var(--border)]"
      }`}
    >
      <div ref={containerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-start gap-2 p-4">
        <div className="pointer-events-auto ui-hover-shadow flex h-10 items-center justify-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)]">
          {loading && summaryTotalLabel === "正在加载" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          <span>
            视野内 {summaryVisibleLabel} / 总计 {summaryTotalLabel}
          </span>
        </div>

        <button
          className="pointer-events-auto ui-hover-shadow flex h-10 items-center justify-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-60"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "刷新中..." : "刷新"}</span>
        </button>
      </div>

      {showBlockingOverlay ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/72 backdrop-blur-[2px]">
          <div className="pointer-events-auto max-w-[560px] rounded-[24px] border border-[var(--border)] bg-white px-6 py-5 text-center shadow-[0_18px_50px_-18px_rgba(15,23,42,0.28)]">
            {loading && !missingKey && !mapError ? (
              <RefreshCw className="mx-auto h-10 w-10 animate-spin text-[var(--muted-foreground)]" />
            ) : (
              <MapPinned className="mx-auto h-10 w-10 text-[var(--muted-foreground)]" />
            )}
            <h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">
              {overlayTitle}
            </h3>
            <p className="mt-2 text-sm leading-[1.5] text-[var(--muted-foreground)]">
              {overlayDescription}
            </p>
            {loading && !missingKey && !mapError ? (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                底图会先显示，地点数据随后补齐
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <Dialog onOpenChange={(open) => {
        if (!open) {
          setFallbackDialogMessage(null);
        }
      }} open={Boolean(fallbackDialogMessage)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>已切换到默认位置</DialogTitle>
            <DialogDescription>{fallbackDialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setFallbackDialogMessage(null)} type="button">
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
