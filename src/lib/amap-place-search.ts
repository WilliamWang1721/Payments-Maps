import { loadAMap } from "@/lib/amap";
import type { AMapPlaceSearchResult } from "@/types/add-location-assistant";

interface SearchPlacesInput {
  city?: string;
  keywords: string;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildAddress(poi: any): string {
  const parts = [
    normalizeString(poi?.pname),
    normalizeString(poi?.cityname),
    normalizeString(poi?.adname),
    normalizeString(poi?.address)
  ].filter(Boolean);

  return parts.join("") || normalizeString(poi?.name);
}

function resolveCity(poi: any): string {
  return normalizeString(poi?.cityname) || normalizeString(poi?.adname) || normalizeString(poi?.pname);
}

function resolveCoordinates(poi: any): { lat: number; lng: number } | null {
  if (typeof poi?.location === "string") {
    const [lng, lat] = poi.location.split(",").map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  const lng = typeof poi?.location?.lng === "number" ? poi.location.lng : Number(poi?.location?.lng);
  const lat = typeof poi?.location?.lat === "number" ? poi.location.lat : Number(poi?.location?.lat);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }

  return null;
}

export async function searchAMapPlaces({ city, keywords }: SearchPlacesInput): Promise<AMapPlaceSearchResult[]> {
  const normalizedKeywords = keywords.trim();
  if (!normalizedKeywords) {
    return [];
  }

  const AMap = await loadAMap();

  return new Promise((resolve) => {
    AMap.plugin("AMap.PlaceSearch", () => {
      let placeSearch: any;

      try {
        placeSearch = new AMap.PlaceSearch({
          city: city?.trim() || "",
          citylimit: Boolean(city?.trim()),
          extensions: "all",
          pageIndex: 1,
          pageSize: 5
        });
      } catch {
        resolve([]);
        return;
      }

      placeSearch.search(normalizedKeywords, (_status: string, result: any) => {
        const pois = Array.isArray(result?.poiList?.pois) ? result.poiList.pois : [];

        resolve(
          pois
            .map((poi: any, index: number) => {
              const coordinates = resolveCoordinates(poi);
              if (!coordinates) {
                return null;
              }

              return {
                id: normalizeString(poi?.id) || `${normalizedKeywords}-${index}`,
                name: normalizeString(poi?.name) || "未命名地点",
                address: buildAddress(poi),
                city: resolveCity(poi),
                district: normalizeString(poi?.adname),
                province: normalizeString(poi?.pname),
                lat: coordinates.lat,
                lng: coordinates.lng,
                type: normalizeString(poi?.type)
              } satisfies AMapPlaceSearchResult;
            })
            .filter((item: AMapPlaceSearchResult | null): item is AMapPlaceSearchResult => Boolean(item))
        );
      });
    });
  });
}
