"use client";

import { useLegacyText } from "@/i18n/useLegacyCopy";
import {
  Transition,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { useSelector } from "react-redux";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { useCreateCouponOrderMutation } from "@/lib/features/coupons/couponsApiSlice";
import { EMAIL_REGEX } from "@/config/constants";
import {
  DEFAULT_STUDIO_COMMERCE_CURRENCY,
  resolveStudioCommerceCurrency,
} from "@/config/currencies";
import { resolveIntlLocale } from "@/i18n/formatting";
import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import { formatMajorCurrencyAmount } from "@/utils/money";
import MenuBox from "../listboxes/MenuBox";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { getCheckoutErrorMessage } from "@/lib/features/checkout/checkout.errors";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";

const quantityOptions = [
  { id: 0, name: 1 },
  { id: 1, name: 2 },
  { id: 2, name: 3 },
  { id: 3, name: 4 },
  { id: 4, name: 5 },
];

const VOUCHER_FIELD_LIMITS = Object.freeze({
  name: 80,
  email: 254,
  street: 200,
  city: 120,
  postalCode: 40,
  note: 2000,
});

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getAvailableCoupons = (products) => {
  if (!Array.isArray(products) || products.length === 0) return [];
  return products
    .filter((p) => p.type === "coupon")
    .map((p) => ({ ...p, productId: p._id }));
};

// Postage is a real tenant price, not an exchange-rate conversion. Keep this
// aligned with the backend until postage can be configured per tenant/currency.
const POST_FEE_BY_CURRENCY = Object.freeze({
  [DEFAULT_STUDIO_COMMERCE_CURRENCY]: 90,
});

// ✅ Home-page style tokens
const PAGE_BG = "bg-[#F7F5F2]";
const TEXT_DARK = "text-[var(--unnamed-color-0f1113)]";
const TEXT_MUTED = "text-[#59524B]";
const ACCENT = "text-[var(--unnamed-color-b3a292)]";
const ACCENT_BG = "bg-[var(--unnamed-color-b3a292)]";
const ACCENT_BORDER = "border-[var(--unnamed-color-b3a292)]";

const pillBtnBase =
  "inline-flex items-center justify-center rounded-full px-6 py-3 border text-sm uppercase tracking-[0.18em]  transition-colors active:scale-95 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed";
const pillBtnPrimary = `${pillBtnBase} ${ACCENT_BORDER} ${ACCENT_BG} text-white hover:opacity-90`;
const pillBtnOutline = `${pillBtnBase} ${ACCENT_BORDER} bg-transparent ${ACCENT} hover:${ACCENT_BG} hover:text-white`;

const inputBase =
  "block w-full rounded-full border px-4 py-3  text-[var(--unnamed-color-0f1113)] placeholder:text-gray-400 " +
  "focus:outline-none focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)] focus:ring-offset-2 transition-all";
const inputValid = "border-black/15 bg-white/70";
const inputInvalid = "border-red-500 bg-white text-red-700 focus:ring-red-500";

export default function SidebarForm({
  open,
  setOpen,
  callback,
  products = [],
}) {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const publicTenant = usePublicTenant();
  const tenantTheme = useMemo(
    () =>
      getPublicTenantPortalTheme(
        publicTenant.tenant,
        "soft-light",
        publicTenant.surface,
      ),
    [publicTenant.tenant, publicTenant.surface],
  );
  const params = useParams();
  const routeLocale = useLocale();
  const [createCouponOrder, { isLoading }] = useCreateCouponOrderMutation();

  const language = useSelector(selectCurrentLanguage) || "CZ";
  const tenantSlug = getValidatedTenantSlugParam(params);
  const checkoutLocale = resolveRolloutEligibleLocaleCode(routeLocale);
  const currentUser = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const coupons = useMemo(() => getAvailableCoupons(products), [products]);

  const errRef = useRef();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [firstName, setFirstName] = useState(null);
  const [lastName, setLastName] = useState(null);
  const [email, setEmail] = useState(null);

  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [postChecked, setPostChecked] = useState(false);
  const [note, setNote] = useState("");

  const [errMsg, setErrMsg] = useState("");
  // ✅ track submit attempt
  const [submitted, setSubmitted] = useState(false);

  const firstNameValue =
    firstName ?? (isAuthenticated ? currentUser?.firstname || "" : "");
  const lastNameValue =
    lastName ?? (isAuthenticated ? currentUser?.lastname || "" : "");
  const emailValue = email ?? (isAuthenticated ? currentUser?.email || "" : "");
  const validEmail = EMAIL_REGEX.test(emailValue);

  const sendPost = Boolean(postChecked);

  // ✅ which fields are mandatory right now
  const mandatory = useMemo(
    () => ({
      product: true,
      quantity: true,
      firstName: sendPost,
      lastName: sendPost,
      email: true,
      streetAddress: sendPost,
      city: sendPost,
      postalCode: sendPost,
    }),
    [sendPost],
  );

  const isEmpty = (v) => !String(v || "").trim();

  const markInvalid = (isRequired, value) =>
    submitted && isRequired && isEmpty(value);

  const inputClass = (isRequired, value, extra = "") =>
    classNames(
      inputBase,
      markInvalid(isRequired, value) ? inputInvalid : inputValid,
      extra,
    );

  // ✅ derived pricing (no state = no desync)
  const unitPrice = Number(selectedProduct?.price || 0);
  const currency = resolveStudioCommerceCurrency(selectedProduct?.currency);
  const locale = resolveIntlLocale(routeLocale);
  const configuredPostageFee = POST_FEE_BY_CURRENCY[currency];
  const isPostageAvailable =
    Boolean(selectedProduct?.productId) &&
    Number.isFinite(configuredPostageFee);
  const q = Math.max(1, Number(quantity) || 1);
  const subtotal = unitPrice * q;
  const shippingFee = sendPost && isPostageAvailable ? configuredPostageFee : 0;
  const totalPrice = subtotal + shippingFee;

  const formatMoney = (value) =>
    formatMajorCurrencyAmount(value, currency, locale);

  const resetForm = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setFirstName(null);
    setLastName(null);
    setEmail(null);
    setStreetAddress("");
    setCity("");
    setPostalCode("");
    setPostChecked(false);
    setNote("");
    setErrMsg("");
    setSubmitted(false);
  };

  const onClose = () => {
    resetForm();
    setOpen(false);
    callback?.(true);
  };

  const onPostClicked = () => {
    if (!isPostageAvailable) return;
    setPostChecked((value) => !value);
  };

  const onProductChange = (product) => {
    setSelectedProduct(product);

    const nextCurrency = resolveStudioCommerceCurrency(product?.currency);
    if (!Number.isFinite(POST_FEE_BY_CURRENCY[nextCurrency])) {
      setPostChecked(false);
    }
  };

  const onSubmitClicked = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    try {
      if (!validEmail) {
        setErrMsg(translation["ERROR_EMAIL_FORMAT"][language]);
        return;
      }

      if (!tenantSlug) {
        setErrMsg(translation["INVALID_TENANT_CHECKOUT"]?.[language]);
        return;
      }

      if (!selectedProduct?.productId) {
        setErrMsg(translation["ERROR_MISSING_FIELDS"][language]);
        return;
      }

      if (
        sendPost &&
        (isEmpty(firstNameValue) ||
          isEmpty(lastNameValue) ||
          isEmpty(streetAddress) ||
          isEmpty(city) ||
          isEmpty(postalCode))
      ) {
        setErrMsg(translation["ERROR_MISSING_FIELDS"][language]);
        return;
      }

      const order = {
        tenantSlug,
        productId: selectedProduct.productId,
        quantity: q,

        firstname: firstNameValue,
        lastname: lastNameValue,
        email: emailValue,

        street: streetAddress,
        city,
        postalCode,

        sendPost,

        note,
        locale: checkoutLocale,
      };

      const result = await createCouponOrder(order).unwrap();

      const checkoutUrl = getSafeCheckoutUrl(result?.url);
      if (!checkoutUrl) {
        setErrMsg(translation["CHECKOUT_REDIRECT_MISSING"]?.[language]);
        return;
      }

      window.location.assign(checkoutUrl);
    } catch (err) {
      setErrMsg(
        getCheckoutErrorMessage({
          error: err,
          language,
          translations: translation,
          fallback: translation["ERROR_GENERIC"]?.[language],
        }),
      );
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
        data-tenant-style={tenantTheme?.stylePresetId}
        style={tenantTheme?.style}
      >
        {/* Backdrop – home-like */}
        <div className="fixed inset-0 bg-black/20" />
        <div className={classNames("fixed inset-0", PAGE_BG, "opacity-80")} />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-16">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel
                  data-dialog-layout="drawer"
                  className="pointer-events-auto h-dvh w-screen max-w-none sm:max-w-lg"
                >
                  <form
                    className={classNames(
                      "flex h-full flex-col",
                      PAGE_BG,
                      "shadow-xl sm:border-l border-gray-300",
                    )}
                  >
                    {/* Header */}
                    <div className="px-4 sm:px-6 py-6 border-b border-gray-300">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <DialogTitle
                            className={classNames(
                              " text-[28px] sm:text-[32px] leading-tight uppercase tracking-tight",
                              TEXT_DARK,
                            )}
                          >
                            {translation["GIFT_VOUCHER"][language]}
                          </DialogTitle>

                          <div className="mt-2 space-y-1">
                            <p
                              className={classNames(
                                "text-[15px] leading-[1.7] ",
                                TEXT_MUTED,
                              )}
                            >
                              {translation["GIFT_VOUCHER_INFO_1"][language]}
                            </p>
                            <p
                              className={classNames(
                                "text-[15px] leading-[1.7] ",
                                TEXT_MUTED,
                              )}
                            >
                              {translation["GIFT_VOUCHER_INFO_2"][language]}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={classNames(
                            "inline-flex items-center justify-center rounded-full p-2",
                            TEXT_MUTED,
                            "hover:opacity-70 transition-opacity",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]",
                          )}
                          onClick={onClose}
                        >
                          <span className="sr-only">
                            {legacyText("SidebarForm_Close_panel_fa0b7")}{" "}
                          </span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="px-4 sm:px-6 py-6">
                        {/* Product */}
                        <div>
                          <MenuBox
                            title={translation["GIFT_VOUCHER_TITLE"][language]}
                            isMandatory={mandatory.product}
                            highlightFocus={
                              submitted &&
                              mandatory.product &&
                              !selectedProduct?.productId
                            }
                            options={coupons}
                            placeholder={
                              translation["SELECT_VOUCHER"][language]
                            }
                            value={selectedProduct}
                            onChange={onProductChange}
                            tenantStylePresetId={tenantTheme?.stylePresetId}
                            tenantThemeStyle={tenantTheme?.style}
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:max-w-44 mt-6">
                          <MenuBox
                            title={translation["GIFT_VOUCHER_AMOUNT"][language]}
                            isMandatory={mandatory.quantity}
                            options={quantityOptions}
                            placeholder="1"
                            value={quantity}
                            onChange={(opt) => setQuantity(opt?.name)}
                            tenantStylePresetId={tenantTheme?.stylePresetId}
                            tenantThemeStyle={tenantTheme?.style}
                          />
                        </div>

                        {/* Email */}
                        <div className="mt-6">
                          <label
                            htmlFor="email"
                            className={classNames(
                              "block text-sm uppercase tracking-wide font-medium",
                              ACCENT,
                            )}
                          >
                            {translation["EMAIL"][language]}{" "}
                            <span className="text-red-600">*</span>
                          </label>
                          <div className="mt-2">
                            <input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              value={emailValue}
                              maxLength={VOUCHER_FIELD_LIMITS.email}
                              onChange={(e) => {
                                setEmail(e.target.value);
                                setErrMsg("");
                              }}
                              className={classNames(
                                inputBase,
                                submitted &&
                                  (!validEmail || isEmpty(emailValue))
                                  ? inputInvalid
                                  : inputValid,
                              )}
                            />
                          </div>
                        </div>

                        {/* Post checkbox */}
                        <div className="mt-6 flex gap-x-3">
                          <div className="flex h-6 items-center">
                            <input
                              id="post-checkbox"
                              name="post-checkbox"
                              type="checkbox"
                              checked={postChecked}
                              onChange={onPostClicked}
                              disabled={!isPostageAvailable}
                              className={classNames(
                                "h-4 w-4 border-black/20",
                                "text-[var(--unnamed-color-b3a292)] focus:ring-[var(--unnamed-color-b3a292)]",
                              )}
                            />
                          </div>
                          <div className="text-[15px] leading-[1.7]">
                            <label
                              htmlFor="post-checkbox"
                              className={classNames("", TEXT_DARK)}
                            >
                              {translation["EMAIL_BY_POST"][language]}
                            </label>
                            <p className={classNames("", TEXT_MUTED)}>
                              {translation["EMAIL_BY_POST_INFO"][language]}{" "}
                              <span className="text-black/60">
                                {isPostageAvailable
                                  ? `(+${formatMoney(configuredPostageFee)})`
                                  : legacyText(
                                      "SidebarForm__not_available_for_this_currency_yet_8de74",
                                    )}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Delivery fields */}
                        {sendPost && (
                          <>
                            <div className="mt-8 border-t border-gray-300" />

                            <div className="flex items-center justify-between pt-8 pb-4">
                              <p
                                className={classNames(
                                  " text-[20px] sm:text-[22px] uppercase tracking-tight",
                                  TEXT_DARK,
                                )}
                              >
                                {translation["DELIVERY_DETAILS"][language]}
                              </p>
                              {isAuthenticated && (
                                <span className="text-xs text-black/60 border border-gray-300 bg-white/60 px-3 py-1 rounded-full ">
                                  {translation["PRE_FILLED"]?.[language]}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-7">
                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="first-name"
                                  className={classNames(
                                    "block text-sm uppercase tracking-wide font-medium",
                                    ACCENT,
                                  )}
                                >
                                  {translation["FIRST_NAME"][language]}
                                  {mandatory.firstName && (
                                    <span className="text-red-600"> *</span>
                                  )}
                                </label>
                                <div className="mt-2">
                                  <input
                                    id="first-name"
                                    name="first-name"
                                    type="text"
                                    autoComplete="given-name"
                                    value={firstNameValue}
                                    maxLength={VOUCHER_FIELD_LIMITS.name}
                                    onChange={(e) =>
                                      setFirstName(e.target.value)
                                    }
                                    className={inputClass(
                                      mandatory.firstName,
                                      firstNameValue,
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="last-name"
                                  className={classNames(
                                    "block text-sm uppercase tracking-wide font-medium",
                                    ACCENT,
                                  )}
                                >
                                  {translation["LAST_NAME"][language]}
                                  {mandatory.lastName && (
                                    <span className="text-red-600"> *</span>
                                  )}
                                </label>
                                <div className="mt-2">
                                  <input
                                    id="last-name"
                                    name="last-name"
                                    type="text"
                                    autoComplete="family-name"
                                    value={lastNameValue}
                                    maxLength={VOUCHER_FIELD_LIMITS.name}
                                    onChange={(e) =>
                                      setLastName(e.target.value)
                                    }
                                    className={inputClass(
                                      mandatory.lastName,
                                      lastNameValue,
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="col-span-full">
                                <label
                                  htmlFor="street-address"
                                  className={classNames(
                                    "block text-sm uppercase tracking-wide font-medium",
                                    ACCENT,
                                  )}
                                >
                                  {translation["STREET"][language]}
                                  {mandatory.streetAddress && (
                                    <span className="text-red-600"> *</span>
                                  )}
                                </label>
                                <div className="mt-2">
                                  <input
                                    id="street-address"
                                    name="street-address"
                                    type="text"
                                    autoComplete="street-address"
                                    value={streetAddress}
                                    maxLength={VOUCHER_FIELD_LIMITS.street}
                                    onChange={(e) =>
                                      setStreetAddress(e.target.value)
                                    }
                                    className={inputClass(
                                      mandatory.streetAddress,
                                      streetAddress,
                                    )}
                                  />
                                </div>
                              </div>

                              <div className="sm:col-span-3 sm:col-start-1">
                                <label
                                  htmlFor="city"
                                  className={classNames(
                                    "block text-sm uppercase tracking-wide font-medium",
                                    ACCENT,
                                  )}
                                >
                                  {translation["CITY"][language]}
                                  {mandatory.city && (
                                    <span className="text-red-600"> *</span>
                                  )}
                                </label>
                                <div className="mt-2">
                                  <input
                                    id="city"
                                    name="city"
                                    type="text"
                                    autoComplete="address-level2"
                                    value={city}
                                    maxLength={VOUCHER_FIELD_LIMITS.city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className={inputClass(mandatory.city, city)}
                                  />
                                </div>
                              </div>

                              <div className="sm:col-span-3">
                                <label
                                  htmlFor="postal-code"
                                  className={classNames(
                                    "block text-sm uppercase tracking-wide font-medium",
                                    ACCENT,
                                  )}
                                >
                                  {translation["POSTAL_CODE"][language]}
                                  {mandatory.postalCode && (
                                    <span className="text-red-600"> *</span>
                                  )}
                                </label>
                                <div className="mt-2">
                                  <input
                                    id="postal-code"
                                    name="postal-code"
                                    type="text"
                                    autoComplete="postal-code"
                                    value={postalCode}
                                    maxLength={VOUCHER_FIELD_LIMITS.postalCode}
                                    onChange={(e) =>
                                      setPostalCode(e.target.value)
                                    }
                                    className={inputClass(
                                      mandatory.postalCode,
                                      postalCode,
                                    )}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Note */}
                            <div className="pt-6">
                              <label
                                htmlFor="note"
                                className={classNames(
                                  "block text-sm uppercase tracking-wide font-medium",
                                  ACCENT,
                                )}
                              >
                                {translation["NOTE"][language]}{" "}
                                <span className="text-black/50 normal-case tracking-normal ">
                                  ({translation["OPTIONAL"][language]})
                                </span>
                              </label>
                              <div className="mt-2">
                                <textarea
                                  id="note"
                                  name="note"
                                  rows={4}
                                  value={note}
                                  maxLength={VOUCHER_FIELD_LIMITS.note}
                                  onChange={(e) => setNote(e.target.value)}
                                  className={classNames(
                                    "block w-full rounded-2xl border px-4 py-3 ",
                                    "border-black/15 bg-white/70 text-[var(--unnamed-color-0f1113)]",
                                    "focus:outline-none focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)] focus:ring-offset-2",
                                  )}
                                />
                              </div>

                              {/* Price breakdown */}
                              <div className="mt-5 border border-gray-300 bg-white/60 p-4">
                                <div
                                  className={classNames(
                                    "text-[15px] leading-[1.7] ",
                                    TEXT_MUTED,
                                  )}
                                >
                                  {translation["PRICE"][language]}:{" "}
                                  {formatMoney(subtotal)}
                                </div>
                                <div
                                  className={classNames(
                                    "text-[15px] leading-[1.7] ",
                                    TEXT_MUTED,
                                  )}
                                >
                                  {legacyText("SidebarForm_Postage_31c92")}{" "}
                                  {formatMoney(shippingFee)}
                                </div>
                                <div
                                  className={classNames(
                                    "mt-2 font-medium text-[18px] uppercase tracking-wide",
                                    ACCENT,
                                  )}
                                >
                                  {legacyText("SidebarForm_Total_d8e71")}{" "}
                                  {formatMoney(totalPrice)}
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Price (no post) */}
                        {!sendPost && subtotal > 0 && (
                          <div className="mt-6 border border-gray-300 bg-white/60 p-4">
                            <div
                              className={classNames(
                                "font-medium text-[18px] uppercase tracking-wide",
                                ACCENT,
                              )}
                            >
                              {translation["PRICE"][language]}:{" "}
                              {formatMoney(subtotal)}
                            </div>
                          </div>
                        )}

                        <div className="mt-8 border-t border-gray-300" />

                        {errMsg && (
                          <p
                            ref={errRef}
                            className="mt-4 text-red-700 "
                            aria-live="assertive"
                          >
                            {errMsg}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-4 px-4 sm:px-6 py-5 border-t border-gray-300">
                      <button
                        type="button"
                        onClick={onClose}
                        className={pillBtnOutline}
                      >
                        {translation["CANCEL"][language]}
                      </button>
                      <button
                        type="submit"
                        onClick={onSubmitClicked}
                        disabled={isLoading}
                        className={pillBtnPrimary}
                      >
                        {translation["ORDER_VOUCHER"][language]}
                      </button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
