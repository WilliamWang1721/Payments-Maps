import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { BadgeDollarSign, EllipsisVertical, History, Images, List, LogOut, Map, PanelLeft, Plus, Settings, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type SidebarTab = "map" | "list" | "brands" | "profile" | "history";

interface FluxaSidebarProps {
  activeTab: SidebarTab;
  accessToken?: string;
  onTabChange: (tab: SidebarTab) => void;
  onAddLocation?: () => void;
  onAddBrand?: () => void;
  onAddCard?: () => void;
  isCardsView?: boolean;
  onOpenAlbum?: () => void;
  onOpenSettings?: () => void;
  onSignOut?: () => Promise<void> | void;
  refreshToken?: string;
  viewerEmail?: string;
  viewerName?: string;
}

export function FluxaSidebar({
  activeTab,
  accessToken = "",
  onTabChange,
  onAddLocation,
  onAddBrand,
  onAddCard,
  isCardsView = false,
  onOpenAlbum,
  onOpenSettings,
  onSignOut,
  refreshToken = "",
  viewerEmail = "joe@acmecorp.com",
  viewerName = "Joe Doe"
}: FluxaSidebarProps): React.JSX.Element {
  const { t } = useI18n();
  const [collapsedLabels, setCollapsedLabels] = useState(false);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"access" | "refresh" | "payload" | null>(null);
  const desktopSidebarWidth = collapsedLabels ? "md:w-[88px] md:basis-[88px]" : "md:w-[clamp(220px,18vw,240px)] md:basis-[clamp(220px,18vw,240px)]";
  const desktopLabelVisibility = collapsedLabels ? "md:hidden" : "";
  const desktopNavAlignment = collapsedLabels ? "md:justify-center md:px-0" : "md:justify-start md:px-5 lg:px-6";
  const sidebarToggleButtonClass =
    "ui-hover-shadow h-10 w-10 place-items-center rounded-full border border-[var(--input)] bg-white text-[var(--sidebar-foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293333]";
  const debugPayload = useMemo(() => {
    const params = new URLSearchParams();

    if (accessToken) {
      params.set("access_token", accessToken);
    }

    if (refreshToken) {
      params.set("refresh_token", refreshToken);
    }

    return params.toString();
  }, [accessToken, refreshToken]);

  useEffect(() => {
    if (debugTapCount === 0 || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebugTapCount(0);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debugTapCount]);

  useEffect(() => {
    if (!copiedField || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedField(null);
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedField]);

  const handlePrimaryAddClick = (): void => {
    if (isCardsView) {
      onAddCard?.();
      return;
    }
    if (activeTab === "map" || activeTab === "list") {
      onAddLocation?.();
      return;
    }
    onAddBrand?.();
  };

  const primaryAddLabel = isCardsView ? t("Add Card") : activeTab === "brands" ? t("Add Brand") : t("Add Location");

  const handleViewerNameDebugTap = (): void => {
    if (!accessToken || !refreshToken) {
      return;
    }

    const nextTapCount = debugTapCount + 1;

    if (nextTapCount >= 5) {
      setDebugTapCount(0);
      setCopiedField(null);
      setDebugDialogOpen(true);
      return;
    }

    setDebugTapCount(nextTapCount);
  };

  const handleCopy = async (value: string, field: "access" | "refresh" | "payload"): Promise<void> => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
    } catch (error) {
      console.error(`Failed to copy ${field} token.`, error);
    }
  };

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-[var(--sidebar-border)] bg-[var(--sidebar)] md:h-full ${desktopSidebarWidth} border-b border-x-0 border-t-0 rounded-b-m md:rounded-l-none md:rounded-r-m md:border md:border-l md:border-r`}
    >
      <div className={`flex items-center gap-2 px-4 pb-3 pt-4 md:p-6 ${collapsedLabels ? "md:justify-center md:px-0" : ""}`}>
        <div className={`flex min-w-0 items-center gap-2 ${collapsedLabels ? "md:flex-none" : "flex-1"}`}>
          <div className="relative h-10 w-10">
            <svg
              aria-hidden="true"
              className="absolute left-1 top-1 h-8 w-8 fill-[var(--sidebar-primary-foreground)]"
              viewBox="0 0 32 32"
            >
              <path d="M16 26c1.65686 0 3 1.34314 3 3 0 1.65686-1.34314 3-3 3-1.65686 0-3-1.34314-3-3 0-1.65686 1.34314-3 3-3z m-10-2c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m20 0c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m-10-12c2.20914 0 4 1.79086 4 4 0 2.20914-1.79086 4-4 4-2.20914 0-4-1.79086-4-4 0-2.20914 1.79086-4 4-4z m-13 1c1.65685 0 3 1.34314 3 3 0 1.65686-1.34315 3-3 3-1.65685 0-3-1.34314-3-3 0-1.65686 1.34315-3 3-3z m26 0c1.65686 0 3 1.34314 3 3 0 1.65686-1.34314 3-3 3-1.65686 0-3-1.34314-3-3 0-1.65686 1.34314-3 3-3z m-23-9c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m20 0c1.10457 0 2 0.89543 2 2 0 1.10457-0.89543 2-2 2-1.10457 0-2-0.89543-2-2 0-1.10457 0.89543-2 2-2z m-10-4c1.65686 0 3 1.34315 3 3 0 1.65685-1.34314 3-3 3-1.65686 0-3-1.34315-3-3 0-1.65685 1.34314-3 3-3z" />
            </svg>
          </div>
          <p className={`truncate text-sm font-semibold leading-[1.5] text-[var(--sidebar-primary-foreground)] ${desktopLabelVisibility}`}>FLUXA</p>
        </div>

        <button
          aria-label="Collapse sidebar"
          className={`${sidebarToggleButtonClass} hidden md:grid ${collapsedLabels ? "md:hidden" : ""}`}
          onClick={() => setCollapsedLabels((prev) => !prev)}
          type="button"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex min-w-0 gap-2 overflow-x-auto px-3 pb-3 md:min-h-0 md:flex-1 md:flex-col md:gap-1.5 md:overflow-x-hidden md:overflow-y-auto md:px-3 md:pb-0 lg:px-4"
      >
        <p className={`hidden shrink-0 px-2 text-xs font-medium leading-8 text-[var(--sidebar-foreground)] md:block ${desktopLabelVisibility}`}>{t("Discover")}</p>

        <button
          className={`ui-hover-shadow flex h-12 min-w-[132px] shrink-0 items-center justify-start gap-2 rounded-[24px] px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--sidebar-accent-hover)] [--hover-outline:#2a293340] [--hover-outline-active:#2a293352] md:min-w-0 ${desktopNavAlignment} ${
            activeTab === "map" ? "bg-[var(--sidebar-accent)]" : ""
          }`}
          onClick={() => onTabChange("map")}
          type="button"
        >
          <Map className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "map" ? "text-[var(--sidebar-accent-foreground)]" : "text-[var(--sidebar-foreground)]"}`} />
          <span className={`flex-1 truncate text-left text-sm font-medium leading-6 text-[var(--sidebar-accent-foreground)] md:text-base ${desktopLabelVisibility}`}>{t("Map")}</span>
        </button>

        <button
          className={`ui-hover-shadow flex h-12 min-w-[132px] shrink-0 items-center justify-start gap-2 rounded-[24px] px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--sidebar-accent-hover)] [--hover-outline:#2a293340] [--hover-outline-active:#2a293352] md:min-w-0 ${desktopNavAlignment} ${
            activeTab === "list" ? "bg-[var(--sidebar-accent)]" : ""
          }`}
          onClick={() => onTabChange("list")}
          type="button"
        >
          <List className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "list" ? "text-[var(--sidebar-accent-foreground)]" : "text-[var(--sidebar-foreground)]"}`} />
          <span className={`flex-1 truncate text-left text-sm font-medium leading-6 text-[var(--sidebar-accent-foreground)] md:text-base ${desktopLabelVisibility}`}>{t("List")}</span>
        </button>

        <button
          className={`ui-hover-shadow flex h-12 min-w-[132px] shrink-0 items-center justify-start gap-2 rounded-[24px] px-4 py-3 text-left transition-colors duration-200 hover:bg-[var(--sidebar-accent-hover)] [--hover-outline:#2a293340] [--hover-outline-active:#2a293352] md:min-w-0 ${desktopNavAlignment} ${
            activeTab === "brands" ? "bg-[var(--sidebar-accent)]" : ""
          }`}
          onClick={() => onTabChange("brands")}
          type="button"
        >
          <BadgeDollarSign className={`h-5 w-5 shrink-0 transition-colors ${activeTab === "brands" ? "text-[var(--sidebar-accent-foreground)]" : "text-[var(--sidebar-foreground)]"}`} />
          <span className={`flex-1 truncate text-left text-sm font-medium leading-6 text-[var(--sidebar-accent-foreground)] md:text-base ${desktopLabelVisibility}`}>{t("Brands")}</span>
        </button>

        <button
          className={`ui-hover-shadow mt-0.5 flex h-10 min-w-[156px] shrink-0 items-center justify-center gap-1.5 rounded-pill bg-[var(--primary)] px-4 py-2.5 text-sm font-medium leading-[1.4286] text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] [--hover-outline:#4134cc73] [--hover-outline-active:#372cb8a6] md:mt-1.5 md:min-w-0 md:w-full ${collapsedLabels ? "md:px-0" : ""}`}
          onClick={handlePrimaryAddClick}
          type="button"
        >
          <Plus className="h-4 w-4" />
          <span className={desktopLabelVisibility}>{primaryAddLabel}</span>
        </button>
      </nav>

      <div className={`border-t border-[var(--sidebar-border)] px-3 py-3 md:border-t-0 ${collapsedLabels ? "md:px-3 md:pb-4 md:pt-0" : "md:px-0 md:py-0"}`}>
        <div className={`flex items-center gap-3 ${collapsedLabels ? "md:flex-col md:items-center md:justify-center" : "md:px-6 md:py-4"}`}>
          {collapsedLabels ? (
            <button
              aria-label="Expand sidebar"
              className={`${sidebarToggleButtonClass} hidden md:grid`}
              onClick={() => setCollapsedLabels(false)}
              type="button"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className={`min-w-0 flex-1 ${desktopLabelVisibility}`}>
              <button
                aria-label="Open debug tokens"
                className="block max-w-full appearance-none border-0 bg-transparent p-0 text-left"
                onClick={handleViewerNameDebugTap}
                type="button"
              >
                <p className="truncate text-base font-semibold leading-6 text-[var(--sidebar-accent-foreground)]">{viewerName}</p>
              </button>
              <p className="hidden truncate text-sm leading-6 text-[var(--sidebar-foreground)] lg:block">{viewerEmail}</p>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Open user menu"
                className={`ui-hover-shadow inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent text-[var(--sidebar-accent-foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--muted-hover)] [--hover-outline:#2a293338] [--hover-outline-active:#2a29334d] ${
                  collapsedLabels ? "md:h-10 md:w-10" : ""
                }`}
                type="button"
              >
                <EllipsisVertical className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={collapsedLabels ? "center" : "end"}
              className="flex min-w-[220px] w-[min(280px,calc(100vw-2rem))] flex-col gap-1.5 overflow-hidden !rounded-m border border-[var(--border)] bg-[var(--card)] p-3 text-[var(--foreground)] !shadow-[0_4px_12px_-4px_#0000001A] md:w-[var(--radix-dropdown-menu-trigger-width)]"
              side="top"
              sideOffset={8}
            >
              <DropdownMenuItem
                className="flex h-10 cursor-pointer items-center gap-2.5 !rounded-xs px-3.5 py-2.5 text-sm font-medium leading-[1.4286] text-[var(--foreground)] outline-none transition-colors data-[highlighted]:!rounded-m data-[highlighted]:bg-[var(--accent)]"
                onSelect={() => onTabChange("profile")}
              >
                <UserRound className="h-4 w-4" />
                {t("Profile")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex h-10 cursor-pointer items-center gap-2.5 !rounded-xs px-3.5 py-2.5 text-sm font-medium leading-[1.4286] text-[var(--foreground)] outline-none transition-colors data-[highlighted]:!rounded-m data-[highlighted]:bg-[var(--accent)]"
                onSelect={() => onTabChange("history")}
              >
                <History className="h-4 w-4" />
                {t("History")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex h-10 cursor-pointer items-center gap-2.5 !rounded-xs px-3.5 py-2.5 text-sm font-medium leading-[1.4286] text-[var(--foreground)] outline-none transition-colors data-[highlighted]:!rounded-m data-[highlighted]:bg-[var(--accent)]"
                onSelect={() => {
                  if (onOpenAlbum) {
                    onOpenAlbum();
                    return;
                  }
                  onTabChange("history");
                }}
              >
                <Images className="h-4 w-4" />
                {t("Cards")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex h-10 cursor-pointer items-center gap-2.5 !rounded-xs px-3.5 py-2.5 text-sm font-medium leading-[1.4286] text-[var(--foreground)] outline-none transition-colors data-[highlighted]:!rounded-m data-[highlighted]:bg-[var(--accent)]"
                onSelect={() => onOpenSettings?.()}
              >
                <Settings className="h-4 w-4" />
                {t("Settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-3 my-1.5 h-px bg-[var(--border)]" />
              <DropdownMenuItem
                className="flex h-10 cursor-pointer items-center gap-2.5 !rounded-xs px-3.5 py-2.5 text-sm font-medium leading-[1.4286] text-[#f04f38] outline-none data-[highlighted]:bg-[#f04f3814] data-[highlighted]:text-[#f04f38]"
                onSelect={() => {
                  if (onSignOut) {
                    void onSignOut();
                    return;
                  }
                  onTabChange("map");
                }}
              >
                <LogOut className="h-4 w-4" />
                {t("Log out")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog onOpenChange={setDebugDialogOpen} open={debugDialogOpen}>
        <DialogContent className="max-w-xl gap-5 rounded-[28px] p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>{t("Debug Session Tokens")}</DialogTitle>
            <DialogDescription>
              {t("Use these tokens with the login page debug mode. Clicking the user name 5 times opens this panel.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium leading-6 text-[var(--foreground)]">Access Token</span>
              <Button disabled={!accessToken} onClick={() => void handleCopy(accessToken, "access")} type="button" variant="secondary">
                {copiedField === "access" ? t("Copied") : t("Copy")}
              </Button>
            </div>
            <textarea
              className="min-h-[104px] w-full rounded-[20px] border border-[var(--input)] bg-white px-4 py-3 text-xs leading-5 text-[var(--foreground)] outline-none"
              readOnly
              value={accessToken}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium leading-6 text-[var(--foreground)]">Refresh Token</span>
              <Button disabled={!refreshToken} onClick={() => void handleCopy(refreshToken, "refresh")} type="button" variant="secondary">
                {copiedField === "refresh" ? t("Copied") : t("Copy")}
              </Button>
            </div>
            <textarea
              className="min-h-[104px] w-full rounded-[20px] border border-[var(--input)] bg-white px-4 py-3 text-xs leading-5 text-[var(--foreground)] outline-none"
              readOnly
              value={refreshToken}
            />
          </div>

          <div className="rounded-[20px] border border-[#d9d9db] bg-[#f8f8f9] px-4 py-3 text-[13px] leading-5 text-[#616167]">
            {t("Paste the combined payload below into the login page debug field to restore this session directly.")}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium leading-6 text-[var(--foreground)]">{t("Debug Login Payload")}</span>
              <Button disabled={!debugPayload} onClick={() => void handleCopy(debugPayload, "payload")} type="button">
                {copiedField === "payload" ? t("Copied") : t("Copy Tokens")}
              </Button>
            </div>
            <textarea
              className="min-h-[92px] w-full rounded-[20px] border border-[var(--input)] bg-white px-4 py-3 text-xs leading-5 text-[var(--foreground)] outline-none"
              readOnly
              value={debugPayload}
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setDebugDialogOpen(false)} type="button" variant="ghost">
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
