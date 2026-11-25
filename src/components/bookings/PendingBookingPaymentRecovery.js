"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDispatch } from "react-redux";
import { Link } from "@/i18n/navigation";
import { useCancelPendingBookingCheckoutMutation } from "@/lib/features/checkout/checkoutSlice";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import { resetBookingCheckoutAttempt } from "@/lib/features/cart/cartSlice";

export const getPendingCheckoutOrderId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value) ? value : "";


export default function PendingBookingPaymentRecovery({
  orderId: inputOrderId,
  locationReference,
  onBusyChange,
}) {
  const t = useTranslations("PendingBookingPayment");
  const dispatch = useDispatch();
  const orderId = getPendingCheckoutOrderId(inputOrderId);
  const [cancelCheckout] = useCancelPendingBookingCheckoutMutation();
  const [state, setState] = useState("idle");
  const lock = useRef(false);
  const busy = state === "busy";
  const canCancel = ["idle", "error"].includes(state);

  const cancel = async () => {
    if (!orderId || lock.current || !canCancel) return;
    lock.current = true;
    setState("busy");
    onBusyChange?.(true);
    try {
      const result = await cancelCheckout({ orderId }).unwrap();
      if (
        result?.status === "cancelled_order" &&
        result?.reservationReleased === true &&
        result?.orderId === orderId
      ) {
        dispatch(resetBookingCheckoutAttempt());
        setState("cancelled");
      } else {
        setState("error");
      }
    } catch (error) {
      const code = error?.data?.code ?? error?.data?.error?.code;
      setState(
        code === "CHECKOUT_PAYMENT_CONFIRMED"
          ? "paid"
          : code === "CHECKOUT_PAYMENT_PENDING"
            ? "pending"
            : code === "CHECKOUT_CANCELLATION_UNSUPPORTED"
              ? "unsupported"
              : code === "CHECKOUT_ORDER_NOT_FOUND"
                ? "missing"
                : "error",
      );
    } finally {
      lock.current = false;
      onBusyChange?.(false);
    }
  };

  if (!orderId) return null;

  return (
    <section
      className="space-y-3 rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-4 text-sm"
      aria-busy={busy}
    >
      <h2 className="font-semibold text-[var(--tenant-heading-on-surface)]">
        {t("title")}
      </h2>
      {state === "idle" && <p className="leading-6">{t("explanation")}</p>}
      {state !== "idle" && (
        <p role={state === "error" ? "alert" : "status"} className="leading-6">
          {t(state)}
        </p>
      )}
      {(canCancel || busy) && (
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="min-h-11 w-full rounded-full border border-[var(--tenant-border)] px-4 py-3 font-semibold disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? t("busy") : t("action")}
        </button>
      )}
      {["paid", "pending"].includes(state) && (
        <Link
          href={retainCustomerPortalLocation(
            `/portal/success?orderId=${encodeURIComponent(orderId)}`,
            locationReference,
          )}
          className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-accent-on-surface)]"
        >
          {t("status")}
        </Link>
      )}
      {state === "cancelled" && (
        <Link
          href={retainCustomerPortalLocation("/portal", locationReference)}
          className="inline-flex min-h-11 items-center font-semibold text-[var(--tenant-accent-on-surface)]"
        >
          {t("bookAgain")}
        </Link>
      )}
    </section>
  );
}
