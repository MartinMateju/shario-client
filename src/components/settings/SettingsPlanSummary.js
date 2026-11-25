"use client";

import { ArrowRightIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import {
  PERMISSIONS,
  hasPermission,
  isWorkspaceAccessActive,
} from "@/config/permissions";
import { normalizeSubscriptionPlan } from "@/config/subscriptionPlans";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetCurrentTenantSubscriptionQuery } from "@/lib/features/billing/billingApiSlice";

export default function SettingsPlanSummary({ className = "" }) {
  const t = useTranslations("UnifiedSettings.plan");
  const billingT = useTranslations("Billing");
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const activeMember = Boolean(access) && isWorkspaceAccessActive(access);
  const canViewBilling = hasPermission(access, PERMISSIONS.SUBSCRIPTION_VIEW);
  const tenantId = String(tenant?.id || tenant?._id || "");
  const canQueryBilling = canViewBilling && Boolean(tenantId);
  const subscriptionQuery = useGetCurrentTenantSubscriptionQuery(undefined, {
    skip: !canQueryBilling,
    refetchOnMountOrArgChange: true,
  });

  // Billing includes private payment data. Never consume it for a member
  // without billing access, or from another tenant's cached response.
  const response =
    canQueryBilling &&
    String(subscriptionQuery.currentData?.tenant?.id || "") === tenantId
      ? subscriptionQuery.currentData
      : null;
  const plan = normalizeSubscriptionPlan(
    response ? response.tenant.plan : tenant?.plan,
  );
  const loading =
    canQueryBilling &&
    !response &&
    (subscriptionQuery.isLoading ||
      subscriptionQuery.isFetching ||
      subscriptionQuery.isUninitialized);
  const status = response?.subscription?.status;
  const statusLabel =
    typeof status === "string" && billingT.has(`statuses.${status}`)
      ? billingT(`statuses.${status}`)
      : "";

  if (!activeMember) return null;

  return (
    <section
      data-settings-plan-summary
      aria-label={t("label")}
      aria-busy={Boolean(loading && !plan)}
      className={`@container/plan-summary flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-[14px] border border-[var(--studio-rule)] bg-[var(--studio-soft)] px-4 py-3 ${className}`}
    >
      <div className="flex min-w-0 basis-full items-start gap-2.5 @[360px]/plan-summary:flex-1 @[360px]/plan-summary:basis-auto">
        <CreditCardIcon
          className="mt-1 h-4 w-4 shrink-0 text-[var(--studio-muted)]"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[12px] leading-5 text-[var(--studio-muted)]">
            {t("label")}
          </p>
          <div
            aria-live="polite"
            aria-atomic="true"
            className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1"
          >
            <p
              data-settings-plan-name
              className="text-[16px] font-medium leading-6 tracking-[-0.02em] text-[var(--studio-ink)] break-words"
            >
              {plan
                ? billingT(`plans.${plan}`)
                : t(loading ? "loading" : "unavailable")}
            </p>
            {statusLabel ? (
              <span
                data-settings-plan-status
                className="text-[12px] leading-5 text-[var(--studio-muted)]"
              >
                {statusLabel}
              </span>
            ) : null}
          </div>
          {canQueryBilling && subscriptionQuery.isError ? (
            <p
              role="status"
              className="mt-1 text-[12px] leading-5 text-[var(--studio-muted)]"
            >
              {t("detailsUnavailable")}
            </p>
          ) : null}
        </div>
      </div>
      {canViewBilling ? (
        <Link
          href="/app/settings/billing"
          className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-[14px] px-2 text-[14px] font-medium leading-5 text-[var(--studio-blue)] transition hover:bg-[var(--studio-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]"
        >
          <span className="min-w-0 break-words">{t("details")}</span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
