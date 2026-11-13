"use client";

import { resolveIntlLocale } from "@/i18n/formatting";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import {
  ArrowPathIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";

import { Link } from "@/i18n/navigation";
import { selectIsCustomerAuthenticated } from "@/lib/features/auth/authSlice";
import { useCheckoutMutation } from "@/lib/features/checkout/checkoutSlice";
import {
  getSafeWaitlistToken,
  useCheckoutGuestWaitlistOfferMutation,
  useInspectWaitlistOfferMutation,
} from "@/lib/features/waitlists/waitlistsApiSlice";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";

export const WAITLIST_OFFER_RESUME_STORAGE_KEY =
  "skab.waitlist.offer.resume.v1";

export const storeWaitlistOfferForResume = (token, storage) => {
  const safeToken = getSafeWaitlistToken(token);
  if (!safeToken || !storage) return false;

  try {
    storage.setItem(WAITLIST_OFFER_RESUME_STORAGE_KEY, safeToken);
    return true;
  } catch {
    return false;
  }
};

export const takeResumedWaitlistOffer = (storage) => {
  if (!storage) return "";

  try {
    const token = getSafeWaitlistToken(
      storage.getItem(WAITLIST_OFFER_RESUME_STORAGE_KEY),
    );
    storage.removeItem(WAITLIST_OFFER_RESUME_STORAGE_KEY);
    return token;
  } catch {
    return "";
  }
};

export const getWaitlistOfferTokenFromHash = (hash, storage) => {
  const fragment = String(hash || "").replace(/^#/, "");
  if (fragment === "resume") return takeResumedWaitlistOffer(storage);

  const params = new URLSearchParams(fragment);
  return getSafeWaitlistToken(params.get("offer"));
};

export const buildWaitlistOfferLoginHref = () => {
  const next = "/waitlists/offer#resume";
  return `/login?next=${encodeURIComponent(next)}`;
};

const formatDateTime = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function WaitlistOfferPage() {
  const t = useTranslations("Waitlists.offerLanding");
  const locale = useLocale();
  const tenantSlug = getValidatedTenantSlugParam(useParams());
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const [token, setToken] = useState("");
  const [hashParsed, setHashParsed] = useState(false);
  const [offer, setOffer] = useState(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [inspect, inspectState] = useInspectWaitlistOfferMutation();
  const [checkout, checkoutState] = useCheckoutMutation();
  const [guestCheckout, guestCheckoutState] =
    useCheckoutGuestWaitlistOfferMutation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsedToken = getWaitlistOfferTokenFromHash(
        window.location.hash,
        window.sessionStorage,
      );
      if (parsedToken) {
        // Keep the bearer out of the visible URL and browser history. The
        // origin-scoped session copy survives a refresh and the sign-in flow.
        if (storeWaitlistOfferForResume(parsedToken, window.sessionStorage)) {
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}#resume`,
          );
        }
      }
      setToken(parsedToken);
      setHashParsed(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!tenantSlug || !token || offer) return;
    let active = true;
    const load = async () => {
      try {
        const inspected = await inspect({ tenantSlug, token }).unwrap();
        if (active) setOffer(inspected);
      } catch (requestError) {
        if (active) {
          setError(
            getLocalizedApiErrorMessage(requestError, t("errors.invalid")),
          );
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [inspect, offer, t, tenantSlug, token]);

  const startAuthenticatedCheckout = async () => {
    setError("");
    try {
      const response = await checkout({
        waitlistOfferToken: token,
        locale,
        origin: window.location.origin,
      }).unwrap();
      const url = getSafeCheckoutUrl(response?.url ?? response?.checkoutUrl);
      if (!url) throw new Error(t("errors.checkout"));
      if (!storeWaitlistOfferForResume(token, window.sessionStorage)) {
        throw new Error(t("errors.checkout"));
      }
      window.location.assign(url);
    } catch (requestError) {
      setError(getLocalizedApiErrorMessage(requestError, t("errors.checkout")));
    }
  };

  const startGuestCheckout = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await guestCheckout({
        tenantSlug,
        token,
        email: email.trim().toLowerCase(),
        checkout: { locale, origin: window.location.origin },
      }).unwrap();
      const url = getSafeCheckoutUrl(response?.url ?? response?.checkoutUrl);
      if (!url) throw new Error(t("errors.checkout"));
      if (!storeWaitlistOfferForResume(token, window.sessionStorage)) {
        throw new Error(t("errors.checkout"));
      }
      window.location.assign(url);
    } catch (requestError) {
      setError(getLocalizedApiErrorMessage(requestError, t("errors.checkout")));
    }
  };

  const preserveOfferForLogin = (event) => {
    if (!storeWaitlistOfferForResume(token, window.sessionStorage)) {
      event.preventDefault();
      setError(t("errors.checkout"));
    }
  };

  const loading = !hashParsed || inspectState.isLoading;
  const paymentPending = offer?.state === "payment_pending";

  return (
    <main className="min-h-[72vh] bg-[var(--tenant-background)] px-4 py-12 text-[var(--tenant-text)] sm:px-6 lg:py-16">
      <section className="mx-auto max-w-xl rounded-[28px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-6 text-[var(--tenant-text-on-surface)] shadow-[0_24px_70px_rgba(17,17,15,0.07)] sm:p-8">
        {loading ? (
          <div
            className="flex min-h-56 items-center justify-center text-sm text-[var(--tenant-muted-on-surface)]"
            role="status"
          >
            <ArrowPathIcon
              className="mr-2 h-5 w-5 animate-spin"
              aria-hidden="true"
            />
            {t("loading")}
          </div>
        ) : offer ? (
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-emerald-600 text-white">
              <ClockIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 font-serif text-4xl tracking-[-0.045em]">
              {t("title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
              {t("description")}
            </p>
            {offer.session ? (
              <div className="mt-5 rounded-[17px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 text-[var(--tenant-text)]">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tenant-muted-text)]">
                  {t("sessionLabel")}
                </p>
                <h2 className="mt-1 font-serif text-2xl tracking-[-0.035em]">
                  {offer.session.title || t("sessionFallback")}
                </h2>
                {offer.session.start ? (
                  <p className="mt-2 text-xs text-[var(--tenant-muted-text)]">
                    {formatDateTime(offer.session.start, locale)}
                    {offer.session.locationName
                      ? ` · ${offer.session.locationName}`
                      : ""}
                  </p>
                ) : offer.session.locationName ? (
                  <p className="mt-2 text-xs text-[var(--tenant-muted-text)]">
                    {offer.session.locationName}
                  </p>
                ) : null}
              </div>
            ) : null}
            {offer.expiresAt ? (
              <p className="mt-5 rounded-[15px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
                {t("expires", {
                  date: formatDateTime(offer.expiresAt, locale),
                })}
              </p>
            ) : null}
            {offer.price ? (
              <div className="mt-5 rounded-[17px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 text-[var(--tenant-text)]">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tenant-muted-text)]">
                  {t("priceLabel")}
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatMajorCurrencyAmount(
                    offer.price.amount,
                    offer.price.currency,
                    resolveIntlLocale(locale),
                  )}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-[var(--tenant-muted-text)]">
                  {t("priceSnapshot")}
                </p>
              </div>
            ) : null}

            {isCustomerAuthenticated ? (
              <button
                type="button"
                onClick={startAuthenticatedCheckout}
                disabled={checkoutState.isLoading}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-accent)] px-5 text-sm font-semibold text-[var(--tenant-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent)] focus-visible:ring-offset-2 disabled:opacity-55"
              >
                <CreditCardIcon className="h-5 w-5" aria-hidden="true" />
                {checkoutState.isLoading
                  ? t("starting")
                  : paymentPending
                    ? t("resumePayment")
                    : t("pay")}
              </button>
            ) : offer.guestCheckoutAllowed ? (
              <form onSubmit={startGuestCheckout} className="mt-6">
                <label className="text-xs font-semibold">
                  {t("email")}
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    className="mt-2 min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] px-3 text-sm text-[var(--tenant-text)]"
                  />
                </label>
                <p className="mt-2 text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                  {t("verifiedEmail")}
                </p>
                <button
                  type="submit"
                  disabled={guestCheckoutState.isLoading}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-accent)] px-5 text-sm font-semibold text-[var(--tenant-accent-foreground)] disabled:opacity-55"
                >
                  <CreditCardIcon className="h-5 w-5" aria-hidden="true" />
                  {guestCheckoutState.isLoading
                    ? t("starting")
                    : paymentPending
                      ? t("resumePayment")
                      : t("pay")}
                </button>
              </form>
            ) : (
              <div className="mt-6">
                <Link
                  href={buildWaitlistOfferLoginHref()}
                  onClick={preserveOfferForLogin}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--tenant-accent)] px-5 text-sm font-semibold text-[var(--tenant-accent-foreground)]"
                >
                  {t("signIn")}
                </Link>
                <p className="mt-3 text-center text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
                  {t("sameEmail")}
                </p>
              </div>
            )}
            <p className="mt-4 text-center text-[10px] leading-4 text-[var(--tenant-muted-on-surface)]">
              {t("confirmationNotice")}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <ExclamationTriangleIcon
              className="mx-auto h-10 w-10 text-amber-600"
              aria-hidden="true"
            />
            <h1 className="mt-5 text-2xl font-semibold">
              {t("invalid.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
              {error || t("invalid.description")}
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-5 text-xs font-semibold text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)]"
            >
              {t("invalid.action")}
            </Link>
          </div>
        )}
        {error && offer ? (
          <p
            className="mt-4 rounded-[13px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>
    </main>
  );
}
