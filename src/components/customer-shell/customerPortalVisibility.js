import { NATIVE_INVOICES_ENABLED } from "@/config/features";
// Stable keys shared with the website editor and the server's public-site schema.
export const CUSTOMER_PORTAL_PAGE_IDS = Object.freeze([
  "calendar",
  "courses",
  "memberships",
  "vouchers",
  "studioGuide",
  "bookings",
  "credits",
  "invoices",
  "account",
  "notifications",
  "waitlists",
]);
export const CUSTOMER_PORTAL_NAVIGATION_PAGE_IDS = Object.freeze({
  bookSession: "calendar",
  courses: "courses",
  memberships: "memberships",
  giftVouchers: "vouchers",
  studioGuide: "studioGuide",
});
export const CUSTOMER_PORTAL_PAGE_HREFS = Object.freeze({
  calendar: "/portal?tab=studio-calendar",
  courses: "/portal/courses",
  memberships: "/portal/membership",
  vouchers: "/portal/vouchers",
  studioGuide: "/portal/knowledge",
  bookings: "/portal/bookings",
  credits: "/portal/credits",
  invoices: "/portal/invoices",
  account: "/portal/account",
  notifications: "/portal/notifications",
  waitlists: "/portal/waitlists",
});
const TAB_PAGES = Object.freeze({
  STUDIO_CALENDAR: "calendar",
  MY_BOOKINGS: "bookings",
  VOUCHERS: "vouchers",
  TUTORIALS: "studioGuide",
});
const PAGE_MODULES = Object.freeze({
  calendar: ["bookings", "courses"],
  courses: ["courses"],
  bookings: ["bookings", "courses"],
  memberships: ["memberships"],
  vouchers: ["vouchers"],
  credits: ["credits"],
  invoices: ["payments"],
});
export const normalizeCustomerPortalVisibility = (customerPortal = {}) => ({
  pages: Object.fromEntries(
    CUSTOMER_PORTAL_PAGE_IDS.map((id) => [
      id,
      {
        enabled: customerPortal?.pages?.[id]?.enabled !== false,
      },
    ]),
  ),
  navigation: Object.fromEntries(
    Object.keys(CUSTOMER_PORTAL_NAVIGATION_PAGE_IDS).map((id) => [
      id,
      {
        visible: customerPortal?.navigation?.[id]?.visible !== false,
      },
    ]),
  ),
});
export const isCustomerPortalPageEnabled = (tenant, pageId) =>
  pageId !== "work" &&
  (!CUSTOMER_PORTAL_PAGE_IDS.includes(pageId) ||
    tenant?.publicSite?.customerPortal?.pages?.[pageId]?.enabled !== false);
export const isCustomerPortalNavigationVisible = (tenant, key) =>
  isCustomerPortalPageEnabled(
    tenant,
    CUSTOMER_PORTAL_NAVIGATION_PAGE_IDS[key],
  ) && tenant?.publicSite?.customerPortal?.navigation?.[key]?.visible !== false;
export const getCustomerPortalTabPageId = (tab) =>
  TAB_PAGES[
    String(tab || "STUDIO_CALENDAR")
      .toUpperCase()
      .replaceAll("-", "_")
  ] || null;
export const getCustomerPortalPageId = (pathname = "", searchParams) => {
  const [rawPath, query = ""] = String(pathname).split("?");
  const path = rawPath.split("#")[0].replace(/\/+$/, "") || "/";
  const params = searchParams || new URLSearchParams(query.split("#")[0]);
  if (path === "/portal") {
    // Menu treats unknown legacy tabs as the default calendar.
    return getCustomerPortalTabPageId(params.get("tab")) || "calendar";
  }
  if (/^\/portal\/courses\/[^/]+$/.test(path)) return "courses";
  if (
    path === "/portal/membership/invoices" ||
    path === "/portal/membership/plans"
  )
    return "memberships";
  // Exact page matches intentionally leave payment and booking-intent callbacks
  // available, even if a studio disables the page after a purchase starts.
  return (
    Object.entries(CUSTOMER_PORTAL_PAGE_HREFS).find(
      ([, href]) => !href.includes("?") && href === path,
    )?.[0] || null
  );
};
export const isCustomerPortalHrefEnabled = (tenant, href, location) => {
  if (/^\/portal\/(work|lost-found)(?:\/|[?#]|$)/.test(href || ""))
    return false;
  if (typeof href !== "string" || !href.startsWith("/portal")) return true;
  return isCustomerPortalPageEnabled(
    tenant,
    getCustomerPortalPageId(href),
    location,
  );
};
export const getCustomerPortalFallbackHref = (
  tenant,
  modules = {},
  location,
) => {
  // Never choose the invoices route when that feature is unavailable in this build.
  const pageId = CUSTOMER_PORTAL_PAGE_IDS.find(
    (id) =>
      (id !== "invoices" || NATIVE_INVOICES_ENABLED) &&
      isCustomerPortalPageEnabled(tenant, id, location) &&
      (!PAGE_MODULES[id] ||
        PAGE_MODULES[id].some((module) => modules?.[module] !== false)),
  );
  return pageId ? CUSTOMER_PORTAL_PAGE_HREFS[pageId] : null;
};
