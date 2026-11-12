"use client";

import dynamic from "next/dynamic";
import { useSelector } from "react-redux";
import { selectCartIsOpen } from "@/lib/features/cart/cartSlice";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  isCustomerBookingCommerceEnabled,
  isServiceCatalogEnabled,
} from "@/utils/studioFlow";
import { isCustomerPortalPageEnabled } from "./customerPortalVisibility";
const CartModal = dynamic(() => import("@/components/modals/CartModal"), {
  ssr: false,
});

// One cart shared by all authenticated portal routes.
export default function CustomerPortalCartHost() {
  const open = useSelector(selectCartIsOpen);
  const tenant = useSelector(selectCurrentTenant);
  const visibilityTenant = useOptionalPublicTenant()?.tenant || tenant;
  const allowBookings =
    isCustomerBookingCommerceEnabled(tenant?.modules) &&
    isCustomerPortalPageEnabled(visibilityTenant, "calendar");
  const allowCourses =
    tenant?.modules?.courses !== false &&
    tenant?.modules?.payments !== false &&
    isCustomerPortalPageEnabled(visibilityTenant, "courses");
  const allowServices =
    isServiceCatalogEnabled(tenant?.modules) &&
    isCustomerPortalPageEnabled(visibilityTenant, "calendar");
  return open ? (
    <CartModal
      allowBookings={allowBookings}
      allowCourses={allowCourses}
      allowServices={allowServices}
    />
  ) : null;
}
