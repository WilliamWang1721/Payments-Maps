import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  CalendarRange,
  ChevronRight,
  CircleCheck,
  CircleX,
  CreditCard,
  Edit2,
  Key,
  MapPin,
  PenTool,
  Plus,
  Radio,
  Settings2,
  TrendingUp,
  Wifi
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { TabsWarp } from "@/components/ui/tabs-warp";
import { useLocationDetail } from "@/hooks/use-location-detail";
import { useI18n } from "@/i18n";
import type { LocationAttemptRecord, LocationDetailRecord, LocationRecord, LocationReviewRecord } from "@/types/location";

type DetailContentTab = "overview" | "attempt" | "reviews";
type SuccessRateFilterMode = "all" | "custom";

interface NetworkRow {
  name: string;
  status: "supported" | "unknown";
  tags?: string[];
}

interface CvmRow {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "supported" | "limited";
}

interface SuccessRateDateFilter {
  mode: SuccessRateFilterMode;
  startDate: string;
  endDate: string;
}

interface SuccessRateSummary {
  rate: number;
  successCount: number;
  totalAttempts: number;
}

const DEFAULT_CVM_ROWS: CvmRow[] = [
  { name: "实体拍卡（无 CVM）", icon: Wifi, status: "supported" },
  { name: "PIN", icon: Key, status: "supported" },
  { name: "Signature", icon: PenTool, status: "limited" }
];

const DEFAULT_SUCCESS_RATE_FILTER: SuccessRateDateFilter = {
  mode: "all",
  startDate: "",
  endDate: ""
};

const DETAIL_TABS: Array<{ key: DetailContentTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "attempt", label: "Attempt" },
  { key: "reviews", label: "Reviews" }
];

function parseDateBoundary(dateValue: string, boundary: "start" | "end"): number | null {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDateLabel(dateValue: string): string {
  if (!dateValue) return "";
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function getSuccessRateDateFilterLabel(filter: SuccessRateDateFilter): string {
  if (filter.mode === "all") return "永久";
  if (filter.startDate && filter.endDate) {
    return `${formatDateLabel(filter.startDate)} - ${formatDateLabel(filter.endDate)}`;
  }
  if (filter.startDate) return `${formatDateLabel(filter.startDate)} 起`;
  if (filter.endDate) return `截止 ${formatDateLabel(filter.endDate)}`;
  return "永久";
}

function validateSuccessRateDateFilter(filter: SuccessRateDateFilter): string | null {
  if (filter.mode === "all") return null;
  if (!filter.startDate && !filter.endDate) {
    return "请选择开始日期或结束日期。";
  }
  if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
    return "开始日期不能晚于结束日期。";
  }
  return null;
}

function filterAttemptsByDateRange(attempts: LocationAttemptRecord[], filter: SuccessRateDateFilter): LocationAttemptRecord[] {
  if (filter.mode === "all") return attempts;

  const startTime = parseDateBoundary(filter.startDate, "start");
  const endTime = parseDateBoundary(filter.endDate, "end");

  return attempts.filter((attempt) => {
    if (!attempt.occurredAt) return false;
    const occurredTime = new Date(attempt.occurredAt).getTime();
    if (Number.isNaN(occurredTime)) return false;
    if (startTime !== null && occurredTime < startTime) return false;
    if (endTime !== null && occurredTime > endTime) return false;
    return true;
  });
}

function summarizeSuccessRate(attempts: LocationAttemptRecord[]): SuccessRateSummary {
  const successCount = attempts.filter((attempt) => attempt.status === "success").length;
  return {
    rate: attempts.length > 0 ? Number(((successCount / attempts.length) * 100).toFixed(1)) : 0,
    successCount,
    totalAttempts: attempts.length
  };
}

function formatStatusLabel(status: LocationRecord["status"]): string {
  return status === "inactive" ? "Inactive" : "Active";
}

function buildFallbackDetail(location: LocationRecord): LocationDetailRecord {
  return {
    ...location,
    source: location.source || "fluxa_locations",
    deviceName: location.name,
    metaLine: `品牌：${location.brand}  •  城市：${location.city}  •  BIN：${location.bin}`,
    successRate: location.successRate || 0,
    successCount: 0,
    failedCount: 0,
    totalAttempts: 0,
    attempts: [],
    reviews: []
  };
}

function formatSupportedNetworkLabel(network: string): string {
  const normalized = network.trim().toLowerCase();

  if (normalized === "amex cn") return "American Express 中国";
  if (normalized === "amex" || normalized === "american express") return "American Express";
  if (normalized === "jcb") return "JCB";
  if (normalized === "discover") return "Discover（发现）";
  if (normalized === "diners" || normalized === "diners club") return "Diners Club";
  if (normalized === "mastercard" || normalized === "master card") return "MasterCard";
  if (normalized === "visa") return "Visa";
  if (normalized === "unionpay" || normalized === "union pay" || normalized === "银联") return "银联 UnionPay";

  return network.trim();
}

function formatPaymentMethodLabel(method: string): string {
  const normalized = method.trim().toLowerCase();

  if (normalized === "apple pay" || normalized === "apple_pay") return "Apple Pay";
  if (normalized === "google pay" || normalized === "google_pay") return "Google Pay";
  if (normalized === "contactless" || normalized === "tap") return "Contactless";
  if (normalized === "insert") return "Insert";
  if (normalized === "swipe") return "Swipe";
  if (normalized === "signature") return "Signature";
  if (normalized === "pin") return "PIN";
  if (normalized === "unknown") return "Unknown";

  return method
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function buildNetworkRows(detail: LocationDetailRecord): NetworkRow[] {
  if (detail.supportedNetworks && detail.supportedNetworks.length > 0) {
    return Array.from(new Set(detail.supportedNetworks.map(formatSupportedNetworkLabel))).map((name) => ({
      name,
      status: "supported" as const
    }));
  }

  const inferred = Array.from(
    new Set(
      detail.attempts
        .map((attempt) => attempt.network)
        .filter(Boolean)
        .flatMap((cardNetwork) => {
          const normalized = cardNetwork.toLowerCase();
          const matches: string[] = [];
          if (normalized.includes("visa")) matches.push("Visa");
          if (normalized.includes("master")) matches.push("MasterCard");
          if (normalized.includes("union")) matches.push("银联 UnionPay");
          if (normalized.includes("amex cn")) matches.push("American Express 中国");
          else if (normalized.includes("amex") || normalized.includes("american express")) matches.push("American Express");
          if (normalized.includes("discover")) matches.push("Discover（发现）");
          if (normalized.includes("jcb")) matches.push("JCB");
          if (normalized.includes("diners")) matches.push("Diners Club");
          return matches;
        })
    )
  );

  return inferred.map((name) => ({ name, status: "supported" as const }));
}

function buildCvmRows(detail: LocationDetailRecord): CvmRow[] {
  const methods = Array.from(new Set(detail.attempts.map((attempt) => attempt.method.toLowerCase())));
  if (methods.length === 0) {
    return DEFAULT_CVM_ROWS;
  }

  return [
    {
      name: "实体拍卡（无 CVM）",
      icon: Wifi,
      status: methods.some((method) => method.includes("contactless") || method.includes("tap")) ? "supported" : "limited"
    },
    {
      name: "PIN",
      icon: Key,
      status: methods.some((method) => method.includes("pin") || method.includes("insert")) ? "supported" : "limited"
    },
    {
      name: "Signature",
      icon: PenTool,
      status: methods.some((method) => method.includes("signature")) ? "supported" : "limited"
    }
  ];
}

function StatusPill({
  label,
  kind = "supported"
}: {
  label: string;
  kind?: "supported" | "unknown" | "limited" | "declined";
}): React.JSX.Element {
  const { t } = useI18n();
  const cls =
    kind === "supported"
      ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
      : kind === "declined"
        ? "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]"
        : kind === "limited"
          ? "bg-[#FFBFB2] text-[#590F00]"
          : "bg-[var(--secondary)] text-[var(--secondary-foreground)]";

  return (
    <span className={`inline-flex h-8 items-center justify-center rounded-pill px-3 text-sm font-medium leading-[1.142857] ${cls}`}>
      {t(label)}
    </span>
  );
}

function SectionHeader({
  title,
  buttonLabel,
  onAction
}: {
  title: string;
  buttonLabel: string;
  onAction: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t(title)}</h3>
      <button
        className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
        onClick={onAction}
        type="button"
      >
        <Settings2 className="h-4 w-4" />
        <span>{t(buttonLabel)}</span>
      </button>
    </div>
  );
}

function AuthSuccessRateCard({
  summary,
  filter,
  draftFilter,
  dialogOpen,
  validationMessage,
  onDialogOpenChange,
  onDraftModeChange,
  onDraftStartDateChange,
  onDraftEndDateChange,
  onApply,
  onReset
}: {
  summary: SuccessRateSummary;
  filter: SuccessRateDateFilter;
  draftFilter: SuccessRateDateFilter;
  dialogOpen: boolean;
  validationMessage: string | null;
  onDialogOpenChange: (open: boolean) => void;
  onDraftModeChange: (mode: SuccessRateFilterMode) => void;
  onDraftStartDateChange: (value: string) => void;
  onDraftEndDateChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const filterLabel = getSuccessRateDateFilterLabel(filter);

  return (
    <article className="flex min-w-0 flex-col rounded-[40px] border border-[var(--input)] bg-white p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-medium leading-[1.4] text-[var(--muted-foreground)]">{t("授权成功率")}</p>
        <TrendingUp className="h-5 w-5 text-[#008A00]" />
      </div>
      <p className="mt-4 text-[48px] font-bold leading-[1.05] tracking-[-1px] text-[#006600]">{summary.rate.toFixed(1)}%</p>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {summary.totalAttempts > 0 ? <StatusPill label={summary.rate >= 90 ? "Healthy" : "Watch"} /> : null}
            <p className="text-[13px] leading-[1.3] text-[var(--muted-foreground)]">
              {summary.totalAttempts > 0 ? `${summary.successCount}/${summary.totalAttempts} ${t("successful attempts")}` : t("当前区间内暂没有支付尝试记录")}
            </p>
          </div>
          <p className="text-[13px] leading-[1.3] text-[var(--muted-foreground)]">
            {t("统计范围")}：{t(filterLabel)}
          </p>
        </div>

        <Dialog onOpenChange={onDialogOpenChange} open={dialogOpen}>
          <DialogTrigger asChild>
            <button
              aria-label={t("设置授权成功率统计范围")}
              className="ui-hover-shadow inline-flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full border border-[var(--input)] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              type="button"
            >
              <CalendarRange className="h-4 w-4" />
            </button>
          </DialogTrigger>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("设置授权成功率范围")}</DialogTitle>
              <DialogDescription>{t("默认统计永久记录，你也可以切换到自定义日期区间。")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`inline-flex h-11 items-center justify-center rounded-pill border px-4 text-sm font-medium transition-colors ${
                    draftFilter.mode === "all"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--input)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                  }`}
                  onClick={() => onDraftModeChange("all")}
                  type="button"
                >
                  {t("永久")}
                </button>
                <button
                  className={`inline-flex h-11 items-center justify-center rounded-pill border px-4 text-sm font-medium transition-colors ${
                    draftFilter.mode === "custom"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--input)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                  }`}
                  onClick={() => onDraftModeChange("custom")}
                  type="button"
                >
                  {t("日期区间")}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t("开始日期")}</span>
                  <input
                    className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                    disabled={draftFilter.mode !== "custom"}
                    onChange={(event) => onDraftStartDateChange(event.target.value)}
                    type="date"
                    value={draftFilter.startDate}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--foreground)]">{t("结束日期")}</span>
                  <input
                    className="h-11 w-full rounded-pill border border-[var(--input)] px-4 text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]"
                    disabled={draftFilter.mode !== "custom"}
                    onChange={(event) => onDraftEndDateChange(event.target.value)}
                    type="date"
                    value={draftFilter.endDate}
                  />
                </label>
              </div>

              <div className="rounded-[20px] bg-[#F7F7F8] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                {draftFilter.mode === "all" ? t("当前选择为永久统计。") : `${t("当前选择")}：${t(getSuccessRateDateFilterLabel(draftFilter))}`}
              </div>

              {validationMessage ? <p className="text-sm text-[#7A1F0E]">{t(validationMessage)}</p> : null}
            </div>

            <DialogFooter>
              <button
                className="ui-hover-shadow inline-flex h-10 items-center justify-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
                onClick={onReset}
                type="button"
              >
                {t("恢复永久")}
              </button>
              <button
                className="ui-hover-shadow inline-flex h-10 items-center justify-center rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={Boolean(validationMessage)}
                onClick={onApply}
                type="button"
              >
                {t("应用")}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}

function OverviewContent({
  detail,
  successRateSummary,
  successRateFilter,
  draftSuccessRateFilter,
  successRateDialogOpen,
  successRateFilterError,
  onSuccessRateDialogOpenChange,
  onSuccessRateFilterModeChange,
  onSuccessRateStartDateChange,
  onSuccessRateEndDateChange,
  onApplySuccessRateFilter,
  onResetSuccessRateFilter,
  showUnknownNetworksOnly,
  showLimitedCvmOnly,
  onToggleUnknownNetworks,
  onToggleLimitedCvm
}: {
  detail: LocationDetailRecord;
  successRateSummary: SuccessRateSummary;
  successRateFilter: SuccessRateDateFilter;
  draftSuccessRateFilter: SuccessRateDateFilter;
  successRateDialogOpen: boolean;
  successRateFilterError: string | null;
  onSuccessRateDialogOpenChange: (open: boolean) => void;
  onSuccessRateFilterModeChange: (mode: SuccessRateFilterMode) => void;
  onSuccessRateStartDateChange: (value: string) => void;
  onSuccessRateEndDateChange: (value: string) => void;
  onApplySuccessRateFilter: () => void;
  onResetSuccessRateFilter: () => void;
  showUnknownNetworksOnly: boolean;
  showLimitedCvmOnly: boolean;
  onToggleUnknownNetworks: () => void;
  onToggleLimitedCvm: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const networkRows = buildNetworkRows(detail);
  const cvmRows = buildCvmRows(detail);
  const visibleNetworkRows = showUnknownNetworksOnly ? networkRows.filter((row) => row.status === "unknown") : networkRows;
  const visibleCvmRows = showLimitedCvmOnly ? cvmRows.filter((row) => row.status === "limited") : cvmRows;
  const statusLabel = formatStatusLabel(detail.status);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
      <AuthSuccessRateCard
        dialogOpen={successRateDialogOpen}
        draftFilter={draftSuccessRateFilter}
        filter={successRateFilter}
        onApply={onApplySuccessRateFilter}
        onDialogOpenChange={onSuccessRateDialogOpenChange}
        onDraftEndDateChange={onSuccessRateEndDateChange}
        onDraftModeChange={onSuccessRateFilterModeChange}
        onDraftStartDateChange={onSuccessRateStartDateChange}
        onReset={onResetSuccessRateFilter}
        summary={successRateSummary}
        validationMessage={successRateFilterError}
      />

      <article className="flex min-w-0 flex-col rounded-[40px] border border-[var(--input)] bg-white p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-medium leading-[1.4] text-[var(--muted-foreground)]">{t("Device Status")}</p>
          <Radio className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <p className="mt-4 text-[48px] font-bold leading-[1.05] tracking-[-1px] text-[var(--foreground)]">{t(statusLabel)}</p>
        <div className="mt-4 flex items-center gap-2">
          <StatusPill label={statusLabel} kind={detail.status === "inactive" ? "limited" : "supported"} />
          <p className="text-[13px] leading-[1.3] text-[var(--muted-foreground)]">{detail.deviceName}</p>
        </div>
      </article>

      <article className="rounded-[40px] border border-[var(--input)] bg-white p-8 xl:col-span-1">
        <SectionHeader
          buttonLabel={showUnknownNetworksOnly ? "Show All" : "Unknown Only"}
          onAction={onToggleUnknownNetworks}
          title="Supported Networks"
        />

        <div className="mt-6 flex flex-col">
          {visibleNetworkRows.map((row, idx) => (
            <div
              className={`flex min-h-[64px] items-center justify-between gap-3 py-4 ${idx !== visibleNetworkRows.length - 1 ? "border-b border-[var(--input)]" : ""}`}
              key={row.name}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F5F5F7]">
                  <CreditCard className="h-4 w-4 text-[var(--foreground)]" />
                </span>
                <span className="truncate text-base font-semibold leading-[1.2] text-[var(--foreground)]">{row.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.tags?.map((tag) => <StatusPill key={tag} label={tag} />)}
                {!row.tags ? <StatusPill kind={row.status === "unknown" ? "unknown" : "supported"} label={row.status === "unknown" ? "Unknown" : "Supported"} /> : null}
              </div>
            </div>
          ))}
          {visibleNetworkRows.length === 0 ? <p className="py-6 text-sm text-[var(--muted-foreground)]">{t("No network matched current filter.")}</p> : null}
        </div>
      </article>

      <article className="rounded-[40px] border border-[var(--input)] bg-white p-8 xl:col-span-1">
        <SectionHeader
          buttonLabel={showLimitedCvmOnly ? "Show All" : "Limited Only"}
          onAction={onToggleLimitedCvm}
          title="Common CVM Methods"
        />

        <div className="mt-6 flex flex-col">
          {visibleCvmRows.map((row, idx) => {
            const Icon = row.icon;
            return (
              <div
                className={`flex min-h-[64px] items-center justify-between gap-3 py-4 ${idx !== visibleCvmRows.length - 1 ? "border-b border-[var(--input)]" : ""}`}
                key={row.name}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#F5F5F7]">
                    <Icon className="h-4 w-4 text-[var(--foreground)]" />
                  </span>
                  <span className="truncate text-base font-semibold leading-[1.2] text-[var(--foreground)]">{row.name}</span>
                </div>
                <StatusPill kind={row.status} label={row.status === "limited" ? "Limited" : "Supported"} />
              </div>
            );
          })}
          {visibleCvmRows.length === 0 ? <p className="py-6 text-sm text-[var(--muted-foreground)]">{t("No CVM matched current filter.")}</p> : null}
        </div>
      </article>
    </div>
  );
}

function AttemptContent({
  attemptRows,
  attemptPage,
  onPageChange
}: {
  attemptRows: LocationAttemptRecord[];
  attemptPage: number;
  onPageChange: (page: number) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(attemptRows.length / pageSize));
  const currentPage = Math.min(attemptPage, pageCount);
  const currentRows = attemptRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const successCount = attemptRows.filter((row) => row.status === "success").length;
  const failedCount = attemptRows.length - successCount;
  const successRate = attemptRows.length > 0 ? ((successCount / attemptRows.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t("Payment Attempts")}</h3>
          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-6 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled
            type="button"
          >
            <Plus className="h-5 w-5" />
            <span>{t("Add")}</span>
          </button>
        </div>
        <div className="flex items-center gap-8">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.04em] text-[#A1A1AA]">{t("Total Attempts")}</p>
            <p className="text-lg font-semibold leading-[1.2] text-[var(--foreground)]">{attemptRows.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.04em] text-[#A1A1AA]">{t("Success / Failed")}</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-base font-semibold text-[var(--foreground)]">
                <CircleCheck className="h-[14px] w-[14px] text-[var(--color-success-foreground)]" />
                {successCount}
              </span>
              <span className="inline-flex items-center gap-1 text-base font-semibold text-[var(--foreground)]">
                <CircleX className="h-[14px] w-[14px] text-[#590F00]" />
                {failedCount}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase leading-[1.3] tracking-[0.04em] text-[#A1A1AA]">{t("Success Rate")}</p>
            <p className="text-lg font-semibold leading-[1.2] text-[var(--foreground)]">{successRate}%</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#E2E2E8] bg-white">
        <div className="flex items-center gap-4 border-b border-[#E2E2E8] bg-[#F9F9FB] px-6 py-4">
          <p className="w-[140px] text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">{t("Date & Time")}</p>
          <p className="w-[140px] text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">{t("Added By")}</p>
          <p className="w-[180px] text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">{t("Card")}</p>
          <p className="w-[140px] text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">{t("Network")}</p>
          <p className="w-[120px] text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">{t("Method")}</p>
          <p className="w-[120px] text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">{t("Status")}</p>
          <p className="w-[80px] text-right text-[13px] font-semibold leading-[1.2] text-[var(--muted-foreground)]">&nbsp;</p>
        </div>

        {currentRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">{t("No payment attempts recorded yet.")}</div>
        ) : null}

        {currentRows.map((row, idx) => (
          <div className={`flex items-center gap-4 px-6 py-4 ${idx !== currentRows.length - 1 ? "border-b border-[#E2E2E8]" : ""}`} key={row.id}>
            <p className="w-[140px] text-[13px] font-medium leading-[1.2] text-[var(--foreground)]">{row.dateTime}</p>
            <p className="w-[140px] text-[13px] font-medium leading-[1.2] text-[var(--muted-foreground)]">{row.addedBy}</p>
            <p className="w-[180px] truncate text-[13px] font-medium leading-[1.2] text-[var(--foreground)]">{row.cardName}</p>
            <p className="w-[140px] truncate text-[13px] font-medium leading-[1.2] text-[var(--foreground)]">{formatSupportedNetworkLabel(row.network)}</p>
            <p className="w-[120px] text-[13px] font-medium leading-[1.2] text-[var(--muted-foreground)]">{formatPaymentMethodLabel(row.method)}</p>
            <div className="w-[120px]">
              <StatusPill kind={row.status === "declined" ? "declined" : row.status === "failed" ? "limited" : "supported"} label={row.status === "success" ? "Success" : row.status === "declined" ? "Declined" : "Failed"} />
            </div>
            <div className="flex w-[80px] justify-end">
              <ChevronRight className="h-4 w-4 text-[#A1A1AA]" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between py-4">
        <p className="text-[13px] leading-[1.2] text-[var(--muted-foreground)]">
          {attemptRows.length > 0
            ? `${t("Showing")} ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, attemptRows.length)} ${t("of")} ${attemptRows.length} ${t("attempts")}`
            : t("No results")}
        </p>
        <div className="flex items-center gap-2">
          <button
            className="ui-hover-shadow inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            type="button"
          >
            {t("Previous")}
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
            <button
              className={`ui-hover-shadow inline-flex h-10 w-10 items-center justify-center rounded-pill border text-sm font-medium ${
                page === currentPage
                  ? "border-[var(--primary)] bg-white text-[var(--primary)]"
                  : "border-[var(--input)] text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              }`}
              key={page}
              onClick={() => onPageChange(page)}
              type="button"
            >
              {page}
            </button>
          ))}
          <button
            className="ui-hover-shadow inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
            type="button"
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewsContent({ reviewItems }: { reviewItems: LocationReviewRecord[] }): React.JSX.Element {
  const { t } = useI18n();
  const leftReviews = reviewItems.filter((_, idx) => idx % 2 === 0);
  const rightReviews = reviewItems.filter((_, idx) => idx % 2 === 1);

  const renderReviewCard = (item: LocationReviewRecord) => (
    <article className="rounded-2xl border border-[#E2E2E8] bg-white p-6" key={item.id}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E2E2E8] text-sm font-semibold text-[var(--muted-foreground)]">{item.initials}</span>
          <p className="truncate text-[15px] font-semibold leading-[1.2] text-[var(--foreground)]">{t(item.name)}</p>
        </div>
        <p className="shrink-0 text-[13px] leading-[1.2] text-[#A1A1AA]">{item.time}</p>
      </div>
      <p className="mt-4 text-sm leading-[1.6] text-[var(--foreground)]">{t(item.content)}</p>
    </article>
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t("Reviews")}</h3>
        <button
          className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-6 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled
          type="button"
        >
          <Plus className="h-5 w-5" />
          <span>{t("Add")}</span>
        </button>
      </div>

      {reviewItems.length === 0 ? (
        <div className="rounded-2xl border border-[#E2E2E8] bg-white px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
          {t("No reviews recorded yet.")}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-6">{leftReviews.map(renderReviewCard)}</div>
          <div className="flex min-w-0 flex-col gap-6">{rightReviews.map(renderReviewCard)}</div>
        </div>
      )}
    </div>
  );
}

interface PlaceDetailWebProps {
  location?: LocationRecord | null;
  locationLoading?: boolean;
  onViewMap?: () => void;
}

export function PlaceDetailWeb({ location, locationLoading = false, onViewMap }: PlaceDetailWebProps): React.JSX.Element {
  const { t } = useI18n();
  const { detail, loading, error } = useLocationDetail(location);
  const [activeTab, setActiveTab] = useState<DetailContentTab>("overview");
  const [editable, setEditable] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationMeta, setLocationMeta] = useState("");
  const [showUnknownNetworksOnly, setShowUnknownNetworksOnly] = useState(false);
  const [showLimitedCvmOnly, setShowLimitedCvmOnly] = useState(false);
  const [attemptPage, setAttemptPage] = useState(1);
  const [successRateFilter, setSuccessRateFilter] = useState<SuccessRateDateFilter>(DEFAULT_SUCCESS_RATE_FILTER);
  const [draftSuccessRateFilter, setDraftSuccessRateFilter] = useState<SuccessRateDateFilter>(DEFAULT_SUCCESS_RATE_FILTER);
  const [successRateDialogOpen, setSuccessRateDialogOpen] = useState(false);

  const detailRecord = useMemo(() => {
    if (detail) return detail;
    if (location) return buildFallbackDetail(location);
    return null;
  }, [detail, location]);

  const filteredAttemptsForSuccessRate = useMemo(
    () => filterAttemptsByDateRange(detailRecord?.attempts || [], successRateFilter),
    [detailRecord?.attempts, successRateFilter]
  );
  const successRateSummary = useMemo(() => summarizeSuccessRate(filteredAttemptsForSuccessRate), [filteredAttemptsForSuccessRate]);
  const successRateFilterError = useMemo(() => validateSuccessRateDateFilter(draftSuccessRateFilter), [draftSuccessRateFilter]);

  useEffect(() => {
    const pageSize = 5;
    const pageCount = Math.max(1, Math.ceil((detailRecord?.attempts.length || 0) / pageSize));
    if (attemptPage > pageCount) {
      setAttemptPage(pageCount);
    }
  }, [attemptPage, detailRecord?.attempts.length]);

  useEffect(() => {
    if (!detailRecord) return;
    setLocationName(detailRecord.name);
    setLocationAddress(detailRecord.address);
    setLocationMeta(detailRecord.metaLine);
  }, [detailRecord]);

  useEffect(() => {
    setSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    setDraftSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    setSuccessRateDialogOpen(false);
  }, [location?.id]);

  useEffect(() => {
    if (!successRateDialogOpen) return;
    setDraftSuccessRateFilter(successRateFilter);
  }, [successRateDialogOpen, successRateFilter]);

  const handleApplySuccessRateFilter = () => {
    if (successRateFilterError) return;
    if (draftSuccessRateFilter.mode === "all") {
      setSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    } else {
      setSuccessRateFilter(draftSuccessRateFilter);
    }
    setSuccessRateDialogOpen(false);
  };

  const handleResetSuccessRateFilter = () => {
    setSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    setDraftSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    setSuccessRateDialogOpen(false);
  };

  if (!detailRecord) {
    return (
      <section className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[#FAFAFA] px-12 py-10">
        <div className="rounded-[24px] border border-[var(--input)] bg-white px-8 py-6 text-center">
          <p className="text-lg font-semibold text-[var(--foreground)]">
            {locationLoading ? t("Loading location") : t("No location selected")}
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {locationLoading ? t("Loading location detail...") : t("Select a location from the list or map to view its detail.")}
          </p>
        </div>
      </section>
    );
  }

  const statusLabel = formatStatusLabel(detailRecord.status);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto bg-[#FAFAFA] px-12 py-10">
      {loading ? (
        <div className="rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm text-[var(--muted-foreground)]">
          {t("Loading location detail...")}
        </div>
      ) : null}

      {error ? <div className="rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm text-[#7A1F0E]">{error}</div> : null}

      <header className="flex flex-wrap items-start justify-between gap-4 pb-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            {editable ? (
              <input
                className="h-11 min-w-[320px] rounded-pill border border-[var(--input)] px-4 text-[32px] font-bold leading-[1.1] tracking-[-0.5px] text-[var(--foreground)] outline-none"
                onChange={(event) => setLocationName(event.target.value)}
                type="text"
                value={locationName}
              />
            ) : (
              <h1 className="truncate text-[32px] font-bold leading-[1.1] tracking-[-0.5px] text-[var(--foreground)]">{locationName}</h1>
            )}
            <StatusPill kind={detailRecord.status === "inactive" ? "limited" : "supported"} label={statusLabel} />
          </div>
          {editable ? (
            <>
              <input
                className="h-10 w-full rounded-pill border border-[var(--input)] px-4 text-sm leading-[1.4] text-[var(--foreground)] outline-none"
                onChange={(event) => setLocationAddress(event.target.value)}
                type="text"
                value={locationAddress}
              />
              <input
                className="h-10 w-full rounded-pill border border-[var(--input)] px-4 text-sm leading-[1.4] text-[var(--foreground)] outline-none"
                onChange={(event) => setLocationMeta(event.target.value)}
                type="text"
                value={locationMeta}
              />
            </>
          ) : (
            <>
              <p className="text-sm leading-[1.4] text-[var(--muted-foreground)]">{locationAddress}</p>
              <p className="text-sm leading-[1.4] text-[var(--muted-foreground)]">{locationMeta}</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
            onClick={() => setEditable((prev) => !prev)}
            type="button"
          >
            <Edit2 className="h-4 w-4" />
            <span>{editable ? t("Save Details") : t("Edit Details")}</span>
          </button>
          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
            onClick={() => onViewMap?.()}
            type="button"
          >
            <MapPin className="h-4 w-4" />
            <span>{t("View on Map")}</span>
          </button>
        </div>
      </header>

      <div className="border-b border-[var(--input)] pb-4">
        <TabsWarp
          items={DETAIL_TABS.map((tab) => ({
            key: tab.key,
            label: t(tab.label)
          }))}
          onValueChange={setActiveTab}
          value={activeTab}
        />
      </div>

      {activeTab === "overview" ? (
        <OverviewContent
          detail={detailRecord}
          draftSuccessRateFilter={draftSuccessRateFilter}
          onApplySuccessRateFilter={handleApplySuccessRateFilter}
          onResetSuccessRateFilter={handleResetSuccessRateFilter}
          onSuccessRateDialogOpenChange={setSuccessRateDialogOpen}
          onSuccessRateEndDateChange={(value) =>
            setDraftSuccessRateFilter((prev) => ({
              ...prev,
              endDate: value
            }))
          }
          onSuccessRateFilterModeChange={(mode) =>
            setDraftSuccessRateFilter((prev) => ({
              ...prev,
              mode
            }))
          }
          onSuccessRateStartDateChange={(value) =>
            setDraftSuccessRateFilter((prev) => ({
              ...prev,
              startDate: value
            }))
          }
          onToggleLimitedCvm={() => setShowLimitedCvmOnly((prev) => !prev)}
          onToggleUnknownNetworks={() => setShowUnknownNetworksOnly((prev) => !prev)}
          successRateDialogOpen={successRateDialogOpen}
          successRateFilter={successRateFilter}
          successRateFilterError={successRateFilterError}
          successRateSummary={successRateSummary}
          showLimitedCvmOnly={showLimitedCvmOnly}
          showUnknownNetworksOnly={showUnknownNetworksOnly}
        />
      ) : null}
      {activeTab === "attempt" ? (
        <AttemptContent attemptPage={attemptPage} attemptRows={detailRecord.attempts} onPageChange={setAttemptPage} />
      ) : null}
      {activeTab === "reviews" ? <ReviewsContent reviewItems={detailRecord.reviews} /> : null}
    </section>
  );
}
