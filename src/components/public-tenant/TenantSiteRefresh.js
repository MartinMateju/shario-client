"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { usePathname } from "@/i18n/navigation";
import { subscribeToPublicSitePublication } from "@/lib/publicTenant/publicationEvents";

export default function TenantSiteRefresh({ tenantSlug }) {
  const router = useRouter();
  const pathname = usePathname();
  const workspaceOrPreview = /^\/(?:app|public-site-preview)(?:\/|$)/.test(
    pathname,
  );

  useEffect(() => {
    if (workspaceOrPreview) return;
    let pending = false;
    let timer;
    const flush = () => {
      if (!pending || document.hidden) return;
      pending = false;
      router.refresh();
    };
    const unsubscribe = subscribeToPublicSitePublication(tenantSlug, () => {
      pending = true;
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(flush, 100);
    });
    document.addEventListener("visibilitychange", flush);
    return () => {
      unsubscribe();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [router, tenantSlug, workspaceOrPreview]);

  return null;
}
