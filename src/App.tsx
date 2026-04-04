import type React from "react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { AddBrandSuccess } from "@/components/add-brand-success";
import { AddBrandWizard } from "@/components/add-brand-wizard";
import { AddLocationSuccess } from "@/components/add-location-success";
import { AddLocationWizard } from "@/components/add-location-wizard";
import { BrandDetailWeb } from "@/components/brand-detail-web";
import { CardsAlbumWeb } from "@/components/cards-album-web";
import { FluxaHeader } from "@/components/fluxa-header";
import { FluxaMapCanvas } from "@/components/fluxa-map-canvas";
import { WebMcpSettings } from "@/components/web-mcp-settings";
import { PlaceDetailWeb } from "@/components/place-detail-web";
import { FluxaSidebar, type SidebarTab } from "@/components/fluxa-sidebar";
import { WebSettings } from "@/components/web-settings";
import { invalidateFluxaBrandDirectoryCache } from "@/hooks/use-fluxa-brand-catalog";
import { useFluxaBrandRecord } from "@/hooks/use-fluxa-brand-record";
import { useFluxaBrands } from "@/hooks/use-fluxa-brands";
import { invalidateFluxaLocationCountsCache, useFluxaLocationCounts } from "@/hooks/use-fluxa-location-counts";
import { invalidateFluxaLocationDirectoryCache, useFluxaLocationDirectory } from "@/hooks/use-fluxa-location-directory";
import { invalidateFluxaLocationMapIndexCache, useFluxaLocationMapIndex } from "@/hooks/use-fluxa-location-map-index";
import { invalidateFluxaLocationSearchDirectoryCache, useFluxaLocationSearchDirectory } from "@/hooks/use-fluxa-location-search-directory";
import { invalidateFluxaMapPartitionCaches, useFluxaMapPartitions } from "@/hooks/use-fluxa-map-partitions";
import { useFluxaLocations } from "@/hooks/use-fluxa-locations";
import { useViewerProfile } from "@/hooks/use-viewer-profile";
import { buildLocationSearchIndex, searchLocationSearchIndex } from "@/lib/location-search";
import { buildFluxaPagePath, isSidebarTab, parseFluxaPageRoute, type FluxaPageRoute, type FluxaPageView } from "@/lib/fluxa-routes";
import { DEFAULT_MAP_THEME, isMapThemeKey, MAP_THEME_STORAGE_KEY, type MapThemeKey } from "@/lib/map-theme";
import { locationService } from "@/services/location-service";
import type { BrandRecord, CreateBrandInput } from "@/types/brand";
import type { CreateLocationInput, LocationRecord } from "@/types/location";

const ADD_LOCATION_AUTO_READ_MERCHANT_NAME_STORAGE_KEY = "fluxa_add_location_auto_read_merchant_name_beta";
const ADD_LOCATION_SMART_ADD_STORAGE_KEY = "fluxa_add_location_smart_add_beta";
const MCP_BETA_STORAGE_KEY = "fluxa_mcp_beta_enabled";

type OverlayView = "cards" | "addLocation" | "addLocationSuccess" | "addBrand" | "addBrandSuccess" | "webSettings" | "mcpSettings";
type AppView = FluxaPageView | OverlayView;
type ListPagingMode = "paged" | "scroll";
type SearchableSidebarTab = Extract<SidebarTab, "map" | "list" | "brands">;

let hasAutoLocatedMapInPageSession = false;

interface AppProps {
  accessToken?: string;
  onSignOut?: () => Promise<void> | void;
  refreshToken?: string;
  viewerEmail?: string;
  viewerName?: string;
}

export default function App({
  accessToken = "",
  onSignOut,
  refreshToken = "",
  viewerEmail = "joe@acmecorp.com",
  viewerName = "Joe Doe"
}: AppProps): React.JSX.Element {
  const [pageRoute, setPageRoute] = useState<FluxaPageRoute>(() => {
    if (typeof window === "undefined") {
      return { view: "map" };
    }

    return parseFluxaPageRoute(window.location.pathname, window.location.search);
  });
  const [overlayView, setOverlayView] = useState<OverlayView | null>(null);
  const [cardAlbumCreateMode, setCardAlbumCreateMode] = useState(false);
  const [listSort, setListSort] = useState<"distance" | "updated">("distance");
  const [listPagingMode, setListPagingMode] = useState<ListPagingMode>("paged");
  const [searchQueries, setSearchQueries] = useState<Record<SearchableSidebarTab, string>>({
    map: "",
    list: "",
    brands: ""
  });
  const [brandDraftCount, setBrandDraftCount] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null);
  const [mapFocusLocation, setMapFocusLocation] = useState<LocationRecord | null>(null);
  const [mapFocusRequestKey, setMapFocusRequestKey] = useState(0);
  const [lastCreatedLocation, setLastCreatedLocation] = useState<LocationRecord | null>(null);
  const [lastCreatedBrand, setLastCreatedBrand] = useState<BrandRecord | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<BrandRecord | null>(null);
  const [locateRequestKey, setLocateRequestKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [initialMapLocatePending, setInitialMapLocatePending] = useState(false);
  const [hasVisitedMap, setHasVisitedMap] = useState(() => pageRoute.view === "map");
  const [shouldWarmMapPartitions, setShouldWarmMapPartitions] = useState(() => pageRoute.view === "map");
  const [mapTheme, setMapTheme] = useState<MapThemeKey>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MAP_THEME;
    }

    const storedTheme = window.localStorage.getItem(MAP_THEME_STORAGE_KEY);
    return storedTheme && isMapThemeKey(storedTheme) ? storedTheme : DEFAULT_MAP_THEME;
  });
  const [addLocationAutoReadMerchantNameEnabled, setAddLocationAutoReadMerchantNameEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(ADD_LOCATION_AUTO_READ_MERCHANT_NAME_STORAGE_KEY) === "true";
  });
  const [addLocationSmartAddEnabled, setAddLocationSmartAddEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(ADD_LOCATION_SMART_ADD_STORAGE_KEY) === "true";
  });
  const [mcpEnabled, setMcpEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(MCP_BETA_STORAGE_KEY) === "true";
  });
  const activeView: AppView = overlayView ?? pageRoute.view;
  const sidebarActiveTab: SidebarTab = isSidebarTab(activeView)
    ? activeView
    : isSidebarTab(pageRoute.view)
      ? pageRoute.view
      : pageRoute.view === "brandDetail"
        ? pageRoute.from || "brands"
        : pageRoute.from || "map";
  const currentSearchQuery =
    sidebarActiveTab === "map" || sidebarActiveTab === "list" || sidebarActiveTab === "brands"
      ? searchQueries[sidebarActiveTab]
      : "";
  const deferredSearchQuery = useDeferredValue(currentSearchQuery);
  const listUsesFullDirectory = activeView === "list" && listPagingMode === "scroll";
  const listUsesLightIndex = activeView === "list" && !listUsesFullDirectory;
  const fullLocationsEnabled =
    activeView === "history" ||
    activeView === "detail";
  const mapPartitionsEnabled = hasVisitedMap || activeView === "map" || shouldWarmMapPartitions;
  const listDirectoryEnabled = listUsesFullDirectory;
  const { locations, loading, saving, error, refreshLocations, createLocation, deleteLocation } = useFluxaLocations({
    enabled: fullLocationsEnabled
  });
  const {
    locations: listDirectoryLocations,
    loading: listDirectoryLoading,
    error: listDirectoryError,
    refreshDirectory: refreshListDirectory
  } = useFluxaLocationDirectory({
    enabled: listDirectoryEnabled
  });
  const {
    counts: listCounts,
    loading: listCountsLoading,
    error: listCountsError,
    refreshCounts: refreshListCounts
  } = useFluxaLocationCounts({
    enabled: listUsesLightIndex
  });
  const {
    indexPoints: listIndexPoints,
    loading: listIndexLoading,
    error: listIndexError,
    refreshIndex: refreshListIndex
  } = useFluxaLocationMapIndex({
    enabled: listUsesLightIndex
  });
  const {
    locations: locationSearchDirectory,
    loading: locationSearchLoading
  } = useFluxaLocationSearchDirectory({
    enabled: sidebarActiveTab === "map" || sidebarActiveTab === "list"
  });
  const {
    indexPoints: mapIndexPoints,
    locations: mapLocations,
    loading: mapLoading,
    error: mapError,
    summary: mapSummary,
    handleViewportChange: handleMapViewportChange,
    refreshVisiblePartitions
  } = useFluxaMapPartitions({
    enabled: mapPartitionsEnabled
  });
  const { brandOptions, saving: brandsSaving, createBrand } = useFluxaBrands();

  const navigatePage = (nextRoute: FluxaPageRoute, options?: { replace?: boolean }): void => {
    if (typeof window !== "undefined") {
      const nextPath = buildFluxaPagePath(nextRoute);
      const historyMethod = options?.replace ? "replaceState" : "pushState";
      window.history[historyMethod](null, "", nextPath);
    }

    setPageRoute(nextRoute);
    setOverlayView(null);
  };

  const openAddLocation = (): void => {
    setOverlayView("addLocation");
  };

  const openAddBrand = (): void => {
    setBrandDraftCount(0);
    setOverlayView("addBrand");
  };

  const openWebSettings = (): void => {
    setOverlayView("webSettings");
  };

  const openMcpSettings = (): void => {
    setOverlayView("mcpSettings");
  };

  const openCards = (options?: { create?: boolean }): void => {
    setCardAlbumCreateMode(Boolean(options?.create));
    setOverlayView("cards");
  };

  const openLocationDetail = (location: LocationRecord): void => {
    setSelectedLocation(location);
    navigatePage({
      view: "detail",
      locationId: location.id,
      from: sidebarActiveTab
    });
  };

  const openBrandDetail = (brand: BrandRecord): void => {
    setSelectedBrand(brand);
    navigatePage({
      view: "brandDetail",
      brandId: brand.id,
      from: sidebarActiveTab
    });
  };

  const handleCreateLocation = async (input: CreateLocationInput): Promise<void> => {
    const createdLocation = await createLocation(input);
    invalidateFluxaLocationCountsCache();
    invalidateFluxaLocationDirectoryCache();
    invalidateFluxaLocationMapIndexCache();
    invalidateFluxaLocationSearchDirectoryCache();
    invalidateFluxaMapPartitionCaches();
    setLastCreatedLocation(createdLocation);
    setSelectedLocation(createdLocation);
    setOverlayView("addLocationSuccess");
  };

  const handleCreateBrand = async (input: CreateBrandInput): Promise<void> => {
    const createdBrand = await createBrand(input);
    invalidateFluxaBrandDirectoryCache();
    setLastCreatedBrand(createdBrand);
    setOverlayView("addBrandSuccess");
  };

  const handleDeleteLocation = async (locationToDelete: LocationRecord): Promise<void> => {
    await deleteLocation(locationToDelete.id);
    invalidateFluxaLocationCountsCache();
    invalidateFluxaLocationDirectoryCache();
    invalidateFluxaLocationMapIndexCache();
    invalidateFluxaLocationSearchDirectoryCache();
    invalidateFluxaMapPartitionCaches();

    setSelectedLocation((current) => (current?.id === locationToDelete.id ? null : current));
    setMapFocusLocation((current) => (current?.id === locationToDelete.id ? null : current));
    setLastCreatedLocation((current) => (current?.id === locationToDelete.id ? null : current));

    const nextView = pageRoute.view === "detail" ? pageRoute.from || "map" : "map";
    navigatePage({ view: nextView });
  };

  const refreshListLightMode = async (): Promise<void> => {
    invalidateFluxaLocationCountsCache();
    invalidateFluxaLocationMapIndexCache();
    await Promise.all([refreshListCounts(), refreshListIndex()]);
  };

  const searchableLocations =
    sidebarActiveTab === "map"
      ? mapLocations
      : sidebarActiveTab === "list"
        ? listUsesFullDirectory
          ? listDirectoryLocations
          : []
        : locations;
  const canvasLocations = activeView === "map" ? mapLocations : locations;
  const locationSearchIndex = useMemo(() => buildLocationSearchIndex(locationSearchDirectory), [locationSearchDirectory]);
  const searchResults = useMemo(
    () =>
      sidebarActiveTab === "map" || sidebarActiveTab === "list"
        ? searchLocationSearchIndex(locationSearchIndex, deferredSearchQuery)
        : [],
    [deferredSearchQuery, locationSearchIndex, sidebarActiveTab]
  );
  const currentSearchSuggestions = useMemo(() => searchResults.slice(0, 8), [searchResults]);
  const currentSearchMatchedIds = useMemo(() => searchResults.map((result) => result.location.id), [searchResults]);
  const searchDirectoryById = useMemo(
    () => new Map(locationSearchDirectory.map((location) => [location.id, location])),
    [locationSearchDirectory]
  );
  const searchQuerySettled = deferredSearchQuery === currentSearchQuery;
  const displayedSearchSuggestions = searchQuerySettled ? currentSearchSuggestions : [];
  const searchSuggestionsLoading =
    (sidebarActiveTab === "map" || sidebarActiveTab === "list")
    && currentSearchQuery.trim().length > 0
    && (locationSearchLoading || !searchQuerySettled);
  const detailLocation = pageRoute.view === "detail" && pageRoute.locationId
    ? locations.find((location) => location.id === pageRoute.locationId)
      || (selectedLocation?.id === pageRoute.locationId ? selectedLocation : null)
      || (lastCreatedLocation?.id === pageRoute.locationId ? lastCreatedLocation : null)
    : null;
  const detailBrandFallback = pageRoute.view === "brandDetail" && pageRoute.brandId
    ? (selectedBrand?.id === pageRoute.brandId ? selectedBrand : null)
      || (lastCreatedBrand?.id === pageRoute.brandId ? lastCreatedBrand : null)
    : null;
  const {
    brand: detailBrand,
    loading: detailBrandLoading,
    error: detailBrandError
  } = useFluxaBrandRecord({
    brandId: pageRoute.view === "brandDetail" ? pageRoute.brandId : null,
    enabled: activeView === "brandDetail",
    initialBrand: detailBrandFallback
  });
  const {
    profile: viewerProfile,
    loading: viewerProfileLoading,
    saving: viewerProfileSaving,
    error: viewerProfileError,
    saveProfile: saveViewerProfile
  } = useViewerProfile({
    enabled: activeView === "profile",
    viewerEmailFallback: viewerEmail,
    viewerNameFallback: viewerName
  });

  const isFullCanvasPage = activeView === "profile" || activeView === "history";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const initialRoute = parseFluxaPageRoute(window.location.pathname, window.location.search);
    const canonicalPath = buildFluxaPagePath(initialRoute);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== canonicalPath) {
      window.history.replaceState(null, "", canonicalPath);
    }

    const handlePopState = () => {
      setPageRoute(parseFluxaPageRoute(window.location.pathname, window.location.search));
      setOverlayView(null);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (pageRoute.view !== "detail" || !pageRoute.locationId) {
      return;
    }

    const matchedLocation = locations.find((location) => location.id === pageRoute.locationId);
    if (matchedLocation) {
      setSelectedLocation(matchedLocation);
    }
  }, [locations, pageRoute.locationId, pageRoute.view]);

  useEffect(() => {
    if (activeView === "map") {
      setHasVisitedMap(true);
    }
  }, [activeView]);

  useEffect(() => {
    if (shouldWarmMapPartitions || hasVisitedMap || activeView === "map" || typeof window === "undefined") {
      return;
    }

    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;
    const warmMapPartitions = () => setShouldWarmMapPartitions(true);
    const requestIdleCallback = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback.bind(window) : null;
    const cancelIdleCallback = typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback.bind(window) : null;

    if (requestIdleCallback) {
      idleCallbackId = requestIdleCallback(warmMapPartitions, { timeout: 1800 });
    } else {
      timeoutId = window.setTimeout(warmMapPartitions, 1200);
    }

    return () => {
      if (idleCallbackId !== null && cancelIdleCallback) {
        cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeView, hasVisitedMap, shouldWarmMapPartitions]);

  useEffect(() => {
    if (activeView === "map" && !hasAutoLocatedMapInPageSession) {
      hasAutoLocatedMapInPageSession = true;
      setInitialMapLocatePending(true);
      setLocateRequestKey((prev) => prev + 1);
    }
  }, [activeView]);

  const handleLocatingChange = (nextLocating: boolean): void => {
    setLocating(nextLocating);
    if (!nextLocating && initialMapLocatePending) {
      setInitialMapLocatePending(false);
    }
  };

  const handleMapThemeChange = (theme: MapThemeKey): void => {
    setMapTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MAP_THEME_STORAGE_KEY, theme);
    }
  };

  const handleAddLocationAutoReadMerchantNameChange = (enabled: boolean): void => {
    setAddLocationAutoReadMerchantNameEnabled(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADD_LOCATION_AUTO_READ_MERCHANT_NAME_STORAGE_KEY, String(enabled));
    }
  };

  const handleAddLocationSmartAddChange = (enabled: boolean): void => {
    setAddLocationSmartAddEnabled(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADD_LOCATION_SMART_ADD_STORAGE_KEY, String(enabled));
    }
  };

  const handleMcpEnabledChange = (enabled: boolean): void => {
    setMcpEnabled(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MCP_BETA_STORAGE_KEY, String(enabled));
    }
  };

  const handleListPagingModeToggle = (): void => {
    setListPagingMode((prev) => (prev === "paged" ? "scroll" : "paged"));
  };

  const handleSearchSuggestionSelect = (locationId: string): void => {
    void (async () => {
      let matchedLocation =
        searchableLocations.find((location) => location.id === locationId)
        || locations.find((location) => location.id === locationId)
        || mapLocations.find((location) => location.id === locationId);
      const searchRecord = searchDirectoryById.get(locationId);

      if (!matchedLocation) {
        const fetchedLocations = await locationService.listLocationsByIds([locationId]);
        matchedLocation = fetchedLocations[0];
      }

      if (sidebarActiveTab === "map" || sidebarActiveTab === "list") {
        setSearchQueries((prev) => ({
          ...prev,
          [sidebarActiveTab]: matchedLocation?.name || searchRecord?.name || prev[sidebarActiveTab]
        }));
      }

      if (!matchedLocation) {
        return;
      }

      if (sidebarActiveTab === "map") {
        setSelectedLocation(matchedLocation);
        setMapFocusLocation(matchedLocation);
        setMapFocusRequestKey((prev) => prev + 1);
      }
    })();
  };

  return (
    <div className="h-dvh min-h-dvh w-full overflow-hidden bg-[var(--background)] font-sans text-[var(--foreground)]">
      <main className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-[var(--background)] md:flex-row">
        <FluxaSidebar
          activeTab={sidebarActiveTab}
          accessToken={accessToken}
          onAddBrand={openAddBrand}
          onAddCard={() => openCards({ create: true })}
          onAddLocation={openAddLocation}
          isCardsView={activeView === "cards"}
          onOpenAlbum={openCards}
          onOpenMcpSettings={openMcpSettings}
          onOpenSettings={openWebSettings}
          onSignOut={onSignOut}
          onTabChange={(tab) => navigatePage({ view: tab })}
          refreshToken={refreshToken}
          viewerEmail={viewerEmail}
          viewerName={viewerName}
        />

        {activeView === "detail" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <PlaceDetailWeb
              location={detailLocation}
              locationLoading={pageRoute.view === "detail" && Boolean(pageRoute.locationId) && loading && !detailLocation}
              onDeleteLocation={handleDeleteLocation}
              onViewMap={() => {
                if (detailLocation) {
                  setSelectedLocation(detailLocation);
                  setMapFocusLocation(detailLocation);
                  setMapFocusRequestKey((prev) => prev + 1);
                }
                navigatePage({ view: "map" });
              }}
            />
          </div>
        ) : null}

        {activeView === "brandDetail" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <BrandDetailWeb
              brand={detailBrand}
              error={detailBrandError}
              loading={detailBrandLoading}
              onBack={() => navigatePage({ view: "brands" })}
              onOpenLocation={openLocationDetail}
            />
          </div>
        ) : null}

        {activeView === "addLocation" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <AddLocationWizard
              autoReadMerchantNameEnabled={addLocationAutoReadMerchantNameEnabled}
              brandOptions={brandOptions}
              mapTheme={mapTheme}
              onCancel={() => setOverlayView(null)}
              onComplete={handleCreateLocation}
              saving={saving}
              smartAddEnabled={addLocationSmartAddEnabled}
            />
          </div>
        ) : null}

        {activeView === "addLocationSuccess" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <AddLocationSuccess
              location={lastCreatedLocation}
              onAddAnother={() => setOverlayView("addLocation")}
              onBack={() => setOverlayView(null)}
              onViewDetail={() => {
                if (!lastCreatedLocation) return;
                navigatePage({
                  view: "detail",
                  locationId: lastCreatedLocation.id,
                  from: sidebarActiveTab
                });
              }}
            />
          </div>
        ) : null}

        {activeView === "addBrand" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <AddBrandWizard
              onCancel={() => setOverlayView(null)}
              onComplete={handleCreateBrand}
              saving={brandsSaving}
            />
          </div>
        ) : null}

        {activeView === "addBrandSuccess" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <AddBrandSuccess
              brand={lastCreatedBrand}
              onAddAnother={() => setOverlayView("addBrand")}
              onBack={() => setOverlayView(null)}
              onViewDetail={() => {
                if (!lastCreatedBrand) return;
                openBrandDetail(lastCreatedBrand);
              }}
            />
          </div>
        ) : null}

        {activeView === "webSettings" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <WebSettings
              addLocationAutoReadMerchantNameEnabled={addLocationAutoReadMerchantNameEnabled}
              addLocationSmartAddEnabled={addLocationSmartAddEnabled}
              mapTheme={mapTheme}
              onAddLocationAutoReadMerchantNameChange={handleAddLocationAutoReadMerchantNameChange}
              onAddLocationSmartAddChange={handleAddLocationSmartAddChange}
              onMapThemeChange={handleMapThemeChange}
            />
          </div>
        ) : null}

        {activeView === "mcpSettings" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <WebMcpSettings
              mcpEnabled={mcpEnabled}
              onMcpEnabledChange={handleMcpEnabledChange}
            />
          </div>
        ) : null}

        {activeView === "cards" ? (
          <div className="tab-switch-enter flex min-h-0 min-w-0 flex-1">
            <CardsAlbumWeb
              onCreateModeChange={setCardAlbumCreateMode}
              startInCreateMode={cardAlbumCreateMode}
            />
          </div>
        ) : null}

        <section className={`${isSidebarTab(activeView) ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4`}>
            {!isFullCanvasPage ? (
              <FluxaHeader
                activeTab={sidebarActiveTab}
                listPagingMode={listPagingMode}
                listSort={listSort}
                locating={locating}
                searchQuery={currentSearchQuery}
                searchLoading={searchSuggestionsLoading}
                searchSuggestions={displayedSearchSuggestions}
                onListPagingModeToggle={handleListPagingModeToggle}
                onListSortChange={setListSort}
                onLocate={() => setLocateRequestKey((prev) => prev + 1)}
                onSearchQueryChange={
                  sidebarActiveTab === "map" || sidebarActiveTab === "list" || sidebarActiveTab === "brands"
                    ? (value) =>
                        setSearchQueries((prev) => ({
                          ...prev,
                          [sidebarActiveTab]: value
                        }))
                    : undefined
                }
                onSearchSuggestionSelect={handleSearchSuggestionSelect}
              />
            ) : null}

            <div className="flex min-h-0 w-full flex-1">
              <div className="flex min-h-0 w-full flex-1">
                <FluxaMapCanvas
                  activeTab={sidebarActiveTab}
                  brandDraftCount={brandDraftCount}
                  error={
                    activeView === "map"
                      ? mapError
                      : activeView === "list"
                        ? listUsesFullDirectory
                          ? listDirectoryError
                          : listCountsError || listIndexError
                        : error
                  }
                  listPagingMode={listPagingMode}
                  listSort={listSort}
                  listDirectoryLocations={listDirectoryLocations}
                  loading={
                    activeView === "map"
                      ? mapLoading
                      : activeView === "list"
                        ? listUsesFullDirectory
                          ? listDirectoryLoading
                          : listCountsLoading || listIndexLoading
                        : loading
                  }
                  listCounts={listCounts}
                  locateRequestKey={locateRequestKey}
                  locations={canvasLocations}
                  mapIndexPoints={activeView === "list" ? listIndexPoints : mapIndexPoints}
                  locationSearchDirectory={locationSearchDirectory}
                  mapSummary={mapSummary}
                  mapTheme={mapTheme}
                  mapFocusLocation={mapFocusLocation}
                  mapFocusRequestKey={mapFocusRequestKey}
                  suppressInitialMapViewportSync={initialMapLocatePending}
                  onLocatingChange={handleLocatingChange}
                  onMapViewportChange={handleMapViewportChange}
                  onOpenBrandDetail={openBrandDetail}
                  onOpenDetail={openLocationDetail}
                  onRefresh={activeView === "map" ? refreshVisiblePartitions : activeView === "list" ? (listUsesFullDirectory ? refreshListDirectory : refreshListLightMode) : refreshLocations}
                  searchMatchedIds={currentSearchMatchedIds}
                  searchQuery={currentSearchQuery}
                  viewerProfile={viewerProfile}
                  viewerProfileError={viewerProfileError}
                  viewerProfileLoading={viewerProfileLoading}
                  viewerProfileSaving={viewerProfileSaving}
                  onSaveViewerProfile={saveViewerProfile}
                />
              </div>
            </div>
          </section>
      </main>
    </div>
  );
}
