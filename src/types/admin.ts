import type { LocationSource, LocationStatus } from "@/types/location";

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

export interface AdminContributorRecord {
  userId: string;
  userLabel: string;
  locationCount: number;
  activeLocationCount: number;
  inactiveLocationCount: number;
  latestContributionAt: string | null;
  topCities: string[];
  topBrands: string[];
}

export interface AdminStatisticsRecord {
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
  topContributors: AdminContributorRecord[];
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
