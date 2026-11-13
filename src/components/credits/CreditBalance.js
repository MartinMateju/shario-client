"use client";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CreditCardIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useGetMyCreditBalanceQuery } from "@/lib/features/credits/creditsApiSlice";
import { setBalance } from "@/lib/features/credits/creditsSlice";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { toNonNegativeMajorCurrencyAmount } from "@/utils/money";
import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
  formatCustomerPortalCurrencyAmount,
} from "@/components/customer-shell/CustomerPortalPrimitives";

export default function CreditBalance({
  showPurchaseButton = true,
  className = "",
}) {
  const activeLocale = useLegacyLocale();
  const dispatch = useDispatch();
  const tenant = useSelector(selectCurrentTenant);
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const currency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const {
    data: creditData,
    isLoading,
    isError,
    refetch,
  } = useGetMyCreditBalanceQuery();

  useEffect(() => {
    if (creditData?.balance !== undefined) {
      dispatch(setBalance(Number(creditData.balance || 0)));
    }
  }, [creditData?.balance, dispatch]);

  const balance = toNonNegativeMajorCurrencyAmount(
    creditData?.balance,
    currency,
  );
  const locale = activeLocale;
  const copy = useLegacyCopy("creditBalance");

  const handlePurchaseCredits = () => {
    dispatch({ type: "credits/showCreditPurchaseModal" });
  };

  if (isLoading) {
    return (
      <CustomerPortalSurface className={`h-full p-3 ${className}`}>
        <CustomerPortalLoadingState label={copy.loading} />
      </CustomerPortalSurface>
    );
  }

  if (isError || !creditData) {
    return (
      <CustomerPortalSurface className={`h-full p-3 ${className}`}>
        <CustomerPortalEmptyState
          className="min-h-[300px] sm:min-h-[340px]"
          icon={ExclamationTriangleIcon}
          title={copy.errorTitle}
          description={copy.errorDescription}
          action={
            <button
              type="button"
              onClick={refetch}
              className={customerPortalSecondaryActionClass}
            >
              {copy.retry}
            </button>
          }
        />
      </CustomerPortalSurface>
    );
  }

  return (
    <CustomerPortalSurface
      className={`relative flex h-full flex-col ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_9%,transparent)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-1 flex-col p-6 sm:p-7 lg:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tenant-accent-on-surface)] sm:text-[11px]">
              {copy.eyebrow}
            </p>

            <h2 className="mt-3 font-serif text-[28px] leading-tight tracking-[-0.035em] text-[var(--tenant-heading-on-surface)] sm:text-[32px]">
              {copy.title}
            </h2>
          </div>

          <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[17px] border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)] shadow-[0_10px_28px_rgba(17,17,15,0.05)]">
            <CreditCardIcon
              className="h-6 w-6 stroke-[1.7]"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:mt-12">
          <div>
            <span className="block font-serif text-[48px] leading-none tracking-[-0.055em] text-[var(--tenant-text-on-surface)] sm:text-[58px]">
              {formatCustomerPortalCurrencyAmount(balance, currency, locale)}
            </span>

            <p className="mt-4 max-w-sm text-[13px] leading-6 text-[var(--tenant-muted-on-surface)]">
              {copy.description}
            </p>
          </div>

          {showPurchaseButton && (
            <button
              type="button"
              onClick={handlePurchaseCredits}
              className={`${customerPortalPrimaryActionClass} mt-8 w-full sm:w-auto`}
            >
              <PlusIcon
                className="h-4 w-4 stroke-[1.8] transition-transform duration-200 group-hover:rotate-90 motion-reduce:transition-none"
                aria-hidden="true"
              />
              {copy.add}
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-[color-mix(in_srgb,var(--tenant-text)_9%,transparent)] bg-[var(--tenant-background)] px-6 py-4 text-[11px] leading-5 text-[var(--tenant-muted-text)] sm:px-7 lg:px-8">
        {copy.hint}
      </div>
    </CustomerPortalSurface>
  );
}
