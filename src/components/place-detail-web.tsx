import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  Building2,
  CalendarRange,
  ChevronRight,
  CheckCircle2,
  CircleCheck,
  CircleX,
  CreditCard,
  Edit2,
  Globe,
  Hash,
  HelpCircle,
  MapPin,
  MessageSquare,
  MinusCircle,
  Nfc,
  PenTool,
  Phone,
  PlayCircle,
  Plus,
  Radio,
  RotateCcw,
  Settings2,
  Smartphone,
  StopCircle,
  Trash2,
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
import { useViewerAccess } from "@/hooks/use-viewer-access";
import { useI18n } from "@/i18n";
import {
  MastercardNuccBridgeError,
  createMastercardNuccBridgeSession,
  refreshMastercardNuccBridgeSession,
  submitMastercardNuccFeedback,
  type MastercardNuccBridgeSession
} from "@/lib/mastercard-nucc-bridge";
import { browsingHistoryService } from "@/services/browsing-history-service";
import { locationService } from "@/services/location-service";
import type {
  CreateLocationAttemptInput,
  CreateLocationReviewInput,
  LocationAttemptRecord,
  LocationBusinessHours,
  LocationDetailRecord,
  LocationRecord,
  LocationReviewRecord,
  LocationSupportInsight,
  SupportEvidenceStatus
} from "@/types/location";

type DetailContentTab = "overview" | "attempt" | "reviews";
type SuccessRateFilterMode = "all" | "custom";

interface NetworkRow {
  key: string;
  name: string;
  status: SupportEvidenceStatus;
  insight: LocationSupportInsight;
}

interface BusinessHoursRow {
  id: string;
  label: string;
  value: string;
  kind: "regular" | "special";
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

type StaffProficiencyLevel = 1 | 2 | 3 | 4 | 5;

interface StaffProficiencyOption {
  level: StaffProficiencyLevel;
  label: string;
  description: string;
  badgeClassName: string;
  cardClassName: string;
  pillKind: "supported" | "unknown" | "limited" | "unsupported";
}

interface DetailStaffProficiencyShape {
  staffProficiencyLevel?: number | null;
  staffProficiencyUpdatedAt?: string | null;
}

interface StaffProficiencyMutationLocationService {
  updateLocationStaffProficiency?: (location: LocationRecord, level: StaffProficiencyLevel | null) => Promise<unknown>;
  updateStaffProficiency?: (location: LocationRecord, level: StaffProficiencyLevel | null) => Promise<unknown>;
}

interface ReviewMutationLocationService {
  deleteLocationReview?: (review: LocationReviewRecord) => Promise<void>;
}

const DEFAULT_SUCCESS_RATE_FILTER: SuccessRateDateFilter = {
  mode: "all",
  startDate: "",
  endDate: ""
};

const STAFF_PROFICIENCY_OPTIONS: StaffProficiencyOption[] = [
  {
    level: 1,
    label: "Completely Unfamiliar",
    description: "Has never used a POS device and does not know the basic workflow.",
    badgeClassName: "bg-[#FEF2F2] text-[#B42318] ring-1 ring-inset ring-[#FECACA]",
    cardClassName: "border-[#FECACA] bg-[#FFF7F7]",
    pillKind: "unsupported"
  },
  {
    level: 2,
    label: "Knows the Basics",
    description: "Understands what the POS is for but cannot complete a transaction alone.",
    badgeClassName: "bg-[#FFF7ED] text-[#C2410C] ring-1 ring-inset ring-[#FED7AA]",
    cardClassName: "border-[#FED7AA] bg-[#FFFBF5]",
    pillKind: "limited"
  },
  {
    level: 3,
    label: "Needs Guided Operation",
    description: "Can finish basic checkout steps with docs or someone guiding them.",
    badgeClassName: "bg-[#FFFBEA] text-[#A16207] ring-1 ring-inset ring-[#FDE68A]",
    cardClassName: "border-[#FDE68A] bg-[#FFFDF5]",
    pillKind: "unknown"
  },
  {
    level: 4,
    label: "Independent Operator",
    description: "Can independently handle everyday checkout and refund flows.",
    badgeClassName: "bg-[#ECFDF3] text-[#027A48] ring-1 ring-inset ring-[#A7F3D0]",
    cardClassName: "border-[#A7F3D0] bg-[#F5FFF9]",
    pillKind: "supported"
  },
  {
    level: 5,
    label: "Highly Proficient",
    description: "Comfortable with advanced flows such as reports, inventory, and issue handling.",
    badgeClassName: "bg-[#E8FFF4] text-[#05603A] ring-1 ring-inset ring-[#6EE7B7]",
    cardClassName: "border-[#6EE7B7] bg-[#F2FFF8]",
    pillKind: "supported"
  }
];

const DETAIL_TABS: Array<{ key: DetailContentTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "attempt", label: "Attempt" },
  { key: "reviews", label: "Reviews" }
];

interface AttemptDraft {
  cardName: string;
  transactionStatus: NonNullable<CreateLocationAttemptInput["transactionStatus"]>;
  network: string;
  paymentMethod: string;
  cvm: string;
  acquiringMode: string;
  deviceStatus: NonNullable<CreateLocationAttemptInput["deviceStatus"]>;
  acquirer: string;
  checkoutLocation: NonNullable<CreateLocationAttemptInput["checkoutLocation"]>;
  attemptYear: string;
  attemptMonth: string;
  attemptDay: string;
  notes: string;
}

interface ReviewDraft {
  mode: "review" | "comment";
  rating: number | null;
  content: string;
}

interface ReviewSuccessState {
  mode: ReviewDraft["mode"];
  rating: number | null;
  content: string;
}

interface AttemptNotice {
  kind: "success" | "error";
  message: string;
}

const MASTERCARD_CN_WANSHENG_PREVIEW_ONLY = true;
const ATTEMPT_NETWORK_OPTIONS = ["Visa", "MasterCard", "MasterCard CN", "UnionPay", "American Express", "Discover", "JCB"];
const ATTEMPT_YEAR_OPTIONS = Array.from({ length: 5 }, (_, index) => String(new Date().getFullYear() - 2 + index));
const ATTEMPT_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const ATTEMPT_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const MASTERCARD_NUCC_TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => `${hour}:00-${hour + 1}:00`)
  .filter((slot) => slot !== "5:00-6:00");
const ATTEMPT_ACQUIRER_OPTIONS = ["Lakala", "Global Payments", "Fiserv", "Adyen", "Stripe"];

function createAttemptDraft(detail?: LocationDetailRecord | null): AttemptDraft {
  const today = new Date();

  return {
    cardName: detail?.brand && detail.brand !== "Unknown" ? detail.brand : "",
    transactionStatus: "Success",
    network: detail?.supportedNetworks?.[0] || "Visa",
    paymentMethod: "Tap",
    cvm: "PIN",
    acquiringMode: "Unknown",
    deviceStatus: detail?.status || "active",
    acquirer: "",
    checkoutLocation: "Staffed Checkout",
    attemptYear: String(today.getFullYear()),
    attemptMonth: String(today.getMonth() + 1).padStart(2, "0"),
    attemptDay: String(today.getDate()).padStart(2, "0"),
    notes: ""
  };
}

function createReviewDraft(): ReviewDraft {
  return {
    mode: "review",
    rating: 5,
    content: ""
  };
}

function createReviewSuccessState(draft: ReviewDraft): ReviewSuccessState {
  return {
    mode: draft.mode,
    rating: draft.mode === "review" ? draft.rating : null,
    content: draft.content.trim()
  };
}

function buildAttemptedAtFromDraft(draft: AttemptDraft): string {
  const year = Number(draft.attemptYear);
  const month = Number(draft.attemptMonth);
  const day = Number(draft.attemptDay);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date().toISOString();
  }

  const now = new Date();
  const timestamp = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), 0);
  return Number.isNaN(timestamp.getTime()) ? now.toISOString() : timestamp.toISOString();
}

function buildAttemptDateValue(draft: AttemptDraft): string {
  const year = draft.attemptYear.trim();
  const month = draft.attemptMonth.trim();
  const day = draft.attemptDay.trim();

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function hasMastercardNuccFailureSignal(draft: AttemptDraft): boolean {
  if (draft.transactionStatus === "Fault") {
    return true;
  }

  return /(失败|报错|拒绝|无法|不通过|刷不过|declin|declined|fail|fault|error|do not honor)/i.test(draft.notes);
}

function isMastercardNuccEligible(draft: AttemptDraft): boolean {
  return draft.network.trim().toLowerCase() === "mastercard cn" && hasMastercardNuccFailureSignal(draft);
}

function buildMastercardNuccProblemDescription(location: LocationDetailRecord, draft: AttemptDraft): string {
  const lines = [
    `交易网络：${draft.network || "Unknown"}`,
    `支付结果：${draft.transactionStatus || "Unknown"}`,
    `卡片信息：${draft.cardName.trim() || location.brand || location.name}`,
    `支付方式：${draft.paymentMethod || "Unknown"}`,
    `CVM：${draft.cvm || "Unknown"}`,
    `受理模式：${draft.acquiringMode || "Unknown"}`,
    `终端状态：${draft.deviceStatus === "inactive" ? "Inactive" : "Active"}`,
    `收单机构：${draft.acquirer.trim() || "Unknown"}`,
    `结账位置：${draft.checkoutLocation || "Unknown"}`,
    "",
    "Fluxa Map 备注：",
    draft.notes.trim() || "未填写"
  ];

  return lines.join("\n");
}

function getMastercardNuccPrivacyPolicyUrl(language: string): string {
  return language === "zh"
    ? "https://mastercardnucc.com/privacy"
    : "https://mastercardnucc.com/en/privacy";
}

function formatAttemptMutationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to save the attempt right now.";
}

function formatDeleteMutationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to delete the location right now.";
}

function formatReviewMutationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to save the review right now.";
}

function formatReviewDeleteMutationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to delete the review right now.";
}

function AttemptDialogCard({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const { t } = useI18n();

  return (
    <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <h3 className="text-base font-semibold leading-[1.25] text-[var(--foreground)]">{t(title)}</h3>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </article>
  );
}

function AttemptDialogField({
  label,
  placeholder,
  value,
  onChange,
  isSelect = false,
  multiline = false,
  options = []
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isSelect?: boolean;
  multiline?: boolean;
  options?: string[];
}): React.JSX.Element {
  const { t } = useI18n();
  const hasValue = value.trim().length > 0;
  const displayValue = hasValue ? t(value) : t(placeholder);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">{t(label)}</p>
      <div
        className={`border border-[var(--border)] bg-[var(--accent)] px-5 text-sm ${
          multiline ? "rounded-m py-3" : isSelect ? "relative min-h-[56px] rounded-pill py-0" : "flex items-center gap-2 rounded-pill py-4"
        }`}
      >
        {isSelect ? (
          <>
            <select
              className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-pill bg-transparent px-5 pr-11 opacity-0 outline-none"
              onChange={(event) => onChange(event.target.value)}
              value={value}
            >
              <option value="">{t(placeholder)}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {t(option)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none flex min-h-[54px] items-center justify-between gap-3">
              <span className={`block truncate text-sm leading-[1.35] ${hasValue ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{displayValue}</span>
              <ChevronRight className="h-4 w-4 rotate-90 shrink-0 text-[var(--muted-foreground)]" />
            </div>
          </>
        ) : multiline ? (
          <textarea
            className="w-full resize-none bg-transparent text-sm leading-[1.5] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            onChange={(event) => onChange(event.target.value)}
            placeholder={t(placeholder)}
            rows={4}
            value={value}
          />
        ) : (
          <input
            className="w-full bg-transparent text-sm leading-[1.35] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            onChange={(event) => onChange(event.target.value)}
            placeholder={t(placeholder)}
            type="text"
            value={value}
          />
        )}
      </div>
    </div>
  );
}

function AttemptDialogChip({
  icon: Icon,
  label,
  active = false,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-sm font-medium leading-[1.4286] transition-colors duration-200 ${
        active
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
          : "border border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      <span>{t(label)}</span>
    </button>
  );
}

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

function normalizeStaffProficiencyLevel(value: number | null | undefined): StaffProficiencyLevel | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }

  return null;
}

function getStaffProficiencyLevel(detail: LocationDetailRecord | null | undefined): StaffProficiencyLevel | null {
  return normalizeStaffProficiencyLevel((detail as DetailStaffProficiencyShape | null | undefined)?.staffProficiencyLevel);
}

function getStaffProficiencyUpdatedAt(detail: LocationDetailRecord | null | undefined): string | null {
  const value = (detail as DetailStaffProficiencyShape | null | undefined)?.staffProficiencyUpdatedAt;
  return typeof value === "string" && value.trim() ? value : null;
}

function findStaffProficiencyOption(level: StaffProficiencyLevel | null): StaffProficiencyOption | null {
  if (!level) {
    return null;
  }

  return STAFF_PROFICIENCY_OPTIONS.find((option) => option.level === level) || null;
}

function formatStaffProficiencyUpdatedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatStaffProficiencyMutationError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to update staff proficiency right now.";
}

function buildFallbackDetail(location: LocationRecord): LocationDetailRecord {
  return {
    ...location,
    source: location.source || "fluxa_locations",
    deviceName: location.name,
    metaLine: `品牌：${location.brand}  •  城市：${location.city}`,
    successRate: location.successRate || 0,
    successCount: 0,
    failedCount: 0,
    totalAttempts: 0,
    attempts: [],
    reviews: [],
    supportInsights: {
      networks: [],
      paymentMethods: []
    }
  };
}

function formatSpecialDateLabel(dateValue: string): string {
  if (!dateValue) {
    return "";
  }

  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function hasLocationBusinessHours(value: LocationBusinessHours | undefined): boolean {
  return Boolean(value?.weekday || value?.weekend || value?.specialDates?.length);
}

function buildBusinessHoursRows(
  value: LocationBusinessHours | undefined,
  t: (text: string) => string
): BusinessHoursRow[] {
  const weekday = value?.weekday?.trim() || "";
  const weekend = value?.weekend?.trim() || "";
  const specialDates = (value?.specialDates || []).filter((entry) => entry.date.trim() && entry.hours.trim());
  const rows: BusinessHoursRow[] = [];

  if (weekday && weekend) {
    if (weekday === weekend) {
      rows.push({
        id: "daily",
        label: t("Daily"),
        value: weekday,
        kind: "regular"
      });
    } else {
      rows.push({
        id: "weekday",
        label: t("Weekdays"),
        value: weekday,
        kind: "regular"
      });
      rows.push({
        id: "weekend",
        label: t("Weekends"),
        value: weekend,
        kind: "regular"
      });
    }
  } else if (weekday) {
    rows.push({
      id: "weekday",
      label: t("Weekdays"),
      value: weekday,
      kind: "regular"
    });
  } else if (weekend) {
    rows.push({
      id: "weekend",
      label: t("Weekends"),
      value: weekend,
      kind: "regular"
    });
  }

  specialDates
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .forEach((entry) => {
      rows.push({
        id: `special-${entry.date}-${entry.hours}`,
        label: formatSpecialDateLabel(entry.date),
        value: entry.hours.trim(),
        kind: "special"
      });
    });

  return rows;
}

function formatSupportedNetworkLabel(network: string): string {
  const normalized = network.trim().toLowerCase();

  if (normalized === "amex cn") return "American Express 中国";
  if (normalized === "amex" || normalized === "american express") return "American Express";
  if (normalized === "jcb") return "JCB";
  if (normalized === "discover") return "Discover（发现）";
  if (normalized === "diners" || normalized === "diners club") return "Diners Club";
  if (normalized === "mastercard cn" || normalized === "mastercard nucc") return "MasterCard CN";
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
  if (normalized === "hce") return "HCE";
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

function buildFallbackInsight(key: string, title: string, status: SupportEvidenceStatus, rationale: string): LocationSupportInsight {
  return {
    key,
    title,
    status,
    rationale,
    evidence: [],
    counters: {
      supportingAttempts: 0,
      conflictingAttempts: 0,
      officialSources: 0
    }
  };
}

function buildNetworkRows(detail: LocationDetailRecord): NetworkRow[] {
  if (detail.supportInsights?.networks?.length) {
    return detail.supportInsights.networks.map((insight) => ({
      key: insight.key,
      name: insight.title,
      status: insight.status,
      insight
    }));
  }

  if (detail.supportedNetworks && detail.supportedNetworks.length > 0) {
    return Array.from(new Set(detail.supportedNetworks.map(formatSupportedNetworkLabel))).map((name) => ({
      key: `network:${name.toLowerCase()}`,
      name,
      status: "supported" as const,
      insight: buildFallbackInsight(`network:${name.toLowerCase()}`, name, "supported", "This network is inferred from the current location record.")
    }));
  }

  const grouped = new Map<string, { supporting: number; conflicting: number }>();

  detail.attempts.forEach((attempt) => {
    const name = formatSupportedNetworkLabel(attempt.network);
    if (!name || name === "Unknown") {
      return;
    }

    const next = grouped.get(name) || { supporting: 0, conflicting: 0 };
    if (attempt.status === "success") {
      next.supporting += 1;
    } else {
      next.conflicting += 1;
    }
    grouped.set(name, next);
  });

  return Array.from(grouped.entries()).map(([name, counts]) => {
    const status: SupportEvidenceStatus = counts.supporting > 0 ? "supported" : counts.conflicting > 0 ? "unsupported" : "unknown";

    return {
      key: `network:${name.toLowerCase()}`,
      name,
      status,
      insight: buildFallbackInsight(
        `network:${name.toLowerCase()}`,
        name,
        status,
        "This network is inferred from recorded payment attempts."
      )
    };
  });
}

function buildPaymentMethodRows(detail: LocationDetailRecord): NetworkRow[] {
  if (detail.supportInsights?.paymentMethods?.length) {
    return detail.supportInsights.paymentMethods.map((insight) => ({
      key: insight.key,
      name: insight.title,
      status: insight.status,
      insight
    }));
  }

  const grouped = new Map<string, { supporting: number; conflicting: number }>();

  detail.attempts.forEach((attempt) => {
    const name = formatPaymentMethodLabel(attempt.paymentMethod || attempt.method);
    if (!name || name === "Unknown") {
      return;
    }

    const next = grouped.get(name) || { supporting: 0, conflicting: 0 };
    if (attempt.status === "success") {
      next.supporting += 1;
    } else {
      next.conflicting += 1;
    }
    grouped.set(name, next);
  });

  return Array.from(grouped.entries()).map(([name, counts]) => {
    const status: SupportEvidenceStatus = counts.supporting > 0 ? "supported" : counts.conflicting > 0 ? "unsupported" : "unknown";

    return {
      key: `payment-method:${name.toLowerCase()}`,
      name,
      status,
      insight: buildFallbackInsight(
        `payment-method:${name.toLowerCase()}`,
        name,
        status,
        "This payment method is inferred from recorded payment attempts."
      )
    };
  });
}

function formatSupportStatusLabel(status: SupportEvidenceStatus): string {
  if (status === "supported") return "Supported";
  if (status === "unsupported") return "Unsupported";
  if (status === "limited") return "Limited";
  return "Unknown";
}

const HEADER_ICON_TONES = {
  neutral: "text-[var(--muted-foreground)]",
  success: "text-[#008A00]",
  primary: "text-[var(--primary)]"
} as const;
const ROW_ICON_TONES = {
  neutral: "text-[var(--muted-foreground)]",
  success: "text-[#008A00]",
  primary: "text-[var(--primary)]"
} as const;
type SectionIconTone = keyof typeof HEADER_ICON_TONES;
const FLAT_ACTION_BUTTON_CLASS =
  "inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--accent)]";
const FLAT_ICON_BUTTON_CLASS =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--input)] bg-white text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]";
const DETAIL_CARD_CLASS = "flex min-w-0 flex-col rounded-[40px] border border-[var(--input)] bg-white p-8";

function SectionIconBadge({
  icon: Icon,
  tone = "neutral"
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: SectionIconTone;
}): React.JSX.Element {
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tile)]">
      <Icon className={`h-4 w-4 ${ROW_ICON_TONES[tone]}`} />
    </span>
  );
}

function StatusPill({
  label,
  kind = "supported",
  appearance = "default"
}: {
  label: string;
  kind?: "supported" | "unknown" | "limited" | "declined" | "unsupported";
  appearance?: "default" | "info";
}): React.JSX.Element {
  const { t } = useI18n();
  const cls =
    appearance === "info"
      ? "bg-[var(--color-info)] text-[var(--color-info-foreground)]"
      : kind === "supported"
        ? "bg-[var(--color-success)] text-[var(--color-success-foreground)]"
        : kind === "unsupported"
          ? "bg-[var(--color-error)] text-[var(--color-error-foreground)]"
          : kind === "declined"
            ? "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]"
            : kind === "limited"
              ? "bg-[var(--color-error)] text-[var(--color-error-foreground)]"
              : "bg-[var(--secondary)] text-[var(--secondary-foreground)]";

  return (
    <span className={`inline-flex h-8 items-center justify-center rounded-pill px-3 text-[13px] font-medium leading-[1] ${cls}`}>
      {t(label)}
    </span>
  );
}

function SectionHeader({
  title,
  icon: Icon,
  iconTone = "neutral",
  meta,
  buttonLabel,
  onAction
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconTone?: SectionIconTone;
  meta?: React.ReactNode;
  buttonLabel?: string;
  onAction?: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t(title)}</h3>
      <div className="flex items-center gap-3">
        {meta}
        {buttonLabel && onAction ? (
          <button className={FLAT_ACTION_BUTTON_CLASS} onClick={onAction} type="button">
            <Settings2 className="h-4 w-4" />
            <span>{t(buttonLabel)}</span>
          </button>
        ) : null}
        {Icon ? <Icon className={`h-5 w-5 ${HEADER_ICON_TONES[iconTone]}`} /> : null}
      </div>
    </div>
  );
}

function MetricCardHeader({
  title,
  icon: Icon,
  iconTone = "neutral"
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone?: SectionIconTone;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-base font-medium leading-[1.4] text-[var(--muted-foreground)]">{t(title)}</p>
      <Icon className={`h-5 w-5 ${HEADER_ICON_TONES[iconTone]}`} />
    </div>
  );
}

function getPaymentMethodIcon(name: string): React.ComponentType<{ className?: string }> {
  const normalized = name.trim().toLowerCase();

  if (normalized === "apple pay" || normalized === "google pay") return Smartphone;
  if (normalized === "contactless" || normalized === "tap") return Wifi;
  if (normalized === "hce") return Nfc;

  return CreditCard;
}

function StaffProficiencyCard({
  currentLevel,
  updatedAt,
  error
}: {
  currentLevel: StaffProficiencyLevel | null;
  updatedAt: string | null;
  saving: boolean;
  savingLevel: StaffProficiencyLevel | null;
  error: string | null;
  onSelectLevel: (level: StaffProficiencyLevel) => void;
  onClear: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const activeOption = findStaffProficiencyOption(currentLevel);
  const lastUpdatedLabel = formatStaffProficiencyUpdatedAt(updatedAt);

  return (
    <article className={`${DETAIL_CARD_CLASS} h-full xl:col-span-1`}>
      <SectionHeader
        meta={activeOption ? <StatusPill appearance="info" kind="supported" label={`L${activeOption.level}`} /> : <StatusPill kind="unknown" label="Not set" />}
        title="Staff Proficiency"
      />

      <p className="mt-5 text-sm leading-[1.6] text-[var(--muted-foreground)]">
        {activeOption
          ? t("Use this to estimate how much POS guidance the store staff will need.")
          : t("No proficiency level has been recorded for this location yet.")}
      </p>

      <div className={`mt-6 rounded-[24px] border px-5 py-5 ${activeOption ? "border-[var(--input)] bg-[#FAFAFA]" : "border-dashed border-[var(--input)] bg-[#FAFAFA]"}`}>
        <div className="flex items-start gap-4">
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[var(--tile)] px-2 text-sm font-semibold text-[var(--primary)]">
            {activeOption ? activeOption.level : "--"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-lg font-semibold leading-[1.3] text-[var(--foreground)]">{activeOption ? t(activeOption.label) : t("Not set")}</p>
              {activeOption ? <StatusPill appearance="info" kind="supported" label="Current Level" /> : null}
            </div>
            <p className="mt-2 max-w-[56ch] text-sm leading-[1.6] text-[var(--muted-foreground)]">
              {activeOption ? t(activeOption.description) : t("Pick one of the levels below to save a recommendation baseline for onboarding and support.")}
            </p>
            {lastUpdatedLabel ? (
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
                {t("Last updated")} · {lastUpdatedLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col">
        {STAFF_PROFICIENCY_OPTIONS.map((option) => {
          const active = currentLevel === option.level;

          return (
            <div
              className={`flex items-start justify-between gap-3 px-0 py-4 ${option.level !== STAFF_PROFICIENCY_OPTIONS.length ? "border-b border-[var(--input)]" : ""}`}
              key={option.level}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-2 text-sm font-semibold ${active ? "bg-[var(--color-info)] text-[var(--color-info-foreground)]" : "bg-[var(--tile)] text-[var(--muted-foreground)]"}`}>
                  {option.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-[1.35] text-[var(--foreground)]">{t(option.label)}</p>
                  <p className="mt-1 text-sm leading-[1.6] text-[var(--muted-foreground)]">{t(option.description)}</p>
                </div>
              </div>
              {active ? <StatusPill appearance="info" kind="supported" label="Current Level" /> : null}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="mt-5 rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm text-[#7A1F0E]">
          {t(error)}
        </div>
      ) : null}
    </article>
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
  const healthKind = summary.rate >= 90 ? "supported" : "unknown";

  return (
    <article className={DETAIL_CARD_CLASS}>
      <MetricCardHeader icon={TrendingUp} iconTone="success" title="授权成功率" />
      <p className="mt-4 text-[48px] font-bold leading-[1] tracking-[-1px] text-[#006600]">{summary.rate.toFixed(1)}%</p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {summary.totalAttempts > 0 ? <StatusPill kind={healthKind} label={summary.rate >= 90 ? "Healthy" : "Watch"} /> : null}
            <p className="text-[13px] leading-[1.3] text-[var(--muted-foreground)]">
              {summary.totalAttempts > 0 ? `${summary.successCount}/${summary.totalAttempts} ${t("Successful Attempts")}` : t("当前区间内暂没有支付尝试记录")}
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
              className={FLAT_ICON_BUTTON_CLASS}
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
                className="inline-flex h-10 items-center justify-center rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[#F7F9F7]"
                onClick={onReset}
                type="button"
              >
                {t("恢复永久")}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-pill bg-[#008A00] px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#007300] disabled:cursor-not-allowed disabled:opacity-50"
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
  proficiencyLevel,
  proficiencyUpdatedAt,
  proficiencySaving,
  proficiencySavingLevel,
  proficiencyError,
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
  onSelectProficiencyLevel,
  onClearProficiencyLevel,
  showUnknownNetworksOnly,
  showLimitedPaymentMethodsOnly,
  onToggleUnknownNetworks,
  onToggleLimitedPaymentMethods,
  onOpenSupportInsight
}: {
  detail: LocationDetailRecord;
  proficiencyLevel: StaffProficiencyLevel | null;
  proficiencyUpdatedAt: string | null;
  proficiencySaving: boolean;
  proficiencySavingLevel: StaffProficiencyLevel | null;
  proficiencyError: string | null;
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
  onSelectProficiencyLevel: (level: StaffProficiencyLevel) => void;
  onClearProficiencyLevel: () => void;
  showUnknownNetworksOnly: boolean;
  showLimitedPaymentMethodsOnly: boolean;
  onToggleUnknownNetworks: () => void;
  onToggleLimitedPaymentMethods: () => void;
  onOpenSupportInsight: (insight: LocationSupportInsight) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const networkRows = buildNetworkRows(detail);
  const businessHoursRows = buildBusinessHoursRows(detail.businessHours, t);
  const paymentMethodRows = buildPaymentMethodRows(detail);
  const visibleNetworkRows = showUnknownNetworksOnly ? networkRows.filter((row) => row.status === "unknown") : networkRows;
  const visiblePaymentMethodRows = showLimitedPaymentMethodsOnly
    ? paymentMethodRows.filter((row) => row.status === "limited" || row.status === "unsupported")
    : paymentMethodRows;
  const statusLabel = formatStatusLabel(detail.status);
  const hasBusinessInfo = Boolean(detail.contactInfo || hasLocationBusinessHours(detail.businessHours));

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

      <article className={DETAIL_CARD_CLASS}>
        <MetricCardHeader icon={Radio} iconTone="primary" title="Device Status" />
        <p className={`mt-4 text-[48px] font-bold leading-[1] tracking-[-1px] ${detail.status === "inactive" ? "text-[var(--foreground)]" : "text-[var(--foreground)]"}`}>
          {t(statusLabel)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusPill kind={detail.status === "inactive" ? "unknown" : "supported"} label={detail.status === "inactive" ? "Unknown" : "Verified"} />
        </div>
      </article>

      <article className={`${DETAIL_CARD_CLASS} h-full xl:col-span-1`}>
        <SectionHeader
          buttonLabel={showLimitedPaymentMethodsOnly ? "Show All" : "Limited Only"}
          onAction={onToggleLimitedPaymentMethods}
          title="Payment Methods"
        />

        <div className="mt-6 flex flex-1 flex-col">
          {visiblePaymentMethodRows.map((row, idx) => (
            <button
              className={`flex min-h-[64px] w-full items-center justify-between gap-3 px-0 py-4 text-left transition-colors duration-200 hover:bg-transparent ${idx !== visiblePaymentMethodRows.length - 1 ? "border-b border-[var(--input)]" : ""}`}
              key={row.key}
              onClick={() => onOpenSupportInsight(row.insight)}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                <SectionIconBadge icon={getPaymentMethodIcon(row.name)} tone="neutral" />
                <span className="truncate text-base font-semibold leading-[1.2] text-[var(--foreground)]">{row.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill
                  kind={row.status === "unsupported" ? "unsupported" : row.status === "limited" ? "limited" : row.status === "unknown" ? "unknown" : "supported"}
                  label={formatSupportStatusLabel(row.status)}
                />
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </button>
          ))}
          {visiblePaymentMethodRows.length === 0 ? <p className="py-6 text-sm text-[var(--muted-foreground)]">{t("No payment method matched current filter.")}</p> : null}
        </div>
      </article>

      <article className={`${DETAIL_CARD_CLASS} h-full xl:col-span-1`}>
        <SectionHeader
          buttonLabel={showUnknownNetworksOnly ? "Show All" : "Unknown Only"}
          onAction={onToggleUnknownNetworks}
          title="Supported Networks"
        />

        <div className="mt-6 flex flex-1 flex-col">
          {visibleNetworkRows.map((row, idx) => (
            <button
              className={`flex min-h-[64px] w-full items-center justify-between gap-3 px-0 py-4 text-left transition-colors duration-200 hover:bg-transparent ${idx !== visibleNetworkRows.length - 1 ? "border-b border-[var(--input)]" : ""}`}
              key={row.name}
              onClick={() => onOpenSupportInsight(row.insight)}
              type="button"
            >
              <div className="flex min-w-0 items-center gap-3">
                <SectionIconBadge icon={CreditCard} tone="neutral" />
                <span className="truncate text-base font-semibold leading-[1.2] text-[var(--foreground)]">{row.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill
                  kind={row.status === "unsupported" ? "unsupported" : row.status === "limited" ? "limited" : row.status === "unknown" ? "unknown" : "supported"}
                  label={formatSupportStatusLabel(row.status)}
                />
                <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
              </div>
            </button>
          ))}
          {visibleNetworkRows.length === 0 ? <p className="py-6 text-sm text-[var(--muted-foreground)]">{t("No network matched current filter.")}</p> : null}
        </div>
      </article>

      <StaffProficiencyCard
        currentLevel={proficiencyLevel}
        error={proficiencyError}
        onClear={onClearProficiencyLevel}
        onSelectLevel={onSelectProficiencyLevel}
        saving={proficiencySaving}
        savingLevel={proficiencySavingLevel}
        updatedAt={proficiencyUpdatedAt}
      />

      <article className={`${DETAIL_CARD_CLASS} h-full xl:col-span-1`}>
        <SectionHeader
          meta={hasBusinessInfo ? <StatusPill kind="supported" label="Recorded" /> : <StatusPill kind="unknown" label="Not set" />}
          title="Business Hours & Contact"
        />

        <p className="mt-5 text-sm leading-[1.6] text-[var(--muted-foreground)]">
          {hasBusinessInfo ? t("Structured business information for this location.") : t("No business hours or contact information yet.")}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-8 xl:grid-cols-2">
          <section className="min-w-0">
            <div className="flex items-start gap-3">
              <SectionIconBadge icon={CalendarRange} tone="primary" />
              <div className="min-w-0">
                <h4 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t("Business Hours")}</h4>
                <p className="mt-1 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                  {businessHoursRows.length > 0 ? t("Displayed in the order people usually read them.") : t("No business hours have been added yet.")}
                </p>
              </div>
            </div>

            {businessHoursRows.length > 0 ? (
              <div className="mt-5 flex flex-1 flex-col divide-y divide-[var(--input)] border-t border-[var(--input)]">
                {businessHoursRows.map((row) => (
                  <div className="py-4 first:pt-5 last:pb-0" key={row.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold leading-[1.5] text-[var(--foreground)]">{row.label}</p>
                      {row.kind === "special" ? <StatusPill appearance="info" kind="supported" label="Special" /> : null}
                    </div>
                    <p className="mt-2 break-words text-sm leading-[1.6] text-[var(--muted-foreground)]">{row.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 border-t border-dashed border-[var(--input)] pt-5">
                <p className="text-sm font-medium leading-[1.6] text-[var(--foreground)]">{t("Not set")}</p>
              </div>
            )}
          </section>

          <section className="min-w-0 xl:border-l xl:border-[var(--input)] xl:pl-10">
            <div className="flex items-start gap-3">
              <SectionIconBadge icon={Phone} tone="success" />
              <div className="min-w-0">
                <h4 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t("Contact Information")}</h4>
                <p className="mt-1 text-sm leading-[1.6] text-[var(--muted-foreground)]">{t("Use the best way to reach this location.")}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-[var(--input)] pt-5">
              <p className="break-words whitespace-pre-wrap text-base font-semibold leading-[1.7] text-[var(--foreground)]">
                {detail.contactInfo?.trim() || t("Not set")}
              </p>
              <p className="mt-4 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                {detail.contactInfo?.trim() ? t("Use the contact details above when you need to reach this location.") : t("No contact information is available for this location yet.")}
              </p>
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}

function SupportSourceDialog({
  insight,
  open,
  onJumpToAttempt,
  onOpenChange
}: {
  insight: LocationSupportInsight | null;
  open: boolean;
  onJumpToAttempt: (attemptId: string) => void;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const officialEvidence = insight?.evidence.filter((item) => item.kind === "official") || [];
  const attemptEvidence = insight?.evidence.filter((item) => item.kind === "attempt") || [];

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[94vh] max-w-[min(1120px,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-[32px] p-0">
        <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
          <DialogTitle>{insight ? `${insight.title} · ${t("Source Details")}` : t("Source Details")}</DialogTitle>
          <DialogDescription>{t("Review the current status, official data, and recorded evidence for this item.")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {insight ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_repeat(3,minmax(0,1fr))]">
                <div className="rounded-[22px] border border-[var(--input)] bg-white px-4 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Current Status")}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <StatusPill
                      kind={insight.status === "unsupported" ? "unsupported" : insight.status === "limited" ? "limited" : insight.status === "unknown" ? "unknown" : "supported"}
                      label={formatSupportStatusLabel(insight.status)}
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Positive Attempts")}</p>
                  <p className="mt-3 text-2xl font-bold leading-[1.1] text-[var(--foreground)]">{insight.counters.supportingAttempts}</p>
                </div>

                <div className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Conflicting Attempts")}</p>
                  <p className="mt-3 text-2xl font-bold leading-[1.1] text-[var(--foreground)]">{insight.counters.conflictingAttempts}</p>
                </div>

                <div className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Official Data")}</p>
                  <p className="mt-3 text-2xl font-bold leading-[1.1] text-[var(--foreground)]">{insight.counters.officialSources}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <article className="flex min-h-[440px] flex-col rounded-[28px] border border-[var(--input)] bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold leading-[1.3] text-[var(--foreground)]">{t("Record Sources")}</p>
                      <p className="mt-1 text-sm leading-[1.5] text-[var(--muted-foreground)]">{t("System-recorded payment attempts that support or challenge this item.")}</p>
                    </div>
                    <StatusPill label={String(attemptEvidence.length)} />
                  </div>

                  <div className="mt-5 flex-1 overflow-y-auto pr-1">
                    <div className="flex flex-col gap-3">
                      {attemptEvidence.length > 0 ? attemptEvidence.map((item) => (
                        <button
                          className="rounded-[20px] border border-[var(--input)] bg-[#FAFAFA] px-4 py-4 text-left transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-white"
                          key={item.id}
                          onClick={() => item.attemptId && onJumpToAttempt(item.attemptId)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusPill
                                  kind={item.status === "unsupported" ? "unsupported" : item.status === "limited" ? "limited" : item.status === "unknown" ? "unknown" : "supported"}
                                  label={formatSupportStatusLabel(item.status)}
                                />
                                {item.invalidated ? <StatusPill kind="limited" label="Challenging" /> : null}
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-2 text-sm leading-[1.6] text-[var(--muted-foreground)] sm:grid-cols-2">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A1A1AA]">{t("Card Used")}</p>
                                  <p className="mt-1 text-[var(--foreground)]">{item.cardName || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A1A1AA]">{t("Payment Method")}</p>
                                  <p className="mt-1 text-[var(--foreground)]">{item.paymentMethodLabel || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A1A1AA]">{t("User")}</p>
                                  <p className="mt-1 text-[var(--foreground)]">{item.addedBy || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A1A1AA]">{t("Card Network")}</p>
                                  <p className="mt-1 text-[var(--foreground)]">{item.networkLabel || "-"}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#A1A1AA]">{t("Transaction Time")}</p>
                                  <p className="mt-1 text-[var(--foreground)]">{item.dateTimeLabel || "-"}</p>
                                </div>
                              </div>
                            </div>
                            {item.attemptId ? (
                              <span className="inline-flex items-center gap-1 text-sm font-medium leading-[1.4] text-[var(--primary)]">
                                <span>{t("View Attempt")}</span>
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            ) : null}
                          </div>
                        </button>
                      )) : (
                        <div className="rounded-[20px] border border-dashed border-[var(--input)] px-4 py-6 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                          {t("No record source has been added for this item yet.")}
                        </div>
                      )}
                    </div>
                  </div>
                </article>

                <article className="flex min-h-[440px] flex-col rounded-[28px] border border-[var(--input)] bg-white p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold leading-[1.3] text-[var(--foreground)]">{t("Official Data Sources")}</p>
                      <p className="mt-1 text-sm leading-[1.5] text-[var(--muted-foreground)]">{t("Official data currently attached to this location for this item.")}</p>
                    </div>
                    <StatusPill label={String(officialEvidence.length)} />
                  </div>

                  <div className="mt-5 flex-1 overflow-y-auto pr-1">
                    <div className="flex flex-col gap-3">
                      {officialEvidence.length > 0 ? officialEvidence.map((item) => (
                        <div className="rounded-[20px] border border-[var(--input)] bg-[#FAFAFA] px-4 py-4" key={item.id}>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold leading-[1.4] text-[var(--foreground)]">{t(item.title)}</p>
                            <StatusPill
                              kind={item.status === "unsupported" ? "unsupported" : item.status === "limited" ? "limited" : item.status === "unknown" ? "unknown" : "supported"}
                              label={formatSupportStatusLabel(item.status)}
                            />
                            {item.invalidated ? <StatusPill kind="limited" label="Needs Review" /> : null}
                          </div>
                          <p className="mt-2 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                            {t("This item is currently backed by official data captured for the location.")}
                          </p>
                        </div>
                      )) : (
                        <div className="rounded-[20px] border border-dashed border-[var(--input)] px-4 py-6 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                          {t("No official data has been attached for this item yet.")}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
          <button
            className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {t("Close")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttemptContent({
  attemptRows,
  attemptPage,
  attemptNotice,
  focusedAttemptId,
  onOpenAttemptDetail,
  onPageChange,
  onAddAttempt,
  canAddAttempt = false,
  addingAttempt = false,
  isShellLocation = false
}: {
  attemptRows: LocationAttemptRecord[];
  attemptPage: number;
  attemptNotice?: AttemptNotice | null;
  focusedAttemptId?: string | null;
  onOpenAttemptDetail: (attempt: LocationAttemptRecord) => void;
  onPageChange: (page: number) => void;
  onAddAttempt?: () => void;
  canAddAttempt?: boolean;
  addingAttempt?: boolean;
  isShellLocation?: boolean;
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
      {attemptNotice ? (
        <div
          className={`rounded-[18px] px-4 py-3 text-sm leading-[1.6] ${
            attemptNotice.kind === "success"
              ? "border border-[#CFE7D6] bg-[#F3FFF7] text-[#166534]"
              : "border border-[#FFD9D0] bg-[#FFF4F1] text-[#7A1F0E]"
          }`}
        >
          {attemptNotice.message}
        </div>
      ) : null}

      {isShellLocation ? (
        <div className="rounded-[18px] border border-[rgba(59,130,246,0.16)] bg-[rgba(239,246,255,0.9)] px-4 py-3 text-sm leading-[1.6] text-[#1d4ed8]">
          {t("This location is currently a shell entry. Your first real attempt will activate it and start the real success-rate history.")}
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t("Payment Attempts")}</h3>
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-6 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canAddAttempt || addingAttempt}
            onClick={onAddAttempt}
            type="button"
          >
            <Plus className="h-5 w-5" />
            <span>{addingAttempt ? t("Saving...") : t("Add")}</span>
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
          <button
            className={`flex w-full items-center gap-4 px-6 py-4 text-left transition-colors duration-300 ${
              row.id === focusedAttemptId ? "bg-[#FFF8E8]" : "bg-white"
            } ${idx !== currentRows.length - 1 ? "border-b border-[#E2E2E8]" : ""} hover:bg-[#FAFAFA]`}
            key={row.id}
            onClick={() => onOpenAttemptDetail(row)}
            type="button"
          >
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
          </button>
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
            className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            type="button"
          >
            {t("Previous")}
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
            <button
              className={`inline-flex h-10 w-10 items-center justify-center rounded-pill border text-sm font-medium ${
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
            className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:opacity-50"
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

function AttemptDetailDialog({
  attempt,
  open,
  onOpenChange
}: {
  attempt: LocationAttemptRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const statusLabel = attempt
    ? attempt.status === "success"
      ? "Success"
      : attempt.status === "declined"
        ? "Declined"
        : "Failed"
    : "Unknown";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[92vh] max-w-[min(920px,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-[32px] p-0">
        <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
          <DialogTitle>{t("Attempt Details")}</DialogTitle>
          <DialogDescription>{t("Review the full payment attempt details recorded for this entry.")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {attempt ? (
            <div className="space-y-6">
              <div className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Status")}</p>
                <div className="mt-3">
                  <StatusPill
                    kind={attempt.status === "declined" ? "declined" : attempt.status === "failed" ? "limited" : "supported"}
                    label={statusLabel}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <article className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Card Used")}</p>
                  <p className="mt-3 text-base font-semibold leading-[1.5] text-[var(--foreground)]">{attempt.cardName || "-"}</p>
                </article>

                <article className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Transaction Time")}</p>
                  <p className="mt-3 text-base font-semibold leading-[1.5] text-[var(--foreground)]">{attempt.dateTime || "-"}</p>
                </article>

                <article className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Added By")}</p>
                  <p className="mt-3 text-base font-semibold leading-[1.5] text-[var(--foreground)]">{attempt.addedBy || "-"}</p>
                </article>

                <article className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Card Network")}</p>
                  <p className="mt-3 text-base font-semibold leading-[1.5] text-[var(--foreground)]">{formatSupportedNetworkLabel(attempt.network) || "-"}</p>
                </article>

                <article className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Payment Method")}</p>
                  <p className="mt-3 text-base font-semibold leading-[1.5] text-[var(--foreground)]">{formatPaymentMethodLabel(attempt.paymentMethod || attempt.method) || "-"}</p>
                </article>

              </div>

              <article className="rounded-[24px] border border-[var(--input)] bg-white px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{t("Notes")}</p>
                <p className="mt-3 text-sm leading-[1.7] text-[var(--foreground)]">{attempt.notes?.trim() || t("No notes recorded for this attempt.")}</p>
              </article>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
          <button
            className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {t("Close")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewsContent({
  reviewItems,
  addingReview,
  canDeleteReview,
  deletingReviewId,
  onAddReview,
  onDeleteReview
}: {
  reviewItems: LocationReviewRecord[];
  addingReview: boolean;
  canDeleteReview: (review: LocationReviewRecord) => boolean;
  deletingReviewId: string | null;
  onAddReview: () => void;
  onDeleteReview: (review: LocationReviewRecord) => void;
}): React.JSX.Element {
  const { t } = useI18n();

  const renderReviewCard = (item: LocationReviewRecord) => {
    const numericRating = typeof item.rating === "number" ? item.rating : null;

    return (
      <article className="mb-6 break-inside-avoid rounded-2xl border border-[#E2E2E8] bg-white p-6" key={item.id}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E2E2E8] text-sm font-semibold text-[var(--muted-foreground)]">{item.initials}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <p className="truncate text-[15px] font-semibold leading-[1.2] text-[var(--foreground)]">{t(item.name)}</p>
                {numericRating !== null ? (
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span
                        className={`h-3 w-10 rounded-full ${index < numericRating ? "bg-[var(--primary)]" : "bg-[#E4E4E7]"}`}
                        key={`${item.id}-inline-rating-${index + 1}`}
                      />
                    ))}
                  </div>
                ) : (
                  <StatusPill kind="unknown" label={t("Comment")} />
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="text-[13px] leading-[1.2] text-[#A1A1AA]">{item.time}</p>
            {canDeleteReview(item) ? (
              <button
                aria-label={t("Delete Review")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(220,38,38,0.16)] bg-[rgba(254,242,242,0.88)] text-[#B42318] transition-colors duration-200 hover:bg-[rgba(254,226,226,0.96)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deletingReviewId === item.id}
                onClick={() => onDeleteReview(item)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-sm leading-[1.6] text-[var(--foreground)]">{t(item.content)}</p>
      </article>
    );
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[20px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{t("Reviews")}</h3>
        <button
          className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-6 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={addingReview}
          onClick={onAddReview}
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
        <div className="min-w-0 columns-1 gap-6 xl:columns-2">
          {reviewItems.map(renderReviewCard)}
        </div>
      )}
    </div>
  );
}

function ReviewRatingSelectorButton({
  active,
  value,
  onClick
}: {
  active: boolean;
  value: number;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-12 min-w-12 items-center justify-center rounded-[16px] border px-4 text-sm font-semibold transition-colors duration-200 ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {value}
    </button>
  );
}

function ReviewComposerDialog({
  draft,
  error,
  locationName,
  onAddAnother,
  onContentChange,
  onModeChange,
  onOpenChange,
  onRatingChange,
  success,
  onSubmit,
  open,
  saving
}: {
  draft: ReviewDraft;
  error: string | null;
  locationName: string;
  onAddAnother: () => void;
  onContentChange: (value: string) => void;
  onModeChange: (mode: ReviewDraft["mode"]) => void;
  onOpenChange: (open: boolean) => void;
  onRatingChange: (value: number) => void;
  success: ReviewSuccessState | null;
  onSubmit: () => void;
  open: boolean;
  saving: boolean;
}): React.JSX.Element {
  const { t } = useI18n();
  const successMode = success?.mode ?? null;
  const reviewMode = draft.mode === "review";
  const selectedRating = reviewMode && typeof draft.rating === "number" ? draft.rating : null;
  const submitLabel = reviewMode ? "Submit Review" : "Submit Comment";
  const successRating = typeof success?.rating === "number" ? success.rating : null;
  const successLabel = successMode === "review" ? "Review Added Successfully" : "Comment Added Successfully";
  const successDescription =
    successMode === "review"
      ? "Your review has been saved to this location and is now visible in the Reviews timeline."
      : "Your comment has been saved to this location and is now visible in the Reviews timeline.";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className={`${success ? "max-w-[min(720px,calc(100vw-2rem))]" : "max-w-[min(960px,calc(100vw-2rem))]"} max-h-[90vh] gap-0 overflow-hidden rounded-[32px] p-0`}>
        <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
          <DialogTitle>{t(success ? successLabel : "Add Review")}</DialogTitle>
          <DialogDescription>{t(success ? successDescription : "Choose whether you are leaving a scored review or a quick comment for this location.")}</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex-1 overflow-y-auto bg-[#FAFAFA] px-4 py-5 sm:px-6 sm:py-6">
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] px-5 py-6 sm:px-7 sm:py-8">
              <div className="flex flex-col items-start gap-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success)] text-[var(--color-success-foreground)]">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <div className="space-y-2">
                  <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.3px] text-[var(--foreground)]">{t(successLabel)}</h2>
                  <p className="max-w-[520px] text-sm leading-[1.6] text-[var(--muted-foreground)]">{t(successDescription)}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Location")}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{locationName}</p>
                </article>
                <article className="rounded-2xl border border-[var(--input)] bg-white p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Entry Type")}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill appearance="info" kind={successMode === "review" ? "supported" : "unknown"} label={t(successMode === "review" ? "Review" : "Comment")} />
                    {successRating !== null ? <StatusPill appearance="info" kind="supported" label={`${successRating}/5`} /> : null}
                  </div>
                </article>
              </div>

              <article className="mt-4 rounded-2xl border border-[var(--input)] bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-[var(--muted-foreground)]">{t("Saved Content")}</p>
                <p className="mt-3 text-sm leading-[1.7] text-[var(--foreground)]">{success.content}</p>
              </article>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-5">
                <AttemptDialogCard title="1. Entry Type">
                  <div className="flex flex-wrap gap-3">
                    <AttemptDialogChip active={reviewMode} icon={PenTool} label="Review" onClick={() => onModeChange("review")} />
                    <AttemptDialogChip active={!reviewMode} icon={MessageSquare} label="Comment" onClick={() => onModeChange("comment")} />
                  </div>
                  <p className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                    {reviewMode
                      ? t("Scored review with optional rating details.")
                      : t("Quick comment without a score.")}
                  </p>
                </AttemptDialogCard>

                {reviewMode ? (
                  <AttemptDialogCard title="2. Rating">
                    <div className="flex flex-wrap gap-3">
                      {Array.from({ length: 5 }, (_, index) => (
                        <ReviewRatingSelectorButton
                          active={draft.rating === index + 1}
                          key={index + 1}
                          onClick={() => onRatingChange(index + 1)}
                          value={index + 1}
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                      {t("Use the score to summarize how reliable or helpful this payment experience was.")}
                    </p>
                  </AttemptDialogCard>
                ) : null}

                <AttemptDialogCard title={reviewMode ? "3. Review Details" : "2. Comment Details"}>
                  <AttemptDialogField
                    label="What happened at this location?"
                    multiline
                    onChange={onContentChange}
                    placeholder={
                      reviewMode
                        ? "Share payment behavior, staff guidance, supported cards, or anything another viewer should know."
                        : "Leave a short operational note for the next viewer."
                    }
                    value={draft.content}
                  />
                </AttemptDialogCard>

                {error ? (
                  <div className="rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm text-[#7A1F0E]">
                    {t(error)}
                  </div>
                ) : null}
              </div>

              <aside className="rounded-m border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{t("Preview")}</p>
                <p className="mt-3 text-[22px] font-bold leading-[1.2] tracking-[-0.2px] text-[var(--foreground)]">{locationName}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusPill appearance="info" kind={reviewMode ? "supported" : "unknown"} label={t(reviewMode ? "Review" : "Comment")} />
                  {selectedRating !== null ? <StatusPill appearance="info" kind="supported" label={`${selectedRating}/5`} /> : null}
                </div>
                {selectedRating !== null ? (
                  <div className="mt-5 flex items-center gap-2">
                    {Array.from({ length: 5 }, (_, index) => (
                      <span
                        className={`h-2.5 w-9 rounded-full ${index < selectedRating ? "bg-[var(--primary)]" : "bg-[#E4E4E7]"}`}
                        key={`preview-rating-${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
                <div className="mt-5 rounded-[22px] border border-[var(--input)] bg-white px-4 py-4">
                  <p className="text-sm leading-[1.7] text-[var(--foreground)]">
                    {draft.content.trim() || t("Your note will appear in the Reviews timeline once saved.")}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
          {success ? (
            <>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[#F7F9F7]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <MessageSquare className="h-4 w-4" />
                {t("Back to Reviews")}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
                onClick={onAddAnother}
                type="button"
              >
                <RotateCcw className="h-4 w-4" />
                {t("Add Another Review")}
              </button>
            </>
          ) : (
            <>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:bg-[#F7F9F7]"
                onClick={() => onOpenChange(false)}
                type="button"
              >
                <CircleX className="h-4 w-4" />
                {t("Cancel")}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving}
                onClick={onSubmit}
                type="button"
              >
                <PenTool className="h-4 w-4" />
                {saving ? t("Saving...") : t(submitLabel)}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PlaceDetailWebProps {
  location?: LocationRecord | null;
  locationLoading?: boolean;
  onDeleteLocation?: (location: LocationRecord) => Promise<void>;
  onViewMap?: () => void;
}

export function PlaceDetailWeb({ location, locationLoading = false, onDeleteLocation, onViewMap }: PlaceDetailWebProps): React.JSX.Element {
  const { language, t } = useI18n();
  const { detail, loading, error, refreshDetail } = useLocationDetail(location);
  const { isAdmin, viewerId, loading: viewerAccessLoading } = useViewerAccess({
    enabled: true
  });
  const recordedHistoryLocationIdRef = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailContentTab>("overview");
  const [editable, setEditable] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationMeta, setLocationMeta] = useState("");
  const [showUnknownNetworksOnly, setShowUnknownNetworksOnly] = useState(false);
  const [showLimitedPaymentMethodsOnly, setShowLimitedPaymentMethodsOnly] = useState(false);
  const [attemptPage, setAttemptPage] = useState(1);
  const [attemptDialogOpen, setAttemptDialogOpen] = useState(false);
  const [attemptDetailDialogOpen, setAttemptDetailDialogOpen] = useState(false);
  const [attemptSaving, setAttemptSaving] = useState(false);
  const [attemptMutationError, setAttemptMutationError] = useState<string | null>(null);
  const [attemptNotice, setAttemptNotice] = useState<AttemptNotice | null>(null);
  const [nuccFeedbackOptIn, setNuccFeedbackOptIn] = useState(false);
  const [nuccBridgeSession, setNuccBridgeSession] = useState<MastercardNuccBridgeSession | null>(null);
  const [nuccBridgeLoading, setNuccBridgeLoading] = useState(false);
  const [nuccBridgeError, setNuccBridgeError] = useState<string | null>(null);
  const [nuccContactInfo, setNuccContactInfo] = useState("");
  const [nuccCardBin, setNuccCardBin] = useState("");
  const [nuccTimeWindow, setNuccTimeWindow] = useState("");
  const [nuccCaptchaResponse, setNuccCaptchaResponse] = useState("");
  const [nuccPrivacyAccepted, setNuccPrivacyAccepted] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMutationError, setReviewMutationError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<ReviewSuccessState | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [highlightedAttemptId, setHighlightedAttemptId] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<LocationAttemptRecord | null>(null);
  const [selectedSupportInsight, setSelectedSupportInsight] = useState<LocationSupportInsight | null>(null);
  const [supportSourceDialogOpen, setSupportSourceDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteMutationError, setDeleteMutationError] = useState<string | null>(null);
  const [successRateFilter, setSuccessRateFilter] = useState<SuccessRateDateFilter>(DEFAULT_SUCCESS_RATE_FILTER);
  const [draftSuccessRateFilter, setDraftSuccessRateFilter] = useState<SuccessRateDateFilter>(DEFAULT_SUCCESS_RATE_FILTER);
  const [successRateDialogOpen, setSuccessRateDialogOpen] = useState(false);
  const [staffProficiencyLevel, setStaffProficiencyLevel] = useState<StaffProficiencyLevel | null>(null);
  const [staffProficiencyUpdatedAt, setStaffProficiencyUpdatedAt] = useState<string | null>(null);
  const [staffProficiencySaving, setStaffProficiencySaving] = useState(false);
  const [staffProficiencySavingLevel, setStaffProficiencySavingLevel] = useState<StaffProficiencyLevel | null>(null);
  const [staffProficiencyError, setStaffProficiencyError] = useState<string | null>(null);
  const nuccBridgeRequestIdRef = useRef(0);

  const detailRecord = useMemo(() => {
    if (detail) return detail;
    if (location) return buildFallbackDetail(location);
    return null;
  }, [detail, location]);
  const [attemptDraft, setAttemptDraft] = useState<AttemptDraft>(() => createAttemptDraft(detailRecord));
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(() => createReviewDraft());

  const filteredAttemptsForSuccessRate = useMemo(
    () => filterAttemptsByDateRange(detailRecord?.attempts || [], successRateFilter),
    [detailRecord?.attempts, successRateFilter]
  );
  const successRateSummary = useMemo(() => summarizeSuccessRate(filteredAttemptsForSuccessRate), [filteredAttemptsForSuccessRate]);
  const successRateFilterError = useMemo(() => validateSuccessRateDateFilter(draftSuccessRateFilter), [draftSuccessRateFilter]);
  const nuccFeedbackEligible = useMemo(() => isMastercardNuccEligible(attemptDraft), [attemptDraft]);
  const shouldSubmitToNucc = nuccFeedbackEligible && nuccFeedbackOptIn && !MASTERCARD_CN_WANSHENG_PREVIEW_ONLY;
  const nuccPrivacyPolicyUrl = getMastercardNuccPrivacyPolicyUrl(language);
  const feedbackCardTitle = "7. Mastercard NUCC Feedback";
  const acquirerDeviceCardTitle = "5. Acquirer & Device";
  const paymentMethodCardTitle = "6. Payment Method";

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
    setStaffProficiencyLevel(getStaffProficiencyLevel(detailRecord));
    setStaffProficiencyUpdatedAt(getStaffProficiencyUpdatedAt(detailRecord));
  }, [detailRecord]);

  const resetNuccFeedbackState = () => {
    nuccBridgeRequestIdRef.current += 1;
    setNuccFeedbackOptIn(false);
    setNuccBridgeSession(null);
    setNuccBridgeLoading(false);
    setNuccBridgeError(null);
    setNuccContactInfo("");
    setNuccCardBin("");
    setNuccTimeWindow("");
    setNuccCaptchaResponse("");
    setNuccPrivacyAccepted(false);
  };

  const initializeNuccBridgeSession = async () => {
    const requestId = nuccBridgeRequestIdRef.current + 1;
    nuccBridgeRequestIdRef.current = requestId;
    setNuccBridgeLoading(true);
    setNuccBridgeError(null);
    setNuccBridgeSession(null);
    setNuccCaptchaResponse("");

    try {
      const session = await createMastercardNuccBridgeSession();
      if (nuccBridgeRequestIdRef.current !== requestId) return;
      setNuccBridgeSession(session);
    } catch (error) {
      if (nuccBridgeRequestIdRef.current !== requestId) return;
      setNuccBridgeError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to load the Mastercard NUCC captcha right now."
      );
    } finally {
      if (nuccBridgeRequestIdRef.current === requestId) {
        setNuccBridgeLoading(false);
      }
    }
  };

  const refreshNuccCaptcha = async () => {
    if (!nuccBridgeSession) {
      return;
    }

    const requestId = nuccBridgeRequestIdRef.current + 1;
    nuccBridgeRequestIdRef.current = requestId;
    setNuccBridgeLoading(true);
    setNuccBridgeError(null);
    setNuccCaptchaResponse("");

    try {
      const session = await refreshMastercardNuccBridgeSession(nuccBridgeSession.sessionToken);
      if (nuccBridgeRequestIdRef.current !== requestId) return;
      setNuccBridgeSession(session);
    } catch (error) {
      if (nuccBridgeRequestIdRef.current !== requestId) return;
      setNuccBridgeError(
        error instanceof Error && error.message
          ? error.message
          : "Unable to refresh the Mastercard NUCC captcha right now."
      );
    } finally {
      if (nuccBridgeRequestIdRef.current === requestId) {
        setNuccBridgeLoading(false);
      }
    }
  };

  useEffect(() => {
    if (nuccFeedbackEligible) {
      return;
    }

    resetNuccFeedbackState();
  }, [nuccFeedbackEligible]);

  useEffect(() => {
    setSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    setDraftSuccessRateFilter(DEFAULT_SUCCESS_RATE_FILTER);
    setSuccessRateDialogOpen(false);
  }, [location?.id]);

  useEffect(() => {
    setAttemptDraft(createAttemptDraft(detailRecord));
    setAttemptDialogOpen(false);
    setAttemptDetailDialogOpen(false);
    setAttemptMutationError(null);
    setReviewDraft(createReviewDraft());
    setReviewDialogOpen(false);
    setReviewSaving(false);
    setReviewMutationError(null);
    setReviewSuccess(null);
    setDeletingReviewId(null);
    setHighlightedAttemptId(null);
    setSelectedAttempt(null);
  }, [detailRecord?.id]);

  useEffect(() => {
    setSelectedSupportInsight(null);
    setSupportSourceDialogOpen(false);
    setShowUnknownNetworksOnly(false);
    setShowLimitedPaymentMethodsOnly(false);
  }, [detailRecord?.id]);

  useEffect(() => {
    if (!highlightedAttemptId) return;
    const timeoutId = window.setTimeout(() => {
      setHighlightedAttemptId(null);
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [highlightedAttemptId]);

  useEffect(() => {
    setDeleteDialogOpen(false);
    setDeleteSaving(false);
    setDeleteMutationError(null);
  }, [detailRecord?.id]);

  useEffect(() => {
    setStaffProficiencySaving(false);
    setStaffProficiencySavingLevel(null);
    setStaffProficiencyError(null);
  }, [detailRecord?.id]);

  useEffect(() => {
    if (!successRateDialogOpen) return;
    setDraftSuccessRateFilter(successRateFilter);
  }, [successRateDialogOpen, successRateFilter]);

  useEffect(() => {
    if (!detailRecord || detailRecord.source !== "pos_machines") {
      return;
    }

    if (recordedHistoryLocationIdRef.current === detailRecord.id) {
      return;
    }

    recordedHistoryLocationIdRef.current = detailRecord.id;

    void browsingHistoryService.recordVisit(detailRecord.id).catch((historyError) => {
      console.error("Failed to record browsing history.", historyError);
    });
  }, [detailRecord]);

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

  const handleAttemptFieldChange = <K extends keyof AttemptDraft>(key: K, value: AttemptDraft[K]): void => {
    setAttemptDraft((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNuccFeedbackToggle = (checked: boolean) => {
    setNuccFeedbackOptIn(checked);
    setNuccBridgeError(null);
    setNuccCaptchaResponse("");
    setNuccPrivacyAccepted(false);

    if (!checked) {
      setNuccBridgeSession(null);
      setNuccContactInfo("");
      setNuccCardBin("");
      setNuccTimeWindow("");
      return;
    }

    void initializeNuccBridgeSession();
  };

  const handleAddAttempt = async (): Promise<void> => {
    if (!detailRecord) {
      setAttemptMutationError("Unable to load the current location.");
      return;
    }

    if (shouldSubmitToNucc) {
      if (nuccBridgeLoading) {
        setAttemptMutationError("Mastercard NUCC verification is still loading. Please wait a moment and try again.");
        return;
      }

      if (!nuccBridgeSession) {
        setAttemptMutationError("Unable to load the Mastercard NUCC captcha. Please retry the verification step.");
        return;
      }

      if (!nuccCaptchaResponse.trim()) {
        setAttemptMutationError("Please enter the Mastercard NUCC captcha before submitting.");
        return;
      }

      if (!nuccPrivacyAccepted) {
        setAttemptMutationError("Please accept the Mastercard NUCC privacy policy before submitting.");
        return;
      }

      if (nuccCardBin.trim() && !/^\d{6}$/.test(nuccCardBin.trim())) {
        setAttemptMutationError("Please enter exactly 6 digits for the Mastercard NUCC card BIN, or leave it blank.");
        return;
      }
    }

    setAttemptSaving(true);
    setAttemptMutationError(null);
    let nuccSubmitted = false;

    try {
      if (shouldSubmitToNucc) {
        await submitMastercardNuccFeedback({
          sessionToken: nuccBridgeSession!.sessionToken,
          phone: nuccContactInfo.trim(),
          businessName: detailRecord.name,
          merchantCity: detailRecord.city,
          businessAddress: detailRecord.address,
          date: buildAttemptDateValue(attemptDraft),
          time: nuccTimeWindow,
          cardNumber: nuccCardBin.trim(),
          problemDescription: buildMastercardNuccProblemDescription(detailRecord, attemptDraft),
          captchaResponse: nuccCaptchaResponse.trim(),
          privacyAccepted: nuccPrivacyAccepted
        });
        nuccSubmitted = true;
      }

      await locationService.createLocationAttempt(detailRecord, {
        cardName: attemptDraft.cardName,
        transactionStatus: attemptDraft.transactionStatus,
        network: attemptDraft.network,
        paymentMethod: attemptDraft.paymentMethod,
        cvm: attemptDraft.cvm,
        acquiringMode: attemptDraft.acquiringMode,
        deviceStatus: attemptDraft.deviceStatus,
        acquirer: attemptDraft.acquirer,
        checkoutLocation: attemptDraft.checkoutLocation,
        notes: attemptDraft.notes,
        attemptedAt: buildAttemptedAtFromDraft(attemptDraft),
        isConclusiveFailure: attemptDraft.transactionStatus === "Fault"
      });

      await refreshDetail();
      setAttemptPage(1);
      setAttemptDialogOpen(false);
      setAttemptDraft(createAttemptDraft(detailRecord));
      resetNuccFeedbackState();
      setAttemptNotice(
        shouldSubmitToNucc
          ? {
              kind: "success",
              message: "The attempt was saved in Fluxa Map and submitted to Mastercard NUCC successfully."
            }
          : null
      );
    } catch (attemptError) {
      if (attemptError instanceof MastercardNuccBridgeError) {
        setAttemptMutationError(attemptError.message);
        if (attemptError.session) {
          setNuccBridgeSession(attemptError.session);
        }
        setNuccCaptchaResponse("");
        return;
      }

      if (nuccSubmitted) {
        setAttemptDialogOpen(false);
        resetNuccFeedbackState();
        setAttemptNotice({
          kind: "error",
          message:
            "Mastercard NUCC received the feedback, but Fluxa Map could not save this attempt locally. Please refresh the page before retrying."
        });
        return;
      }

      setAttemptMutationError(formatAttemptMutationError(attemptError));
    } finally {
      setAttemptSaving(false);
    }
  };

  const handleAddReview = async (): Promise<void> => {
    if (!detailRecord) {
      setReviewMutationError("Unable to load the current location.");
      return;
    }

    const content = reviewDraft.content.trim();
    if (!content) {
      setReviewMutationError("Please enter a review or comment before submitting.");
      return;
    }

    const rating = reviewDraft.mode === "review" ? reviewDraft.rating : null;
    if (reviewDraft.mode === "review" && typeof rating !== "number") {
      setReviewMutationError("Please select a rating before submitting.");
      return;
    }

    setReviewSaving(true);
    setReviewMutationError(null);

    try {
      const successState = createReviewSuccessState(reviewDraft);
      const payload: CreateLocationReviewInput = {
        content,
        rating
      };

      await locationService.createLocationReview(detailRecord, payload);
      await refreshDetail();
      setReviewSuccess(successState);
    } catch (reviewError) {
      setReviewMutationError(formatReviewMutationError(reviewError));
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDeleteReview = async (review: LocationReviewRecord): Promise<void> => {
    const mutationService = locationService as unknown as ReviewMutationLocationService;
    const mutation = mutationService.deleteLocationReview;

    if (!mutation) {
      setReviewMutationError("Review deletion is not available yet.");
      return;
    }

    setDeletingReviewId(review.id);
    setReviewMutationError(null);

    try {
      await mutation(review);
      await refreshDetail();
    } catch (deleteError) {
      setReviewMutationError(formatReviewDeleteMutationError(deleteError));
    } finally {
      setDeletingReviewId(null);
    }
  };

  const canDeleteReview = (review: LocationReviewRecord): boolean => {
    if (!viewerId) {
      return false;
    }

    return isAdmin || Boolean(review.userId && review.userId === viewerId);
  };

  const handleDelete = async (): Promise<void> => {
    if (!detailRecord || !onDeleteLocation) {
      setDeleteMutationError("Unable to load the current location.");
      return;
    }

    setDeleteSaving(true);
    setDeleteMutationError(null);

    try {
      await onDeleteLocation(detailRecord);
      setDeleteDialogOpen(false);
    } catch (deleteError) {
      setDeleteMutationError(formatDeleteMutationError(deleteError));
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleSaveStaffProficiency = async (nextLevel: StaffProficiencyLevel | null): Promise<void> => {
    if (!detailRecord) {
      setStaffProficiencyError("Unable to load the current location.");
      return;
    }

    const previousLevel = getStaffProficiencyLevel(detailRecord);
    const previousUpdatedAt = getStaffProficiencyUpdatedAt(detailRecord);
    const mutationService = locationService as unknown as StaffProficiencyMutationLocationService;
    const mutation =
      mutationService.updateLocationStaffProficiency ||
      mutationService.updateStaffProficiency;

    if (!mutation) {
      setStaffProficiencyError("Staff proficiency updates are not available yet.");
      return;
    }

    setStaffProficiencySaving(true);
    setStaffProficiencySavingLevel(nextLevel);
    setStaffProficiencyError(null);
    setStaffProficiencyLevel(nextLevel);
    setStaffProficiencyUpdatedAt(new Date().toISOString());

    try {
      await mutation(detailRecord, nextLevel);
      await refreshDetail();
    } catch (proficiencyError) {
      setStaffProficiencyLevel(previousLevel);
      setStaffProficiencyUpdatedAt(previousUpdatedAt);
      setStaffProficiencyError(formatStaffProficiencyMutationError(proficiencyError));
    } finally {
      setStaffProficiencySaving(false);
      setStaffProficiencySavingLevel(null);
    }
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
          {onDeleteLocation && isAdmin && !viewerAccessLoading ? (
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.88)] px-4 text-sm font-medium leading-[1.4286] text-[#991b1b] transition-colors duration-200 hover:bg-[rgba(254,226,226,0.96)]"
              onClick={() => {
                setDeleteMutationError(null);
                setDeleteDialogOpen(true);
              }}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t("Delete Location")}</span>
            </button>
          ) : null}
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--secondary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--secondary-foreground)] transition-colors duration-200 hover:bg-[var(--secondary-hover)]"
            onClick={() => setEditable((prev) => !prev)}
            type="button"
          >
            <Edit2 className="h-4 w-4" />
            <span>{editable ? t("Save Details") : t("Edit Details")}</span>
          </button>
          <button
            className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
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
          proficiencyError={staffProficiencyError}
          proficiencyLevel={staffProficiencyLevel}
          proficiencySaving={staffProficiencySaving}
          proficiencySavingLevel={staffProficiencySavingLevel}
          proficiencyUpdatedAt={staffProficiencyUpdatedAt}
          draftSuccessRateFilter={draftSuccessRateFilter}
          onApplySuccessRateFilter={handleApplySuccessRateFilter}
          onClearProficiencyLevel={() => {
            void handleSaveStaffProficiency(null);
          }}
          onSelectProficiencyLevel={(level) => {
            void handleSaveStaffProficiency(level);
          }}
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
          onOpenSupportInsight={(insight) => {
            setSelectedSupportInsight(insight);
            setSupportSourceDialogOpen(true);
          }}
          onToggleLimitedPaymentMethods={() => setShowLimitedPaymentMethodsOnly((prev) => !prev)}
          onToggleUnknownNetworks={() => setShowUnknownNetworksOnly((prev) => !prev)}
          successRateDialogOpen={successRateDialogOpen}
          successRateFilter={successRateFilter}
          successRateFilterError={successRateFilterError}
          successRateSummary={successRateSummary}
          showLimitedPaymentMethodsOnly={showLimitedPaymentMethodsOnly}
          showUnknownNetworksOnly={showUnknownNetworksOnly}
        />
      ) : null}
      {activeTab === "attempt" ? (
        <AttemptContent
          addingAttempt={attemptSaving}
          attemptPage={attemptPage}
          attemptNotice={attemptNotice}
          attemptRows={detailRecord.attempts}
          canAddAttempt
          focusedAttemptId={highlightedAttemptId}
          isShellLocation={detailRecord.source === "fluxa_locations"}
          onAddAttempt={() => {
            setAttemptDraft(createAttemptDraft(detailRecord));
            setAttemptMutationError(null);
            setAttemptNotice(null);
            resetNuccFeedbackState();
            setAttemptDialogOpen(true);
          }}
          onOpenAttemptDetail={(attempt) => {
            setSelectedAttempt(attempt);
            setAttemptDetailDialogOpen(true);
          }}
          onPageChange={setAttemptPage}
        />
      ) : null}
      {activeTab === "reviews" ? (
        <ReviewsContent
          addingReview={reviewSaving}
          canDeleteReview={canDeleteReview}
          deletingReviewId={deletingReviewId}
          onAddReview={() => {
            setReviewMutationError(null);
            setReviewDraft(createReviewDraft());
            setReviewDialogOpen(true);
          }}
          onDeleteReview={(review) => {
            void handleDeleteReview(review);
          }}
          reviewItems={detailRecord.reviews}
        />
      ) : null}

      <AttemptDetailDialog
        attempt={selectedAttempt}
        onOpenChange={(open) => {
          setAttemptDetailDialogOpen(open);
          if (!open) {
            setSelectedAttempt(null);
          }
        }}
        open={attemptDetailDialogOpen}
      />

      <SupportSourceDialog
        insight={selectedSupportInsight}
        onJumpToAttempt={(attemptId) => {
          const targetIndex = detailRecord.attempts.findIndex((attempt) => attempt.id === attemptId);
          if (targetIndex >= 0) {
            setAttemptPage(Math.floor(targetIndex / 5) + 1);
            setHighlightedAttemptId(attemptId);
          }
          setActiveTab("attempt");
          setSupportSourceDialogOpen(false);
          setSelectedSupportInsight(null);
        }}
        onOpenChange={(open) => {
          setSupportSourceDialogOpen(open);
          if (!open) {
            setSelectedSupportInsight(null);
          }
        }}
        open={supportSourceDialogOpen}
      />

      <ReviewComposerDialog
        draft={reviewDraft}
        error={reviewMutationError}
        locationName={detailRecord.name}
        onAddAnother={() => {
          setReviewSuccess(null);
          setReviewMutationError(null);
          setReviewDraft(createReviewDraft());
        }}
        onContentChange={(value) =>
          setReviewDraft((prev) => ({
            ...prev,
            content: value
          }))
        }
        onModeChange={(mode) =>
          setReviewDraft((prev) => ({
            ...prev,
            mode,
            rating: mode === "review" ? prev.rating || 5 : null
          }))
        }
        onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open) {
            setReviewMutationError(null);
            setReviewSuccess(null);
            setReviewDraft(createReviewDraft());
          }
        }}
        onRatingChange={(value) =>
          setReviewDraft((prev) => ({
            ...prev,
            rating: value
          }))
        }
        onSubmit={() => {
          void handleAddReview();
        }}
        open={reviewDialogOpen}
        saving={reviewSaving}
        success={reviewSuccess}
      />

      <Dialog
        onOpenChange={(open) => {
          setAttemptDialogOpen(open);
          if (!open) {
            setAttemptMutationError(null);
            setAttemptDraft(createAttemptDraft(detailRecord));
            resetNuccFeedbackState();
          }
        }}
        open={attemptDialogOpen}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[min(1080px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden rounded-[32px] p-0">
          <DialogHeader className="shrink-0 border-b border-[var(--input)] px-6 py-5 sm:px-8">
            <DialogTitle>{t("Add Attempt Record")}</DialogTitle>
            <DialogDescription>
              {t("Use the same transaction fields as Add Location, but submit this attempt as a modal without leaving the detail page.")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-5">
                <AttemptDialogCard title="1. Transaction Status">
                  <div className="flex flex-wrap gap-3">
                    <AttemptDialogChip active={attemptDraft.transactionStatus === "Success"} icon={CircleCheck} label="Success" onClick={() => handleAttemptFieldChange("transactionStatus", "Success")} />
                    <AttemptDialogChip active={attemptDraft.transactionStatus === "Fault"} icon={CircleX} label="Fault" onClick={() => handleAttemptFieldChange("transactionStatus", "Fault")} />
                    <AttemptDialogChip active={attemptDraft.transactionStatus === "Unknown"} icon={Radio} label="Unknown" onClick={() => handleAttemptFieldChange("transactionStatus", "Unknown")} />
                  </div>
                </AttemptDialogCard>

                <AttemptDialogCard title="2. Card Info">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr]">
                    <AttemptDialogField
                      isSelect
                      label="Card Network"
                      onChange={(value) => handleAttemptFieldChange("network", value)}
                      options={ATTEMPT_NETWORK_OPTIONS}
                      placeholder="Visa"
                      value={attemptDraft.network}
                    />
                    <AttemptDialogField
                      label="Card Info"
                      onChange={(value) => handleAttemptFieldChange("cardName", value)}
                      placeholder="e.g. Visa Signature"
                      value={attemptDraft.cardName}
                    />
                  </div>
                </AttemptDialogCard>

                <AttemptDialogCard title="3. CVM Validation">
                  <div className="flex flex-wrap gap-3">
                    <AttemptDialogChip active={attemptDraft.cvm === "No CVM"} icon={MinusCircle} label="No CVM" onClick={() => handleAttemptFieldChange("cvm", "No CVM")} />
                    <AttemptDialogChip active={attemptDraft.cvm === "PIN"} icon={Hash} label="PIN" onClick={() => handleAttemptFieldChange("cvm", "PIN")} />
                    <AttemptDialogChip active={attemptDraft.cvm === "Signature"} icon={PenTool} label="Signature" onClick={() => handleAttemptFieldChange("cvm", "Signature")} />
                  </div>
                </AttemptDialogCard>

                <AttemptDialogCard title="4. Transaction Time">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <AttemptDialogField isSelect label="Year" onChange={(value) => handleAttemptFieldChange("attemptYear", value)} options={ATTEMPT_YEAR_OPTIONS} placeholder="2026" value={attemptDraft.attemptYear} />
                    <AttemptDialogField isSelect label="Month" onChange={(value) => handleAttemptFieldChange("attemptMonth", value)} options={ATTEMPT_MONTH_OPTIONS} placeholder="02" value={attemptDraft.attemptMonth} />
                    <AttemptDialogField isSelect label="Day" onChange={(value) => handleAttemptFieldChange("attemptDay", value)} options={ATTEMPT_DAY_OPTIONS} placeholder="22" value={attemptDraft.attemptDay} />
                  </div>
                </AttemptDialogCard>
              </div>

              <div className="flex min-w-0 flex-col gap-5">
                <AttemptDialogCard title={acquirerDeviceCardTitle}>
                  <div className="flex flex-wrap gap-3">
                    <AttemptDialogChip active={attemptDraft.acquiringMode === "EDC"} icon={Building2} label="EDC" onClick={() => handleAttemptFieldChange("acquiringMode", "EDC")} />
                    <AttemptDialogChip active={attemptDraft.acquiringMode === "DCC"} icon={Globe} label="DCC" onClick={() => handleAttemptFieldChange("acquiringMode", "DCC")} />
                    <AttemptDialogChip active={attemptDraft.acquiringMode === "Unknown"} icon={HelpCircle} label="Unknown" onClick={() => handleAttemptFieldChange("acquiringMode", "Unknown")} />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <AttemptDialogChip active={attemptDraft.deviceStatus === "active"} icon={PlayCircle} label="Active" onClick={() => handleAttemptFieldChange("deviceStatus", "active")} />
                    <AttemptDialogChip active={attemptDraft.deviceStatus === "inactive"} icon={StopCircle} label="Inactive" onClick={() => handleAttemptFieldChange("deviceStatus", "inactive")} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <AttemptDialogField
                      isSelect
                      label="Acquirer"
                      onChange={(value) => handleAttemptFieldChange("acquirer", value)}
                      options={ATTEMPT_ACQUIRER_OPTIONS}
                      placeholder="Select Acquirer"
                      value={attemptDraft.acquirer}
                    />
                    <AttemptDialogField
                      isSelect
                      label="Checkout Location"
                      onChange={(value) => handleAttemptFieldChange("checkoutLocation", value as AttemptDraft["checkoutLocation"])}
                      options={["Staffed Checkout", "Self-checkout"]}
                      placeholder="Select Checkout"
                      value={attemptDraft.checkoutLocation}
                    />
                  </div>

                  <AttemptDialogField
                    label="Notes / Internal Comments"
                    multiline
                    onChange={(value) => handleAttemptFieldChange("notes", value)}
                    placeholder="Enter any additional information for this attempt..."
                    value={attemptDraft.notes}
                  />
                </AttemptDialogCard>

                <AttemptDialogCard title={paymentMethodCardTitle}>
                  <div className="flex flex-wrap gap-3">
                    <AttemptDialogChip active={attemptDraft.paymentMethod === "Apple Pay"} icon={Smartphone} label="Apple Pay" onClick={() => handleAttemptFieldChange("paymentMethod", "Apple Pay")} />
                    <AttemptDialogChip active={attemptDraft.paymentMethod === "Google Pay"} icon={Smartphone} label="Google Pay" onClick={() => handleAttemptFieldChange("paymentMethod", "Google Pay")} />
                    <AttemptDialogChip active={attemptDraft.paymentMethod === "Tap"} icon={Wifi} label="Tap" onClick={() => handleAttemptFieldChange("paymentMethod", "Tap")} />
                    <AttemptDialogChip active={attemptDraft.paymentMethod === "Insert"} icon={CreditCard} label="Insert" onClick={() => handleAttemptFieldChange("paymentMethod", "Insert")} />
                    <AttemptDialogChip active={attemptDraft.paymentMethod === "Swipe"} icon={CreditCard} label="Swipe" onClick={() => handleAttemptFieldChange("paymentMethod", "Swipe")} />
                    <AttemptDialogChip active={attemptDraft.paymentMethod === "HCE"} icon={Nfc} label="HCE" onClick={() => handleAttemptFieldChange("paymentMethod", "HCE")} />
                  </div>
                </AttemptDialogCard>
              </div>
            </div>

            {nuccFeedbackEligible ? (
              <div className="mt-5">
                <AttemptDialogCard title={feedbackCardTitle}>
                  <label className="flex items-start gap-3 rounded-m border border-[rgba(209,154,41,0.22)] bg-[rgba(255,248,229,0.72)] px-4 py-4">
                    <input
                      checked={nuccFeedbackOptIn && !MASTERCARD_CN_WANSHENG_PREVIEW_ONLY}
                      className="mt-1 h-4 w-4 rounded border border-[var(--input)] disabled:cursor-not-allowed disabled:opacity-100"
                      disabled={MASTERCARD_CN_WANSHENG_PREVIEW_ONLY}
                      onChange={(event) => handleNuccFeedbackToggle(event.target.checked)}
                      type="checkbox"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold leading-[1.5] text-[var(--foreground)]">{t("Send this failed MasterCard CN attempt to Mastercard NUCC")}</p>
                        <span className="inline-flex items-center rounded-pill border border-[rgba(148,163,184,0.28)] bg-[rgba(255,255,255,0.9)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">
                          {t("Coming Soon")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                        {t("Fluxa will fetch the official captcha, collect any optional follow-up details, and submit this failed attempt directly to the Mastercard NUCC contact form.")}
                      </p>
                    </div>
                  </label>

                  {MASTERCARD_CN_WANSHENG_PREVIEW_ONLY ? (
                    <div className="rounded-m border border-dashed border-[rgba(148,163,184,0.28)] bg-[rgba(255,255,255,0.88)] px-4 py-3 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                      {t("Preview only: this entry is currently disabled and will not send any real data.")}
                    </div>
                  ) : null}

                  {nuccFeedbackOptIn ? (
                    <div className="rounded-m border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <AttemptDialogField
                          label="Follow-up Phone / Email (optional)"
                          onChange={setNuccContactInfo}
                          placeholder="Leave a phone number or email for NUCC follow-up"
                          value={nuccContactInfo}
                        />
                        <AttemptDialogField
                          label="Card BIN / First 6 Digits (optional)"
                          onChange={(value) => setNuccCardBin(value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="540988"
                          value={nuccCardBin}
                        />
                        <AttemptDialogField
                          isSelect
                          label="Card Usage Time (optional)"
                          onChange={setNuccTimeWindow}
                          options={MASTERCARD_NUCC_TIME_OPTIONS}
                          placeholder="Select the closest time window"
                          value={nuccTimeWindow}
                        />
                      </div>

                      <p className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                        {t("Use the closest official time window if you know when the failure happened.")}
                      </p>

                      {nuccBridgeError ? (
                        <div className="mt-4 rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm leading-[1.6] text-[#7A1F0E]">
                          <p>{nuccBridgeError}</p>
                          {!nuccBridgeLoading ? (
                            <button
                              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-pill border border-[#F5B8AA] px-4 text-sm font-medium text-[#7A1F0E] transition-colors duration-200 hover:bg-[#FFE9E4]"
                              onClick={() => {
                                void initializeNuccBridgeSession();
                              }}
                              type="button"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>{t("Retry Loading Captcha")}</span>
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex min-h-[84px] w-full items-center justify-center rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--accent)] px-4 py-3 md:w-[220px]">
                          {nuccBridgeSession ? (
                            <img
                              alt={t("Mastercard NUCC captcha")}
                              className="h-[60px] w-[144px] rounded-[14px] object-cover"
                              src={nuccBridgeSession.captchaImageDataUrl}
                            />
                          ) : (
                            <span className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                              {nuccBridgeLoading ? t("Loading Mastercard NUCC captcha...") : t("Captcha will appear here after the bridge session is ready.")}
                            </span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!nuccBridgeSession || nuccBridgeLoading}
                              onClick={() => {
                                void refreshNuccCaptcha();
                              }}
                              type="button"
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span>{t("Refresh Captcha")}</span>
                            </button>
                            <p className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                              {t("The official image captcha must be completed by the user before Fluxa can submit to Mastercard NUCC.")}
                            </p>
                          </div>

                          <div className="mt-4">
                            <AttemptDialogField
                              label="Captcha"
                              onChange={setNuccCaptchaResponse}
                              placeholder="Enter the image captcha"
                              value={nuccCaptchaResponse}
                            />
                          </div>

                          <label className="mt-4 flex items-start gap-3 rounded-m border border-[var(--border)] bg-white px-4 py-3">
                            <input
                              checked={nuccPrivacyAccepted}
                              className="mt-1 h-4 w-4 rounded border border-[var(--input)]"
                              onChange={(event) => setNuccPrivacyAccepted(event.target.checked)}
                              type="checkbox"
                            />
                            <div className="min-w-0">
                              <span className="text-sm leading-[1.6] text-[var(--foreground)]">
                                {t("I have read and accept the Mastercard NUCC privacy policy.")}
                              </span>
                              <div className="mt-1">
                                <a
                                  className="text-sm leading-[1.6] text-[var(--primary)] underline underline-offset-2"
                                  href={nuccPrivacyPolicyUrl}
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {t("Open the official Mastercard NUCC privacy policy")}
                                </a>
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </AttemptDialogCard>
              </div>
            ) : null}

            {attemptMutationError ? (
              <div className="mt-5 rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm text-[#7A1F0E]">{attemptMutationError}</div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-[var(--input)] bg-white px-6 py-4 sm:px-8">
            <button
              className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              disabled={attemptSaving}
              onClick={() => setAttemptDialogOpen(false)}
              type="button"
            >
              {t("Cancel")}
            </button>
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)]"
              disabled={attemptSaving || (shouldSubmitToNucc && nuccBridgeLoading)}
              onClick={() => {
                void handleAddAttempt();
              }}
              type="button"
            >
              <Plus className="h-4 w-4" />
              <span>
                {attemptSaving
                  ? t("Saving...")
                  : shouldSubmitToNucc
                    ? t("Add Attempt & Submit to Mastercard NUCC")
                    : t("Add Attempt")}
              </span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setDeleteMutationError(null);
          }
        }}
        open={deleteDialogOpen}
      >
        <DialogContent className="max-w-[520px] rounded-[32px] p-0">
          <DialogHeader className="border-b border-[var(--input)] px-6 py-5 sm:px-8">
            <DialogTitle>{t("Delete Location")}</DialogTitle>
            <DialogDescription>
              {t("This action will permanently remove this location and all related attempts, reviews, and browsing history.")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 sm:px-8">
            <div className="rounded-[20px] border border-[rgba(220,38,38,0.14)] bg-[rgba(254,242,242,0.72)] px-4 py-4 text-sm leading-[1.6] text-[#7f1d1d]">
              {t("Deleted locations cannot be restored from the detail page.")}
            </div>
            {deleteMutationError ? (
              <div className="mt-4 rounded-[18px] border border-[#FFD9D0] bg-[#FFF4F1] px-4 py-3 text-sm text-[#7A1F0E]">{deleteMutationError}</div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-[var(--input)] px-6 py-4 sm:px-8">
            <button
              className="inline-flex h-10 items-center rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
              disabled={deleteSaving}
              onClick={() => setDeleteDialogOpen(false)}
              type="button"
            >
              {t("Cancel")}
            </button>
            <button
              className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-[#DC2626] px-4 text-sm font-medium leading-[1.4286] text-white transition-colors duration-200 hover:bg-[#B91C1C]"
              disabled={deleteSaving}
              onClick={() => {
                void handleDelete();
              }}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              <span>{deleteSaving ? t("Deleting...") : t("Delete")}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
