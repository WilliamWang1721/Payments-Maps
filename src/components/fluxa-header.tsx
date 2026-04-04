import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ArrowUpDown, LayoutGrid, Navigation, Search, SlidersHorizontal, X } from "lucide-react";

import type { SidebarTab } from "@/components/fluxa-sidebar";
import { useI18n } from "@/i18n";
import type { LocationSearchMatchField, LocationSearchResult } from "@/lib/location-search";
import type { BrandSegment } from "@/types/brand";

interface FluxaHeaderProps {
  activeTab: SidebarTab;
  brandCategory?: BrandSegment;
  brandPagingMode?: "paged" | "scroll";
  brandSort?: "updated" | "name";
  listPagingMode?: "paged" | "scroll";
  listSort?: "distance" | "updated";
  locating?: boolean;
  searchLoading?: boolean;
  searchQuery?: string;
  searchSuggestions?: LocationSearchResult[];
  onBrandCategoryChange?: (category: BrandSegment) => void;
  onBrandPagingModeToggle?: () => void;
  onBrandSortChange?: (sort: "updated" | "name") => void;
  onListPagingModeToggle?: () => void;
  onListSortChange?: (sort: "distance" | "updated") => void;
  onLocate?: () => void;
  onSearchQueryChange?: (value: string) => void;
  onSearchSuggestionSelect?: (locationId: string) => void;
}

const SEARCH_PLACEHOLDER: Record<SidebarTab, string> = {
  map: "Search Location / Brand / Address...",
  list: "Search merchant / address / card / Location ID...",
  brands: "Search brand / category / website...",
  profile: "Search profile activity...",
  history: "Search history..."
};

const SEARCH_MATCH_LABELS: Record<LocationSearchMatchField, string> = {
  name: "名称",
  notes: "备注",
  city: "城市",
  address: "地址",
  brand: "品牌",
  id: "ID",
  network: "网络",
  addedBy: "录入人"
};

export function FluxaHeader({
  activeTab,
  brandCategory = "Coffee",
  brandPagingMode = "scroll",
  brandSort = "updated",
  listPagingMode = "paged",
  listSort = "distance",
  locating = false,
  searchLoading = false,
  searchQuery = "",
  searchSuggestions = [],
  onBrandCategoryChange,
  onBrandPagingModeToggle,
  onBrandSortChange,
  onListPagingModeToggle,
  onListSortChange,
  onLocate,
  onSearchQueryChange,
  onSearchSuggestionSelect
}: FluxaHeaderProps): React.JSX.Element {
  const { t } = useI18n();
  const brandCategories: BrandSegment[] = ["Coffee", "Fast Food", "Retail", "Convenience"];
  const isMap = activeTab === "map";
  const isBrands = activeTab === "brands";
  const searchEnabled = typeof onSearchQueryChange === "function";
  const normalizedSearchQuery = searchQuery.trim();
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [filtersEnabled, setFiltersEnabled] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const hasSearchQuery = normalizedSearchQuery.length > 0;
  const showSearchSuggestions = searchEnabled && isSearchFocused && hasSearchQuery;
  const showSearchLoading = showSearchSuggestions && searchLoading && searchSuggestions.length === 0;
  const showSearchEmpty = showSearchSuggestions && !searchLoading && searchSuggestions.length === 0;

  useEffect(() => {
    setFiltersEnabled(false);
  }, [activeTab]);

  useEffect(() => {
    if (!searchEnabled) {
      setIsSearchFocused(false);
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!searchContainerRef.current?.contains(target)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [searchEnabled]);

  useEffect(() => {
    if (!showSearchSuggestions || searchSuggestions.length === 0) {
      setActiveSuggestionIndex(0);
      return;
    }

    setActiveSuggestionIndex((current) => Math.min(current, searchSuggestions.length - 1));
  }, [searchSuggestions.length, showSearchSuggestions]);

  const handleSearchSuggestionPick = (locationId: string): void => {
    onSearchSuggestionSelect?.(locationId);
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
  };

  return (
    <header className="flex w-full min-w-0 flex-col gap-3 xl:h-10 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative w-full xl:max-w-[560px]" ref={searchContainerRef}>
        <div className="flex h-8 w-full min-w-0 items-center gap-2 px-0 py-1.5">
          <Search className="h-4 w-4 text-[var(--foreground)]" />
          {searchEnabled ? (
            <input
              aria-expanded={showSearchSuggestions}
              aria-label={t(SEARCH_PLACEHOLDER[activeTab])}
              aria-controls={showSearchSuggestions ? `fluxa-search-results-${activeTab}` : undefined}
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent text-sm leading-[1.4286] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground)]"
              onChange={(event) => onSearchQueryChange?.(event.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(event) => {
                if (!showSearchSuggestions || searchSuggestions.length === 0) {
                  if (event.key === "Escape") {
                    setIsSearchFocused(false);
                    searchInputRef.current?.blur();
                  }
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) => (current + 1) % searchSuggestions.length);
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) => (current - 1 + searchSuggestions.length) % searchSuggestions.length);
                  return;
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  const activeSuggestion = searchSuggestions[activeSuggestionIndex];
                  if (activeSuggestion) {
                    handleSearchSuggestionPick(activeSuggestion.location.id);
                  }
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsSearchFocused(false);
                  searchInputRef.current?.blur();
                }
              }}
              placeholder={t(SEARCH_PLACEHOLDER[activeTab])}
              ref={searchInputRef}
              spellCheck={false}
              type="text"
              value={searchQuery}
            />
          ) : (
            <span className="flex-1 truncate text-sm leading-[1.4286] text-[var(--foreground)]">
              {t(SEARCH_PLACEHOLDER[activeTab])}
            </span>
          )}
          {searchEnabled ? (
            <button
              aria-label={t("Clear search")}
              className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--foreground)]"
              disabled={searchQuery.length === 0}
              onClick={() => {
                onSearchQueryChange?.("");
                searchInputRef.current?.focus();
              }}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <X className="h-4 w-4 text-[var(--foreground)]" />
          )}
        </div>

        {showSearchSuggestions ? (
          <div
            className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_44px_-26px_rgba(15,23,42,0.34)]"
            id={`fluxa-search-results-${activeTab}`}
            role="listbox"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <p className="text-xs font-medium leading-[1.3] text-[var(--muted-foreground)]">
                {showSearchLoading ? "正在搜索..." : `${searchSuggestions.length} 条匹配结果`}
              </p>
              <p className="text-xs leading-[1.3] text-[var(--muted-foreground)]">支持名称 / 品牌 / 地址 / 城市 / ID</p>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-2">
              {showSearchLoading ? (
                <div className="flex min-h-[96px] items-center justify-center px-3.5 py-6 text-sm text-[var(--muted-foreground)]">
                  正在搜索相关地点...
                </div>
              ) : null}
              {showSearchEmpty ? (
                <div className="flex min-h-[96px] items-center justify-center px-3.5 py-6 text-sm text-[var(--muted-foreground)]">
                  没有找到相关地点
                </div>
              ) : null}
              {!showSearchLoading
                ? searchSuggestions.map((result, index) => (
                    <button
                      aria-selected={activeSuggestionIndex === index}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-[14px] border px-3.5 py-3 text-left transition-colors duration-200 ${
                        activeSuggestionIndex === index
                          ? "border-[var(--border-hover)] bg-[var(--accent)]"
                          : "border-transparent hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
                      }`}
                      key={result.location.id}
                      onClick={() => handleSearchSuggestionPick(result.location.id)}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      role="option"
                      type="button"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-semibold leading-[1.35] text-[var(--foreground)]">{result.location.name}</p>
                          {result.location.city ? (
                            <span className="inline-flex shrink-0 items-center rounded-pill bg-[var(--secondary)] px-2 py-1 text-[11px] font-medium leading-none text-[var(--secondary-foreground)]">
                              {result.location.city}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs leading-[1.35] text-[var(--muted-foreground)]">{result.location.address}</p>
                        {result.location.notes ? (
                          <p className="mt-2 truncate text-xs leading-[1.35] text-[var(--muted-foreground)]">
                            备注: {result.location.notes}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex max-w-[132px] shrink-0 flex-wrap justify-end gap-1">
                        {result.matchedFields.slice(0, 3).map((field) => (
                          <span
                            className="inline-flex items-center rounded-pill bg-[var(--muted)] px-2 py-1 text-[11px] font-medium leading-none text-[var(--foreground)]"
                            key={`${result.location.id}-${field}`}
                          >
                            {SEARCH_MATCH_LABELS[field]}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))
                : null}
            </div>
          </div>
        ) : null}
      </div>

      {isBrands ? (
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          <button
            className="ui-hover-shadow flex h-10 w-full items-center justify-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)] sm:w-auto"
            onClick={() => {
              if (!onBrandCategoryChange) {
                return;
              }

              const currentIndex = brandCategories.indexOf(brandCategory);
              const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % brandCategories.length : 0;
              onBrandCategoryChange(brandCategories[nextIndex]);
            }}
            type="button"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{`${t("Filters")}: ${t(brandCategory)}`}</span>
          </button>

          <button
            className="ui-hover-shadow flex h-10 w-full items-center justify-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] sm:w-auto"
            onClick={() => onBrandSortChange?.(brandSort === "updated" ? "name" : "updated")}
            type="button"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{brandSort === "updated" ? t("Sort: Updated") : t("Sort: Name")}</span>
          </button>

          <button
            className="ui-hover-shadow flex h-10 w-full items-center justify-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] sm:w-auto"
            onClick={onBrandPagingModeToggle}
            type="button"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>{brandPagingMode === "scroll" ? t("Scroll Mode") : t("Paged Mode")}</span>
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
          <button
            className={`ui-hover-shadow flex h-10 w-full items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] sm:w-auto ${
              isMap
                ? "sm:min-w-[104px] border border-[var(--input)] bg-white transition-colors duration-200 hover:bg-[var(--muted-hover)] hover:border-[var(--border-hover)] [--hover-outline:#2a293336]"
                : "sm:min-w-[153px] bg-[var(--accent)] transition-colors duration-200 hover:bg-[var(--accent-hover)] [--hover-outline:#2a29332e]"
            }`}
            onClick={() => {
              if (isMap) {
                onLocate?.();
                return;
              }
              onListSortChange?.(listSort === "distance" ? "updated" : "distance");
            }}
            type="button"
          >
            {isMap ? <Navigation className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
            <span>{isMap ? (locating ? t("Locating...") : t("Locate")) : listSort === "distance" ? t("Sort: Distance") : t("Sort: Updated")}</span>
          </button>

          {!isMap ? (
            <button
              className="ui-hover-shadow flex h-10 w-[116px] shrink-0 items-center justify-center gap-1.5 rounded-pill bg-[var(--muted)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:bg-[var(--muted-hover)]"
              onClick={onListPagingModeToggle}
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>{listPagingMode === "scroll" ? "滚动" : "分页"}</span>
            </button>
          ) : null}

          <button
            className={`ui-hover-shadow flex h-10 w-full items-center justify-center gap-1.5 rounded-pill px-4 py-2 text-sm font-medium leading-[1.4286] transition-colors duration-200 [--hover-outline:#2a293336] sm:w-auto sm:min-w-[100px] ${
              filtersEnabled
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary-hover)]"
            }`}
            onClick={() => setFiltersEnabled((prev) => !prev)}
            type="button"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>{filtersEnabled ? t("Filters On") : t("Filters")}</span>
          </button>
        </div>
      )}
    </header>
  );
}
