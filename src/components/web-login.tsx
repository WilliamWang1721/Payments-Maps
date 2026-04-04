import { useEffect, useState } from "react";
import type React from "react";

import githubLogo from "../../assets/logos/github-logo.svg";
import googleLogo from "../../assets/logos/google-logo.svg";
import microsoftLogo from "../../assets/logos/microsoft-logo.svg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export type LoginProvider = "google" | "azure" | "github" | "linuxdo";

interface WebLoginProps {
  configured: boolean;
  errorMessage?: string | null;
  pendingProvider?: LoginProvider | null;
  onManualCallbackSignIn: (provider: LoginProvider, callbackUrl: string) => Promise<string | null>;
  onSignIn: (provider: LoginProvider) => void | Promise<void>;
  onTrialSignIn: () => Promise<string | null>;
}

interface ProviderButtonProps {
  provider: LoginProvider;
  configured: boolean;
  pendingProvider: LoginProvider | null;
  onClick: (provider: LoginProvider) => void | Promise<void>;
}

function FluxaBrandWordmark({ compact = false, onActivate }: { compact?: boolean; onActivate?: () => void }): React.JSX.Element {
  const Wrapper = onActivate ? "button" : "div";

  return (
    <Wrapper
      className={cn(
        "flex items-center gap-2.5 text-[#2a2933]",
        compact ? "justify-center lg:justify-start" : "",
        onActivate ? "cursor-default appearance-none border-0 bg-transparent p-0 text-left" : ""
      )}
      onClick={onActivate}
      type={onActivate ? "button" : undefined}
    >
      <div className={cn("relative shrink-0", compact ? "h-6 w-6" : "h-10 w-10")}>
        <svg
          aria-hidden="true"
          className={cn("absolute fill-[#2a2933]", compact ? "left-0 top-0 h-6 w-6" : "left-1 top-1 h-8 w-8")}
          viewBox="0 0 32 32"
        >
          <path d="M16 26c1.65686 0 3 1.34314 3 3 0 1.65686-1.34314 3-3 3-1.65686 0-3-1.34314-3-3 0-1.65686 1.34314-3 3-3z m-10-2c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m20 0c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m-10-12c2.20914 0 4 1.79086 4 4 0 2.20914-1.79086 4-4 4-2.20914 0-4-1.79086-4-4 0-2.20914 1.79086-4 4-4z m-13 1c1.65685 0 3 1.34314 3 3 0 1.65686-1.34315 3-3 3-1.65685 0-3-1.34314-3-3 0-1.65686 1.34315-3 3-3z m26 0c1.65686 0 3 1.34314 3 3 0 1.65686-1.34314 3-3 3-1.65686 0-3-1.34314-3-3 0-1.65686 1.34314-3 3-3z m-23-9c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m20 0c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m-10-4c1.65686 0 3 1.34315 3 3 0 1.65685-1.34314 3-3 3-1.65686 0-3-1.34315-3-3 0-1.65685 1.34314-3 3-3z" />
        </svg>
      </div>
      <span className={cn("font-semibold tracking-[-0.02em]", compact ? "text-[13px] leading-6" : "text-sm leading-6")}>FLUXA</span>
    </Wrapper>
  );
}

function ProviderButton({ provider, configured, pendingProvider, onClick }: ProviderButtonProps): React.JSX.Element {
  const { language, t } = useI18n();
  const isPending = pendingProvider === provider;
  const isDisabled = pendingProvider !== null || (!configured && provider !== "linuxdo");
  const content =
    provider === "google" ? (
      <img alt="Google" className="h-[18px] w-auto max-w-[112px] object-contain" src={googleLogo} />
    ) : provider === "azure" ? (
      <img alt="Microsoft" className="h-[14px] w-auto max-w-[132px] object-contain" src={microsoftLogo} />
    ) : provider === "github" ? (
      <img alt="GitHub" className="h-[17px] w-auto max-w-[124px] object-contain" src={githubLogo} />
    ) : (
      <span className="font-semibold">Linux.do</span>
    );

  const providerLabel = provider === "azure" ? "Microsoft" : provider === "linuxdo" ? "Linux.do" : provider.charAt(0).toUpperCase() + provider.slice(1);
  const isChinese = language === "zh";

  return (
    <button
      aria-label={isChinese ? `使用 ${providerLabel} 继续` : `Continue with ${providerLabel}`}
      className={cn(
        "ui-hover-shadow flex h-[52px] w-full items-center justify-center gap-1.5 rounded-[999px] border border-[#c5c5cb] bg-white px-4 text-[14px] font-medium leading-5 text-[#2a2933] transition-colors duration-200 hover:bg-[#f6f6f8] sm:gap-2",
        isPending && "bg-[#f6f6f8]",
        isDisabled && "cursor-not-allowed opacity-70"
      )}
      disabled={isDisabled}
      onClick={() => {
        void onClick(provider);
      }}
      type="button"
    >
      {isChinese ? <span className="shrink-0">{t("Use")}</span> : <span className="shrink-0">{t("Continue with")}</span>}
      <span className="flex min-w-0 items-center justify-center">{content}</span>
      {isChinese ? <span className="shrink-0">{t("to continue")}</span> : null}
    </button>
  );
}

const DEBUG_UNLOCK_STORAGE_KEY = "fluxa_login_debug_mode";

const DEBUG_PROVIDER_OPTIONS: Array<{ key: LoginProvider; label: string }> = [
  { key: "google", label: "Google" },
  { key: "azure", label: "Microsoft" },
  { key: "github", label: "GitHub" },
  { key: "linuxdo", label: "Linux.do" }
];

export function WebLogin({
  configured,
  errorMessage,
  pendingProvider = null,
  onManualCallbackSignIn,
  onSignIn,
  onTrialSignIn
}: WebLoginProps): React.JSX.Element {
  const { language, t } = useI18n();
  const isChinese = language === "zh";
  const [debugModeEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.sessionStorage.getItem(DEBUG_UNLOCK_STORAGE_KEY) === "true";
  });
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugProvider, setDebugProvider] = useState<LoginProvider>("google");
  const [debugCallbackUrl, setDebugCallbackUrl] = useState("");
  const [debugError, setDebugError] = useState<string | null>(null);
  const [debugSubmitting, setDebugSubmitting] = useState(false);
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialInput, setTrialInput] = useState("");
  const [trialError, setTrialError] = useState<string | null>(null);
  const [trialSubmitting, setTrialSubmitting] = useState(false);
  const [brandTapCount, setBrandTapCount] = useState(0);

  useEffect(() => {
    if (brandTapCount === 0 || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBrandTapCount(0);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [brandTapCount]);

  const handleBrandTap = (): void => {
    const nextTapCount = brandTapCount + 1;

    if (nextTapCount >= 3) {
      setBrandTapCount(0);
      setTrialInput("");
      setTrialError(null);
      setTrialDialogOpen(true);
      return;
    }

    setBrandTapCount(nextTapCount);
  };

  const handleDebugSubmit = async (): Promise<void> => {
    setDebugSubmitting(true);
    setDebugError(null);

    const nextError = await onManualCallbackSignIn(debugProvider, debugCallbackUrl);

    if (nextError) {
      setDebugError(nextError);
      setDebugSubmitting(false);
      return;
    }

    setDebugSubmitting(false);
    setDebugDialogOpen(false);
  };

  const handleTrialSubmit = async (): Promise<void> => {
    if (trialInput !== "FluxaMap") {
      setTrialError(t("FluxaMap is required to enter trial mode."));
      return;
    }

    setTrialSubmitting(true);
    setTrialError(null);

    const nextError = await onTrialSignIn();

    if (nextError) {
      setTrialError(nextError);
      setTrialSubmitting(false);
      return;
    }

    setTrialSubmitting(false);
    setTrialDialogOpen(false);
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#fafafa] px-5 py-8 text-[#2a2933] sm:px-8 sm:py-10 lg:px-12 xl:px-16">
      <div className="grid w-full max-w-[460px] items-center justify-center gap-8 sm:gap-10 lg:max-w-[881px] lg:grid-cols-[324px_1px_460px] lg:gap-x-12 lg:gap-y-0">
        <section className="mx-auto flex w-full max-w-[324px] flex-col items-center text-center lg:mx-0 lg:items-start lg:text-left">
          <div className="flex items-center gap-3">
            <FluxaBrandWordmark compact onActivate={handleBrandTap} />
            {debugModeEnabled ? (
              <button
                className="rounded-pill border border-[#d9d9db] bg-white px-2.5 py-1 text-[11px] font-medium leading-4 text-[#616167]"
                onClick={() => setDebugDialogOpen(true)}
                type="button"
              >
                {t("Debug Mode")}
              </button>
            ) : null}
          </div>
          <h1 className="mt-7 text-[clamp(2.25rem,4.8vw,3.2rem)] font-semibold leading-[1.08] tracking-[-0.045em] sm:mt-8">
            {isChinese ? t("Sign in to") : "Sign in to"}
            <br />
            <button className="cursor-default appearance-none border-0 bg-transparent p-0 text-inherit" onClick={handleBrandTap} type="button">
              Fluxa Map
            </button>
          </h1>
          <p className="mt-4 text-[15px] leading-6 text-[#616167] sm:text-base">{t("Choose a provider to continue.")}</p>
          <p className="mt-8 max-w-[324px] text-[13px] leading-5 text-[#939399] sm:mt-10">
            {t("A shared workspace for payment locations, brand coverage, and field verification.")}
          </p>
          {errorMessage ? <p className="mt-4 max-w-[324px] text-[13px] leading-5 text-[#f04f38]">{errorMessage}</p> : null}
        </section>

        <div aria-hidden="true" className="mx-auto hidden h-[158px] w-px bg-[#d9d9db] lg:block" />

        <section className="mx-auto w-full max-w-[460px] rounded-[24px] border border-[#d9d9db] bg-white p-5 shadow-[0_12px_32px_-28px_rgba(42,41,51,0.7)] sm:p-7 lg:p-8">
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <ProviderButton configured={configured} onClick={onSignIn} pendingProvider={pendingProvider} provider="google" />
            <ProviderButton configured={configured} onClick={onSignIn} pendingProvider={pendingProvider} provider="azure" />
            <ProviderButton configured={configured} onClick={onSignIn} pendingProvider={pendingProvider} provider="github" />
            <ProviderButton configured={configured} onClick={onSignIn} pendingProvider={pendingProvider} provider="linuxdo" />
          </div>
        </section>
      </div>

      <Dialog onOpenChange={setTrialDialogOpen} open={trialDialogOpen}>
        <DialogContent className="max-w-md gap-5 rounded-[28px] p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>{t("Trial Login")}</DialogTitle>
            <DialogDescription>{t("Enter FluxaMap to continue.")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-6 text-[var(--foreground)]" htmlFor="trial-passphrase">
              {t("Trial Passphrase")}
            </label>
            <Input
              autoFocus
              id="trial-passphrase"
              onChange={(event) => setTrialInput(event.target.value)}
              placeholder={t("Enter FluxaMap")}
              value={trialInput}
            />
          </div>

          {trialError ? <p className="text-sm leading-6 text-[#f04f38]">{trialError}</p> : null}

          <DialogFooter>
            <Button onClick={() => setTrialDialogOpen(false)} type="button" variant="ghost">
              {t("Cancel")}
            </Button>
            <Button disabled={trialSubmitting || !trialInput.trim()} onClick={() => void handleTrialSubmit()} type="button">
              {trialSubmitting ? t("Signing in...") : t("Start Trial")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDebugDialogOpen} open={debugDialogOpen}>
        <DialogContent className="max-w-xl gap-5 rounded-[28px] p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>{t("Debug OAuth Login")}</DialogTitle>
            <DialogDescription>
              {t("Paste a full callback link from Google, Microsoft, GitHub, or Linux.do to create a Supabase session without running the redirect flow on this page.")}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {DEBUG_PROVIDER_OPTIONS.map((provider) => (
              <button
                className={cn(
                  "rounded-pill border px-3 py-2 text-sm font-medium leading-5 transition-colors",
                  debugProvider === provider.key
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--input)] bg-white text-[var(--foreground)] hover:bg-[var(--accent)]"
                )}
                key={provider.key}
                onClick={() => setDebugProvider(provider.key)}
                type="button"
              >
                {provider.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-6 text-[var(--foreground)]" htmlFor="debug-callback-url">
              {t("Callback Link")}
            </label>
            <textarea
              className="min-h-[148px] w-full rounded-[20px] border border-[var(--input)] bg-white px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--border-hover)] focus:ring-2 focus:ring-[var(--ring)]"
              id="debug-callback-url"
              onChange={(event) => setDebugCallbackUrl(event.target.value)}
              placeholder={t("Paste the complete callback URL, or raw access_token / refresh_token parameters here.")}
              value={debugCallbackUrl}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-6 text-[var(--foreground)]" htmlFor="debug-redirect-origin">
              {t("Current Redirect Origin")}
            </label>
            <Input disabled id="debug-redirect-origin" value={typeof window === "undefined" ? "" : window.location.origin} />
          </div>

          <div className="rounded-[20px] border border-[#d9d9db] bg-[#f8f8f9] px-4 py-3 text-[13px] leading-5 text-[#616167]">
            {t("Links that already include access_token and refresh_token can sign in directly. Code-only links can only be exchanged if the same browser has already started that OAuth flow.")}
          </div>

          {debugError ? <p className="text-sm leading-6 text-[#f04f38]">{debugError}</p> : null}

          <DialogFooter>
            <Button onClick={() => setDebugDialogOpen(false)} type="button" variant="ghost">
              {t("Cancel")}
            </Button>
            <Button disabled={debugSubmitting || !debugCallbackUrl.trim()} onClick={() => void handleDebugSubmit()} type="button">
              {debugSubmitting ? t("Signing in...") : t("Create Session")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
