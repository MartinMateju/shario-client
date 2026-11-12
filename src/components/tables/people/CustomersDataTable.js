"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  EyeIcon,
  PlusCircleIcon,
  WalletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import {
  WorkspaceEmptyState,
  WorkspaceTable,
  WorkspaceTableHeadCell,
  WorkspaceTableScroller,
  WorkspaceTruncatedText,
} from "@/components/dashboard/WorkspaceDataSurface";
import { Link } from "@/i18n/navigation";
import { formatMakerId } from "@/utils/memberIdentity";

import PersonAvatar from "./PersonAvatar";
import {
  cx,
  formatCustomerTotalSpent,
  formatMoney,
  formatRelativeDate,
  getCustomerCredits,
  getCustomerLastBooking,
  getCustomerMembership,
  getCustomerStatus,
  getFullName,
  getId,
  getMembershipTone,
  getStatusTone,
} from "./people-table.utils";

function CustomerRowActions({
  customer,
  t,
  getCustomerHref,
  onOpenCustomer,
  onAddCredits,
}) {
  const profileHref = getCustomerHref?.(customer);
  const hasActions = Boolean(profileHref || onOpenCustomer || onAddCredits);

  if (!hasActions) return null;

  return (
    <Menu as="div" className="relative flex justify-end">
      <MenuButton
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#777771] transition hover:bg-[#F0EFEC] hover:text-[#11110F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 sm:h-8 sm:w-8"
        aria-label={t("actions.openCustomerActions", {
          name: getFullName(customer),
        })}
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        portal
        className="z-[140] mt-1.5 w-48 origin-top-right rounded-[14px] border border-[#E7E4DE] bg-white p-1.5 shadow-[0_18px_50px_rgba(17,17,15,0.15)] outline-none transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {(onOpenCustomer || profileHref) && (
          <MenuItem>
            {profileHref && !onOpenCustomer ? (
              <Link
                href={profileHref}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft transition data-[focus]:bg-sand-50"
              >
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                {t("actions.viewProfile")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onOpenCustomer?.(customer)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft transition data-[focus]:bg-sand-50"
              >
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                {t("actions.viewProfile")}
              </button>
            )}
          </MenuItem>
        )}

        {onAddCredits && (
          <MenuItem>
            <button
              type="button"
              onClick={() => onAddCredits(customer)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft transition data-[focus]:bg-sand-50"
            >
              <WalletIcon className="h-4 w-4" aria-hidden="true" />
              {t("actions.addCredits")}
            </button>
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
}

function StatusPill({ status, t }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center rounded-[7px] px-2 py-1 text-[10px] font-medium leading-none",
        getStatusTone(status),
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

function EmptyState({ t }) {
  return (
    <WorkspaceEmptyState
      contained
      icon={PlusCircleIcon}
      title={t("empty.customersTitle")}
      description={t("empty.customersDescription")}
    />
  );
}

function MobileCustomerCard({
  customer,
  selected,
  locale,
  t,
  onToggleRow,
  getCustomerHref,
  onOpenCustomer,
  onAddCredits,
}) {
  const membership = getCustomerMembership(customer);
  const status = getCustomerStatus(customer);

  return (
    <article
      className={cx(
        "rounded-[18px] border p-4 transition",
        selected
          ? "border-brand-primary/35 bg-skab-blue-50"
          : "border-[#E7E4DE] bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleRow(getId(customer))}
          aria-label={t("selection.row", { name: getFullName(customer) })}
          className="mt-2 h-4 w-4 rounded border-[#CFCBC2] text-primary-text focus:ring-brand-primary/25"
        />
        <PersonAvatar person={customer} />
        <div className="min-w-0 flex-1">
          <WorkspaceTruncatedText
            as="p"
            className="text-[13px] font-semibold text-ink"
          >
            {getFullName(customer)}
          </WorkspaceTruncatedText>
          <WorkspaceTruncatedText
            as="p"
            className="mt-0.5 text-[12px] text-ink-muted"
          >
            {customer?.email || "—"}
          </WorkspaceTruncatedText>
          <p className="mt-0.5 text-[11px] font-medium tabular-nums text-ink-soft">
            {t("columns.memberId")}: {formatMakerId(customer?.memberNumber)}
          </p>
        </div>
        <CustomerRowActions
          customer={customer}
          t={t}
          getCustomerHref={getCustomerHref}
          onOpenCustomer={onOpenCustomer}
          onAddCredits={onAddCredits}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-[14px] bg-[#F8F6F2] p-3.5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.membership")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {membership.label || t("membership.none")}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.credits")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {formatMoney(getCustomerCredits(customer), locale)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.lastBooking")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {formatRelativeDate(getCustomerLastBooking(customer), locale, t, {
              never: false,
            })}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.totalSpent")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {formatCustomerTotalSpent(customer, locale)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-[12px] text-ink-muted">
          {customer?.phone || customer?.phoneNumber || "—"}
        </p>
        <StatusPill status={status} t={t} />
      </div>
      {onAddCredits ? (
        <button
          type="button"
          onClick={() => onAddCredits(customer)}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-4 text-[13px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30"
        >
          <WalletIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.addCredits")}
        </button>
      ) : null}
    </article>
  );
}

function SelectionBar({
  selectedCount,
  t,
  canAddCredits,
  onAddCreditsSelected,
  onExportSelected,
  onClearSelection,
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-skab-cobalt-100 bg-skab-blue-50 px-4 py-2.5 sm:px-5">
      <span className="mr-2 text-[12px] font-semibold text-ink">
        {t("selection.selected", { count: selectedCount })}
      </span>

      {canAddCredits && (
        <button
          type="button"
          onClick={onAddCreditsSelected}
          className="inline-flex h-8 items-center gap-2 rounded-[9px] px-3 text-[12px] font-medium text-ink-soft transition hover:bg-white"
        >
          <WalletIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.addCredits")}
        </button>
      )}

      <button
        type="button"
        onClick={onExportSelected}
        className="inline-flex h-8 items-center rounded-[9px] px-3 text-[12px] font-medium text-ink-soft transition hover:bg-white"
      >
        {t("selection.exportSelected")}
      </button>

      <button
        type="button"
        onClick={onClearSelection}
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[#6F6E68] transition hover:bg-white hover:text-[#292925]"
        aria-label={t("selection.clear")}
      >
        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function CustomersDataTable({
  customers,
  selectedIds,
  locale,
  t,
  getCustomerHref,
  onToggleRow,
  onToggleAll,
  onClearSelection,
  onOpenCustomer,
  onAddCredits,
  onAddCreditsSelected,
  onExportSelected,
}) {
  const allSelected =
    customers.length > 0 &&
    customers.every((customer) => selectedIds.has(String(getId(customer))));

  if (customers.length === 0) return <EmptyState t={t} />;

  return (
    <>
      <div className="space-y-3 p-4 sm:hidden">
        {customers.map((customer) => {
          const id = String(getId(customer));
          return (
            <MobileCustomerCard
              key={id}
              customer={customer}
              selected={selectedIds.has(id)}
              locale={locale}
              t={t}
              onToggleRow={onToggleRow}
              getCustomerHref={getCustomerHref}
              onOpenCustomer={onOpenCustomer}
              onAddCredits={onAddCredits}
            />
          );
        })}
      </div>

      <WorkspaceTableScroller
        ariaLabel={t("table.label")}
        className="hidden sm:block"
      >
        <WorkspaceTable className="min-w-[1120px]">
          <thead>
            <tr className="bg-surface-muted/90">
              <WorkspaceTableHeadCell className="w-12 px-5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label={t("selection.all")}
                  className="h-4 w-4 rounded border-[#CFCBC2] text-primary-text focus:ring-brand-primary/25"
                />
              </WorkspaceTableHeadCell>
              {[
                "customer",
                "contact",
                "membership",
                "credits",
                "lastBooking",
                "totalSpent",
                "status",
              ].map((column) => (
                <WorkspaceTableHeadCell key={column}>
                  {t(`columns.${column}`)}
                </WorkspaceTableHeadCell>
              ))}
              <WorkspaceTableHeadCell className="w-24 text-right">
                {t("columns.actions")}
              </WorkspaceTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const id = String(getId(customer));
              const selected = selectedIds.has(id);
              const membership = getCustomerMembership(customer);
              const status = getCustomerStatus(customer);

              return (
                <tr
                  key={id}
                  className={cx(
                    "group transition-colors",
                    selected
                      ? "bg-skab-blue-50"
                      : "bg-white hover:bg-surface-muted",
                  )}
                >
                  <td className="border-b border-[#EDEAE4] px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRow(id)}
                      aria-label={t("selection.row", {
                        name: getFullName(customer),
                      })}
                      className="h-4 w-4 rounded border-[#CFCBC2] text-primary-text focus:ring-brand-primary/25"
                    />
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PersonAvatar person={customer} />
                      <div className="min-w-0">
                        <WorkspaceTruncatedText
                          as="p"
                          className="max-w-[170px] text-[12px] font-semibold text-ink"
                        >
                          {getFullName(customer)}
                        </WorkspaceTruncatedText>
                        <WorkspaceTruncatedText
                          as="p"
                          className="mt-0.5 max-w-[170px] text-[12px] text-ink-muted"
                        >
                          {customer?.email || "—"}
                        </WorkspaceTruncatedText>
                        <p className="mt-0.5 max-w-[170px] truncate text-[11px] font-medium tabular-nums text-ink-soft">
                          {t("columns.memberId")}:{" "}
                          {formatMakerId(customer?.memberNumber)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3 text-[12px] text-ink-soft">
                    {customer?.phone || customer?.phoneNumber || "—"}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3">
                    <span
                      className={cx(
                        "inline-flex min-h-6 items-center rounded-[7px] px-2 py-1 text-[10px] font-medium",
                        getMembershipTone(membership.key),
                      )}
                    >
                      {membership.label || t("membership.none")}
                    </span>
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3 text-[12px] font-medium text-ink-soft">
                    {formatMoney(getCustomerCredits(customer), locale)}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3 text-[12px] text-ink-soft">
                    {formatRelativeDate(
                      getCustomerLastBooking(customer),
                      locale,
                      t,
                      { never: false },
                    )}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3 text-[12px] font-medium text-ink-soft">
                    {formatCustomerTotalSpent(customer, locale)}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3">
                    <StatusPill status={status} t={t} />
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3">
                    <CustomerRowActions
                      customer={customer}
                      t={t}
                      getCustomerHref={getCustomerHref}
                      onOpenCustomer={onOpenCustomer}
                      onAddCredits={onAddCredits}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </WorkspaceTable>
      </WorkspaceTableScroller>

      <SelectionBar
        selectedCount={selectedIds.size}
        t={t}
        canAddCredits={Boolean(onAddCreditsSelected)}
        onAddCreditsSelected={onAddCreditsSelected}
        onExportSelected={onExportSelected}
        onClearSelection={onClearSelection}
      />
    </>
  );
}
