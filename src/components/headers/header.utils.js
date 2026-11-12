import { isSupportedCartItem } from "@/lib/features/cart/cartItemScope";
import { selectCurrentCart } from "@/lib/features/cart/cartSlice";
export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}
export const headerCountBadgeClass = classNames(
  "pointer-events-none absolute right-0 top-0 z-10",
  "grid h-[18px] min-w-[18px] place-items-center rounded-full px-1",
  "text-[9px] font-semibold tabular-nums leading-none text-white ring-2",
);
export const headerStatusBadgeClass = classNames(
  "pointer-events-none absolute right-2 top-2 z-10",
  "h-2 w-2 rounded-full ring-2",
);
export function isActivePath(pathname, href) {
  if (!pathname || !href) return false;
  const readHashValue = (value) => {
    const hashIndex = String(value).indexOf("#");
    return hashIndex >= 0 ? String(value).slice(hashIndex + 1) : "";
  };
  const readQueryValue = (value, key) => {
    const query = String(value).split("#")[0].split("?")[1] || "";
    const entry = query
      .split("&")
      .map((part) => part.split("="))
      .find(([name]) => decodeURIComponent(name || "") === key);
    return entry ? decodeURIComponent(entry.slice(1).join("=") || "") : "";
  };
  const normalizedPathname = String(pathname).split(/[?#]/)[0] || "/";
  const normalizedHref = String(href).split(/[?#]/)[0] || "/";
  const targetHash = readHashValue(href);
  const currentHash = readHashValue(pathname);
  const targetTab = readQueryValue(href, "tab").toLowerCase();
  const currentTab = readQueryValue(pathname, "tab").toLowerCase();
  if (
    targetHash &&
    (normalizedPathname !== normalizedHref || currentHash !== targetHash)
  ) {
    return false;
  }
  if (normalizedPathname === normalizedHref && targetTab) {
    return currentTab
      ? currentTab === targetTab
      : targetTab === "studio-calendar";
  }
  if (
    normalizedPathname === normalizedHref &&
    currentTab &&
    normalizedHref === "/portal"
  ) {
    return false;
  }
  if (normalizedPathname === normalizedHref) return true;

  // Root destinations represent overview pages, not every nested route.
  if (normalizedHref === "/" || normalizedHref === "/portal") return false;
  return normalizedPathname.startsWith(`${normalizedHref}/`);
}
export function isStudioActive(pathname) {
  if (!pathname) return false;
  return ["/help", "/book", "/courses"].some((path) =>
    isActivePath(pathname, path),
  );
}
export const selectCartCount = (state) => {
  const cart = selectCurrentCart(state);
  return Array.isArray(cart) ? cart.filter(isSupportedCartItem).length : 0;
};
export const navLinkClass = (active = false) =>
  classNames(
    "rounded-full px-3.5 py-2  text-[10.5px] uppercase tracking-[0.16em] text-[#8f7b69] transition hover:bg-white/60 hover:text-[#483827]",
    "transition-all duration-200 ease-out whitespace-nowrap",
    active
      ? "bg-white/75 text-[#483827] shadow-[0_8px_24px_rgba(72,56,39,0.07)] ring-1 ring-[#e4d9cf]"
      : "text-[#8f7b69] hover:bg-white/60 hover:text-[#483827] hover:shadow-[0_6px_18px_rgba(72,56,39,0.05)]",
  );
