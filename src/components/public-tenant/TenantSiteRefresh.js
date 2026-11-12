"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { subscribeToPublicSitePublication } from "@/lib/publicTenant/publicationEvents";

export default function TenantSiteRefresh({ tenantSlug }) {
  const router = useRouter();

  useEffect(
    () => subscribeToPublicSitePublication(tenantSlug, () => router.refresh()),
    [router, tenantSlug],
  );

  return null;
}
