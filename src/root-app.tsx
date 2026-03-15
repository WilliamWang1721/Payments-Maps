import { useEffect, useMemo, useState } from "react";
import type React from "react";
import type { AuthError, Session } from "@supabase/supabase-js";

import App from "./App";
import { WebLogin, type LoginProvider } from "@/components/web-login";
import { useI18n } from "@/i18n";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

function deriveViewerName(session: Session | null): string {
  const metadata = session?.user.user_metadata;
  const preferredName = metadata?.full_name || metadata?.name || metadata?.user_name || metadata?.preferred_username;

  if (typeof preferredName === "string" && preferredName.trim()) {
    return preferredName.trim();
  }

  const email = session?.user.email;
  if (email) {
    return email.split("@")[0] || "Joe Doe";
  }

  return "Joe Doe";
}

function normalizeAuthError(error: AuthError): string {
  if (error.message.includes("Unsupported provider")) {
    return "This sign-in provider is not enabled in Supabase.";
  }

  if (error.message.includes("provider is not enabled")) {
    return "This sign-in provider is not enabled in Supabase.";
  }

  return error.message;
}

function parseManualCallbackInput(input: string): { accessToken: string | null; refreshToken: string | null; code: string | null } {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Please paste a callback link first.");
  }

  let normalizedUrl: URL;

  if (/^https?:\/\//i.test(trimmed)) {
    normalizedUrl = new URL(trimmed);
  } else if (trimmed.startsWith("#") || trimmed.startsWith("?")) {
    normalizedUrl = new URL(`${window.location.origin}/${trimmed}`);
  } else if (trimmed.includes("access_token=") || trimmed.includes("refresh_token=")) {
    normalizedUrl = new URL(`${window.location.origin}/#${trimmed.replace(/^#/, "")}`);
  } else if (trimmed.includes("code=")) {
    normalizedUrl = new URL(`${window.location.origin}/?${trimmed.replace(/^\?/, "")}`);
  } else {
    throw new Error("The callback link format is not recognized.");
  }

  const hashParams = new URLSearchParams(normalizedUrl.hash.startsWith("#") ? normalizedUrl.hash.slice(1) : normalizedUrl.hash);
  const searchParams = normalizedUrl.searchParams;

  return {
    accessToken: hashParams.get("access_token") || searchParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token") || searchParams.get("refresh_token"),
    code: searchParams.get("code") || hashParams.get("code")
  };
}

function normalizeManualCallbackError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("PKCE code verifier not found")) {
      return "This callback only contains a code. Start the OAuth flow in this browser first, or use a callback link that already includes access_token and refresh_token.";
    }

    if (error.message.includes("Auth session missing")) {
      return "This callback link does not contain a usable session token.";
    }

    return error.message;
  }

  return "Manual callback login failed.";
}

export default function RootApp(): React.JSX.Element {
  const { t } = useI18n();
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<LoginProvider | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Failed to read Supabase session.", error);
      }

      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setPendingProvider(null);
      setAuthError(null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const viewerName = useMemo(() => deriveViewerName(session), [session]);
  const viewerEmail = session?.user.email ?? "joe@acmecorp.com";

  const handleSignIn = async (provider: LoginProvider): Promise<void> => {
    setAuthError(null);

    if (!isSupabaseConfigured) {
      setAuthError(t("Supabase auth is not configured for this workspace."));
      return;
    }

    if (provider === "linuxdo") {
      setAuthError(t("Linux.do sign-in is not configured yet."));
      return;
    }

    setPendingProvider(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      setPendingProvider(null);
      setAuthError(t(normalizeAuthError(error)));
    }
  };

  const handleManualCallbackSignIn = async (_provider: LoginProvider, callbackUrl: string): Promise<string | null> => {
    if (!isSupabaseConfigured) {
      return t("Supabase auth is not configured for this workspace.");
    }

    try {
      const { accessToken, refreshToken, code } = parseManualCallbackInput(callbackUrl);

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        return error ? t(normalizeManualCallbackError(error)) : null;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return error ? t(normalizeManualCallbackError(error)) : null;
      }

      return t("This callback link does not contain a usable session token.");
    } catch (error) {
      return t(normalizeManualCallbackError(error));
    }
  };

  const handleSignOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out from Supabase.", error);
      return;
    }

    window.history.replaceState(null, "", "/");
    setSession(null);
  };

  if (!authReady) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-[#fafafa] px-6 py-8 text-[#2a2933]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-full border border-[#d9d9db] bg-white shadow-[0_8px_24px_-20px_rgba(42,41,51,0.3)]" />
          <p className="text-sm leading-6 text-[#616167]">{t("Loading workspace...")}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <WebLogin
        configured={isSupabaseConfigured}
        errorMessage={authError}
        onManualCallbackSignIn={handleManualCallbackSignIn}
        onSignIn={handleSignIn}
        pendingProvider={pendingProvider}
      />
    );
  }

  return (
    <App
      accessToken={session?.access_token ?? ""}
      onSignOut={handleSignOut}
      refreshToken={session?.refresh_token ?? ""}
      viewerEmail={viewerEmail}
      viewerName={viewerName}
    />
  );
}
