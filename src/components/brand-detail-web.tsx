import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { ArrowLeft, ArrowUpRight, Building2, ChevronLeft, ChevronRight, ExternalLink, ListFilter, Store, Wifi } from "lucide-react";

import { useFluxaBrandLocations } from "@/hooks/use-fluxa-brand-locations";
import { useI18n } from "@/i18n";
import type { BrandRecord } from "@/types/brand";
import type { LocationRecord } from "@/types/location";

interface BrandDetailWebProps {
  brand: BrandRecord | null;
  error?: string | null;
  loading?: boolean;
  onBack: () => void;
  onOpenLocation: (location: LocationRecord) => void;
}

const BRAND_LOCATION_CARD_HEIGHT = 172;
const CARD_GAP = 12;

interface CurrentPosition {
  lat: number;
  lng: number;
}

function brandStatusLabel(status: BrandRecord["status"] | undefined): string {
  if (status === "inactive") return "Inactive";
  if (status === "coming_soon") return "Coming soon";
  return "Active";
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
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

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

function inferSupportedNetworks(location: LocationRecord): string {
  if (Array.isArray(location.supportedNetworks) && location.supportedNetworks.length > 0) {
    return Array.from(new Set(location.supportedNetworks.filter(Boolean))).join(", ");
  }

  return "Unknown";
}

function inferSuccessRate(location: LocationRecord): string {
  if (typeof location.successRate === "number" && Number.isFinite(location.successRate)) {
    return `${location.successRate.toFixed(1)}%`;
  }

  return "Unknown";
}

function locationStatusClass(status: LocationRecord["status"]): string {
  return status === "active"
    ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
    : "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]";
}

function locationStatusLabel(status: LocationRecord["status"]): string {
  return status === "active" ? "Active" : "Inactive";
}

function EmptyState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-8 text-center text-sm text-[var(--muted-foreground)]">
      {message}
    </div>
  );
}

export function BrandDetailWeb({
  brand,
  error = null,
  loading = false,
  onBack,
  onOpenLocation
}: BrandDetailWebProps): React.JSX.Element {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [pagingMode, setPagingMode] = useState<"paged" | "scroll">("scroll");
  const [sort, setSort] = useState<"distance" | "updated" | "name">("updated");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [itemsPerViewport, setItemsPerViewport] = useState(5);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const distanceLocateRequestedRef = useRef(false);

  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
    totalCount,
    activeCount,
    inactiveCount,
    summaryCountLoading,
    filteredTotalCount,
    pageCount,
    hasMore,
    loadMore
  } = useFluxaBrandLocations({
    brand,
    currentPosition,
    enabled: Boolean(brand),
    page,
    pageSize: Math.max(1, itemsPerViewport),
    pagingMode,
    searchQuery: "",
    sort,
    statusFilter
  });

  useEffect(() => {
    setPage(1);
  }, [pagingMode, sort, statusFilter, brand?.id, currentPosition]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateCapacity = () => {
      const height = viewport.clientHeight;
      const rows = Math.max(1, Math.floor((height + CARD_GAP) / (BRAND_LOCATION_CARD_HEIGHT + CARD_GAP)));
      setItemsPerViewport((current) => (current === rows ? current : rows));
    };

    updateCapacity();

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(updateCapacity);
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (sort !== "distance" || currentPosition) {
      distanceLocateRequestedRef.current = false;
      return;
    }

    if (distanceLocateRequestedRef.current) {
      return;
    }

    distanceLocateRequestedRef.current = true;

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lng: position.coords.longitude,
          lat: position.coords.latitude
        });
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [currentPosition, sort]);

  const locationCards = useMemo(
    () =>
      locations.map((location) => ({
        ...location,
        distanceKm: currentPosition ? calculateDistanceKm(currentPosition, { lat: location.lat, lng: location.lng }) : null,
        capabilityMeta: `${t("Success Rate")} ${inferSuccessRate(location)} · ${t("Supported Networks")}: ${inferSupportedNetworks(location)}`,
        createdAtText: `${t("Added")}: ${formatExactDate(location.createdAt, "zh-CN")}`,
        updatedMeta: `${t("Last sync")} ${formatRelativeTime(location.updatedAt, t)}`
      })),
    [currentPosition, locations, t]
  );

  const effectiveLoading = loading || locationsLoading;
  const effectiveError = error || locationsError;
  const start = filteredTotalCount === 0 ? 0 : pagingMode === "paged" ? (page - 1) * Math.max(1, itemsPerViewport) + 1 : 1;
  const end = start === 0 ? 0 : Math.min(filteredTotalCount, start + locationCards.length - 1);

  if (!brand && loading) {
    return (
      <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <EmptyState message={t("Loading brand detail...")} />
      </section>
    );
  }

  if (!brand) {
    return (
      <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="flex h-full min-h-0 flex-1 items-center justify-center rounded-[32px] border border-[var(--border)] bg-[var(--card)] px-8 py-12">
          <div className="max-w-[420px] text-center">
            <h1 className="text-[30px] font-semibold leading-[1.1] text-[var(--foreground)]">{t("Brand not found")}</h1>
            <p className="mt-3 text-sm leading-[1.5] text-[var(--muted-foreground)]">{t("The selected brand could not be found in the current catalog.")}</p>
            <button
              className="ui-hover-shadow mt-6 inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] bg-white px-5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("Back to Brands")}</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="flex h-full w-full min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] bg-white px-5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t("Back to Brands")}</span>
          </button>
          {brand.website ? (
            <a
              className="ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border border-[var(--input)] bg-white px-5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              href={brand.website}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink className="h-4 w-4" />
              <span>{t("Open Website")}</span>
            </a>
          ) : null}
        </div>

        {effectiveError ? (
          <div className="rounded-[24px] border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a]">{t(effectiveError)}</div>
        ) : null}

        <article className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{t("Brand Overview")}</p>
              <h1 className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--foreground)]">{brand.name}</h1>
              <p className="mt-3 max-w-[860px] text-sm leading-[1.6] text-[var(--muted-foreground)]">
                {brand.description || brand.notes || t("No brand introduction yet.")}
              </p>
            </div>
            <span className="inline-flex h-10 items-center rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)]">
              {t(brandStatusLabel(brand.status))}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4 xl:col-span-2">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Brand Category")}</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{brand.uiCategoryLabel}</p>
            </div>
            <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
              <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Total Locations")}</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-[var(--foreground)]">
                    {summaryCountLoading ? t("Loading...") : totalCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
              <div className="flex items-center gap-3">
                    <Wifi className="h-4 w-4 text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Active Locations")}</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-[var(--foreground)]">
                    {summaryCountLoading ? t("Loading...") : activeCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
              <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Inactive Locations")}</p>
                  <p className="mt-1 text-2xl font-semibold leading-none text-[var(--foreground)]">
                    {summaryCountLoading ? t("Loading...") : inactiveCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="flex min-h-0 flex-1 flex-col rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[24px] font-semibold leading-[1.15] text-[var(--foreground)]">{t("Brand Locations")}</h2>
              <p className="mt-1 text-sm leading-[1.5] text-[var(--muted-foreground)]">
                {effectiveLoading
                  ? t("Loading brand locations...")
                  : totalCount > 0
                    ? `${totalCount} ${t("locations under this brand")}`
                    : t("No locations have been linked to this brand yet.")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-start gap-2">
              {[
                { label: t("All"), value: "all" as const },
                { label: t("Active"), value: "active" as const },
                { label: t("Inactive"), value: "inactive" as const }
              ].map((option) => (
                <button
                  className={`ui-hover-shadow inline-flex h-10 items-center justify-center rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    statusFilter === option.value
                      ? "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
                      : "border border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                  }`}
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              <button
                className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => setSort((prev) => (prev === "updated" ? "name" : prev === "name" ? "distance" : "updated"))}
                type="button"
              >
                <ListFilter className="h-4 w-4" />
                <span>{sort === "updated" ? t("Sort: Updated") : sort === "name" ? t("Sort: Name") : t("Sort: Distance")}</span>
              </button>
              <button
                className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => setStatusFilter((prev) => (prev === "all" ? "active" : prev === "active" ? "inactive" : "all"))}
                type="button"
              >
                <ListFilter className="h-4 w-4" />
                <span>{`${t("Filters")}: ${statusFilter === "all" ? t("All") : statusFilter === "active" ? t("Active") : t("Inactive")}`}</span>
              </button>
              <button
                className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => setStatusFilter((prev) => (prev === "all" ? "active" : prev === "active" ? "inactive" : "all"))}
                type="button"
              >
                <ListFilter className="h-4 w-4" />
                <span>{`${t("Filters")}: ${statusFilter === "all" ? t("All") : statusFilter === "active" ? t("Active") : t("Inactive")}`}</span>
              </button>
              <button
                className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => setPagingMode((prev) => (prev === "scroll" ? "paged" : "scroll"))}
                type="button"
              >
                <ListFilter className="h-4 w-4" />
                <span>{pagingMode === "scroll" ? t("Scroll Mode") : t("Paged Mode")}</span>
              </button>
              {pagingMode === "paged" && pageCount > 1 ? (
                <>
                  <button
                    className="ui-hover-shadow inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    type="button"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span>{t("Previous")}</span>
                  </button>
                  <button
                    className="ui-hover-shadow inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-pill border border-[var(--input)] px-[18px] py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
                    disabled={page === pageCount}
                    onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                    type="button"
                  >
                    <span>{t("Next")}</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div
            className={`mt-4 min-h-0 flex-1 ${pagingMode === "scroll" ? "overflow-auto pr-1" : "overflow-hidden"}`}
            onScroll={(event) => {
              if (pagingMode !== "scroll" || !hasMore || locationsLoading) {
                return;
              }

              const target = event.currentTarget;
              if (target.scrollHeight - target.scrollTop - target.clientHeight <= 120) {
                loadMore();
              }
            }}
            ref={viewportRef}
          >
            {locationCards.length === 0 ? (
              <EmptyState
                message={
                  effectiveLoading
                    ? t("Loading brand locations...")
                    : statusFilter !== "all"
                      ? t("No matching locations found.")
                      : t("No locations have been linked to this brand yet.")
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {locationCards.map((location) => (
                  <article
                    className="flex min-h-[172px] min-w-0 flex-col rounded-[26px] border border-[var(--border)] bg-white transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
                    key={location.id}
                  >
                    <div className="flex items-start justify-between gap-3 px-5 pt-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-semibold leading-6 text-[var(--foreground)]">{location.name}</h3>
                          {location.status === "inactive" ? (
                            <span className={`inline-flex h-8 items-center justify-center rounded-pill px-3 py-2 text-sm font-medium leading-[1.142857] ${locationStatusClass(location.status)}`}>
                              {t(locationStatusLabel(location.status))}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-col gap-1">
                          <p className="truncate text-[13px] font-normal leading-[1.2] text-[var(--muted-foreground)]">{location.capabilityMeta}</p>
                          <p className="truncate text-[13px] font-normal leading-[1.2] text-[var(--muted-foreground)]">{location.address}</p>
                        </div>
                      </div>
                      <button
                        className="ui-hover-shadow inline-flex h-10 shrink-0 items-center gap-1.5 rounded-m border border-[var(--input)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                        onClick={() => onOpenLocation(location)}
                        type="button"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        <span>{t("Detail")}</span>
                      </button>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4 text-xs leading-[1.2] text-[var(--muted-foreground)]">
                      <span className="truncate">
                        {location.city}
                        {location.distanceKm !== null ? ` · ${formatDistanceLabel(location.distanceKm)}` : ""}
                        {` · ${location.updatedMeta}`}
                      </span>
                      <span className="shrink-0 text-right">{location.createdAtText}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 pt-3">
            <div className="overflow-x-auto">
              <div className="flex min-w-max items-center gap-4 whitespace-nowrap pr-1 text-[13px] font-normal text-[var(--muted-foreground)]">
                <p>
                  显示第 {start} 到 {end} 个项目，共 {filteredTotalCount} 条记录
                </p>
                <p>
                  {pagingMode === "paged"
                    ? `分页模式，共 ${pageCount} 页，当前每页显示 ${itemsPerViewport} 个项目`
                    : `连续滚动模式，滚动到下方时继续加载，当前已显示 ${locationCards.length} / ${filteredTotalCount} 个项目`}
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
