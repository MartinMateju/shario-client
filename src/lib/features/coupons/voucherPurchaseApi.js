import { encodeTenantSlugPathSegment } from "@/utils/tenantRouting";

/** Private purchase credentials must never enter Redux arguments or query keys. */
export async function requestVoucherPurchase({
  tenantSlug,
  orderId,
  accessToken,
  action = "status",
  index,
  signal,
}) {
  const base = String(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const path = `/public/tenants/${encodeTenantSlugPathSegment(tenantSlug)}/vouchers/orders/${encodeURIComponent(orderId)}/${action}`;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 20_000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: {
        accept: action === "download" ? "application/pdf" : "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        accessToken,
        ...(action === "download" ? { index } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const error = new Error("Voucher request failed");
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }
    if (action !== "download") return await response.json();
    if (!response.headers.get("content-type")?.includes("application/pdf")) {
      throw new Error("Expected a voucher PDF");
    }
    return await response.blob();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
