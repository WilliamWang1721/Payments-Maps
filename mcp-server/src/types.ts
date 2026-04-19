import type { MCPClientType, MCPScopeKey, MCPScopeTemplate } from "./constants.js";

export type LocationStatus = "active" | "inactive";
export type LocationSource = "fluxa_locations" | "pos_machines";

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  brand: string;
  bin: string;
  city: string;
  addedBy?: string;
  supportedNetworks?: string[];
  status: LocationStatus;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  source: LocationSource;
}

export interface LocationAttemptRecord {
  id: string;
  occurredAt?: string;
  dateTime: string;
  addedBy: string;
  cardName: string;
  network: string;
  method: string;
  status: "success" | "declined" | "failed";
  notes?: string;
}

export interface LocationReviewRecord {
  id: string;
  initials: string;
  name: string;
  time: string;
  content: string;
  rating?: number | null;
}

export interface LocationDetailRecord extends LocationRecord {
  deviceName: string;
  metaLine: string;
  successRate: number;
  successCount: number;
  failedCount: number;
  totalAttempts: number;
  attempts: LocationAttemptRecord[];
  reviews: LocationReviewRecord[];
}

export interface CreateLocationInput {
  name: string;
  address: string;
  brand: string;
  bin: string;
  city?: string;
  status: LocationStatus;
  lat: number;
  lng: number;
  notes?: string;
  transactionStatus?: "Success" | "Fault" | "Unknown";
  network?: string;
  paymentMethod?: string;
  cvm?: string;
  acquiringMode?: string;
  acquirer?: string;
  posModel?: string;
  checkoutLocation?: "Staffed Checkout" | "Self-checkout";
  attemptedAt?: string;
}

export interface BulkCreateLocationResult {
  index: number;
  success: boolean;
  inputName: string;
  location?: LocationRecord;
  error?: string;
}

export interface MapAreaResolutionRecord {
  provider: "nominatim" | "amap-js";
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
  category: string;
  type: string;
}

export interface MapBrandLocationCandidate {
  provider: "nominatim" | "amap-js";
  providerId: string;
  name: string;
  address: string;
  city: string;
  district: string;
  state: string;
  postcode?: string;
  country: string;
  lat: number;
  lng: number;
  category: string;
  type: string;
  displayName: string;
}

export interface MapBrandLocationSearchRecord {
  provider: "nominatim" | "amap-js";
  brand: string;
  areaQuery: string;
  resolvedArea: MapAreaResolutionRecord;
  total: number;
  limit: number;
  results: MapBrandLocationCandidate[];
  warnings: string[];
}

export interface BulkImportBrandLocationsFromMapInput {
  brand: string;
  area: string;
  bin?: string;
  brandAliases?: string[];
  countryCode?: string;
  limit?: number;
  status?: LocationStatus;
  notes?: string;
  transactionStatus?: "Success" | "Fault" | "Unknown";
  network?: string;
  paymentMethod?: string;
  cvm?: string;
  acquiringMode?: string;
  acquirer?: string;
  posModel?: string;
  checkoutLocation?: "Staffed Checkout" | "Self-checkout";
  attemptedAt?: string;
  skipExisting?: boolean;
  createAsShell?: boolean;
}

export interface BulkImportBrandLocationsFromMapResult {
  search: MapBrandLocationSearchRecord;
  totalCandidates: number;
  createdCount: number;
  skippedCount: number;
  failureCount: number;
  results: Array<{
    index: number;
    action: "created" | "skipped" | "failed";
    candidate: MapBrandLocationCandidate;
    reason?: string;
    location?: LocationRecord;
    error?: string;
  }>;
}

export interface CreateLocationAttemptInput {
  cardName?: string;
  transactionStatus?: "Success" | "Fault" | "Unknown";
  network?: string;
  paymentMethod?: string;
  cvm?: string;
  acquiringMode?: string;
  deviceStatus?: LocationStatus;
  acquirer?: string;
  checkoutLocation?: "Staffed Checkout" | "Self-checkout";
  notes?: string;
  attemptedAt?: string;
  isConclusiveFailure?: boolean;
}

export interface BrandRecord {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  category: string;
  businessType: "online" | "offline";
  status: "active" | "inactive" | "coming_soon";
  iconUrl?: string;
  logo?: string;
  color?: string;
  website?: string;
  founded?: number | null;
  headquarters?: string;
  isSystemBrand: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  storeCount: number;
  activeStoreCount: number;
  inactiveStoreCount: number;
  primaryCity: string;
  lastSyncAt: string;
  uiSegment: "Coffee" | "Fast Food" | "Retail" | "Convenience";
  uiCategoryLabel: string;
}

export interface CardAlbumCard {
  id: string;
  userId: string | null;
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  groupName: string;
  description: string;
  scope: "public" | "personal";
  updatedAt: string;
  createdAt: string;
}

export interface CreateCardAlbumCardInput {
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  groupName: string;
  description?: string;
  scope?: "public" | "personal";
}

export interface ViewerProfileRecord {
  name: string;
  email: string;
  location: string;
  joined: string;
  bio: string;
  stats: Array<{ label: string; value: string }>;
  quickAccessItems: Array<{ id: string; label: string; count: number }>;
  recentActivity: Array<{ id: string; title: string; meta: string; time: string }>;
}

export interface UpdateViewerProfileInput {
  name: string;
  location: string;
  bio: string;
}

export interface BrowsingHistoryRecord {
  id: string;
  locationId: string;
  title: string;
  address: string;
  city: string;
  brand: string;
  visitedAt: string;
}

export interface DatasetSummary {
  totalMatched: number;
  returned: number;
  filters: Record<string, unknown>;
}

export interface SiteStatisticsRecord {
  generatedAt: string;
  totals: {
    locations: number;
    posLocations: number;
    fluxaLocations: number;
    brands: number;
    publicCards: number;
    personalCards: number;
    users: number;
    errorReports: number;
    openErrorReports: number;
    newLocations7d: number;
    newLocations30d: number;
  };
  recentLocationSeries: Array<{ date: string; count: number }>;
  locationStatusBreakdown: Array<{ status: string; count: number }>;
  locationSourceBreakdown: Array<{ source: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  topBrands: Array<{ brand: string; count: number }>;
  topContributors: ContributorRankingRecord[];
  newestLocations: Array<{
    id: string;
    name: string;
    brand: string;
    city: string;
    status: LocationStatus;
    source: LocationSource;
    createdAt: string;
    addedBy: string;
  }>;
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  lastSignInAt: string | null;
  location: string;
  isAdmin: boolean;
  locationsAdded: number;
  reviews: number;
  errorReports: number;
  mcpSessions: number;
}

export interface AdminUserListRecord {
  generatedAt: string;
  total: number;
  results: AdminUserRecord[];
}

export interface ContributorRankingRecord {
  userId: string;
  userLabel: string;
  locationCount: number;
  activeLocationCount: number;
  inactiveLocationCount: number;
  latestContributionAt: string | null;
  topCities: string[];
  topBrands: string[];
}

export interface MCPSessionRecord {
  id: string;
  sessionLabel: string;
  clientType: MCPClientType;
  scopeTemplate: MCPScopeTemplate;
  scopes: MCPScopeKey[];
  tokenHint: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  sessionLabel: string;
  clientType: MCPClientType;
  scopeTemplate: MCPScopeTemplate;
  scopes: MCPScopeKey[];
  tokenHint: string;
  expiresAt: string;
  revokedAt: string | null;
}
