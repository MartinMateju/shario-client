const PUBLICATION_EVENT = "shario:public-site-published";
const publicationKey = (tenantSlug) =>
  `shario:public-site-published:${tenantSlug}`;

export function notifyPublicSitePublished(tenantSlug, faviconUrl) {
  if (!tenantSlug || typeof window === "undefined") return;

  const publication = { tenantSlug, faviconUrl };
  // Notify other tabs on this studio's origin without exposing draft content.
  try {
    window.localStorage.setItem(
      publicationKey(tenantSlug),
      JSON.stringify({ ...publication, id: crypto.randomUUID() }),
    );
  } catch {
    // Publishing and the current tab still work when storage is unavailable.
  }
  window.dispatchEvent(
    new CustomEvent(PUBLICATION_EVENT, { detail: publication }),
  );
}

export function subscribeToPublicSitePublication(tenantSlug, onPublish) {
  const local = (event) => {
    if (event.detail?.tenantSlug === tenantSlug) onPublish(event.detail);
  };
  const otherTab = (event) => {
    if (
      event.key === publicationKey(tenantSlug) &&
      event.newValue &&
      event.newValue !== event.oldValue
    ) {
      let publication;
      try {
        publication = JSON.parse(event.newValue);
      } catch {
        // Older tabs write a UUID. Their refresh notification is still valid.
      }
      onPublish(
        publication?.tenantSlug === tenantSlug ? publication : undefined,
      );
    }
  };
  window.addEventListener(PUBLICATION_EVENT, local);
  window.addEventListener("storage", otherTab);
  return () => {
    window.removeEventListener(PUBLICATION_EVENT, local);
    window.removeEventListener("storage", otherTab);
  };
}
