export type BrandBusinessType = "online" | "offline";
export type BrandStatus = "active" | "inactive" | "coming_soon";
export type BrandSegment = "Coffee" | "Fast Food" | "Retail" | "Convenience";

export interface BrandRecord {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  category: string;
  businessType: BrandBusinessType;
  status: BrandStatus;
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
  uiSegment: BrandSegment;
  uiCategoryLabel: string;
}
