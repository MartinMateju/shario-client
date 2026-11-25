"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import PendingBookingPaymentRecovery, {
  getPendingCheckoutOrderId,
} from "@/components/bookings/PendingBookingPaymentRecovery";
import {
  getPortalLocationReferenceFromSearchParams,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";

export default function Cancel() {
  const t = useTranslations("PaymentCancellation");
  const searchParams = useSearchParams();
  const locationReference =
    getPortalLocationReferenceFromSearchParams(searchParams);
  const portalHref = retainCustomerPortalLocation("/portal", locationReference);
  // Voucher checkout has its own recovery rules; this action handles ordinary
  // unpaid Open Studio bookings only.
  const orderId = searchParams.get("voucher")
    ? ""
    : getPendingCheckoutOrderId(searchParams.get("orderId"));

  return (
    <main className="min-h-screen bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <section className="mt-10 rounded-3xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <h1 className="text-center text-2xl font-medium text-[var(--tenant-heading-on-surface)] sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
            {t("description")}
          </p>
          {orderId && (
            <div className="mt-6">
              <PendingBookingPaymentRecovery
                key={orderId}
                orderId={orderId}
                locationReference={locationReference}
              />
            </div>
          )}
          {!orderId && !searchParams.get("voucher") && (
            <p className="mt-6 text-sm leading-6">
              {t("creditsHint")}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={portalHref}
              className={customerPortalPrimaryActionClass}
            >
              {t("backToBookings")}
            </Link>
            <Link href="/" className={customerPortalSecondaryActionClass}>
              {t("home")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
