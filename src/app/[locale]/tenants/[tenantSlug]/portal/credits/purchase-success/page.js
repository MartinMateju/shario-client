"use client";

import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import { Link } from "@/i18n/navigation";
import useCustomerPortalReturnHref from "@/components/customer-shell/useCustomerPortalReturnHref";
import { apiSlice } from "@/lib/features/api/apiSlice";
import { getAuthCacheIdentity } from "@/lib/features/auth/authSlice";
import { useLazyGetCheckoutOrderStatusQuery } from "@/lib/features/checkout/checkoutSlice";
import { getPortalLocationReferenceFromSearchParams } from "@/utils/customerPortalLocation";

const ORDER_ID_REGEX = /^[a-zA-Z0-9_-]{8,128}$/;

const STATUS = Object.freeze({
  PENDING: "pending_order",
  PROCESSED: "processed_order",
  FAILED: "failed_order",
  CANCELLED: "cancelled_order",
});

const getOrderState = (data) => {
  const status = String(data?.status ?? "")
    .trim()
    .toLowerCase();
  const orderType = String(data?.orderType ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
  const isCreditPurchase = !orderType || orderType === "credit-purchase";

  if (
    status === STATUS.PROCESSED &&
    data?.isPaid === true &&
    isCreditPurchase
  ) {
    return "success";
  }

  if ([STATUS.FAILED, STATUS.CANCELLED].includes(status)) {
    return "failed";
  }

  if (status === STATUS.PENDING || data?.terminal === false) {
    return "pending";
  }

  if (data?.terminal === true) {
    return "failed";
  }

  return "pending";
};

function StatusCard({ state, orderId, isRefreshing, onRetry }) {
  const t = useTranslations("CreditPurchaseStatus");
  const searchParams = useSearchParams();
  const locationReference =
    getPortalLocationReferenceFromSearchParams(searchParams);
  const creditsHref = useCustomerPortalReturnHref(
    "/portal/credits",
    locationReference,
  );
  const portalHref = useCustomerPortalReturnHref("/portal", locationReference);
  const statusConfig = {
    pending: {
      icon: ClockIcon,
      iconClass: "bg-cobalt-100 text-cobalt-700",
      badgeClass: "bg-cobalt-50 text-cobalt-700",
    },
    success: {
      icon: CheckCircleIcon,
      iconClass: "bg-success-soft text-success",
      badgeClass: "bg-success-soft text-success",
    },
    failed: {
      icon: ExclamationTriangleIcon,
      iconClass: "bg-danger-soft text-danger",
      badgeClass: "bg-danger-soft text-danger",
    },
  }[state];
  const Icon = statusConfig.icon;

  return (
    <section
      className="w-full max-w-xl rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-6 shadow-[0_20px_58px_rgba(31,31,31,0.08)] sm:p-9"
      aria-labelledby="credit-purchase-status-title"
    >
      <div className="flex flex-col items-center text-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full ${statusConfig.iconClass}`}
        >
          <Icon
            className={
              state === "pending" ? "h-8 w-8 animate-pulse" : "h-8 w-8"
            }
            aria-hidden="true"
          />
        </span>

        <span
          className={`mt-5 inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusConfig.badgeClass}`}
        >
          {t(`${state}.badge`)}
        </span>

        <h1
          id="credit-purchase-status-title"
          className="mt-4 text-[28px] font-semibold tracking-[-0.05em] text-[var(--tenant-heading-on-surface)] sm:text-[34px]"
        >
          {t(`${state}.title`)}
        </h1>

        <p className="mt-3 max-w-md text-[12px] leading-6 text-[var(--tenant-muted-on-surface)]">
          {t(`${state}.description`)}
        </p>

        {state === "pending" && (
          <div
            className="mt-5 flex items-center gap-2 text-[10px] text-[var(--tenant-muted-on-surface)]"
            role="status"
          >
            <ArrowPathIcon
              className="h-4 w-4 animate-spin text-[var(--tenant-accent-on-surface)]"
              aria-hidden="true"
            />
            {isRefreshing ? t("checking") : t("waiting")}
          </div>
        )}

        <p className="mt-6 rounded-[12px] bg-[var(--tenant-surface)] px-3 py-2 font-mono text-[9px] text-[var(--tenant-muted-on-surface)]">
          {t("orderReference", { orderId })}
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {state === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            className={customerPortalSecondaryActionClass}
          >
            {t("actions.retry")}
          </button>
        )}

        <Link href={creditsHref} className={customerPortalPrimaryActionClass}>
          {t(
            creditsHref.split("?")[0] === "/portal/credits"
              ? "actions.viewCredits"
              : "actions.portal",
          )}
        </Link>

        {creditsHref.split("?")[0] === "/portal/credits" && (
          <Link
            href={portalHref}
            className={customerPortalSecondaryActionClass}
          >
            {t("actions.portal")}
          </Link>
        )}
      </div>
    </section>
  );
}

export default function CreditPurchaseSuccessPage() {
  const t = useTranslations("CreditPurchaseStatus");
  const dispatch = useDispatch();
  const ownerScope = useSelector(getAuthCacheIdentity);
  const searchParams = useSearchParams();
  const locationReference =
    getPortalLocationReferenceFromSearchParams(searchParams);
  const creditsHref = useCustomerPortalReturnHref(
    "/portal/credits",
    locationReference,
  );
  const rawOrderId = searchParams.get("orderId") || "";
  const orderId = ORDER_ID_REGEX.test(rawOrderId) ? rawOrderId : "";
  const requestArgs = useMemo(
    () => ({ orderId, ownerScope }),
    [orderId, ownerScope],
  );
  const invalidatedOrderRef = useRef("");
  const [loadOrderStatus, query] = useLazyGetCheckoutOrderStatusQuery();
  const currentRequest =
    query.originalArgs?.orderId === orderId &&
    query.originalArgs?.ownerScope === ownerScope;
  // A lazy query retains its previous result while a different order loads.
  const data =
    ownerScope && currentRequest && query.currentData?.orderId === orderId
      ? query.currentData
      : undefined;
  const state = useMemo(() => getOrderState(data), [data]);
  const isTerminal = data?.terminal === true;

  useEffect(() => {
    if (!orderId || !ownerScope || isTerminal) {
      return undefined;
    }

    void loadOrderStatus(requestArgs);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadOrderStatus(requestArgs);
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isTerminal, loadOrderStatus, orderId, ownerScope, requestArgs]);

  useEffect(() => {
    const orderKey = `${ownerScope}:${orderId}`;
    if (
      state === "success" &&
      orderId &&
      invalidatedOrderRef.current !== orderKey
    ) {
      invalidatedOrderRef.current = orderKey;
      dispatch(apiSlice.util.invalidateTags(["Credits", "CreditTransactions"]));
    }
  }, [dispatch, orderId, ownerScope, state]);

  const handleRetry = () => {
    if (orderId && ownerScope) void loadOrderStatus(requestArgs);
  };

  if (!orderId || (currentRequest && query.isError)) {
    return (
      <main className="flex min-h-[72vh] items-center justify-center bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-12">
        <section className="w-full max-w-lg rounded-[24px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-7 text-center shadow-card">
          <ExclamationTriangleIcon
            className="mx-auto h-10 w-10 text-danger"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.04em] text-[var(--tenant-heading-on-surface)]">
            {t("invalid.title")}
          </h1>
          <p className="mt-2 text-[12px] leading-6 text-[var(--tenant-muted-on-surface)]">
            {t("invalid.description")}
          </p>
          <Link
            href={creditsHref}
            className={`mt-6 ${customerPortalPrimaryActionClass}`}
          >
            {t(
              creditsHref.split("?")[0] === "/portal/credits"
                ? "actions.viewCredits"
                : "actions.portal",
            )}
          </Link>
          {orderId && (
            <button
              type="button"
              onClick={handleRetry}
              className={`ml-3 mt-6 ${customerPortalSecondaryActionClass}`}
            >
              {t("actions.retry")}
            </button>
          )}
        </section>
      </main>
    );
  }

  if (
    !ownerScope ||
    !currentRequest ||
    query.isUninitialized ||
    query.isLoading
  ) {
    return (
      <main
        className="flex min-h-[72vh] items-center justify-center bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-12"
        role="status"
      >
        <ArrowPathIcon
          className="h-7 w-7 animate-spin text-[var(--tenant-accent-link)]"
          aria-hidden="true"
        />
        <span className="ml-3 text-[12px] text-[var(--tenant-muted-text)]">
          {t("loading")}
        </span>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[72vh] items-center justify-center overflow-hidden bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-12">
      <div
        className="pointer-events-none absolute -right-28 top-10 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--tenant-surface)_80%,transparent)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--tenant-surface)_80%,transparent)] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-xl">
        <StatusCard
          state={state}
          orderId={orderId}
          isRefreshing={query.isFetching}
          onRetry={handleRetry}
        />
      </div>
    </main>
  );
}
