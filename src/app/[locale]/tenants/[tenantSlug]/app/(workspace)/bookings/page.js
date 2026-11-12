"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import BookingsTable from "@/components/tables/BookingsTable";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { useRouter } from "@/i18n/navigation";
import { getBookingEditorHref } from "@/components/bookings/bookingEditor.utils";

function TenantBookingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const createRedirectRequested =
    searchParams.get("action") === "create" &&
    hasPermission(workspaceAccess, PERMISSIONS.BOOKINGS_CREATE);
  const requestedBookingId = searchParams.get("bookingId") || "";
  const editorRedirectHref = requestedBookingId
    ? getBookingEditorHref(requestedBookingId)
    : "";

  const createRedirectHref = useMemo(() => {
    if (!createRedirectRequested) return "";

    const query = new URLSearchParams(searchParams.toString());
    query.delete("action");
    const suffix = query.toString();

    return `/app/bookings/new${suffix ? `?${suffix}` : ""}`;
  }, [createRedirectRequested, searchParams]);

  useEffect(() => {
    const href = createRedirectHref || editorRedirectHref;
    if (href) router.replace(href, { scroll: false });
  }, [createRedirectHref, editorRedirectHref, router]);

  if (createRedirectHref || editorRedirectHref) {
    return (
      <div
        className="h-[420px] animate-pulse rounded-[20px] border border-[#E7E4DE] bg-white/70"
        aria-hidden="true"
      />
    );
  }

  return <BookingsTable showPageHeader={false} showCreateButton={false} />;
}

export default function TenantBookingsPage() {
  return (
    <PermissionBoundary permission={PERMISSIONS.BOOKINGS_VIEW}>
      <TenantBookingsContent />
    </PermissionBoundary>
  );
}
