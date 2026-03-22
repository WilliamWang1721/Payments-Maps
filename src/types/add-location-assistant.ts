import type { LocationSpecialDateHours, LocationStatus, StaffProficiencyLevel } from "@/types/location";
import type { SmartAddCardCandidate } from "@/lib/smart-add-card-search";
import type { SmartAddReviewPrompt } from "@/lib/smart-add-review";

export interface AddLocationAssistantDraft {
  name: string;
  address: string;
  brand: string;
  city: string;
  status: LocationStatus;
  transactionStatus: "Success" | "Fault" | "Unknown";
  lat: number;
  lng: number;
  network: string;
  paymentMethod: string;
  cvm: string;
  acquiringMode: string;
  acquirer: string;
  posModel: string;
  checkoutLocation: "Staffed Checkout" | "Self-checkout";
  attemptYear: string;
  attemptMonth: string;
  attemptDay: string;
  contactInfo: string;
  weekdayBusinessHours: string;
  weekendBusinessHours: string;
  specialDateHours: LocationSpecialDateHours[];
  staffProficiencyLevel: StaffProficiencyLevel | null;
  notes: string;
}

export type AddLocationAssistantPatch = Partial<AddLocationAssistantDraft>;

export interface AddLocationAssistantMessage {
  role: "assistant" | "user";
  content: string;
}

export interface AddLocationAssistantResult {
  assistantMessage: string;
  draftPatch: AddLocationAssistantPatch;
  missingFields: string[];
  readyToSubmit: boolean;
  searchQuery: string | null;
  matchedCardId: string | null;
  confirmationPrompt: SmartAddReviewPrompt | null;
}

export interface AMapPlaceSearchResult {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  province: string;
  lat: number;
  lng: number;
  type?: string;
}

export interface AddLocationAssistantRequest {
  brandCandidates: string[];
  draft: AddLocationAssistantDraft;
  messages: AddLocationAssistantMessage[];
  cardCandidates?: SmartAddCardCandidate[];
}
