import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { CheckCircle2, Clock3, ExternalLink, RefreshCcw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useViewerAccess } from "@/hooks/use-viewer-access";
import { useI18n } from "@/i18n";
import { reportService } from "@/services/report-service";
import {
  getLocationErrorReportCategoryLabel,
  getLocationErrorReportSeverityLabel,
  getLocationErrorReportStatusLabel,
  type LocationErrorReportAttachmentRecord,
  type LocationErrorReportRecord
} from "@/types/location-error-report";

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function readEvidenceText(report: LocationErrorReportRecord): string | null {
  const value = report.reportContext.evidenceText;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getStatusPillClass(status: LocationErrorReportRecord["status"]): string {
  if (status === "resolved" || status === "closed") {
    return "border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.9)] text-[#047857]";
  }

  if (status === "rejected") {
    return "border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.9)] text-[#B91C1C]";
  }

  return "border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.9)] text-[#B45309]";
}

function getSeverityPillClass(severity: LocationErrorReportRecord["severity"]): string {
  if (severity === "high") {
    return "border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.9)] text-[#B91C1C]";
  }

  if (severity === "low") {
    return "border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.9)] text-[#047857]";
  }

  return "border-[rgba(59,130,246,0.18)] bg-[rgba(239,246,255,0.92)] text-[#1D4ED8]";
}

function ReportDetailDialog({
  attachmentOpeningPath,
  onOpenAttachment,
  onOpenChange,
  open,
  report
}: {
  attachmentOpeningPath: string | null;
  onOpenAttachment: (attachment: LocationErrorReportAttachmentRecord) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  report: LocationErrorReportRecord | null;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] max-w-[min(860px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-[32px] p-0">
        {report ? (
          <>
            <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
              <DialogTitle>{report.summary}</DialogTitle>
              <DialogDescription>
                {report.locationSnapshot.name} · {t("Submitted At")} {formatDateTime(report.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex min-w-0 flex-col gap-5">
                <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-pill border px-2.5 py-1 text-[11px] font-medium ${getStatusPillClass(report.status)}`}>
                      {t(getLocationErrorReportStatusLabel(report.status))}
                    </span>
                    <span className={`inline-flex rounded-pill border px-2.5 py-1 text-[11px] font-medium ${getSeverityPillClass(report.severity)}`}>
                      {t(getLocationErrorReportSeverityLabel(report.severity))}
                    </span>
                    <span className="inline-flex rounded-pill border border-[var(--input)] bg-[var(--accent)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                      {t(getLocationErrorReportCategoryLabel(report.category))}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Details")}</p>
                      <p className="mt-2 text-sm leading-[1.7] text-[var(--foreground)]">{report.details}</p>
                    </div>

                    {report.fieldKey ? (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Affected Field (Optional)")}</p>
                        <p className="mt-2 text-sm leading-[1.7] text-[var(--foreground)]">{report.fieldKey}</p>
                      </div>
                    ) : null}

                    {readEvidenceText(report) ? (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Evidence or Notes (Optional)")}</p>
                        <p className="mt-2 text-sm leading-[1.7] text-[var(--foreground)]">{readEvidenceText(report)}</p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Location Snapshot")}</h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm leading-[1.7] text-[var(--muted-foreground)] sm:grid-cols-2">
                    <p><span className="font-medium text-[var(--foreground)]">{t("Location")}:</span> {report.locationSnapshot.name}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{t("Brand")}:</span> {report.locationSnapshot.brand}</p>
                    <p className="sm:col-span-2"><span className="font-medium text-[var(--foreground)]">{t("Address")}:</span> {report.locationSnapshot.address}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{t("City")}:</span> {report.locationSnapshot.city}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{t("Status")}:</span> {report.locationSnapshot.status}</p>
                  </div>
                </section>

                <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Processing Outcome")}</h3>
                  <div className="mt-4 space-y-3 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                    <p><span className="font-medium text-[var(--foreground)]">{t("Submitted At")}:</span> {formatDateTime(report.createdAt)}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{t("Last Updated")}:</span> {formatDateTime(report.updatedAt)}</p>
                    <p><span className="font-medium text-[var(--foreground)]">{t("Status")}:</span> {t(getLocationErrorReportStatusLabel(report.status))}</p>
                    {report.resolutionNote ? (
                      <p><span className="font-medium text-[var(--foreground)]">{t("Resolution Note (Optional)")}: </span>{report.resolutionNote}</p>
                    ) : (
                      <p>{t("No resolution details yet.")}</p>
                    )}
                    {report.linkedLinearIssueUrl ? (
                      <a
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] underline underline-offset-2"
                        href={report.linkedLinearIssueUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>{report.linkedLinearIssueId || report.linkedLinearIssueUrl}</span>
                      </a>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Attachments")}</h3>
                  {report.attachments.length === 0 ? (
                    <p className="mt-4 text-sm leading-[1.7] text-[var(--muted-foreground)]">{t("No attachments were uploaded for this report.")}</p>
                  ) : (
                    <div className="mt-4 flex flex-col gap-3">
                      {report.attachments.map((attachment) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--input)] bg-[var(--accent)] px-4 py-3"
                          key={attachment.path}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">{attachment.fileName}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(attachment.uploadedAt)}</p>
                          </div>
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={attachmentOpeningPath === attachment.path}
                            onClick={() => {
                              void onOpenAttachment(attachment);
                            }}
                            type="button"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>{attachmentOpeningPath === attachment.path ? t("Loading...") : t("Open Attachment")}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>

            <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
              <button
                className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                {t("Close")}
              </button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function SubmittedReportsWeb(): React.JSX.Element {
  const { t } = useI18n();
  const { isTrial, loading: viewerAccessLoading } = useViewerAccess({
    enabled: true
  });
  const [reports, setReports] = useState<LocationErrorReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<LocationErrorReportRecord | null>(null);
  const [attachmentOpeningPath, setAttachmentOpeningPath] = useState<string | null>(null);

  const loadReports = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const nextReports = await reportService.listMyLocationErrorReports();
      setReports(nextReports);
    } catch (nextError) {
      setError(
        nextError instanceof Error && nextError.message
          ? nextError.message
          : t("Unable to load your submitted reports right now.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const totalReports = reports.length;
  const openReports = useMemo(
    () => reports.filter((report) => ["submitted", "triaged", "need_info", "accepted"].includes(report.status)).length,
    [reports]
  );
  const resolvedReports = useMemo(
    () => reports.filter((report) => report.status === "resolved" || report.status === "closed").length,
    [reports]
  );

  const handleOpenAttachment = async (attachment: LocationErrorReportAttachmentRecord): Promise<void> => {
    setAttachmentOpeningPath(attachment.path);

    try {
      const signedUrl = await reportService.getAttachmentSignedUrl(attachment.path);
      if (signedUrl && typeof window !== "undefined") {
        window.open(signedUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setAttachmentOpeningPath(null);
    }
  };

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] p-3 sm:p-4">
      <header className="flex flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Submitted Reports")}</h1>
          <p className="text-sm leading-[1.5] text-[var(--muted-foreground)]">
            {t("Review the issue reports you have submitted before.")}
          </p>
        </div>

        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
          onClick={() => {
            void loadReports();
          }}
          type="button"
        >
          <RefreshCcw className="h-4 w-4" />
          <span>{loading ? t("Loading...") : t("Refresh")}</span>
        </button>
      </header>

      <div className="h-px w-full bg-[var(--input)]" />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-[24px] border border-[var(--input)] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Total Submitted")}</p>
            <p className="mt-3 text-[32px] font-semibold leading-none text-[var(--foreground)]">{totalReports}</p>
          </article>
          <article className="rounded-[24px] border border-[var(--input)] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Open Reports")}</p>
            <p className="mt-3 text-[32px] font-semibold leading-none text-[var(--foreground)]">{openReports}</p>
          </article>
          <article className="rounded-[24px] border border-[var(--input)] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Resolved Reports")}</p>
            <p className="mt-3 text-[32px] font-semibold leading-none text-[var(--foreground)]">{resolvedReports}</p>
          </article>
        </div>

        {viewerAccessLoading || loading ? (
          <div className="rounded-[24px] border border-[var(--input)] bg-white px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
            {t("Loading your submitted reports...")}
          </div>
        ) : null}

        {!viewerAccessLoading && !loading && error ? (
          <div className="rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm leading-[1.7] text-[#7A1F0E]">
            {error}
          </div>
        ) : null}

        {!viewerAccessLoading && !loading && !error && (isTrial || reports.length === 0) ? (
          <div className="rounded-[24px] border border-[var(--input)] bg-white px-6 py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(79,70,229,0.08)] text-[var(--primary)]">
              <Clock3 className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">{t("No submitted reports yet.")}</p>
            <p className="mt-2 text-sm leading-[1.6] text-[var(--muted-foreground)]">
              {isTrial
                ? t("Trial mode does not support error reports yet.")
                : t("The error reports you submit from Location Detail will appear here.")}
            </p>
          </div>
        ) : null}

        {!viewerAccessLoading && !loading && !error && reports.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {reports.map((report) => (
              <article
                className="rounded-[24px] border border-[var(--input)] bg-white p-5 shadow-[0_12px_36px_-32px_rgba(15,23,42,0.4)]"
                key={report.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-pill border px-2.5 py-1 text-[11px] font-medium ${getStatusPillClass(report.status)}`}>
                    {t(getLocationErrorReportStatusLabel(report.status))}
                  </span>
                  <span className={`inline-flex rounded-pill border px-2.5 py-1 text-[11px] font-medium ${getSeverityPillClass(report.severity)}`}>
                    {t(getLocationErrorReportSeverityLabel(report.severity))}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-semibold leading-[1.35] text-[var(--foreground)]">{report.summary}</h2>
                <p className="mt-2 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                  {t(getLocationErrorReportCategoryLabel(report.category))} · {report.locationSnapshot.name}
                </p>
                <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                  {t("Submitted At")}: {formatDateTime(report.createdAt)}
                </p>

                <div className="mt-4 rounded-[20px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4">
                  <p className="line-clamp-4 text-sm leading-[1.7] text-[var(--foreground)]">{report.details}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{report.attachments.length} {t("Attachments")}</span>
                  </div>
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                    onClick={() => setSelectedReport(report)}
                    type="button"
                  >
                    <span>{t("Open Report")}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      <ReportDetailDialog
        attachmentOpeningPath={attachmentOpeningPath}
        onOpenAttachment={handleOpenAttachment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReport(null);
          }
        }}
        open={Boolean(selectedReport)}
        report={selectedReport}
      />
    </section>
  );
}
