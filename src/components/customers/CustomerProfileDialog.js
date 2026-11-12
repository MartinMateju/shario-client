"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogTitle } from "@headlessui/react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  UserCircleIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale } from "next-intl";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePagination,
  WorkspaceStatusPill,
} from "@/components/dashboard/WorkspaceDataSurface";
import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import { useGetCustomerQuery } from "@/lib/features/users/usersApiSlice";
import { useGetCustomerBookingHistoryQuery } from "@/lib/features/bookings/bookingsApiSlice";
import {
  useGetCreditBalanceQuery,
  useGetCreditTransactionsQuery,
} from "@/lib/features/credits/creditsApiSlice";
import { useGetUserMembershipsQuery } from "@/lib/features/memberships/membershipsApiSlice";
import { formatMakerId } from "@/utils/memberIdentity";
import { getCustomerStatus } from "@/components/tables/people/people-table.utils";

import {
  formatCustomerCurrency,
  getApiErrorMessage,
  getCustomerName,
  getEntityId,
  getMembershipStatus,
} from "./customers.utils";

const PROFILE_TABS_ID = "customer-profile-tabs";
const PAGE_SIZE = 8;

const cx = (...classes) => classes.filter(Boolean).join(" ");

const unwrapData = (value) => {
  let current = value;

  for (let depth = 0; depth < 3; depth += 1) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.prototype.hasOwnProperty.call(current, "data")
    ) {
      break;
    }

    current = current.data;
  }

  return current;
};

const normalizeCollection = (value, keys) => {
  const source = unwrapData(value);
  if (Array.isArray(source)) return source;

  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
  }

  return [];
};

const getCustomerRecord = (value) => {
  const source = unwrapData(value);

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  return source.customer && typeof source.customer === "object"
    ? source.customer
    : source;
};

const getPageMeta = (value, fallbackPage, itemCount) => {
  const source = unwrapData(value) || {};
  const pagination = source.pagination || {};
  const total = Math.max(
    0,
    Number(
      source.totalCount ??
        source.total ??
        pagination.totalCount ??
        pagination.total ??
        itemCount,
    ) || 0,
  );
  const page = Math.max(
    1,
    Number(
      source.currentPage ?? source.page ?? pagination.page ?? fallbackPage,
    ) || fallbackPage,
  );
  const pageCount = Math.max(
    1,
    Number(
      source.totalPages ??
        source.pages ??
        pagination.totalPages ??
        pagination.pages ??
        Math.ceil(total / PAGE_SIZE),
    ) || 1,
  );

  return { page, pageCount, total };
};

const translateEnum = (t, key, fallback) => {
  try {
    return t(key);
  } catch {
    return fallback;
  }
};

const humanize = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getDateLocale = (locale) => (locale === "cs" ? "cs-CZ" : "en-GB");

const formatDate = (value, locale, options = {}) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(getDateLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
};

const formatDateTime = (value, locale) =>
  formatDate(value, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

const getInitials = (customer) => {
  const initials = getCustomerName(customer)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "SK";
};

const statusTone = (status) => {
  if (["active", "confirmed", "processed", "completed"].includes(status)) {
    return "success";
  }

  if (
    [
      "past_due",
      "pending",
      "invited",
      "cancel_scheduled",
      "processing",
    ].includes(status)
  ) {
    return "warning";
  }

  if (
    ["failed", "cancelled", "canceled", "inactive", "expired"].includes(status)
  ) {
    return "danger";
  }

  return "neutral";
};

const getBookingName = (booking) =>
  booking?.bookingProduct?.name ||
  booking?.product?.name ||
  booking?.productName ||
  booking?.label ||
  booking?.name ||
  "—";

const getBookingLocation = (booking) =>
  booking?.location?.name ||
  booking?.locationName ||
  booking?.studio?.name ||
  "";

const getBookingStatus = (booking) =>
  String(booking?.status || booking?.bookingStatus || "pending")
    .trim()
    .toLowerCase()
    .replaceAll("-", "_");

const getMembershipName = (membership) =>
  membership?.planSnapshot?.name ||
  membership?.planVersion?.name ||
  membership?.plan?.name ||
  membership?.name ||
  "—";

const getMembershipLocation = (membership) =>
  membership?.selectedLocation?.name ||
  membership?.location?.name ||
  membership?.locationName ||
  "";

const isMembershipCancellable = (membership) =>
  !["cancelled", "canceled", "cancel_scheduled", "expired"].includes(
    getMembershipStatus(membership, ""),
  );

function LoadingState({ label }) {
  return (
    <div
      role="status"
      className="flex min-h-[260px] items-center justify-center rounded-[20px] border border-line bg-white text-[12px] font-medium text-ink-muted"
    >
      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

function RefreshingNotice({ label }) {
  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 text-[11px] text-ink-muted"
    >
      <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      {label}
    </p>
  );
}

function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  compact = false,
}) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-center justify-center rounded-[20px] border border-danger/20 bg-danger-soft px-5 text-center",
        compact ? "min-h-36 py-6" : "min-h-[260px] py-10",
      )}
    >
      <ExclamationTriangleIcon
        className="h-6 w-6 text-danger"
        aria-hidden="true"
      />
      <h3 className="mt-3 text-[14px] font-semibold text-danger">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-[12px] leading-5 text-danger/80">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-11 rounded-full border border-danger/25 bg-white px-4 text-[12px] font-semibold text-danger transition hover:border-danger/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

function Detail({ icon: Icon, label, value, href }) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-sand-50 text-ink-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
          {label}
        </span>
        <span className="mt-0.5 block break-words text-[12px] font-medium text-ink-soft">
          {value || "—"}
        </span>
      </span>
    </>
  );

  return href ? (
    <a
      href={href}
      className="flex min-w-0 items-center gap-3 rounded-[15px] border border-line bg-white p-3.5 transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300"
    >
      {content}
    </a>
  ) : (
    <div className="flex min-w-0 items-center gap-3 rounded-[15px] border border-line bg-white p-3.5">
      {content}
    </div>
  );
}

function QuickAction({ icon: Icon, children, onClick, tone = "neutral" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300",
        tone === "primary"
          ? "border-cobalt-500 bg-cobalt-500 text-white shadow-cobalt hover:bg-cobalt-600"
          : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

function OverviewPanel({ customer, permissions, t, locale, actions }) {
  const status = getCustomerStatus(customer);
  const hasActions =
    permissions.canGrantCredits || permissions.canManageMemberships;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <WorkspaceCard className="p-4 sm:p-5">
        <h3 className="text-[14px] font-semibold text-ink">
          {t("profile.overview.contactTitle")}
        </h3>
        <p className="mt-1 text-[11px] leading-5 text-ink-muted">
          {t("profile.overview.contactDescription")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Detail
            icon={EnvelopeIcon}
            label={t("profile.fields.email")}
            value={customer?.email}
            href={customer?.email ? `mailto:${customer.email}` : undefined}
          />
          <Detail
            icon={PhoneIcon}
            label={t("profile.fields.phone")}
            value={customer?.phone || customer?.phoneNumber}
            href={
              customer?.phone || customer?.phoneNumber
                ? `tel:${customer.phone || customer.phoneNumber}`
                : undefined
            }
          />
          <Detail
            icon={IdentificationIcon}
            label={t("profile.fields.customerId")}
            value={formatMakerId(customer?.memberNumber)}
          />
          <Detail
            icon={ClockIcon}
            label={t("profile.fields.customerSince")}
            value={formatDate(
              customer?.createdAt || customer?.registeredAt,
              locale,
            )}
          />
        </div>
      </WorkspaceCard>

      <div className="space-y-4">
        <WorkspaceCard className="p-4 sm:p-5">
          <h3 className="text-[14px] font-semibold text-ink">
            {t("profile.overview.accountTitle")}
          </h3>
          <div className="mt-4 flex items-center justify-between gap-4 rounded-[15px] bg-sand-50 px-4 py-3">
            <span className="text-[12px] text-ink-muted">
              {t("profile.fields.status")}
            </span>
            <WorkspaceStatusPill tone={statusTone(status)}>
              {translateEnum(t, `status.${status}`, humanize(status))}
            </WorkspaceStatusPill>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 rounded-[15px] bg-sand-50 px-4 py-3">
            <span className="text-[12px] text-ink-muted">
              {t("profile.fields.lastActive")}
            </span>
            <span className="text-right text-[12px] font-medium text-ink-soft">
              {formatDateTime(
                customer?.lastActiveAt || customer?.lastLoginAt,
                locale,
              )}
            </span>
          </div>
        </WorkspaceCard>

        {hasActions ? (
          <WorkspaceCard className="p-4 sm:p-5">
            <h3 className="text-[14px] font-semibold text-ink">
              {t("profile.actions.title")}
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {permissions.canGrantCredits ? (
                <QuickAction icon={WalletIcon} onClick={actions.grantCredits}>
                  {t("actions.addCredits")}
                </QuickAction>
              ) : null}
              {permissions.canManageMemberships ? (
                <QuickAction icon={PlusIcon} onClick={actions.assignMembership}>
                  {t("profile.actions.assignMembership")}
                </QuickAction>
              ) : null}
            </div>
          </WorkspaceCard>
        ) : null}
      </div>
    </div>
  );
}

function BookingsPanel({ query, page, onPageChange, t, locale }) {
  const bookings = normalizeCollection(query.data, ["bookings", "items"]);
  const meta = getPageMeta(query.data, page, bookings.length);

  if (query.isLoading)
    return <LoadingState label={t("profile.bookings.loading")} />;
  if (query.isError) {
    return (
      <ErrorState
        title={t("profile.bookings.errorTitle")}
        description={getApiErrorMessage(
          query.error,
          t("profile.bookings.errorDescription"),
        )}
        retryLabel={t("profile.retry")}
        onRetry={query.refetch}
      />
    );
  }

  if (!bookings.length) {
    return (
      <WorkspaceEmptyState
        icon={CalendarDaysIcon}
        title={t("profile.bookings.emptyTitle")}
        description={t("profile.bookings.emptyDescription")}
      />
    );
  }

  return (
    <WorkspaceCard className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <p className="text-[12px] font-semibold text-ink">
          {t("profile.bookings.count", { count: meta.total })}
        </p>
        {query.isFetching ? (
          <RefreshingNotice label={t("profile.refreshing")} />
        ) : null}
      </div>
      <div className="divide-y divide-line">
        {bookings.map((booking, index) => {
          const status = getBookingStatus(booking);
          const bookingId = getEntityId(booking) || `${page}-${index}`;
          const location = getBookingLocation(booking);

          return (
            <article
              key={bookingId}
              className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 break-words text-[13px] font-semibold text-ink">
                    {getBookingName(booking)}
                  </h3>
                  <WorkspaceStatusPill tone={statusTone(status)}>
                    {translateEnum(
                      t,
                      `profile.bookings.statuses.${status}`,
                      humanize(status),
                    )}
                  </WorkspaceStatusPill>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDateTime(
                      booking?.start || booking?.startsAt || booking?.date,
                      locale,
                    )}
                  </span>
                  {location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {location}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="text-[11px] font-medium text-ink-muted sm:text-right">
                {t("profile.bookings.guests", {
                  count: Number(
                    booking?.participantCount ??
                      booking?.quantity ??
                      booking?.participants ??
                      booking?.guestCount ??
                      1,
                  ),
                })}
              </p>
            </article>
          );
        })}
      </div>
      {meta.pageCount > 1 ? (
        <WorkspacePagination
          page={meta.page}
          pageCount={meta.pageCount}
          pageLabel={t("profile.bookings.pagination")}
          previousLabel={t("profile.previous")}
          nextLabel={t("profile.next")}
          onPrevious={() => onPageChange(Math.max(1, page - 1))}
          onNext={() => onPageChange(Math.min(meta.pageCount, page + 1))}
        />
      ) : null}
    </WorkspaceCard>
  );
}

function CreditsPanel({
  balanceQuery,
  transactionsQuery,
  page,
  onPageChange,
  canGrant,
  onGrant,
  t,
  locale,
}) {
  const transactions = normalizeCollection(transactionsQuery.data, [
    "transactions",
    "items",
  ]);
  const meta = getPageMeta(transactionsQuery.data, page, transactions.length);
  const balance = Number(balanceQuery.data?.balance ?? 0);
  const currency = balanceQuery.data?.currency || "CZK";

  return (
    <div className="space-y-4">
      {balanceQuery.isError ? (
        <ErrorState
          compact
          title={t("profile.credits.balanceErrorTitle")}
          description={getApiErrorMessage(
            balanceQuery.error,
            t("profile.credits.balanceErrorDescription"),
          )}
          retryLabel={t("profile.retry")}
          onRetry={balanceQuery.refetch}
        />
      ) : (
        <WorkspaceCard className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {t("profile.credits.balance")}
            </p>
            <p className="mt-1 text-[26px] font-semibold tracking-[-0.035em] text-ink">
              {balanceQuery.isLoading
                ? "—"
                : formatCustomerCurrency(balance, currency, locale)}
            </p>
            {balanceQuery.isFetching && !balanceQuery.isLoading ? (
              <div className="mt-1">
                <RefreshingNotice label={t("profile.refreshing")} />
              </div>
            ) : null}
          </div>
          {canGrant ? (
            <QuickAction icon={WalletIcon} tone="primary" onClick={onGrant}>
              {t("actions.addCredits")}
            </QuickAction>
          ) : null}
        </WorkspaceCard>
      )}

      {transactionsQuery.isLoading ? (
        <LoadingState label={t("profile.credits.loading")} />
      ) : transactionsQuery.isError ? (
        <ErrorState
          title={t("profile.credits.errorTitle")}
          description={getApiErrorMessage(
            transactionsQuery.error,
            t("profile.credits.errorDescription"),
          )}
          retryLabel={t("profile.retry")}
          onRetry={transactionsQuery.refetch}
        />
      ) : !transactions.length ? (
        <WorkspaceEmptyState
          icon={WalletIcon}
          title={t("profile.credits.emptyTitle")}
          description={t("profile.credits.emptyDescription")}
        />
      ) : (
        <WorkspaceCard className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
            <p className="text-[12px] font-semibold text-ink">
              {t("profile.credits.transactions")}
            </p>
            {transactionsQuery.isFetching ? (
              <RefreshingNotice label={t("profile.refreshing")} />
            ) : null}
          </div>
          <div className="divide-y divide-line">
            {transactions.map((transaction, index) => {
              const amount = Number(transaction?.amount || 0);
              const transactionCurrency = transaction?.currency || currency;
              const transactionId =
                getEntityId(transaction) || `${page}-${index}`;

              return (
                <article
                  key={transactionId}
                  className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-[12px] font-semibold text-ink">
                      {transaction?.description ||
                        transaction?.reason ||
                        translateEnum(
                          t,
                          `profile.credits.types.${transaction?.type}`,
                          humanize(transaction?.type),
                        )}
                    </h3>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {formatDateTime(transaction?.createdAt, locale)}
                      {transaction?.adminName
                        ? ` · ${transaction.adminName}`
                        : ""}
                    </p>
                  </div>
                  <p
                    className={cx(
                      "shrink-0 text-[13px] font-semibold tabular-nums",
                      amount < 0 ? "text-danger" : "text-success",
                    )}
                  >
                    {amount > 0 ? "+" : ""}
                    {formatCustomerCurrency(
                      amount,
                      transactionCurrency,
                      locale,
                    )}
                  </p>
                </article>
              );
            })}
          </div>
          {meta.pageCount > 1 ? (
            <WorkspacePagination
              page={meta.page}
              pageCount={meta.pageCount}
              pageLabel={t("profile.credits.pagination")}
              previousLabel={t("profile.previous")}
              nextLabel={t("profile.next")}
              onPrevious={() => onPageChange(Math.max(1, page - 1))}
              onNext={() => onPageChange(Math.min(meta.pageCount, page + 1))}
            />
          ) : null}
        </WorkspaceCard>
      )}
    </div>
  );
}

function MembershipsPanel({
  query,
  page,
  onPageChange,
  canManage,
  onAssign,
  onCancel,
  t,
  locale,
}) {
  const memberships = normalizeCollection(query.data, ["memberships", "items"]);
  const meta = getPageMeta(query.data, page, memberships.length);

  if (query.isLoading) {
    return <LoadingState label={t("profile.memberships.loading")} />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={t("profile.memberships.errorTitle")}
        description={getApiErrorMessage(
          query.error,
          t("profile.memberships.errorDescription"),
        )}
        retryLabel={t("profile.retry")}
        onRetry={query.refetch}
      />
    );
  }

  if (!memberships.length) {
    return (
      <WorkspaceEmptyState
        icon={IdentificationIcon}
        title={t("profile.memberships.emptyTitle")}
        description={t("profile.memberships.emptyDescription")}
        action={
          canManage ? (
            <QuickAction icon={PlusIcon} tone="primary" onClick={onAssign}>
              {t("profile.actions.assignMembership")}
            </QuickAction>
          ) : null
        }
      />
    );
  }

  return (
    <WorkspaceCard className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-[12px] font-semibold text-ink">
            {t("profile.memberships.count", { count: meta.total })}
          </p>
          {query.isFetching ? (
            <div className="mt-1">
              <RefreshingNotice label={t("profile.refreshing")} />
            </div>
          ) : null}
        </div>
        {canManage ? (
          <QuickAction icon={PlusIcon} tone="primary" onClick={onAssign}>
            {t("profile.actions.assignMembership")}
          </QuickAction>
        ) : null}
      </div>
      <div className="divide-y divide-line">
        {memberships.map((membership, index) => {
          const membershipId = getEntityId(membership) || `${page}-${index}`;
          const status = getMembershipStatus(membership);
          const location = getMembershipLocation(membership);

          return (
            <article key={membershipId} className="px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-[13px] font-semibold text-ink">
                      {getMembershipName(membership)}
                    </h3>
                    <WorkspaceStatusPill tone={statusTone(status)}>
                      {translateEnum(
                        t,
                        `profile.memberships.statuses.${status}`,
                        humanize(status),
                      )}
                    </WorkspaceStatusPill>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                    <span>
                      {t("profile.memberships.periodEnd")}:{" "}
                      {formatDate(
                        membership?.currentPeriodEnd || membership?.renewsAt,
                        locale,
                      )}
                    </span>
                    {location ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinIcon
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        {location}
                      </span>
                    ) : null}
                  </div>
                </div>
                {canManage && isMembershipCancellable(membership) ? (
                  <button
                    type="button"
                    onClick={() => onCancel(membership)}
                    className="min-h-11 shrink-0 rounded-full border border-danger/25 bg-white px-4 text-[12px] font-semibold text-danger transition hover:border-danger/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
                  >
                    {t("profile.actions.cancelMembership")}
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {meta.pageCount > 1 ? (
        <WorkspacePagination
          page={meta.page}
          pageCount={meta.pageCount}
          pageLabel={t("profile.memberships.pagination")}
          previousLabel={t("profile.previous")}
          nextLabel={t("profile.next")}
          onPrevious={() => onPageChange(Math.max(1, page - 1))}
          onNext={() => onPageChange(Math.min(meta.pageCount, page + 1))}
        />
      ) : null}
    </WorkspaceCard>
  );
}

function CustomerProfileDialogContent({
  open,
  customer,
  scope,
  permissions = {},
  onClose,
  onGrantCredits,
  onAssignMembership,
  onCancelMembership,
  t = (key) => key,
}) {
  const locale = useLocale();
  const customerId = getEntityId(customer);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookingPage, setBookingPage] = useState(1);
  const [creditPage, setCreditPage] = useState(1);
  const [membershipPage, setMembershipPage] = useState(1);

  const permissionState = useMemo(
    () => ({
      canViewOverview: permissions.canViewOverview !== false,
      canViewBookings: Boolean(permissions.canViewBookings),
      canViewCredits: Boolean(permissions.canViewCredits),
      canViewMemberships: Boolean(permissions.canViewMemberships),
      canGrantCredits: Boolean(permissions.canGrantCredits),
      canManageMemberships: Boolean(
        permissions.canManageMemberships ||
        permissions.canAssignMembership ||
        permissions.canCancelMembership,
      ),
    }),
    [permissions],
  );

  const tabs = useMemo(
    () =>
      [
        permissionState.canViewOverview
          ? {
              id: "overview",
              label: t("profile.tabs.overview"),
              icon: UserCircleIcon,
            }
          : null,
        permissionState.canViewBookings
          ? {
              id: "bookings",
              label: t("profile.tabs.bookings"),
              icon: CalendarDaysIcon,
            }
          : null,
        permissionState.canViewCredits
          ? {
              id: "credits",
              label: t("profile.tabs.credits"),
              icon: WalletIcon,
            }
          : null,
        permissionState.canViewMemberships
          ? {
              id: "memberships",
              label: t("profile.tabs.memberships"),
              icon: IdentificationIcon,
            }
          : null,
      ].filter(Boolean),
    [permissionState, t],
  );
  const resolvedActiveTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id || "overview";

  const customerQuery = useGetCustomerQuery(customerId, {
    skip: !open || !customerId,
  });
  const freshCustomer = getCustomerRecord(customerQuery.data);
  const profileCustomer = useMemo(
    () => ({ ...(customer || {}), ...(freshCustomer || {}) }),
    [customer, freshCustomer],
  );

  const bookingQuery = useGetCustomerBookingHistoryQuery(
    {
      customerId,
      scope,
      page: bookingPage,
      limit: PAGE_SIZE,
    },
    {
      skip:
        !open ||
        !customerId ||
        resolvedActiveTab !== "bookings" ||
        !permissionState.canViewBookings,
    },
  );
  const balanceQuery = useGetCreditBalanceQuery(customerId, {
    skip:
      !open ||
      !customerId ||
      resolvedActiveTab !== "credits" ||
      !permissionState.canViewCredits,
  });
  const transactionsQuery = useGetCreditTransactionsQuery(
    { userId: customerId, page: creditPage, limit: PAGE_SIZE },
    {
      skip:
        !open ||
        !customerId ||
        resolvedActiveTab !== "credits" ||
        !permissionState.canViewCredits,
    },
  );
  const membershipsQuery = useGetUserMembershipsQuery(
    { userId: customerId, page: membershipPage, limit: PAGE_SIZE },
    {
      skip:
        !open ||
        !customerId ||
        resolvedActiveTab !== "memberships" ||
        !permissionState.canViewMemberships,
    },
  );

  const actions = {
    grantCredits: () => onGrantCredits?.(profileCustomer),
    assignMembership: () => onAssignMembership?.(profileCustomer),
    cancelMembership: (membership) => onCancelMembership?.(membership),
  };

  const customerStatus = getCustomerStatus(profileCustomer);
  const hasUsableCustomer = Boolean(
    customerId ||
    profileCustomer?.email ||
    profileCustomer?.memberNumber ||
    profileCustomer?.customId,
  );

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[105]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport>
        <WorkspaceDialogPanel size="xlarge">
          <header className="shrink-0 border-b border-line bg-white">
            <div className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-7 sm:py-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-cobalt-50 text-[12px] font-bold text-cobalt-700 sm:h-12 sm:w-12">
                {getInitials(profileCustomer)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="min-w-0 break-words text-[19px] font-semibold tracking-[-0.03em] text-ink sm:text-[22px]">
                    {getCustomerName(profileCustomer)}
                  </DialogTitle>
                  <WorkspaceStatusPill tone={statusTone(customerStatus)}>
                    {translateEnum(
                      t,
                      `status.${customerStatus}`,
                      humanize(customerStatus),
                    )}
                  </WorkspaceStatusPill>
                </div>
                <p className="mt-1 break-words text-[12px] leading-5 text-ink-muted">
                  {profileCustomer?.email ||
                    formatMakerId(profileCustomer?.memberNumber, "") ||
                    t("profile.subtitle")}
                </p>
                {customerQuery.isFetching && hasUsableCustomer ? (
                  <div className="mt-1">
                    <RefreshingNotice label={t("profile.refreshing")} />
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("profile.close")}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-muted transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {tabs.length ? (
              <WorkspaceTabs
                id={PROFILE_TABS_ID}
                tabs={tabs}
                value={resolvedActiveTab}
                onChange={setActiveTab}
                ariaLabel={t("profile.tabs.label")}
                stretch
              />
            ) : null}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-7 sm:py-6">
            {customerQuery.isError && hasUsableCustomer ? (
              <div className="mb-4">
                <ErrorState
                  compact
                  title={t("profile.detailErrorTitle")}
                  description={getApiErrorMessage(
                    customerQuery.error,
                    t("profile.detailErrorDescription"),
                  )}
                  retryLabel={t("profile.retry")}
                  onRetry={customerQuery.refetch}
                />
              </div>
            ) : null}

            {!hasUsableCustomer && customerQuery.isLoading ? (
              <LoadingState label={t("profile.loading")} />
            ) : !hasUsableCustomer ? (
              <WorkspaceEmptyState
                icon={UserCircleIcon}
                title={t("profile.emptyTitle")}
                description={t("profile.emptyDescription")}
              />
            ) : (
              <>
                <WorkspaceTabPanel
                  tabsId={PROFILE_TABS_ID}
                  tabId="overview"
                  active={resolvedActiveTab === "overview"}
                  unmount
                >
                  <OverviewPanel
                    customer={profileCustomer}
                    permissions={permissionState}
                    actions={actions}
                    t={t}
                    locale={locale}
                  />
                </WorkspaceTabPanel>
                <WorkspaceTabPanel
                  tabsId={PROFILE_TABS_ID}
                  tabId="bookings"
                  active={resolvedActiveTab === "bookings"}
                  unmount
                >
                  <BookingsPanel
                    query={bookingQuery}
                    page={bookingPage}
                    onPageChange={setBookingPage}
                    t={t}
                    locale={locale}
                  />
                </WorkspaceTabPanel>
                <WorkspaceTabPanel
                  tabsId={PROFILE_TABS_ID}
                  tabId="credits"
                  active={resolvedActiveTab === "credits"}
                  unmount
                >
                  <CreditsPanel
                    balanceQuery={balanceQuery}
                    transactionsQuery={transactionsQuery}
                    page={creditPage}
                    onPageChange={setCreditPage}
                    canGrant={permissionState.canGrantCredits}
                    onGrant={actions.grantCredits}
                    t={t}
                    locale={locale}
                  />
                </WorkspaceTabPanel>
                <WorkspaceTabPanel
                  tabsId={PROFILE_TABS_ID}
                  tabId="memberships"
                  active={resolvedActiveTab === "memberships"}
                  unmount
                >
                  <MembershipsPanel
                    query={membershipsQuery}
                    page={membershipPage}
                    onPageChange={setMembershipPage}
                    canManage={permissionState.canManageMemberships}
                    onAssign={actions.assignMembership}
                    onCancel={actions.cancelMembership}
                    t={t}
                    locale={locale}
                  />
                </WorkspaceTabPanel>
              </>
            )}
          </div>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

export default function CustomerProfileDialog(props) {
  const dialogStateKey = `${props.open ? "open" : "closed"}:${
    getEntityId(props.customer) || "empty"
  }`;

  return <CustomerProfileDialogContent key={dialogStateKey} {...props} />;
}
