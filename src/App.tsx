import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { AddLocationSuccess } from "@/components/add-location-success";
import { AddLocationWizard } from "@/components/add-location-wizard";
import { CardsAlbumWeb } from "@/components/cards-album-web";
import { FluxaHeader } from "@/components/fluxa-header";
import { FluxaMapCanvas } from "@/components/fluxa-map-canvas";
import { WebMcpSettings } from "@/components/web-mcp-settings";
import { PlaceDetailWeb } from "@/components/place-detail-web";
import { FluxaSidebar, type SidebarTab } from "@/components/fluxa-sidebar";
import { WebSettings } from "@/components/web-settings";
import { useFluxaBrands } from "@/hooks/use-fluxa-brands";
import { useFluxaLocations } from "@/hooks/use-fluxa-locations";
import { useViewerProfile } from "@/hooks/use-viewer-profile";
import { buildLocationSearchResults } from "@/lib/location-search";
import { buildFluxaPagePath, isSidebarTab, parseFluxaPageRoute, type FluxaPageRoute, type FluxaPageView } from "@/lib/fluxa-routes";
import { DEFAULT_MAP_THEME, isMapThemeKey, MAP_THEME_STORAGE_KEY, type MapThemeKey } from "@/lib/map-theme";
import type { CreateLocationInput, LocationRecord } from "@/types/location";

const ADD_LOCATION_AUTO_READ_MERCHANT_NAME_STORAGE_KEY = "fluxa_add_location_auto_read_merchant_name_beta";
const ADD_LOCATION_SMART_ADD_STORAGE_KEY = "fluxa_add_location_smart_add_beta";
const MCP_BETA_STORAGE_KEY = "fluxa_mcp_beta_enabled";

type OverlayView = "cards" | "addLocation" | "addLocationSuccess" | "webSettings" | "mcpSettings";
type AppView = FluxaPageView | OverlayView;
type ListPagingMode = "paged" | "scroll";
type SearchableSidebarTab = Extract<SidebarTab, "map" | "list" | "brands">;

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
  const [locateRequestKey, setLocateRequestKey] = useState(0);
  const [locating, setLocating] = useState(false);
  const [hasAutoLocatedMap, setHasAutoLocatedMap] = useState(false);
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
  const { locations, loading, saving, error, refreshLocations, createLocation } = useFluxaLocations();
  const { brands, brandOptions, loading: brandsLoading, error: brandsError } = useFluxaBrands();

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

  const handleCreateLocation = async (input: CreateLocationInput): Promise<void> => {
    const createdLocation = await createLocation(input);
    setLastCreatedLocation(createdLocation);
    setSelectedLocation(createdLocation);
    setOverlayView("addLocationSuccess");
  };

  const activeView: AppView = overlayView ?? pageRoute.view;
  const sidebarActiveTab: SidebarTab = isSidebarTab(activeView)
    ? activeView
    : isSidebarTab(pageRoute.view)
      ? pageRoute.view
      : pageRoute.from || "map";
  const currentSearchQuery =
    sidebarActiveTab === "map" || sidebarActiveTab === "list" || sidebarActiveTab === "brands"
      ? searchQueries[sidebarActiveTab]
      : "";
  const currentSearchSuggestions = useMemo(
    () => (sidebarActiveTab === "map" || sidebarActiveTab === "list" ? buildLocationSearchResults(locations, currentSearchQuery) : []),
    [currentSearchQuery, locations, sidebarActiveTab]
  );
  const detailLocation = pageRoute.view === "detail" && pageRoute.locationId
    ? locations.find((location) => location.id === pageRoute.locationId)
      || (selectedLocation?.id === pageRoute.locationId ? selectedLocation : null)
      || (lastCreatedLocation?.id === pageRoute.locationId ? lastCreatedLocation : null)
    : null;
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
    if (activeView === "map" && !hasAutoLocatedMap) {
      setLocateRequestKey((prev) => prev + 1);
      setHasAutoLocatedMap(true);
    }
  }, [activeView, hasAutoLocatedMap]);

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
    const matchedLocation = locations.find((location) => location.id === locationId);
    if (!matchedLocation) {
      return;
    }

    if (sidebarActiveTab === "map" || sidebarActiveTab === "list") {
      setSearchQueries((prev) => ({
        ...prev,
        [sidebarActiveTab]: matchedLocation.name
      }));
    }

    if (sidebarActiveTab === "map") {
      setSelectedLocation(matchedLocation);
      setMapFocusLocation(matchedLocation);
      setMapFocusRequestKey((prev) => prev + 1);
    }
  };

  return (
    <div className="h-dvh min-h-dvh w-full overflow-hidden bg-[var(--background)] font-sans text-[var(--foreground)]">
      <main className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-[var(--background)] md:flex-row">
        <FluxaSidebar
          activeTab={sidebarActiveTab}
          accessToken={accessToken}
          onAddBrand={() => setBrandDraftCount((prev) => prev + 1)}
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
                searchSuggestions={currentSearchSuggestions}
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
                  brands={brands}
                  brandDraftCount={brandDraftCount}
                  error={sidebarActiveTab === "brands" ? brandsError || error : error}
                  listPagingMode={listPagingMode}
                  listSort={listSort}
                  loading={sidebarActiveTab === "brands" ? brandsLoading : loading}
                  locateRequestKey={locateRequestKey}
                  locations={locations}
                  mapTheme={mapTheme}
                  mapFocusLocation={mapFocusLocation}
                  mapFocusRequestKey={mapFocusRequestKey}
                  onLocatingChange={setLocating}
                  onOpenDetail={openLocationDetail}
                  onRefresh={refreshLocations}
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
