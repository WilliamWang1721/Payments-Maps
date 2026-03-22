export type LocationSearchMatchField =
  | "name"
  | "brand"
  | "address"
  | "city"
  | "id"
  | "notes"
  | "addedBy"
  | "network";

export interface LocationSearchableRecord {
  id: string;
  name: string;
  address: string;
  brand: string;
  city: string;
  updatedAt: string;
  notes?: string;
  addedBy?: string;
  supportedNetworks?: string[];
}

export interface LocationSearchResult<TRecord extends LocationSearchableRecord = LocationSearchableRecord> {
  location: TRecord;
  matchedFields: LocationSearchMatchField[];
  score: number;
}

interface IndexedField {
  compact: string;
  tokens: string[];
  value: string;
}

interface IndexedLocationRecord<TRecord extends LocationSearchableRecord> {
  location: TRecord;
  fields: Record<LocationSearchMatchField, IndexedField>;
  searchableCompactText: string;
  searchableText: string;
}

interface SearchOptions {
  limit?: number;
}

const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_PATTERN = /[^\p{L}\p{N}]+/gu;

const MATCH_FIELD_PRIORITY: Record<LocationSearchMatchField, number> = {
  name: 0,
  brand: 1,
  address: 2,
  city: 3,
  id: 4,
  notes: 5,
  addedBy: 6,
  network: 7
};

function normalizeForSearch(value: string | undefined): string {
  return (value || "")
    .normalize("NFKD")
    .replace(DIACRITIC_PATTERN, "")
    .toLocaleLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactForSearch(value: string | undefined): string {
  return normalizeForSearch(value).replace(/\s+/g, "");
}

function tokenizeForSearch(value: string | undefined): string[] {
  const normalized = normalizeForSearch(value);
  return normalized ? normalized.split(" ") : [];
}

function createIndexedField(value: string | undefined): IndexedField {
  const normalized = normalizeForSearch(value);

  return {
    compact: normalized.replace(/\s+/g, ""),
    tokens: normalized ? normalized.split(" ") : [],
    value: normalized
  };
}

function createIndexedLocationRecord<TRecord extends LocationSearchableRecord>(location: TRecord): IndexedLocationRecord<TRecord> {
  const fields: Record<LocationSearchMatchField, IndexedField> = {
    name: createIndexedField(location.name),
    brand: createIndexedField(location.brand),
    address: createIndexedField(location.address),
    city: createIndexedField(location.city),
    id: createIndexedField(location.id),
    notes: createIndexedField(location.notes),
    addedBy: createIndexedField(location.addedBy),
    network: createIndexedField((location.supportedNetworks || []).join(" "))
  };
  const searchableText = [
    fields.name.value,
    fields.brand.value,
    fields.address.value,
    fields.city.value,
    fields.id.value,
    fields.notes.value,
    fields.addedBy.value,
    fields.network.value
  ]
    .filter(Boolean)
    .join(" ");

  return {
    location,
    fields,
    searchableCompactText: searchableText.replace(/\s+/g, ""),
    searchableText
  };
}

function compareSearchResults<TRecord extends LocationSearchableRecord>(left: LocationSearchResult<TRecord>, right: LocationSearchResult<TRecord>): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

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

function matchesQueryTokens(field: IndexedField, normalizedQuery: string, compactQuery: string, queryTokens: string[]): boolean {
  if (!field.value) {
    return false;
  }

  if (field.value.includes(normalizedQuery) || field.compact.includes(compactQuery)) {
    return true;
  }

  return queryTokens.every((token) => field.tokens.some((fieldToken) => fieldToken.startsWith(token)));
}

function getFieldMatchScore(field: IndexedField, normalizedQuery: string, compactQuery: string, queryTokens: string[]): number | null {
  if (!field.value || !matchesQueryTokens(field, normalizedQuery, compactQuery, queryTokens)) {
    return null;
  }

  if (field.value === normalizedQuery || field.compact === compactQuery) {
    return 1200;
  }

  if (field.value.startsWith(normalizedQuery) || field.compact.startsWith(compactQuery)) {
    return 960;
  }

  if (field.tokens.some((token) => token.startsWith(normalizedQuery) || token.startsWith(compactQuery))) {
    return 840;
  }

  if (queryTokens.every((token) => field.tokens.some((fieldToken) => fieldToken.startsWith(token)))) {
    return 720;
  }

  return 560;
}

function getSearchResultFromIndex<TRecord extends LocationSearchableRecord>(
  indexedLocation: IndexedLocationRecord<TRecord>,
  searchQuery: string
): LocationSearchResult<TRecord> | null {
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);

  if (!normalizedSearchQuery) {
    return null;
  }

  const compactQuery = compactForSearch(normalizedSearchQuery);
  const queryTokens = tokenizeForSearch(normalizedSearchQuery);

  if (
    queryTokens.length > 1
    && !queryTokens.every((token) =>
      indexedLocation.searchableText.includes(token) || indexedLocation.searchableCompactText.includes(token)
    )
  ) {
    return null;
  }

  const matchedFields: LocationSearchMatchField[] = [];
  let bestScore = 0;

  (Object.keys(indexedLocation.fields) as LocationSearchMatchField[]).forEach((field) => {
    const fieldScore = getFieldMatchScore(indexedLocation.fields[field], normalizedSearchQuery, compactQuery, queryTokens);
    if (fieldScore === null) {
      return;
    }

    matchedFields.push(field);
    bestScore = Math.max(bestScore, fieldScore - MATCH_FIELD_PRIORITY[field] * 14);
  });

  if (matchedFields.length === 0) {
    return null;
  }

  return {
    location: indexedLocation.location,
    matchedFields,
    score: bestScore
  };
}

export function normalizeLocationSearchQuery(value: string): string {
  return normalizeForSearch(value);
}

export function buildLocationSearchIndex<TRecord extends LocationSearchableRecord>(locations: TRecord[]): IndexedLocationRecord<TRecord>[] {
  return locations.map(createIndexedLocationRecord);
}

export function getLocationSearchResult<TRecord extends LocationSearchableRecord>(
  location: TRecord,
  searchQuery: string
): LocationSearchResult<TRecord> | null {
  return getSearchResultFromIndex(createIndexedLocationRecord(location), searchQuery);
}

export function searchLocationSearchIndex<TRecord extends LocationSearchableRecord>(
  searchIndex: IndexedLocationRecord<TRecord>[],
  searchQuery: string,
  options: SearchOptions = {}
): LocationSearchResult<TRecord>[] {
  const normalizedSearchQuery = normalizeLocationSearchQuery(searchQuery);

  if (!normalizedSearchQuery) {
    return [];
  }

  const results = searchIndex
    .map((indexedLocation) => getSearchResultFromIndex(indexedLocation, normalizedSearchQuery))
    .filter((result): result is LocationSearchResult<TRecord> => Boolean(result))
    .sort(compareSearchResults);

  return typeof options.limit === "number" ? results.slice(0, options.limit) : results;
}

export function buildLocationSearchResults<TRecord extends LocationSearchableRecord>(
  locations: TRecord[],
  searchQuery: string,
  options: SearchOptions = {}
): LocationSearchResult<TRecord>[] {
  return searchLocationSearchIndex(buildLocationSearchIndex(locations), searchQuery, options);
}

export function filterLocationsBySearch<TRecord extends LocationSearchableRecord>(locations: TRecord[], searchQuery: string): TRecord[] {
  return buildLocationSearchResults(locations, searchQuery).map((result) => result.location);
}
