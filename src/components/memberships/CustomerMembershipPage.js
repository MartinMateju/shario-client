"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  IdentificationIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import MembershipHourBalance from "./MembershipHourBalance";
import { ScheduledMembershipPlanChange } from "./MembershipPlanChange";

import {
  CustomerPortalEmptyState,
  CustomerPortalLoadingState,
  CustomerPortalPage,
  CustomerPortalPageHeader,
  CustomerPortalSurface,
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { Link } from "@/i18n/navigation";
import {
  useCancelMyMembershipMutation,
  useCreateMembershipBillingPortalMutation,
  useGetMyMembershipLedgerQuery,
  useGetMyMembershipQuery,
  useResumeMyMembershipMutation,
} from "@/lib/features/memberships/membershipsApiSlice";
import {
  CANCELLATION_REASONS,
  formatBenefitValue,
  formatBenefitBalance,
  formatDate,
  formatPlanPrice,
  getBalanceForBenefit,
  getMembershipBenefits,
  getMembershipName,
  getLocalizedMembershipText,
  getMembershipPrice,
  statusTone,
} from "./membership.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const inputClass =
  "min-h-11 w-full rounded-[13px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-3.5 text-[11px] text-[var(--tenant-text-on-surface)] outline-none focus:border-[var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/20";

const normalizeEntries = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.entries)) return response.entries;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

export default function CustomerMembershipPage() {
  const t = useTranslations("Memberships.portal");
  const commonT = useTranslations("Memberships.common");
  const benefitT = useTranslations("Memberships.benefits");
  const changeT = useTranslations("Memberships.planChange");
  const locale = useLocale();
  const location = useOptionalCustomerPortalLocation();
  const browseHref = retainCustomerPortalLocation(
    "/portal/membership/plans",
    location?.activeLocationReference,
  );
  const query = useGetMyMembershipQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const membership = query.data?.membership ?? query.data?.data ?? null;
  const ledgerQuery = useGetMyMembershipLedgerQuery(
    { limit: 20 },
    { skip: !membership },
  );
  const entries = normalizeEntries(ledgerQuery.data);
  const benefits = getMembershipBenefits(membership);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [portalError, setPortalError] = useState(false);
  const [createBillingPortal, portalState] =
    useCreateMembershipBillingPortalMutation();
  const [resumeMembership, resumeState] = useResumeMyMembershipMutation();

  const openBillingPortal = async () => {
    setPortalError(false);
    try {
      const response = await createBillingPortal({
        locale,
        origin: window.location.origin,
      }).unwrap();
      if (!response?.url) throw new Error("Missing billing portal URL");
      window.location.assign(response.url);
    } catch {
      setPortalError(true);
    }
  };

  if (query.isLoading) {
    return (
      <CustomerPortalPage contentClassName="max-w-6xl">
        <CustomerPortalPageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        <div className="mt-7">
          <CustomerPortalLoadingState label={t("loading")} />
        </div>
      </CustomerPortalPage>
    );
  }

  if (query.isError) {
    return (
      <CustomerPortalPage contentClassName="max-w-6xl">
        <CustomerPortalPageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalEmptyState
            icon={IdentificationIcon}
            title={t("loadError")}
            action={
              <button
                type="button"
                onClick={query.refetch}
                className={customerPortalPrimaryActionClass}
              >
                {commonT("retry")}
              </button>
            }
          />
        </CustomerPortalSurface>
      </CustomerPortalPage>
    );
  }

  if (!membership) {
    return (
      <CustomerPortalPage contentClassName="max-w-6xl">
        <CustomerPortalPageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        <CustomerPortalSurface className="mt-7 p-3">
          <CustomerPortalEmptyState
            icon={IdentificationIcon}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <Link
                href={browseHref}
                className={customerPortalPrimaryActionClass}
              >
                {t("empty.browse")}
              </Link>
            }
          />
        </CustomerPortalSurface>
      </CustomerPortalPage>
    );
  }

  const price = getMembershipPrice(membership);
  const status = membership.status || "pending";
  const isClosed = ["cancelled", "expired"].includes(status);
  // An abandoned Checkout has no paid period to manage. Keep invoice/history
  // access, and retain billing management for previously paid memberships.
  const showBillingPortal =
    !isClosed ||
    Boolean(membership.currentPeriodStart || membership.currentPeriodEnd);
  const cancellationScheduled =
    !isClosed &&
    (membership.cancelAtPeriodEnd || status === "cancel_scheduled");

  return (
    <CustomerPortalPage contentClassName="max-w-6xl">
      <CustomerPortalPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <span
              className={cx(
                "inline-flex min-h-11 items-center rounded-full px-4 text-[10px] font-semibold shadow-[0_7px_18px_rgba(17,17,15,0.035)]",
                statusTone(status),
              )}
            >
              {commonT(`statuses.${status}`)}
            </span>
            <Link
              href={browseHref}
              className={customerPortalPrimaryActionClass}
            >
              {isClosed ? t("empty.browse") : changeT("browse")}
            </Link>
          </>
        }
      />

      <ScheduledMembershipPlanChange
        membership={membership}
        onChanged={query.refetch}
      />

      {cancellationScheduled ? (
        <div className="mt-7 flex flex-col gap-3 rounded-[20px] border border-sand-300 bg-sand-100 px-5 py-4 shadow-[0_10px_30px_rgba(17,17,15,0.035)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-sand-800">
              {t("scheduled.title")}
            </p>
            <p className="mt-1 text-[9px] leading-4 text-sand-700">
              {t("scheduled.description", {
                date: formatDate(membership.currentPeriodEnd, locale),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              resumeMembership()
                .unwrap()
                .catch(() => {})
            }
            disabled={resumeState.isLoading}
            className={cx(customerPortalSecondaryActionClass, "shrink-0")}
          >
            {resumeState.isLoading
              ? t("scheduled.undoing")
              : t("scheduled.undo")}
          </button>
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <CustomerPortalSurface as="article" className="p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--tenant-muted-on-surface)]">
                {t("plan")}
              </p>
              <h2 className="mt-2 text-[var(--tenant-heading-on-surface)] text-2xl font-semibold tracking-[-0.04em]">
                {getMembershipName(membership, locale)}
              </h2>
            </div>
            <p className="text-xl font-semibold tracking-[-0.03em]">
              {formatPlanPrice(price, locale)}
            </p>
          </div>
          <div className="mt-6 grid gap-3 rounded-[18px] bg-[var(--tenant-surface)] p-4 sm:grid-cols-2">
            <Info
              label={t("periodStart")}
              value={formatDate(membership.currentPeriodStart, locale)}
            />
            <Info
              label={t("periodEnd")}
              value={formatDate(membership.currentPeriodEnd, locale)}
            />
          </div>
          <h3 className="mt-6 text-[var(--tenant-heading-on-surface)] text-[12px] font-semibold">
            {t("benefits.title")}
          </h3>
          <p className="mt-1 text-[9px] leading-4 text-[var(--tenant-muted-on-surface)]">
            {benefits.some(
              (benefit) => benefit.unit === "minute" && benefit.memberOnly,
            )
              ? benefitT("timeTrackingNotice")
              : t("benefits.trackingNotice")}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const balance = getBalanceForBenefit(membership, benefit.key);
              return (
                <div
                  key={benefit.key}
                  className="rounded-[18px] border border-[color-mix(in_srgb,var(--tenant-text)_10%,transparent)] bg-[var(--tenant-surface)] p-4 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-accent-on-surface)]" />
                    <div>
                      <p className="text-[10px] font-semibold">
                        {getLocalizedMembershipText(
                          benefit,
                          "label",
                          locale,
                          membership?.planSnapshot?.sourceLanguage ??
                            membership?.planVersion?.sourceLanguage,
                        )}
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-[var(--tenant-muted-on-surface)]">
                        {formatBenefitValue(benefit, benefitT, locale)}
                      </p>
                    </div>
                  </div>
                  {balance ? (
                    <p className="mt-3 rounded-full bg-cobalt-50 px-3 py-1.5 text-center text-[9px] font-semibold text-cobalt-700">
                      {t("benefits.available", {
                        value: formatBenefitBalance(
                          benefit,
                          balance.available,
                          locale,
                        ),
                      })}
                    </p>
                  ) : null}
                  <MembershipHourBalance benefit={benefit} balance={balance} />
                </div>
              );
            })}
          </div>
        </CustomerPortalSurface>

        <aside className="space-y-4">
          <CustomerPortalSurface className="p-5 sm:p-6">
            <h2 className="text-[13px] font-semibold text-[var(--tenant-heading-on-surface)]">
              {t("billing.title")}
            </h2>
            {showBillingPortal ? (
              <>
                <p className="mt-2 text-[9px] leading-5 text-[var(--tenant-muted-on-surface)]">
                  {t("billing.description")}
                </p>
                <button
                  type="button"
                  onClick={openBillingPortal}
                  disabled={portalState.isLoading}
                  className={cx(
                    customerPortalSecondaryActionClass,
                    "mt-4 w-full",
                  )}
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />{" "}
                  {portalState.isLoading
                    ? t("billing.opening")
                    : t("billing.open")}
                </button>
              </>
            ) : null}
            {portalError ? (
              <p
                className="mt-3 rounded-[13px] bg-danger-soft p-3 text-[9px] text-danger"
                role="alert"
              >
                {t("billing.error")}
              </p>
            ) : null}
            <Link
              href="/portal/membership/invoices"
              className={cx(customerPortalSecondaryActionClass, "mt-2 w-full")}
            >
              <DocumentTextIcon className="h-4 w-4" /> {t("billing.invoices")}
            </Link>
          </CustomerPortalSurface>
          {!cancellationScheduled && !isClosed ? (
            <CustomerPortalSurface className="p-5 sm:p-6">
              <h2 className="text-[13px] font-semibold text-[var(--tenant-heading-on-surface)]">
                {t("cancel.title")}
              </h2>
              <p className="mt-2 text-[9px] leading-5 text-[var(--tenant-muted-on-surface)]">
                {t("cancel.description")}
              </p>
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                disabled={Boolean(membership.scheduledPlanChange)}
                data-tenant-hover="preserve"
                className="mt-4 min-h-11 w-full rounded-full border border-danger/30 bg-danger-soft px-4 text-[9px] font-semibold text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
              >
                {t("cancel.action")}
              </button>
              {membership.scheduledPlanChange ? (
                <p className="mt-3 text-xs text-[var(--tenant-muted-on-surface)]">
                  {changeT("cancelBeforeMembership")}
                </p>
              ) : null}
            </CustomerPortalSurface>
          ) : null}
        </aside>
      </div>

      <CustomerPortalSurface className="mt-5 p-5 sm:p-6 lg:p-7">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-[var(--tenant-accent-on-surface)]" />
          <h2 className="text-[var(--tenant-heading-on-surface)] text-[14px] font-semibold">
            {t("ledger.title")}
          </h2>
        </div>
        <p className="mt-1 text-[9px] leading-4 text-[var(--tenant-muted-on-surface)]">
          {t("ledger.description")}
        </p>
        {ledgerQuery.isLoading ? (
          <p className="py-12 text-center text-[9px] text-[var(--tenant-muted-on-surface)]">
            {t("ledger.loading")}
          </p>
        ) : entries.length ? (
          <div className="mt-4 divide-y divide-[var(--tenant-border)]">
            {entries.map((entry) => (
              <div
                key={entry.id || entry._id}
                className="grid gap-2 py-3 sm:grid-cols-[1fr_140px_120px] sm:items-center"
              >
                <div>
                  <p className="text-[10px] font-semibold text-[var(--tenant-text-on-surface)]">
                    {t(`ledger.types.${entry.type}`)}
                  </p>
                  <p className="mt-1 text-[9px] text-[var(--tenant-muted-on-surface)]">
                    {entry.reason || entry.benefitKey}
                  </p>
                </div>
                <p
                  className={cx(
                    "w-fit text-[10px] font-semibold",
                    Number(entry.amount) >= 0
                      ? "rounded-full bg-success-soft px-2 py-1 text-success"
                      : "rounded-full bg-danger-soft px-2 py-1 text-danger",
                  )}
                >
                  {Number(entry.amount) > 0
                    ? "+"
                    : Number(entry.amount) < 0
                      ? "−"
                      : ""}
                  {formatBenefitBalance(
                    benefits.find(
                      (benefit) => benefit.key === entry.benefitKey,
                    ),
                    Math.abs(Number(entry.amount) || 0),
                    locale,
                  )}
                </p>
                <p className="text-[9px] text-[var(--tenant-muted-on-surface)] sm:text-right">
                  {formatDate(entry.createdAt, locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-[15px] border border-dashed border-[var(--tenant-border)] p-6 text-center text-[9px] text-[var(--tenant-muted-on-surface)]">
            {t("ledger.empty")}
          </p>
        )}
      </CustomerPortalSurface>
      <CancellationDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </CustomerPortalPage>
  );
}

function CancellationDialog({ open, onClose }) {
  const t = useTranslations("Memberships.portal.cancel");
  const publicTenantContext = useOptionalPublicTenant();
  const tenantTheme = getPublicTenantTheme(publicTenantContext?.tenant || {}, {
    surface: "portal",
  });
  const [form, setForm] = useState({ reason: "too_expensive", comment: "" });
  const [error, setError] = useState(false);
  const [cancel, state] = useCancelMyMembershipMutation();
  const submit = async (event) => {
    event.preventDefault();
    setError(false);
    try {
      await cancel({
        reason: form.reason,
        comment: form.comment.trim() || undefined,
      }).unwrap();
      onClose();
    } catch {
      setError(true);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      data-tenant-style={tenantTheme.stylePresetId}
      className="relative z-[95]"
      style={tenantTheme.style}
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#171717]/40 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            data-dialog-layout="compact"
            className="w-full max-w-lg rounded-[24px] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] p-5 shadow-floating sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-on-surface)]">
                  {t("eyebrow")}
                </p>
                <DialogTitle className="mt-1.5 text-[var(--tenant-heading-on-surface)] text-xl font-semibold tracking-[-0.03em]">
                  {t("dialogTitle")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)]"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-[9px] leading-5 text-[var(--tenant-muted-on-surface)]">
              {t("dialogDescription")}
            </p>
            <form
              data-ui-unstyled="true"
              onSubmit={submit}
              className="mt-5 space-y-4"
            >
              <label className="block text-[10px] font-semibold">
                {t("reason")}
                <select
                  className={`${inputClass} mt-1.5`}
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                >
                  {CANCELLATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {t(`reasons.${reason}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] font-semibold">
                {t("comment")}
                <textarea
                  className={`${inputClass} mt-1.5 min-h-24 py-3`}
                  maxLength={1000}
                  value={form.comment}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      comment: event.target.value,
                    }))
                  }
                  placeholder={t("commentPlaceholder")}
                />
              </label>
              {error ? (
                <p
                  className="rounded-[13px] bg-danger-soft p-3 text-[9px] text-danger"
                  role="alert"
                >
                  {t("error")}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-full border border-[var(--tenant-border)] px-5 text-[10px] font-semibold"
                >
                  {t("keep")}
                </button>
                <button
                  type="submit"
                  disabled={state.isLoading}
                  data-tenant-hover="preserve"
                  className="min-h-11 rounded-full bg-danger px-5 text-[10px] font-semibold text-white disabled:opacity-50"
                >
                  {state.isLoading ? t("scheduling") : t("confirm")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.12em] text-[var(--tenant-muted-on-surface)]">
        {label}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold text-[var(--tenant-text-on-surface)]">
        {value}
      </p>
    </div>
  );
}
