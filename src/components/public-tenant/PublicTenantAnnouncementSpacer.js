"use client";

import { useLocale } from "next-intl";

import { getLocalizedPublicTenantText } from "./publicTenant.config";
import { usePublicTenant } from "./PublicTenantProvider";

export default function PublicTenantAnnouncementSpacer() {
  const locale = useLocale();
  const { tenant, degraded, surface } = usePublicTenant();
  const text = getLocalizedPublicTenantText(
    tenant.publicSite.header.announcement.text,
    locale,
  );

  return text && !degraded && surface === "public" ? (
    <div aria-hidden="true" className="h-8" />
  ) : null;
}
