"use client";

import {
  ArrowRightIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { useGetTenantPaymentConnectQuery } from "@/lib/features/tenant-payments/tenantPaymentsApiSlice";
import {
  CONNECT_DISPLAY_STATUSES,
  normalizeTenantPaymentConnect,
} from "@/lib/features/tenant-payments/tenantPayments.utils";
import styles from "./overview/overview.module.css";

export default function StripeConnectSetupBanner({
  suppressSetupReminder = false,
}) {
  const t = useTranslations("PaymentConnect.dashboardBanner");
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canManage = hasPermission(
    workspaceAccess,
    PERMISSIONS.PAYMENTS_CONNECT_MANAGE,
  );
  const { data, isLoading, isError } = useGetTenantPaymentConnectQuery(
    undefined,
    { skip: !canManage },
  );
  const connection = normalizeTenantPaymentConnect(data);

  if (
    !canManage ||
    isLoading ||
    isError ||
    connection.status === CONNECT_DISPLAY_STATUSES.ACTIVE
  ) {
    return null;
  }

  const restricted = connection.status === CONNECT_DISPLAY_STATUSES.RESTRICTED;

  if (suppressSetupReminder && !restricted) {
    return null;
  }

  const Icon = restricted ? ExclamationTriangleIcon : CreditCardIcon;

  return (
    <aside
      className={`${styles.module} ${styles.card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}
      style={{
        borderInlineStart: `3px solid var(${restricted ? "--studio-clay" : "--studio-blue"})`,
      }}
      aria-labelledby="stripe-connect-banner-title"
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <span
          className={
            restricted
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-100 text-terracotta-700"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-100 text-cobalt-700"
          }
        >
          <Icon className="h-[19px] w-[19px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2
            id="stripe-connect-banner-title"
            className="text-[16px] font-medium text-ink"
          >
            {t(`${connection.status}.title`)}
          </h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-[1.65] text-ink-muted">
            {t(`${connection.status}.description`)}
          </p>
        </div>
      </div>

      <Link
        href="/app/settings/payments"
        className={`${styles.action} ${styles.primary} shrink-0`}
      >
        {t(restricted ? "viewAction" : "manageAction")}
        <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </aside>
  );
}
