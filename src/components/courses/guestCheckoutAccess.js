import { normalizePortalLocationReference } from "@/utils/customerPortalLocation";

const ORDER_ID_PATTERN = /^[a-f\d]{24}$/i;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z\d_-]{43}$/;
const SAFE_ID_PATTERN = /^[A-Za-z\d_-]{1,128}$/;
const ATTEMPT_KEY_PATTERN =
  /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;

export const getGuestCheckoutOrderId = (value) =>
  typeof value === "string" && ORDER_ID_PATTERN.test(value) ? value : "";

export const isGuestCheckoutAccessToken = (value) =>
  typeof value === "string" && ACCESS_TOKEN_PATTERN.test(value);

// Fully covered bookings do not navigate to a payment provider. Keep this
// return on the current tenant and put its proof only in the URL fragment.
export function getConfirmedGuestCheckoutHref({
  orderId,
  accessToken,
  locale,
  productId,
  courseSessionId,
  location,
  quantity,
}) {
  if (
    !getGuestCheckoutOrderId(orderId) ||
    !isGuestCheckoutAccessToken(accessToken) ||
    !/^[a-z]{2}(?:-[A-Za-z]{2})?$/.test(locale || "")
  )
    return "";
  const params = new URLSearchParams({ orderId });
  if (SAFE_ID_PATTERN.test(productId || "")) params.set("productId", productId);
  if (SAFE_ID_PATTERN.test(courseSessionId || ""))
    params.set("courseSessionId", courseSessionId);
  const reference = normalizePortalLocationReference(location);
  if (reference) params.set("location", reference);
  if (Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 20)
    params.set("quantity", String(quantity));
  return `/${locale}/checkout/success?${params}#${new URLSearchParams({ access_token: accessToken })}`;
}

export const getGuestCheckoutAccessKey = (tenantSlug, orderId) =>
  `shario:guest-course:${tenantSlug}:${orderId}`;

const getSessionStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

export async function getGuestCheckoutAttempt(
  { tenantSlug, selection },
  storage = getSessionStorage(),
) {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(selection)),
  );
  // Retain retries without putting customer contact details in browser storage.
  const fingerprint = Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  const storageKey = `shario:guest-course-attempt:${tenantSlug}:${fingerprint}`;
  let stored;
  try {
    stored = storage?.getItem(storageKey);
  } catch {
    // The mounted form also retains its key when storage is unavailable.
  }
  const key = ATTEMPT_KEY_PATTERN.test(stored || "")
    ? stored
    : globalThis.crypto.randomUUID();
  try {
    storage?.setItem(storageKey, key);
  } catch {
    // Retrying in this form still uses the retained in-memory key.
  }
  return { key, storageKey };
}

export function clearGuestCheckoutAttempt(
  attempt,
  storage = getSessionStorage(),
) {
  try {
    if (attempt?.storageKey) storage?.removeItem(attempt.storageKey);
  } catch {
    // The form drops its in-memory key independently.
  }
}

export function storeGuestCheckoutAccess(
  { tenantSlug, orderId, accessToken },
  storage = getSessionStorage(),
) {
  if (
    !tenantSlug ||
    !getGuestCheckoutOrderId(orderId) ||
    !isGuestCheckoutAccessToken(accessToken)
  ) {
    return false;
  }
  try {
    storage?.setItem(
      getGuestCheckoutAccessKey(tenantSlug, orderId),
      accessToken,
    );
    return Boolean(storage);
  } catch {
    // The Stripe return fragment still carries the proof when storage is blocked.
    return false;
  }
}

export function readGuestCheckoutAccess({
  tenantSlug,
  orderId,
  location = window.location,
  history = window.history,
  storage = getSessionStorage(),
}) {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  const supplied = fragment.get("access_token");
  if (supplied !== null) {
    fragment.delete("access_token");
    const rest = fragment.toString();
    try {
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${location.search}${rest ? `#${rest}` : ""}`,
      );
    } catch {
      // Fragments are not sent in HTTP requests even if history is unavailable.
    }
    if (
      !tenantSlug ||
      !getGuestCheckoutOrderId(orderId) ||
      !isGuestCheckoutAccessToken(supplied)
    ) {
      return { token: "", invalid: true };
    }
    storeGuestCheckoutAccess(
      { tenantSlug, orderId, accessToken: supplied },
      storage,
    );
    return { token: supplied, invalid: false };
  }
  if (!tenantSlug || !getGuestCheckoutOrderId(orderId)) {
    return { token: "", invalid: true };
  }
  try {
    const stored = storage?.getItem(
      getGuestCheckoutAccessKey(tenantSlug, orderId),
    );
    return {
      token: isGuestCheckoutAccessToken(stored) ? stored : "",
      invalid: Boolean(stored && !isGuestCheckoutAccessToken(stored)),
    };
  } catch {
    return { token: "", invalid: false };
  }
}

// Return links contain only a course selection, never guest contact or proof.
export function getGuestCourseReturnHref(searchParams) {
  const productId = searchParams?.get("productId") || "";
  const sessionId = searchParams?.get("courseSessionId") || "";
  const reference = normalizePortalLocationReference(
    searchParams?.get("location") || searchParams?.get("locationId"),
  );
  const validProduct = SAFE_ID_PATTERN.test(productId);
  const path = validProduct
    ? `/courses/${encodeURIComponent(productId)}`
    : "/courses";
  const params = new URLSearchParams();
  if (validProduct && SAFE_ID_PATTERN.test(sessionId)) {
    params.set("courseSessionId", sessionId);
    const quantity = Number(searchParams?.get("quantity"));
    if (Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 20) {
      params.set("quantity", String(quantity));
    }
  }
  if (reference) params.set("location", reference);
  return `${path}${params.size ? `?${params.toString()}` : ""}`;
}
