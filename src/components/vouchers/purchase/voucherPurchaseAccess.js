const ORDER_ID_PATTERN = /^[a-f\d]{24}$/i;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z\d_-]{43}$/;

export const getVoucherOrderId = (value) =>
  typeof value === "string" && ORDER_ID_PATTERN.test(value) ? value : "";

export const getVoucherAccessStorageKey = (tenantSlug, orderId) =>
  `shario:voucher-purchase:${tenantSlug}:${orderId}`;

/** The checkout proof belongs in the fragment, never in API URLs or links. */
export function readVoucherPurchaseAccess({
  tenantSlug,
  orderId,
  location = window.location,
  history = window.history,
  storage,
}) {
  if (!tenantSlug || !getVoucherOrderId(orderId)) return "";

  let sessionStorage = storage;
  if (!sessionStorage) {
    try {
      sessionStorage = window.sessionStorage;
    } catch {
      // Private browsing may disable storage. This visit can still use the proof.
    }
  }

  const key = getVoucherAccessStorageKey(tenantSlug, orderId);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const supplied = fragment.get("accessToken");

  if (supplied !== null) {
    fragment.delete("accessToken");
    const rest = fragment.toString();
    try {
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${location.search}${rest ? `#${rest}` : ""}`,
      );
    } catch {
      // The fragment is still excluded from HTTP requests and referrers.
    }
    if (!ACCESS_TOKEN_PATTERN.test(supplied)) return "";
    try {
      sessionStorage?.setItem(key, supplied);
    } catch {
      // Refresh recovery is optional; access during this visit is unaffected.
    }
    return supplied;
  }

  try {
    const stored = sessionStorage?.getItem(key);
    return ACCESS_TOKEN_PATTERN.test(stored || "") ? stored : "";
  } catch {
    return "";
  }
}

export function clearVoucherPurchaseAccess(tenantSlug, orderId) {
  try {
    window.sessionStorage.removeItem(
      getVoucherAccessStorageKey(tenantSlug, orderId),
    );
  } catch {
    // Storage can be disabled without affecting the current page.
  }
}

export function savePurchasedVoucherPdf(blob, index = 0) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `voucher-${index + 1}.pdf`;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
