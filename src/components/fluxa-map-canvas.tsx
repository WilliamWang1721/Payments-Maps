import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListFilter,
  Mail,
  MapPin,
  Sparkles,
  SquarePen,
  Trash2,
  UserRound
} from "lucide-react";

import { FluxaAmapView, type MapViewportSnapshot } from "@/components/fluxa-amap-view";
import { useFluxaBrandCatalog } from "@/hooks/use-fluxa-brand-catalog";
import { useBrowsingHistory } from "@/hooks/use-browsing-history";
import { useFluxaListLocations } from "@/hooks/use-fluxa-list-locations";
import type { MapPartitionSummary } from "@/hooks/use-fluxa-map-partitions";
import { buildBrandInitials, buildBrandPreviewImage } from "@/lib/brand-visuals";
import { filterLocationsBySearch, normalizeLocationSearchQuery } from "@/lib/location-search";
import type { MapThemeKey } from "@/lib/map-theme";
import type { LocationCounts, LocationMapIndexRecord, LocationSearchRecord } from "@/services/location-service";
import type { UpdateViewerProfileInput, ViewerProfileRecord } from "@/services/viewer-profile-service";
import type { SidebarTab } from "@/components/fluxa-sidebar";
import { useI18n } from "@/i18n";
import type { BrandRecord, BrandSegment } from "@/types/brand";
import type { LocationRecord } from "@/types/location";

type BrandCategoryLabel = "Coffee" | "Fast Food" | "Retail" | "Convenience";

interface BrandMerchantCard {
  id: string;
  brand: string;
  category: string;
  segment: BrandCategoryLabel;
  color?: string;
  coverage: string;
  description: string;
  imageUrl?: string;
  issues: string;
  owner: string;
}

type ProfileFieldKey = "name" | "email" | "location" | "joined";

const PROFILE_FIELD_ORDER: Array<{ key: ProfileFieldKey; label: string; editable: boolean }> = [
  { key: "name", label: "Name", editable: true },
  { key: "email", label: "Email", editable: false },
  { key: "location", label: "Location", editable: true },
  { key: "joined", label: "Joined", editable: false }
];

const EMPTY_PROFILE_FORM: UpdateViewerProfileInput & { email: string; joined: string } = {
  name: "",
  email: "",
  location: "",
  joined: "",
  bio: ""
};

function buildProfileInitials(name: string, email: string): string {
  const normalizedName = name.trim();
  if (normalizedName) {
    const parts = normalizedName.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = parts.map((part) => part[0]?.toUpperCase() || "").join("");
    if (initials) {
      return initials;
    }
  }

  const normalizedEmail = email.trim();
  return (normalizedEmail[0] || "?").toUpperCase();
}

function calculateProfileCompletion(profile: UpdateViewerProfileInput & { email: string; joined: string }): number {
  const fields = [profile.name, profile.email, profile.location, profile.joined, profile.bio];
  const completedCount = fields.filter((value) => value.trim().length > 0).length;
  return Math.round((completedCount / fields.length) * 100);
}

interface HistoryVisit {
  id: string;
  locationId: string;
  title: string;
  meta: string;
  time: string;
  visitedAt: string;
}

interface CurrentPosition {
  lat: number;
  lng: number;
}

const BRAND_CARD_HEIGHT = 184;
const LIST_CARD_HEIGHT = 144;
const LIST_CARD_GAP = 10;
const LIST_CARD_MIN_WIDTH = 340;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(from: CurrentPosition, to: CurrentPosition): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.max(1, Math.round(distanceKm * 1000))} m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }

  return `${distanceKm.toFixed(0)} km`;
}

function statusClass(status: LocationRecord["status"]): string {
  return status === "active"
    ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
    : "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]";
}

function statusLabel(status: LocationRecord["status"]): string {
  return status === "active" ? "Active" : "Inactive";
}

function formatRelativeTime(value: string, t: (text: string) => string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return t("recently");
  }

  const deltaMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (deltaMinutes < 60) {
    return `${deltaMinutes}${t("m ago")}`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}${t("h ago")}`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}${t("d ago")}`;
}

function formatExactDate(value: string, locale: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(timestamp);
}

function isSameLocalDay(value: string, reference = new Date()): boolean {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return false;
  }

  return (
    timestamp.getFullYear() === reference.getFullYear() &&
    timestamp.getMonth() === reference.getMonth() &&
    timestamp.getDate() === reference.getDate()
  );
}

function formatHourRange(hour: number): string {
  const startHour = Math.max(0, Math.min(23, hour));
  const endHour = (startHour + 1) % 24;

  return `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
}

function normalizeNetworkLabel(network: string): string {
  const normalized = network.trim().toLowerCase();

  if (normalized.includes("visa")) {
    return "Visa";
  }
  if (normalized.includes("master")) {
    return "MasterCard";
  }
  if (normalized.includes("amex") || normalized.includes("american express")) {
    return "Amex";
  }
  if (normalized.includes("discover")) {
    return "Discover";
  }
  if (normalized.includes("union") || normalized.includes("银联")) {
    return "UnionPay";
  }
  if (normalized.includes("jcb")) {
    return "JCB";
  }
  if (normalized.includes("diners")) {
    return "Diners";
  }

  return network.trim();
}

function inferSupportedNetworks(location: LocationRecord): string {
  const realNetworks = (location.supportedNetworks || []).map(normalizeNetworkLabel).filter(Boolean);

  if (realNetworks.length > 0) {
    return Array.from(new Set(realNetworks)).join(", ");
  }

  const normalizedBrand = location.brand.trim().toLowerCase();
  const fallback = normalizeNetworkLabel(normalizedBrand);
  if (fallback) {
    return fallback;
  }

  return "Unknown";
}

function inferSuccessRate(location: LocationRecord): string | null {
  if (typeof location.successRate === "number" && Number.isFinite(location.successRate)) {
    return `${location.successRate.toFixed(1)}%`;
  }

  return null;
}

function mapBrandRecordToCard(brand: BrandRecord, t: (text: string) => string): BrandMerchantCard {
  const activeRatio = brand.storeCount > 0 ? Math.round((brand.activeStoreCount / brand.storeCount) * 100) : 0;
  const lastSyncSource = brand.lastSyncAt || brand.updatedAt;
  const preview = buildBrandPreviewImage(brand.iconUrl || brand.logo, brand.website);

  return {
    id: brand.id,
    brand: brand.name,
    category: brand.uiCategoryLabel,
    color: brand.color,
    segment: brand.uiSegment,
    coverage: `${t("Coverage")} ${brand.storeCount} ${t("stores")} · ${activeRatio}% ${t("active")}`,
    description: brand.description || brand.notes || `${t("Primary city")}: ${brand.primaryCity || t("Unknown")}`,
    imageUrl: preview.imageUrl || undefined,
    issues: `${t("Issue stores")} ${brand.inactiveStoreCount} · ${t("Last sync")} ${formatRelativeTime(lastSyncSource, t)}`,
    owner: `${t("Primary city")}: ${brand.primaryCity || t("Unknown")}`
  };
}

function resolveBrandAvatarTone(card: BrandMerchantCard): string {
  if (card.color?.trim()) {
    return card.color.trim();
  }

  if (card.segment === "Coffee") return "#B76E4B";
  if (card.segment === "Fast Food") return "#E45F2B";
  if (card.segment === "Convenience") return "#0F8B8D";
  return "#5749F4";
}

function BrandAvatar({ card }: { card: BrandMerchantCard }): React.JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = buildBrandInitials(card.brand);
  const tone = resolveBrandAvatarTone(card);

  useEffect(() => {
    setImageFailed(false);
  }, [card.imageUrl]);

  return (
    <span
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/70 bg-white shadow-[0_10px_24px_-20px_rgba(15,23,42,0.55)]"
      style={{ boxShadow: `0 10px 24px -20px ${tone}` }}
    >
      {card.imageUrl && !imageFailed ? (
        <img
          alt={card.brand}
          className="h-full w-full object-contain p-2"
          decoding="async"
          loading="lazy"
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
          src={card.imageUrl}
        />
      ) : (
        <span className="inline-flex h-full w-full items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: tone }}>
          {initials}
        </span>
      )}
    </span>
  );
}

function EmptyState({ message }: { message: string }): React.JSX.Element {
  const { t } = useI18n();

  return (
    <article className="flex min-h-[220px] items-center justify-center rounded-m border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-8 text-center text-sm text-[var(--muted-foreground)]">
      {t(message)}
    </article>
  );
}

interface FluxaMapCanvasProps {
  activeTab: SidebarTab;
  brandCategory?: BrandSegment;
  brandDraftCount?: number;
  brandPagingMode?: "paged" | "scroll";
  brandSort?: "updated" | "name";
  listCounts?: LocationCounts | null;
  listDirectoryLocations?: LocationRecord[];
  locations: LocationRecord[];
  loading?: boolean;
  error?: string | null;
  listPagingMode?: "paged" | "scroll";
  listSort?: "distance" | "updated";
  onRefresh?: () => Promise<void> | void;
  onOpenBrandDetail?: (brand: BrandRecord) => void;
  onOpenDetail?: (location: LocationRecord) => void;
  mapTheme: MapThemeKey;
  locateRequestKey?: number;
  mapFocusLocation?: LocationRecord | null;
  mapFocusRequestKey?: number;
  mapIndexPoints?: LocationMapIndexRecord[];
  locationSearchDirectory?: LocationSearchRecord[];
  mapSummary?: MapPartitionSummary;
  onMapViewportChange?: (viewport: MapViewportSnapshot) => void;
  onLocatingChange?: (locating: boolean) => void;
  searchMatchedIds?: string[];
  searchQuery?: string;
  viewerProfile?: ViewerProfileRecord | null;
  viewerProfileError?: string | null;
  viewerProfileLoading?: boolean;
  viewerProfileSaving?: boolean;
  onSaveViewerProfile?: (input: UpdateViewerProfileInput) => Promise<void>;
}

export function FluxaMapCanvas({
  activeTab,
  brandCategory = "Coffee",
  brandDraftCount = 0,
  brandPagingMode = "scroll",
  brandSort = "updated",
  listCounts = null,
  listDirectoryLocations = [],
  locations,
  loading = false,
  error = null,
  listPagingMode = "paged",
  listSort = "distance",
  onRefresh,
  onOpenBrandDetail,
  onOpenDetail,
  mapTheme,
  locateRequestKey = 0,
  mapFocusLocation = null,
  mapFocusRequestKey = 0,
  mapIndexPoints = [],
  locationSearchDirectory = [],
  mapSummary = {
    visibleLocationCount: 0,
    totalLocationCount: 0,
    visiblePartitionCount: 0,
    totalPartitionCount: 0
  },
  onMapViewportChange,
  onLocatingChange,
  searchMatchedIds = [],
  searchQuery = "",
  viewerProfile = null,
  viewerProfileError = null,
  viewerProfileLoading = false,
  viewerProfileSaving = false,
  onSaveViewerProfile
}: FluxaMapCanvasProps): React.JSX.Element {
  const { t } = useI18n();
  const [historyFilter, setHistoryFilter] = useState<"all" | "today">("all");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [quickAccessTarget, setQuickAccessTarget] = useState<string | null>(null);
  const [brandPage, setBrandPage] = useState(1);
  const [brandItemsPerViewport, setBrandItemsPerViewport] = useState(6);
  const [listPage, setListPage] = useState(1);
  const [listColumnCount, setListColumnCount] = useState(1);
  const [listItemsPerViewport, setListItemsPerViewport] = useState(6);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const [searchFocusRequestKey, setSearchFocusRequestKey] = useState(0);
  const [cachedMapLocations, setCachedMapLocations] = useState<LocationRecord[]>([]);
  const brandViewportRef = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const listDistanceLocateRequestedRef = useRef(false);
  const {
    entries: historyEntries,
    loading: historyLoading,
    clearing: historyClearing,
    error: historyError,
    clearHistory
  } = useBrowsingHistory({
    enabled: activeTab === "history"
  });
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);
  const profileStats = viewerProfile?.stats || [];
  const profileQuickAccessItems = viewerProfile?.quickAccessItems || [];
  const profileRecentActivity = viewerProfile?.recentActivity || [];
  const activeQuickAccessLabel = profileQuickAccessItems.find((item) => item.id === quickAccessTarget)?.label || null;
  const profileInitials = useMemo(() => buildProfileInitials(profileForm.name, profileForm.email), [profileForm.email, profileForm.name]);
  const profileCompletion = useMemo(() => calculateProfileCompletion(profileForm), [profileForm]);
  const profileHeroMetrics = useMemo(
    () =>
      (profileStats.length > 0
        ? profileStats
        : [
            { label: "Added Locations", value: "0" },
            { label: "Reviews", value: "0" },
            { label: "Favorites", value: "0" }
          ]).slice(0, 3),
    [profileStats]
  );
  const latestProfileActivityTime = profileRecentActivity[0]?.time || (viewerProfileLoading ? t("Loading...") : t("No recent activity yet."));
  const fieldDescriptions: Record<ProfileFieldKey, string> = {
    name: "Public display name",
    email: "Primary workspace email",
    location: "Current city or region",
    joined: "First active date in the workspace"
  };

  const filteredLocations = useMemo(
    () => filterLocationsBySearch(locations, normalizedSearchQuery),
    [locations, normalizedSearchQuery]
  );
  const {
    locations: listPagedLocations,
    loading: listPagedLoading,
    error: listPagedError,
    totalCount: listTotalCount,
    activeCount: listActiveCount,
    inactiveCount: listInactiveCount,
    pageCount: listPagedPageCount,
    hasMore: listHasMore,
    loadMore: loadMoreListLocations
  } = useFluxaListLocations({
    counts: listCounts,
    currentPosition,
    directoryLocations: listDirectoryLocations,
    enabled: activeTab === "list",
    indexPoints: mapIndexPoints,
    listPagingMode,
    page: listPage,
    pageSize: Math.max(1, listItemsPerViewport),
    searchMatchedIds,
    searchQuery,
    sort: listSort
  });
  const {
    brands: visibleBrandRecords,
    loading: brandCatalogLoading,
    error: brandCatalogError,
    totalCount: brandTotalCount,
    pageCount: brandPageCount,
    hasMore: brandHasMore,
    loadMore: loadMoreBrands
  } = useFluxaBrandCatalog({
    enabled: activeTab === "brands",
    page: brandPage,
    pageSize: Math.max(1, brandItemsPerViewport),
    pagingMode: brandPagingMode,
    searchQuery,
    segment: brandCategory as BrandSegment,
    sort: brandSort
  });
  const mapLocations = activeTab === "map" ? filteredLocations : cachedMapLocations;
  const searchFocusLocation = activeTab === "map" && normalizedSearchQuery ? mapLocations[0] ?? null : null;
  const listSummaryTotalCount = activeTab === "list" ? listTotalCount : filteredLocations.length;
  const listSummaryActiveCount = activeTab === "list" ? listActiveCount : filteredLocations.filter((location) => location.status === "active").length;
  const listSummaryInactiveCount = activeTab === "list" ? listInactiveCount : filteredLocations.length - listSummaryActiveCount;

  const listRecords = useMemo(() => {
    const baseLocations = activeTab === "list" ? listPagedLocations : filteredLocations;

    return baseLocations.map((location) => {
      const distanceKm = currentPosition
        ? calculateDistanceKm(currentPosition, { lat: location.lat, lng: location.lng })
        : null;

      return {
        ...location,
        distanceKm,
        distanceMeta: distanceKm === null ? formatRelativeTime(location.updatedAt, t) : formatDistanceLabel(distanceKm),
        createdAtText: `${t("Added")}: ${formatExactDate(location.createdAt, "zh-CN")}`,
        capabilityMeta: `${t("Success Rate")} ${inferSuccessRate(location) || t("Unknown")} · ${t("Supported Networks")}: ${inferSupportedNetworks(location)}`,
        addedByText: `由 ${location.addedBy || "Unknown"} 添加`
      };
    });
  }, [activeTab, currentPosition, filteredLocations, listPagedLocations, t]);

  const visibleBrandCards = useMemo(
    () => visibleBrandRecords.map((brand) => mapBrandRecordToCard(brand, t)),
    [t, visibleBrandRecords]
  );

  const locationsById = useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

  const historyVisits = useMemo<HistoryVisit[]>(() => {
    const filteredEntries = historyEntries.filter((entry) => (historyFilter === "today" ? isSameLocalDay(entry.visitedAt) : true));

    return filteredEntries.map((entry) => {
      const metaParts = [entry.brand, entry.city, entry.address].filter(Boolean);

      return {
        id: entry.id,
        locationId: entry.locationId,
        title: entry.title,
        meta: metaParts.join(" · ") || "No address recorded.",
        time: formatRelativeTime(entry.visitedAt, t),
        visitedAt: entry.visitedAt
      };
    });
  }, [historyEntries, historyFilter, t]);

  const historyTodayCount = useMemo(() => historyEntries.filter((entry) => isSameLocalDay(entry.visitedAt)).length, [historyEntries]);

  const historyPeakHourLabel = useMemo(() => {
    if (historyEntries.length === 0) {
      return "N/A";
    }

    const countsByHour = historyEntries.reduce<Map<number, number>>((accumulator, entry) => {
      const timestamp = new Date(entry.visitedAt);
      if (Number.isNaN(timestamp.getTime())) {
        return accumulator;
      }

      const hour = timestamp.getHours();
      accumulator.set(hour, (accumulator.get(hour) || 0) + 1);
      return accumulator;
    }, new Map<number, number>());

    let bestHour = 0;
    let bestCount = -1;

    countsByHour.forEach((count, hour) => {
      if (count > bestCount) {
        bestHour = hour;
        bestCount = count;
      }
    });

    return formatHourRange(bestHour);
  }, [historyEntries]);

  const historyInsightItems = useMemo(() => {
    const uniquePlaceCount = new Set(historyEntries.map((entry) => entry.locationId)).size;
    const latestVisit = historyEntries[0]?.visitedAt;

    return [
      `Detail views: ${historyEntries.length}`,
      `Unique places: ${uniquePlaceCount}`,
      latestVisit ? `Latest visit: ${formatRelativeTime(latestVisit, t)}` : "Latest visit: N/A"
    ];
  }, [historyEntries, t]);

  const listItemsPerPage = Math.max(1, listItemsPerViewport);
  const listPageCount = activeTab === "list" ? listPagedPageCount : (listPagingMode === "paged" ? Math.max(1, Math.ceil(listRecords.length / listItemsPerPage)) : 1);
  const visibleListRecords = listRecords;
  const listStart = listSummaryTotalCount === 0 ? 0 : listPagingMode === "paged" ? (listPage - 1) * listItemsPerPage + 1 : 1;
  const listEnd = listStart === 0 ? 0 : Math.min(listSummaryTotalCount, listStart + visibleListRecords.length - 1);
  const brandItemsPerPage = Math.max(1, brandItemsPerViewport);
  const brandStart = brandTotalCount === 0 ? 0 : brandPagingMode === "paged" ? (brandPage - 1) * brandItemsPerPage + 1 : 1;
  const brandEnd = brandStart === 0 ? 0 : Math.min(brandTotalCount, brandStart + visibleBrandCards.length - 1);

  useEffect(() => {
    if (activeTab === "map") {
      setCachedMapLocations(filteredLocations);
    }
  }, [activeTab, filteredLocations]);

  useEffect(() => {
    setBrandPage(1);
  }, [brandCategory, brandPagingMode, brandSort, searchQuery]);

  useEffect(() => {
    if (brandPage > brandPageCount) {
      setBrandPage(brandPageCount);
    }
  }, [brandPage, brandPageCount]);

  useEffect(() => {
    if (listPage > listPageCount) {
      setListPage(listPageCount);
    }
  }, [listPage, listPageCount]);

  useEffect(() => {
    setListPage(1);
  }, [currentPosition, listPagingMode, listSort, normalizedSearchQuery]);

  useEffect(() => {
    if (activeTab !== "map" || !searchFocusLocation) {
      return;
    }

    setSearchFocusRequestKey((prev) => prev + 1);
  }, [activeTab, searchFocusLocation?.id]);

  useEffect(() => {
    if (activeTab !== "list" || listSort !== "distance" || currentPosition) {
      listDistanceLocateRequestedRef.current = false;
      return;
    }

    if (listDistanceLocateRequestedRef.current) {
      return;
    }

    listDistanceLocateRequestedRef.current = true;
    onLocatingChange?.(true);

    if (!navigator.geolocation) {
      onLocatingChange?.(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lng: position.coords.longitude,
          lat: position.coords.latitude
        });
        onLocatingChange?.(false);
      },
      () => {
        onLocatingChange?.(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [activeTab, currentPosition, listSort, onLocatingChange]);

  useEffect(() => {
    if (activeTab !== "brands") {
      return;
    }

    const viewport = brandViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateBrandCapacity = () => {
      const height = viewport.clientHeight;
      const rows = Math.max(1, Math.floor((height + LIST_CARD_GAP) / (BRAND_CARD_HEIGHT + LIST_CARD_GAP)));
      setBrandItemsPerViewport((current) => (current === rows ? current : rows));
    };

    updateBrandCapacity();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(updateBrandCapacity);
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "list") {
      return;
    }

    const viewport = listViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateListCapacity = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const columns = Math.max(1, Math.min(2, Math.floor((width + LIST_CARD_GAP) / (LIST_CARD_MIN_WIDTH + LIST_CARD_GAP))));
      const rows = Math.max(1, Math.floor((height + LIST_CARD_GAP) / (LIST_CARD_HEIGHT + LIST_CARD_GAP)));
      const nextItemsPerViewport = Math.max(columns, rows * columns);

      setListColumnCount((current) => (current === columns ? current : columns));
      setListItemsPerViewport((current) => (current === nextItemsPerViewport ? current : nextItemsPerViewport));
    };

    updateListCapacity();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(updateListCapacity);
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, [activeTab]);

  useEffect(() => {
    if (!viewerProfile) {
      return;
    }

    setProfileForm({
      name: viewerProfile.name,
      email: viewerProfile.email,
      location: viewerProfile.location,
      joined: viewerProfile.joined,
      bio: viewerProfile.bio
    });
  }, [viewerProfile]);

  const handleProfileFieldChange = (field: ProfileFieldKey, value: string): void => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileCancel = (): void => {
    if (viewerProfile) {
      setProfileForm({
        name: viewerProfile.name,
        email: viewerProfile.email,
        location: viewerProfile.location,
        joined: viewerProfile.joined,
        bio: viewerProfile.bio
      });
    }

    setProfileEditing(false);
  };

  const handleProfileAction = async (): Promise<void> => {
    if (!profileEditing) {
      setProfileEditing(true);
      return;
    }

    if (!onSaveViewerProfile) {
      setProfileEditing(false);
      return;
    }

    try {
      await onSaveViewerProfile({
        name: profileForm.name,
        location: profileForm.location,
        bio: profileForm.bio
      });
      setProfileEditing(false);
    } catch (error) {
      console.error("Failed to save viewer profile.", error);
    }
  };

  const effectiveError = activeTab === "list" ? listPagedError || error : activeTab === "brands" ? brandCatalogError || error : error;
  const effectiveLoading = activeTab === "list" ? loading || listPagedLoading : activeTab === "brands" ? loading || brandCatalogLoading : loading;
  const dataBanner = effectiveError ? (
    <div className="rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{t(effectiveError)}</div>
  ) : null;

  const mapPanel = (
    <section
      aria-hidden={activeTab !== "map"}
      className={
        activeTab === "map"
          ? "flex h-full w-full min-w-0 flex-col gap-3"
          : "pointer-events-none absolute inset-0 flex min-h-0 w-full flex-col gap-3 opacity-0"
      }
    >
      {dataBanner}
      <div className="min-h-0 flex-1">
        <FluxaAmapView
          active={activeTab === "map"}
          loading={loading}
          locateRequestKey={locateRequestKey}
          locations={mapLocations}
          mapFocusLocation={searchFocusLocation ?? mapFocusLocation}
          mapFocusRequestKey={searchFocusLocation ? searchFocusRequestKey : mapFocusRequestKey}
          mapIndexPoints={mapIndexPoints}
          locationSearchDirectory={locationSearchDirectory}
          mapSummary={mapSummary}
          mapTheme={mapTheme}
          onLocatingChange={onLocatingChange}
          onLocationResolved={setCurrentPosition}
          onOpenDetail={onOpenDetail}
          onRefresh={onRefresh}
          onViewportChange={onMapViewportChange}
        />
      </div>
    </section>
  );

  if (activeTab === "history") {
    return (
      <div className="relative flex h-full w-full min-w-0 flex-1">
        {mapPanel}
        <section className="flex h-full w-full min-w-0 flex-col gap-2.5 bg-[var(--background)] px-4 py-4 sm:px-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-[32px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Browsing History")}</h1>
            <p className="text-sm leading-[1.4] text-[var(--muted-foreground)]">{t("Recently visited pages and search history")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={`ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium leading-[1.4286] transition-colors duration-200 ${
                historyFilter === "all"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                  : "border border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              }`}
              onClick={() => setHistoryFilter("all")}
              type="button"
            >
              <ListFilter className="h-4 w-4" />
              <span>{t("All")}</span>
            </button>
            <button
              className={`ui-hover-shadow inline-flex h-10 items-center rounded-pill border px-4 py-2 text-sm font-medium leading-[1.4286] ${
                historyFilter === "today"
                  ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
                  : "border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              }`}
              onClick={() => setHistoryFilter("today")}
              type="button"
            >
              {t("Today")}
            </button>
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
              disabled={historyClearing || historyLoading}
              onClick={() => {
                void clearHistory().catch(() => undefined);
              }}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              <span>{historyClearing ? t("Loading...") : t("Clear")}</span>
            </button>
          </div>
        </div>

        {historyError ? (
          <div className="rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{historyError}</div>
        ) : null}

        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 xl:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex w-full items-center justify-between gap-3">
              <h2 className="text-lg font-semibold leading-[1.3] text-[var(--foreground)]">{t("Recent Visits")}</h2>
              <span className="text-xs leading-[1.3] text-[var(--muted-foreground)]">{historyFilter === "today" ? t("Today") : t("All")}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
              {historyLoading ? (
                <EmptyState message="Loading browsing history..." />
              ) : null}
              {historyVisits.length > 0 ? (
                historyVisits.map((visit) => {
                  const matchedLocation = locationsById.get(visit.locationId);

                  return (
                    <button
                      className="ui-hover-shadow flex min-w-0 flex-col gap-1.5 rounded-m border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted)] disabled:cursor-default disabled:hover:border-[var(--border)] disabled:hover:bg-[var(--card)]"
                      disabled={!matchedLocation}
                      key={visit.id}
                      onClick={() => {
                        if (matchedLocation) {
                          onOpenDetail?.(matchedLocation);
                        }
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-sm font-medium leading-[1.3] text-[var(--foreground)]">{visit.title}</h3>
                        <span className="shrink-0 text-xs leading-[1.3] text-[var(--muted-foreground)]">{visit.time}</span>
                      </div>
                      <p className="truncate text-xs leading-[1.3] text-[var(--muted-foreground)]">{visit.meta}</p>
                    </button>
                  );
                })
              ) : !historyLoading ? (
                <EmptyState message="No history data. Click All or Today to reload." />
              ) : null}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2.5 xl:w-[320px]">
            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">{t("Visits Today")}</p>
              <p className="mt-1 text-4xl font-bold leading-[1.1] text-[var(--foreground)]">{historyTodayCount}</p>
              <p className="mt-1 text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">
                {historyEntries.length > 0 ? `Total ${historyEntries.length} visits` : t("No history data. Click All or Today to reload.")}
              </p>
            </article>

            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">{t("Peak Browsing Hour")}</p>
              <p className="mt-1 text-[22px] font-semibold leading-[1.2] text-[var(--foreground)]">{historyPeakHourLabel}</p>
            </article>

            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-semibold leading-[1.3] text-[var(--foreground)]">{t("History Insights")}</h3>
              <div className="mt-2 flex flex-col gap-1">
                {historyInsightItems.map((item) => (
                  <p className="text-[13px] leading-[1.4] text-[var(--muted-foreground)]" key={item}>
                    {item}
                  </p>
                ))}
              </div>
            </article>
          </div>
        </div>
        </section>
      </div>
    );
  }

  if (activeTab === "profile") {
    return (
      <div className="relative flex h-full w-full min-w-0 flex-1">
        {mapPanel}
        <section className="flex h-full w-full min-w-0 flex-col gap-3 rounded-m bg-[var(--background)] p-3 sm:p-4">
          <div className="min-h-0 flex-1 overflow-auto pr-1">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex w-full flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h1 className="text-[32px] font-semibold leading-[1.12] tracking-[-0.4px] text-[var(--foreground)]">{t("Profile")}</h1>
                  <p className="text-sm leading-[1.4] text-[var(--muted-foreground)]">{t("View your profile, activity, and contributions.")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {profileEditing ? (
                    <button
                      className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                      disabled={viewerProfileSaving}
                      onClick={handleProfileCancel}
                      type="button"
                    >
                      <span>{t("Cancel")}</span>
                    </button>
                  ) : null}
                  <button
                    className={`ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-sm font-medium leading-[1.4286] transition-colors duration-200 ${
                      profileEditing
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                        : "border border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    }`}
                    disabled={viewerProfileLoading || viewerProfileSaving}
                    onClick={() => {
                      void handleProfileAction();
                    }}
                    type="button"
                  >
                    {profileEditing ? <CheckCircle2 className="h-4 w-4" /> : <SquarePen className="h-4 w-4" />}
                    <span>{viewerProfileSaving ? t("Saving...") : profileEditing ? t("Save Profile") : t("Edit Profile")}</span>
                  </button>
                </div>
              </div>

              <article className="overflow-hidden rounded-[32px] border border-[rgba(87,73,244,0.14)] bg-[linear-gradient(135deg,#ffffff_0%,#f6f2ff_40%,#edf3ff_100%)] p-5 shadow-[0_28px_80px_-48px_rgba(87,73,244,0.42)] sm:p-6">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                    <div className="relative shrink-0">
                      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#5749f4_0%,#7f73ff_100%)] text-[26px] font-semibold tracking-[-0.04em] text-white shadow-[0_20px_44px_-26px_rgba(87,73,244,0.5)]">
                        {profileInitials}
                      </div>
                      <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-[#dff6d9] text-[#116b37]">
                        <BadgeCheck className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <div className="inline-flex h-8 items-center rounded-pill border border-[rgba(87,73,244,0.12)] bg-[rgba(255,255,255,0.82)] px-3 text-xs font-medium text-[var(--foreground)] shadow-[0_12px_28px_-22px_rgba(15,23,42,0.25)]">
                        {t("Workspace Member")}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)]">
                          {profileForm.name || (viewerProfileLoading ? t("Loading...") : t("Unknown User"))}
                        </h2>
                        <p className="mt-1 max-w-[720px] text-sm leading-[1.5] text-[var(--muted-foreground)]">
                          {profileForm.bio || t("Profile settings and visibility controls.")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:min-w-[220px]">
                    <div className="rounded-[22px] border border-[rgba(87,73,244,0.12)] bg-[rgba(255,255,255,0.78)] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{t("Completion")}</p>
                      <p className="mt-1 text-[24px] font-semibold leading-none text-[var(--foreground)]">{profileCompletion}%</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(87,73,244,0.12)] bg-[rgba(255,255,255,0.78)] px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{t("Latest update")}</p>
                      <p className="mt-1 text-sm font-semibold leading-[1.25] text-[var(--foreground)]">{latestProfileActivityTime}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="inline-flex h-10 items-center gap-2 rounded-pill border border-[rgba(148,163,184,0.18)] bg-[rgba(255,255,255,0.78)] px-4 text-sm text-[var(--foreground)]">
                    <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span className="truncate">{profileForm.email || (viewerProfileLoading ? t("Loading...") : "—")}</span>
                  </div>
                  <div className="inline-flex h-10 items-center gap-2 rounded-pill border border-[rgba(148,163,184,0.18)] bg-[rgba(255,255,255,0.78)] px-4 text-sm text-[var(--foreground)]">
                    <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span>{profileForm.location || (viewerProfileLoading ? t("Loading...") : t("Not set"))}</span>
                  </div>
                  <div className="inline-flex h-10 items-center gap-2 rounded-pill border border-[rgba(148,163,184,0.18)] bg-[rgba(255,255,255,0.78)] px-4 text-sm text-[var(--foreground)]">
                    <CalendarDays className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <span>{profileForm.joined || (viewerProfileLoading ? t("Loading...") : "—")}</span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {profileHeroMetrics.map((item, index) => {
                    const icon =
                      index === 0 ? (
                        <MapPin className="h-4 w-4 text-[var(--primary)]" />
                      ) : index === 1 ? (
                        <Activity className="h-4 w-4 text-[#2563eb]" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-[#0f766e]" />
                      );

                    return (
                      <div
                        className={`rounded-[24px] border px-4 py-4 ${
                          index === 0
                            ? "border-[rgba(87,73,244,0.12)] bg-[rgba(247,245,255,0.92)]"
                            : index === 1
                              ? "border-[rgba(37,99,235,0.12)] bg-[rgba(239,246,255,0.92)]"
                              : "border-[rgba(15,118,110,0.12)] bg-[rgba(240,253,250,0.92)]"
                        }`}
                        key={item.label}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{t(item.label)}</p>
                          <span className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.3)]">{icon}</span>
                        </div>
                        <p className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.04em] text-[var(--foreground)]">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              </article>

              {viewerProfileError ? (
                <div className="rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{viewerProfileError}</div>
              ) : null}

              <div className="grid min-h-0 w-full flex-1 gap-3 xl:grid-cols-[minmax(0,1.18fr)_360px]">
                <article className="flex min-h-0 min-w-0 flex-col rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] sm:p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold leading-[1.25] text-[var(--foreground)]">{t("Account Information")}</h2>
                      <p className="mt-1 text-sm leading-[1.45] text-[var(--muted-foreground)]">{t("Manage your public identity, workspace details, and contribution context in one place.")}</p>
                    </div>
                    <div className="inline-flex h-8 items-center rounded-pill border border-[var(--border)] bg-[var(--muted)] px-3 text-xs font-medium text-[var(--foreground)]">
                      {profileEditing ? t("Editing") : t("Read Only")}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {PROFILE_FIELD_ORDER.map((field) => {
                      const fieldValue = profileForm[field.key];
                      const icon =
                        field.key === "name" ? (
                          <UserRound className="h-4 w-4 text-[var(--primary)]" />
                        ) : field.key === "email" ? (
                          <Mail className="h-4 w-4 text-[#2563eb]" />
                        ) : field.key === "location" ? (
                          <MapPin className="h-4 w-4 text-[#0f766e]" />
                        ) : (
                          <CalendarDays className="h-4 w-4 text-[#ca8a04]" />
                        );

                      return (
                        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--accent)] p-4" key={field.key}>
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white shadow-[0_10px_22px_-20px_rgba(15,23,42,0.35)]">
                              {icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-[1.25] text-[var(--foreground)]">{t(field.label)}</p>
                              <p className="mt-1 text-xs leading-[1.4] text-[var(--muted-foreground)]">{t(fieldDescriptions[field.key])}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex min-h-[46px] items-center rounded-[18px] border border-[var(--border)] bg-white px-4">
                            {profileEditing && field.editable ? (
                              <input
                                className="w-full bg-transparent text-sm leading-[1.45] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                                onChange={(event) => handleProfileFieldChange(field.key, event.target.value)}
                                type="text"
                                value={fieldValue}
                              />
                            ) : (
                              <span className="truncate text-sm leading-[1.45] text-[var(--foreground)]">
                                {fieldValue || (viewerProfileLoading ? t("Loading...") : "—")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 rounded-[24px] border border-[var(--border)] bg-[var(--accent)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold leading-[1.25] text-[var(--foreground)]">{t("Bio & Introduction")}</h3>
                        <p className="mt-1 text-xs leading-[1.4] text-[var(--muted-foreground)]">{t("Changes are synced to your workspace account.")}</p>
                      </div>
                      <div className="inline-flex h-8 items-center rounded-pill bg-white px-3 text-xs font-medium text-[var(--muted-foreground)]">
                        {profileForm.bio.trim().length} / 240
                      </div>
                    </div>

                    {profileEditing ? (
                      <textarea
                        className="mt-4 min-h-[132px] w-full resize-none rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-[1.6] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                        onChange={(event) =>
                          setProfileForm((prev) => ({
                            ...prev,
                            bio: event.target.value
                          }))
                        }
                        placeholder={t("Profile settings and visibility controls.")}
                        rows={5}
                        value={profileForm.bio}
                      />
                    ) : (
                      <p className="mt-4 rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm leading-[1.6] text-[var(--foreground)]">
                        {profileForm.bio || (viewerProfileLoading ? t("Loading...") : t("No bio yet."))}
                      </p>
                    )}
                  </div>
                </article>

                <div className="flex min-h-0 w-full shrink-0 flex-col gap-3">
                  <article className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold leading-[1.25] text-[var(--foreground)]">{t("Quick Access")}</h2>
                        <p className="mt-1 text-sm leading-[1.45] text-[var(--muted-foreground)]">{t("Jump into your saved modules and activity buckets.")}</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--accent)] text-[var(--muted-foreground)]">
                        <ArrowUpRight className="h-4 w-4" />
                      </span>
                    </div>

                    {profileQuickAccessItems.length > 0 ? (
                      <div className="mt-5 flex flex-col gap-2.5">
                        {profileQuickAccessItems.map((item, index) => (
                          <button
                            className={`ui-hover-shadow flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition-colors duration-200 ${
                              quickAccessTarget === item.id
                                ? "border-[var(--primary)] bg-[rgba(87,73,244,0.08)]"
                                : "border-[var(--border)] bg-[var(--accent)] hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
                            }`}
                            key={item.id}
                            onClick={() => setQuickAccessTarget(item.id)}
                            type="button"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-11 w-11 items-center justify-center rounded-[16px] ${
                                  index === 0
                                    ? "bg-[rgba(87,73,244,0.12)] text-[var(--primary)]"
                                    : index === 1
                                      ? "bg-[rgba(37,99,235,0.12)] text-[#2563eb]"
                                      : "bg-[rgba(15,118,110,0.12)] text-[#0f766e]"
                                }`}
                              >
                                {index === 0 ? <Sparkles className="h-4 w-4" /> : index === 1 ? <Clock3 className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                              </span>
                              <div>
                                <p className="text-sm font-semibold leading-[1.25] text-[var(--foreground)]">{t(item.label)}</p>
                                <p className="mt-1 text-xs leading-[1.35] text-[var(--muted-foreground)]">{item.count} {t("items")}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold leading-none text-[var(--foreground)]">{item.count}</span>
                              <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <EmptyState message={viewerProfileLoading ? "Loading quick access..." : "No quick access data yet."} />
                      </div>
                    )}
                  </article>

                  <article className="flex min-h-[280px] flex-1 flex-col rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.34)] sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold leading-[1.25] text-[var(--foreground)]">{t("Recent Activity")}</h2>
                        <p className="mt-1 text-sm leading-[1.45] text-[var(--muted-foreground)]">{t("Timeline of your latest workspace actions.")}</p>
                      </div>
                      {activeQuickAccessLabel ? (
                        <span className="inline-flex h-8 items-center rounded-pill border border-[var(--border)] bg-[var(--accent)] px-3 text-xs font-medium text-[var(--foreground)]">
                          {t("Opened:")} {t(activeQuickAccessLabel)}
                        </span>
                      ) : null}
                    </div>

                    {profileRecentActivity.length > 0 ? (
                      <ul className="mt-5 flex flex-col gap-3">
                        {profileRecentActivity.map((item, index) => (
                          <li className="relative pl-6" key={item.id}>
                            {index < profileRecentActivity.length - 1 ? <span className="absolute left-[9px] top-7 h-[calc(100%-8px)] w-px bg-[var(--border)]" /> : null}
                            <span className="absolute left-0 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[rgba(87,73,244,0.18)] bg-[rgba(87,73,244,0.08)] text-[var(--primary)]">
                              <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                            </span>
                            <article className="rounded-[22px] border border-[var(--border)] bg-[var(--accent)] px-4 py-3.5">
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 text-sm font-semibold leading-[1.35] text-[var(--foreground)]">{item.title}</p>
                                <span className="shrink-0 text-xs leading-[1.35] text-[var(--muted-foreground)]">{item.time}</span>
                              </div>
                              <p className="mt-1.5 text-xs leading-[1.45] text-[var(--muted-foreground)]">{item.meta}</p>
                            </article>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-4">
                        <EmptyState message={viewerProfileLoading ? "Loading recent activity..." : "No recent activity yet."} />
                      </div>
                    )}
                  </article>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (activeTab === "map") {
    return <div className="relative flex h-full w-full min-w-0 flex-1">{mapPanel}</div>;
  }

  if (activeTab === "brands") {
    return (
      <div className="relative flex h-full w-full min-w-0 flex-1">
        {mapPanel}
        <section className="flex h-full w-full min-w-0 flex-col gap-[7px]">
        {dataBanner}
        {brandDraftCount > 0 ? (
          <div className="flex w-full">
            <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-info)] px-3 py-2 text-xs font-medium text-[var(--color-info-foreground)]">
              {brandDraftCount} {brandDraftCount > 1 ? t("Draft Brands") : t("Draft Brand")}
            </div>
          </div>
        ) : null}

        <div
          className={`min-h-0 flex-1 ${brandPagingMode === "scroll" ? "overflow-auto pr-1" : "overflow-hidden"}`}
          onScroll={(event) => {
            if (brandPagingMode !== "scroll" || !brandHasMore || brandCatalogLoading) {
              return;
            }

            const target = event.currentTarget;
            if (target.scrollHeight - target.scrollTop - target.clientHeight <= 120) {
              loadMoreBrands();
            }
          }}
          ref={brandViewportRef}
        >
          {visibleBrandCards.length === 0 ? (
            <EmptyState message={brandCatalogLoading ? "Loading brands..." : searchQuery.trim() ? "No matching brands found." : "No brand coverage yet for this category."} />
          ) : (
            <div className="grid grid-cols-1 content-start gap-2.5 lg:grid-cols-2">
              {visibleBrandCards.map((item) => {
                const targetBrand = visibleBrandRecords.find((brand) => brand.id === item.id);

                return (
                  <article
                    className="flex min-h-[184px] min-w-0 flex-col overflow-hidden rounded-m border border-[var(--border)] bg-[var(--card)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
                    key={item.id}
                  >
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-5 pt-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <BrandAvatar card={item} />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h3 className="truncate text-[18px] font-semibold leading-6 text-[var(--foreground)]">{item.brand}</h3>
                              <span className="inline-flex h-8 items-center rounded-pill bg-[var(--secondary)] px-3 text-sm font-medium text-[var(--secondary-foreground)]">
                                {t(item.category)}
                              </span>
                            </div>
                            <p className="mt-3 line-clamp-2 text-[14px] leading-[1.5] text-[var(--foreground)]">{t(item.description)}</p>
                            <div className="mt-3 flex flex-col gap-1.5">
                              <p className="truncate text-[13px] font-medium leading-[1.2] text-[var(--foreground)]">{t(item.coverage)}</p>
                              <p className="truncate text-[13px] leading-[1.2] text-[var(--muted-foreground)]">{t(item.issues)}</p>
                              <p className="truncate text-[13px] leading-[1.2] text-[var(--muted-foreground)]">{t(item.owner)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 self-start">
                          <button
                            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-m border border-[var(--input)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (targetBrand) {
                                onOpenBrandDetail?.(targetBrand);
                              }
                            }}
                            type="button"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                            <span>{t("Detail")}</span>
                          </button>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--accent)] px-5 py-4 text-xs leading-[1.2] text-[var(--muted-foreground)]">
                        <span className="truncate">{t(item.coverage)}</span>
                        <span className="truncate">{t(item.issues)}</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 pt-1">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center gap-4 whitespace-nowrap pr-1 text-[13px] font-normal text-[var(--muted-foreground)]">
              <p>
                显示第 {brandStart} 到 {brandEnd} 个品牌，共 {brandTotalCount} 个品牌
              </p>
              <p>
                {brandPagingMode === "paged"
                  ? `分页模式，共 ${brandPageCount} 页，当前每页显示 ${brandItemsPerPage} 个品牌`
                  : `连续滚动模式，滚动到下方时继续加载，当前已显示 ${visibleBrandCards.length} / ${brandTotalCount} 个品牌`}
              </p>
            </div>
          </div>
          {brandPagingMode === "paged" && brandPageCount > 1 ? (
            <div className="flex w-full items-center gap-2">
            <button
              className="ui-hover-shadow inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={brandPage === 1}
              onClick={() => setBrandPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>{t("Previous")}</span>
            </button>

            <div className="min-w-0 flex-1 overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2 px-1">
                {Array.from({ length: brandPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    className={`ui-hover-shadow inline-flex h-10 w-10 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border text-sm transition-colors duration-200 ${
                      brandPage === page
                        ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                        : "border-transparent text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    }`}
                    key={page}
                    onClick={() => setBrandPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="ui-hover-shadow inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={brandPage === brandPageCount}
              onClick={() => setBrandPage((prev) => Math.min(brandPageCount, prev + 1))}
              type="button"
            >
              <span>{t("Next")}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
            </div>
          ) : null}
        </div>
        </section>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full min-w-0 flex-1">
      {mapPanel}
      <section className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4">
      {dataBanner}
      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-info)] px-3 py-2 text-sm font-medium leading-[1.142857] text-[var(--color-info-foreground)]">
          {effectiveLoading ? t("Loading...") : `${listSummaryTotalCount} 所有`}
        </div>
        <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-success)] px-3 py-2 text-sm font-medium leading-[1.142857] text-[var(--color-success-foreground)]">
          {listSummaryActiveCount} 可用
        </div>
        <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-warning)] px-3 py-2 text-sm font-medium leading-[1.142857] text-[var(--color-warning-foreground)]">
          {listSummaryInactiveCount} 不可用
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 ${listPagingMode === "scroll" ? "overflow-auto pr-1" : "overflow-hidden"}`}
        onScroll={(event) => {
          if (listPagingMode !== "scroll" || !listHasMore || listPagedLoading) {
            return;
          }

          const target = event.currentTarget;
          if (target.scrollHeight - target.scrollTop - target.clientHeight <= 120) {
            loadMoreListLocations();
          }
        }}
        ref={listViewportRef}
      >
        {visibleListRecords.length === 0 ? (
          <EmptyState message={effectiveLoading ? "Loading locations..." : normalizedSearchQuery ? "No matching locations found." : "No locations saved yet."} />
        ) : (
          <div
            className="grid content-start gap-2.5"
            style={{ gridTemplateColumns: `repeat(${listColumnCount}, minmax(0, 1fr))`, gridAutoRows: `${LIST_CARD_HEIGHT}px` }}
          >
            {visibleListRecords.map((card) => (
              <article
                className="flex h-full min-w-0 flex-col rounded-m border border-[var(--border)] bg-[var(--card)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
                key={card.id}
              >
                <div className="flex items-start justify-between px-5 pt-[18px]">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold leading-6 text-[var(--foreground)]">{card.name}</h3>
                    <div className="mt-3 flex flex-col gap-0">
                      <p className="truncate text-[13px] font-normal leading-[1.2] text-[var(--muted-foreground)]">{card.capabilityMeta}</p>
                      <p className="truncate text-[13px] font-normal leading-[1.2] text-[var(--muted-foreground)]">{card.address}</p>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <span className={`inline-flex h-8 items-center justify-center rounded-pill px-3 py-2 text-sm font-medium leading-[1.142857] ${statusClass(card.status)}`}>
                      {t(statusLabel(card.status))}
                    </span>
                    <button
                      className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-m border border-[var(--input)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                      onClick={() => onOpenDetail?.(card)}
                      type="button"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      <span>{t("Detail")}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 px-5 pb-[18px] pt-3">
                  <div className="flex items-center justify-between gap-3 text-xs leading-[1.2] text-[var(--muted-foreground)]">
                    <span className="truncate">{card.distanceMeta} · {card.addedByText}</span>
                    <span className="shrink-0 text-right">{card.createdAtText}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 pt-1">
        <div className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-4 whitespace-nowrap pr-1 text-[13px] font-normal text-[var(--muted-foreground)]">
            <p>
              显示第 {listStart} 到 {listEnd} 个项目，共 {listSummaryTotalCount} 条记录
            </p>
            <p>
              {listPagingMode === "paged"
                ? `分页模式，共 ${listPageCount} 页，当前每页显示 ${listItemsPerPage} 个项目`
                : `连续滚动模式，滚动到下方时继续加载，当前已显示 ${visibleListRecords.length} / ${listSummaryTotalCount} 个项目`}
            </p>
          </div>
        </div>
        {listPagingMode === "paged" && listPageCount > 1 ? (
          <div className="flex w-full items-center gap-2">
            <button
              className="ui-hover-shadow inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={listPage === 1}
              onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>{t("Previous")}</span>
            </button>

            <div className="min-w-0 flex-1 overflow-x-auto pb-1">
              <div className="flex min-w-max items-center gap-2 px-1">
                {Array.from({ length: listPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    className={`ui-hover-shadow inline-flex h-10 w-10 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border text-sm transition-colors duration-200 ${
                      listPage === page
                        ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                        : "border-transparent text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    }`}
                    key={page}
                    onClick={() => setListPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="ui-hover-shadow inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={listPage === listPageCount}
              onClick={() => setListPage((prev) => Math.min(listPageCount, prev + 1))}
              type="button"
            >
              <span>{t("Next")}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
      </section>
    </div>
  );
}
