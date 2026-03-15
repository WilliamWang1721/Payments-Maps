import { useState } from "react";
import type React from "react";
import { Check, ChevronDown } from "lucide-react";

import { LANGUAGE_OPTIONS, type Language, useI18n } from "@/i18n";
import { MAP_THEME_OPTIONS, type MapThemeKey } from "@/lib/map-theme";

interface WebSettingsProps {
  addLocationAutoReadMerchantNameEnabled: boolean;
  addLocationSmartAddEnabled: boolean;
  mapTheme: MapThemeKey;
  onAddLocationAutoReadMerchantNameChange: (enabled: boolean) => void;
  onAddLocationSmartAddChange: (enabled: boolean) => void;
  onMapThemeChange: (theme: MapThemeKey) => void;
}

function Toggle({
  checked,
  onClick,
  ariaLabel
}: {
  checked: boolean;
  onClick: () => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <button
      aria-label={ariaLabel}
      className={`ui-hover-shadow relative inline-flex h-10 w-[68px] items-center rounded-pill border px-1 transition-colors duration-200 ${
        checked
          ? "border-[var(--primary)] bg-[var(--primary)]"
          : "border-[var(--input)] bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`absolute left-1 h-8 w-8 rounded-full shadow-[0_8px_18px_-14px_rgba(15,23,42,0.45)] transition-transform duration-200 ${
          checked ? "translate-x-[28px] bg-white" : "translate-x-0 bg-[var(--accent)]"
        }`}
      />
    </button>
  );
}

function SelectControl({
  value,
  options,
  onChange
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="relative w-full sm:w-[220px]">
      <select
        className="h-10 w-full appearance-none rounded-pill border border-[var(--input)] bg-white px-4 pr-10 text-sm text-[var(--foreground)] outline-none transition-colors duration-200 hover:border-[var(--border-hover)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
    </div>
  );
}

function SettingRow({
  title,
  description,
  control
}: {
  title: React.ReactNode;
  description: string;
  control: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium leading-[1.3] text-[var(--foreground)]">{title}</p>
        </div>
        <p className="mt-1 text-[11px] leading-[1.3] text-[var(--muted-foreground)]">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function BetaBadge(): React.JSX.Element {
  return (
    <span className="inline-flex h-6 items-center rounded-pill border border-[rgba(234,179,8,0.32)] bg-[rgba(254,249,195,0.9)] px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#854d0e]">
      Beta
    </span>
  );
}

export function WebSettings({
  addLocationAutoReadMerchantNameEnabled,
  addLocationSmartAddEnabled,
  mapTheme,
  onAddLocationAutoReadMerchantNameChange,
  onAddLocationSmartAddChange,
  onMapThemeChange
}: WebSettingsProps): React.JSX.Element {
  const { language, setLanguage, t } = useI18n();
  const [theme, setTheme] = useState("Auto (System Default)");
  const [locationPermission, setLocationPermission] = useState(true);
  const [showLocationNames, setShowLocationNames] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  const themeOptions = [
    { value: "Auto (System Default)", label: t("Auto (System Default)") },
    { value: "Light", label: t("Light") },
    { value: "Dark", label: t("Dark") }
  ];

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] p-3 sm:p-4">
      <header className="flex flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div className="space-y-1">
          <h1 className="text-[28px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Settings")}</h1>
          <p className="text-sm leading-[1.3] text-[var(--muted-foreground)]">{t("Manage your system preferences and billing configuration")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="ui-hover-shadow inline-flex h-10 items-center justify-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 py-2 text-sm font-medium leading-[1.4286] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73] [--hover-outline-active:#372cb8a6]"
            onClick={() => setIsSaved(true)}
            type="button"
          >
            <Check className="h-4 w-4" />
            <span>{isSaved ? t("Saved") : t("Save Changes")}</span>
          </button>
        </div>
      </header>

      <div className="h-px w-full bg-[var(--input)]" />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Language & Interface")}</h2>
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              control={
                <SelectControl
                  onChange={(value) => {
                    setTheme(value);
                    setIsSaved(false);
                  }}
                  options={themeOptions}
                  value={theme}
                />
              }
              description={t("Set your dashboard theme, light, dark and auto themes")}
              title={t("Theme")}
            />
            <SettingRow
              control={
                <SelectControl
                  onChange={(value) => {
                    setLanguage(value as Language);
                    setIsSaved(false);
                  }}
                  options={LANGUAGE_OPTIONS.map((option) => ({ label: option.label, value: option.code }))}
                  value={language}
                />
              }
              description=""
              title={t("Language")}
            />
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Map Experience")}</h2>
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              control={
                <SelectControl
                  onChange={(value) => {
                    onMapThemeChange(value as MapThemeKey);
                    setIsSaved(false);
                  }}
                  options={MAP_THEME_OPTIONS.map((option) => ({ label: t(option.label), value: option.value }))}
                  value={mapTheme}
                />
              }
              description={t("Choose the visual theme of the map. Apple 风格 is recommended, while 马卡龙 remains the default.")}
              title={t("Map Theme Selection")}
            />
            <SettingRow
              control={
                <Toggle
                  ariaLabel={t("Toggle location permission")}
                  checked={locationPermission}
                  onClick={() => {
                    setLocationPermission((prev) => !prev);
                    setIsSaved(false);
                  }}
                />
              }
              description={t("Allow the app to access your location")}
              title={t("Location Permission")}
            />
            <SettingRow
              control={
                <Toggle
                  ariaLabel={t("Toggle show location names")}
                  checked={showLocationNames}
                  onClick={() => {
                    setShowLocationNames((prev) => !prev);
                    setIsSaved(false);
                  }}
                />
              }
              description={t("Display the names of places on the map")}
              title={t("Show Location Names")}
            />
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">AI</h2>
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              control={
                <Toggle
                  ariaLabel="切换智能添加"
                  checked={addLocationSmartAddEnabled}
                  onClick={() => {
                    onAddLocationSmartAddChange(!addLocationSmartAddEnabled);
                    setIsSaved(false);
                  }}
                />
              }
              description="在新增地点页启用“智能添加”Beta。开启后，AI 可以用自然语言理解你的意图、自动检索地图位置、补全表单并在信息齐全时直接提交。"
              title={
                <>
                  智能添加
                  <BetaBadge />
                </>
              }
            />
          </div>
        </article>

        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <h2 className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">{t("Add Location")}</h2>
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              control={
                <Toggle
                  ariaLabel={t("Toggle auto-read merchant name")}
                  checked={addLocationAutoReadMerchantNameEnabled}
                  onClick={() => {
                    onAddLocationAutoReadMerchantNameChange(!addLocationAutoReadMerchantNameEnabled);
                    setIsSaved(false);
                  }}
                />
              }
              description={t("Use AI to detect a merchant name from the selected map point. This Beta feature stays off until you explicitly enable it.")}
              title={
                <>
                  {t("Auto-read Merchant Name")}
                  <span className="inline-flex h-6 items-center rounded-pill border border-[rgba(234,179,8,0.32)] bg-[rgba(254,249,195,0.9)] px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#854d0e]">
                    {t("Beta")}
                  </span>
                </>
              }
            />
          </div>
        </article>

        <footer className="mt-auto px-1 pt-2 text-center text-[11px] leading-[1.4] text-[var(--muted-foreground)]">
          致谢：小红书@momoPT
        </footer>
      </div>
    </section>
  );
}
