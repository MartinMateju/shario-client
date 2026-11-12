"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  CalendarDaysIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import {
  WorkspaceEmptyState,
  WorkspaceTable,
  WorkspaceTableHeadCell,
  WorkspaceTableScroller,
  WorkspaceTruncatedText,
} from "@/components/dashboard/WorkspaceDataSurface";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

import {
  cx,
  formatBookingDateTime,
  formatMoney,
  getActivityTone,
  getBookingAmount,
  getBookingGuestCount,
  getBookingStatusConfig,
  getCustomerInitials,
  getCustomerName,
  getLocationLabel,
  getPaymentStatusConfig,
  resolveBookingCustomer,
  resolveBookingProduct,
} from "./booking-table.utils";

function StatusPill({ config, t }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center whitespace-nowrap rounded-[7px] px-2 py-1",
        "text-[10px] font-medium leading-none",
        config.className,
      )}
    >
      {config.labelKey ? t(config.labelKey) : config.label}
    </span>
  );
}

function CustomerAvatar({ customer }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEE7DD] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#5F5145]">
      {getCustomerInitials(customer)}
    </span>
  );
}

function BookingRowActions({ booking, canDelete, t, onEdit, onDelete }) {
  return (
    <Menu as="div" className="relative flex justify-end">
      <MenuButton
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#777771] transition hover:bg-[#F0EFEC] hover:text-[#11110F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
        aria-label={t("actions.open")}
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        portal
        className="z-[140] mt-1.5 w-44 origin-top-right rounded-[14px] border border-[#E7E4DE] bg-white p-1.5 shadow-[0_18px_50px_rgba(17,17,15,0.15)] outline-none transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        <MenuItem>
          <button
            type="button"
            onClick={() => onEdit(booking)}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft transition data-[focus]:bg-sand-50"
          >
            <PencilSquareIcon
              className="h-4 w-4 stroke-[1.7]"
              aria-hidden="true"
            />
            {t("actions.edit")}
          </button>
        </MenuItem>

        {canDelete && (
          <MenuItem>
            <button
              type="button"
              onClick={() => onDelete(booking._id || booking.id)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-terracotta-600 transition data-[focus]:bg-coral-50"
            >
              <TrashIcon className="h-4 w-4 stroke-[1.7]" aria-hidden="true" />
              {t("actions.delete")}
            </button>
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
}

function EmptyState({ t }) {
  return (
    <WorkspaceEmptyState
      contained
      icon={CalendarDaysIcon}
      title={t("empty.title")}
      description={t("empty.description")}
      className="min-h-[250px]"
    />
  );
}

function MobileBookingCard({
  booking,
  product,
  customer,
  selected,
  locale,
  canDelete,
  t,
  onSelect,
  onEdit,
  onDelete,
}) {
  const paymentConfig = getPaymentStatusConfig(booking.paymentStatus);
  const statusConfig = getBookingStatusConfig(booking.status);
  const amount = getBookingAmount(booking, product);

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
          onChange={() => onSelect(booking._id || booking.id)}
          aria-label={t("selection.row", { name: getCustomerName(customer) })}
          className="mt-2 h-4 w-4 rounded border-[#CFCBC2] text-primary-text focus:ring-brand-primary/25"
        />
        <CustomerAvatar customer={customer} />
        <div className="min-w-0 flex-1">
          <WorkspaceTruncatedText
            as="p"
            className="text-[13px] font-semibold text-ink"
          >
            {getCustomerName(customer)}
          </WorkspaceTruncatedText>
          <WorkspaceTruncatedText
            as="p"
            className="mt-0.5 text-[12px] text-ink-muted"
          >
            {customer?.email || customer?.customId || "—"}
          </WorkspaceTruncatedText>
        </div>
        <BookingRowActions
          booking={booking}
          canDelete={canDelete}
          t={t}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <div className="mt-4 rounded-[14px] bg-[#F8F6F2] p-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cx(
              "h-7 w-1 shrink-0 rounded-full",
              getActivityTone(booking, product),
            )}
          />
          <div className="min-w-0">
            <WorkspaceTruncatedText
              as="p"
              className="text-[12px] font-medium text-ink"
            >
              {product?.name || "—"}
            </WorkspaceTruncatedText>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {formatBookingDateTime(booking, locale, t)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {getLocationLabel(booking.location, t)}
          </span>
          <span>·</span>
          <span>{t("guests", { count: getBookingGuestCount(booking) })}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill config={paymentConfig} t={t} />
        <StatusPill config={statusConfig} t={t} />
        <span className="ml-auto text-[12px] font-semibold text-[#292925]">
          {formatMoney(
            amount,
            locale,
            booking.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
          )}
        </span>
      </div>
    </article>
  );
}

export default function BookingsDataTable({
  bookings,
  products,
  users,
  selectedIds,
  sortOrder,
  locale,
  canDelete,
  t,
  onToggleSort,
  onToggleRow,
  onToggleAll,
  onEdit,
  onDelete,
}) {
  const allSelected =
    bookings.length > 0 &&
    bookings.every((booking) =>
      selectedIds.has(String(booking._id || booking.id)),
    );

  if (bookings.length === 0) return <EmptyState t={t} />;

  return (
    <>
      <div className="space-y-3 p-4 sm:hidden">
        {bookings.map((booking) => {
          const id = booking._id || booking.id;
          const product = resolveBookingProduct(booking, products);
          const customer = resolveBookingCustomer(booking, users);

          return (
            <MobileBookingCard
              key={id}
              booking={booking}
              product={product}
              customer={customer}
              selected={selectedIds.has(String(id))}
              locale={locale}
              canDelete={canDelete}
              t={t}
              onSelect={onToggleRow}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        })}
      </div>

      <WorkspaceTableScroller
        ariaLabel={t("table.label")}
        className="hidden sm:block"
      >
        <WorkspaceTable className="min-w-[1180px]">
          <thead>
            <tr className="bg-surface-muted/90">
              <th className="w-12 border-b border-[#E7E4DE] px-5 py-3.5 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label={t("selection.all")}
                  className="h-4 w-4 rounded border-[#CFCBC2] text-primary-text focus:ring-brand-primary/25"
                />
              </th>
              <WorkspaceTableHeadCell className="w-[190px] px-3">
                {t("columns.customer")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[170px] px-3">
                {t("columns.booking")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[175px] px-3">
                <button
                  type="button"
                  onClick={onToggleSort}
                  className="inline-flex items-center gap-1.5 transition hover:text-primary-text"
                >
                  {t("columns.dateTime")}
                  {sortOrder === "asc" ? (
                    <ChevronUpIcon className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon className="h-3 w-3" aria-hidden="true" />
                  )}
                </button>
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[145px] px-3">
                {t("columns.location")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[80px] px-3">
                {t("columns.guests")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[105px] px-3">
                {t("columns.payment")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[120px] px-3">
                {t("columns.status")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-[100px] px-3 text-right">
                {t("columns.amount")}
              </WorkspaceTableHeadCell>
              <WorkspaceTableHeadCell className="w-14">
                <span className="sr-only">{t("columns.actions")}</span>
              </WorkspaceTableHeadCell>
            </tr>
          </thead>

          <tbody>
            {bookings.map((booking) => {
              const id = booking._id || booking.id;
              const product = resolveBookingProduct(booking, products);
              const customer = resolveBookingCustomer(booking, users);
              const selected = selectedIds.has(String(id));
              const paymentConfig = getPaymentStatusConfig(
                booking.paymentStatus,
              );
              const statusConfig = getBookingStatusConfig(booking.status);
              const amount = getBookingAmount(booking, product);

              return (
                <tr
                  key={id}
                  className={cx(
                    "group transition-colors",
                    selected
                      ? "bg-skab-cobalt-50"
                      : "bg-white hover:bg-surface-muted",
                  )}
                >
                  <td
                    className={cx(
                      "border-b border-[#ECE9E3] px-5 py-3",
                      selected &&
                        "border-l-[3px] border-l-brand-primary pl-[17px]",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRow(id)}
                      aria-label={t("selection.row", {
                        name: getCustomerName(customer),
                      })}
                      className="h-4 w-4 rounded border-[#CFCBC2] text-primary-text focus:ring-brand-primary/25"
                    />
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CustomerAvatar customer={customer} />
                      <div className="min-w-0">
                        <WorkspaceTruncatedText
                          as="p"
                          className="text-[12px] font-medium text-ink"
                        >
                          {getCustomerName(customer)}
                        </WorkspaceTruncatedText>
                        <WorkspaceTruncatedText
                          as="p"
                          className="mt-0.5 max-w-[130px] text-[12px] text-ink-muted"
                        >
                          {customer?.email || customer?.customId || "—"}
                        </WorkspaceTruncatedText>
                      </div>
                    </div>
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cx(
                          "h-7 w-1 shrink-0 rounded-full",
                          getActivityTone(booking, product),
                        )}
                      />
                      <div className="min-w-0">
                        <WorkspaceTruncatedText
                          as="p"
                          className="text-[12px] font-medium text-ink"
                        >
                          {product?.name || "—"}
                        </WorkspaceTruncatedText>
                        <WorkspaceTruncatedText
                          as="p"
                          className="mt-0.5 max-w-[130px] text-[12px] text-ink-muted"
                        >
                          {booking.customId || booking._id || booking.id}
                        </WorkspaceTruncatedText>
                      </div>
                    </div>
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3 text-[12px] font-medium text-ink-soft">
                    {formatBookingDateTime(booking, locale, t)}
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3">
                    <span className="inline-flex max-w-[130px] items-center gap-1.5 text-[12px] text-ink-soft">
                      <MapPinIcon
                        className="h-3.5 w-3.5 shrink-0 stroke-[1.7]"
                        aria-hidden="true"
                      />
                      <WorkspaceTruncatedText>
                        {getLocationLabel(booking.location, t)}
                      </WorkspaceTruncatedText>
                    </span>
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3 text-[12px] text-ink-soft">
                    {t("guests", { count: getBookingGuestCount(booking) })}
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3">
                    <StatusPill config={paymentConfig} t={t} />
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3">
                    <StatusPill config={statusConfig} t={t} />
                  </td>

                  <td className="border-b border-[#ECE9E3] px-3 py-3 text-right text-[12px] font-semibold text-ink">
                    {formatMoney(
                      amount,
                      locale,
                      booking.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                    )}
                  </td>

                  <td className="border-b border-[#ECE9E3] px-4 py-3">
                    <BookingRowActions
                      booking={booking}
                      canDelete={canDelete}
                      t={t}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </WorkspaceTable>
      </WorkspaceTableScroller>
    </>
  );
}
