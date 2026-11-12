"use client";

import { useSelector } from "react-redux";
import PublicVoucherCatalogPage from "@/components/public-tenant/PublicVoucherCatalogPage";
import ApplyVouchers from "@/components/views/voucher/ApplyVouchers";
import {
  selectCurrentUser,
  selectIsCustomerAuthenticated,
} from "@/lib/features/auth/authSlice";

export default function CustomerVouchersPage() {
  const customer = useSelector(selectCurrentUser);
  const authenticated = useSelector(selectIsCustomerAuthenticated);

  return (
    <PublicVoucherCatalogPage
      portal
      initialEmail={authenticated ? customer?.email || "" : ""}
    >
      {authenticated ? <ApplyVouchers embedded /> : null}
    </PublicVoucherCatalogPage>
  );
}
