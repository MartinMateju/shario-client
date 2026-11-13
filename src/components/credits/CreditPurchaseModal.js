"use client";

import { useLegacyText } from "@/i18n/useLegacyCopy";
import React, {
  Fragment,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useLocale } from "next-intl";
import { useSelector, useDispatch } from "react-redux";
import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  selectShowCreditPurchase,
  hideCreditPurchaseModal,
} from "@/lib/features/credits/creditsSlice";
import { usePurchaseCreditsMutation } from "@/lib/features/credits/creditsApiSlice";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { getCheckoutErrorMessage } from "@/lib/features/checkout/checkout.errors";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { resolveIntlLocale } from "@/i18n/formatting";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { normalizePortalLocationReference } from "@/utils/customerPortalLocation";

const CREDIT_PACKAGES = [
  { amount: 500, popular: false },
  { amount: 1000, popular: true },
  { amount: 1500, popular: false },
  { amount: 2000, popular: false },
];

const classNames = (...classes) => classes.filter(Boolean).join(" ");

export default function CreditPurchaseModal() {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const dispatch = useDispatch();
  const routeLocale = useLocale();

  const user = useSelector(selectCurrentUser) || {};
  const tenant = useSelector(selectCurrentTenant);
  const publicTenantContext = useOptionalPublicTenant();
  const portalLocation = useOptionalCustomerPortalLocation();
  const locationReference = normalizePortalLocationReference(
    portalLocation?.activeLocationReference,
  );
  const userId = user?.id || user?._id;

  const language = useSelector(selectCurrentLanguage) || "CZ";
  const isOpen = useSelector(selectShowCreditPurchase);
  const currency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const locale = resolveIntlLocale(routeLocale);
  const checkoutLocale = resolveRolloutEligibleLocaleCode(routeLocale);

  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [purchaseError, setPurchaseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const purchaseLock = useRef(false);
  const [purchaseCredits, { isLoading }] = usePurchaseCreditsMutation();

  useEffect(() => {
    const restoreFromHistory = (event) => {
      if (!event.persisted) return;
      // Browser Back from checkout can restore this component's locked state.
      purchaseLock.current = false;
      setIsSubmitting(false);
    };
    window.addEventListener("pageshow", restoreFromHistory);
    return () => window.removeEventListener("pageshow", restoreFromHistory);
  }, []);

  const tenantTheme = useMemo(
    () =>
      getPublicTenantTheme(publicTenantContext?.tenant || tenant || {}, {
        surface: publicTenantContext?.surface,
      }),
    [publicTenantContext?.tenant, publicTenantContext?.surface, tenant],
  );

  const isPending = isSubmitting || isLoading;
  const canPurchase = Boolean(userId) && !isPending;
  const loginRequired =
    translation["CREDIT_PURCHASE_LOGIN_REQUIRED"]?.[language];

  const handleClose = useCallback(() => {
    if (purchaseLock.current || isPending) return;
    setSelectedAmount(1000);
    setPurchaseError("");
    dispatch(hideCreditPurchaseModal());
  }, [dispatch, isPending]);

  const handlePurchase = useCallback(async () => {
    if (!userId || purchaseLock.current || isLoading) return;
    purchaseLock.current = true;
    setIsSubmitting(true);
    setPurchaseError("");

    try {
      const resp = await purchaseCredits({
        amount: selectedAmount,
        locale: checkoutLocale,
        ...(locationReference ? { locationReference } : {}),
      }).unwrap();

      const checkoutUrl = resp?.url ? getSafeCheckoutUrl(resp.url) : "";
      if (!checkoutUrl) {
        throw new Error(translation["CREDIT_PURCHASE_FAILED"]?.[language]);
      }
      // Keep the attempt locked until navigation completes.
      window.location.assign(checkoutUrl);
    } catch (error) {
      const msg = getCheckoutErrorMessage({
        error,
        language,
        translations: translation,
        fallback: translation["CREDIT_PURCHASE_FAILED"]?.[language],
      });
      setPurchaseError(msg);
      purchaseLock.current = false;
      setIsSubmitting(false);
    }
  }, [
    userId,
    isLoading,
    purchaseCredits,
    selectedAmount,
    checkoutLocale,
    locationReference,
    translation,
    language,
  ]);

  const packages = useMemo(() => CREDIT_PACKAGES, []);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[9999]"
        onClose={handleClose}
        data-tenant-style={tenantTheme.stylePresetId}
        style={tenantTheme.style}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden" data-dialog-scrollport>
          <div
            className="flex h-full items-end justify-center sm:items-center sm:p-6"
            data-dialog-viewport
          >
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-2 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-2 sm:scale-95"
            >
              <DialogPanel
                className="relative flex max-h-[calc(100dvh-0.75rem)] w-full max-w-lg flex-col overflow-hidden border bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-xl"
                data-credit-purchase-panel
                data-dialog-layout="modal"
                data-dialog-tone="tenant"
                data-tenant-surface="panel"
                style={{
                  borderColor: "var(--tenant-border)",
                  paddingLeft: "env(safe-area-inset-left)",
                  paddingRight: "env(safe-area-inset-right)",
                }}
              >
                {/* Header */}
                <div
                  data-dialog-header
                  className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 py-3 sm:px-6"
                  style={{
                    paddingTop: "max(0.75rem, env(safe-area-inset-top))",
                  }}
                >
                  <div className="min-w-0">
                    <DialogTitle
                      className="text-base font-medium text-[var(--tenant-text-on-surface)] sm:text-xl"
                      data-tenant-type="display"
                    >
                      {translation["PURCHASE_CREDITS"]?.[language]}
                    </DialogTitle>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--tenant-border)] text-[var(--tenant-muted-on-surface)] transition-all hover:bg-[color-mix(in_srgb,var(--tenant-accent)_8%,transparent)] hover:text-[var(--tenant-text-on-surface)] active:scale-95 disabled:opacity-40"
                    onClick={handleClose}
                    disabled={isPending}
                    aria-label={legacyText("CreditPurchaseModal_Close_bbfa7")}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                {/* Body */}
                <div
                  data-dialog-body
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6"
                >
                  <DialogDescription className="mb-4 text-xs leading-5 text-[var(--tenant-muted-on-surface)] sm:text-sm">
                    {translation["CREDIT_PURCHASE_DESCRIPTION"]?.[language]}
                  </DialogDescription>
                  <fieldset disabled={isPending} className="min-w-0">
                    <legend
                      className="text-sm font-medium text-[var(--tenant-text-on-surface)]"
                      data-tenant-type="label"
                    >
                      {translation["SELECT_PACKAGE"]?.[language]}
                    </legend>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {packages.map((pkg) => {
                        const isSelected = selectedAmount === pkg.amount;

                        return (
                          <label
                            key={pkg.amount}
                            data-credit-package
                            data-selected={isSelected}
                            data-tenant-surface="card"
                            style={
                              isSelected
                                ? {
                                    borderColor: "var(--tenant-accent)",
                                    boxShadow: "0 0 0 2px var(--tenant-accent)",
                                    backgroundColor:
                                      "color-mix(in srgb, var(--tenant-accent) 8%, var(--tenant-surface))",
                                  }
                                : undefined
                            }
                            className={classNames(
                              "relative flex min-w-0 cursor-pointer rounded-xl border bg-[var(--tenant-background)] p-3 shadow-sm transition-all focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--tenant-accent)] sm:p-4",
                              isSelected
                                ? "border-[var(--tenant-accent)] ring-2 ring-[var(--tenant-accent)]"
                                : "border-[var(--tenant-border)] hover:border-[var(--tenant-accent)]",
                              isPending ? "pointer-events-none opacity-60" : "",
                            )}
                          >
                            <input
                              type="radio"
                              name="credit-package"
                              value={pkg.amount}
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAmount(pkg.amount);
                                setPurchaseError("");
                              }}
                              className="sr-only"
                              disabled={isPending}
                            />

                            <span className="flex min-w-0 flex-1 flex-col text-left">
                              <span className="text-sm font-medium text-[var(--tenant-text)] sm:text-base">
                                {formatMajorCurrencyAmount(
                                  pkg.amount,
                                  currency,
                                  locale,
                                )}
                              </span>

                              <span className="mt-1 text-xs text-[var(--tenant-muted-text)]">
                                {translation["CREDITS"]?.[language]}
                              </span>

                              <span className="mt-2 flex min-h-5 flex-wrap items-center gap-1.5">
                                {pkg.popular && (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 ring-1 ring-green-200">
                                    {translation["POPULAR"]?.[language]}
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="text-xs font-medium text-[var(--tenant-accent-link)]">
                                    {translation["SELECTED"]?.[language]}
                                  </span>
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {/* Summary card */}
                  <div
                    className="mt-5 rounded-xl border bg-[var(--tenant-surface)] p-4"
                    data-credit-purchase-summary
                    data-tenant-surface="card"
                    style={{ borderColor: "var(--tenant-border)" }}
                  >
                    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                      <span className="text-[var(--tenant-muted-on-surface)]">
                        {translation["SELECTED_AMOUNT"]?.[language]}:
                      </span>
                      <span className="font-medium text-[var(--tenant-text-on-surface)]">
                        {formatMajorCurrencyAmount(
                          selectedAmount,
                          currency,
                          locale,
                        )}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                      <span className="text-[var(--tenant-muted-on-surface)]">
                        {translation["PAYMENT_METHOD"]?.[language]}:
                      </span>
                      <span className="text-[var(--tenant-text-on-surface)]">
                        {translation["CREDIT_CARD"]?.[language]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div
                  data-dialog-footer
                  className="shrink-0 border-t border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6"
                >
                  {(!userId || purchaseError) && (
                    <p
                      role="alert"
                      tabIndex={0}
                      data-tenant-surface="card"
                      className="mb-3 max-h-24 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800 [overflow-wrap:anywhere]"
                    >
                      {!userId ? loginRequired : purchaseError}
                    </p>
                  )}
                  {isPending && (
                    <p
                      role="status"
                      className="mb-2 text-xs text-[var(--tenant-muted-on-surface)]"
                    >
                      {translation["PLEASE_WAIT"]?.[language]}
                    </p>
                  )}
                  <div className="flex items-stretch justify-end gap-2">
                    <button
                      type="button"
                      data-tenant-button="secondary"
                      data-tenant-button-compact
                      className="min-h-11 shrink-0 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40"
                      onClick={handleClose}
                      disabled={isPending}
                    >
                      {translation["CANCEL"]?.[language]}
                    </button>

                    <button
                      type="button"
                      data-tenant-button="primary"
                      data-tenant-button-compact
                      className="min-h-11 min-w-0 flex-1 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wide transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:flex-none sm:px-6"
                      onClick={handlePurchase}
                      disabled={!canPurchase}
                      title={!userId ? loginRequired : ""}
                      aria-busy={isPending}
                    >
                      {isPending ? (
                        translation["PROCESSING"]?.[language]
                      ) : (
                        <>
                          {translation["PURCHASE"]?.[language]}{" "}
                          <span className="whitespace-nowrap">
                            {formatMajorCurrencyAmount(
                              selectedAmount,
                              currency,
                              locale,
                            )}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
