import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  MoreHorizontal,
  SquarePen,
  Trash2
} from "lucide-react";

import { FluxaAmapView } from "@/components/fluxa-amap-view";
import { filterLocationsBySearch, normalizeLocationSearchQuery } from "@/lib/location-search";
import type { MapThemeKey } from "@/lib/map-theme";
import type { UpdateViewerProfileInput, ViewerProfileRecord } from "@/services/viewer-profile-service";
import type { SidebarTab } from "@/components/fluxa-sidebar";
import { useI18n } from "@/i18n";
import type { BrandRecord } from "@/types/brand";
import type { LocationRecord } from "@/types/location";

type BrandCategoryLabel = "Coffee" | "Fast Food" | "Retail" | "Convenience";

interface BrandMerchantCard {
  id: string;
  brand: string;
  category: string;
  segment: BrandCategoryLabel;
  coverage: string;
  issues: string;
  owner: string;
  searchText: string;
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

interface HistoryVisit {
  title: string;
  meta: string;
  time: string;
}

interface CurrentPosition {
  lat: number;
  lng: number;
}

const HISTORY_VISITS: HistoryVisit[] = [
  {
    title: "Visited page: Starbucks Xujiahui",
    meta: "Keyword: coffee · AI · Drive-thru",
    time: "2 h 19 m ago"
  },
  {
    title: "Visited page: UNIQLO Nanjing West Rd",
    meta: "Keyword: apparel · 1 result",
    time: "8 h 14 m ago"
  },
  {
    title: "Visited page: Apple Store Pudong",
    meta: "5 views in session · detail view",
    time: "18 h 46 m ago"
  },
  {
    title: "Visited page: KFC Lujiazui",
    meta: "Keyword: crispy · filters: deals",
    time: "22 h 07 m ago"
  }
];

const HISTORY_TRAFFIC_SOURCES = ["Search: 14", "Recommendations: 6", "Saved items: 4"];
const BRAND_PAGE_SIZE = 6;
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

function getStableNumberSeed(value: string): number {
  return Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
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

function inferSuccessRate(location: LocationRecord): string {
  if (typeof location.successRate === "number" && Number.isFinite(location.successRate)) {
    return `${location.successRate.toFixed(1)}%`;
  }

  const seed = getStableNumberSeed(`${location.id}-${location.bin}-${location.brand}`);
  const baseRate = location.status === "active" ? 92 : 81;
  const decimal = seed % 10;
  const offset = (seed % 7) - 3;
  return `${Math.max(70, Math.min(99, baseRate + offset))}.${decimal}%`;
}

function inferBrandCategory(brand: string): BrandCategoryLabel {
  const normalized = brand.toLowerCase();
  if (normalized.includes("starbucks") || normalized.includes("coffee")) {
    return "Coffee";
  }
  if (normalized.includes("mcd") || normalized.includes("kfc") || normalized.includes("subway") || normalized.includes("burger")) {
    return "Fast Food";
  }
  if (normalized.includes("familymart") || normalized.includes("lawson") || normalized.includes("7-eleven")) {
    return "Convenience";
  }
  return "Retail";
}

function groupBrands(locations: LocationRecord[], t: (text: string) => string): BrandMerchantCard[] {
  const groups = new Map<string, LocationRecord[]>();

  locations.forEach((location) => {
    const key = location.brand || "Unknown";
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(location);
      return;
    }
    groups.set(key, [location]);
  });

  return Array.from(groups.entries()).map(([brand, items]) => {
    const activeCount = items.filter((item) => item.status === "active").length;
    const inactiveCount = items.length - activeCount;
    const category = inferBrandCategory(brand);
    const latestUpdate = items
      .map((item) => item.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

    return {
      id: brand.toLowerCase().replace(/\s+/g, "-"),
      brand,
      category:
        category === "Coffee"
          ? "Coffee & Beverage"
          : category === "Fast Food"
            ? "Quick Service"
            : category === "Convenience"
              ? "Convenience"
              : "Retail",
      segment: category,
      coverage: `${t("Coverage")} ${items.length} ${t("stores")} · ${Math.round((activeCount / items.length) * 100)}% ${t("active")}`,
      issues: `${t("Issue stores")} ${inactiveCount} · ${t("Last sync")} ${formatRelativeTime(latestUpdate, t)}`,
      owner: `${t("Primary city")}: ${items[0]?.city || t("Unknown")}`,
      searchText: [brand, category, items[0]?.city || "Unknown"].join(" ").toLowerCase()
    };
  });
}

function mapBrandRecordToCard(brand: BrandRecord, t: (text: string) => string): BrandMerchantCard {
  const activeRatio = brand.storeCount > 0 ? Math.round((brand.activeStoreCount / brand.storeCount) * 100) : 0;
  const lastSyncSource = brand.lastSyncAt || brand.updatedAt;

  return {
    id: brand.id,
    brand: brand.name,
    category: brand.uiCategoryLabel,
    segment: brand.uiSegment,
    coverage: `${t("Coverage")} ${brand.storeCount} ${t("stores")} · ${activeRatio}% ${t("active")}`,
    issues: `${t("Issue stores")} ${brand.inactiveStoreCount} · ${t("Last sync")} ${formatRelativeTime(lastSyncSource, t)}`,
    owner: `${t("Primary city")}: ${brand.primaryCity || t("Unknown")}`,
    searchText: [
      brand.name,
      brand.uiCategoryLabel,
      brand.primaryCity,
      brand.website || "",
      brand.description || "",
      brand.notes || ""
    ]
      .join(" ")
      .toLowerCase()
  };
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
  brands?: BrandRecord[];
  brandDraftCount?: number;
  locations: LocationRecord[];
  loading?: boolean;
  error?: string | null;
  listPagingMode?: "paged" | "scroll";
  listSort?: "distance" | "updated";
  onRefresh?: () => Promise<void> | void;
  onOpenDetail?: (location: LocationRecord) => void;
  mapTheme: MapThemeKey;
  locateRequestKey?: number;
  mapFocusLocation?: LocationRecord | null;
  mapFocusRequestKey?: number;
  onLocatingChange?: (locating: boolean) => void;
  searchQuery?: string;
  viewerProfile?: ViewerProfileRecord | null;
  viewerProfileError?: string | null;
  viewerProfileLoading?: boolean;
  viewerProfileSaving?: boolean;
  onSaveViewerProfile?: (input: UpdateViewerProfileInput) => Promise<void>;
}

export function FluxaMapCanvas({
  activeTab,
  brands = [],
  brandDraftCount = 0,
  locations,
  loading = false,
  error = null,
  listPagingMode = "paged",
  listSort = "distance",
  onRefresh,
  onOpenDetail,
  mapTheme,
  locateRequestKey = 0,
  mapFocusLocation = null,
  mapFocusRequestKey = 0,
  onLocatingChange,
  searchQuery = "",
  viewerProfile = null,
  viewerProfileError = null,
  viewerProfileLoading = false,
  viewerProfileSaving = false,
  onSaveViewerProfile
}: FluxaMapCanvasProps): React.JSX.Element {
  const { t } = useI18n();
  const [historyFilter, setHistoryFilter] = useState<"all" | "today">("all");
  const [historyCleared, setHistoryCleared] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [quickAccessTarget, setQuickAccessTarget] = useState<string | null>(null);
  const [brandCategory, setBrandCategory] = useState<BrandCategoryLabel>("Coffee");
  const [brandPage, setBrandPage] = useState(1);
  const [brandActionTarget, setBrandActionTarget] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [listColumnCount, setListColumnCount] = useState(1);
  const [listItemsPerViewport, setListItemsPerViewport] = useState(6);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const [searchFocusRequestKey, setSearchFocusRequestKey] = useState(0);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const listDistanceLocateRequestedRef = useRef(false);
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);
  const normalizedBrandSearchQuery = searchQuery.trim().toLowerCase();
  const profileStats = viewerProfile?.stats || [];
  const profileQuickAccessItems = viewerProfile?.quickAccessItems || [];
  const profileRecentActivity = viewerProfile?.recentActivity || [];
  const activeQuickAccessLabel = profileQuickAccessItems.find((item) => item.id === quickAccessTarget)?.label || null;

  const filteredLocations = useMemo(
    () => filterLocationsBySearch(locations, normalizedSearchQuery),
    [locations, normalizedSearchQuery]
  );
  const searchFocusLocation = activeTab === "map" && normalizedSearchQuery ? filteredLocations[0] ?? null : null;
  const activeCount = filteredLocations.filter((location) => location.status === "active").length;
  const inactiveCount = filteredLocations.length - activeCount;

  const listRecords = useMemo(() => {
    const enrichedRecords = filteredLocations.map((location) => {
      const distanceKm = currentPosition
        ? calculateDistanceKm(currentPosition, { lat: location.lat, lng: location.lng })
        : null;

      return {
        ...location,
        distanceKm,
        distanceMeta: distanceKm === null ? formatRelativeTime(location.updatedAt, t) : formatDistanceLabel(distanceKm),
        createdAtText: `${t("Added")}: ${formatExactDate(location.createdAt, "zh-CN")}`,
        capabilityMeta: `${t("Success Rate")} ${inferSuccessRate(location)} · ${t("Supported Networks")}: ${inferSupportedNetworks(location)}`,
        addedByText: `由 ${location.addedBy || "Unknown"} 添加`
      };
    });

    return enrichedRecords.sort((left, right) => {
      if (listSort === "distance") {
        if (left.distanceKm === null && right.distanceKm === null) {
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }
        if (left.distanceKm === null) {
          return 1;
        }
        if (right.distanceKm === null) {
          return -1;
        }
        return left.distanceKm - right.distanceKm;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [currentPosition, filteredLocations, listSort, t]);

  const brandCards = useMemo(
    () => (brands.length > 0 ? brands.map((brand) => mapBrandRecordToCard(brand, t)) : groupBrands(locations, t)),
    [brands, locations, t]
  );

  const historyVisits = useMemo<HistoryVisit[]>(() => {
    if (historyCleared) {
      return [];
    }
    if (historyFilter === "today") {
      return HISTORY_VISITS.slice(0, 2);
    }
    return HISTORY_VISITS;
  }, [historyCleared, historyFilter]);

  const filteredBrandCards = useMemo(() => {
    const cards = brandCards.filter((card) => (brandCategory === "Retail" ? card.segment === "Retail" : card.segment === brandCategory));

    if (!normalizedBrandSearchQuery) {
      return cards;
    }

    return cards.filter((card) => card.searchText.includes(normalizedBrandSearchQuery));
  }, [brandCards, brandCategory, normalizedBrandSearchQuery]);

  const brandPageCount = Math.max(1, Math.ceil(filteredBrandCards.length / BRAND_PAGE_SIZE));
  const pagedBrandCards = filteredBrandCards.slice((brandPage - 1) * BRAND_PAGE_SIZE, brandPage * BRAND_PAGE_SIZE);
  const listItemsPerPage = Math.max(1, listItemsPerViewport);
  const listPageCount = listPagingMode === "paged" ? Math.max(1, Math.ceil(listRecords.length / listItemsPerPage)) : 1;
  const visibleListRecords =
    listPagingMode === "paged" ? listRecords.slice((listPage - 1) * listItemsPerPage, listPage * listItemsPerPage) : listRecords;
  const listStart = listRecords.length === 0 ? 0 : listPagingMode === "paged" ? (listPage - 1) * listItemsPerPage + 1 : 1;
  const listEnd = listStart === 0 ? 0 : listStart + visibleListRecords.length - 1;

  useEffect(() => {
    setBrandPage(1);
  }, [brandCategory, normalizedBrandSearchQuery]);

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

  const dataBanner = error ? (
    <div className="rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{t(error)}</div>
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
          loading={loading}
          locateRequestKey={locateRequestKey}
          locations={filteredLocations}
          mapFocusLocation={searchFocusLocation ?? mapFocusLocation}
          mapFocusRequestKey={searchFocusLocation ? searchFocusRequestKey : mapFocusRequestKey}
          mapTheme={mapTheme}
          onLocatingChange={onLocatingChange}
          onLocationResolved={setCurrentPosition}
          onOpenDetail={onOpenDetail}
          onRefresh={onRefresh}
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
              onClick={() => {
                setHistoryFilter("all");
                setHistoryCleared(false);
              }}
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
              onClick={() => {
                setHistoryFilter("today");
                setHistoryCleared(false);
              }}
              type="button"
            >
              {t("Today")}
            </button>
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
              onClick={() => setHistoryCleared(true)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t("Clear")}</span>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 xl:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex w-full items-center justify-between gap-3">
              <h2 className="text-lg font-semibold leading-[1.3] text-[var(--foreground)]">{t("Recent Visits")}</h2>
              <span className="text-xs leading-[1.3] text-[var(--muted-foreground)]">{historyFilter === "today" ? t("Today") : t("Last 24 hours")}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
              {historyVisits.length > 0 ? (
                historyVisits.map((visit) => (
                  <article className="flex min-w-0 flex-col gap-1.5 rounded-m border border-[var(--border)] bg-[var(--card)] px-4 py-3.5" key={visit.title}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-sm font-medium leading-[1.3] text-[var(--foreground)]">{t(visit.title)}</h3>
                      <span className="shrink-0 text-xs leading-[1.3] text-[var(--muted-foreground)]">{visit.time}</span>
                    </div>
                    <p className="truncate text-xs leading-[1.3] text-[var(--muted-foreground)]">{t(visit.meta)}</p>
                  </article>
                ))
              ) : (
                <EmptyState message="No history data. Click All or Today to reload." />
              )}
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2.5 xl:w-[320px]">
            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">{t("Visits Today")}</p>
              <p className="mt-1 text-4xl font-bold leading-[1.1] text-[var(--foreground)]">{historyVisits.length}</p>
              <p className="mt-1 text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">{historyCleared ? t("History cleared") : `+12% ${t("vs yesterday")}`}</p>
            </article>

            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">{t("Peak Browsing Hour")}</p>
              <p className="mt-1 text-[22px] font-semibold leading-[1.2] text-[var(--foreground)]">20:00 - 21:00</p>
            </article>

            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-semibold leading-[1.3] text-[var(--foreground)]">{t("Traffic Sources")}</h3>
              <div className="mt-2 flex flex-col gap-1">
                {HISTORY_TRAFFIC_SOURCES.map((item) => (
                  <p className="text-[13px] leading-[1.4] text-[var(--muted-foreground)]" key={item}>
                    {t(item)}
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
        <section className="flex h-full w-full min-w-0 flex-col gap-2 rounded-m bg-[var(--background)] p-3 sm:p-4">
        <div className="flex w-full flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-2xl font-semibold leading-[1.3] text-[var(--foreground)]">{t("Profile")}</h1>
            <p className="text-[13px] leading-[1.4286] text-[var(--muted-foreground)]">{t("View your profile, activity, and contributions.")}</p>
          </div>
          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            disabled={viewerProfileLoading || viewerProfileSaving}
            onClick={() => {
              void handleProfileAction();
            }}
            type="button"
          >
            <SquarePen className="h-4 w-4" />
            <span>{viewerProfileSaving ? t("Saving...") : profileEditing ? t("Save Profile") : t("Edit Profile")}</span>
          </button>
        </div>

        {viewerProfileError ? (
          <div className="rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{viewerProfileError}</div>
        ) : null}

        <div className="flex min-h-0 w-full flex-1 flex-col gap-2.5 xl:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
            <article className="flex min-h-[320px] min-w-0 flex-col gap-3 rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="text-sm font-semibold leading-[1.4286] text-[var(--foreground)]">{t("Account Information")}</h2>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {PROFILE_FIELD_ORDER.map((field) => {
                  const fieldValue = profileForm[field.key];

                  return (
                  <div className="flex min-w-0 flex-col gap-1" key={field.key}>
                    <span className="text-xs leading-[1.2] text-[var(--muted-foreground)]">{t(field.label)}</span>
                    <div className="inline-flex min-h-9 items-center rounded-pill bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)]">
                      {profileEditing && field.editable ? (
                        <input
                          className="w-full bg-transparent outline-none"
                          onChange={(event) => handleProfileFieldChange(field.key, event.target.value)}
                          type="text"
                          value={fieldValue}
                        />
                      ) : (
                        <span className="truncate">{fieldValue || (viewerProfileLoading ? t("Loading...") : "—")}</span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs leading-[1.2] text-[var(--muted-foreground)]">{t("Bio")}</span>
                {profileEditing ? (
                  <textarea
                    className="min-h-[72px] rounded-m bg-[var(--muted)] px-3 py-2 text-sm leading-[1.4286] text-[var(--foreground)] outline-none"
                    onChange={(event) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        bio: event.target.value
                      }))
                    }
                    rows={3}
                    value={profileForm.bio}
                  />
                ) : (
                  <p className="rounded-m bg-[var(--muted)] px-3 py-2 text-sm leading-[1.4286] text-[var(--foreground)]">
                    {profileForm.bio || (viewerProfileLoading ? t("Loading...") : t("No bio yet."))}
                  </p>
                )}
              </div>
            </article>

            <article className="flex min-h-[320px] min-w-0 flex-col gap-3 rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="text-sm font-semibold leading-[1.4286] text-[var(--foreground)]">{t("Your Stats")}</h2>
              {profileStats.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {profileStats.map((item) => (
                    <div className="rounded-m bg-[var(--muted)] p-3" key={item.label}>
                      <p className="text-[28px] font-semibold leading-[1.15] text-[var(--foreground)]">{item.value}</p>
                      <p className="mt-1 text-xs leading-[1.2] text-[var(--muted-foreground)]">{t(item.label)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message={viewerProfileLoading ? "Loading profile stats..." : "No profile stats yet."} />
              )}
            </article>
          </div>

          <div className="flex min-h-0 w-full shrink-0 flex-col gap-2.5 xl:w-[340px]">
            <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="text-sm font-semibold leading-[1.4286] text-[var(--foreground)]">{t("Quick Access")}</h2>
              {profileQuickAccessItems.length > 0 ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  {profileQuickAccessItems.map((item) => (
                    <button
                      className={`ui-hover-shadow inline-flex h-9 w-full items-center justify-between rounded-pill px-3 py-2 text-sm font-medium leading-[1.4286] transition-colors duration-200 ${
                        quickAccessTarget === item.id
                          ? "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
                          : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]"
                      }`}
                      key={item.id}
                      onClick={() => setQuickAccessTarget(item.id)}
                      type="button"
                    >
                      <span>{t(item.label)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted-foreground)]">{item.count}</span>
                        <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-2">
                  <EmptyState message={viewerProfileLoading ? "Loading quick access..." : "No quick access data yet."} />
                </div>
              )}
            </article>

            <article className="flex min-h-[170px] flex-1 flex-col rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
              <h2 className="text-sm font-semibold leading-[1.4286] text-[var(--foreground)]">{t("Recent Activity")}</h2>
              {activeQuickAccessLabel ? <p className="mt-2 text-xs leading-[1.2] text-[var(--muted-foreground)]">{t("Opened:")} {t(activeQuickAccessLabel)}</p> : null}
              {profileRecentActivity.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-2">
                  {profileRecentActivity.map((item) => (
                    <li className="rounded-m bg-[var(--muted)] px-3 py-2" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate text-xs font-medium leading-[1.35] text-[var(--foreground)]">{item.title}</span>
                        <span className="shrink-0 text-[11px] leading-[1.2] text-[var(--muted-foreground)]">{item.time}</span>
                      </div>
                      <p className="mt-1 text-xs leading-[1.35] text-[var(--muted-foreground)]">{item.meta}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2">
                  <EmptyState message={viewerProfileLoading ? "Loading recent activity..." : "No recent activity yet."} />
                </div>
              )}
            </article>
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
    const categoryTabs: BrandCategoryLabel[] = ["Coffee", "Fast Food", "Retail", "Convenience"];

    return (
      <div className="relative flex h-full w-full min-w-0 flex-1">
        {mapPanel}
        <section className="flex h-full w-full min-w-0 flex-col gap-[7px]">
        {dataBanner}
        <div className="flex w-full flex-wrap items-center gap-2">
          {categoryTabs.map((item) => {
            const isActive = brandCategory === item;
            return (
              <button
                className={`ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] ${
                  isActive
                    ? "bg-[var(--secondary)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
                    : "bg-[var(--muted)] transition-colors duration-200 hover:bg-[var(--muted-hover)]"
                }`}
                key={item}
                onClick={() => setBrandCategory(item)}
                type="button"
              >
                <span>{t(item)}</span>
              </button>
            );
          })}
          {brandDraftCount > 0 ? (
            <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-info)] px-3 py-2 text-xs font-medium text-[var(--color-info-foreground)]">
              {brandDraftCount} {brandDraftCount > 1 ? t("Draft Brands") : t("Draft Brand")}
            </div>
          ) : null}
        </div>

        {pagedBrandCards.length === 0 ? (
          <EmptyState message="No brand coverage yet for this category." />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
            {pagedBrandCards.map((item) => (
              <article
                className="flex min-h-[182px] min-w-0 flex-col rounded-m border border-[var(--border)] bg-[var(--muted-hover)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--secondary)]"
                key={item.id}
              >
                <div className="flex min-h-20 flex-col justify-center gap-0.5 px-3 pb-1.5 pt-3">
                  <h3 className="truncate text-base font-semibold leading-6 text-[var(--foreground)]">{item.brand}</h3>
                  <p className="truncate text-xs leading-[1.2] text-[var(--muted-foreground)]">{t(item.category)}</p>
                </div>

                <div className="flex flex-col gap-1 px-3 pb-2.5">
                  <p className="truncate text-[13px] font-medium leading-[1.2] text-[var(--foreground)]">{t(item.coverage)}</p>
                  <p className="truncate text-xs leading-[1.2] text-[var(--muted-foreground)]">{t(item.issues)}</p>
                  <p className="truncate text-xs leading-[1.2] text-[var(--muted-foreground)]">{t(item.owner)}</p>
                  {brandActionTarget === item.id ? <p className="truncate text-xs leading-[1.2] text-[var(--foreground)]">{t("Actions opened")}</p> : null}
                </div>

                <div className="mt-auto flex items-center justify-between px-3 pb-3">
                  <span className="text-xs font-medium leading-[1.2] text-[var(--muted-foreground)]">{t("Trend")}</span>
                  <button
                    aria-label={`更多操作：${item.brand}`}
                    className="ui-hover-shadow inline-flex h-10 w-10 items-center justify-center rounded-pill bg-[var(--secondary)] text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
                    onClick={() => setBrandActionTarget((prev) => (prev === item.id ? null : item.id))}
                    type="button"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-auto flex w-full flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13px] font-normal text-[var(--muted-foreground)]">
            {t("Showing")} {pagedBrandCards.length} {t("of")} {filteredBrandCards.length} {t("brands")}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={brandPage === 1}
              onClick={() => setBrandPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>{t("Previous")}</span>
            </button>

            {Array.from({ length: brandPageCount }, (_, index) => index + 1).map((page) => (
              <button
                className={`ui-hover-shadow inline-flex h-10 w-10 items-center justify-center rounded-pill border text-sm transition-colors duration-200 ${
                  brandPage === page
                    ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--secondary-hover)]"
                }`}
                key={page}
                onClick={() => setBrandPage(page)}
                type="button"
              >
                {page}
              </button>
            ))}

            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={brandPage === brandPageCount}
              onClick={() => setBrandPage((prev) => Math.min(brandPageCount, prev + 1))}
              type="button"
            >
              <span>{t("Next")}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
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
          {loading ? t("Loading...") : `${listRecords.length} 所有`}
        </div>
        <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-success)] px-3 py-2 text-sm font-medium leading-[1.142857] text-[var(--color-success-foreground)]">
          {activeCount} 可用
        </div>
        <div className="inline-flex h-8 items-center justify-center rounded-pill bg-[var(--color-warning)] px-3 py-2 text-sm font-medium leading-[1.142857] text-[var(--color-warning-foreground)]">
          {inactiveCount} 不可用
        </div>
      </div>

      <div className={`min-h-0 flex-1 ${listPagingMode === "scroll" ? "overflow-auto pr-1" : "overflow-hidden"}`} ref={listViewportRef}>
        {visibleListRecords.length === 0 ? (
          <EmptyState message={loading ? "Loading locations..." : normalizedSearchQuery ? "No matching locations found." : "No locations saved yet."} />
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

      <div className="flex w-full flex-col gap-3 pt-1 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-normal text-[var(--muted-foreground)]">
            {t("Showing")} {listStart}-{listEnd} {t("of")} {listRecords.length} {t("records")}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {listPagingMode === "paged"
              ? `分页模式 · 共 ${listPageCount} 页 · 每页 ${listItemsPerPage} 张`
              : `单界面模式 · 连续滚动 · 当前显示全部 ${listRecords.length} 张`}
          </p>
        </div>
        {listPagingMode === "paged" && listPageCount > 1 ? (
          <div className="flex items-center gap-2">
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
              disabled={listPage === 1}
              onClick={() => setListPage((prev) => Math.max(1, prev - 1))}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>{t("Previous")}</span>
            </button>

            {Array.from({ length: listPageCount }, (_, index) => index + 1).map((page) => (
              <button
                className={`ui-hover-shadow inline-flex h-10 w-10 items-center justify-center rounded-pill border text-sm transition-colors duration-200 ${
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

            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
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
