export async function fetchPublicSubscriptionCatalog({ signal } = {}) {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/public/subscription-catalog`, {
    credentials: "omit",
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Subscription prices are unavailable");
  const catalog = await response.json();
  if (!Array.isArray(catalog?.plans)) {
    throw new Error("Invalid subscription catalog");
  }
  return catalog;
}
