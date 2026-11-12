"use client";

import { useParams } from "next/navigation";

import { usePathname } from "@/i18n/navigation";

/*
 * Header reads search params, so statically prerendered pages render it on
 * the client only. Until it mounts, this empty header carries the same data
 * attributes, keeping the header-dependent #page-content offsets in
 * globals.css correct at first paint so the content does not shift.
 */
export default function HeaderPlaceholder() {
  const pathname = usePathname();
  const params = useParams();
  const isAdminRoute = pathname === "/app" || pathname?.startsWith("/app/");

  if (params?.tenantSlug || isAdminRoute) {
    return null;
  }

  if (pathname === "/login" || pathname === "/register") {
    return (
      <header
        aria-hidden="true"
        data-platform-auth-header
        className="pointer-events-none absolute inset-x-0 top-0"
      />
    );
  }

  return (
    <header
      aria-hidden="true"
      data-platform-header
      data-home-header={pathname === "/" || undefined}
      className="pointer-events-none fixed inset-x-0 top-0"
    />
  );
}
