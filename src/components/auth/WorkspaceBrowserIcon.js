"use client";

import { useEffect, useState } from "react";
import { normalizePublicTenantUrl } from "@/components/public-tenant/publicTenantUrl";
import { PLATFORM_BROWSER_ICONS } from "@/config/browserIcons";
import { subscribeToPublicSitePublication } from "@/lib/publicTenant/publicationEvents";

// The authenticated session already carries published branding. Updating the
// tab icon after publishing does not require reloading any workspace route.
export default function WorkspaceBrowserIcon({ tenantSlug, initialFavicon }) {
  const [favicon, setFavicon] = useState(initialFavicon);
  useEffect(
    () =>
      subscribeToPublicSitePublication(tenantSlug, (publication) => {
        if (typeof publication?.faviconUrl === "string") {
          setFavicon(publication.faviconUrl);
        }
      }),
    [tenantSlug],
  );
  const href = normalizePublicTenantUrl(favicon);
  if (href) {
    return (
      <>
        <link rel="icon" href={href} />
        <link rel="shortcut icon" href={href} />
        <link rel="apple-touch-icon" href={href} />
      </>
    );
  }
  return (
    <>
      {PLATFORM_BROWSER_ICONS.icon.map(({ url, ...attributes }) => (
        <link key={url} rel="icon" href={url} {...attributes} />
      ))}
      <link rel="shortcut icon" href={PLATFORM_BROWSER_ICONS.shortcut} />
    </>
  );
}
