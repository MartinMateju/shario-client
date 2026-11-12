"use client";

import { isSupportedCartItem } from "@/lib/features/cart/cartItemScope";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  MapPinIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useLocale } from "next-intl";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import CreditPurchaseModal from "@/components/credits/CreditPurchaseModal";
import CartCreditSummary from "@/components/credits/CartCreditSummary";
import CartCheckoutPaymentOptions from "./CartCheckoutPaymentOptions";
import {
  getCartPaymentOptions,
  getVerifiedCartQuote,
} from "./cartCheckout.utils";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import {
  DEFAULT_STUDIO_COMMERCE_CURRENCY,
  normalizeCurrency,
} from "@/config/currencies";
import { resolveIntlLocale } from "@/i18n/formatting";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import { useRouter } from "@/i18n/navigation";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  removeBookingItems,
  closeCart,
  removeItem,
  selectCartIsOpen,
} from "@/lib/features/cart/cartSlice";
import { getAuthCacheIdentity } from "@/lib/features/auth/authSlice";
import {
  useCheckoutMutation,
  useCheckoutWithMembershipMutation,
  useGetCartCheckoutQuoteQuery,
} from "@/lib/features/checkout/checkoutSlice";
import { getCheckoutErrorMessage } from "@/lib/features/checkout/checkout.errors";
import {
  useCheckoutWithCreditsMutation,
  useGetMyCreditBalanceQuery,
} from "@/lib/features/credits/creditsApiSlice";
import { setBalance } from "@/lib/features/credits/creditsSlice";
import translation from "@/translations/translation";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { minorUnitsToMajor } from "@/utils/money";
import {
  formatCartCurrencyAmount,
  getCartCopy,
  getCartItemCountLabel,
  getCartItemHourlyPriceMajor,
  getCartItemTotalMajor,
  getCartItemPrivateSurchargeMajor,
  getCartProductName,
  isStandaloneServiceCartItem,
  isTimedStudioCartItem,
} from "./cartModal.utils";
const cx = (...classes) => classes.filter(Boolean).join(" ");
const createCheckoutIdempotencyKey = () =>
  `cart-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;

// On phones the checkout button opens where the booking drawer's "Add to
// cart" was, under the same thumb. A repeated tap meant for that button must
// not start payment, so a pointer click only counts once the button has been
// enabled for a second. Repeated taps were seen up to 1.6s after "Add to
// cart", while the cart appears after about 0.95s. Keyboard activation (a
// click with detail 0) is unaffected.
const CHECKOUT_ARMING_MS = 1000;
const nowMs = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
const checkoutButtonClass = cx(
  "group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 [@media(max-height:740px)]:min-h-11",
  "text-[12px] font-semibold tracking-[-0.01em]",
  "transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-[0.97]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/35 focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:hover:translate-y-0",
  "motion-reduce:transform-none motion-reduce:transition-none",
);
function Detail({ icon: Icon, label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex min-w-0 items-center gap-2 text-[11px] leading-5 text-[var(--tenant-muted-on-surface)] sm:text-[12px]">
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="shrink-0 font-medium text-[var(--tenant-text-on-surface)]">
        {label}
      </span>
      <span className="truncate" title={String(value)}>
        {value}
      </span>
    </div>
  );
}
export default function CartModal({
  allowBookings = true,
  allowCourses = allowBookings,
  allowServices = true,
}) {
  const dispatch = useDispatch();
  const router = useRouter();
  const routeLocale = useLocale();
  const language = useSelector(selectCurrentLanguage) === "EN" ? "EN" : "CZ";
  const cartItemsState = useSelector((state) => state.cart);
  const ownerScope = useSelector(getAuthCacheIdentity);
  const open = useSelector(selectCartIsOpen);
  const publicTenantContext = useOptionalPublicTenant();
  const tenantTheme = useMemo(
    () =>
      getPublicTenantTheme(publicTenantContext?.tenant || {}, {
        surface: publicTenantContext?.surface,
      }),
    [publicTenantContext?.tenant, publicTenantContext?.surface],
  );
  const copy = getCartCopy(language);
  const locale = resolveIntlLocale(routeLocale);
  const checkoutLocale = resolveRolloutEligibleLocaleCode(routeLocale);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const checkoutRequest = useRef(null);
  const [sendCheckout, { isLoading: isCheckoutLoading }] =
    useCheckoutMutation();
  const [sendMembershipCheckout, { isLoading: isMembershipCheckoutLoading }] =
    useCheckoutWithMembershipMutation();
  const [
    sendCreditCheckout,
    { isLoading: isCreditCheckoutLoading, isSuccess: isCreditCheckoutSuccess },
  ] = useCheckoutWithCreditsMutation();
  const { data: creditData } = useGetMyCreditBalanceQuery();
  const allCart = useMemo(
    () =>
      Array.isArray(cartItemsState?.cart)
        ? cartItemsState.cart.filter(isSupportedCartItem)
        : [],
    [cartItemsState],
  );
  const bookingCart = allCart.filter((item) =>
    isStandaloneServiceCartItem(item)
      ? allowServices
      : item.bookingCourse
        ? allowCourses
        : allowBookings,
  );
  const cart = bookingCart;
  const isCartEmpty = cart.length === 0;
  const cartCurrencies = useMemo(
    () => [
      ...new Set(
        cart
          .map((item) =>
            normalizeCurrency(item?.currency || item?.product?.currency),
          )
          .filter(Boolean),
      ),
    ],
    [cart],
  );
  const hasMixedCurrencies = cartCurrencies.length > 1;
  const quoteQuery = useGetCartCheckoutQuoteQuery(
    {
      cart: bookingCart,
      locale: checkoutLocale,
      ownerScope,
    },
    {
      skip: !open || !bookingCart.length || hasMixedCurrencies,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const quote = getVerifiedCartQuote(quoteQuery.currentData);
  const quoteReady =
    Boolean(quote) && !quoteQuery.isFetching && !quoteQuery.isError;
  const paymentOptions = quoteReady
    ? getCartPaymentOptions(quoteQuery.currentData)
    : [];
  const selectedOption = selectedOptionId
    ? paymentOptions.find(
        (option) => option.optionId === selectedOptionId && option.selectable,
      )
    : paymentOptions.find(
        (option) => option.method === "card" && option.selectable,
      ) || paymentOptions.find((option) => option.selectable);
  const selectedPaymentMethod =
    selectedOption?.method === "money_credits"
      ? "credits"
      : selectedOption?.method;
  const cartCurrency =
    quote?.currency || cartCurrencies[0] || DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const isLoading =
    isCheckoutLoading || isCreditCheckoutLoading || isMembershipCheckoutLoading;
  const total = quoteReady
    ? minorUnitsToMajor(
        selectedPaymentMethod === "membership_credits" ? 0 : quote.totalMinor,
        cartCurrency,
      )
    : null;
  useEffect(() => {
    if (creditData?.balance !== undefined) {
      dispatch(setBalance(creditData.balance));
    }
  }, [creditData, dispatch]);
  useEffect(() => {
    // Credit checkout is final; card checkout keeps the cart until Stripe or
    // an authoritative free-order response confirms the purchase.
    if (isCreditCheckoutSuccess) {
      checkoutRequest.current = null;
      setSelectedOptionId("");
      dispatch(removeBookingItems());
      dispatch(closeCart());
    }
  }, [dispatch, isCreditCheckoutSuccess]);
  const close = useCallback(() => {
    if (!isLoading) dispatch(closeCart());
  }, [dispatch, isLoading]);
  const checkoutButtonLabel =
    selectedPaymentMethod === "membership_credits"
      ? copy.confirmWithMembership
      : selectedPaymentMethod === "credits"
        ? copy.payWithCredits
        : copy.continueToPayment;
  const handleSubmitCheckout = async (event) => {
    event.preventDefault();
    if (
      !cart.length ||
      isLoading ||
      hasMixedCurrencies ||
      !quoteReady ||
      !selectedOption
    )
      return;
    try {
      const checkoutData = {
        locale: checkoutLocale,
        cart,
        ...(selectedPaymentMethod === "membership_credits"
          ? {
              membershipBenefitKey: selectedOption.benefitKey,
            }
          : {}),
      };
      const requestSignature = JSON.stringify([
        selectedPaymentMethod,
        checkoutData,
      ]);
      if (checkoutRequest.current?.signature !== requestSignature) {
        checkoutRequest.current = {
          signature: requestSignature,
          key: createCheckoutIdempotencyKey(),
        };
      }
      const request = {
        ...checkoutData,
        idempotencyKey: checkoutRequest.current.key,
      };
      const result =
        selectedPaymentMethod === "membership_credits"
          ? await sendMembershipCheckout(request).unwrap()
          : selectedPaymentMethod === "credits"
            ? await sendCreditCheckout(request).unwrap()
            : await sendCheckout(request).unwrap();
      const orderId = String(result?.orderId || "").trim();
      if (result?.status === "confirmed" && orderId) {
        // A zero-priced order can complete through the normal checkout endpoint.
        // Only the server's result, never the displayed total, confirms it.
        checkoutRequest.current = null;
        setSelectedOptionId("");
        dispatch(removeBookingItems());
        dispatch(closeCart());
        router.replace(
          `/portal/success?orderId=${encodeURIComponent(orderId)}`,
        );
        return;
      }
      const checkoutUrl = result?.url ? getSafeCheckoutUrl(result.url) : "";

      // A remaining card response starts a payment session, so retries reuse it.
      // Credit checkout completes the purchase and starts a new attempt next time.
      if (
        selectedPaymentMethod === "credits" &&
        (result?.success === true || result?.message || checkoutUrl)
      ) {
        checkoutRequest.current = null;
      }
      if (checkoutUrl) {
        dispatch(closeCart());
        window.location.assign(checkoutUrl);
        return;
      }
      if (
        selectedPaymentMethod === "credits" &&
        (result?.success === true || result?.message)
      ) {
        return;
      }
      throw new Error(
        translation["CHECKOUT_REDIRECT_MISSING"]?.[language] ||
          "The secure payment page could not be opened. Please try again.",
      );
    } catch (error) {
      void quoteQuery.refetch();
      alert(
        getCheckoutErrorMessage({
          error,
          language,
          translations: translation,
          fallback:
            language === "CZ"
              ? "Platbu se nepodařilo zahájit. Zkuste to prosím znovu."
              : "Checkout failed. Please try again.",
        }),
      );
    }
  };
  const checkoutDisabled =
    isLoading ||
    isCartEmpty ||
    hasMixedCurrencies ||
    !quoteReady ||
    !selectedOption;

  // The cart host mounts this modal as the cart opens, so mounting arms it.
  // A layout effect re-arms it before the browser paints the enabled button,
  // leaving no frame in which a stray tap passes on the older time.
  const checkoutArmedAtRef = useRef(nowMs());
  useLayoutEffect(() => {
    if (open && !checkoutDisabled) checkoutArmedAtRef.current = nowMs();
  }, [checkoutDisabled, open]);
  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[9999]"
        onClose={isLoading ? () => {} : close}
        data-tenant-style={tenantTheme.stylePresetId}
        style={tenantTheme.style}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300 ease-out motion-reduce:transition-none"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-180 ease-in motion-reduce:transition-none"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-[#171715]/45 backdrop-blur-[4px]"
          />
        </TransitionChild>

        <div className="fixed inset-0 w-screen overflow-hidden">
          <div className="flex min-h-full items-stretch justify-center sm:items-center sm:p-5 lg:p-8">
            <TransitionChild
              as={Fragment}
              enter="transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
              enterFrom="translate-y-3 scale-[0.985] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
              enterTo="translate-y-0 scale-100 opacity-100"
              leave="transition-[opacity,transform] duration-180 ease-in motion-reduce:transition-none"
              leaveFrom="translate-y-0 scale-100 opacity-100"
              leaveTo="translate-y-2 scale-[0.99] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
            >
              <DialogPanel
                className="relative flex h-[100dvh] w-full max-w-[1000px] flex-col overflow-hidden bg-[var(--tenant-background)] text-[var(--tenant-text)] shadow-[0_32px_100px_rgba(17,17,15,0.24)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px] sm:border sm:border-[color-mix(in_srgb,var(--tenant-text)_14%,transparent)] lg:max-h-[min(820px,calc(100dvh-2.5rem))]"
                data-cart-modal
                data-dialog-layout="modal"
                data-dialog-variant="checkout"
                data-dialog-tone="tenant"
                data-tenant-surface="panel"
              >
                <form
                  className="flex min-h-0 flex-1 flex-col"
                  data-cart-layout
                  onSubmit={handleSubmitCheckout}
                >
                  {isLoading ? (
                    <div
                      className="absolute inset-0 z-50 grid place-items-center bg-[var(--tenant-background)]/72 px-5 backdrop-blur-[5px]"
                      aria-live="assertive"
                      role="status"
                      data-cart-processing
                    >
                      <div
                        className="w-full max-w-sm rounded-[22px] border border-[color-mix(in_srgb,var(--tenant-text)_13%,transparent)] bg-[var(--tenant-surface)] p-5 shadow-[0_22px_65px_rgba(17,17,15,0.16)]"
                        data-tenant-surface="card"
                      >
                        <div className="flex items-start gap-4">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_12%,transparent)] text-[var(--tenant-accent-on-surface)]">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
                          </span>
                          <div>
                            <p className="text-[14px] font-semibold text-[var(--tenant-text-on-surface)]">
                              {copy.processing}
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-[var(--tenant-muted-on-surface)]">
                              {copy.processingDescription}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <header className="relative shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-surface)] px-5 py-4 sm:px-7 sm:py-5 [@media(max-height:740px)]:py-3.5">
                    <div
                      className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-[color-mix(in_srgb,var(--tenant-secondary)_13%,transparent)] blur-3xl"
                      aria-hidden="true"
                    />
                    <div className="relative flex items-start justify-between gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <p
                            className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--tenant-accent-on-surface)] sm:text-[10px]"
                            data-tenant-type="eyebrow"
                          >
                            {copy.eyebrow}
                          </p>
                          {!isCartEmpty ? (
                            <span className="rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_11%,transparent)] bg-[var(--tenant-background)] px-2.5 py-1 text-[9px] font-medium text-[var(--tenant-muted-text)]">
                              {getCartItemCountLabel(cart.length, language)}
                            </span>
                          ) : null}
                        </div>
                        <DialogTitle
                          className="mt-1.5 font-serif text-[27px] leading-[1.05] tracking-[-0.045em] text-[var(--tenant-text-on-surface)] sm:text-[34px] [@media(max-height:740px)]:text-[28px]"
                          data-tenant-type="display"
                        >
                          {copy.title}
                        </DialogTitle>
                        <p className="mt-1.5 max-w-xl text-[10px] leading-5 text-[var(--tenant-muted-on-surface)] sm:text-[11px] [@media(max-height:740px)]:leading-4">
                          {copy.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={close}
                        disabled={isLoading}
                        className="group grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_14%,transparent)] bg-[var(--tenant-background)] text-[var(--tenant-text)] transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--tenant-accent-on-surface)] hover:bg-[var(--tenant-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 disabled:opacity-40 motion-reduce:transform-none motion-reduce:transition-none"
                        aria-label={copy.close}
                        title={copy.close}
                      >
                        <XMarkIcon
                          className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90 motion-reduce:transform-none motion-reduce:transition-none"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </header>

                  <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                    data-cart-scroll-region
                  >
                    {isCartEmpty ? (
                      <div className="grid min-h-[420px] place-items-center px-5 py-12 text-center">
                        <div className="max-w-sm">
                          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)] shadow-[0_14px_40px_rgba(17,17,15,0.06)]">
                            <ShoppingBagIcon
                              className="h-6 w-6"
                              aria-hidden="true"
                            />
                          </span>
                          <h3
                            className="mt-5 font-serif text-[26px] tracking-[-0.035em] text-[var(--tenant-text)]"
                            data-tenant-type="display"
                          >
                            {copy.emptyTitle}
                          </h3>
                          <p className="mx-auto mt-2 max-w-xs text-[12px] leading-6 text-[var(--tenant-muted-text)]">
                            {copy.emptyDescription}
                          </p>
                          <button
                            type="button"
                            onClick={close}
                            data-tenant-button="secondary"
                            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--tenant-text)_15%,transparent)] bg-[var(--tenant-surface)] px-6 text-[11px] font-semibold text-[var(--tenant-text-on-surface)] transition hover:border-[var(--tenant-accent-on-surface)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30"
                          >
                            {copy.returnToStudio}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
                        <section
                          className="space-y-3 px-4 py-4 sm:px-6 sm:py-5 lg:border-r lg:border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)]"
                          aria-label={copy.eyebrow}
                          data-cart-items
                        >
                          {cart.map((cartItem, index) => {
                            const displayPrice =
                              getCartItemTotalMajor(cartItem);
                            const hourlyPrice =
                              getCartItemHourlyPriceMajor(cartItem);
                            const isStandaloneService =
                              isStandaloneServiceCartItem(cartItem);
                            const removeKey =
                              cartItem.id ||
                              `${new Date(cartItem.start).getTime()}_${cartItem?.product?._id || cartItem?.product?.id || ""}`;
                            const bookingType = String(
                              cartItem?.bookingType ||
                                cartItem?.bookingMode ||
                                "",
                            ).toLowerCase();
                            return (
                              <article
                                key={cartItem.id || index}
                                className="group rounded-[20px] border border-[color-mix(in_srgb,var(--tenant-text)_11%,transparent)] bg-[var(--tenant-surface)] p-3.5 shadow-[0_10px_32px_rgba(17,17,15,0.035)] transition-[transform,border-color,box-shadow] duration-250 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_32%,transparent)] hover:shadow-[0_16px_42px_rgba(17,17,15,0.065)] sm:p-4.5 motion-reduce:transform-none motion-reduce:transition-none"
                                data-cart-item
                                data-tenant-surface="card"
                              >
                                <div className="flex gap-3.5 sm:gap-5">
                                  {cartItem?.product?.imageSrc ? (
                                    <Image
                                      src={cartItem.product.imageSrc}
                                      width={112}
                                      height={112}
                                      unoptimized
                                      className="h-[68px] w-[68px] shrink-0 rounded-[15px] border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-background)] object-cover sm:h-[88px] sm:w-[88px]"
                                      data-tenant-surface="media"
                                      data-tenant-image
                                      alt=""
                                    />
                                  ) : (
                                    <span
                                      className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[15px] border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[linear-gradient(145deg,var(--tenant-background),color-mix(in_srgb,var(--tenant-secondary)_10%,var(--tenant-surface)))] text-[var(--tenant-secondary)] sm:h-[88px] sm:w-[88px]"
                                      aria-hidden="true"
                                      data-tenant-surface="media"
                                    >
                                      <ShoppingBagIcon className="h-6 w-6" />
                                    </span>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <h3
                                        className="line-clamp-2 text-[14px] font-semibold leading-5 tracking-[-0.015em] text-[var(--tenant-text-on-surface)] sm:text-[15px]"
                                        title={getCartProductName(
                                          cartItem,
                                          language,
                                        )}
                                      >
                                        {getCartProductName(cartItem, language)}
                                      </h3>
                                      <p className="shrink-0 text-[14px] font-semibold tracking-[-0.02em] text-[var(--tenant-text-on-surface)] sm:text-[15px]">
                                        {formatCartCurrencyAmount(
                                          displayPrice,
                                          cartItem?.product?.currency ||
                                            cartCurrency,
                                          locale,
                                        )}
                                      </p>
                                    </div>

                                    {getCartItemPrivateSurchargeMajor(
                                      cartItem,
                                    ) > 0 && (
                                      <p className="mt-2 text-xs text-[var(--tenant-muted-on-surface)]">
                                        {language === "CZ"
                                          ? "Včetně jednorázového příplatku za soukromou rezervaci"
                                          : "Includes one-time private booking surcharge"}
                                        :{" "}
                                        {formatCartCurrencyAmount(
                                          getCartItemPrivateSurchargeMajor(
                                            cartItem,
                                          ),
                                          cartItem?.product?.currency ||
                                            cartCurrency,
                                          locale,
                                        )}
                                      </p>
                                    )}
                                    <div className="mt-2.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                                      {isStandaloneService ? (
                                        <Detail
                                          icon={ShoppingBagIcon}
                                          label={`${copy.quantity}:`}
                                          value={Math.max(
                                            1,
                                            Number(cartItem?.quantity) || 1,
                                          )}
                                        />
                                      ) : (
                                        <>
                                          <Detail
                                            icon={CalendarDaysIcon}
                                            label={`${copy.date}:`}
                                            value={cartItem?.cartDate || "—"}
                                          />
                                          <Detail
                                            icon={ClockIcon}
                                            label={`${copy.time}:`}
                                            value={cartItem?.cartTime || "—"}
                                          />
                                          <Detail
                                            icon={UserGroupIcon}
                                            label={`${copy.guests}:`}
                                            value={
                                              cartItem?.numberOfGuests ?? 1
                                            }
                                          />
                                        </>
                                      )}
                                      <Detail
                                        icon={MapPinIcon}
                                        label={`${copy.studio}:`}
                                        value={cartItem?.locationName}
                                      />
                                      {isTimedStudioCartItem(cartItem) ? (
                                        <Detail
                                          icon={ClockIcon}
                                          label={`${copy.hourlyRate}:`}
                                          value={formatCartCurrencyAmount(
                                            hourlyPrice,
                                            cartItem?.product?.currency ||
                                              cartCurrency,
                                            locale,
                                          )}
                                        />
                                      ) : null}
                                      {bookingType === "private" ? (
                                        <Detail
                                          icon={LockClosedIcon}
                                          label={`${copy.bookingType}:`}
                                          value={copy.privateBooking}
                                        />
                                      ) : null}
                                    </div>

                                    <button
                                      type="button"
                                      disabled={isLoading}
                                      onClick={() =>
                                        dispatch(removeItem(removeKey))
                                      }
                                      className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[10px] font-semibold text-[var(--tenant-muted-on-surface)] transition-colors hover:bg-[color-mix(in_srgb,var(--tenant-secondary)_10%,transparent)] hover:text-[var(--tenant-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 disabled:opacity-40"
                                      aria-label={`${copy.remove}: ${getCartProductName(cartItem, language)}`}
                                    >
                                      <TrashIcon
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
                                      {copy.remove}
                                    </button>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </section>

                        <aside
                          className="bg-[color-mix(in_srgb,var(--tenant-surface)_62%,var(--tenant-background))] px-4 py-4 sm:px-5 sm:py-5 lg:sticky lg:top-0 lg:self-start"
                          data-cart-summary
                        >
                          <div
                            className="rounded-[20px] border border-[color-mix(in_srgb,var(--tenant-text)_12%,transparent)] bg-[var(--tenant-surface)] p-4 shadow-[0_14px_44px_rgba(17,17,15,0.055)]"
                            data-tenant-surface="card"
                          >
                            <div className="flex items-center justify-between gap-4 border-b border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] pb-3">
                              <p
                                className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--tenant-muted-on-surface)]"
                                data-tenant-type="label"
                              >
                                {copy.orderSummary}
                              </p>
                              <p className="text-[10px] text-[var(--tenant-muted-on-surface)]">
                                {getCartItemCountLabel(cart.length, language)}
                              </p>
                            </div>

                            {hasMixedCurrencies ? (
                              <div
                                className="mt-3 flex gap-2.5 rounded-[14px] border border-[#E8C5BB] bg-[#FFF5F1] px-3.5 py-3 text-[11px] leading-5 text-[#8E3F2E]"
                                role="alert"
                              >
                                <ExclamationTriangleIcon
                                  className="mt-0.5 h-4 w-4 shrink-0"
                                  aria-hidden="true"
                                />
                                {copy.mixedCurrencies}
                              </div>
                            ) : null}

                            <div className="mt-3" data-cart-credit-summary>
                              <CartCreditSummary
                                showPurchaseButton={false}
                                currency={cartCurrency}
                                compact
                              />
                            </div>

                            <div className="mt-4" data-cart-payment-method>
                              {quoteQuery.isFetching ? (
                                <p
                                  role="status"
                                  className="text-xs text-[var(--tenant-muted-on-surface)]"
                                >
                                  {copy.checkingBenefits}
                                </p>
                              ) : !quoteReady && !hasMixedCurrencies ? (
                                <div role="alert" className="space-y-2 text-xs">
                                  <p>{copy.quoteFailed}</p>
                                  <button
                                    type="button"
                                    onClick={() => quoteQuery.refetch()}
                                    className="min-h-10 font-semibold underline"
                                  >
                                    {copy.retryQuote}
                                  </button>
                                </div>
                              ) : (
                                <CartCheckoutPaymentOptions
                                  options={paymentOptions}
                                  selectedOptionId={selectedOption?.optionId}
                                  onChange={setSelectedOptionId}
                                  onPurchaseCredits={() =>
                                    dispatch({
                                      type: "credits/showCreditPurchaseModal",
                                    })
                                  }
                                  language={language}
                                  disabled={isLoading}
                                />
                              )}
                            </div>

                            {quoteReady && quote.discountMinor > 0 ? (
                              <div
                                className="mt-4 space-y-2 border-t border-[var(--tenant-border)] pt-3 text-xs"
                                data-cart-membership-discount
                              >
                                <div className="flex justify-between gap-3">
                                  <span>{copy.subtotal}</span>
                                  <span>
                                    {formatCartCurrencyAmount(
                                      minorUnitsToMajor(
                                        quote.subtotalMinor,
                                        cartCurrency,
                                      ),
                                      cartCurrency,
                                      locale,
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-3 text-[var(--tenant-accent-on-surface)]">
                                  <span>{copy.membershipDiscount}</span>
                                  <span>
                                    −
                                    {formatCartCurrencyAmount(
                                      minorUnitsToMajor(
                                        quote.discountMinor,
                                        cartCurrency,
                                      ),
                                      cartCurrency,
                                      locale,
                                    )}
                                  </span>
                                </div>
                              </div>
                            ) : null}
                            {selectedPaymentMethod === "membership_credits" ? (
                              <p className="mt-3 text-xs text-[var(--tenant-accent-on-surface)]">
                                {copy.membershipCoversOrder}
                              </p>
                            ) : null}

                            <div className="mt-3 flex items-start gap-2.5 rounded-[14px] bg-[color-mix(in_srgb,var(--tenant-accent)_7%,transparent)] px-3.5 py-2.5 text-[var(--tenant-muted-on-surface)] [@media(max-height:740px)]:hidden">
                              <ShieldCheckIcon
                                className="h-4 w-4 shrink-0 text-[var(--tenant-accent-on-surface)]"
                                aria-hidden="true"
                              />
                              <div>
                                <p className="text-[10px] font-semibold text-[var(--tenant-text-on-surface)]">
                                  {copy.secureCheckout}
                                </p>
                                <p className="mt-0.5 text-[9px] leading-4">
                                  {selectedPaymentMethod ===
                                  "membership_credits"
                                    ? copy.membershipSecureDescription
                                    : copy.secureDescription}
                                </p>
                              </div>
                            </div>
                          </div>
                        </aside>
                      </div>
                    )}
                  </div>

                  {!isCartEmpty ? (
                    <footer
                      className="shrink-0 border-t border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-surface)] px-4 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] shadow-[0_-12px_34px_rgba(17,17,15,0.06)] sm:px-6 [@media(max-height:740px)]:py-2"
                      data-cart-checkout-footer
                    >
                      <div className="ml-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 lg:max-w-[330px]">
                        <div className="flex min-w-0 shrink-0 items-baseline justify-between gap-3 sm:block">
                          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-muted-on-surface)]">
                            {copy.total}
                          </p>
                          <p
                            className="mt-0.5 text-[16px] font-semibold tracking-[-0.035em] text-[var(--tenant-text-on-surface)]"
                            data-cart-total
                          >
                            {total === null
                              ? "—"
                              : formatCartCurrencyAmount(
                                  total,
                                  cartCurrency,
                                  locale,
                                )}
                          </p>
                        </div>
                        <button
                          type="submit"
                          disabled={checkoutDisabled}
                          onClick={(event) => {
                            if (
                              event.detail > 0 &&
                              nowMs() - checkoutArmedAtRef.current <
                                CHECKOUT_ARMING_MS
                            ) {
                              event.preventDefault();
                            }
                          }}
                          className={checkoutButtonClass}
                          data-tenant-button="primary"
                          style={{
                            backgroundColor: "var(--tenant-accent)",
                            color: "var(--tenant-accent-foreground)",
                            "--tw-ring-offset-color": "var(--tenant-surface)",
                          }}
                          data-cart-checkout="persistent"
                        >
                          <LockClosedIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 sm:truncate">
                            {checkoutButtonLabel}
                          </span>
                          <ArrowRightIcon
                            className="hidden h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 min-[360px]:block motion-reduce:transform-none motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </footer>
                  ) : null}
                </form>

                <CreditPurchaseModal />
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
