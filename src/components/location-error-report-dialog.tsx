import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleX, Paperclip, RotateCcw, Send } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { reportService } from "@/services/report-service";
import type { LocationRecord } from "@/types/location";
import {
  LOCATION_ERROR_REPORT_CATEGORY_OPTIONS,
  LOCATION_ERROR_REPORT_SEVERITY_OPTIONS,
  type CreateLocationErrorReportInput,
  type LocationErrorReportContextTab,
  type LocationErrorReportRelatedReviewSource
} from "@/types/location-error-report";

interface LocationErrorReportDialogSeed {
  category?: CreateLocationErrorReportInput["category"];
  severity?: CreateLocationErrorReportInput["severity"];
  summary?: string;
  details?: string;
  fieldKey?: string;
  contextTab?: LocationErrorReportContextTab | null;
  relatedAttemptId?: string | null;
  relatedReviewId?: string | null;
  relatedReviewSource?: LocationErrorReportRelatedReviewSource | null;
  evidenceText?: string;
  reportContext?: Record<string, unknown>;
}

interface LocationErrorReportDraft {
  category: CreateLocationErrorReportInput["category"];
  severity: CreateLocationErrorReportInput["severity"];
  summary: string;
  details: string;
  fieldKey: string;
  evidenceText: string;
  attachments: File[];
  contextTab: LocationErrorReportContextTab | null;
  relatedAttemptId: string | null;
  relatedReviewId: string | null;
  relatedReviewSource: LocationErrorReportRelatedReviewSource | null;
  reportContext: Record<string, unknown>;
}

interface LocationErrorReportDialogProps {
  location: LocationRecord;
  activeTab: LocationErrorReportContextTab;
  initialDraft?: LocationErrorReportDialogSeed;
  isTrial: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

type SubmitResultState =
  | {
      kind: "success";
      title: string;
      description: string;
      detail: string;
      attachmentWarning: string | null;
    }
  | {
      kind: "error";
      title: string;
      description: string;
      detail: string;
    };

function ReportSelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}): React.JSX.Element {
  const { t } = useI18n();
  const selectedLabel = options.find((option) => option.value === value)?.label || "";

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">{t(label)}</span>
      <div className="relative min-h-[56px] rounded-pill border border-[var(--border)] bg-[var(--accent)] px-5">
        <select
          className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-pill bg-transparent px-5 pr-11 opacity-0 outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
        <div className="pointer-events-none flex min-h-[54px] items-center justify-between gap-3">
          <span className="block truncate text-sm leading-[1.35] text-[var(--foreground)]">{t(selectedLabel)}</span>
          <ChevronRight className="h-4 w-4 shrink-0 rotate-90 text-[var(--muted-foreground)]" />
        </div>
      </div>
    </label>
  );
}

function buildInitialDraft(
  activeTab: LocationErrorReportContextTab,
  seed?: LocationErrorReportDialogSeed
): LocationErrorReportDraft {
  return {
    category: seed?.category || (activeTab === "reviews" ? "content_issue" : "location_info_error"),
    severity: seed?.severity || "medium",
    summary: seed?.summary || "",
    details: seed?.details || "",
    fieldKey: seed?.fieldKey || "",
    evidenceText: seed?.evidenceText || "",
    attachments: [],
    contextTab: seed?.contextTab || activeTab,
    relatedAttemptId: seed?.relatedAttemptId || null,
    relatedReviewId: seed?.relatedReviewId || null,
    relatedReviewSource: seed?.relatedReviewSource || null,
    reportContext: seed?.reportContext || {}
  };
}

export function LocationErrorReportDialog({
  location,
  activeTab,
  initialDraft,
  isTrial,
  onOpenChange,
  open
}: LocationErrorReportDialogProps): React.JSX.Element {
  const { t } = useI18n();
  const [draft, setDraft] = useState<LocationErrorReportDraft>(() => buildInitialDraft(activeTab, initialDraft));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResultState | null>(null);

  const seedSignature = useMemo(() => JSON.stringify(initialDraft || {}), [initialDraft]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSaving(false);
      setSubmitResult(null);
      setDraft(buildInitialDraft(activeTab, initialDraft));
    }
  }, [activeTab, initialDraft, open, seedSignature]);

  const handleSubmit = async (): Promise<void> => {
    if (!draft.summary.trim()) {
      setError(t("Please enter a short summary before submitting."));
      return;
    }

    if (!draft.details.trim()) {
      setError(t("Please enter the report details before submitting."));
      return;
    }

    setSaving(true);
    setError(null);
    setSubmitResult(null);

    try {
      const result = await reportService.createLocationErrorReport(location, {
        category: draft.category,
        severity: draft.severity,
        summary: draft.summary,
        details: draft.details,
        fieldKey: draft.fieldKey,
        contextTab: draft.contextTab,
        relatedAttemptId: draft.relatedAttemptId,
        relatedReviewId: draft.relatedReviewId,
        relatedReviewSource: draft.relatedReviewSource,
        evidenceText: draft.evidenceText,
        reportContext: {
          ...draft.reportContext,
          triggerTab: draft.contextTab || activeTab,
          locationName: location.name,
          locationSource: location.source || "fluxa_locations"
        },
        attachments: draft.attachments
      });

      setSubmitResult({
        kind: "success",
        title: t("Error Report Submitted"),
        description: t("Your report has been saved and sent to the admin queue."),
        detail: `${location.name} · #${result.report.id.slice(0, 8)}`,
        attachmentWarning: result.attachmentWarning
      });
      setDraft(buildInitialDraft(activeTab, initialDraft));
    } catch (submissionError) {
      setSubmitResult({
        kind: "error",
        title: t("Error Report Failed"),
        description: t("The report could not be submitted this time."),
        detail:
          submissionError instanceof Error && submissionError.message
            ? submissionError.message
            : t("Unable to submit the error report right now.")
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] max-w-[min(820px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-[32px] p-0">
        <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
          <DialogTitle>{t("Report an Error")}</DialogTitle>
          <DialogDescription>
            {t("Send this issue to the admin queue with the current location context attached automatically.")}
          </DialogDescription>
        </DialogHeader>

        {submitResult ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 sm:px-6 sm:py-6">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] px-5 py-6 sm:px-7 sm:py-8">
              <div className="flex flex-col items-start gap-4">
                <span
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
                    submitResult.kind === "success"
                      ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
                      : "bg-[#FEE2E2] text-[#B91C1C]"
                  }`}
                >
                  {submitResult.kind === "success" ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <CircleX className="h-8 w-8" />
                  )}
                </span>
                <div className="space-y-2">
                  <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.3px] text-[var(--foreground)]">
                    {submitResult.title}
                  </h2>
                  <p className="max-w-[520px] text-sm leading-[1.6] text-[var(--muted-foreground)]">
                    {submitResult.description}
                  </p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Location")}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{location.name}</p>
                </article>
                <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">
                    {t(submitResult.kind === "success" ? "Status" : "Problem")}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{submitResult.detail}</p>
                </article>
              </div>

              {submitResult.kind === "success" && submitResult.attachmentWarning ? (
                <article className="mt-4 rounded-2xl border border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.92)] p-5">
                  <p className="text-sm leading-[1.7] text-[#92400e]">{submitResult.attachmentWarning}</p>
                </article>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="flex min-w-0 flex-col gap-5">
              {isTrial ? (
                <div className="rounded-[22px] border border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.92)] px-4 py-4 text-sm leading-[1.7] text-[#92400e]">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{t("Trial mode does not support error reports yet.")}</p>
                      <p className="mt-1">{t("Please sign in with a real account to submit a report into the admin workflow.")}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm leading-[1.7] text-[#7A1F0E]">
                  {error}
                </div>
              ) : null}

              <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Issue Type")}</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {LOCATION_ERROR_REPORT_CATEGORY_OPTIONS.map((option) => (
                    <button
                      className={`rounded-[20px] border px-4 py-4 text-left transition-colors duration-200 ${
                        draft.category === option.value
                          ? "border-[var(--primary)] bg-[rgba(79,70,229,0.06)]"
                          : "border-[var(--input)] bg-white hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                      }`}
                      key={option.value}
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, category: option.value }));
                      }}
                      type="button"
                    >
                      <p className="text-sm font-medium text-[var(--foreground)]">{t(option.label)}</p>
                      <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">{t(option.description)}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <ReportSelectField
                    label="Severity"
                    onChange={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        severity: value as LocationErrorReportDraft["severity"]
                      }))
                    }
                    options={LOCATION_ERROR_REPORT_SEVERITY_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label
                    }))}
                    value={draft.severity}
                  />

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--foreground)]">{t("Affected Field (Optional)")}</span>
                    <input
                      className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none"
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          fieldKey: event.target.value
                        }))
                      }
                      placeholder={t("Examples: address, support.networks, reviews")}
                      type="text"
                      value={draft.fieldKey}
                    />
                  </label>
                </div>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t("Summary")}</span>
                  <input
                    className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none"
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        summary: event.target.value
                      }))
                    }
                    placeholder={t("One sentence summary of the problem")}
                    type="text"
                    value={draft.summary}
                  />
                </label>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t("Details")}</span>
                  <textarea
                    className="min-h-[180px] w-full rounded-[22px] border border-[var(--input)] px-4 py-3 text-sm leading-[1.7] text-[var(--foreground)] outline-none"
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        details: event.target.value
                      }))
                    }
                    placeholder={t("Describe what is wrong, what you expected, and what should be corrected.")}
                    value={draft.details}
                  />
                </label>

                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t("Evidence or Notes (Optional)")}</span>
                  <textarea
                    className="min-h-[120px] w-full rounded-[22px] border border-[var(--input)] px-4 py-3 text-sm leading-[1.7] text-[var(--foreground)] outline-none"
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        evidenceText: event.target.value
                      }))
                    }
                    placeholder={t("Add any operational notes, proof, or follow-up context here.")}
                    value={draft.evidenceText}
                  />
                </label>

                <div className="mt-4 rounded-[20px] border border-dashed border-[var(--input)] bg-[var(--accent)] px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <p className="text-sm font-medium text-[var(--foreground)]">{t("Attachments")}</p>
                  </div>
                  <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                    {t("Optional. You can upload up to 3 screenshots, each under 5 MB.")}
                  </p>
                  <input
                    accept="image/*"
                    className="mt-3 block text-sm text-[var(--foreground)]"
                    multiple
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        attachments: Array.from(event.target.files || [])
                      }))
                    }
                    type="file"
                  />
                  {draft.attachments.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.attachments.map((file) => (
                        <span
                          className="inline-flex items-center rounded-pill border border-[var(--input)] bg-white px-3 py-1.5 text-xs text-[var(--foreground)]"
                          key={`${file.name}-${file.size}`}
                        >
                          {file.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
          {submitResult ? (
            <>
              <button
                className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                {t("Close")}
              </button>
              <button
                className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
                onClick={() => {
                  setSubmitResult(null);
                  setError(null);
                }}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{t(submitResult.kind === "success" ? "Submit Another Report" : "Back to Form")}</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                {t("Cancel")}
              </button>
              <button
                className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving || isTrial}
                onClick={() => {
                  void handleSubmit();
                }}
                type="button"
              >
                <Send className="h-4 w-4" />
                <span>{saving ? t("Saving...") : t("Submit Error Report")}</span>
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
