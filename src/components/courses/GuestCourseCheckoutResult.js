"use client";

import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { Link } from "@/i18n/navigation";
import { useGetGuestCheckoutOrderStatusQuery } from "@/lib/features/checkout/checkoutSlice";
import {
  getGuestCheckoutOrderId,
  getGuestCourseReturnHref,
  readGuestCheckoutAccess,
} from "./guestCheckoutAccess";

export default function GuestCourseCheckoutResult({ cancelled = false }) {
  const t = useTranslations("PublicTenant.guestCheckoutResult");
  const searchParams = useSearchParams();
  const { tenant } = usePublicTenant();
  const tenantSlug = String(tenant?.slug || "");
  const orderId = getGuestCheckoutOrderId(searchParams.get("orderId") || "");
  const scope = `${tenantSlug}:${orderId}`;
  const [accessState, setAccessState] = useState(null);
  const capturedAccess = useRef(null);
  const [stoppedAccess, setStoppedAccess] = useState(null);
  const access = accessState?.scope === scope ? accessState : null;

  useEffect(() => {
    // Tenant hydration may lag behind the redirect. Do not consume the proof
    // until it can be bound to the correct tenant and order.
    if (!tenantSlug || !orderId) return;
    let active = true;
    // StrictMode may replay this effect after the fragment has been removed.
    // Retain the first proof even when browser storage is unavailable.
    const captured =
      capturedAccess.current?.scope === scope
        ? capturedAccess.current
        : {
            scope,
            ...readGuestCheckoutAccess({ tenantSlug, orderId }),
          };
    capturedAccess.current = captured;
    queueMicrotask(() => {
      if (active) setAccessState(captured);
    });
    return () => {
      active = false;
    };
  }, [orderId, scope, tenantSlug]);

  const canRequest = Boolean(
    tenantSlug && orderId && access && !access.invalid,
  );
  const statusQuery = useGetGuestCheckoutOrderStatusQuery(
    { tenantSlug, orderId, accessToken: access?.token || undefined },
    {
      skip: !canRequest,
      pollingInterval: !cancelled && stoppedAccess !== access ? 2_000 : 0,
      skipPollingIfUnfocused: true,
      refetchOnFocus: !cancelled && stoppedAccess !== access,
    },
  );
  const data =
    canRequest && statusQuery.currentData?.orderId === orderId
      ? statusQuery.currentData
      : undefined;
  const mismatchedOrder = Boolean(
    canRequest && statusQuery.currentData && !data,
  );
  if (
    canRequest &&
    (data?.terminal === true || statusQuery.isError || mismatchedOrder) &&
    stoppedAccess !== access
  ) {
    setStoppedAccess(access);
  }
  const confirmed =
    data?.terminal === true &&
    data?.isPaid === true &&
    data.status === "processed_order";
  const failed =
    !orderId ||
    access?.invalid === true ||
    statusQuery.isError ||
    mismatchedOrder ||
    (data?.terminal === true && !confirmed);
  const state = confirmed
    ? "confirmed"
    : cancelled
      ? "cancelled"
      : failed
        ? "unconfirmed"
        : "verifying";
  const Icon =
    state === "confirmed"
      ? CheckCircleIcon
      : state === "cancelled"
        ? XCircleIcon
        : state === "unconfirmed"
          ? ExclamationTriangleIcon
          : ArrowPathIcon;
  const checkAgain = async () => {
    const response = await statusQuery.refetch();
    if (!response.error && response.data?.terminal !== true) {
      setStoppedAccess(null);
    }
  };

  return (
    <main className="flex min-h-[78vh] items-center justify-center bg-[var(--tenant-background)] px-4 py-14 text-[var(--tenant-text)]">
      <section className="w-full max-w-xl rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-7 text-center text-[var(--tenant-text-on-surface)] shadow-[0_20px_60px_rgba(31,31,31,0.08)] sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tenant-background)] text-[var(--tenant-accent-link)]">
          <Icon
            className={`h-8 w-8 ${state === "verifying" ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </span>
        {state !== "cancelled" ? (
          <p
            className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tenant-accent-on-surface)]"
            role="status"
          >
            {t(`${state}Label`)}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--tenant-heading-on-surface)]">
          {t(`${state}Title`)}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
          {t(`${state}Description`)}
        </p>
        {["confirmed", "verifying"].includes(state) ? (
          <p className="mt-6 flex items-center justify-center gap-2 rounded-[16px] bg-[var(--tenant-background)] px-4 py-3 text-xs text-[var(--tenant-muted-text)]">
            <EnvelopeIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t(state === "confirmed" ? "emailConfirmed" : "emailPending")}
          </p>
        ) : null}
        {orderId ? (
          <p className="mt-4 break-all font-mono text-xs text-[var(--tenant-muted-on-surface)]">
            {t("orderReference")}: {orderId}
          </p>
        ) : null}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {canRequest && !confirmed ? (
            <button
              type="button"
              onClick={checkAgain}
              disabled={statusQuery.isFetching}
              className="min-h-11 rounded-full border border-[var(--tenant-border)] px-5 text-sm font-semibold disabled:opacity-50"
            >
              {t("retry")}
            </button>
          ) : null}
          <Link
            href={getGuestCourseReturnHref(searchParams)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--tenant-accent)] px-6 text-sm font-semibold text-[var(--tenant-accent-foreground)]"
          >
            {t("backToCourse")}
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--tenant-border)] px-6 text-sm font-semibold"
          >
            {t("backToStudio")}
          </Link>
        </div>
      </section>
    </main>
  );
}
