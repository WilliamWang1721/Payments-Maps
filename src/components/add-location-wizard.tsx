import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Building2,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Globe,
  Hash,
  HelpCircle,
  LoaderCircle,
  MinusCircle,
  Nfc,
  PenTool,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
  Wifi,
  Sparkles,
  XCircle
} from "lucide-react";

import {
  AddLocationSmartAddDialog
} from "@/components/add-location-smart-add-dialog";
import {
  AddLocationMapPicker,
  type MerchantInferenceState,
  type TraceBannerEvent
} from "@/components/add-location-map-picker";
import { useI18n } from "@/i18n";
import {
  STAFF_PROFICIENCY_OPTIONS,
} from "@/lib/staff-proficiency";
import type { MapThemeKey } from "@/lib/map-theme";
import { inferBrandMatch } from "@/services/ai-service";
import type {
  AMapPlaceSearchResult,
  AddLocationAssistantDraft,
  AddLocationAssistantPatch
} from "@/types/add-location-assistant";
import type {
  CreateLocationInput,
  LocationBusinessHours,
  LocationSpecialDateHours
} from "@/types/location";

type WizardStep = 1 | 2 | 3;

interface AddLocationWizardProps {
  autoReadMerchantNameEnabled: boolean;
  onCancel: () => void;
  onComplete: (input: CreateLocationInput) => Promise<void>;
  saving?: boolean;
  brandOptions?: string[];
  mapTheme: MapThemeKey;
  smartAddEnabled: boolean;
}

type DraftState = AddLocationAssistantDraft;

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  isSelect?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  multiline?: boolean;
  options?: string[];
}

interface InlineBannerState {
  detail?: string;
  status: "info" | "running" | "success" | "error";
  title: string;
}

const STEP_SUBTITLE: Record<WizardStep, string> = {
  1: "第 1 / 3 步：基础信息与地址",
  2: "第 2 / 3 步：交易信息与联系方式",
  3: "第 3 / 3 步：POS 设置与补充说明"
};

const DEFAULT_BRAND_OPTIONS = ["McDonald's", "Starbucks", "KFC", "Subway", "UNIQLO"];
const NETWORK_OPTIONS = ["Visa", "MasterCard", "UnionPay", "American Express", "Discover", "JCB"];
const YEAR_OPTIONS = ["2024", "2025", "2026", "2027", "2028"];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const ACQUIRER_OPTIONS = ["Lakala", "Global Payments", "Fiserv", "Adyen", "Stripe"];
const POS_MODEL_OPTIONS = ["Ingenico Move 5000", "Verifone V200c", "PAX A920", "Sunmi P2"];

function CardFrame({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  const { t } = useI18n();

  return (
    <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-5">
      <h3 className="text-lg font-semibold leading-[1.2] text-[var(--foreground)]">{t(title)}</h3>
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </article>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  isSelect = false,
  loading = false,
  loadingLabel,
  multiline = false,
  options = []
}: FieldProps): React.JSX.Element {
  const { t } = useI18n();
  const hasValue = value.trim().length > 0;
  const displayValue = hasValue ? t(value) : t(placeholder);

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">{t(label)}</p>
      <div
        className={`border border-[var(--border)] bg-[var(--accent)] px-6 text-sm ${
          multiline ? "rounded-m py-3" : isSelect ? "relative min-h-[60px] rounded-pill py-0" : "flex items-center gap-2 rounded-pill py-4"
        }`}
      >
        {isSelect ? (
          <>
            <select
              className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-pill bg-transparent px-6 pr-12 opacity-0 outline-none"
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
            <div className="pointer-events-none flex min-h-[58px] items-center justify-between gap-3 pr-1">
              <span className={`block truncate text-sm leading-[1.35] ${hasValue ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>{displayValue}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            </div>
          </>
        ) : multiline ? (
          <textarea
            className="w-full resize-none bg-transparent text-sm leading-[1.35] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            onChange={(event) => onChange(event.target.value)}
            placeholder={t(placeholder)}
            rows={3}
            value={value}
          />
        ) : loading && !hasValue ? (
          <div className="relative flex h-6 w-full items-center overflow-hidden">
            <span className="merchant-input-shimmer text-sm leading-[1.35]">{t(loadingLabel || placeholder)}</span>
          </div>
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

function FloatingBanner({
  banner,
  icon
}: {
  banner: InlineBannerState;
  icon: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      className={`ui-banner-enter pointer-events-none flex min-h-[68px] max-w-[min(92vw,600px)] items-center gap-3 rounded-pill border px-5 py-3.5 shadow-[0_22px_50px_-32px_rgba(15,23,42,0.45)] backdrop-blur-xl ${
        banner.status === "success"
          ? "border-[rgba(16,185,129,0.28)] bg-[rgba(240,253,244,0.94)] text-[#166534]"
          : banner.status === "error"
            ? "border-[rgba(239,68,68,0.2)] bg-[rgba(254,242,242,0.96)] text-[#b42318]"
            : banner.status === "running"
              ? "border-[rgba(87,73,244,0.18)] bg-[rgba(255,255,255,0.92)] text-[var(--foreground)]"
              : "border-[rgba(148,163,184,0.18)] bg-[rgba(255,255,255,0.92)] text-[var(--foreground)]"
      }`}
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-[1.2]">{banner.title}</p>
        {banner.detail ? <p className="mt-0.5 text-[12px] leading-[1.35] opacity-80">{banner.detail}</p> : null}
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  label,
  active = false,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <button
      aria-pressed={active}
      className={`ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill px-4 text-sm font-medium leading-[1.4286] transition-colors duration-200 ${
        active
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73]"
          : "border border-[var(--input)] bg-white text-[var(--foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      <span>{t(label)}</span>
    </button>
  );
}

interface SliderChoiceOption {
  label: string;
  value: string;
}

function SliderChoice({
  value,
  options,
  onChange
}: {
  value: string;
  options: SliderChoiceOption[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--accent)] accent-[var(--primary)]"
        max={Math.max(0, options.length - 1)}
        min={0}
        onChange={(event) => {
          const nextIndex = Number(event.target.value);
          onChange(options[nextIndex]?.value || options[0]?.value || "");
        }}
        step={1}
        type="range"
        value={activeIndex}
      />
      <div className="grid gap-2 text-xs" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            className={`rounded-[16px] border px-3 py-2 text-center transition-colors duration-200 ${
              option.value === value
                ? "border-[rgba(87,73,244,0.28)] bg-[rgba(87,73,244,0.08)] text-[var(--foreground)]"
                : "border-[var(--border)] bg-white text-[var(--muted-foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildLocationBusinessHours(draft: DraftState): LocationBusinessHours | undefined {
  const weekday = draft.weekdayBusinessHours.trim();
  const weekend = draft.weekendBusinessHours.trim();
  const specialDates = draft.specialDateHours
    .map((entry) => ({
      date: entry.date.trim(),
      hours: entry.hours.trim()
    }))
    .filter((entry) => entry.date && entry.hours);

  if (!weekday && !weekend && specialDates.length === 0) {
    return undefined;
  }

  return {
    ...(weekday ? { weekday } : {}),
    ...(weekend ? { weekend } : {}),
    ...(specialDates.length > 0 ? { specialDates } : {})
  };
}

function SpecialDateHoursEditor({
  value,
  onChange
}: {
  value: LocationSpecialDateHours[];
  onChange: (value: LocationSpecialDateHours[]) => void;
}): React.JSX.Element {
  const { t } = useI18n();

  const handleEntryChange = (index: number, key: keyof LocationSpecialDateHours, nextValue: string) => {
    onChange(
      value.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [key]: nextValue
            }
          : entry
      )
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {value.map((entry, index) => (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]" key={`${entry.date}-${index}`}>
          <input
            className="h-12 rounded-m border border-[var(--border)] bg-[var(--accent)] px-4 text-sm text-[var(--foreground)] outline-none"
            onChange={(event) => handleEntryChange(index, "date", event.target.value)}
            type="date"
            value={entry.date}
          />
          <input
            className="h-12 rounded-m border border-[var(--border)] bg-[var(--accent)] px-4 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            onChange={(event) => handleEntryChange(index, "hours", event.target.value)}
            placeholder={t("e.g. 10:00 - 18:00 / Closed")}
            type="text"
            value={entry.hours}
          />
          <button
            className="ui-hover-shadow inline-flex h-12 items-center justify-center rounded-m border border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.88)] px-4 text-sm font-medium text-[#991b1b] transition-colors duration-200 hover:bg-[rgba(254,226,226,0.96)]"
            onClick={() => onChange(value.filter((_, entryIndex) => entryIndex !== index))}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        className="ui-hover-shadow inline-flex h-10 items-center justify-center gap-2 self-start rounded-pill border border-[var(--input)] bg-white px-4 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
        onClick={() => onChange([...value, { date: "", hours: "" }])}
        type="button"
      >
        <Plus className="h-4 w-4" />
        <span>{t("Add Special Date")}</span>
      </button>
    </div>
  );
}

function buildSubmissionNotes(draft: DraftState): string {
  const fragments = [
    `网络：${draft.network || "未知"}`,
    `方式：${draft.paymentMethod || "未知"}`,
    `CVM：${draft.cvm || "未知"}`,
    `收单模式：${draft.acquiringMode || "未知"}`,
    `收单机构：${draft.acquirer || "未知"}`,
    `POS 型号：${draft.posModel || "未知"}`
  ];

  if (draft.notes.trim()) {
    fragments.push(`备注：${draft.notes.trim()}`);
  }

  return fragments.join(" | ");
}

function buildAttemptedAt(draft: DraftState): string {
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

function buildCreateLocationPayload(draft: DraftState): CreateLocationInput {
  return {
    name: draft.name,
    address: draft.address,
    brand: draft.brand || draft.network,
    city: draft.city,
    status: draft.status,
    lat: draft.lat,
    lng: draft.lng,
    contactInfo: draft.contactInfo.trim() || undefined,
    businessHours: buildLocationBusinessHours(draft),
    staffProficiencyLevel: draft.staffProficiencyLevel,
    notes: buildSubmissionNotes(draft),
    transactionStatus: draft.transactionStatus,
    network: draft.network,
    paymentMethod: draft.paymentMethod,
    cvm: draft.cvm,
    acquiringMode: draft.acquiringMode,
    acquirer: draft.acquirer,
    posModel: draft.posModel,
    checkoutLocation: draft.checkoutLocation,
    attemptedAt: buildAttemptedAt(draft)
  };
}

function StepOneContent({
  draft,
  brandOptions,
  onFieldChange,
  onLocationChange,
  mapTheme,
  autoReadMerchantNameEnabled,
  autoLocateOnMount,
  onAutoLocateHandled,
}: {
  draft: DraftState;
  brandOptions: string[];
  onFieldChange: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
  onLocationChange: (next: { lat: number; lng: number; address?: string; city?: string; merchantName?: string | null }) => void;
  mapTheme: MapThemeKey;
  autoReadMerchantNameEnabled: boolean;
  autoLocateOnMount: boolean;
  onAutoLocateHandled: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);
  const [merchantNameLoading, setMerchantNameLoading] = useState(false);
  const [traceBanner, setTraceBanner] = useState<InlineBannerState | null>(null);
  const [successBannerMessage, setSuccessBannerMessage] = useState<string | null>(null);
  const autoFilledBrandRef = useRef<string | null>(null);
  const currentBrandRef = useRef(draft.brand.trim());
  const brandMatchRequestIdRef = useRef(0);
  const traceTimeoutRef = useRef<number | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    currentBrandRef.current = draft.brand.trim();
  }, [draft.brand]);

  useEffect(() => {
    return () => {
      if (traceTimeoutRef.current) {
        window.clearTimeout(traceTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const hideSuccessBanner = () => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setSuccessBannerMessage(null);
  };

  const showSuccessBanner = (message: string) => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }
    setSuccessBannerMessage(message);
    successTimeoutRef.current = window.setTimeout(() => {
      setSuccessBannerMessage((current) => (current === message ? null : current));
      successTimeoutRef.current = null;
    }, 2600);
  };

  const clearAutoFilledBrandIfNeeded = () => {
    const currentBrand = currentBrandRef.current;
    const autoFilledBrand = autoFilledBrandRef.current?.trim() || "";

    if (currentBrand && autoFilledBrand && currentBrand === autoFilledBrand) {
      onFieldChange("brand", "");
    }

    autoFilledBrandRef.current = null;
  };

  const handleTraceEvent = (event: TraceBannerEvent) => {
    if (traceTimeoutRef.current) {
      window.clearTimeout(traceTimeoutRef.current);
      traceTimeoutRef.current = null;
    }

    setTraceBanner({
      status: event.status,
      title: t(event.title),
      detail: event.detail ? t(event.detail) : undefined
    });

    if (event.status === "success" || event.status === "info") {
      traceTimeoutRef.current = window.setTimeout(() => {
        setTraceBanner((current) => (current?.title === t(event.title) ? null : current));
      }, 2800);
    }
  };

  const handleMerchantInferenceStateChange = (state: MerchantInferenceState) => {
    if (state.status === "loading") {
      setMerchantNameLoading(true);
      brandMatchRequestIdRef.current += 1;
      clearAutoFilledBrandIfNeeded();
      hideSuccessBanner();
      return;
    }

    setMerchantNameLoading(false);

    if (state.status === "idle" || state.status === "disabled" || state.status === "empty" || state.status === "error") {
      brandMatchRequestIdRef.current += 1;
      clearAutoFilledBrandIfNeeded();
      return;
    }

    if (state.status === "success" && state.merchantName) {
      showSuccessBanner(t("Merchant name auto-filled"));

      const currentBrand = currentBrandRef.current;
      const autoFilledBrand = autoFilledBrandRef.current?.trim() || "";
      if (currentBrand && currentBrand !== autoFilledBrand) {
        handleTraceEvent({
          status: "info",
          title: "已保留你手动填写的品牌",
          detail: "当前品牌信息已由你确认，系统不会自动覆盖。"
        });
        return;
      }

      const requestId = brandMatchRequestIdRef.current + 1;
      brandMatchRequestIdRef.current = requestId;
      handleTraceEvent({
        status: "running",
        title: "正在匹配品牌",
        detail: "我正在根据商户名称和地址匹配更准确的品牌。"
      });

      void inferBrandMatch({
        merchantName: state.merchantName,
        formattedAddress: draft.address,
        city: draft.city,
        brandCandidates: brandOptions
      }).then(({ matchedBrand, error }) => {
        if (brandMatchRequestIdRef.current !== requestId) {
          return;
        }

        if (error) {
          handleTraceEvent({
            status: "error",
            title: "品牌匹配失败",
            detail: error
          });
          return;
        }

        if (matchedBrand) {
          autoFilledBrandRef.current = matchedBrand;
          onFieldChange("brand", matchedBrand);
          handleTraceEvent({
            status: "success",
            title: "品牌已补全",
            detail: matchedBrand
          });
          showSuccessBanner(t("Brand auto-filled"));
          return;
        }

        clearAutoFilledBrandIfNeeded();
        handleTraceEvent({
          status: "info",
          title: "暂未匹配到品牌"
        });
      });
    }
  };

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-4 pb-4 pt-18 sm:px-6 sm:pt-20 lg:px-8 xl:flex-row xl:items-stretch xl:gap-6 xl:px-12 xl:pb-6 xl:pt-12">
      <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex -translate-x-1/2 flex-col items-center gap-2 px-4 sm:top-5 xl:top-4">
        {successBannerMessage ? (
          <FloatingBanner
            banner={{ status: "success", title: successBannerMessage }}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          />
        ) : null}

        {traceBanner ? (
          <FloatingBanner
            banner={traceBanner}
            icon={
              traceBanner.status === "running" ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-[var(--primary)]" />
              ) : traceBanner.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : traceBanner.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-[#d24837]" />
              ) : (
                <Sparkles className="h-4 w-4 text-[var(--muted-foreground)]" />
              )
            }
          />
        ) : null}
      </div>

      <div className="flex w-full flex-col gap-4 xl:w-[min(430px,32vw)] xl:shrink-0">
        <CardFrame title="基础信息与地址">
          <Field
            label="商户名称"
            loading={merchantNameLoading && !draft.name.trim()}
            loadingLabel="正在自动识别商户名称..."
            onChange={(value) => onFieldChange("name", value)}
            placeholder="手动输入商户名称"
            value={draft.name}
          />
          <Field label="地址" onChange={(value) => onFieldChange("address", value)} placeholder="请在地图中选择" value={draft.address} />
          <Field label="城市" onChange={(value) => onFieldChange("city", value)} placeholder="例如：上海" value={draft.city} />
        </CardFrame>

        <CardFrame title="政策设置">
          <Field label="账单备注" onChange={(value) => onFieldChange("notes", value)} placeholder="选填，供内部识别" value={draft.notes} />
          <Field
            isSelect
            label="品牌"
            onChange={(value) => {
              autoFilledBrandRef.current = null;
              onFieldChange("brand", value);
            }}
            options={brandOptions}
            placeholder="选择品牌"
            value={draft.brand}
          />
        </CardFrame>
      </div>

      <div className="relative min-h-[340px] min-w-0 flex-1 overflow-hidden rounded-m border border-[var(--border)] bg-[var(--card)] sm:min-h-[420px] xl:min-h-0">
        <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
          <div
            className={`inline-flex h-10 items-center rounded-pill border px-4 text-sm font-medium shadow-[0_14px_32px_-26px_rgba(15,23,42,0.4)] backdrop-blur-xl ${
              hasSelectedLocation
                ? "border-[rgba(16,185,129,0.22)] bg-[rgba(240,253,244,0.94)] text-[#166534]"
                : "border-[rgba(148,163,184,0.18)] bg-[rgba(255,255,255,0.9)] text-[var(--foreground)]"
            }`}
          >
            {hasSelectedLocation ? t("Location Selected") : t("Choose Location")}
          </div>
        </div>

        <div className="absolute left-4 right-4 top-4 z-10 rounded-m border border-[var(--border)] bg-[var(--card)] p-4 sm:left-6 sm:right-auto sm:top-6 sm:max-w-[320px] sm:p-6">
          <p className="text-[13px] font-medium leading-[1.3] text-[var(--muted-foreground)]">{hasSelectedLocation ? "已选择地点" : "地图定位"}</p>
          <p className="mt-1 text-base font-semibold leading-[1.2] text-[var(--foreground)]">{draft.name || "已固定地图卡片"}</p>
          <p className="mt-1 text-[13px] leading-[1.3] text-[var(--muted-foreground)]">{draft.address || "请在地图中点选地点"}</p>
          <p className="mt-1 text-[12px] leading-[1.3] text-[var(--muted-foreground)]">
            {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
          </p>
        </div>

        <AddLocationMapPicker
          autoReadMerchantNameEnabled={autoReadMerchantNameEnabled}
          lat={draft.lat}
          lng={draft.lng}
          mapTheme={mapTheme}
          autoLocateOnMount={autoLocateOnMount}
          onMerchantInferenceStateChange={handleMerchantInferenceStateChange}
          onAutoLocateHandled={onAutoLocateHandled}
          onSelectionStateChange={setHasSelectedLocation}
          onTraceEvent={handleTraceEvent}
          onChange={onLocationChange}
        />
      </div>
    </div>
  );
}

function StepTwoContent({
  draft,
  onFieldChange
}: {
  draft: DraftState;
  onFieldChange: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [walletSelected, setWalletSelected] = useState(false);

  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 pt-4 sm:px-6 lg:px-8 xl:grid-cols-2 xl:px-12 xl:pb-6 xl:pt-6">
      <div className="flex min-w-0 flex-col gap-6">
        <CardFrame title="1. 交易状态">
          <div className="flex flex-wrap gap-3">
            <Chip active={draft.transactionStatus === "Success"} icon={CheckCircle} label="成功" onClick={() => onFieldChange("transactionStatus", "Success")} />
            <Chip active={draft.transactionStatus === "Fault"} icon={XCircle} label="故障" onClick={() => onFieldChange("transactionStatus", "Fault")} />
            <Chip active={draft.transactionStatus === "Unknown"} icon={HelpCircle} label="未知" onClick={() => onFieldChange("transactionStatus", "Unknown")} />
          </div>
        </CardFrame>

        <CardFrame title="2. 银行卡信息">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[140px_1fr]">
            <Field isSelect label="卡组织" onChange={(value) => onFieldChange("network", value)} options={NETWORK_OPTIONS} placeholder="Visa" value={draft.network} />
          </div>
          <div className="pt-1">
            <Chip active={walletSelected} icon={Wallet} label="从卡册选择" onClick={() => setWalletSelected((prev) => !prev)} />
          </div>
        </CardFrame>

        <CardFrame title="3. 身份验证">
          <div className="flex flex-wrap gap-3">
            <Chip active={draft.cvm === "No CVM"} icon={MinusCircle} label="免验证" onClick={() => onFieldChange("cvm", "No CVM")} />
            <Chip active={draft.cvm === "PIN"} icon={Hash} label="密码" onClick={() => onFieldChange("cvm", "PIN")} />
            <Chip active={draft.cvm === "Signature"} icon={PenTool} label="签名" onClick={() => onFieldChange("cvm", "Signature")} />
          </div>
        </CardFrame>

        <CardFrame title="4. 支付方式">
          <div className="flex flex-wrap gap-3">
            <Chip active={draft.paymentMethod === "Apple Pay"} icon={Smartphone} label="Apple Pay" onClick={() => onFieldChange("paymentMethod", "Apple Pay")} />
            <Chip active={draft.paymentMethod === "Google Pay"} icon={Smartphone} label="Google Pay" onClick={() => onFieldChange("paymentMethod", "Google Pay")} />
            <Chip active={draft.paymentMethod === "Tap"} icon={Wifi} label="轻触" onClick={() => onFieldChange("paymentMethod", "Tap")} />
            <Chip active={draft.paymentMethod === "Insert"} icon={CreditCard} label="插卡" onClick={() => onFieldChange("paymentMethod", "Insert")} />
            <Chip active={draft.paymentMethod === "Swipe"} icon={CreditCard} label="刷卡" onClick={() => onFieldChange("paymentMethod", "Swipe")} />
            <Chip active={draft.paymentMethod === "HCE"} icon={Nfc} label="HCE" onClick={() => onFieldChange("paymentMethod", "HCE")} />
          </div>
        </CardFrame>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <CardFrame title="5. 交易时间">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field isSelect label="年" onChange={(value) => onFieldChange("attemptYear", value)} options={YEAR_OPTIONS} placeholder="2026" value={draft.attemptYear} />
            <Field isSelect label="月" onChange={(value) => onFieldChange("attemptMonth", value)} options={MONTH_OPTIONS} placeholder="02" value={draft.attemptMonth} />
            <Field isSelect label="日" onChange={(value) => onFieldChange("attemptDay", value)} options={DAY_OPTIONS} placeholder="22" value={draft.attemptDay} />
          </div>
        </CardFrame>

        <CardFrame title="6. 收单方式">
          <div className="flex flex-wrap gap-3">
            <Chip active={draft.acquiringMode === "EDC"} icon={Building2} label="EDC" onClick={() => onFieldChange("acquiringMode", "EDC")} />
            <Chip active={draft.acquiringMode === "DCC"} icon={Globe} label="DCC" onClick={() => onFieldChange("acquiringMode", "DCC")} />
            <Chip active={draft.acquiringMode === "Unknown"} icon={HelpCircle} label="未知" onClick={() => onFieldChange("acquiringMode", "Unknown")} />
          </div>
        </CardFrame>

        <CardFrame title="7. 营业时间">
          <Field
            label="工作日营业时间"
            onChange={(value) => onFieldChange("weekdayBusinessHours", value)}
            placeholder="例如：周一至周五 09:00 - 18:00"
            value={draft.weekdayBusinessHours}
          />
          <Field
            label="周末营业时间"
            onChange={(value) => onFieldChange("weekendBusinessHours", value)}
            placeholder="例如：周六至周日 10:00 - 20:00"
            value={draft.weekendBusinessHours}
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">{t("Special Date Hours")}</p>
            <SpecialDateHoursEditor
              onChange={(value) => onFieldChange("specialDateHours", value)}
              value={draft.specialDateHours}
            />
          </div>
        </CardFrame>

        <CardFrame title="8. 联系方式">
          <Field
            label="联系方式"
            onChange={(value) => onFieldChange("contactInfo", value)}
            placeholder="电话 / 微信 / Telegram / Email"
            value={draft.contactInfo}
          />
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--accent)] px-4 py-3 text-sm leading-[1.5] text-[var(--muted-foreground)]">
            页面已按紧凑模式重排，营业时间和联系方式统一放在第二步。
          </div>
        </CardFrame>
      </div>
    </div>
  );
}

function StepThreeContent({
  draft,
  onFieldChange
}: {
  draft: DraftState;
  onFieldChange: <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;
}): React.JSX.Element {
  const checkoutOptions: SliderChoiceOption[] = [
    { label: "人工收银", value: "Staffed Checkout" },
    { label: "自助收银", value: "Self-checkout" }
  ];
  const statusOptions: SliderChoiceOption[] = [
    { label: "可用", value: "active" },
    { label: "停用", value: "inactive" }
  ];
  const staffOptions: SliderChoiceOption[] = STAFF_PROFICIENCY_OPTIONS.map((option) => ({
    label: `L${option.level}`,
    value: String(option.level)
  }));

  return (
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 px-4 pb-4 pt-4 sm:px-6 lg:px-8 xl:grid-cols-2 xl:px-12 xl:pb-6 xl:pt-6">
      <div className="flex min-w-0 flex-col gap-6">
        <CardFrame title="1. 收据信息状态">
          <SliderChoice
            onChange={(value) => onFieldChange("status", value as DraftState["status"])}
            options={statusOptions}
            value={draft.status}
          />
        </CardFrame>

        <CardFrame title="2. 收单机构">
          <Field isSelect label="选择收单机构" onChange={(value) => onFieldChange("acquirer", value)} options={ACQUIRER_OPTIONS} placeholder="Lakala" value={draft.acquirer} />
          <Field label="自定义收单机构" onChange={(value) => onFieldChange("acquirer", value)} placeholder="列表没有时手动输入" value={draft.acquirer} />
        </CardFrame>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <CardFrame title="3. 收费信息">
          <SliderChoice
            onChange={(value) => onFieldChange("checkoutLocation", value as DraftState["checkoutLocation"])}
            options={checkoutOptions}
            value={draft.checkoutLocation}
          />
          <div className="pt-1">
            <p className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">操作熟练度</p>
            <div className="mt-3">
              <SliderChoice
                onChange={(value) => onFieldChange("staffProficiencyLevel", Number(value) as DraftState["staffProficiencyLevel"])}
                options={staffOptions}
                value={String(draft.staffProficiencyLevel || 3)}
              />
            </div>
          </div>
        </CardFrame>

        <CardFrame title="4. POS 设置">
          <Field isSelect label="选择 POS 型号" onChange={(value) => onFieldChange("posModel", value)} options={POS_MODEL_OPTIONS} placeholder="Ingenico Move 5000" value={draft.posModel} />
          <Field label="自定义 POS 型号" onChange={(value) => onFieldChange("posModel", value)} placeholder="列表没有时手动输入" value={draft.posModel} />
        </CardFrame>

        <CardFrame title="补充备注">
          <Field label="内部备注" multiline onChange={(value) => onFieldChange("notes", value)} placeholder="填写额外说明、收费备注或交接信息" value={draft.notes} />
        </CardFrame>
      </div>
    </div>
  );
}

export function AddLocationWizard({
  autoReadMerchantNameEnabled,
  onCancel,
  onComplete,
  saving = false,
  brandOptions = [],
  mapTheme,
  smartAddEnabled
}: AddLocationWizardProps): React.JSX.Element {
  const { t } = useI18n();
  const [step, setStep] = useState<WizardStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [shouldAutoLocateStepOne, setShouldAutoLocateStepOne] = useState(true);
  const [smartAddOpen, setSmartAddOpen] = useState(false);
  const autoFilledMerchantNameRef = useRef<string | null>(null);
  const today = new Date();
  const [draft, setDraft] = useState<DraftState>({
    name: "",
    address: "",
    brand: "",
    city: "上海",
    status: "active",
    transactionStatus: "Success",
    lat: 31.2304,
    lng: 121.4737,
    network: "Visa",
    paymentMethod: "Apple Pay",
    cvm: "PIN",
    acquiringMode: "DCC",
    acquirer: "Global Payments",
    posModel: "Ingenico Move 5000",
    checkoutLocation: "Staffed Checkout",
    attemptYear: String(today.getFullYear()),
    attemptMonth: String(today.getMonth() + 1).padStart(2, "0"),
    attemptDay: String(today.getDate()).padStart(2, "0"),
    contactInfo: "",
    weekdayBusinessHours: "",
    weekendBusinessHours: "",
    specialDateHours: [],
    staffProficiencyLevel: null,
    notes: ""
  });

  const isLastStep = step === 3;

  const availableBrandOptions = useMemo(
    () => (brandOptions.length > 0 ? brandOptions : DEFAULT_BRAND_OPTIONS),
    [brandOptions]
  );

  const updateDraft = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    if (key === "name") {
      const nextName = typeof value === "string" ? value.trim() : "";
      if (autoFilledMerchantNameRef.current && nextName !== autoFilledMerchantNameRef.current) {
        autoFilledMerchantNameRef.current = null;
      }
    }
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyDraftPatch = (patch: AddLocationAssistantPatch): void => {
    if (!patch || Object.keys(patch).length === 0) {
      return;
    }

    setDraft((prev) => {
      const nextDraft = {
        ...prev,
        ...patch
      };

      if (typeof patch.name === "string" && patch.name.trim()) {
        autoFilledMerchantNameRef.current = patch.name.trim();
      }

      return nextDraft;
    });
  };

  const applyAiPlaceSelection = (place: AMapPlaceSearchResult, preferredName?: string | null): void => {
    setDraft((prev) => {
      const nextName = preferredName?.trim() || prev.name || place.name;
      autoFilledMerchantNameRef.current = nextName;
      return {
        ...prev,
        lat: place.lat,
        lng: place.lng,
        address: place.address || prev.address,
        city: place.city || place.district || place.province || prev.city,
        name: nextName
      };
    });
  };

  const handleResolvedLocationChange = ({
    lat,
    lng,
    address,
    city,
    merchantName
  }: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    merchantName?: string | null;
  }) => {
    setDraft((prev) => {
      const nextDraft = {
        ...prev,
        lat,
        lng
      };

      if (typeof address === "string" && address.trim()) {
        nextDraft.address = address;
      }

      if (typeof city === "string" && city.trim()) {
        nextDraft.city = city;
      }

      const currentName = prev.name.trim();
      const lastAutoFilledName = autoFilledMerchantNameRef.current?.trim() || "";
      const nextMerchantName = typeof merchantName === "string" ? merchantName.trim() : "";

      if (nextMerchantName) {
        if (!currentName || currentName === lastAutoFilledName) {
          nextDraft.name = nextMerchantName;
          autoFilledMerchantNameRef.current = nextMerchantName;
        }
      } else if (currentName && currentName === lastAutoFilledName) {
        nextDraft.name = "";
        autoFilledMerchantNameRef.current = null;
      }

      return nextDraft;
    });
  };

  const submitDraft = async (nextDraft: DraftState): Promise<void> => {
    if (!nextDraft.name.trim()) {
      setError("Merchant name is required.");
      setStep(1);
      return;
    }

    if (!nextDraft.address.trim()) {
      setError("Address is required.");
      setStep(1);
      return;
    }

    setError(null);

    await onComplete(buildCreateLocationPayload(nextDraft));
  };

  const handleSubmit = async (): Promise<void> => {
    await submitDraft(draft);
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-[#FAFAFA] p-3 sm:p-4">
      <header className="flex flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.4px] text-[var(--foreground)]">{t("Add Location")}</h1>
          <p className="text-sm leading-[1.4] text-[var(--muted-foreground)]">{t(STEP_SUBTITLE[step])}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className={`ui-hover-shadow inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-sm font-medium leading-[1.4286] transition-colors duration-200 ${
              smartAddEnabled
                ? "border-[rgba(87,73,244,0.22)] bg-[rgba(87,73,244,0.08)] text-[var(--foreground)] hover:border-[rgba(87,73,244,0.38)] hover:bg-[rgba(87,73,244,0.12)]"
                : "border-[var(--input)] bg-white text-[var(--muted-foreground)] hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
            }`}
            disabled={saving}
            onClick={() => setSmartAddOpen(true)}
            type="button"
          >
            <Sparkles className={`h-4 w-4 ${smartAddEnabled ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`} />
            <span>智能添加</span>
            <span className="inline-flex h-6 items-center rounded-pill border border-[rgba(234,179,8,0.32)] bg-[rgba(254,249,195,0.9)] px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#854d0e]">
              Beta
            </span>
          </button>

          {step > 1 ? (
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]"
              disabled={saving}
              onClick={() => setStep((prev) => (prev - 1) as WizardStep)}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("Previous")}</span>
            </button>
          ) : null}

          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            <Ban className="h-4 w-4" />
            <span>{t("Cancel")}</span>
          </button>

          <button
            className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 text-sm font-medium leading-[1.4286] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73]"
            disabled={saving}
            onClick={() => {
              if (isLastStep) {
                void handleSubmit();
                return;
              }
              setStep((prev) => (prev + 1) as WizardStep);
            }}
            type="button"
          >
            {isLastStep ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            <span>{saving ? t("Saving...") : isLastStep ? t("Submit") : t("Next Step")}</span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="mx-4 rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a] sm:mx-6 lg:mx-10">
          {t(error)}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {step === 1 ? (
          <StepOneContent
            autoReadMerchantNameEnabled={autoReadMerchantNameEnabled}
            autoLocateOnMount={shouldAutoLocateStepOne}
            brandOptions={availableBrandOptions}
            draft={draft}
            mapTheme={mapTheme}
            onAutoLocateHandled={() => setShouldAutoLocateStepOne(false)}
            onLocationChange={handleResolvedLocationChange}
            onFieldChange={updateDraft}
          />
        ) : null}
        {step === 2 ? <StepTwoContent draft={draft} onFieldChange={updateDraft} /> : null}
        {step === 3 ? <StepThreeContent draft={draft} onFieldChange={updateDraft} /> : null}
      </div>

      <AddLocationSmartAddDialog
        brandOptions={availableBrandOptions}
        currentDraft={draft}
        enabled={smartAddEnabled}
        onApplyPatch={applyDraftPatch}
        onApplyPlaceSelection={applyAiPlaceSelection}
        onOpenChange={setSmartAddOpen}
        onSubmitDraft={(nextDraft) => submitDraft(nextDraft)}
        open={smartAddOpen}
      />
    </section>
  );
}
