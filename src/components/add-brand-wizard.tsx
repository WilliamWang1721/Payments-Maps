import { useEffect, useMemo, useState } from "react";
import type React from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Ban,
  BadgeCheck,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Check,
  Globe,
  ImageUp,
  Rocket,
  Store
} from "lucide-react";

import { useI18n } from "@/i18n";
import {
  buildBrandHostname,
  buildBrandInitials,
  buildBrandPreviewImage,
  normalizeExternalUrl,
  normalizeHexColor
} from "@/lib/brand-visuals";
import type { BrandBusinessType, BrandCategory, BrandStatus, CreateBrandInput } from "@/types/brand";

type WizardStep = 1 | 2;

interface AddBrandWizardProps {
  onCancel: () => void;
  onComplete: (input: CreateBrandInput) => Promise<void>;
  saving?: boolean;
}

interface DraftState {
  nameZh: string;
  nameEn: string;
  description: string;
  notes: string;
  category: BrandCategory;
  businessType: BrandBusinessType;
  status: BrandStatus;
  iconUrl: string;
  website: string;
  founded: string;
  headquarters: string;
  color: string;
}

interface OptionCardProps {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}

const STEP_SUBTITLE: Record<WizardStep, string> = {
  1: "Step 1 of 2: Brand Identity & Visuals",
  2: "Step 2 of 2: Coverage & Publishing"
};

const CATEGORY_OPTIONS: Array<{ value: BrandCategory; label: string }> = [
  { value: "coffee", label: "Coffee" },
  { value: "fast_food", label: "Fast Food" },
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "fashion", label: "Fashion" },
  { value: "convenience", label: "Convenience" },
  { value: "supermarket", label: "Supermarket" },
  { value: "electronics", label: "Electronics" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "food_delivery", label: "Food Delivery" },
  { value: "other", label: "Other" }
];

const DEFAULT_DRAFT: DraftState = {
  nameZh: "",
  nameEn: "",
  description: "",
  notes: "",
  category: "retail",
  businessType: "offline",
  status: "active",
  iconUrl: "",
  website: "",
  founded: "",
  headquarters: "",
  color: ""
};

function buildAccentColor(draft: DraftState): string {
  const explicit = normalizeHexColor(draft.color);
  if (explicit) {
    return explicit;
  }

  return draft.businessType === "online" ? "#0F8B8D" : "#5749F4";
}

function buildDisplayBrandName(draft: Pick<DraftState, "nameZh" | "nameEn">): string {
  const zh = draft.nameZh.trim();
  const en = draft.nameEn.trim();

  if (zh && en) {
    return `${zh} ${en}`;
  }

  return zh || en;
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(/^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/);
  if (!match) {
    return null;
  }

  return {
    red: Number.parseInt(match[1], 16),
    green: Number.parseInt(match[2], 16),
    blue: Number.parseInt(match[3], 16)
  };
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(87,73,244,${alpha})`;
  }

  return `rgba(${rgb.red},${rgb.green},${rgb.blue},${alpha})`;
}

function toFoundedYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function getBusinessTypeLabel(value: BrandBusinessType): string {
  return value === "online" ? "Online Brand" : "Offline Brand";
}

function getStatusLabel(value: BrandStatus): string {
  if (value === "inactive") return "Paused";
  if (value === "coming_soon") return "Coming soon";
  return "Active rollout";
}

function getImageSourceLabel(source: "icon" | "favicon" | "none"): string {
  if (source === "icon") return "Direct logo";
  if (source === "favicon") return "Website favicon";
  return "Monogram fallback";
}

function CardFrame({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <article className="rounded-m border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-semibold leading-[1.2] text-[var(--foreground)]">{t(title)}</h3>
        {description ? <p className="text-sm leading-[1.45] text-[var(--muted-foreground)]">{t(description)}</p> : null}
      </div>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </article>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
  multiline = false,
  type = "text"
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: "text" | "url" | "number";
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">{t(label)}</span>
      <div className={`border border-[var(--border)] bg-[var(--accent)] px-6 ${multiline ? "rounded-m py-3" : "rounded-pill py-4"}`}>
        {multiline ? (
          <textarea
            className="w-full resize-none bg-transparent text-sm leading-[1.4] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
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
            type={type}
            value={value}
          />
        )}
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium leading-[1.35] text-[var(--foreground)]">{t(label)}</span>
      <div className="relative rounded-pill border border-[var(--border)] bg-[var(--accent)] px-6 py-4">
        <select
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-pill bg-transparent opacity-0"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {t(option.label)}
            </option>
          ))}
        </select>
        <span className="block truncate text-sm leading-[1.35] text-[var(--foreground)]">
          {t(options.find((option) => option.value === value)?.label || value)}
        </span>
      </div>
    </label>
  );
}

function OptionCard({ active, description, label, onClick }: OptionCardProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <button
      className={`ui-hover-shadow flex min-h-[92px] flex-col items-start rounded-[28px] border px-5 py-4 text-left transition-colors duration-200 ${
        active
          ? "border-[rgba(87,73,244,0.22)] bg-[rgba(87,73,244,0.08)]"
          : "border-[var(--input)] bg-white hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="text-sm font-semibold leading-[1.3] text-[var(--foreground)]">{t(label)}</span>
      <span className="mt-2 text-sm leading-[1.45] text-[var(--muted-foreground)]">{t(description)}</span>
    </button>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="flex items-start gap-3 rounded-[22px] border border-[var(--input)] bg-white/82 px-4 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.72)] text-[var(--foreground)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{t(label)}</p>
        <p className="mt-1 truncate text-sm font-semibold leading-[1.3] text-[var(--foreground)]">{t(value)}</p>
      </div>
    </div>
  );
}

function BrandPreviewPanel({ draft }: { draft: DraftState }): React.JSX.Element {
  const { t } = useI18n();
  const accentColor = buildAccentColor(draft);
  const displayName = buildDisplayBrandName(draft);
  const preview = useMemo(() => buildBrandPreviewImage(draft.iconUrl, draft.website), [draft.iconUrl, draft.website]);
  const [imageFailed, setImageFailed] = useState(false);
  const host = buildBrandHostname(draft.website);
  const initials = buildBrandInitials(displayName);

  useEffect(() => {
    setImageFailed(false);
  }, [preview.imageUrl]);

  const heroStyle = {
    backgroundImage: `linear-gradient(160deg, ${withAlpha(accentColor, 0.18)} 0%, rgba(255,255,255,0.88) 54%, ${withAlpha(accentColor, 0.08)} 100%)`
  };
  const showImage = Boolean(preview.imageUrl) && !imageFailed;

  return (
    <aside className="relative flex h-full flex-col gap-4 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[188px]" style={heroStyle} />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--muted-foreground)]">{t("Brand Preview")}</p>
            <h3 className="mt-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)]">
              {displayName || t("Brand Name")}
            </h3>
          </div>
          <span className="inline-flex h-10 items-center rounded-pill border border-white/70 bg-white/72 px-4 text-xs font-semibold text-[var(--foreground)] shadow-[0_10px_24px_-18px_rgba(15,23,42,0.5)]">
            {t(getStatusLabel(draft.status))}
          </span>
        </div>

        <div className="flex min-h-[240px] flex-1 items-center justify-center rounded-[28px] border border-white/70 bg-white/90 px-6 py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {showImage ? (
            <img
              alt={displayName || "Brand Preview"}
              className="max-h-[160px] w-full object-contain"
              decoding="async"
              loading="eager"
              onError={() => setImageFailed(true)}
              referrerPolicy="no-referrer"
              src={preview.imageUrl || ""}
            />
          ) : (
            <span
              className="inline-flex h-28 w-28 items-center justify-center rounded-[32px] text-[34px] font-semibold uppercase text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.45)]"
              style={{ backgroundColor: accentColor }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryRow icon={BadgeDollarSign} label="Brand Category" value={CATEGORY_OPTIONS.find((item) => item.value === draft.category)?.label || "Retail"} />
        <SummaryRow icon={draft.businessType === "online" ? Globe : Store} label="Business Type" value={getBusinessTypeLabel(draft.businessType)} />
        <SummaryRow icon={ImageUp} label="Image Source" value={getImageSourceLabel(showImage ? preview.source : "none")} />
        <SummaryRow icon={Building2} label="Website" value={host || "Not set"} />
      </div>

      <div className="relative rounded-[24px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4">
        <p className="text-sm font-semibold leading-[1.3] text-[var(--foreground)]">{t("Image Priority")}</p>
        <p className="mt-2 text-sm leading-[1.5] text-[var(--muted-foreground)]">
          {t("We prioritize the direct logo URL, then website favicon, then initials fallback.")}
        </p>
        <p className="mt-2 text-sm leading-[1.5] text-[var(--muted-foreground)]">
          {t("Preview uses contain mode and a high-contrast surface for cleaner logos.")}
        </p>
        {preview.imageUrl && imageFailed ? (
          <div className="mt-3 flex items-start gap-2 rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.92)] px-3 py-2 text-sm text-[#b42318]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("Visual fallback applied because the image could not be loaded.")}</span>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function StepOneContent({
  draft,
  onFieldChange
}: {
  draft: DraftState;
  onFieldChange: <Key extends keyof DraftState>(field: Key, value: DraftState[Key]) => void;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:px-10">
      <div className="flex min-h-0 flex-col gap-4">
        <CardFrame title="Brand Identity" description="Set the brand name, primary website, and visual direction before publishing.">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TextField
              label="Chinese Brand Name"
              onChange={(value) => onFieldChange("nameZh", value)}
              placeholder="e.g. 星巴克臻选"
              value={draft.nameZh}
            />
            <TextField
              label="English Brand Name"
              onChange={(value) => onFieldChange("nameEn", value)}
              placeholder="e.g. Starbucks Reserve"
              value={draft.nameEn}
            />
          </div>
          <TextField label="Website" onChange={(value) => onFieldChange("website", value)} placeholder="https://brand.com" type="url" value={draft.website} />
          <TextField
            label="Description"
            multiline
            onChange={(value) => onFieldChange("description", value)}
            placeholder="Share the brand positioning, payment context, or coverage notes..."
            value={draft.description}
          />
        </CardFrame>

        <CardFrame title="Brand Visual" description="Keep logos clean and high-contrast so cards stay readable in the grid and future detail views.">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TextField
              label="Logo / Image URL"
              onChange={(value) => onFieldChange("iconUrl", value)}
              placeholder="https://cdn.example.com/logo.png"
              type="url"
              value={draft.iconUrl}
            />
            <TextField
              label="Accent Color"
              onChange={(value) => onFieldChange("color", value)}
              placeholder="#5749F4"
              value={draft.color}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <OptionCard
              active={draft.businessType === "offline"}
              description="Best for physical stores, branches, kiosks, and on-site payment footprints."
              label="Offline Brand"
              onClick={() => onFieldChange("businessType", "offline")}
            />
            <OptionCard
              active={draft.businessType === "online"}
              description="Best for apps, e-commerce flows, delivery platforms, and digital checkouts."
              label="Online Brand"
              onClick={() => onFieldChange("businessType", "online")}
            />
          </div>
        </CardFrame>
      </div>

      <BrandPreviewPanel draft={draft} />
    </div>
  );
}

function StepTwoContent({
  draft,
  onFieldChange
}: {
  draft: DraftState;
  onFieldChange: <Key extends keyof DraftState>(field: Key, value: DraftState[Key]) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const displayName = buildDisplayBrandName(draft);

  return (
    <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:px-10">
      <div className="flex min-h-0 flex-col gap-4">
        <CardFrame title="Business Profile" description="Choose a category and publishing status so the brand catalog stays structured.">
          <SelectField
            label="Brand Category"
            onChange={(value) => onFieldChange("category", value as BrandCategory)}
            options={CATEGORY_OPTIONS}
            value={draft.category}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <OptionCard
              active={draft.status === "active"}
              description="Visible immediately in the shared catalog."
              label="Active rollout"
              onClick={() => onFieldChange("status", "active")}
            />
            <OptionCard
              active={draft.status === "coming_soon"}
              description="Prepared now but marked as not yet launched."
              label="Coming soon"
              onClick={() => onFieldChange("status", "coming_soon")}
            />
            <OptionCard
              active={draft.status === "inactive"}
              description="Stored for reference without active rollout."
              label="Paused"
              onClick={() => onFieldChange("status", "inactive")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TextField label="Headquarters" onChange={(value) => onFieldChange("headquarters", value)} placeholder="e.g. Shanghai" value={draft.headquarters} />
            <TextField label="Founded Year" onChange={(value) => onFieldChange("founded", value)} placeholder="e.g. 1999" type="number" value={draft.founded} />
          </div>
        </CardFrame>

        <CardFrame title="Publishing Notes" description="Capture any catalog guidance that helps the team reuse this brand consistently.">
          <TextField
            label="Internal Notes"
            multiline
            onChange={(value) => onFieldChange("notes", value)}
            placeholder="Add internal notes for payment behavior, naming conventions, or regional coverage."
            value={draft.notes}
          />
        </CardFrame>
      </div>

      <aside className="flex h-full flex-col gap-4 rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--muted-foreground)]">{t("Ready to publish")}</p>
          <h3 className="mt-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--foreground)]">{displayName || t("Brand Name")}</h3>
          <p className="mt-3 text-sm leading-[1.5] text-[var(--muted-foreground)]">
            {t("This brand will be added to the shared catalog and become available in Add Location immediately.")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <SummaryRow icon={Rocket} label="Brand Status" value={getStatusLabel(draft.status)} />
          <SummaryRow icon={Store} label="Brand Category" value={CATEGORY_OPTIONS.find((item) => item.value === draft.category)?.label || "Other"} />
          <SummaryRow icon={CalendarDays} label="Founded Year" value={draft.founded.trim() || "Not set"} />
          <SummaryRow icon={Building2} label="Headquarters" value={draft.headquarters.trim() || "Not set"} />
        </div>

        <div className="rounded-[24px] border border-[var(--input)] bg-[var(--accent)] px-4 py-4">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-[var(--primary)]" />
            <p className="text-sm font-semibold leading-[1.3] text-[var(--foreground)]">{t("UI Design Standard")}</p>
          </div>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-[1.5] text-[var(--muted-foreground)]">
            <p>{t("Consistent spacing, readable contrast, and logo-safe preview surfaces are applied by default.")}</p>
            <p>{t("The final catalog card will prefer uploaded branding assets without breaking the fallback layout.")}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function AddBrandWizard({ onCancel, onComplete, saving = false }: AddBrandWizardProps): React.JSX.Element {
  const { t } = useI18n();
  const [step, setStep] = useState<WizardStep>(1);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);

  const preview = useMemo(() => buildBrandPreviewImage(draft.iconUrl, draft.website), [draft.iconUrl, draft.website]);
  const isLastStep = step === 2;

  const updateDraft = <Key extends keyof DraftState>(field: Key, value: DraftState[Key]): void => {
    setDraft((prev) => ({
      ...prev,
      [field]: value
    }));
    if (error) {
      setError(null);
    }
  };

  const validateDraft = (): string | null => {
    if (!buildDisplayBrandName(draft)) {
      return "At least one brand name is required.";
    }

    if (draft.website.trim() && !normalizeExternalUrl(draft.website)) {
      return "Website URL is invalid.";
    }

    if (draft.iconUrl.trim() && !normalizeExternalUrl(draft.iconUrl)) {
      return "Image URL is invalid.";
    }

    if (draft.color.trim() && !normalizeHexColor(draft.color)) {
      return "Accent color must be a hex value like #5749F4.";
    }

    if (draft.founded.trim() && toFoundedYear(draft.founded) === null) {
      return "Founded year must be a valid 4-digit year.";
    }

    return null;
  };

  const buildPayload = (): CreateBrandInput => ({
    name: buildDisplayBrandName(draft),
    description: draft.description.trim(),
    notes: draft.notes.trim(),
    category: draft.category,
    businessType: draft.businessType,
    status: draft.status,
    iconUrl: draft.iconUrl.trim(),
    website: draft.website.trim(),
    founded: toFoundedYear(draft.founded),
    headquarters: draft.headquarters.trim(),
    color: draft.color.trim()
  });

  const handleNext = (): void => {
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (): Promise<void> => {
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    await onComplete(buildPayload());
  };

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col gap-2 bg-[#FAFAFA] p-3 sm:p-4">
      <header className="flex flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <h1 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.4px] text-[var(--foreground)]">{t("Add Brand")}</h1>
          <p className="text-sm leading-[1.4] text-[var(--muted-foreground)]">{t(STEP_SUBTITLE[step])}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {step > 1 ? (
            <button
              className="ui-hover-shadow inline-flex h-10 items-center gap-1.5 rounded-pill border border-[var(--input)] px-4 text-sm font-medium leading-[1.4286] text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]"
              disabled={saving}
              onClick={() => setStep(1)}
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
              handleNext();
            }}
            type="button"
          >
            {isLastStep ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            <span>{saving ? t("Saving...") : isLastStep ? t("Submit") : t("Next Step")}</span>
          </button>
        </div>
      </header>

      {error ? (
        <div className="mx-4 flex items-start gap-2 rounded-m border border-[#f3bbb2] bg-[#fff3f1] px-4 py-3 text-sm text-[#8f291a] sm:mx-6 lg:mx-10">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t(error)}</span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        {step === 1 ? <StepOneContent draft={draft} onFieldChange={updateDraft} /> : null}
        {step === 2 ? <StepTwoContent draft={draft} onFieldChange={updateDraft} /> : null}
      </div>

      <div className="px-4 pb-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
          <span className="inline-flex h-8 items-center rounded-pill bg-[var(--accent)] px-3 font-medium text-[var(--foreground)]">
            {t(getImageSourceLabel(preview.imageUrl ? preview.source : "none"))}
          </span>
          <span>{t("Image Preview")}</span>
          <span className="text-[var(--border)]">•</span>
          <span>{t("UI-safe fallback chain is active for this brand.")}</span>
        </div>
      </div>
    </section>
  );
}
