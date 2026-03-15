export type ViewMode = "map" | "list" | "brands";

export type LocationStatus = "active" | "inactive";
export type LocationSource = "fluxa_locations" | "pos_machines";

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

export interface LocationRecord {
  id: string;
  name: string;
  address: string;
  brand: string;
  bin: string;
  city: string;
  addedBy?: string;
  supportedNetworks?: string[];
  successRate?: number | null;
  status: LocationStatus;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  source?: LocationSource;
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

export interface CreateLocationInput {
  name: string;
  address: string;
  brand: string;
  bin: string;
  city: string;
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
