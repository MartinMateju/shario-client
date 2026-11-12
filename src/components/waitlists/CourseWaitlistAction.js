"use client";

import {
  ArrowPathIcon,
  EnvelopeIcon,
  QueueListIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useSelector } from "react-redux";

import { Link } from "@/i18n/navigation";
import { selectIsCustomerAuthenticated } from "@/lib/features/auth/authSlice";
import {
  WAITLIST_STATES,
  useCheckoutWaitlistOfferMutation,
  useGetMyWaitlistsQuery,
  useJoinWaitlistMutation,
  useLeaveWaitlistMutation,
  useRequestGuestWaitlistVerificationMutation,
} from "@/lib/features/waitlists/waitlistsApiSlice";
import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";
import { formatMajorCurrencyAmount } from "@/utils/money";

import WaitlistStatusBadge from "./WaitlistStatusBadge";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getId = (value) => String(value?.id ?? value?._id ?? value ?? "").trim();

const isSafeReturnPath = (value) => {
  const path = String(value || "").trim();
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(path)
  );
};

export const buildWaitlistLoginHref = ({ returnPath, sessionId }) => {
  const fallback = `/courses?courseSessionId=${encodeURIComponent(sessionId)}`;
  const next = isSafeReturnPath(returnPath) ? returnPath : fallback;
  return `/login?next=${encodeURIComponent(next)}`;
};

const formatDateTime = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const errorKeyFor = (error) => {
  const code = String(error?.data?.code || "").toUpperCase();
  if (code === "WAITLIST_NOT_ACCEPTING") return "errors.closed";
  if (code === "WAITLIST_OFFER_EXPIRED") return "errors.offerExpired";
  if (code === "WAITLIST_PRICE_SNAPSHOT_INVALID") return "errors.price";
  return "errors.generic";
};

export default function CourseWaitlistAction({
  session,
  tenantSlug,
  returnPath,
  enabled = true,
  onBookingAvailable,
}) {
  const t = useTranslations("Waitlists");
  const locale = useLocale();
  const isCustomerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const sessionId = getId(session);
  const waitlist = session?.waitlist ?? {};
  const available =
    session?.available !== false && session?.remainingCapacity !== 0;
  const canJoin =
    enabled &&
    !available &&
    waitlist.enabled === true &&
    waitlist.accepting === true;
  const statusQuery = useGetMyWaitlistsQuery(
    { sessionId },
    {
      skip: !isCustomerAuthenticated || !sessionId || !enabled,
      refetchOnFocus: true,
    },
  );
  const [join, joinState] = useJoinWaitlistMutation();
  const [leave, leaveState] = useLeaveWaitlistMutation();
  const [requestGuest, guestState] =
    useRequestGuestWaitlistVerificationMutation();
  const [checkoutOffer, checkoutState] = useCheckoutWaitlistOfferMutation();
  const [guestOpen, setGuestOpen] = useState(false);
  const [guest, setGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const sessionHistory = statusQuery.data?.entries ?? [];
  const entry =
    sessionHistory.find((candidate) =>
      [
        WAITLIST_STATES.WAITING,
        WAITLIST_STATES.OFFERED,
        WAITLIST_STATES.PAYMENT_PENDING,
      ].includes(candidate.state),
    ) ??
    sessionHistory.find(
      (candidate) => candidate.state === WAITLIST_STATES.CONFIRMED,
    ) ??
    null;
  const busy =
    joinState.isLoading ||
    leaveState.isLoading ||
    guestState.isLoading ||
    checkoutState.isLoading;

  if (!sessionId || !enabled || available || waitlist.enabled !== true) {
    return null;
  }

  const joinAuthenticated = async () => {
    setError("");
    try {
      await join({ sessionId, locale }).unwrap();
    } catch (requestError) {
      if (
        String(requestError?.data?.code || "").toUpperCase() ===
        "BOOKING_AVAILABLE"
      ) {
        setNotice(t("bookingAvailable"));
        onBookingAvailable?.(session);
        return;
      }
      setError(t(errorKeyFor(requestError)));
    }
  };

  const submitGuest = async (event) => {
    event.preventDefault();
    setError("");

    if (
      !guest.firstName.trim() ||
      !guest.lastName.trim() ||
      !EMAIL_PATTERN.test(guest.email.trim().toLowerCase())
    ) {
      setError(t("guest.validation"));
      return;
    }

    try {
      await requestGuest({
        tenantSlug,
        sessionId,
        firstName: guest.firstName.trim(),
        lastName: guest.lastName.trim(),
        email: guest.email.trim().toLowerCase(),
        locale,
      }).unwrap();
      // Always use the same response to avoid revealing whether this address
      // already has a waitlist entry.
      setNotice(t("guest.sent"));
      setGuestOpen(false);
    } catch (requestError) {
      if (
        String(requestError?.data?.code || "").toUpperCase() ===
        "BOOKING_AVAILABLE"
      ) {
        setNotice(t("bookingAvailable"));
        setGuestOpen(false);
        onBookingAvailable?.(session);
        return;
      }
      setError(t(errorKeyFor(requestError)));
    }
  };

  const withdraw = async () => {
    if (!entry?.id) return;
    setError("");
    try {
      await leave({ entryId: entry.id }).unwrap();
    } catch (requestError) {
      setError(t(errorKeyFor(requestError)));
    }
  };

  const payForOffer = async () => {
    if (!entry?.id) return;
    setError("");
    try {
      const response = await checkoutOffer({
        entryId: entry.id,
        sessionId,
        locale,
        origin: window.location.origin,
      }).unwrap();
      const checkoutUrl = getSafeCheckoutUrl(
        response?.url ?? response?.checkoutUrl,
      );
      if (!checkoutUrl) throw new Error("Missing checkout URL.");
      window.location.assign(checkoutUrl);
    } catch (requestError) {
      setError(t(errorKeyFor(requestError)));
    }
  };

  if (entry) {
    const offered = entry.state === WAITLIST_STATES.OFFERED;
    const paymentPending = entry.state === WAITLIST_STATES.PAYMENT_PENDING;
    const checkoutAvailable = offered || paymentPending;
    const mayWithdraw = [
      WAITLIST_STATES.WAITING,
      WAITLIST_STATES.OFFERED,
    ].includes(entry.state);

    return (
      <section
        className="mt-3 rounded-[16px] border border-[var(--tenant-border)] bg-[color-mix(in_srgb,var(--tenant-accent)_5%,var(--tenant-surface))] p-4 text-[var(--tenant-text-on-surface)]"
        aria-live="polite"
        data-course-waitlist-entry
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <WaitlistStatusBadge
            state={entry.state}
            label={t(`states.${entry.state}`)}
          />
          {entry.joinedAt ? (
            <span className="text-[10px] text-[var(--tenant-muted-on-surface)]">
              {t("joinedAt", { date: formatDateTime(entry.joinedAt, locale) })}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--tenant-muted-on-surface)]">
          {t(`stateDescriptions.${entry.state}`)}
        </p>
        {offered && entry.offerExpiresAt ? (
          <p className="mt-2 text-xs font-semibold text-[var(--tenant-text-on-surface)]">
            {t("offer.expires", {
              date: formatDateTime(entry.offerExpiresAt, locale),
            })}
          </p>
        ) : null}
        {checkoutAvailable && entry.price ? (
          <p className="mt-1 text-[10px] text-[var(--tenant-muted-on-surface)]">
            {t("offer.snapshot", {
              amount: formatMajorCurrencyAmount(
                entry.price.amount,
                entry.price.currency,
                locale === "cs" ? "cs-CZ" : "en-GB",
              ),
            })}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {checkoutAvailable ? (
            <button
              type="button"
              onClick={payForOffer}
              disabled={busy}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[var(--tenant-accent)] px-4 text-xs font-semibold text-[var(--tenant-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent)] focus-visible:ring-offset-2 disabled:opacity-55"
            >
              {checkoutState.isLoading
                ? t("offer.startingCheckout")
                : paymentPending
                  ? t("offer.resumePayment")
                  : t("offer.pay")}
            </button>
          ) : null}
          {mayWithdraw ? (
            <button
              type="button"
              onClick={withdraw}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-4 text-xs font-semibold text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] disabled:opacity-55"
            >
              {t("withdraw")}
            </button>
          ) : null}
        </div>
        {error ? (
          <p
            className="mt-3 rounded-[13px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  if (!canJoin) {
    return (
      <p className="mt-3 text-xs leading-5 text-[var(--tenant-muted-text)]">
        {t(`publicReasons.${waitlist.reason || "join_closed"}`)}
      </p>
    );
  }

  return (
    <div className="mt-3" data-course-waitlist-action>
      {isCustomerAuthenticated ? (
        <button
          type="button"
          onClick={joinAuthenticated}
          disabled={busy || statusQuery.isFetching}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--tenant-accent-on-surface)] bg-[var(--tenant-surface)] px-4 text-xs font-semibold text-[var(--tenant-accent-on-surface)] transition hover:bg-[color-mix(in_srgb,var(--tenant-accent)_7%,var(--tenant-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] disabled:opacity-55 motion-reduce:transition-none sm:w-auto"
        >
          {joinState.isLoading ? (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <QueueListIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {joinState.isLoading ? t("joining") : t("join")}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              setGuestOpen((open) => !open);
              setError("");
            }}
            aria-expanded={guestOpen}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--tenant-accent-on-surface)] bg-[var(--tenant-surface)] px-4 text-xs font-semibold text-[var(--tenant-accent-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] sm:w-auto"
          >
            <QueueListIcon className="h-4 w-4" aria-hidden="true" />
            {t("join")}
          </button>

          {guestOpen ? (
            <form
              onSubmit={submitGuest}
              className="mt-3 rounded-[18px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 text-[var(--tenant-text)]"
              aria-label={t("guest.formLabel")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--tenant-text)]">
                    {t("guest.title")}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--tenant-muted-text)]">
                    {t("guest.description")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGuestOpen(false)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--tenant-muted-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]"
                  aria-label={t("guest.close")}
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["firstName", "given-name"],
                  ["lastName", "family-name"],
                ].map(([field, autoComplete]) => (
                  <label key={field} className="text-[11px] font-semibold">
                    {t(`guest.${field}`)}
                    <input
                      value={guest[field]}
                      onChange={(event) =>
                        setGuest((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }))
                      }
                      autoComplete={autoComplete}
                      maxLength={80}
                      required
                      className="mt-1.5 min-h-11 w-full rounded-[12px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 text-sm text-[var(--tenant-text-on-surface)]"
                    />
                  </label>
                ))}
                <label className="text-[11px] font-semibold sm:col-span-2">
                  {t("guest.email")}
                  <input
                    type="email"
                    value={guest.email}
                    onChange={(event) =>
                      setGuest((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    autoComplete="email"
                    maxLength={254}
                    required
                    className="mt-1.5 min-h-11 w-full rounded-[12px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3 text-sm text-[var(--tenant-text-on-surface)]"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={guestState.isLoading}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--tenant-accent)] px-4 text-xs font-semibold text-[var(--tenant-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent)] focus-visible:ring-offset-2 disabled:opacity-55"
              >
                <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                {guestState.isLoading ? t("guest.sending") : t("guest.send")}
              </button>
              <p className="mt-3 text-center text-[10px] leading-4 text-[var(--tenant-muted-text)]">
                {t("guest.privacy")}{" "}
                <Link
                  href={buildWaitlistLoginHref({ returnPath, sessionId })}
                  className="font-semibold underline underline-offset-2"
                >
                  {t("guest.signIn")}
                </Link>
              </p>
            </form>
          ) : null}
        </>
      )}

      {notice ? (
        <p
          className="mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
