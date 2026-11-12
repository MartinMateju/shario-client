// The old voucher tab now opens the shop without mounting the booking dashboard.
// These paths are locale-relative; the tenant router preserves the current locale.
export const getCustomerVoucherShopHref = (
  pathname,
  searchParams,
  { publicPage = false } = {},
) => {
  const path = String(pathname || "").replace(/\/+$/, "");
  const params = new URLSearchParams(searchParams?.toString() || "");
  const legacyTab =
    path === "/portal" &&
    String(params.get("tab") || "").toLowerCase() === "vouchers";
  if (path !== "/portal/vouchers" && !legacyTab) return "";
  if (legacyTab) params.delete("tab");
  const query = params.toString();
  return `${publicPage ? "/vouchers" : "/portal/vouchers"}${query ? `?${query}` : ""}`;
};
