import { useDeferredValue, useMemo, useState } from "react";
import type React from "react";
import { ArrowLeft, ChevronRight, FileWarning, RefreshCcw, ShieldAlert, Users } from "lucide-react";

import { AdminLocationErrorReports } from "@/components/admin-location-error-reports";
import { useAdminLocationErrorReports } from "@/hooks/use-admin-location-error-reports";
import { useAdminStatistics } from "@/hooks/use-admin-statistics";
import { useAdminUsers } from "@/hooks/use-admin-users";
import { useI18n } from "@/i18n";
import type { AdminSection } from "@/lib/fluxa-routes";

interface AdminDashboardProps {
  accessToken?: string;
  adminSection: AdminSection;
  isAdmin: boolean;
  onNavigate: (section: AdminSection) => void;
  onOpenLocation: (locationId: string) => Promise<void>;
  onReturnToApp?: () => void;
}

interface SidebarLinkProps {
  active?: boolean;
  label: string;
  onClick: () => void;
}

function SidebarLink({
  active = false,
  label,
  onClick
}: SidebarLinkProps): React.JSX.Element {
  return (
    <button
      className={`flex w-full items-center justify-between gap-3 border-b px-0 py-3 text-left text-sm transition-colors duration-200 ${
        active
          ? "border-[var(--foreground)] text-[var(--foreground)]"
          : "border-[rgba(42,41,51,0.12)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <ChevronRight className={`h-4 w-4 ${active ? "opacity-100" : "opacity-40"}`} />
    </button>
  );
}

function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function renderLoadingRow(label: string): React.JSX.Element {
  return (
    <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
      {label}
    </div>
  );
}

export function AdminDashboard({
  accessToken,
  adminSection,
  isAdmin,
  onNavigate,
  onOpenLocation,
  onReturnToApp
}: AdminDashboardProps): React.JSX.Element {
  const { language, t } = useI18n();
  const [userQuery, setUserQuery] = useState("");
  const deferredUserQuery = useDeferredValue(userQuery);
  const dateLocale =
    language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : language === "ru" ? "ru-RU" : language === "en" ? "en-US" : "zh-CN";

  const {
    reports,
    loading: reportsLoading,
    error: reportsError,
    refreshReports
  } = useAdminLocationErrorReports({
    enabled: isAdmin && (adminSection === "overview" || adminSection === "reports")
  });
  const {
    users,
    total: userTotal,
    loading: usersLoading,
    error: usersError,
    generatedAt: usersGeneratedAt,
    refreshUsers
  } = useAdminUsers({
    accessToken,
    enabled: isAdmin && (adminSection === "overview" || adminSection === "users"),
    limit: adminSection === "overview" ? 8 : 120,
    query: deferredUserQuery
  });
  const {
    statistics,
    loading: statisticsLoading,
    error: statisticsError,
    refreshStatistics
  } = useAdminStatistics({
    accessToken,
    enabled: isAdmin && adminSection === "stats",
    topN: 10
  });

  const pageLabel = useMemo(() => {
    if (adminSection === "reports") {
      return t("Error Reports");
    }
    if (adminSection === "users") {
      return t("User Management");
    }
    if (adminSection === "stats") {
      return t("Data Statistics");
    }
    return t("Workbench Home");
  }, [adminSection, t]);

  const recentReports = reports.slice(0, 8);

  const handleRefresh = (): void => {
    if (adminSection === "reports") {
      void refreshReports();
      return;
    }

    if (adminSection === "users") {
      void refreshUsers();
      return;
    }

    if (adminSection === "stats") {
      void refreshStatistics();
      return;
    }

    void Promise.all([refreshReports(), refreshUsers()]);
  };

  if (!isAdmin) {
    return (
      <section className="flex min-h-dvh w-full items-center justify-center bg-[#F7F7F6] px-6 py-10">
        <div className="w-full max-w-3xl border border-[rgba(42,41,51,0.10)] bg-white px-8 py-10">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{t("Admin Access Required")}</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] text-[var(--foreground)]">Fluxa Map 管理后台</h1>
          <div className="mt-8 flex items-start gap-4 border-t border-[rgba(42,41,51,0.08)] pt-6">
            <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
            <div>
              <p className="text-base font-medium text-[var(--foreground)]">{t("Only administrators can access the standalone admin dashboard.")}</p>
              <p className="mt-2 text-sm leading-[1.8] text-[var(--muted-foreground)]">
                {t("Sign in with an administrator account to open the error queue, user management, and detailed statistics pages.")}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex min-h-dvh w-full bg-[#F7F7F6]">
      <aside className="hidden w-[248px] shrink-0 border-r border-[rgba(42,41,51,0.08)] bg-[#F1F1F0] px-6 py-7 lg:flex lg:flex-col">
        <button className="text-left" onClick={() => onNavigate("overview")} type="button">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{t("Admin Console")}</p>
          <p className="mt-3 text-[22px] font-semibold leading-[1.2] text-[var(--foreground)]">Fluxa Map 管理后台</p>
        </button>

        <button
          className={`mt-10 flex items-center justify-between border-b px-0 py-3 text-left text-sm transition-colors duration-200 ${
            adminSection === "overview"
              ? "border-[var(--foreground)] text-[var(--foreground)]"
              : "border-[rgba(42,41,51,0.12)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => onNavigate("overview")}
          type="button"
        >
          <span>{t("Workbench Home")}</span>
          <ChevronRight className={`h-4 w-4 ${adminSection === "overview" ? "opacity-100" : "opacity-40"}`} />
        </button>

        <div className="mt-8">
          <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{t("Pages")}</p>
          <nav className="mt-3">
            <SidebarLink active={adminSection === "reports"} label={t("Error Reports")} onClick={() => onNavigate("reports")} />
            <SidebarLink active={adminSection === "users"} label={t("User Management")} onClick={() => onNavigate("users")} />
            <SidebarLink active={adminSection === "stats"} label={t("Data Statistics")} onClick={() => onNavigate("stats")} />
          </nav>
        </div>

        <div className="mt-auto space-y-4 border-t border-[rgba(42,41,51,0.08)] pt-5">
          {onReturnToApp ? (
            <button
              className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--foreground)]"
              onClick={onReturnToApp}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t("Return to Main App")}</span>
            </button>
          ) : null}
          <p className="text-xs leading-[1.8] text-[var(--muted-foreground)]">
            {t("This backend is isolated from the public app shell and only serves administrator workflows.")}
          </p>
        </div>
      </aside>

      <main className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="border-b border-[rgba(42,41,51,0.08)] bg-[#F7F7F6] px-6 py-6 lg:px-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-[40px] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--foreground)]">{pageLabel}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onReturnToApp ? (
                <button
                  className="inline-flex h-10 items-center gap-2 border border-[rgba(42,41,51,0.12)] bg-white px-4 text-sm text-[var(--foreground)] transition-colors duration-200 hover:bg-[rgba(42,41,51,0.03)] lg:hidden"
                  onClick={onReturnToApp}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t("Return to Main App")}</span>
                </button>
              ) : null}
              <button
                className="inline-flex h-10 items-center gap-2 border border-[rgba(42,41,51,0.12)] bg-white px-4 text-sm text-[var(--foreground)] transition-colors duration-200 hover:bg-[rgba(42,41,51,0.03)]"
                onClick={handleRefresh}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                <span>{t("Refresh")}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-6 lg:px-10">
          {adminSection === "overview" ? (
            <div className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <section className="border border-[rgba(42,41,51,0.10)] bg-white">
                <div className="flex items-center justify-between border-b border-[rgba(42,41,51,0.08)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-[var(--foreground)]" />
                    <h2 className="text-sm font-medium text-[var(--foreground)]">{t("Recent Error Report Queue")}</h2>
                  </div>
                  <button className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onNavigate("reports")} type="button">
                    {t("View Full Page")}
                  </button>
                </div>

                {reportsError ? (
                  <div className="px-4 py-6 text-sm leading-[1.8] text-[var(--muted-foreground)]">{reportsError}</div>
                ) : reportsLoading ? (
                  renderLoadingRow(t("Loading recent error reports..."))
                ) : recentReports.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[var(--muted-foreground)]">{t("No error reports yet.")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[rgba(42,41,51,0.08)] text-xs text-[var(--muted-foreground)]">
                          <th className="px-4 py-3 font-medium">{t("Status")}</th>
                          <th className="px-4 py-3 font-medium">{t("Summary")}</th>
                          <th className="px-4 py-3 font-medium">{t("Location")}</th>
                          <th className="px-4 py-3 font-medium">{t("Reporter")}</th>
                          <th className="px-4 py-3 font-medium">{t("Created At")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentReports.map((report) => (
                          <tr className="border-b border-[rgba(42,41,51,0.06)] text-sm last:border-b-0" key={report.id}>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{report.status}</td>
                            <td className="px-4 py-3 text-[var(--foreground)]">{report.summary}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{report.locationSnapshot.name}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{report.reporterLabel}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(report.createdAt, dateLocale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="border border-[rgba(42,41,51,0.10)] bg-white">
                <div className="flex items-center justify-between border-b border-[rgba(42,41,51,0.08)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--foreground)]" />
                    <h2 className="text-sm font-medium text-[var(--foreground)]">{t("User List")}</h2>
                  </div>
                  <button className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onNavigate("users")} type="button">
                    {t("View Full Page")}
                  </button>
                </div>

                {usersError ? (
                  <div className="px-4 py-6 text-sm leading-[1.8] text-[var(--muted-foreground)]">{usersError}</div>
                ) : usersLoading ? (
                  renderLoadingRow(t("Loading user list..."))
                ) : users.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-[var(--muted-foreground)]">{t("No users found.")}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-[rgba(42,41,51,0.08)] text-xs text-[var(--muted-foreground)]">
                          <th className="px-4 py-3 font-medium">{t("User")}</th>
                          <th className="px-4 py-3 font-medium">{t("Role")}</th>
                          <th className="px-4 py-3 font-medium">{t("Joined At")}</th>
                          <th className="px-4 py-3 font-medium">{t("Locations Added")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr className="border-b border-[rgba(42,41,51,0.06)] text-sm last:border-b-0" key={user.id}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-[var(--foreground)]">{user.name}</div>
                              <div className="mt-1 text-xs text-[var(--muted-foreground)]">{user.email}</div>
                            </td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.isAdmin ? t("Administrator") : t("User")}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDate(user.joinedAt, dateLocale)}</td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.locationsAdded}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {adminSection === "reports" ? (
            <section className="border border-[rgba(42,41,51,0.10)] bg-white">
              <AdminLocationErrorReports
                embedded
                isAdmin={isAdmin}
                onOpenLocation={onOpenLocation}
                showHeader={false}
              />
            </section>
          ) : null}

          {adminSection === "users" ? (
            <section className="border border-[rgba(42,41,51,0.10)] bg-white">
              <div className="flex flex-col gap-4 border-b border-[rgba(42,41,51,0.08)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-medium text-[var(--foreground)]">{t("User Management")}</h2>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {usersGeneratedAt ? `${t("Generated At")}: ${formatDateTime(usersGeneratedAt, dateLocale)}` : t("Generated At") + ": —"}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="text-xs text-[var(--muted-foreground)]">{t("Total Users")}: {userTotal}</div>
                  <input
                    className="h-10 min-w-[240px] border border-[rgba(42,41,51,0.12)] bg-white px-3 text-sm text-[var(--foreground)] outline-none"
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder={t("Search users by name, email, location, or id")}
                    type="text"
                    value={userQuery}
                  />
                </div>
              </div>

              {usersError ? (
                <div className="px-4 py-6 text-sm leading-[1.8] text-[var(--muted-foreground)]">{usersError}</div>
              ) : usersLoading ? (
                renderLoadingRow(t("Loading user list..."))
              ) : users.length === 0 ? (
                <div className="px-4 py-6 text-sm text-[var(--muted-foreground)]">{t("No users found.")}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[rgba(42,41,51,0.08)] text-xs text-[var(--muted-foreground)]">
                        <th className="px-4 py-3 font-medium">{t("User")}</th>
                        <th className="px-4 py-3 font-medium">{t("Role")}</th>
                        <th className="px-4 py-3 font-medium">{t("Location")}</th>
                        <th className="px-4 py-3 font-medium">{t("Joined At")}</th>
                        <th className="px-4 py-3 font-medium">{t("Last Sign In")}</th>
                        <th className="px-4 py-3 font-medium">{t("Locations Added")}</th>
                        <th className="px-4 py-3 font-medium">{t("Reviews")}</th>
                        <th className="px-4 py-3 font-medium">{t("Error Reports")}</th>
                        <th className="px-4 py-3 font-medium">{t("MCP Sessions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr className="border-b border-[rgba(42,41,51,0.06)] text-sm last:border-b-0" key={user.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-[var(--foreground)]">{user.name}</div>
                            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{user.email}</div>
                          </td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.isAdmin ? t("Administrator") : t("User")}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.location}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDate(user.joinedAt, dateLocale)}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(user.lastSignInAt, dateLocale)}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.locationsAdded}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.reviews}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.errorReports}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)]">{user.mcpSessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {adminSection === "stats" ? (
            <div className="space-y-6">
              <section className="border border-[rgba(42,41,51,0.10)] bg-white">
                <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-3">
                  <h2 className="text-sm font-medium text-[var(--foreground)]">{t("Data Statistics")}</h2>
                </div>

                {statisticsError ? (
                  <div className="px-4 py-6 text-sm leading-[1.8] text-[var(--muted-foreground)]">{statisticsError}</div>
                ) : statisticsLoading || !statistics ? (
                  renderLoadingRow(t("Loading statistics..."))
                ) : (
                  <div className="grid grid-cols-1 border-t-0 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: t("Total Users"), value: statistics.totals.users },
                      { label: t("Total Locations"), value: statistics.totals.locations },
                      { label: t("New Locations (7d)"), value: statistics.totals.newLocations7d },
                      { label: t("New Locations (30d)"), value: statistics.totals.newLocations30d },
                      { label: t("Active Error Reports"), value: statistics.totals.openErrorReports },
                      { label: t("Public Cards"), value: statistics.totals.publicCards },
                      { label: t("POS Locations"), value: statistics.totals.posLocations },
                      { label: t("Fluxa Locations"), value: statistics.totals.fluxaLocations }
                    ].map((item) => (
                      <div className="border-b border-r border-[rgba(42,41,51,0.08)] px-4 py-4" key={item.label}>
                        <div className="text-xs text-[var(--muted-foreground)]">{item.label}</div>
                        <div className="mt-2 text-[28px] font-semibold leading-none text-[var(--foreground)]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {statistics ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className="border border-[rgba(42,41,51,0.10)] bg-white">
                    <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">{t("Recent Location Growth")}</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-[rgba(42,41,51,0.08)] text-xs text-[var(--muted-foreground)]">
                            <th className="px-4 py-3 font-medium">{t("Date")}</th>
                            <th className="px-4 py-3 font-medium">{t("New Locations")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statistics.recentLocationSeries.map((item) => (
                            <tr className="border-b border-[rgba(42,41,51,0.06)] text-sm last:border-b-0" key={item.date}>
                              <td className="px-4 py-3 text-[var(--muted-foreground)]">{item.date}</td>
                              <td className="px-4 py-3 text-[var(--foreground)]">{item.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="border border-[rgba(42,41,51,0.10)] bg-white">
                    <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">{t("Location Detail Breakdowns")}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      <div className="border-b border-r border-[rgba(42,41,51,0.08)] px-4 py-4">
                        <div className="text-xs text-[var(--muted-foreground)]">{t("By Status")}</div>
                        <div className="mt-3 space-y-2">
                          {statistics.locationStatusBreakdown.map((item) => (
                            <div className="flex items-center justify-between text-sm" key={item.status}>
                              <span className="text-[var(--muted-foreground)]">{item.status}</span>
                              <span className="text-[var(--foreground)]">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-4">
                        <div className="text-xs text-[var(--muted-foreground)]">{t("By Source")}</div>
                        <div className="mt-3 space-y-2">
                          {statistics.locationSourceBreakdown.map((item) => (
                            <div className="flex items-center justify-between text-sm" key={item.source}>
                              <span className="text-[var(--muted-foreground)]">{item.source}</span>
                              <span className="text-[var(--foreground)]">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-r border-[rgba(42,41,51,0.08)] px-4 py-4">
                        <div className="text-xs text-[var(--muted-foreground)]">{t("Top Cities")}</div>
                        <div className="mt-3 space-y-2">
                          {statistics.topCities.map((item) => (
                            <div className="flex items-center justify-between text-sm" key={item.city}>
                              <span className="text-[var(--muted-foreground)]">{item.city}</span>
                              <span className="text-[var(--foreground)]">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="px-4 py-4">
                        <div className="text-xs text-[var(--muted-foreground)]">{t("Top Brands")}</div>
                        <div className="mt-3 space-y-2">
                          {statistics.topBrands.map((item) => (
                            <div className="flex items-center justify-between text-sm" key={item.brand}>
                              <span className="text-[var(--muted-foreground)]">{item.brand}</span>
                              <span className="text-[var(--foreground)]">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="border border-[rgba(42,41,51,0.10)] bg-white xl:col-span-2">
                    <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-3 text-sm font-medium text-[var(--foreground)]">{t("Detailed Location Intelligence")}</div>
                    <div className="grid grid-cols-1 gap-0 xl:grid-cols-2">
                      <div className="border-b border-r border-[rgba(42,41,51,0.08)]">
                        <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-3 text-xs text-[var(--muted-foreground)]">{t("Top Contributors")}</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-[rgba(42,41,51,0.08)] text-xs text-[var(--muted-foreground)]">
                                <th className="px-4 py-3 font-medium">{t("User")}</th>
                                <th className="px-4 py-3 font-medium">{t("Locations Added")}</th>
                                <th className="px-4 py-3 font-medium">{t("Last Contribution")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statistics.topContributors.map((item) => (
                                <tr className="border-b border-[rgba(42,41,51,0.06)] text-sm last:border-b-0" key={item.userId}>
                                  <td className="px-4 py-3 text-[var(--foreground)]">{item.userLabel}</td>
                                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{item.locationCount}</td>
                                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(item.latestContributionAt, dateLocale)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <div className="border-b border-[rgba(42,41,51,0.08)] px-4 py-3 text-xs text-[var(--muted-foreground)]">{t("Newest Locations")}</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse text-left">
                            <thead>
                              <tr className="border-b border-[rgba(42,41,51,0.08)] text-xs text-[var(--muted-foreground)]">
                                <th className="px-4 py-3 font-medium">{t("Location")}</th>
                                <th className="px-4 py-3 font-medium">{t("Source")}</th>
                                <th className="px-4 py-3 font-medium">{t("Created At")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {statistics.newestLocations.map((item) => (
                                <tr className="border-b border-[rgba(42,41,51,0.06)] text-sm last:border-b-0" key={item.id}>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-[var(--foreground)]">{item.name}</div>
                                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">{item.brand} · {item.city}</div>
                                  </td>
                                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{item.source}</td>
                                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(item.createdAt, dateLocale)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
