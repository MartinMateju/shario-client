"use client";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import {
  BanknotesIcon,
  CheckIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { useCheckCreditsForCartMutation } from "@/lib/features/credits/creditsApiSlice";
import {
  selectPaymentMethod,
  setPaymentMethod,
} from "@/lib/features/credits/creditsSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  formatMajorCurrencyAmount,
  toNonNegativeMajorCurrencyAmount,
} from "@/utils/money";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const formatPaymentAmount = (amount, currency, locale) =>
  String(currency).toUpperCase() === "CZK"
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "CZK",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    : formatMajorCurrencyAmount(amount, currency, locale);

export default function PaymentMethodSelector({
  cartTotal = 0,
  currency: currencyProp,
  onMethodChange,
}) {
  const activeLocale = useLegacyLocale();
  const dispatch = useDispatch();
  const { id: userId } = useSelector(selectCurrentUser) || {};
  const tenant = useSelector(selectCurrentTenant);
  const language = useSelector(selectCurrentLanguage) === "EN" ? "EN" : "CZ";
  const text = useLegacyCopy("paymentMethods");
  const currency =
    currencyProp ||
    tenant?.settings?.currency ||
    DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const locale = activeLocale;
  const paymentMethod = useSelector(selectPaymentMethod) || "card";
  const [checkCredits, { data: creditCheckData, isLoading }] =
    useCheckCreditsForCartMutation();
  const safeCartTotal = useMemo(
    () => toNonNegativeMajorCurrencyAmount(cartTotal, currency),
    [cartTotal, currency],
  );

  useEffect(() => {
    if (safeCartTotal > 0 && userId) {
      checkCredits({ userId, cartTotal: safeCartTotal });
    }
  }, [checkCredits, safeCartTotal, userId]);

  useEffect(() => {
    onMethodChange?.(paymentMethod);
  }, [onMethodChange, paymentMethod]);

  const canAffordWithCredits = Boolean(creditCheckData?.canAfford);
  const deficit = toNonNegativeMajorCurrencyAmount(
    creditCheckData?.deficit,
    currency,
  );
  const selectMethod = (method) => dispatch(setPaymentMethod(method));

  useEffect(() => {
    if (
      creditCheckData &&
      !isLoading &&
      paymentMethod === "credits" &&
      !canAffordWithCredits
    ) {
      dispatch(setPaymentMethod("card"));
    }
  }, [
    canAffordWithCredits,
    creditCheckData,
    dispatch,
    isLoading,
    paymentMethod,
  ]);

  if (safeCartTotal === 0) return null;

  return (
    <div data-payment-method-selector>
      <div className="flex min-h-5 items-center justify-between gap-3">
        <h3 className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]">
          {text.label}
        </h3>
        {isLoading ? (
          <span
            className="inline-flex items-center gap-1.5 text-[9px] text-[var(--tenant-muted-on-surface)]"
            aria-live="polite"
          >
            <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-r-transparent motion-reduce:animate-none" />
            {text.checking}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 [@media(max-height:740px)]:mt-2">
        <button
          type="button"
          onClick={() => selectMethod("card")}
          className={cx(
            "relative min-h-[68px] rounded-[15px] border p-2.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 [@media(max-height:740px)]:min-h-[58px] motion-reduce:transform-none motion-reduce:transition-none",
            paymentMethod === "card"
              ? "border-[var(--tenant-accent-on-surface)] bg-[color-mix(in_srgb,var(--tenant-accent)_8%,var(--tenant-surface))] shadow-[0_8px_22px_color-mix(in_srgb,var(--tenant-accent)_10%,transparent)]"
              : "border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-background)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_38%,transparent)]",
          )}
          aria-pressed={paymentMethod === "card"}
          data-payment-method="card"
        >
          <span className="flex items-start justify-between gap-2">
            <CreditCardIcon
              className="h-5 w-5 text-[var(--tenant-accent-on-surface)]"
              aria-hidden="true"
            />
            {paymentMethod === "card" ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]">
                <CheckIcon className="h-2.5 w-2.5 stroke-[2.5]" />
              </span>
            ) : null}
          </span>
          <span className="mt-1.5 block text-[10px] font-semibold text-[var(--tenant-text-on-surface)]">
            {text.card}
          </span>
          <span className="mt-0.5 block text-[8px] leading-4 text-[var(--tenant-muted-on-surface)] [@media(max-height:740px)]:hidden">
            {text.cardDescription}
          </span>
        </button>

        <button
          type="button"
          disabled={!canAffordWithCredits}
          onClick={() => selectMethod("credits")}
          className={cx(
            "relative min-h-[68px] rounded-[15px] border p-2.5 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 disabled:cursor-not-allowed disabled:opacity-80 [@media(max-height:740px)]:min-h-[58px] motion-reduce:transform-none motion-reduce:transition-none",
            paymentMethod === "credits" && canAffordWithCredits
              ? "border-[var(--tenant-accent-on-surface)] bg-[color-mix(in_srgb,var(--tenant-accent)_8%,var(--tenant-surface))] shadow-[0_8px_22px_color-mix(in_srgb,var(--tenant-accent)_10%,transparent)]"
              : "border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-background)] enabled:hover:-translate-y-0.5 enabled:hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_38%,transparent)]",
          )}
          aria-pressed={paymentMethod === "credits"}
          data-payment-method="credits"
          title={!canAffordWithCredits ? text.insufficient : undefined}
        >
          <span className="flex items-start justify-between gap-2">
            <BanknotesIcon
              className="h-5 w-5 text-[var(--tenant-accent-on-surface)]"
              aria-hidden="true"
            />
            {paymentMethod === "credits" && canAffordWithCredits ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]">
                <CheckIcon className="h-2.5 w-2.5 stroke-[2.5]" />
              </span>
            ) : null}
          </span>
          <span className="mt-1.5 block text-[10px] font-semibold text-[var(--tenant-text-on-surface)]">
            {text.credits}
          </span>
          <span className="mt-0.5 block text-[8px] leading-4 text-[var(--tenant-muted-on-surface)] [@media(max-height:740px)]:hidden">
            {text.creditsDescription}
          </span>
        </button>
      </div>

      <div
        className={cx(
          "mt-2.5 rounded-[13px] border px-3 py-2.5 [@media(max-height:740px)]:mt-2 [@media(max-height:740px)]:py-2",
          !canAffordWithCredits && deficit > 0
            ? "border-[#E8CDB2] bg-[#FFF9F0]"
            : "border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)]",
        )}
        data-credit-coverage={canAffordWithCredits ? "covered" : "insufficient"}
      >
        {!canAffordWithCredits && deficit > 0 ? (
          <div
            className="flex min-w-0 items-center gap-2.5 text-[#80501F]"
            data-credit-shortfall
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70">
              <ExclamationTriangleIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[8px] font-semibold uppercase tracking-[0.12em]">
                {text.shortfall}
              </span>
              <span className="mt-0.5 block text-[10px] font-semibold leading-4">
                {formatPaymentAmount(deficit, currency, locale)} {text.short}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-[#4E7147]">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70">
              <CheckIcon className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            </span>
            <p className="text-[9px] font-medium leading-4">{text.covered}</p>
          </div>
        )}

        {!canAffordWithCredits && deficit > 0 ? (
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "credits/showCreditPurchaseModal" })
            }
            className="mt-2.5 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full border border-[#D9B68E] bg-white/65 px-3 text-[9px] font-semibold text-[#80501F] transition hover:border-[#B88655] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B88655]/25"
          >
            <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {text.addCredits}
          </button>
        ) : null}
      </div>
    </div>
  );
}
