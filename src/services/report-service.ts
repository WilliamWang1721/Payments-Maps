import { supabase } from "@/lib/supabase";
import { getViewerSessionUser, isTrialViewerUser } from "@/lib/trial-session";
import type { LocationRecord, LocationSource } from "@/types/location";
import type {
  CreateLocationErrorReportInput,
  CreateLocationErrorReportResult,
  LocationErrorReportAttachmentRecord,
  LocationErrorReportEventRecord,
  LocationErrorReportLocationSnapshot,
  LocationErrorReportRecord,
  TransitionLocationErrorReportInput
} from "@/types/location-error-report";

const REPORT_ATTACHMENT_BUCKET = "location-error-report-attachments";
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;

const REPORT_COLUMNS = `
  id,
  location_id,
  location_source,
  reporter_user_id,
  reporter_label,
  category,
  severity,
  status,
  summary,
  details,
  field_key,
  context_tab,
  related_attempt_id,
  related_review_id,
  related_review_source,
  location_snapshot,
  report_context,
  attachments,
  resolution_type,
  resolution_note,
  linked_linear_issue_id,
  linked_linear_issue_url,
  triaged_by,
  resolved_by,
  triaged_at,
  resolved_at,
  created_at,
  updated_at
`;

const EVENT_COLUMNS = `
  id,
  report_id,
  actor_user_id,
  actor_label,
  event_type,
  visibility,
  from_status,
  to_status,
  note,
  metadata,
  created_at
`;

interface LocationErrorReportRow {
  id: string;
  location_id: string;
  location_source: LocationSource;
  reporter_user_id: string;
  reporter_label: string;
  category: LocationErrorReportRecord["category"];
  severity: LocationErrorReportRecord["severity"];
  status: LocationErrorReportRecord["status"];
  summary: string;
  details: string;
  field_key: string | null;
  context_tab: LocationErrorReportRecord["contextTab"] | null;
  related_attempt_id: string | null;
  related_review_id: string | null;
  related_review_source: LocationErrorReportRecord["relatedReviewSource"] | null;
  location_snapshot: unknown;
  report_context: unknown;
  attachments: unknown;
  resolution_type: string | null;
  resolution_note: string | null;
  linked_linear_issue_id: string | null;
  linked_linear_issue_url: string | null;
  triaged_by: string | null;
  resolved_by: string | null;
  triaged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LocationErrorReportEventRow {
  id: string;
  report_id: string;
  actor_user_id: string | null;
  actor_label: string;
  event_type: LocationErrorReportEventRecord["eventType"];
  visibility: LocationErrorReportEventRecord["visibility"];
  from_status: LocationErrorReportEventRecord["fromStatus"] | null;
  to_status: LocationErrorReportEventRecord["toStatus"] | null;
  note: string | null;
  metadata: unknown;
  created_at: string;
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeAttachmentArray(value: unknown): LocationErrorReportAttachmentRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const record = normalizeRecord(entry);
      const path = normalizeString(record.path);

      if (!path) {
        return null;
      }

      return {
        path,
        fileName: normalizeString(record.fileName, "attachment"),
        contentType: normalizeString(record.contentType, "application/octet-stream"),
        size: Number(record.size) || 0,
        uploadedAt: normalizeString(record.uploadedAt, new Date().toISOString())
      } satisfies LocationErrorReportAttachmentRecord;
    })
    .filter((entry): entry is LocationErrorReportAttachmentRecord => Boolean(entry));
}

function normalizeLocationSnapshot(value: unknown, fallbackLocation: Pick<LocationRecord, "id" | "name" | "address" | "brand" | "city" | "status" | "source">): LocationErrorReportLocationSnapshot {
  const record = normalizeRecord(value);

  return {
    locationId: normalizeString(record.locationId, fallbackLocation.id),
    locationSource: normalizeString(record.locationSource, fallbackLocation.source || "fluxa_locations") as LocationSource,
    name: normalizeString(record.name, fallbackLocation.name),
    address: normalizeString(record.address, fallbackLocation.address),
    brand: normalizeString(record.brand, fallbackLocation.brand),
    city: normalizeString(record.city, fallbackLocation.city),
    status: normalizeString(record.status, fallbackLocation.status)
  };
}

function mapReportRow(row: LocationErrorReportRow): LocationErrorReportRecord {
  return {
    id: row.id,
    locationId: row.location_id,
    locationSource: row.location_source,
    reporterUserId: row.reporter_user_id,
    reporterLabel: row.reporter_label,
    category: row.category,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    details: row.details,
    fieldKey: row.field_key,
    contextTab: row.context_tab,
    relatedAttemptId: row.related_attempt_id,
    relatedReviewId: row.related_review_id,
    relatedReviewSource: row.related_review_source,
    locationSnapshot: normalizeLocationSnapshot(row.location_snapshot, {
      id: row.location_id,
      name: "Unknown location",
      address: "Unknown address",
      brand: "Unknown",
      city: "Unknown",
      status: "active",
      source: row.location_source
    }),
    reportContext: normalizeRecord(row.report_context),
    attachments: normalizeAttachmentArray(row.attachments),
    resolutionType: row.resolution_type,
    resolutionNote: row.resolution_note,
    linkedLinearIssueId: row.linked_linear_issue_id,
    linkedLinearIssueUrl: row.linked_linear_issue_url,
    triagedBy: row.triaged_by,
    resolvedBy: row.resolved_by,
    triagedAt: row.triaged_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEventRow(row: LocationErrorReportEventRow): LocationErrorReportEventRecord {
  return {
    id: row.id,
    reportId: row.report_id,
    actorUserId: row.actor_user_id,
    actorLabel: row.actor_label,
    eventType: row.event_type,
    visibility: row.visibility,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    metadata: normalizeRecord(row.metadata),
    createdAt: row.created_at
  };
}

function buildReporterLabel(user: Awaited<ReturnType<typeof getViewerSessionUser>>): string {
  if (!user) {
    return "Unknown User";
  }

  return (
    normalizeOptionalString(user.user_metadata?.full_name) ||
    normalizeOptionalString(user.user_metadata?.name) ||
    normalizeOptionalString(user.email) ||
    user.id
  );
}

function buildLocationSnapshot(location: LocationRecord): LocationErrorReportLocationSnapshot {
  return {
    locationId: location.id,
    locationSource: location.source || "fluxa_locations",
    name: location.name,
    address: location.address,
    brand: location.brand,
    city: location.city,
    status: location.status
  };
}

function buildReportContext(input: CreateLocationErrorReportInput): Record<string, unknown> {
  const nextContext = {
    ...input.reportContext,
    ...(input.evidenceText ? { evidenceText: input.evidenceText.trim() } : {}),
    ...(typeof window !== "undefined"
      ? {
          pagePath: `${window.location.pathname}${window.location.search}`,
          pageHash: window.location.hash || null
        }
      : {})
  };

  return Object.fromEntries(
    Object.entries(nextContext).filter(([, value]) => value !== undefined)
  );
}

function sanitizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "attachment";
}

function createReportId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `report-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRpcRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value;
}

function validateAttachments(files: File[]): void {
  if (files.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(`You can upload up to ${MAX_ATTACHMENT_COUNT} attachments per report.`);
  }

  files.forEach((file) => {
    if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new Error(`"${file.name}" is larger than 5 MB. Please upload a smaller file.`);
    }
  });
}

async function uploadAttachments(
  reportId: string,
  reporterUserId: string,
  files: File[]
): Promise<{ attachments: LocationErrorReportAttachmentRecord[]; warning: string | null }> {
  const attachments: LocationErrorReportAttachmentRecord[] = [];
  const failedNames: string[] = [];

  for (const file of files) {
    const timestamp = Date.now();
    const path = `${reportId}/${reporterUserId}/${timestamp}-${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(REPORT_ATTACHMENT_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined
      });

    if (error) {
      failedNames.push(file.name);
      continue;
    }

    attachments.push({
      path,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: new Date().toISOString()
    });
  }

  if (failedNames.length === 0) {
    return { attachments, warning: null };
  }

  const warning =
    attachments.length > 0
      ? `The report was saved, but some attachments failed to upload: ${failedNames.join(", ")}.`
      : `The report was saved, but attachments failed to upload: ${failedNames.join(", ")}.`;

  return { attachments, warning };
}

async function finalizeAttachments(reportId: string, attachments: LocationErrorReportAttachmentRecord[]): Promise<LocationErrorReportRecord | null> {
  if (attachments.length === 0) {
    return null;
  }

  const { data, error } = await supabase.rpc("finalize_location_error_report_attachments", {
    p_report_id: reportId,
    p_attachments: attachments
  });

  if (error) {
    throw error;
  }

  const row = normalizeRpcRow(data as LocationErrorReportRow | LocationErrorReportRow[] | null);
  return row ? mapReportRow(row) : null;
}

export const reportService = {
  async createLocationErrorReport(location: LocationRecord, input: CreateLocationErrorReportInput): Promise<CreateLocationErrorReportResult> {
    const user = await getViewerSessionUser();

    if (!user?.id) {
      throw new Error("Your session has expired. Please sign in again before submitting a report.");
    }

    if (isTrialViewerUser(user)) {
      throw new Error("Trial mode does not support error reports yet.");
    }

    const summary = normalizeString(input.summary);
    const details = normalizeString(input.details);

    if (!summary) {
      throw new Error("Please enter a short summary before submitting.");
    }

    if (!details) {
      throw new Error("Please enter the report details before submitting.");
    }

    const attachments = input.attachments || [];
    validateAttachments(attachments);

    const reportId = createReportId();
    const reporterLabel = buildReporterLabel(user);
    const insertPayload = {
      id: reportId,
      location_id: location.id,
      location_source: location.source || "fluxa_locations",
      reporter_user_id: user.id,
      reporter_label: reporterLabel,
      category: input.category,
      severity: input.severity,
      status: "submitted",
      summary,
      details,
      field_key: normalizeOptionalString(input.fieldKey),
      context_tab: input.contextTab || null,
      related_attempt_id: normalizeOptionalString(input.relatedAttemptId),
      related_review_id: normalizeOptionalString(input.relatedReviewId),
      related_review_source: input.relatedReviewSource || null,
      location_snapshot: buildLocationSnapshot(location),
      report_context: buildReportContext(input),
      attachments: []
    };

    const { data, error } = await supabase
      .from("location_error_reports")
      .insert(insertPayload)
      .select(REPORT_COLUMNS)
      .single();

    if (error) {
      throw error;
    }

    let report = mapReportRow(data as LocationErrorReportRow);
    let attachmentWarning: string | null = null;

    if (attachments.length > 0) {
      const uploaded = await uploadAttachments(reportId, user.id, attachments);
      attachmentWarning = uploaded.warning;

      if (uploaded.attachments.length > 0) {
        try {
          const finalizedReport = await finalizeAttachments(reportId, uploaded.attachments);
          if (finalizedReport) {
            report = finalizedReport;
          }
        } catch (attachmentError) {
          attachmentWarning =
            attachmentError instanceof Error && attachmentError.message
              ? attachmentError.message
              : "The report was saved, but attachments could not be linked.";
        }
      }
    }

    return {
      report,
      attachmentWarning
    };
  },

  async listMyLocationErrorReports(): Promise<LocationErrorReportRecord[]> {
    const { data, error } = await supabase
      .from("location_error_reports")
      .select(REPORT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data || []) as LocationErrorReportRow[]).map(mapReportRow);
  },

  async listAdminLocationErrorReports(): Promise<LocationErrorReportRecord[]> {
    const { data, error } = await supabase
      .from("location_error_reports")
      .select(REPORT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw error;
    }

    return ((data || []) as LocationErrorReportRow[]).map(mapReportRow);
  },

  async getLocationErrorReport(reportId: string): Promise<LocationErrorReportRecord | null> {
    const { data, error } = await supabase
      .from("location_error_reports")
      .select(REPORT_COLUMNS)
      .eq("id", reportId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapReportRow(data as LocationErrorReportRow) : null;
  },

  async listLocationErrorReportEvents(reportId: string): Promise<LocationErrorReportEventRecord[]> {
    const { data, error } = await supabase
      .from("location_error_report_events")
      .select(EVENT_COLUMNS)
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return ((data || []) as LocationErrorReportEventRow[]).map(mapEventRow);
  },

  async transitionLocationErrorReport(reportId: string, input: TransitionLocationErrorReportInput): Promise<LocationErrorReportRecord> {
    const { data, error } = await supabase.rpc("transition_location_error_report", {
      p_report_id: reportId,
      p_status: input.status || null,
      p_note: normalizeOptionalString(input.note),
      p_resolution_type: normalizeOptionalString(input.resolutionType),
      p_resolution_note: normalizeOptionalString(input.resolutionNote),
      p_linked_linear_issue_id: normalizeOptionalString(input.linkedLinearIssueId),
      p_linked_linear_issue_url: normalizeOptionalString(input.linkedLinearIssueUrl),
      p_visibility: input.visibility || "internal"
    });

    if (error) {
      throw error;
    }

    const row = normalizeRpcRow(data as LocationErrorReportRow | LocationErrorReportRow[] | null);

    if (!row) {
      throw new Error("Unable to update the error report right now.");
    }

    return mapReportRow(row);
  },

  async addLocationErrorReportNote(reportId: string, note: string, visibility: "public" | "internal" = "internal"): Promise<void> {
    const { error } = await supabase.rpc("add_location_error_report_event", {
      p_report_id: reportId,
      p_event_type: "note",
      p_note: normalizeOptionalString(note),
      p_visibility: visibility,
      p_metadata: {}
    });

    if (error) {
      throw error;
    }
  },

  async getAttachmentSignedUrl(path: string, expiresInSeconds = 3600): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(REPORT_ATTACHMENT_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      throw error;
    }

    return data?.signedUrl || null;
  }
};
