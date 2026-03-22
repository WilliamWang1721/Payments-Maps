import type { MapAreaResolutionRecord, MapBrandLocationCandidate, MapBrandLocationSearchRecord } from "./types.js";
import os from "node:os";
import path from "node:path";

interface ResolveAreaOptions {
  area: string;
  countryCode?: string;
}

interface SearchBrandLocationsOptions extends ResolveAreaOptions {
  brand: string;
  brandAliases?: string[];
  limit?: number;
}

interface DedupeContext {
  brand?: string;
  area?: string;
}

interface AMapBrowserPoi {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  province: string;
  adcode?: string;
  citycode?: string;
  lat: number;
  lng: number;
  type: string;
}

interface AMapAreaResolution {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  district?: string;
  city_district?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface NominatimResult {
  place_id: number | string;
  lat: string;
  lon: string;
  category: string;
  type: string;
  name?: string;
  display_name?: string;
  boundingbox?: string[];
  address?: NominatimAddress;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_USER_AGENT = process.env.MCP_MAP_SEARCH_USER_AGENT?.trim() || "FluxaMapMCP/1.0 (+https://payments-maps.asia)";
const DEFAULT_ACCEPT_LANGUAGE = "zh-CN,zh;q=0.9,en;q=0.8";
const EXCLUDED_CATEGORIES = new Set(["boundary", "place", "highway", "railway", "waterway", "natural", "landuse"]);
const CHROME_EXECUTABLE_PATH =
  process.env.MCP_MAP_SEARCH_CHROME_PATH?.trim() || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const AMAP_JS_KEY = process.env.VITE_AMAP_KEY?.trim();
const AMAP_SECURITY_JS_CODE =
  process.env.VITE_AMAP_SECURITY_JS_CODE?.trim() || process.env.VITE_AMAP_SECURITY_KEY?.trim();

function clampLimit(limit: number | undefined, fallback: number, max: number): number {
  const numericLimit = typeof limit === "number" ? Math.trunc(limit) : fallback;
  if (!Number.isFinite(numericLimit)) {
    return fallback;
  }
  return Math.min(Math.max(numericLimit, 1), max);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparisonText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function normalizeLocationToken(value: unknown): string {
  const normalized = normalizeString(value)
    .replaceAll("零", "0")
    .replaceAll("〇", "0")
    .replaceAll("一", "1")
    .replaceAll("二", "2")
    .replaceAll("两", "2")
    .replaceAll("三", "3")
    .replaceAll("四", "4")
    .replaceAll("五", "5")
    .replaceAll("六", "6")
    .replaceAll("七", "7")
    .replaceAll("八", "8")
    .replaceAll("九", "9");

  return normalizeComparisonText(normalized);
}

function normalizeAdministrativeName(value: string): string {
  return normalizeComparisonText(value).replace(/(特别行政区|自治区|自治州|地区|盟|省|市|区|县|旗)$/u, "");
}

function buildAdministrativeTokenVariants(value: unknown): string[] {
  const normalized = normalizeString(value);
  if (!normalized) {
    return [];
  }

  return Array.from(new Set([normalizeComparisonText(normalized), normalizeAdministrativeName(normalized)].filter(Boolean)));
}

function buildAddressFromDisplayName(name: string, displayName: string): string {
  if (!displayName) {
    return name;
  }

  if (name && displayName.startsWith(name)) {
    const trimmed = displayName.slice(name.length).replace(/^,\s*/, "").trim();
    return trimmed || displayName;
  }

  return displayName;
}

function parseCoordinate(value: string | number | undefined): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseBounds(boundingbox: string[] | undefined):
  | {
      south: number;
      west: number;
      north: number;
      east: number;
    }
  | null {
  if (!Array.isArray(boundingbox) || boundingbox.length < 4) {
    return null;
  }

  const south = parseCoordinate(boundingbox[0]);
  const north = parseCoordinate(boundingbox[1]);
  const west = parseCoordinate(boundingbox[2]);
  const east = parseCoordinate(boundingbox[3]);
  if (south === null || north === null || west === null || east === null) {
    return null;
  }

  return { south, west, north, east };
}

function isPointInsideBounds(
  lat: number,
  lng: number,
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  }
): boolean {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}

function buildSearchVariants(brand: string, aliases?: string[]): string[] {
  return Array.from(
    new Set([brand, ...(aliases || [])].map((value) => normalizeString(value)).filter(Boolean))
  ).slice(0, 5);
}

function buildAreaMatchers(areaQuery: string, resolvedArea: MapAreaResolutionRecord): string[] {
  return Array.from(
    new Set(
      [areaQuery, resolvedArea.name, resolvedArea.displayName.split(",")[0]]
        .map((value) => normalizeComparisonText(normalizeString(value)))
        .filter(Boolean)
    )
  );
}

async function fetchNominatimJson(params: URLSearchParams): Promise<NominatimResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`, {
      headers: {
        "user-agent": DEFAULT_USER_AGENT,
        "accept-language": DEFAULT_ACCEPT_LANGUAGE
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Map search request failed with status ${response.status}.`);
    }

    const json = (await response.json()) as unknown;
    return Array.isArray(json) ? (json as NominatimResult[]) : [];
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Map search request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickBestAreaResult(results: NominatimResult[]): NominatimResult | null {
  const preferred = results.find((result) => {
    const category = normalizeString(result.category);
    const type = normalizeString(result.type);
    return category === "boundary" || type === "administrative" || type === "city" || type === "town";
  });

  return preferred || results[0] || null;
}

function mapAreaResult(areaQuery: string, result: NominatimResult): MapAreaResolutionRecord {
  const bounds = parseBounds(result.boundingbox);
  const lat = parseCoordinate(result.lat);
  const lng = parseCoordinate(result.lon);

  if (!bounds || lat === null || lng === null) {
    throw new Error(`Unable to resolve area bounds for ${areaQuery}.`);
  }

  return {
    provider: "nominatim",
    name: normalizeString(result.name) || areaQuery,
    displayName: normalizeString(result.display_name) || areaQuery,
    lat,
    lng,
    bounds,
    category: normalizeString(result.category),
    type: normalizeString(result.type)
  };
}

function mapCandidate(result: NominatimResult, bounds: MapAreaResolutionRecord["bounds"]): MapBrandLocationCandidate | null {
  const lat = parseCoordinate(result.lat);
  const lng = parseCoordinate(result.lon);
  if (lat === null || lng === null || !isPointInsideBounds(lat, lng, bounds)) {
    return null;
  }

  const category = normalizeString(result.category);
  if (EXCLUDED_CATEGORIES.has(category)) {
    return null;
  }

  const name = normalizeString(result.name);
  const displayName = normalizeString(result.display_name);
  if (!name || !displayName) {
    return null;
  }

  const address = result.address || {};
  return {
    provider: "nominatim",
    providerId: String(result.place_id),
    name,
    address: buildAddressFromDisplayName(name, displayName),
    city:
      normalizeString(address.city) ||
      normalizeString(address.town) ||
      normalizeString(address.village) ||
      normalizeString(address.county),
    district:
      normalizeString(address.district) ||
      normalizeString(address.city_district) ||
      normalizeString(address.suburb) ||
      normalizeString(address.county),
    state: normalizeString(address.state),
    postcode: normalizeString(address.postcode) || undefined,
    country: normalizeString(address.country),
    lat,
    lng,
    category,
    type: normalizeString(result.type),
    displayName
  };
}

function candidateMatchesBrand(candidate: MapBrandLocationCandidate, variants: string[]): boolean {
  const haystack = normalizeComparisonText([candidate.name, candidate.address, candidate.displayName].join(" "));
  return variants.some((variant) => haystack.includes(normalizeComparisonText(variant)));
}

function candidateMatchesArea(candidate: MapBrandLocationCandidate, matchers: string[]): boolean {
  if (matchers.length === 0) {
    return true;
  }

  const haystack = normalizeComparisonText(
    [candidate.address, candidate.displayName, candidate.city, candidate.district, candidate.state, candidate.country].join(" ")
  );
  return matchers.some((matcher) => haystack.includes(matcher));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(
  left: Pick<MapBrandLocationCandidate, "lat" | "lng">,
  right: Pick<MapBrandLocationCandidate, "lat" | "lng">
): number {
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const leftLat = toRadians(left.lat);
  const rightLat = toRadians(right.lat);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function buildNormalizedAddressKey(candidate: Pick<MapBrandLocationCandidate, "address" | "city" | "district" | "state" | "country">): string {
  const combined = [
    normalizeString(candidate.state),
    normalizeString(candidate.city),
    normalizeString(candidate.district),
    normalizeString(candidate.address)
  ]
    .filter(Boolean)
    .join("");
  return normalizeLocationToken(combined);
}

function extractCommercialComplexToken(value: string): string {
  const normalized = normalizeString(value);
  if (!normalized) {
    return "";
  }

  const patterns = [
    /([\p{Script=Han}A-Za-z0-9]{2,24}(?:购物中心|奥特莱斯|奥莱|万象城|万象汇|万达广场|广场|商城|商场|中心|天地))/gu,
    /([\p{Script=Han}A-Za-z0-9]{2,24}(?:机场|火车站|高铁站|航站楼))/gu
  ];

  for (const pattern of patterns) {
    const matches = Array.from(normalized.matchAll(pattern)).map((match) => normalizeLocationToken(match[1])).filter(Boolean);
    if (matches.length > 0) {
      return matches.sort((left, right) => left.length - right.length)[0];
    }
  }

  return "";
}

function collectAddressTokens(value: string, pattern: RegExp): string[] {
  return Array.from(normalizeString(value).matchAll(pattern))
    .map((match) => normalizeLocationToken(match[0]))
    .filter(Boolean);
}

function buildStoreNameAddressVariants(name: string): string[] {
  const normalizedName = normalizeString(name);
  if (!normalizedName) {
    return [];
  }

  const variants = new Set<string>([
    normalizedName,
    normalizedName.replace(/^星巴克(?:咖啡)?/u, "").trim()
  ]);
  const bracketMatch = normalizedName.match(/[（(]([^()（）]+)[)）]/u);
  if (bracketMatch?.[1]) {
    variants.add(bracketMatch[1].trim());
  }

  return Array.from(variants)
    .map((variant) => variant.trim())
    .filter((variant) => variant.length >= 3);
}

function cleanCandidateAddress(address: string, name: string): string {
  let cleaned = normalizeString(address)
    .replace(/[，,]+/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

  if (!cleaned) {
    return cleaned;
  }

  for (const variant of buildStoreNameAddressVariants(name)) {
    if (cleaned.endsWith(variant)) {
      cleaned = cleaned.slice(0, cleaned.length - variant.length).trim();
    }
  }

  return cleaned.replace(/[（(]\s*[)）]\s*$/u, "").trim();
}

function buildAddressTokenSet(candidate: Pick<MapBrandLocationCandidate, "address" | "name">): Set<string> {
  const tokens = new Set<string>();

  const complexToken = extractCommercialComplexToken(candidate.address) || extractCommercialComplexToken(candidate.name);
  if (complexToken) {
    tokens.add(complexToken);
  }

  [
    ...collectAddressTokens(candidate.address, /[\p{Script=Han}A-Za-z0-9]{2,24}(?:路|街|大道|大街|道|巷|胡同|弄|里)/gu),
    ...collectAddressTokens(candidate.address, /\d+[A-Za-z0-9-]*(?:号|号院|号楼|号门|号口)/gu),
    ...collectAddressTokens(candidate.address, /(?:[A-Za-z]?\d+[A-Za-z0-9-]*|[零〇一二两三四五六七八九十]{1,4})(?:层|楼|座|栋|期|单元|室|铺|号门)/gu)
  ].forEach((token) => {
    tokens.add(token);
  });

  return tokens;
}

function buildSpecificAddressTokens(candidate: Pick<MapBrandLocationCandidate, "address">) {
  return {
    houseNumbers: new Set(collectAddressTokens(candidate.address, /\d+[A-Za-z0-9-]*(?:号|号院|号楼|号门|号口)/gu)),
    detailTokens: new Set(
      collectAddressTokens(candidate.address, /(?:[A-Za-z]?\d+[A-Za-z0-9-]*|[零〇一二两三四五六七八九十]{1,4})(?:层|楼|座|栋|期|单元|室|铺|号门)/gu)
    )
  };
}

function hasTokenIntersection(left: Set<string>, right: Set<string>): boolean {
  for (const token of left) {
    if (right.has(token)) {
      return true;
    }
  }

  return false;
}

function hasConflictingSpecificAddressTokens(
  left: Pick<MapBrandLocationCandidate, "address">,
  right: Pick<MapBrandLocationCandidate, "address">
): boolean {
  const leftTokens = buildSpecificAddressTokens(left);
  const rightTokens = buildSpecificAddressTokens(right);

  if (leftTokens.houseNumbers.size > 0 && rightTokens.houseNumbers.size > 0 && !hasTokenIntersection(leftTokens.houseNumbers, rightTokens.houseNumbers)) {
    return true;
  }

  if (leftTokens.detailTokens.size > 0 && rightTokens.detailTokens.size > 0 && !hasTokenIntersection(leftTokens.detailTokens, rightTokens.detailTokens)) {
    return true;
  }

  return false;
}

function calculateAddressSimilarity(
  left: Pick<MapBrandLocationCandidate, "address" | "name" | "city" | "district" | "state" | "country">,
  right: Pick<MapBrandLocationCandidate, "address" | "name" | "city" | "district" | "state" | "country">
): number {
  const leftAddressKey = buildNormalizedAddressKey(left);
  const rightAddressKey = buildNormalizedAddressKey(right);
  if (!leftAddressKey || !rightAddressKey) {
    return 0;
  }

  if (leftAddressKey === rightAddressKey) {
    return 1;
  }

  if (hasConflictingSpecificAddressTokens(left, right)) {
    return 0;
  }

  const shorterLength = Math.min(leftAddressKey.length, rightAddressKey.length);
  if (shorterLength >= 12 && (leftAddressKey.includes(rightAddressKey) || rightAddressKey.includes(leftAddressKey))) {
    return 0.94;
  }

  const leftTokens = buildAddressTokenSet(left);
  const rightTokens = buildAddressTokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let sharedCount = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      sharedCount += 1;
    }
  }

  const overlapRatio = sharedCount / Math.min(leftTokens.size, rightTokens.size);
  const sharedComplexToken =
    extractCommercialComplexToken(left.address) &&
    extractCommercialComplexToken(left.address) === extractCommercialComplexToken(right.address || right.name);
  const sharedHouseNumber = hasTokenIntersection(buildSpecificAddressTokens(left).houseNumbers, buildSpecificAddressTokens(right).houseNumbers);

  if (overlapRatio >= 0.8 && (sharedComplexToken || sharedHouseNumber || sharedCount >= 3)) {
    return 0.9;
  }

  if (overlapRatio >= 0.65 && sharedComplexToken && sharedHouseNumber) {
    return 0.84;
  }

  return 0;
}

function areStoreKeysCompatible(leftStoreKey: string, rightStoreKey: string): boolean {
  if (!leftStoreKey || !rightStoreKey) {
    return false;
  }

  if (leftStoreKey === rightStoreKey) {
    return true;
  }

  const shorter = leftStoreKey.length <= rightStoreKey.length ? leftStoreKey : rightStoreKey;
  const longer = shorter === leftStoreKey ? rightStoreKey : leftStoreKey;
  return shorter.length >= 4 && longer.includes(shorter);
}

function isSpecificStoreKey(storeKey: string): boolean {
  return storeKey.length >= 6 || /\d/u.test(storeKey);
}

function hasStrongNameMatch(
  left: Pick<MapBrandLocationCandidate, "name">,
  right: Pick<MapBrandLocationCandidate, "name">
): boolean {
  const leftName = normalizeLocationToken(left.name);
  const rightName = normalizeLocationToken(right.name);
  if (!leftName || !rightName) {
    return false;
  }

  if (leftName === rightName) {
    return true;
  }

  const shorter = leftName.length <= rightName.length ? leftName : rightName;
  const longer = shorter === leftName ? rightName : leftName;
  return shorter.length >= 6 && longer.includes(shorter);
}

function buildStoreIdentityKey(
  candidate: Pick<MapBrandLocationCandidate, "name" | "city" | "district" | "state" | "country">,
  context?: DedupeContext
): string {
  let normalized = normalizeComparisonText(candidate.name);
  const removableParts = [
    ...buildAdministrativeTokenVariants(context?.brand),
    ...buildAdministrativeTokenVariants(context?.area),
    ...buildAdministrativeTokenVariants(candidate.state),
    ...buildAdministrativeTokenVariants(candidate.city),
    ...buildAdministrativeTokenVariants(candidate.district),
    ...buildAdministrativeTokenVariants(candidate.country)
  ];

  for (const part of removableParts) {
    normalized = normalized.replaceAll(part, "");
  }

  normalized = normalized
    .replaceAll("咖啡", "")
    .replaceAll("coffee", "")
    .replaceAll("coffe", "");

  return normalized || normalizeComparisonText(candidate.name);
}

function scoreCandidate(candidate: MapBrandLocationCandidate, context?: DedupeContext): number {
  let score = 0;
  const addressKey = buildNormalizedAddressKey(candidate);
  const storeKey = buildStoreIdentityKey(candidate, context);

  score += Math.min(addressKey.length, 80);
  score += Math.min(storeKey.length, 24);

  if (/\d+号/u.test(candidate.address)) {
    score += 20;
  }
  if (/(层|座|栋|铺|单元|号门|航站楼|登机口)/u.test(candidate.address)) {
    score += 15;
  }
  if (candidate.name.includes("(") || candidate.name.includes("（")) {
    score += 4;
  }
  if (candidate.provider === "amap-js" && /^[A-Z0-9]{8,}$/i.test(candidate.providerId)) {
    score += 8;
  }

  return score;
}

function areSameStore(left: MapBrandLocationCandidate, right: MapBrandLocationCandidate, context?: DedupeContext): boolean {
  if (left.provider === right.provider && left.providerId && left.providerId === right.providerId) {
    return true;
  }

  const leftStoreKey = buildStoreIdentityKey(left, context);
  const rightStoreKey = buildStoreIdentityKey(right, context);
  const addressSimilarity = calculateAddressSimilarity(left, right);
  const exactNameMatch = normalizeLocationToken(left.name) === normalizeLocationToken(right.name);
  const strongNameMatch = hasStrongNameMatch(left, right);

  if (addressSimilarity >= 0.94 && areStoreKeysCompatible(leftStoreKey, rightStoreKey)) {
    return true;
  }

  if (!areStoreKeysCompatible(leftStoreKey, rightStoreKey)) {
    return false;
  }

  if (addressSimilarity >= 0.84) {
    return true;
  }

  const distanceMeters = calculateDistanceMeters(left, right);
  if (exactNameMatch && distanceMeters <= 200) {
    return true;
  }

  if (strongNameMatch && distanceMeters <= 80) {
    return true;
  }

  return isSpecificStoreKey(leftStoreKey) && isSpecificStoreKey(rightStoreKey) && distanceMeters <= 40;
}

function dedupeCandidates(candidates: MapBrandLocationCandidate[], context?: DedupeContext): MapBrandLocationCandidate[] {
  const deduped: MapBrandLocationCandidate[] = [];

  for (const candidate of candidates) {
    const existingIndex = deduped.findIndex((existing) => areSameStore(existing, candidate, context));
    if (existingIndex === -1) {
      deduped.push(candidate);
      continue;
    }

    if (scoreCandidate(candidate, context) > scoreCandidate(deduped[existingIndex], context)) {
      deduped[existingIndex] = candidate;
    }
  }

  return deduped;
}

function normalizeEnvValue(value: string | undefined): string {
  return normalizeString(value).replace(/\\n/g, "");
}

function buildAreaBoundsFromPois(pois: AMapBrowserPoi[]) {
  if (pois.length === 0) {
    return null;
  }

  let south = pois[0].lat;
  let north = pois[0].lat;
  let west = pois[0].lng;
  let east = pois[0].lng;

  for (const poi of pois.slice(1)) {
    south = Math.min(south, poi.lat);
    north = Math.max(north, poi.lat);
    west = Math.min(west, poi.lng);
    east = Math.max(east, poi.lng);
  }

  return { south, west, north, east };
}

function matchAreaName(candidate: string, area: string): boolean {
  const normalizedCandidate = normalizeAdministrativeName(candidate);
  const normalizedArea = normalizeAdministrativeName(area);
  if (!normalizedCandidate || !normalizedArea) {
    return false;
  }
  return normalizedCandidate.includes(normalizedArea) || normalizedArea.includes(normalizedCandidate);
}

function isPreciseAmapPoi(poi: AMapBrowserPoi, area: string, bounds: AMapAreaResolution["bounds"] | null): boolean {
  if (!normalizeString(poi.id) || !normalizeString(poi.name) || !normalizeString(poi.address)) {
    return false;
  }

  if (!normalizeString(poi.district) || !normalizeString(poi.city) || !normalizeString(poi.province)) {
    return false;
  }

  if (bounds && !isPointInsideBounds(poi.lat, poi.lng, bounds)) {
    return false;
  }

  return [poi.province, poi.city, poi.district].some((value) => matchAreaName(value, area));
}

function mapAmapCandidate(poi: AMapBrowserPoi): MapBrandLocationCandidate {
  const cleanedAddress = cleanCandidateAddress(poi.address, poi.name);
  return {
    provider: "amap-js",
    providerId: normalizeString(poi.id) || `${normalizeComparisonText(poi.name)}|${poi.lat.toFixed(6)}|${poi.lng.toFixed(6)}`,
    name: poi.name,
    address: cleanedAddress || poi.address,
    city: poi.city,
    district: poi.district,
    state: poi.province,
    postcode: undefined,
    country: "中国",
    lat: poi.lat,
    lng: poi.lng,
    category: "amenity",
    type: poi.type || "poi",
    displayName: `${poi.name}, ${cleanedAddress || poi.address}`
  };
}

async function searchBrandLocationsWithAmapBrowser(options: SearchBrandLocationsOptions): Promise<MapBrandLocationSearchRecord | null> {
  const amapKey = normalizeEnvValue(AMAP_JS_KEY);
  const securityJsCode = normalizeEnvValue(AMAP_SECURITY_JS_CODE);
  if (!amapKey || !securityJsCode) {
    return null;
  }

  const playwrightModule = (await (0, eval)('import("playwright-core")')) as {
    chromium: {
      launchPersistentContext: (
        userDataDir: string,
        options: Record<string, unknown>
      ) => Promise<{
        newPage: () => Promise<{
          goto: (url: string) => Promise<void>;
          evaluate: <T, A>(pageFunction: (args: A) => Promise<T>, args: A) => Promise<T>;
        }>;
        close: () => Promise<void>;
      }>;
    };
  };
  const { chromium } = playwrightModule;
  const limit = clampLimit(options.limit, 20, 1000);
  const userDataDir = path.join(os.tmpdir(), `fluxa-map-amap-${Date.now()}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: CHROME_EXECUTABLE_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  try {
    const page = await context.newPage();
    await page.goto("data:text/html,<html><body>AMap search</body></html>");

    const area = normalizeString(options.area);
    const brand = normalizeString(options.brand);
    const amapResult = (await page.evaluate(
      async ({ amapKey: innerAmapKey, securityJsCode: innerSecurityCode, area: innerArea, brand: innerBrand, limit: innerLimit }) => {
        const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
        const buildStructuredAddress = (poi: any) => {
          const parts = [
            normalizeText(poi?.pname),
            normalizeText(poi?.cityname),
            normalizeText(poi?.adname),
            normalizeText(poi?.address)
          ].filter(Boolean);
          const dedupedParts: string[] = [];
          for (const part of parts) {
            if (dedupedParts[dedupedParts.length - 1] === part) {
              continue;
            }
            dedupedParts.push(part);
          }
          return dedupedParts.join("");
        };
        const hasDetailedAddressInPage = (value: string) =>
          /(\d+号|路|街|大道|大街|巷|弄|层|座|栋|铺|单元|航站楼|登机口)/u.test(normalizeText(value));
        const parseCoordinate = (value: unknown) => {
          const numeric = typeof value === "number" ? value : Number(value);
          return Number.isFinite(numeric) ? numeric : null;
        };
        const buildBoundsFromPoints = (points: Array<{ lng: number; lat: number }>) => {
          if (points.length === 0) {
            return null;
          }

          let south = points[0].lat;
          let north = points[0].lat;
          let west = points[0].lng;
          let east = points[0].lng;

          for (const point of points.slice(1)) {
            south = Math.min(south, point.lat);
            north = Math.max(north, point.lat);
            west = Math.min(west, point.lng);
            east = Math.max(east, point.lng);
          }

          return { south, west, north, east };
        };
        const resolveArea = () =>
          new Promise<AMapAreaResolution | null>((resolve) => {
            const districtSearch = new (window as any).AMap.DistrictSearch({
              subdistrict: 0,
              extensions: "all"
            });
            districtSearch.search(innerArea, (_status: string, result: any) => {
              const district = Array.isArray(result?.districtList) ? result.districtList[0] : null;
              const centerLng = parseCoordinate(district?.center?.lng);
              const centerLat = parseCoordinate(district?.center?.lat);
              const polygons = Array.isArray(district?.boundaries) ? district.boundaries : [];
              const points = polygons.flatMap((polygon: any) =>
                Array.isArray(polygon)
                  ? polygon
                      .map((point: any) => ({
                        lng: parseCoordinate(point?.lng),
                        lat: parseCoordinate(point?.lat)
                      }))
                      .filter((point: { lng: number | null; lat: number | null }) => point.lng !== null && point.lat !== null)
                      .map((point: { lng: number | null; lat: number | null }) => ({ lng: point.lng as number, lat: point.lat as number }))
                  : []
              );
              const bounds = buildBoundsFromPoints(points);
              if (!district || centerLng === null || centerLat === null || !bounds) {
                resolve(null);
                return;
              }

              resolve({
                name: normalizeText(district.name) || innerArea,
                displayName: `${normalizeText(district.name) || innerArea}, 中国`,
                lat: centerLat,
                lng: centerLng,
                bounds
              });
            });
          });
        const reverseGeocode = (lng: number, lat: number) =>
          new Promise<{
            address: string;
            city: string;
            district: string;
            province: string;
          } | null>((resolve) => {
            const geocoder = new (window as any).AMap.Geocoder({
              radius: 1000,
              extensions: "all"
            });
            geocoder.getAddress([lng, lat], (_status: string, result: any) => {
              const regeocode = result?.regeocode;
              if (!regeocode) {
                resolve(null);
                return;
              }

              const component = regeocode.addressComponent || {};
              const normalizedCity = Array.isArray(component.city)
                ? component.city.join("").trim()
                : normalizeText(component.city);
              resolve({
                address: normalizeText(regeocode.formattedAddress),
                city: normalizedCity || normalizeText(component.province),
                district: normalizeText(component.district),
                province: normalizeText(component.province)
              });
            });
          });
        const searchPage = (pageIndex: number) =>
          new Promise<AMapBrowserPoi[]>((resolve) => {
            const placeSearch = new (window as any).AMap.PlaceSearch({
              city: innerArea,
              citylimit: true,
              extensions: "all",
              pageIndex,
              pageSize: 20
            });
            placeSearch.search(innerBrand, (_status: string, result: any) => {
              const pois = Array.isArray(result?.poiList?.pois) ? result.poiList.pois : [];
              resolve(
                pois
                  .map((poi: any) => ({
                    id: typeof poi?.id === "string" ? poi.id.trim() : "",
                    name: typeof poi?.name === "string" ? poi.name.trim() : "",
                    address: buildStructuredAddress(poi),
                    city: typeof poi?.cityname === "string" ? poi.cityname.trim() : "",
                    district: typeof poi?.adname === "string" ? poi.adname.trim() : "",
                    province: typeof poi?.pname === "string" ? poi.pname.trim() : "",
                    adcode: typeof poi?.adcode === "string" ? poi.adcode.trim() : "",
                    citycode: typeof poi?.citycode === "string" ? poi.citycode.trim() : "",
                    lat: Number(poi?.location?.lat),
                    lng: Number(poi?.location?.lng),
                    type: typeof poi?.type === "string" ? poi.type.trim() : ""
                  }))
                  .filter((poi: AMapBrowserPoi) => poi.id && poi.name && poi.address && Number.isFinite(poi.lat) && Number.isFinite(poi.lng))
              );
            });
          });

        (window as any)._AMapSecurityConfig = { securityJsCode: innerSecurityCode };
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://webapi.amap.com/maps?v=2.0&key=${innerAmapKey}&plugin=AMap.PlaceSearch,AMap.DistrictSearch,AMap.Geocoder`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load AMap JS SDK."));
          document.head.appendChild(script);
        });

        const resolvedArea = await resolveArea();
        const allPois: AMapBrowserPoi[] = [];
        const seen = new Set<string>();
        const maxPages = Math.max(1, Math.ceil(innerLimit / 20) + 2);
        let skippedLowPrecision = 0;

        for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
          const pagePois = await searchPage(pageIndex);
          for (const poi of pagePois) {
            if (poi.province && !poi.address.includes(innerArea) && !poi.province.includes(innerArea) && !poi.city.includes(innerArea)) {
              continue;
            }
            const isInsideBounds =
              !resolvedArea
              || (poi.lat >= resolvedArea.bounds.south
                && poi.lat <= resolvedArea.bounds.north
                && poi.lng >= resolvedArea.bounds.west
                && poi.lng <= resolvedArea.bounds.east);
            const areaMatched = [poi.province, poi.city, poi.district].some((value) => {
              const normalizedValue = normalizeText(value).replace(/(特别行政区|自治区|自治州|地区|盟|省|市|区|县|旗)$/u, "");
              const normalizedArea = normalizeText(innerArea).replace(/(特别行政区|自治区|自治州|地区|盟|省|市|区|县|旗)$/u, "");
              return Boolean(normalizedValue && normalizedArea)
                && (normalizedValue.includes(normalizedArea) || normalizedArea.includes(normalizedValue));
            });
            if (!isInsideBounds || !areaMatched || !poi.district || !poi.city || !poi.province) {
              skippedLowPrecision += 1;
              continue;
            }
            const dedupeKey = `${poi.id}|${poi.lat.toFixed(6)}|${poi.lng.toFixed(6)}`;
            if (seen.has(dedupeKey)) {
              continue;
            }
            seen.add(dedupeKey);
            allPois.push(poi);
            if (allPois.length >= innerLimit) {
              return {
                resolvedArea,
                pois: allPois,
                skippedLowPrecision
              };
            }
          }
          if (pagePois.length < 20) {
            break;
          }
        }

        for (const poi of allPois) {
          if (hasDetailedAddressInPage(poi.address) && poi.city && poi.district && poi.province) {
            continue;
          }

          const geocoded = await reverseGeocode(poi.lng, poi.lat);
          if (!geocoded) {
            continue;
          }

          if (geocoded.address) {
            poi.address = geocoded.address;
          }
          if (geocoded.city) {
            poi.city = geocoded.city;
          }
          if (geocoded.district) {
            poi.district = geocoded.district;
          }
          if (geocoded.province) {
            poi.province = geocoded.province;
          }
        }

        return {
          resolvedArea,
          pois: allPois,
          skippedLowPrecision
        };
      },
      { amapKey, securityJsCode, area, brand, limit }
    )) as {
      resolvedArea: AMapAreaResolution | null;
      pois: AMapBrowserPoi[];
      skippedLowPrecision: number;
    };

    const bounds = amapResult.resolvedArea?.bounds || buildAreaBoundsFromPois(amapResult.pois);
    const results = dedupeCandidates(
      amapResult.pois
        .filter((poi: AMapBrowserPoi) => isPreciseAmapPoi(poi, area, bounds))
        .map(mapAmapCandidate),
      { brand, area }
    ).slice(0, limit);
    return {
      provider: "amap-js",
      brand,
      areaQuery: area,
      resolvedArea: {
        provider: "amap-js",
        name: amapResult.resolvedArea?.name || area,
        displayName: amapResult.resolvedArea?.displayName || `${area}, 中国`,
        lat: amapResult.resolvedArea?.lat ?? (bounds ? (bounds.south + bounds.north) / 2 : 0),
        lng: amapResult.resolvedArea?.lng ?? (bounds ? (bounds.west + bounds.east) / 2 : 0),
        bounds: bounds || { south: 0, west: 0, north: 0, east: 0 },
        category: "administrative",
        type: "area"
      },
      total: results.length,
      limit,
      results,
      warnings: [
        ...(results.length === 0 ? [`No ${brand} locations were found inside ${area}.`] : []),
        ...(amapResult.skippedLowPrecision > 0
          ? [`Filtered out ${amapResult.skippedLowPrecision} low-precision AMap POIs before import.`]
          : [])
      ]
    };
  } finally {
    await context.close();
  }
}

export class MapSearchService {
  async resolveArea(options: ResolveAreaOptions): Promise<MapAreaResolutionRecord> {
    const areaQuery = normalizeString(options.area);
    if (!areaQuery) {
      throw new Error("area is required for map search.");
    }

    const params = new URLSearchParams({
      q: areaQuery,
      format: "jsonv2",
      limit: "5",
      addressdetails: "1"
    });
    const countryCode = normalizeString(options.countryCode).toLowerCase();
    if (countryCode) {
      params.set("countrycodes", countryCode);
    }

    const results = await fetchNominatimJson(params);
    const areaResult = pickBestAreaResult(results);
    if (!areaResult) {
      throw new Error(`No map area found for ${areaQuery}.`);
    }

    return mapAreaResult(areaQuery, areaResult);
  }

  async searchBrandLocations(options: SearchBrandLocationsOptions): Promise<MapBrandLocationSearchRecord> {
    const brand = normalizeString(options.brand);
    if (!brand) {
      throw new Error("brand is required for map search.");
    }

    const amapResult = await searchBrandLocationsWithAmapBrowser(options).catch(() => null);
    if (amapResult && amapResult.results.length > 0) {
      return amapResult;
    }

    const limit = clampLimit(options.limit, 20, 50);
    const resolvedArea = await this.resolveArea(options);
    const variants = buildSearchVariants(brand, options.brandAliases);
    const areaMatchers = buildAreaMatchers(options.area, resolvedArea);
    const warnings: string[] = [];
    const collected: MapBrandLocationCandidate[] = [];

    for (const variant of variants) {
      const params = new URLSearchParams({
        q: variant,
        format: "jsonv2",
        limit: String(Math.min(limit * 2, 50)),
        addressdetails: "1",
        bounded: "1",
        viewbox: `${resolvedArea.bounds.west},${resolvedArea.bounds.north},${resolvedArea.bounds.east},${resolvedArea.bounds.south}`
      });

      const countryCode = normalizeString(options.countryCode).toLowerCase();
      if (countryCode) {
        params.set("countrycodes", countryCode);
      }

      const results = await fetchNominatimJson(params);
      if (results.length === 0) {
        warnings.push(`No map matches returned for search term "${variant}".`);
      }

      collected.push(
        ...results
          .map((result) => mapCandidate(result, resolvedArea.bounds))
          .filter((candidate): candidate is MapBrandLocationCandidate => Boolean(candidate))
          .filter((candidate) => candidateMatchesBrand(candidate, variants))
          .filter((candidate) => candidateMatchesArea(candidate, areaMatchers))
      );

      if (collected.length >= limit) {
        break;
      }
    }

    const results = dedupeCandidates(collected, { brand, area: normalizeString(options.area) }).slice(0, limit);
    if (results.length === 0) {
      warnings.push(`No ${brand} locations were found inside ${resolvedArea.name}.`);
    }

    return {
      provider: "nominatim",
      brand,
      areaQuery: normalizeString(options.area),
      resolvedArea,
      total: results.length,
      limit,
      results,
      warnings
    };
  }
}
