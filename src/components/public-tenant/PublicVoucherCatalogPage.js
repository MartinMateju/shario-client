"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import {
  selectCurrentCatalog,
  usePublicCatalogSnapshot,
} from "@/components/public-tenant/PublicQueryHydration";
import { PUBLIC_COURSE_FRESHNESS_SECONDS } from "@/lib/publicTenant/courseHydration";

import {
  ArrowLongRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { resolveRolloutEligibleLocaleCode } from "@/i18n/locales";
import {
  formatProductPrice,
  getProductDescription,
  getProductId,
  getProductName,
} from "@/components/products/products.utils";
import { getPublicWebsitePageCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import CustomerPortalHero from "@/components/customer-shell/CustomerPortalHero";
import { CustomerPortalPage } from "@/components/customer-shell/CustomerPortalPrimitives";
import {
  useCreateCouponOrderMutation,
  useGetCouponsQuery,
} from "@/lib/features/coupons/couponsApiSlice";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";
import {
  getStripeMinorUnitDigits,
  minorUnitsToMajor,
  formatMinorCurrencyAmount,
} from "@/utils/money";
import VoucherDeliveryChoice, {
  EMPTY_VOUCHER_ADDRESS,
  isVoucherAddressValid,
} from "@/components/vouchers/VoucherDeliveryChoice";

import CatalogRefreshNotice from "./CatalogRefreshNotice";
import PublicCapabilityGate from "./PublicCapabilityGate";
import design from "./portalCatalog.module.css";
import { usePublicTenant } from "./PublicTenantProvider";
import { getLocalizedPublicTenantText } from "./publicTenant.config";

const unwrapProducts = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.data?.products)) return value.data.products;
  return [];
};

const isVoucher = (product) =>
  product?.isActive !== false &&
  String(product?.type || "")
    .trim()
    .toLowerCase() === "coupon" &&
  (product?.hasVoucherDesign === true ||
    Boolean(String(product?.voucherTemplate || "").trim())) &&
  Number(product?.price) > 0 &&
  Boolean(getProductId(product));

const redirectToCheckout = (url) => window.location.assign(url);

function VoucherCatalogImage({ product }) {
  const imageSrc =
    String(product?.imageSrc || "").trim() ||
    String(product?.imageUrl || "").trim();
  const [failedSource, setFailedSource] = useState("");

  if (!imageSrc || imageSrc === failedSource) return null;

  return (
    // Voucher photos can be hosted on tenant-managed image hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageSrc}
      alt=""
      className={design.voucherImage}
      data-tenant-surface="media"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(imageSrc)}
    />
  );
}

function VoucherCatalogGate({ portal, children }) {
  // Portal visibility is enforced by CustomerPortalPageGate. Studios can keep
  // their public website hidden while still selling to signed-in customers.
  return portal ? (
    children
  ) : (
    <PublicCapabilityGate capability="vouchers">
      {children}
    </PublicCapabilityGate>
  );
}

export default function PublicVoucherCatalogPage(props) {
  const tenantSlug = getValidatedTenantSlugParam(useParams());
  return <VoucherShop key={tenantSlug} {...props} tenantSlug={tenantSlug} />;
}

function VoucherShop({
  tenantSlug,
  onCheckoutRedirect = redirectToCheckout,
  previewData,
  portal = false,
  initialEmail = "",
  children,
}) {
  const customerDefaults = useLegacyCopy("customerDefaults");
  const locale = useLocale();
  const t = useTranslations("PublicTenant");
  const shopping = useTranslations("VoucherShopping");
  const { tenant } = usePublicTenant();
  const vouchersEnabled = portal
    ? tenant.modules?.vouchers !== false
    : tenant.publicCapabilities.vouchers === true;
  const previewMode = Array.isArray(previewData);
  const primaryButtonStyle = {
    backgroundColor: portal
      ? "var(--tenant-portal-button)"
      : "var(--tenant-accent)",
    color: portal
      ? "var(--tenant-portal-button-foreground)"
      : "var(--tenant-accent-foreground)",
  };
  const page = tenant.publicSite.pages.vouchers;
  const initial = usePublicCatalogSnapshot(tenantSlug, "vouchers");
  const fetchedQuery = useGetCouponsQuery(
    { tenantSlug },
    {
      skip: Boolean(initial) || previewMode || !tenantSlug || !vouchersEnabled,
      refetchOnMountOrArgChange: PUBLIC_COURSE_FRESHNESS_SECONDS,
      refetchOnFocus: true,
      selectFromResult: selectCurrentCatalog,
    },
  );
  const query = previewMode
    ? {
        data: previewData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: () => undefined,
      }
    : initial
      ? { data: initial.data }
      : fetchedQuery;
  const [createOrder, orderState] = useCreateCouponOrderMutation();
  const checkoutInFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const checkoutBusy = submitting || orderState.isLoading;
  const products = useMemo(
    () => unwrapProducts(query.data).filter(isVoucher),
    [query.data],
  );
  const firstProductId = products.length ? getProductId(products[0]) : "";
  const [selectedProductId, setSelectedProductId] = useState(firstProductId);
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState(initialEmail);
  const [giftMessage, setGiftMessage] = useState("");
  const [error, setError] = useState("");
  const [deliveryChoice, setDeliveryChoice] = useState(null);
  const [postalAddress, setPostalAddress] = useState(EMPTY_VOUCHER_ADDRESS);
  const selectedProduct = products.find(
    (product) => getProductId(product) === selectedProductId,
  );
  const catalogueUnavailable = query.isError && !query.isRefreshError;
  // An empty string is waiting for the first offer. After a withdrawal, only
  // the buyer can choose another voucher, even if the original one returns.
  if (selectedProductId === "" && firstProductId && !catalogueUnavailable) {
    setSelectedProductId(firstProductId);
  } else if (
    selectedProductId &&
    (catalogueUnavailable || (query.data != null && !selectedProduct))
  ) {
    setSelectedProductId(null);
  }
  const selectedId = selectedProduct ? getProductId(selectedProduct) : "";
  const physicalSettings = selectedProduct?.voucherSettings?.physicalDelivery;
  const physicalAvailable =
    physicalSettings?.enabled === true &&
    Number.isSafeInteger(physicalSettings.postageFeeMinor) &&
    physicalSettings.postageFeeMinor >= 0 &&
    physicalSettings.postageFeeMinor <= 100_000_000;
  const sendPost =
    physicalAvailable &&
    deliveryChoice?.productId === selectedId &&
    deliveryChoice.physical === true;
  const postageFeeMinor = sendPost ? physicalSettings.postageFeeMinor : 0;
  const subtotalMinor = selectedProduct
    ? Math.round(
        Number(selectedProduct.price) *
          10 ** getStripeMinorUnitDigits(selectedProduct.currency),
      ) * Number(quantity)
    : 0;
  const customizationDefaults = getPublicWebsitePageCustomizationDefaults({
    localizedDefaults: customerDefaults,
    page: "vouchers",
    locale,
    studio: tenant.publicSite.branding.displayName,
  });
  const title = getLocalizedPublicTenantText(
    page.title,
    locale,
    customizationDefaults.title,
  );
  const description = getLocalizedPublicTenantText(
    page.description,
    locale,
    customizationDefaults.description,
  );

  const submitOrder = async (event) => {
    event.preventDefault();
    if (previewMode || checkoutInFlight.current || !selectedId) return;
    setError("");

    if (!email.trim()) {
      setError(t("vouchers.checkout.missing"));
      return;
    }
    if (sendPost && !isVoucherAddressValid(postalAddress)) {
      setError(t("vouchers.postal.addressError"));
      return;
    }

    checkoutInFlight.current = true;
    setSubmitting(true);
    try {
      const result = await createOrder({
        tenantSlug,
        productId: selectedId,
        quantity: Math.max(1, Number(quantity) || 1),
        firstname: sendPost ? postalAddress.firstname.trim() : "",
        lastname: sendPost ? postalAddress.lastname.trim() : "",
        email: email.trim(),
        street: sendPost ? postalAddress.street.trim() : "",
        city: sendPost ? postalAddress.city.trim() : "",
        postalCode: sendPost ? postalAddress.postalCode.trim() : "",
        ...(sendPost ? { countryCode: postalAddress.countryCode } : {}),
        sendPost,
        note: "",
        ...(giftMessage.trim() ? { giftMessage: giftMessage.trim() } : {}),
        locale: resolveRolloutEligibleLocaleCode(locale),
      }).unwrap();
      const checkoutUrl = getSafeCheckoutUrl(result?.url);

      if (!checkoutUrl) {
        setError(t("vouchers.checkout.error"));
        return;
      }

      onCheckoutRedirect(checkoutUrl);
    } catch (caught) {
      const giftError = [
        "VOUCHER_DESIGN_UNSUPPORTED_CHARACTER",
        "VOUCHER_DESIGN_TEXT_OVERFLOW",
        "VOUCHER_GIFT_MESSAGE_INVALID",
      ].includes(caught?.data?.code);
      setError(
        t(
          giftError
            ? "vouchers.checkout.giftMessageError"
            : caught?.data?.code === "VOUCHER_PHYSICAL_DELIVERY_UNAVAILABLE"
              ? "vouchers.postal.unavailable"
              : "vouchers.checkout.error",
        ),
      );
    } finally {
      checkoutInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <VoucherCatalogGate portal={portal}>
      <CustomerPortalPage
        data-public-voucher-catalog
        style={{
          backgroundColor: "var(--tenant-background)",
          color: "var(--tenant-text)",
        }}
      >
          <CustomerPortalHero
            pageKey="vouchers"
            className={design.catalogHeader}
          >
            <p
              className="text-sm font-semibold uppercase tracking-[0.17em] text-[var(--tenant-label-color)]"
              data-tenant-type="eyebrow"
            >
              {t("nav.vouchers")}
            </p>
            <h1
              className="mt-3 text-4xl font-semibold tracking-[-0.055em] text-[var(--tenant-text)] sm:text-6xl"
              data-tenant-type="display"
              data-public-site-edit-path={`pages.vouchers.title.${locale}`}
            >
              {title}
            </h1>
            <p
              className="mt-4 max-w-2xl text-[12px] leading-6 text-[var(--tenant-muted-text)] sm:text-sm"
              data-public-site-edit-path={`pages.vouchers.description.${locale}`}
            >
              {description}
            </p>
          </CustomerPortalHero>

          <nav
            aria-label={shopping("buy")}
            className="mt-6 flex flex-wrap gap-3"
          >
            <a
              href="#voucher-shop"
              data-tenant-button="primary"
              style={primaryButtonStyle}
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[var(--tenant-accent)] px-6 text-sm font-semibold text-[var(--tenant-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2"
            >
              {shopping("buy")}
              <ArrowLongRightIcon className="h-4 w-4" aria-hidden="true" />
            </a>
            {children ? (
              <a
                href="#my-vouchers"
                data-tenant-button="secondary"
                className="inline-flex min-h-12 items-center rounded-full border border-[var(--tenant-border)] px-6 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2"
              >
                {shopping("manage")}
              </a>
            ) : null}
          </nav>

          <ol
            className={`${design.voucherSteps} mt-9 grid gap-5 border-y border-[var(--tenant-border)] py-6 sm:grid-cols-3`}
          >
            {["choose", "delivery", "redeem"].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`${design.stepNumber} flex shrink-0 items-center justify-center font-semibold`}
                >
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-sm font-semibold">
                    {shopping(`${step}Title`)}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--tenant-muted-text)]">
                    {shopping(`${step}Description`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <section
            id="voucher-shop"
            aria-label={shopping("buy")}
            className="scroll-mt-28"
          >
            {query.isRefreshError && (
              <CatalogRefreshNotice onRetry={query.refetch} />
            )}
            {query.isLoading ? (
              <div
                className="mt-10 flex min-h-72 items-center justify-center rounded-[26px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] text-sm text-[color:var(--tenant-muted-on-surface)]"
                data-tenant-surface="card"
                role="status"
              >
                <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" />
                {t("catalog.loading")}
              </div>
            ) : catalogueUnavailable ? (
              <div
                className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-[26px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-6 text-center text-[color:var(--tenant-text-on-surface)]"
                data-tenant-surface="card"
              >
                <p className="text-sm text-[color:var(--tenant-muted-on-surface)]">
                  {t("catalog.error")}
                </p>
                <button
                  type="button"
                  onClick={query.refetch}
                  data-tenant-button="secondary"
                  className="mt-5 min-h-11 rounded-full border border-[color:var(--tenant-border)] px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2"
                >
                  {t("catalog.retry")}
                </button>
              </div>
            ) : products.length ? (
              <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
                <div className="grid gap-4 sm:grid-cols-2" data-tenant-content>
                  {products.map((product) => {
                    const productId = getProductId(product);
                    const selected = productId === selectedId;
                    const productDescription = getProductDescription(
                      product,
                      locale,
                    );

                    return (
                      <button
                        key={productId}
                        type="button"
                        disabled={checkoutBusy}
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedProductId(productId);
                          setDeliveryChoice(null);
                          setError("");
                        }}
                        data-tenant-layout="card"
                        data-tenant-surface="card"
                        className={`${design.voucherCard} group min-h-56 rounded-[24px] border bg-[color:var(--tenant-surface)] text-left text-[color:var(--tenant-text-on-surface)] shadow-[0_14px_40px_rgba(17,17,15,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(17,17,15,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none`}
                        style={{
                          borderColor: selected
                            ? "var(--tenant-accent-on-surface)"
                            : "var(--tenant-border)",
                        }}
                      >
                        <VoucherCatalogImage product={product} />
                        <span className={design.voucherFace}>
                          <span className="flex items-start justify-between gap-4">
                            <span
                              className={`${design.voucherName} block font-semibold`}
                            >
                              {getProductName(product, locale)}
                            </span>
                            {selected ? (
                              <CheckCircleIcon
                                className="h-6 w-6 shrink-0"
                                aria-hidden="true"
                              />
                            ) : null}
                          </span>
                          <span className={design.voucherPrice}>
                            {formatProductPrice(product, locale)}
                          </span>
                        </span>
                        <span className={design.voucherBody}>
                          {productDescription ? (
                            <span className="line-clamp-3 block text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                              {productDescription}
                            </span>
                          ) : null}
                          <span
                            className={`${design.voucherAction} inline-flex items-center justify-between gap-2 text-sm font-semibold text-[var(--tenant-accent-on-surface)]`}
                          >
                            {shopping(selected ? "selected" : "selection")}
                            <ArrowLongRightIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <form
                  onSubmit={submitOrder}
                  className={`${design.checkoutPanel} rounded-[26px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] p-6 text-[color:var(--tenant-text-on-surface)] shadow-[0_18px_55px_rgba(17,17,15,0.055)] lg:sticky lg:top-[calc(var(--header-height,78px)+1.5rem)]`}
                  data-tenant-layout="card"
                  data-tenant-surface="panel"
                >
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--tenant-accent-on-surface)]"
                    data-tenant-type="eyebrow"
                  >
                    {t("vouchers.checkout.eyebrow")}
                  </p>
                  <h2
                    className="mt-3 font-serif text-3xl font-normal tracking-[-0.04em]"
                    data-tenant-type="display"
                  >
                    {t("vouchers.checkout.title")}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--tenant-muted-on-surface)]">
                    {t("vouchers.checkout.description")}
                  </p>
                  {selectedProductId === null && (
                    <p className="mt-4 font-semibold" role="status">
                      {t("vouchers.checkout.reselect")}
                    </p>
                  )}

                  <label className="mt-6 block text-sm font-semibold">
                    {t("vouchers.checkout.email")}
                    <input
                      type="email"
                      disabled={checkoutBusy}
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      data-tenant-surface="field"
                      className="mt-2 min-h-12 w-full rounded-[14px] border border-[color:var(--tenant-border)] bg-transparent px-4 font-normal outline-none transition focus:border-[color:var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/15"
                    />
                  </label>
                  <label className="mt-4 block text-sm font-semibold">
                    {t("vouchers.checkout.quantity")}
                    <select
                      disabled={checkoutBusy}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      data-tenant-surface="field"
                      className="mt-2 min-h-12 w-full rounded-[14px] border border-[color:var(--tenant-border)] bg-transparent px-4 font-normal outline-none transition focus:border-[color:var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/15"
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <VoucherDeliveryChoice
                    enabled={physicalAvailable}
                    postageFeeMinor={physicalSettings?.postageFeeMinor || 0}
                    currency={selectedProduct?.currency}
                    physical={sendPost}
                    address={postalAddress}
                    onPhysicalChange={(physical) =>
                      setDeliveryChoice({ productId: selectedId, physical })
                    }
                    onAddressChange={(key, value) =>
                      setPostalAddress((current) => ({
                        ...current,
                        [key]: value,
                      }))
                    }
                    disabled={checkoutBusy}
                  />

                  <label className="mt-4 block text-sm font-semibold">
                    {t("vouchers.checkout.giftMessage")}
                    <textarea
                      disabled={checkoutBusy}
                      value={giftMessage}
                      onChange={(event) => setGiftMessage(event.target.value)}
                      maxLength={240}
                      rows={3}
                      aria-describedby={
                        selectedProduct ? "voucher-gift-message-help" : undefined
                      }
                      data-tenant-surface="field"
                      className="mt-2 w-full resize-y rounded-[14px] border border-[color:var(--tenant-border)] bg-transparent px-4 py-3 font-normal outline-none transition focus:border-[color:var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/15"
                    />
                  </label>
                  {selectedProduct && (
                    <>
                      <p
                        id="voucher-gift-message-help"
                        className="mt-2 text-xs leading-5 text-[color:var(--tenant-muted-on-surface)]"
                      >
                        {t(
                          selectedProduct?.hasVoucherDesign === true
                            ? "vouchers.checkout.giftMessageHelp"
                            : "vouchers.checkout.giftMessageLegacyHelp",
                        )}
                      </p>

                      <dl className="mt-5 space-y-3 border-t border-[color:var(--tenant-border)] pt-5 text-sm">
                        {sendPost && (
                          <>
                            <div className="flex items-baseline justify-between gap-4">
                              <dt>{t("vouchers.postal.subtotal")}</dt>
                              <dd className="text-right tabular-nums">
                                {formatMinorCurrencyAmount(
                                  subtotalMinor,
                                  selectedProduct.currency,
                                  locale,
                                )}
                              </dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4">
                              <dt>{t("vouchers.postal.fee")}</dt>
                              <dd className="text-right tabular-nums">
                                {formatMinorCurrencyAmount(
                                  postageFeeMinor,
                                  selectedProduct.currency,
                                  locale,
                                )}
                              </dd>
                            </div>
                          </>
                        )}
                        <div className="flex items-baseline justify-between gap-4">
                          <dt>{t("vouchers.checkout.total")}</dt>
                          <dd className="text-right text-lg font-semibold">
                            {formatProductPrice(
                              {
                                ...selectedProduct,
                                price: minorUnitsToMajor(
                                  subtotalMinor + postageFeeMinor,
                                  selectedProduct.currency,
                                ),
                              },
                              locale,
                            )}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <dt>{t("vouchers.checkout.validity")}</dt>
                          <dd className="max-w-[70%] text-right text-[color:var(--tenant-muted-on-surface)]">
                            {selectedProduct?.voucherSettings?.validity?.mode ===
                            "none"
                              ? t("vouchers.checkout.noExpiry")
                              : selectedProduct?.voucherSettings?.validity?.mode ===
                                  "date"
                                ? t("vouchers.checkout.validUntil", {
                                    date: new Intl.DateTimeFormat(locale, {
                                      dateStyle: "medium",
                                      timeZone: "UTC",
                                    }).format(
                                      new Date(
                                        `${selectedProduct.voucherSettings.validity.date}T00:00:00Z`,
                                      ),
                                    ),
                                  })
                                : t("vouchers.checkout.validMonths", {
                                    months:
                                      selectedProduct?.voucherSettings?.validity
                                        ?.months || 12,
                                  })}
                          </dd>
                        </div>
                      </dl>
                    </>
                  )}

                  {error ? (
                    <p className="mt-4 text-sm text-red-700" role="alert">
                      {error}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={checkoutBusy || !selectedProduct}
                    data-tenant-button="primary"
                    className="group mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full px-5 text-sm font-semibold shadow-[0_14px_32px_rgba(17,17,15,0.12)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
                    style={primaryButtonStyle}
                  >
                    {checkoutBusy
                      ? t("vouchers.checkout.starting")
                      : t("vouchers.checkout.continue")}
                    <ArrowLongRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
                  </button>
                  <p className="mt-4 text-xs leading-5 text-[color:var(--tenant-muted-on-surface)]">
                    {t("vouchers.checkout.secure")}
                  </p>
                </form>
              </div>
            ) : (
              <div
                className="mt-10 flex min-h-72 items-center justify-center rounded-[26px] border border-dashed border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] px-6 text-center text-sm text-[color:var(--tenant-muted-on-surface)]"
                data-tenant-surface="card"
              >
                {t("catalog.empty")}
              </div>
            )}
          </section>
          {children ? (
            <section
              id="my-vouchers"
              className="mt-14 scroll-mt-28 border-t border-[var(--tenant-border)] pt-8"
              aria-label={shopping("manage")}
            >
              {children}
            </section>
          ) : null}
      </CustomerPortalPage>
    </VoucherCatalogGate>
  );
}
