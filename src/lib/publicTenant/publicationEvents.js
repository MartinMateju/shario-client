const PUBLICATION_EVENT = "shario:public-site-published";
const publicationKey = (tenantSlug) =>
  `shario:public-site-published:${tenantSlug}`;

export function notifyPublicSitePublished(tenantSlug) {
  if (!tenantSlug || typeof window === "undefined") return;

  // Notify other tabs on this studio's origin without exposing draft content.
  try {
    window.localStorage.setItem(
      publicationKey(tenantSlug),
      crypto.randomUUID(),
    );
  } catch {
    // Publishing and the current tab still work when storage is unavailable.
  }
  window.dispatchEvent(
    new CustomEvent(PUBLICATION_EVENT, { detail: { tenantSlug } }),
  );
}

export function subscribeToPublicSitePublication(tenantSlug, onPublish) {
  const local = (event) => {
    if (event.detail?.tenantSlug === tenantSlug) onPublish();
  };
  const otherTab = (event) => {
    if (
      event.key === publicationKey(tenantSlug) &&
      event.newValue &&
      event.newValue !== event.oldValue
    ) {
      onPublish();
    }
  };
  window.addEventListener(PUBLICATION_EVENT, local);
  window.addEventListener("storage", otherTab);
  return () => {
    window.removeEventListener(PUBLICATION_EVENT, local);
    window.removeEventListener("storage", otherTab);
  };
}
