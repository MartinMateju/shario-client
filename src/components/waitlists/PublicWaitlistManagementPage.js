"use client";

import { resolveIntlLocale } from "@/i18n/formatting";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Link } from "@/i18n/navigation";
import {
  getSafeWaitlistToken,
  useManageGuestWaitlistMutation,
  useVerifyGuestWaitlistMutation,
  useWithdrawGuestWaitlistMutation,
} from "@/lib/features/waitlists/waitlistsApiSlice";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";

import WaitlistRefundSummary from "./WaitlistRefundSummary";
import WaitlistStatusBadge, {
  getWaitlistPresentationState,
} from "./WaitlistStatusBadge";

export const WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY =
  "skab.waitlist.management.resume.v1";

export const storeWaitlistManagementLink = (link, storage) => {
  const action = ["verify", "manage"].includes(link?.action) ? link.action : "";
  const token = getSafeWaitlistToken(link?.token);
  if (!action || !token || !storage) return false;

  try {
    storage.setItem(
      WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY,
      JSON.stringify({ action, token }),
    );
    return true;
  } catch {
    return false;
  }
};

const getStoredWaitlistManagementLink = (storage) => {
  if (!storage) return { action: "", token: "" };

  try {
    const stored = JSON.parse(
      storage.getItem(WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY) || "null",
    );
    const action = ["verify", "manage"].includes(stored?.action)
      ? stored.action
      : "";
    const token = getSafeWaitlistToken(stored?.token);
    return action && token ? { action, token } : { action: "", token: "" };
  } catch {
    return { action: "", token: "" };
  }
};

export const parseWaitlistHash = (hash, storage) => {
  const fragment = String(hash || "").replace(/^#/, "");
  if (fragment === "manage") return getStoredWaitlistManagementLink(storage);

  const params = new URLSearchParams(fragment);
  for (const action of ["verify", "manage"]) {
    const token = getSafeWaitlistToken(params.get(action));
    if (token) return { action, token };
  }
  return { action: "", token: "" };
};

const formatDateTime = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function PublicWaitlistManagementPage() {
  const t = useTranslations("Waitlists.management");
  const sharedT = useTranslations("Waitlists");
  const locale = useLocale();
  const tenantSlug = getValidatedTenantSlugParam(useParams());
  const [link, setLink] = useState({ action: "", token: "" });
  const [hashParsed, setHashParsed] = useState(false);
  const [entry, setEntry] = useState(null);
  const [managementToken, setManagementToken] = useState("");
  const [bookingAvailable, setBookingAvailable] = useState(false);
  const [error, setError] = useState("");
  const [verify, verifyState] = useVerifyGuestWaitlistMutation();
  const [manage, manageState] = useManageGuestWaitlistMutation();
  const [withdraw, withdrawState] = useWithdrawGuestWaitlistMutation();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsedLink = parseWaitlistHash(
        window.location.hash,
        window.sessionStorage,
      );
      if (
        parsedLink.token &&
        storeWaitlistManagementLink(parsedLink, window.sessionStorage)
      ) {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#manage`,
        );
      }
      setLink(parsedLink);
      setHashParsed(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!tenantSlug || !link.token || entry || managementToken) return;
    let active = true;

    const load = async () => {
      setError("");
      try {
        const response = await (
          link.action === "verify"
            ? verify({ tenantSlug, token: link.token })
            : manage({ tenantSlug, token: link.token })
        ).unwrap();
        if (!active) return;
        setEntry(response?.entry ?? null);
        const nextManagementToken =
          response?.managementToken ||
          (link.action === "manage" ? link.token : "");
        setManagementToken(nextManagementToken);
        if (nextManagementToken) {
          const stored = storeWaitlistManagementLink(
            { action: "manage", token: nextManagementToken },
            window.sessionStorage,
          );
          const resumeFragment = stored
            ? "manage"
            : `manage=${encodeURIComponent(nextManagementToken)}`;
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}#${resumeFragment}`,
          );
        }
      } catch (requestError) {
        if (!active) return;
        if (
          String(requestError?.data?.code || "").toUpperCase() ===
          "BOOKING_AVAILABLE"
        ) {
          setBookingAvailable(true);
          return;
        }
        setError(t("invalid.description"));
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [
    entry,
    link.action,
    link.token,
    manage,
    managementToken,
    t,
    tenantSlug,
    verify,
  ]);

  const leave = async () => {
    if (!managementToken) return;
    setError("");
    try {
      const response = await withdraw({
        tenantSlug,
        token: managementToken,
      }).unwrap();
      setEntry(response?.entry ?? entry);
      setManagementToken("");
      window.sessionStorage.removeItem(WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    } catch (requestError) {
      setError(
        getLocalizedApiErrorMessage(requestError, sharedT("errors.generic")),
      );
    }
  };

  const loading = verifyState.isLoading || manageState.isLoading;
  const presentationState = getWaitlistPresentationState(entry);

  return (
    <main className="min-h-[72vh] bg-[var(--tenant-background)] px-4 py-12 text-[var(--tenant-text)] sm:px-6 lg:py-16">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-[0_24px_70px_rgba(17,17,15,0.07)]">
        <div className="border-b border-[var(--tenant-border)] bg-[color-mix(in_srgb,var(--tenant-background)_72%,var(--tenant-surface))] px-6 py-7 sm:px-8">
          <span className="grid h-12 w-12 place-items-center rounded-[16px] bg-[var(--tenant-accent)] text-[var(--tenant-accent-foreground)]">
            <QueueListIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 font-serif text-4xl tracking-[-0.045em]">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
            {t("description")}
          </p>
        </div>

        <div className="p-6 sm:p-8" aria-live="polite">
          {!hashParsed || loading ? (
            <div
              className="flex min-h-48 items-center justify-center text-sm text-[var(--tenant-muted-on-surface)]"
              role="status"
            >
              <ArrowPathIcon
                className="mr-2 h-5 w-5 animate-spin"
                aria-hidden="true"
              />
              {t("loading")}
            </div>
          ) : bookingAvailable ? (
            <div className="text-center">
              <CheckCircleIcon
                className="mx-auto h-10 w-10 text-emerald-600"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-semibold">
                {t("available.title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                {t("available.description")}
              </p>
              <Link
                href="/courses"
                className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--tenant-accent)] px-6 text-xs font-semibold text-[var(--tenant-accent-foreground)]"
              >
                {t("available.action")}
              </Link>
            </div>
          ) : entry ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <WaitlistStatusBadge
                  state={presentationState}
                  label={sharedT(`states.${presentationState}`)}
                />
                {entry.joinedAt ? (
                  <span className="text-[11px] text-[var(--tenant-muted-on-surface)]">
                    {sharedT("joinedAt", {
                      date: formatDateTime(entry.joinedAt, locale),
                    })}
                  </span>
                ) : null}
              </div>
              {entry.session ? (
                <div className="mt-5 rounded-[16px] border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-4 text-[var(--tenant-text)]">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--tenant-muted-text)]">
                    {t("sessionLabel")}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl tracking-[-0.035em]">
                    {entry.session.title || t("sessionFallback")}
                  </h2>
                  {entry.session.start ? (
                    <p className="mt-2 text-xs text-[var(--tenant-muted-text)]">
                      {formatDateTime(entry.session.start, locale)}
                      {entry.session.locationName
                        ? ` · ${entry.session.locationName}`
                        : ""}
                    </p>
                  ) : entry.session.locationName ? (
                    <p className="mt-2 text-xs text-[var(--tenant-muted-text)]">
                      {entry.session.locationName}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-5 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                {sharedT(`stateDescriptions.${presentationState}`)}
              </p>
              {entry.refund ? (
                <WaitlistRefundSummary refund={entry.refund} />
              ) : (
                <div className="mt-5 flex items-start gap-3 rounded-[16px] border border-sky-200 bg-sky-50 p-4 text-sky-900">
                  <EnvelopeIcon
                    className="mt-0.5 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-xs leading-5">{t("emailNotice")}</p>
                </div>
              )}
              {["waiting", "offered"].includes(entry.state) &&
              managementToken ? (
                <button
                  type="button"
                  onClick={leave}
                  disabled={withdrawState.isLoading}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-5 text-xs font-semibold text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)] disabled:opacity-55 sm:w-auto"
                >
                  {sharedT("withdraw")}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="text-center">
              <ExclamationTriangleIcon
                className="mx-auto h-10 w-10 text-amber-600"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl font-semibold">
                {t("invalid.title")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
                {error || t("invalid.description")}
              </p>
              <Link
                href="/courses"
                className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-6 text-xs font-semibold text-[var(--tenant-text-on-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-surface)]"
              >
                {t("invalid.action")}
              </Link>
            </div>
          )}
          {error && entry ? (
            <p
              className="mt-4 rounded-[13px] border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
