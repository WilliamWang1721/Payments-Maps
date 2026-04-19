import { useDeferredValue, useMemo, useRef, useState } from "react";
import type React from "react";
import { ArrowRight, PlugZap, Search, ShieldAlert, ShieldCheck, ShieldEllipsis, TriangleAlert } from "lucide-react";

import { AdminLocationErrorReports } from "@/components/admin-location-error-reports";
import { useI18n } from "@/i18n";
import { buildLocationSearchIndex, searchLocationSearchIndex } from "@/lib/location-search";
import type { LocationSearchRecord } from "@/services/location-service";

interface AdminDashboardProps {
  isAdmin: boolean;
  locationSearchDirectory: LocationSearchRecord[];
  locationSearchLoading?: boolean;
  onOpenLocation: (locationId: string) => Promise<void>;
  onOpenMcpSettings?: () => void;
}

interface OverviewCardProps {
  description: string;
  title: string;
  icon: React.ReactNode;
}

function OverviewCard({
  description,
  title,
  icon
}: OverviewCardProps): React.JSX.Element {
  return (
    <article className="rounded-[24px] border border-[var(--input)] bg-white p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--input)] bg-[var(--accent)] text-[var(--foreground)]">
        {icon}
      </div>
      <h2 className="mt-4 text-base font-semibold leading-[1.3] text-[var(--foreground)]">{title}</h2>
      <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">{description}</p>
    </article>
  );
}

function formatRelativeTimestamp(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function AdminDashboard({
  isAdmin,
  locationSearchDirectory,
  locationSearchLoading = false,
  onOpenLocation,
  onOpenMcpSettings
}: AdminDashboardProps): React.JSX.Element {
  const { language, t } = useI18n();
  const [locationQuery, setLocationQuery] = useState("");
  const deferredLocationQuery = useDeferredValue(locationQuery);
  const queueSectionRef = useRef<HTMLElement | null>(null);
  const locationSearchIndex = useMemo(() => buildLocationSearchIndex(locationSearchDirectory), [locationSearchDirectory]);
  const matchedLocations = useMemo(
    () => searchLocationSearchIndex(locationSearchIndex, deferredLocationQuery, { limit: 6 }),
    [deferredLocationQuery, locationSearchIndex]
  );
  const recentLocations = useMemo(
    () =>
      [...locationSearchDirectory]
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
        .slice(0, 6),
    [locationSearchDirectory]
  );
  const dateLocale =
    language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "zh-CN";
  const visibleLocations = locationQuery.trim().length > 0 ? matchedLocations.map((result) => result.location) : recentLocations;

  if (!isAdmin) {
    return (
      <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[#FAFAFA] p-6">
        <div className="max-w-xl rounded-[28px] border border-[rgba(245,158,11,0.18)] bg-white px-6 py-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[var(--foreground)]">{t("Admin Access Required")}</p>
              <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("Only administrators can access the standalone admin dashboard.")}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] p-3 sm:p-4">
      <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--input)] bg-white px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-pill border border-[rgba(79,70,229,0.14)] bg-[rgba(79,70,229,0.06)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--primary)]">
              {t("Admin Only")}
            </span>
          </div>
          <div>
            <h1 className="text-[28px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Admin Dashboard")}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-[1.7] text-[var(--muted-foreground)]">
              {t("Operate all administrator-only workflows from one place, including the error report queue, MCP admin flows, and location governance entry points.")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            onClick={() => queueSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            type="button"
          >
            <ShieldEllipsis className="h-4 w-4" />
            <span>{t("Jump to Error Queue")}</span>
          </button>
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
            onClick={() => onOpenMcpSettings?.()}
            type="button"
          >
            <PlugZap className="h-4 w-4" />
            <span>{t("Open MCP Settings")}</span>
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <OverviewCard
          description={t("Review, triage, and close submitted issues from Location Detail without leaving the admin workspace.")}
          icon={<ShieldCheck className="h-5 w-5" />}
          title={t("Error Report Queue")}
        />
        <OverviewCard
          description={t("Use AI and MCP session tools to search map POIs, batch import stores, and pre-seed shell locations.")}
          icon={<PlugZap className="h-5 w-5" />}
          title={t("MCP Bulk Import")}
        />
        <OverviewCard
          description={t("Open any location detail page to use admin-only destructive actions such as deleting a location with full context.")}
          icon={<TriangleAlert className="h-5 w-5" />}
          title={t("Location Governance")}
        />
        <OverviewCard
          description={t("Admin access is derived from session metadata and enforced in both the UI and the service layer.")}
          icon={<ShieldEllipsis className="h-5 w-5" />}
          title={t("Permissions")}
        />
      </div>

      <div className="mt-4 grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Location Operations")}</h2>
              <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("Search a location, open its detail page, and continue with contextual admin actions there.")}
              </p>
            </div>
            <span className="inline-flex items-center rounded-pill border border-[var(--input)] bg-[var(--accent)] px-3 py-1 text-[11px] font-medium text-[var(--foreground)]">
              {locationSearchLoading ? t("Loading...") : String(visibleLocations.length)}
            </span>
          </div>

          <div className="mt-4 rounded-[22px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4">
            <label className="flex items-center gap-2">
              <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
              <input
                className="h-10 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder={t("Search locations by name, brand, address, or location ID")}
                type="text"
                value={locationQuery}
              />
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {locationSearchLoading ? (
              <div className="rounded-[20px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("Loading location directory...")}
              </div>
            ) : null}

            {!locationSearchLoading && visibleLocations.length === 0 ? (
              <div className="rounded-[20px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("No matching locations found for this admin search.")}
              </div>
            ) : null}

            {visibleLocations.map((location) => (
              <div className="flex flex-col gap-3 rounded-[22px] border border-[var(--input)] bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between" key={location.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{location.name}</p>
                    {location.city ? (
                      <span className="inline-flex items-center rounded-pill border border-[var(--input)] bg-[var(--accent)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                        {location.city}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-pill border border-[var(--input)] bg-[var(--accent)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                      {t(location.status === "active" ? "Active" : "Inactive")}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm leading-[1.6] text-[var(--muted-foreground)]">{location.address}</p>
                  <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                    {location.brand} · {formatRelativeTimestamp(location.updatedAt, dateLocale)}
                  </p>
                </div>

                <button
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                  onClick={() => {
                    void onOpenLocation(location.id);
                  }}
                  type="button"
                >
                  <span>{t("Open Detail")}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[20px] border border-[rgba(245,158,11,0.18)] bg-[rgba(255,247,237,0.92)] px-4 py-4 text-sm leading-[1.7] text-[#9A3412]">
            {t("Delete locations still happens inside Location Detail so the action keeps full context and audit visibility.")}
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--input)] bg-[var(--accent)] text-[var(--foreground)]">
              <PlugZap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Admin Import Workflows")}</h2>
              <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("These flows come from the existing MCP settings and remain administrator-only.")}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {[
              t("Search brand stores on the map before importing them."),
              t("Bulk import matched map results into Fluxa locations."),
              t("Use shell locations when you need to pre-seed stores before real payment attempts exist."),
              t("Batch import can backfill city when the admin workflow leaves it empty.")
            ].map((item) => (
              <div className="flex items-start gap-3 rounded-[20px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4" key={item}>
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                <p className="text-sm leading-[1.7] text-[var(--foreground)]">{item}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-[var(--input)] bg-white px-4 py-4">
            <p className="text-sm leading-[1.7] text-[var(--muted-foreground)]">
              {t("Open the MCP settings page to create sessions, copy configs, and continue these admin workflows.")}
            </p>
            <button
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
              onClick={() => onOpenMcpSettings?.()}
              type="button"
            >
              <PlugZap className="h-4 w-4" />
              <span>{t("Open MCP Settings")}</span>
            </button>
          </div>
        </article>
      </div>

      <section className="mt-4" ref={queueSectionRef}>
        <div className="overflow-hidden rounded-[24px] border border-[var(--input)] bg-white">
          <AdminLocationErrorReports
            embedded
            isAdmin={isAdmin}
            onOpenLocation={onOpenLocation}
          />
        </div>
      </section>
    </section>
  );
}
