import type { LocationRecord } from "@/types/location";

export type LocationSearchMatchField =
  | "name"
  | "notes"
  | "city"
  | "address"
  | "brand"
  | "bin"
  | "id"
  | "network"
  | "addedBy";

export interface LocationSearchResult {
  location: LocationRecord;
  matchedFields: LocationSearchMatchField[];
}

const MATCH_FIELD_PRIORITY: Record<LocationSearchMatchField, number> = {
  name: 0,
  notes: 1,
  city: 2,
  brand: 3,
  address: 4,
  bin: 5,
  id: 6,
  network: 7,
  addedBy: 8
};

function includesQuery(value: string | undefined, normalizedSearchQuery: string): boolean {
  return Boolean(value && value.toLocaleLowerCase().includes(normalizedSearchQuery));
}

function compareSearchResults(left: LocationSearchResult, right: LocationSearchResult): number {
  const leftPriority = Math.min(...left.matchedFields.map((field) => MATCH_FIELD_PRIORITY[field]));
  const rightPriority = Math.min(...right.matchedFields.map((field) => MATCH_FIELD_PRIORITY[field]));

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const updatedDelta = new Date(right.location.updatedAt).getTime() - new Date(left.location.updatedAt).getTime();
  if (updatedDelta !== 0) {
    return updatedDelta;
  }

  return left.location.name.localeCompare(right.location.name, "zh-CN");
}

export function normalizeLocationSearchQuery(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function getLocationSearchResult(location: LocationRecord, searchQuery: string): LocationSearchResult | null {
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);

  if (!normalizedSearchQuery) {
    return null;
  }

  const matchedFields: LocationSearchMatchField[] = [];

  if (includesQuery(location.name, normalizedSearchQuery)) {
    matchedFields.push("name");
  }
  if (includesQuery(location.notes, normalizedSearchQuery)) {
    matchedFields.push("notes");
  }
  if (includesQuery(location.city, normalizedSearchQuery)) {
    matchedFields.push("city");
  }
  if (includesQuery(location.address, normalizedSearchQuery)) {
    matchedFields.push("address");
  }
  if (includesQuery(location.brand, normalizedSearchQuery)) {
    matchedFields.push("brand");
  }
  if (includesQuery(location.bin, normalizedSearchQuery)) {
    matchedFields.push("bin");
  }
  if (includesQuery(location.id, normalizedSearchQuery)) {
    matchedFields.push("id");
  }
  if (includesQuery(location.addedBy, normalizedSearchQuery)) {
    matchedFields.push("addedBy");
  }
  if ((location.supportedNetworks || []).some((network) => includesQuery(network, normalizedSearchQuery))) {
    matchedFields.push("network");
  }

  if (matchedFields.length === 0) {
    return null;
  }

  return {
    location,
    matchedFields
  };
}

export function buildLocationSearchResults(locations: LocationRecord[], searchQuery: string): LocationSearchResult[] {
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);

  if (!normalizedSearchQuery) {
    return [];
  }

  return locations
    .map((location) => getLocationSearchResult(location, normalizedSearchQuery))
    .filter((result): result is LocationSearchResult => Boolean(result))
    .sort(compareSearchResults);
}

export function filterLocationsBySearch(locations: LocationRecord[], searchQuery: string): LocationRecord[] {
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);

  if (!normalizedSearchQuery) {
    return locations;
  }

  return buildLocationSearchResults(locations, normalizedSearchQuery).map((result) => result.location);
}
