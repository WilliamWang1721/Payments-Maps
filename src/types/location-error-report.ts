import type { LocationSource } from "@/types/location";

export type LocationErrorReportCategory =
  | "location_info_error"
  | "support_claim_error"
  | "duplicate_or_merge_issue"
  | "status_issue"
  | "content_issue"
  | "feature_bug"
  | "other";

export type LocationErrorReportSeverity = "low" | "medium" | "high";

export type LocationErrorReportStatus =
  | "submitted"
  | "triaged"
  | "need_info"
  | "accepted"
  | "rejected"
  | "resolved"
  | "closed";

export type LocationErrorReportEventType =
  | "submitted"
  | "attachments_added"
  | "status_changed"
  | "note";

export type LocationErrorReportEventVisibility = "public" | "internal";

export type LocationErrorReportContextTab = "overview" | "attempt" | "reviews";

export type LocationErrorReportRelatedReviewSource = "comment" | "review";

export interface LocationErrorReportAttachmentRecord {
  path: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface LocationErrorReportLocationSnapshot {
  locationId: string;
  locationSource: LocationSource;
  name: string;
  address: string;
  brand: string;
  city: string;
  status: string;
  metaLine?: string;
}

export interface LocationErrorReportRecord {
  id: string;
  locationId: string;
  locationSource: LocationSource;
  reporterUserId: string;
  reporterLabel: string;
  category: LocationErrorReportCategory;
  severity: LocationErrorReportSeverity;
  status: LocationErrorReportStatus;
  summary: string;
  details: string;
  fieldKey?: string | null;
  contextTab?: LocationErrorReportContextTab | null;
  relatedAttemptId?: string | null;
  relatedReviewId?: string | null;
  relatedReviewSource?: LocationErrorReportRelatedReviewSource | null;
  locationSnapshot: LocationErrorReportLocationSnapshot;
  reportContext: Record<string, unknown>;
  attachments: LocationErrorReportAttachmentRecord[];
  resolutionType?: string | null;
  resolutionNote?: string | null;
  linkedLinearIssueId?: string | null;
  linkedLinearIssueUrl?: string | null;
  triagedBy?: string | null;
  resolvedBy?: string | null;
  triagedAt?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocationErrorReportEventRecord {
  id: string;
  reportId: string;
  actorUserId?: string | null;
  actorLabel: string;
  eventType: LocationErrorReportEventType;
  visibility: LocationErrorReportEventVisibility;
  fromStatus?: LocationErrorReportStatus | null;
  toStatus?: LocationErrorReportStatus | null;
  note?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateLocationErrorReportInput {
  category: LocationErrorReportCategory;
  severity: LocationErrorReportSeverity;
  summary: string;
  details: string;
  fieldKey?: string;
  contextTab?: LocationErrorReportContextTab | null;
  relatedAttemptId?: string | null;
  relatedReviewId?: string | null;
  relatedReviewSource?: LocationErrorReportRelatedReviewSource | null;
  evidenceText?: string;
  reportContext?: Record<string, unknown>;
  attachments?: File[];
}

export interface CreateLocationErrorReportResult {
  report: LocationErrorReportRecord;
  attachmentWarning: string | null;
}

export interface TransitionLocationErrorReportInput {
  status?: LocationErrorReportStatus | null;
  note?: string;
  resolutionType?: string;
  resolutionNote?: string;
  linkedLinearIssueId?: string;
  linkedLinearIssueUrl?: string;
  visibility?: LocationErrorReportEventVisibility;
}

export const LOCATION_ERROR_REPORT_CATEGORY_OPTIONS: Array<{
  value: LocationErrorReportCategory;
  label: string;
  description: string;
}> = [
  {
    value: "location_info_error",
    label: "Location Info Error",
    description: "Name, address, brand, city, coordinates, hours, or contact info is wrong."
  },
  {
    value: "support_claim_error",
    label: "Support Claim Error",
    description: "Supported cards, payment methods, or source conclusions do not match reality."
  },
  {
    value: "duplicate_or_merge_issue",
    label: "Duplicate / Merge Issue",
    description: "The same location is duplicated, split, or conflicts with a shell record."
  },
  {
    value: "status_issue",
    label: "Status Issue",
    description: "The location is closed, inactive, or in the wrong operating state."
  },
  {
    value: "content_issue",
    label: "Content Issue",
    description: "Reviews, notes, or other displayed content is wrong, abusive, or low quality."
  },
  {
    value: "feature_bug",
    label: "Feature Bug",
    description: "The current page or action failed, loaded incorrectly, or behaved unexpectedly."
  },
  {
    value: "other",
    label: "Other",
    description: "Anything else that still needs administrator review."
  }
];

export const LOCATION_ERROR_REPORT_SEVERITY_OPTIONS: Array<{
  value: LocationErrorReportSeverity;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

export const LOCATION_ERROR_REPORT_STATUS_OPTIONS: Array<{
  value: LocationErrorReportStatus;
  label: string;
}> = [
  { value: "submitted", label: "Submitted" },
  { value: "triaged", label: "Triaged" },
  { value: "need_info", label: "Need Info" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" }
];

export function getLocationErrorReportCategoryLabel(category: LocationErrorReportCategory): string {
  return LOCATION_ERROR_REPORT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || category;
}

export function getLocationErrorReportSeverityLabel(severity: LocationErrorReportSeverity): string {
  return LOCATION_ERROR_REPORT_SEVERITY_OPTIONS.find((option) => option.value === severity)?.label || severity;
}

export function getLocationErrorReportStatusLabel(status: LocationErrorReportStatus): string {
  return LOCATION_ERROR_REPORT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}
