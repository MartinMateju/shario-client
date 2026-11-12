"use client";

import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { CreditCardIcon, PlusIcon } from "@heroicons/react/24/outline";

import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useGetMyCreditBalanceQuery } from "@/lib/features/credits/creditsApiSlice";
import { setBalance } from "@/lib/features/credits/creditsSlice";
import translation from "@/translations/translation";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  formatMajorCurrencyAmount,
  toNonNegativeMajorCurrencyAmount,
} from "@/utils/money";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function CartCreditSummary({
  showPurchaseButton = true,
  className = "",
  currency: currencyProp,
  compact = false,
}) {
  const dispatch = useDispatch();
  const tenant = useSelector(selectCurrentTenant);
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const currency =
    currencyProp ||
    tenant?.settings?.currency ||
    DEFAULT_STUDIO_COMMERCE_CURRENCY;

  const { data: creditData, isLoading, isError } = useGetMyCreditBalanceQuery();

  useEffect(() => {
    if (creditData?.balance !== undefined) {
      dispatch(setBalance(creditData.balance));
    }
  }, [creditData, dispatch]);

  const balance = toNonNegativeMajorCurrencyAmount(
    creditData?.balance,
    currency,
  );
  const locale = language === "CZ" ? "cs-CZ" : "en-GB";
  const formattedBalance =
    String(currency).toUpperCase() === "CZK"
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "CZK",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(balance)
      : formatMajorCurrencyAmount(balance, currency, locale);

  const wrapperClasses =
    "relative overflow-hidden rounded-[24px] border border-[rgba(179,162,146,0.42)] " +
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,245,242,0.88)_100%)] " +
    "shadow-[0_10px_30px_rgba(15,17,19,0.04)]";

  const labelClasses =
    "text-[10px] sm:text-[11px] uppercase tracking-[0.18em]  text-[#7A716A]";

  const valueClasses =
    "text-[28px] sm:text-[32px] leading-none font-medium text-[var(--unnamed-color-0f1113)]";

  const purchaseButtonClasses =
    "inline-flex items-center justify-center rounded-full border " +
    "px-4 py-2.5 text-[10px] sm:text-[11px]  uppercase tracking-[0.16em] " +
    "transition-all duration-200 ease-out active:scale-95 touch-manipulation " +
    "border-[var(--unnamed-color-b3a292)] bg-white/85 text-[var(--unnamed-color-0f1113)] " +
    "hover:bg-white hover:border-[var(--unnamed-color-0f1113)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--unnamed-color-b3a292)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F5F2]";

  if (isLoading) {
    if (compact) {
      return (
        <div
          className={classNames(
            "flex min-h-[66px] items-center gap-3 rounded-[15px] border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)] px-3.5 py-2.5",
            className,
          )}
          data-cart-credit-compact
          aria-busy="true"
        >
          <span className="h-9 w-9 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--tenant-text)_8%,transparent)] motion-reduce:animate-none" />
          <span className="min-w-0 flex-1">
            <span className="block h-2.5 w-24 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--tenant-text)_8%,transparent)] motion-reduce:animate-none" />
            <span className="mt-2 block h-4 w-20 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] motion-reduce:animate-none" />
          </span>
        </div>
      );
    }

    return (
      <div className={classNames(wrapperClasses, "p-4 sm:p-5", className)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-black/10" />
            <div className="min-w-0">
              <div className="h-3 w-28 animate-pulse rounded bg-black/10" />
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-black/10" />
            </div>
          </div>

          {showPurchaseButton && (
            <div className="h-10 w-36 animate-pulse rounded-full bg-black/10" />
          )}
        </div>

        <div className="mt-4 h-px w-full bg-black/8" />
        <div className="mt-3 h-3 w-48 animate-pulse rounded bg-black/10" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={classNames(
          "rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm  text-red-600",
          className,
        )}
      >
        {translation["CREDITS_ERROR"]?.[language] || "Error loading credits"}
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={classNames(
          "relative flex min-h-[66px] items-center gap-3 overflow-hidden rounded-[15px] border border-[color-mix(in_srgb,var(--tenant-text)_11%,transparent)] bg-[var(--tenant-background)] px-3.5 py-2.5",
          className,
        )}
        data-cart-credit-compact
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-20 w-20 rounded-full bg-[color-mix(in_srgb,var(--tenant-secondary)_10%,transparent)] blur-2xl"
          aria-hidden="true"
        />
        <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)]">
          <CreditCardIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[8px] font-semibold uppercase tracking-[0.15em] text-[var(--tenant-muted-text)]">
            {translation["CREDIT_BALANCE"]?.[language] || "Credit balance"}
          </span>
          <span className="mt-0.5 block text-[16px] font-semibold tracking-[-0.03em] text-[var(--tenant-text)]">
            {formattedBalance}
          </span>
        </span>
        <span className="relative hidden max-w-[118px] text-right text-[8px] leading-4 text-[var(--tenant-muted-text)] min-[380px]:block">
          {language === "CZ"
            ? "Lze použít při dokončení objednávky."
            : "Available for this checkout."}
        </span>
      </div>
    );
  }

  return (
    <div className={classNames(wrapperClasses, className)}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(179,162,146,0.10)] blur-2xl" />
      </div>

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(179,162,146,0.45)] bg-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
              <CreditCardIcon className="h-5 w-5 text-[var(--unnamed-color-b3a292)]" />
            </div>

            <div className="min-w-0">
              <p className={labelClasses}>
                {translation["CREDIT_BALANCE"]?.[language] || "Credit balance"}
              </p>

              <div className="mt-1.5 flex items-end gap-2">
                <span className={valueClasses}>{formattedBalance}</span>
              </div>
            </div>
          </div>

          {showPurchaseButton && (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "credits/showCreditPurchaseModal" })
              }
              className={classNames(
                purchaseButtonClasses,
                "w-full sm:w-auto sm:shrink-0",
              )}
            >
              <PlusIcon className="mr-2 h-4 w-4 text-[var(--unnamed-color-b3a292)]" />
              {translation["ADD_CREDITS"]?.[language] || "Add Credits"}
            </button>
          )}
        </div>

        <div className="mt-4 border-t border-[rgba(179,162,146,0.22)] pt-3.5">
          <p className="text-xs sm:text-[13px] leading-relaxed  text-[#6B635D]">
            {language === "CZ"
              ? "Kredity můžete využít jako slevu při dokončení objednávky."
              : "Credits can be used as a discount when completing your order."}
          </p>
        </div>
      </div>
    </div>
  );
}
