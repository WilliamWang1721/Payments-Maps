import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AlertTriangle, Bug, Paperclip, Send, ShieldAlert } from "lucide-react";

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);

  const seedSignature = useMemo(() => JSON.stringify(initialDraft || {}), [initialDraft]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSaving(false);
      setSuccessMessage(null);
      setAttachmentWarning(null);
      setDraft(buildInitialDraft(activeTab, initialDraft));
    }
  }, [activeTab, initialDraft, open, seedSignature]);

  const handleSubmit = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    setAttachmentWarning(null);

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

      setSuccessMessage(`${t("Error report submitted successfully.")} #${result.report.id.slice(0, 8)}`);
      setAttachmentWarning(result.attachmentWarning);
      setDraft(buildInitialDraft(activeTab, initialDraft));
    } catch (submissionError) {
      setError(
        submissionError instanceof Error && submissionError.message
          ? submissionError.message
          : t("Unable to submit the error report right now.")
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = LOCATION_ERROR_REPORT_CATEGORY_OPTIONS.find((option) => option.value === draft.category);
  const currentTabLabel =
    draft.contextTab === "attempt"
      ? "Attempt"
      : draft.contextTab === "reviews"
        ? "Reviews"
        : "Overview";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-[min(920px,calc(100vw-2rem))] gap-0 overflow-hidden rounded-[32px] p-0">
        <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
          <DialogTitle>{t("Report an Error")}</DialogTitle>
          <DialogDescription>
            {t("Send this issue to the admin queue with the current location context attached automatically.")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          {successMessage ? (
            <div className="rounded-[24px] border border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.88)] px-5 py-5 text-sm leading-[1.7] text-[#065f46]">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">{successMessage}</p>
                  {attachmentWarning ? <p className="mt-2 text-[#047857]">{attachmentWarning}</p> : null}
                  <p className="mt-2 text-[#047857]">
                    {t("Admins can now triage, process, and close this report from the error report queue.")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0 space-y-5">
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
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-[var(--primary)]" />
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Issue Type")}</h3>
                  </div>
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{t("Severity")}</span>
                      <select
                        className="h-11 w-full rounded-pill border border-[var(--input)] bg-white px-4 text-sm text-[var(--foreground)] outline-none"
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            severity: event.target.value as LocationErrorReportDraft["severity"]
                          }))
                        }
                        value={draft.severity}
                      >
                        {LOCATION_ERROR_REPORT_SEVERITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.label)}
                          </option>
                        ))}
                      </select>
                    </label>

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
                      className="min-h-[140px] w-full rounded-[22px] border border-[var(--input)] px-4 py-3 text-sm leading-[1.7] text-[var(--foreground)] outline-none"
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
                      className="min-h-[110px] w-full rounded-[22px] border border-[var(--input)] px-4 py-3 text-sm leading-[1.7] text-[var(--foreground)] outline-none"
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

              <aside className="space-y-4">
                <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{t("Auto Attached Context")}</h3>
                  <div className="mt-4 space-y-3 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{t("Location")}</p>
                      <p>{location.name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{t("Address")}</p>
                      <p>{location.address}</p>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{t("Brand")}</p>
                      <p>{location.brand}</p>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{t("Current Tab")}</p>
                      <p>{t(currentTabLabel)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{t("Selected Type")}</p>
                      <p>{selectedCategory ? t(selectedCategory.label) : draft.category}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-[var(--input)] bg-white p-5">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">{t("What Happens Next")}</h3>
                  <div className="mt-4 space-y-3 text-sm leading-[1.7] text-[var(--muted-foreground)]">
                    <p>{t("1. Your report enters the admin queue immediately.")}</p>
                    <p>{t("2. Admins can triage, request more info, accept, reject, resolve, and close it.")}</p>
                    <p>{t("3. Every status change is recorded in the audit trail.")}</p>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
          <button
            className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {t(successMessage ? "Close" : "Cancel")}
          </button>
          {!successMessage ? (
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
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
