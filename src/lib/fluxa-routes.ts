import type { SidebarTab } from "@/components/fluxa-sidebar";

export type AdminSection = "overview" | "reports" | "users" | "stats";
export type FluxaPageView = SidebarTab | "detail" | "brandDetail" | "admin";

export interface FluxaPageRoute {
  view: FluxaPageView;
  adminSection?: AdminSection;
  locationId?: string;
  brandId?: string;
  from?: SidebarTab;
}

export function isSidebarTab(value: string): value is SidebarTab {
  return value === "map" || value === "list" || value === "brands" || value === "profile" || value === "history";
}

function normalizeFrom(value: string | null): SidebarTab | undefined {
  return value && isSidebarTab(value) ? value : undefined;
}

export function parseFluxaPageRoute(pathname: string, search: string): FluxaPageRoute {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  const query = new URLSearchParams(search);
  const from = normalizeFrom(query.get("from"));

  if (cleanPath === "/" || cleanPath === "/map") {
    return { view: "map" };
  }

  if (cleanPath === "/list") {
    return { view: "list" };
  }

  if (cleanPath === "/brands") {
    return { view: "brands" };
  }

  if (cleanPath === "/profile") {
    return { view: "profile" };
  }

  if (cleanPath === "/history") {
    return { view: "history" };
  }

  if (cleanPath === "/admin") {
    return { view: "admin", adminSection: "overview" };
  }

  if (cleanPath === "/admin/reports") {
    return { view: "admin", adminSection: "reports" };
  }

  if (cleanPath === "/admin/users") {
    return { view: "admin", adminSection: "users" };
  }

  if (cleanPath === "/admin/stats") {
    return { view: "admin", adminSection: "stats" };
  }

  const brandDetailMatch = cleanPath.match(/^\/brands\/([^/]+)$/);
  if (brandDetailMatch) {
    return {
      view: "brandDetail",
      brandId: decodeURIComponent(brandDetailMatch[1]),
      from
    };
  }

  const detailMatch = cleanPath.match(/^\/locations\/([^/]+)$/);
  if (detailMatch) {
    return {
      view: "detail",
      locationId: decodeURIComponent(detailMatch[1]),
      from
    };
  }

  return { view: "map" };
}

export function buildFluxaPagePath(route: FluxaPageRoute): string {
  if (route.view === "brandDetail" && route.brandId) {
    const query = new URLSearchParams();
    if (route.from) {
      query.set("from", route.from);
    }
    const suffix = query.toString();
    return `/brands/${encodeURIComponent(route.brandId)}${suffix ? `?${suffix}` : ""}`;
  }

  if (route.view === "detail" && route.locationId) {
    const query = new URLSearchParams();
    if (route.from) {
      query.set("from", route.from);
    }
    const suffix = query.toString();
    return `/locations/${encodeURIComponent(route.locationId)}${suffix ? `?${suffix}` : ""}`;
  }

  if (route.view === "admin") {
    if (!route.adminSection || route.adminSection === "overview") {
      return "/admin";
    }

    return `/admin/${route.adminSection}`;
  }

  return route.view === "map" ? "/map" : `/${route.view}`;
}
