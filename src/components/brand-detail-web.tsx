import type React from "react";
import { ArrowLeft, Building2, ExternalLink, MapPin, Store, Wifi } from "lucide-react";

import { useI18n } from "@/i18n";
import type { BrandRecord } from "@/types/brand";
import type { LocationRecord } from "@/types/location";

interface BrandDetailWebProps {
  brand: BrandRecord | null;
  locations: LocationRecord[];
  onBack: () => void;
  onOpenLocation: (location: LocationRecord) => void;
}

function normalizeBrandName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function brandStatusLabel(status: BrandRecord["status"] | undefined): string {
  if (status === "inactive") return "Inactive";
  if (status === "coming_soon") return "Coming soon";
  return "Active";
}

export function BrandDetailWeb({
  brand,
  locations,
  onBack,
  onOpenLocation
}: BrandDetailWebProps): React.JSX.Element {
  const { t } = useI18n();
  const normalizedBrandName = normalizeBrandName(brand?.name || "");
  const brandLocations = locations.filter((location) => normalizeBrandName(location.brand) === normalizedBrandName);
  const activeLocationCount = brandLocations.filter((location) => location.status === "active").length;
  const inactiveLocationCount = brandLocations.length - activeLocationCount;

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

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.78fr)]">
          <div className="flex min-h-0 flex-col gap-4">
            <article className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{t("Brand Overview")}</p>
                  <h1 className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--foreground)]">{brand.name}</h1>
                  <p className="mt-3 max-w-[720px] text-sm leading-[1.6] text-[var(--muted-foreground)]">
                    {brand.description || brand.notes || t("No brand introduction yet.")}
                  </p>
                </div>
                <span className="inline-flex h-10 items-center rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)]">
                  {t(brandStatusLabel(brand.status))}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Brand Category")}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{brand.uiCategoryLabel}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Primary city")}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{brand.primaryCity || t("Unknown")}</p>
                </div>
                <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Business Type")}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{t(brand.businessType === "online" ? "Online" : "Offline")}</p>
                </div>
              </div>
            </article>

            <article className="flex min-h-0 flex-1 flex-col rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[24px] font-semibold leading-[1.15] text-[var(--foreground)]">{t("Brand Locations")}</h2>
                  <p className="mt-1 text-sm leading-[1.5] text-[var(--muted-foreground)]">
                    {brandLocations.length > 0
                      ? `${brandLocations.length} ${t("locations under this brand")}`
                      : t("No locations have been linked to this brand yet.")}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
                {brandLocations.length > 0 ? (
                  brandLocations.map((location) => (
                    <button
                      className="ui-hover-shadow flex w-full items-start justify-between gap-3 rounded-[24px] border border-[var(--input)] bg-white px-4 py-4 text-left transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                      key={location.id}
                      onClick={() => onOpenLocation(location)}
                      type="button"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-base font-semibold leading-[1.35] text-[var(--foreground)]">{location.name}</p>
                          <span className="inline-flex items-center rounded-pill bg-[var(--secondary)] px-2 py-1 text-[11px] font-medium text-[var(--secondary-foreground)]">
                            {t(location.status === "active" ? "Active" : "Inactive")}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm leading-[1.45] text-[var(--muted-foreground)]">{location.address}</p>
                        <p className="mt-2 truncate text-xs leading-[1.4] text-[var(--muted-foreground)]">
                          {location.city} · BIN {location.bin}
                        </p>
                      </div>
                      <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    </button>
                  ))
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--accent)] px-6 text-center text-sm text-[var(--muted-foreground)]">
                    {t("No locations have been linked to this brand yet.")}
                  </div>
                )}
              </div>
            </article>
          </div>

          <aside className="flex flex-col gap-4">
            <article className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
              <h2 className="text-[22px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Coverage Metrics")}</h2>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Store className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Total Locations")}</p>
                      <p className="mt-1 text-2xl font-semibold leading-none text-[var(--foreground)]">{brandLocations.length}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Active Locations")}</p>
                      <p className="mt-1 text-2xl font-semibold leading-none text-[var(--foreground)]">{activeLocationCount}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-[var(--input)] bg-white px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-[var(--primary)]" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Inactive Locations")}</p>
                      <p className="mt-1 text-2xl font-semibold leading-none text-[var(--foreground)]">{inactiveLocationCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}
