"use client";

import { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useGetMembershipCheckoutStatusQuery } from "@/lib/features/memberships/membershipsApiSlice";
import { buildTenantAuthHref } from "@/utils/tenantAuthRouting";
import useCustomerPortalReturnHref from "@/components/customer-shell/useCustomerPortalReturnHref";

const SUCCESS_STATUSES = new Set(["paid", "activated", "membership_active"]);
const FAILURE_STATUSES = new Set([
  "failed",
  "expired",
  "cancelled",
  "canceled",
  "past_due",
]);

export default function MembershipCheckoutSuccess() {
  const searchParams = useSearchParams();
  const sessionId =
    searchParams.get("session_id") || searchParams.get("sessionId") || "";

  return <CheckoutStatus key={sessionId || "missing"} sessionId={sessionId} />;
}

function CheckoutStatus({ sessionId }) {
  const t = useTranslations("Memberships.checkout");
  const portalT = useTranslations("CreditPurchaseStatus");
  const returnHref = useCustomerPortalReturnHref("/portal/membership");
  const plansHref = useCustomerPortalReturnHref("/portal/membership/plans");
  const [timedOut, setTimedOut] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const initialQuery = useGetMembershipCheckoutStatusQuery(sessionId, {
    skip: !sessionId,
    pollingInterval: terminal ? 0 : 2000,
    refetchOnMountOrArgChange: true,
  });
  const status = String(
    initialQuery.data?.checkout?.status ||
      initialQuery.data?.status ||
      "pending",
  ).toLowerCase();
  const success =
    SUCCESS_STATUSES.has(status) ||
    initialQuery.data?.membership?.status === "active";
  const failed =
    FAILURE_STATUSES.has(status) ||
    initialQuery.data?.membership?.status === "past_due";

  useEffect(() => {
    if (!success && !failed && !timedOut) return;
    const timeout = window.setTimeout(() => setTerminal(true), 0);
    return () => window.clearTimeout(timeout);
  }, [failed, success, timedOut]);

  useEffect(() => {
    // A confirmed success or terminal Stripe state closes this checkout
    // attempt. Preserve the key for timeouts and request errors so a reload can
    // recover the original session instead of creating a duplicate purchase.
    if (!success && !failed) return;
    try {
      for (
        let index = window.sessionStorage.length - 1;
        index >= 0;
        index -= 1
      ) {
        const key = window.sessionStorage.key(index);
        if (key?.startsWith("shario:membership-checkout:")) {
          window.sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Session storage can be unavailable in strict privacy modes.
    }
  }, [failed, success]);

  useEffect(() => {
    if (!sessionId || success || failed) return;
    const timeout = window.setTimeout(() => setTimedOut(true), 120_000);
    return () => window.clearTimeout(timeout);
  }, [failed, sessionId, success]);

  const state =
    !sessionId || initialQuery.isError
      ? "unavailable"
      : failed
        ? "failed"
        : success
          ? "success"
          : timedOut
            ? "timeout"
            : "pending";
  const recoveryPath = sessionId
    ? `/memberships/checkout/success?session_id=${encodeURIComponent(sessionId)}`
    : "/memberships/checkout/success";
  const signInHref = buildTenantAuthHref("/login", recoveryPath);

  return (
    <main className="flex min-h-[72vh] items-center justify-center bg-brand-offset px-4 py-14 sm:px-6">
      <section
        className="w-full max-w-xl rounded-[26px] border border-line bg-white p-7 text-center shadow-[0_18px_55px_rgba(17,17,15,0.05)] sm:p-9"
        aria-live="polite"
      >
        {state === "success" ? (
          <CheckCircleIcon className="mx-auto h-12 w-12 text-[#5D7A51]" />
        ) : state === "pending" ? (
          <ArrowPathIcon className="mx-auto h-11 w-11 animate-spin text-cobalt-600" />
        ) : (
          <ExclamationTriangleIcon className="mx-auto h-11 w-11 text-terracotta-600" />
        )}
        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          {t(`${state}.eyebrow`)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
          {t(`${state}.title`)}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[10px] leading-5 text-[#777773]">
          {t(`${state}.description`)}
        </p>
        {state === "success" ? (
          <Link
            href={returnHref}
            data-tenant-button="primary"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#171717] px-6 text-[10px] font-semibold text-white"
          >
            {returnHref === "/portal/membership"
              ? t("viewMembership")
              : portalT("actions.portal")}
          </Link>
        ) : state === "pending" ? (
          <p className="mt-5 text-[9px] text-[#969691]">
            {t("pending.keepOpen")}
          </p>
        ) : (
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={initialQuery.refetch}
              disabled={!sessionId}
              className="min-h-11 rounded-full bg-[#171717] px-5 text-[10px] font-semibold text-white disabled:opacity-40"
            >
              {t("tryAgain")}
            </button>
            {state === "unavailable" ? (
              <Link
                href={signInHref}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-[10px] font-semibold"
              >
                {t("signInToRecover")}
              </Link>
            ) : (
              <Link
                href={plansHref}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-5 text-[10px] font-semibold"
              >
                {t("backToPlans")}
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
