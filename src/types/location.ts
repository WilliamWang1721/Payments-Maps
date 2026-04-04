export type ViewMode = "map" | "list" | "brands";

export type LocationStatus = "active" | "inactive";
export type LocationSource = "fluxa_locations" | "pos_machines";
export type SupportEvidenceStatus = "supported" | "unsupported" | "limited" | "unknown";
export type SupportEvidenceKind = "attempt" | "official";
export type StaffProficiencyLevel = 1 | 2 | 3 | 4 | 5;

export interface LocationSpecialDateHours {
  date: string;
  hours: string;
}

export interface LocationBusinessHours {
  weekday?: string;
  weekend?: string;
  specialDates?: LocationSpecialDateHours[];
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
  paymentMethod?: string;
  cvm?: string;
  acquiringMode?: string;
  deviceStatus?: LocationStatus;
  checkoutLocation?: string;
  isConclusiveFailure?: boolean;
}

export interface LocationReviewRecord {
  id: string;
  initials: string;
  name: string;
  userId?: string | null;
  time: string;
  content: string;
  rating?: number | null;
  sourceKind?: "review" | "comment" | "trial";
}

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  brand: string;
  city: string;
  addedBy?: string;
  supportedNetworks?: string[];
  successRate?: number | null;
  status: LocationStatus;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
  businessHours?: LocationBusinessHours;
  contactInfo?: string;
  notes?: string;
  staffProficiencyLevel?: StaffProficiencyLevel | null;
  staffProficiencyUpdatedAt?: string;
  source?: LocationSource;
}

export interface LocationSupportEvidenceItem {
  id: string;
  kind: SupportEvidenceKind;
  title: string;
  summary?: string;
  status: SupportEvidenceStatus;
  attemptId?: string;
  cardName?: string;
  createdAt?: string;
  dateTimeLabel?: string;
  addedBy?: string;
  networkLabel?: string;
  paymentMethodLabel?: string;
  checkoutLocation?: string;
  notes?: string;
  disputed?: boolean;
  invalidated?: boolean;
}

export interface LocationSupportInsightCounters {
  supportingAttempts: number;
  conflictingAttempts: number;
  officialSources: number;
}

export interface LocationSupportInsight {
  key: string;
  title: string;
  status: SupportEvidenceStatus;
  rationale?: string;
  evidence: LocationSupportEvidenceItem[];
  counters: LocationSupportInsightCounters;
}

export interface LocationSupportInsights {
  networks: LocationSupportInsight[];
  paymentMethods: LocationSupportInsight[];
}

export interface LocationDetailRecord extends LocationRecord {
  source: LocationSource;
  deviceName: string;
  metaLine: string;
  successRate: number;
  successCount: number;
  failedCount: number;
  totalAttempts: number;
  attempts: LocationAttemptRecord[];
  reviews: LocationReviewRecord[];
  supportInsights?: LocationSupportInsights;
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

export interface CreateLocationReviewInput {
  content: string;
  rating?: number | null;
}

export interface CreateLocationInput {
  name: string;
  address: string;
  brand: string;
  city?: string;
  status: LocationStatus;
  lat: number;
  lng: number;
  businessHours?: LocationBusinessHours;
  contactInfo?: string;
  notes?: string;
  staffProficiencyLevel?: StaffProficiencyLevel | null;
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
