import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { ExternalLink, RefreshCcw, ShieldAlert, SquareArrowOutUpRight } from "lucide-react";

import { useAdminLocationErrorReports } from "@/hooks/use-admin-location-error-reports";
import { useI18n } from "@/i18n";
import { reportService } from "@/services/report-service";
import {
  getLocationErrorReportCategoryLabel,
  getLocationErrorReportSeverityLabel,
  getLocationErrorReportStatusLabel,
  LOCATION_ERROR_REPORT_SEVERITY_OPTIONS,
  LOCATION_ERROR_REPORT_STATUS_OPTIONS,
  type LocationErrorReportEventRecord,
  type LocationErrorReportRecord,
  type LocationErrorReportStatus
} from "@/types/location-error-report";

interface AdminLocationErrorReportsProps {
  embedded?: boolean;
  isAdmin: boolean;
  onOpenLocation: (locationId: string) => Promise<void>;
  showHeader?: boolean;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function matchesQuery(report: LocationErrorReportRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    report.id,
    report.summary,
    report.details,
    report.reporterLabel,
    report.locationSnapshot.name,
    report.locationSnapshot.address,
    report.locationSnapshot.brand,
    report.locationSnapshot.city,
    report.linkedLinearIssueId || "",
    report.linkedLinearIssueUrl || ""
  ].join("\n").toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function AdminLocationErrorReports({
  embedded = false,
  isAdmin,
  onOpenLocation,
  showHeader = true
}: AdminLocationErrorReportsProps): React.JSX.Element {
  const { t } = useI18n();
  const { reports, loading, error, refreshReports } = useAdminLocationErrorReports({
    enabled: isAdmin
  });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LocationErrorReportStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | LocationErrorReportRecord["severity"]>("all");
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<LocationErrorReportEventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [resolutionType, setResolutionType] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [linkedLinearIssueId, setLinkedLinearIssueId] = useState("");
  const [linkedLinearIssueUrl, setLinkedLinearIssueUrl] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        if (statusFilter !== "all" && report.status !== statusFilter) {
          return false;
        }

        if (severityFilter !== "all" && report.severity !== severityFilter) {
          return false;
        }

        return matchesQuery(report, query.trim());
      }),
    [query, reports, severityFilter, statusFilter]
  );

  const selectedReport = useMemo(
    () => filteredReports.find((report) => report.id === selectedReportId) || filteredReports[0] || null,
    [filteredReports, selectedReportId]
  );

  useEffect(() => {
    if (!selectedReport && filteredReports.length === 0) {
      setSelectedReportId(null);
      return;
    }

    if (selectedReport) {
      setSelectedReportId(selectedReport.id);
    }
  }, [filteredReports, selectedReport]);

  useEffect(() => {
    if (!selectedReport) {
      setEvents([]);
      setAttachmentUrls({});
      setNote("");
      setResolutionType("");
      setResolutionNote("");
      setLinkedLinearIssueId("");
      setLinkedLinearIssueUrl("");
      setActionError(null);
      return;
    }

    setResolutionType(selectedReport.resolutionType || "");
    setResolutionNote(selectedReport.resolutionNote || "");
    setLinkedLinearIssueId(selectedReport.linkedLinearIssueId || "");
    setLinkedLinearIssueUrl(selectedReport.linkedLinearIssueUrl || "");
    setActionError(null);
  }, [selectedReport]);

  useEffect(() => {
    if (!selectedReport) {
      return;
    }

    let cancelled = false;
    setEventsLoading(true);

    void reportService.listLocationErrorReportEvents(selectedReport.id)
      .then((nextEvents) => {
        if (!cancelled) {
          setEvents(nextEvents);
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setActionError(
            nextError instanceof Error && nextError.message
              ? nextError.message
              : t("Unable to load the report history right now.")
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEventsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedReport, t]);

  useEffect(() => {
    if (!selectedReport || selectedReport.attachments.length === 0) {
      setAttachmentUrls({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      selectedReport.attachments.map(async (attachment) => {
        const signedUrl = await reportService.getAttachmentSignedUrl(attachment.path);
        return [attachment.path, signedUrl || ""] as const;
      })
    )
      .then((pairs) => {
        if (cancelled) {
          return;
        }

        setAttachmentUrls(Object.fromEntries(pairs));
      })
      .catch(() => {
        if (!cancelled) {
          setAttachmentUrls({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedReport]);

  const handleRefresh = async (): Promise<void> => {
    setActionError(null);
    await refreshReports();
  };

  const handleTransition = async (status?: LocationErrorReportStatus): Promise<void> => {
    if (!selectedReport) {
      return;
    }

    setActionSaving(true);
    setActionError(null);

    try {
      await reportService.transitionLocationErrorReport(selectedReport.id, {
        status,
        note,
        resolutionType,
        resolutionNote,
        linkedLinearIssueId,
        linkedLinearIssueUrl,
        visibility: "internal"
      });

      setNote("");
      await refreshReports();
      const nextEvents = await reportService.listLocationErrorReportEvents(selectedReport.id);
      setEvents(nextEvents);
    } catch (nextError) {
      setActionError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : t("Unable to update the error report right now.")
      );
    } finally {
      setActionSaving(false);
    }
  };

  const handleAddNote = async (): Promise<void> => {
    if (!selectedReport || !note.trim()) {
      return;
    }

    setActionSaving(true);
    setActionError(null);

    try {
      await reportService.addLocationErrorReportNote(selectedReport.id, note, "internal");
      setNote("");
      const nextEvents = await reportService.listLocationErrorReportEvents(selectedReport.id);
      setEvents(nextEvents);
    } catch (nextError) {
      setActionError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : t("Unable to add an internal note right now.")
      );
    } finally {
      setActionSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className={`flex min-h-0 min-w-0 flex-1 items-center justify-center ${embedded ? "p-6" : "bg-[#FAFAFA] p-6"}`}>
        <div className="max-w-lg rounded-[28px] border border-[rgba(245,158,11,0.18)] bg-white px-6 py-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[var(--foreground)]">{t("Admin Access Required")}</p>
              <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("Only administrators can review and process submitted error reports.")}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`flex min-h-0 min-w-0 flex-1 flex-col ${embedded ? "h-full" : "bg-[#FAFAFA] p-3 sm:p-4"}`}>
      {showHeader ? (
        <>
          <header className="flex flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="space-y-1">
              <h1 className="text-[28px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Error Report Queue")}</h1>
              <p className="text-sm leading-[1.5] text-[var(--muted-foreground)]">
                {t("Triage, process, and close user-submitted errors from Location Detail.")}
              </p>
            </div>

            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              onClick={() => {
                void handleRefresh();
              }}
              type="button"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>{loading ? t("Loading...") : t("Refresh")}</span>
            </button>
          </header>

          <div className="h-px w-full bg-[var(--input)]" />
        </>
      ) : null}

      <div
        className={`grid min-h-0 grid-cols-1 gap-4 overflow-hidden px-4 py-4 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] ${
          showHeader ? "lg:px-10" : "lg:px-4"
        } ${
          embedded ? "min-h-[820px]" : "flex-1"
        }`}
      >
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border border-[var(--input)] bg-white">
          <div className="border-b border-[var(--input)] px-5 py-4">
            <input
              className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search reports by summary, location, reporter, or report ID")}
              type="text"
              value={query}
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                className="h-10 rounded-pill border border-[var(--input)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                value={statusFilter}
              >
                <option value="all">{t("All Statuses")}</option>
                {LOCATION_ERROR_REPORT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>

              <select
                className="h-10 rounded-pill border border-[var(--input)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
                onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}
                value={severityFilter}
              >
                <option value="all">{t("All Severities")}</option>
                {LOCATION_ERROR_REPORT_SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {error ? (
              <div className="rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm leading-[1.7] text-[#7A1F0E]">
                {error}
              </div>
            ) : null}

            {!error && filteredReports.length === 0 ? (
              <div className="rounded-[18px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                {t("No error reports matched the current filters.")}
              </div>
            ) : null}

            <div className="space-y-3">
              {filteredReports.map((report) => {
                const isSelected = report.id === selectedReport?.id;

                return (
                  <button
                    className={`w-full rounded-[22px] border px-4 py-4 text-left transition-colors duration-200 ${
                      isSelected
                        ? "border-[var(--primary)] bg-[rgba(79,70,229,0.06)]"
                        : "border-[var(--input)] bg-white hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    }`}
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-pill border border-[var(--input)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                        {t(getLocationErrorReportStatusLabel(report.status))}
                      </span>
                      <span className="inline-flex rounded-pill border border-[var(--input)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                        {t(getLocationErrorReportSeverityLabel(report.severity))}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-[1.5] text-[var(--foreground)]">{report.summary}</p>
                    <p className="mt-2 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                      {report.locationSnapshot.name} · {t(getLocationErrorReportCategoryLabel(report.category))}
                    </p>
                    <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                      {report.reporterLabel} · {formatDateTime(report.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-h-0 min-w-0 overflow-hidden rounded-[24px] border border-[var(--input)] bg-white">
          {!selectedReport ? (
            <div className="flex h-full items-center justify-center px-6 py-6 text-sm leading-[1.7] text-[var(--muted-foreground)]">
              {t("Select an error report from the queue to review its details.")}
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[var(--input)] px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-pill border border-[var(--input)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                        {selectedReport.id}
                      </span>
                      <span className="inline-flex rounded-pill border border-[var(--input)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                        {t(getLocationErrorReportStatusLabel(selectedReport.status))}
                      </span>
                      <span className="inline-flex rounded-pill border border-[var(--input)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                        {t(getLocationErrorReportSeverityLabel(selectedReport.severity))}
                      </span>
                    </div>
                    <h2 className="mt-3 text-[24px] font-semibold leading-[1.3] text-[var(--foreground)]">
                      {selectedReport.summary}
                    </h2>
                    <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                      {t(getLocationErrorReportCategoryLabel(selectedReport.category))} · {selectedReport.reporterLabel} · {formatDateTime(selectedReport.createdAt)}
                    </p>
                  </div>

                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    onClick={() => {
                      void onOpenLocation(selectedReport.locationId);
                    }}
                    type="button"
                  >
                    <SquareArrowOutUpRight className="h-4 w-4" />
                    <span>{t("Open Location Detail")}</span>
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-h-0 overflow-y-auto px-6 py-5">
                  <section className="rounded-[22px] border border-[var(--input)] bg-[var(--accent)] px-5 py-5">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Report Details")}</h3>
                    <p className="mt-3 text-sm leading-[1.8] text-[var(--foreground)]">{selectedReport.details}</p>
                    {selectedReport.fieldKey ? (
                      <p className="mt-3 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                        {t("Affected Field (Optional)")}: {selectedReport.fieldKey}
                      </p>
                    ) : null}
                  </section>

                  <section className="mt-5 rounded-[22px] border border-[var(--input)] bg-white px-5 py-5">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Location Snapshot")}</h3>
                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm leading-[1.7] text-[var(--muted-foreground)] sm:grid-cols-2">
                      <p><span className="font-medium text-[var(--foreground)]">{t("Location")}:</span> {selectedReport.locationSnapshot.name}</p>
                      <p><span className="font-medium text-[var(--foreground)]">{t("Brand")}:</span> {selectedReport.locationSnapshot.brand}</p>
                      <p className="sm:col-span-2"><span className="font-medium text-[var(--foreground)]">{t("Address")}:</span> {selectedReport.locationSnapshot.address}</p>
                      <p><span className="font-medium text-[var(--foreground)]">{t("City")}:</span> {selectedReport.locationSnapshot.city}</p>
                      <p><span className="font-medium text-[var(--foreground)]">{t("Status")}:</span> {selectedReport.locationSnapshot.status}</p>
                    </div>
                  </section>

                  {selectedReport.attachments.length > 0 ? (
                    <section className="mt-5 rounded-[22px] border border-[var(--input)] bg-white px-5 py-5">
                      <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Attachments")}</h3>
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {selectedReport.attachments.map((attachment) => {
                          const signedUrl = attachmentUrls[attachment.path];

                          return (
                            <div className="rounded-[20px] border border-[var(--input)] bg-[var(--accent)] p-3" key={attachment.path}>
                              {signedUrl ? (
                                <a href={signedUrl} rel="noreferrer" target="_blank">
                                  <img
                                    alt={attachment.fileName}
                                    className="h-[180px] w-full rounded-[16px] object-cover"
                                    src={signedUrl}
                                  />
                                </a>
                              ) : (
                                <div className="flex h-[180px] items-center justify-center rounded-[16px] border border-dashed border-[var(--input)] text-sm text-[var(--muted-foreground)]">
                                  {t("Attachment preview unavailable")}
                                </div>
                              )}
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{attachment.fileName}</p>
                                  <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(attachment.uploadedAt)}</p>
                                </div>
                                {signedUrl ? (
                                  <a
                                    className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-3 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                                    href={signedUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    <span>{t("Open")}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section className="mt-5 rounded-[22px] border border-[var(--input)] bg-white px-5 py-5">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Audit Trail")}</h3>
                    {eventsLoading ? (
                      <p className="mt-4 text-sm text-[var(--muted-foreground)]">{t("Loading...")}</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {events.map((event) => (
                          <div className="rounded-[18px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4" key={event.id}>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-pill border border-[var(--input)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                                {t(event.eventType === "status_changed" ? "Status Changed" : event.eventType === "attachments_added" ? "Attachments Added" : event.eventType === "submitted" ? "Submitted" : "Internal Note")}
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(event.createdAt)}</span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">{event.actorLabel}</p>
                            {event.fromStatus || event.toStatus ? (
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                {event.fromStatus ? t(getLocationErrorReportStatusLabel(event.fromStatus)) : t("No previous status")}
                                {" -> "}
                                {event.toStatus ? t(getLocationErrorReportStatusLabel(event.toStatus)) : t("No next status")}
                              </p>
                            ) : null}
                            {event.note ? (
                              <p className="mt-2 text-sm leading-[1.7] text-[var(--foreground)]">{event.note}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <aside className="min-h-0 overflow-y-auto border-t border-[var(--input)] bg-[#FCFCFD] px-6 py-5 xl:border-l xl:border-t-0">
                  <section className="rounded-[22px] border border-[var(--input)] bg-white px-4 py-4">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Process Report")}</h3>

                    {actionError ? (
                      <div className="mt-4 rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm leading-[1.7] text-[#7A1F0E]">
                        {actionError}
                      </div>
                    ) : null}

                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("Internal Note")}</span>
                      <textarea
                        className="min-h-[120px] w-full rounded-[20px] border border-[var(--input)] px-4 py-3 text-sm leading-[1.7] text-[var(--foreground)] outline-none"
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={t("Record the triage judgment, blocker, or processing note here.")}
                        value={note}
                      />
                    </label>

                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("Resolution Type (Optional)")}</span>
                      <input
                        className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none"
                        onChange={(event) => setResolutionType(event.target.value)}
                        placeholder={t("Examples: data_fix, content_cleanup, product_bug")}
                        type="text"
                        value={resolutionType}
                      />
                    </label>

                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("Resolution Note (Optional)")}</span>
                      <textarea
                        className="min-h-[110px] w-full rounded-[20px] border border-[var(--input)] px-4 py-3 text-sm leading-[1.7] text-[var(--foreground)] outline-none"
                        onChange={(event) => setResolutionNote(event.target.value)}
                        placeholder={t("Describe how the report was handled or why it was closed.")}
                        value={resolutionNote}
                      />
                    </label>

                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("Linked Linear Issue (Optional)")}</span>
                      <input
                        className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none"
                        onChange={(event) => setLinkedLinearIssueId(event.target.value)}
                        placeholder="ALL-54"
                        type="text"
                        value={linkedLinearIssueId}
                      />
                    </label>

                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("Linked Linear URL (Optional)")}</span>
                      <input
                        className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none"
                        onChange={(event) => setLinkedLinearIssueUrl(event.target.value)}
                        placeholder="https://linear.app/..."
                        type="text"
                        value={linkedLinearIssueUrl}
                      />
                    </label>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving || !note.trim()}
                        onClick={() => {
                          void handleAddNote();
                        }}
                        type="button"
                      >
                        {t("Add Internal Note")}
                      </button>
                      <button
                        className="inline-flex h-10 items-center rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving}
                        onClick={() => {
                          void handleTransition("triaged");
                        }}
                        type="button"
                      >
                        {t("Triaged")}
                      </button>
                      <button
                        className="inline-flex h-10 items-center rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving}
                        onClick={() => {
                          void handleTransition("need_info");
                        }}
                        type="button"
                      >
                        {t("Need Info")}
                      </button>
                      <button
                        className="inline-flex h-10 items-center rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving}
                        onClick={() => {
                          void handleTransition("accepted");
                        }}
                        type="button"
                      >
                        {t("Accepted")}
                      </button>
                      <button
                        className="inline-flex h-10 items-center rounded-pill bg-[#FEE2E2] px-4 text-sm font-medium text-[#991B1B] transition-colors duration-200 hover:bg-[#FECACA] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving}
                        onClick={() => {
                          void handleTransition("rejected");
                        }}
                        type="button"
                      >
                        {t("Rejected")}
                      </button>
                      <button
                        className="inline-flex h-10 items-center rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving}
                        onClick={() => {
                          void handleTransition("resolved");
                        }}
                        type="button"
                      >
                        {t("Resolved")}
                      </button>
                      <button
                        className="inline-flex h-10 items-center rounded-pill bg-[var(--foreground)] px-4 text-sm font-medium text-white transition-colors duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={actionSaving}
                        onClick={() => {
                          void handleTransition("closed");
                        }}
                        type="button"
                      >
                        {t("Closed")}
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
