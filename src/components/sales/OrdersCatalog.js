"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  ClipboardDocumentIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  ReceiptPercentIcon,
} from "@heroicons/react/24/outline";

import {
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceTable,
  WorkspaceTableFrame,
  WorkspaceTableHeadCell,
  WorkspaceTableScroller,
  WorkspaceTruncatedText,
} from "@/components/dashboard/WorkspaceDataSurface";

import {
  cx,
  formatMoney,
  formatOrderTimestamp,
  getCartItems,
  getCustomerEmail,
  getCustomerInitials,
  getCustomerName,
  getOrderCurrency,
  getOrderId,
  getOrderNumber,
  getOrderStatusKey,
  getOrderTotal,
  getPaymentMethodKey,
  getPaymentReference,
  getPaymentStatusKey,
  getProductName,
} from "./sales.utils";

const STATUS_CLASSES = {
  awaitingPayment: "bg-[#FBF0DF] text-[#A56500]",
  processing: "bg-cobalt-50 text-cobalt-600",
  completed: "bg-[#E8F3E3] text-[#315D2D]",
  failed: "bg-coral-50 text-terracotta-700",
  cancelled: "bg-[#EEEDE9] text-[#696965]",
};

const PAYMENT_DOT_CLASSES = {
  paid: "bg-[#287432]",
  unpaid: "bg-[#C47A00]",
  failed: "bg-[#D7472F]",
};

function CustomerAvatar({ order }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-[10px] font-semibold text-sand-800 ring-2 ring-white">
      {getCustomerInitials(order)}
    </span>
  );
}

function StatusPill({ order, t }) {
  const status = getOrderStatusKey(order);

  return (
    <span
      className={cx(
        "inline-flex rounded-[9px] px-2.5 py-1.5 text-[10px] font-medium",
        STATUS_CLASSES[status] || STATUS_CLASSES.cancelled,
      )}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

function PaymentSummary({ order, t }) {
  const paymentStatus = getPaymentStatusKey(order);
  const method = getPaymentMethodKey(order);
  const reference = getPaymentReference(order);

  return (
    <div className="min-w-[120px]">
      <p
        className={cx(
          "flex items-center gap-1.5 text-[12px] font-medium",
          paymentStatus === "failed"
            ? "text-terracotta-600"
            : paymentStatus === "unpaid"
              ? "text-[#A56500]"
              : "text-[#315D2D]",
        )}
      >
        <span
          className={cx(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            PAYMENT_DOT_CLASSES[paymentStatus],
          )}
        />
        {t(`payments.${paymentStatus}`)}
      </p>
      <p className="mt-1 truncate text-[12px] text-ink-muted">
        {t(`paymentMethods.${method}`)}
        {reference ? ` •••• ${reference}` : ""}
      </p>
    </div>
  );
}

function ProductSummary({ order, locale, t }) {
  const items = getCartItems(order);
  const firstItem = items[0];
  const firstQuantity = Number(firstItem?.quantity || 1);
  const productLabel = firstItem
    ? `${getProductName(firstItem, locale)}${
        firstQuantity > 1 ? ` × ${firstQuantity}` : ""
      }`
    : "";

  if (!items.length) return <span className="text-[#969691]">—</span>;

  return (
    <div className="min-w-[170px] max-w-[250px]">
      <WorkspaceTruncatedText
        as="p"
        className="text-[12px] font-medium text-ink-soft"
      >
        {productLabel}
      </WorkspaceTruncatedText>
      {items.length > 1 && (
        <p className="mt-1 truncate text-[12px] text-ink-muted">
          {t("table.moreItems", { count: items.length - 1 })}
        </p>
      )}
    </div>
  );
}

function OrderActions({ order, onView, onCopy, t }) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white text-[#555553] transition hover:border-line-strong hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
        aria-label={t("actions.open", { order: getOrderNumber(order) })}
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="z-[80] w-44 origin-top-right rounded-[13px] border border-line bg-white p-1.5 shadow-[0_16px_45px_rgba(17,17,15,0.14)] transition duration-100 ease-out [--anchor-gap:6px] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        <MenuItem>
          <button
            type="button"
            onClick={() => onView(order)}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[12px] text-ink-soft transition data-focus:bg-sand-50"
          >
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            {t("actions.view")}
          </button>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            onClick={() => onCopy(order)}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[12px] text-ink-soft transition data-focus:bg-sand-50"
          >
            <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
            {t("actions.copyId")}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

function OrderCard({ order, locale, selected, onSelect, onView, onCopy, t }) {
  const orderId = getOrderId(order);

  return (
    <WorkspaceCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <label className="flex min-w-0 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(orderId)}
            aria-label={t("table.selectOrder", {
              order: getOrderNumber(order),
            })}
            className="mt-1 h-4 w-4 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500/25"
          />
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold text-ink">
              {getOrderNumber(order)}
            </span>
            <span className="mt-1 block text-[12px] text-ink-muted">
              {formatOrderTimestamp(order?.createdAt, locale, t)}
            </span>
          </span>
        </label>

        <OrderActions order={order} onView={onView} onCopy={onCopy} t={t} />
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <CustomerAvatar order={order} />
        <div className="min-w-0 flex-1">
          <WorkspaceTruncatedText
            as="p"
            className="text-[12px] font-semibold text-ink"
          >
            {getCustomerName(order)}
          </WorkspaceTruncatedText>
          <WorkspaceTruncatedText
            as="p"
            className="mt-0.5 text-[12px] text-ink-muted"
          >
            {getCustomerEmail(order) || "—"}
          </WorkspaceTruncatedText>
        </div>
        <StatusPill order={order} t={t} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-[14px] bg-[#FAF9F6] p-3.5">
        <div className="col-span-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.products")}
          </p>
          <div className="mt-1.5">
            <ProductSummary order={order} locale={locale} t={t} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.total")}
          </p>
          <p className="mt-1.5 text-[12px] font-semibold text-ink">
            {formatMoney(getOrderTotal(order), getOrderCurrency(order), locale)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.payment")}
          </p>
          <div className="mt-1.5">
            <PaymentSummary order={order} t={t} />
          </div>
        </div>
      </div>
    </WorkspaceCard>
  );
}

export default function OrdersCatalog({
  orders,
  locale,
  density,
  selectedIds,
  onSelect,
  onSelectAll,
  onView,
  onCopy,
  t,
}) {
  if (!orders.length) {
    return (
      <WorkspaceEmptyState
        icon={ReceiptPercentIcon}
        title={t("empty.title")}
        description={t("empty.description")}
        className="min-h-[310px]"
      />
    );
  }

  const allVisibleSelected = orders.every((order) =>
    selectedIds.has(getOrderId(order)),
  );
  const cellPadding = density === "compact" ? "py-2.5" : "py-3.5";

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {orders.map((order) => (
          <OrderCard
            key={getOrderId(order)}
            order={order}
            locale={locale}
            selected={selectedIds.has(getOrderId(order))}
            onSelect={onSelect}
            onView={onView}
            onCopy={onCopy}
            t={t}
          />
        ))}
      </div>

      <WorkspaceTableFrame className="hidden md:block">
        <WorkspaceTableScroller ariaLabel={t("table.label")}>
          <WorkspaceTable className="min-w-[1040px]">
            <thead>
              <tr className="text-left">
                <WorkspaceTableHeadCell className="w-12 pl-5">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => onSelectAll(orders)}
                    aria-label={t("table.selectPage")}
                    className="h-4 w-4 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500/25"
                  />
                </WorkspaceTableHeadCell>
                {[
                  "order",
                  "customer",
                  "products",
                  "total",
                  "payment",
                  "status",
                  "actions",
                ].map((column) => (
                  <WorkspaceTableHeadCell key={column} className="last:pr-5">
                    {t(`columns.${column}`)}
                  </WorkspaceTableHeadCell>
                ))}
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const orderId = getOrderId(order);

                return (
                  <tr
                    key={orderId}
                    className="group transition hover:bg-[#FBFAF7]"
                  >
                    <td
                      className={cx(
                        "border-b border-line px-4 pl-5",
                        cellPadding,
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(orderId)}
                        onChange={() => onSelect(orderId)}
                        aria-label={t("table.selectOrder", {
                          order: getOrderNumber(order),
                        })}
                        className="h-4 w-4 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500/25"
                      />
                    </td>

                    <td
                      className={cx("border-b border-line px-4", cellPadding)}
                    >
                      <div className="min-w-[115px]">
                        <button
                          type="button"
                          onClick={() => onView(order)}
                          className="text-left text-[12px] font-semibold text-ink transition hover:text-cobalt-600"
                        >
                          {getOrderNumber(order)}
                        </button>
                        <p className="mt-1 text-[12px] text-ink-muted">
                          {formatOrderTimestamp(order?.createdAt, locale, t)}
                        </p>
                      </div>
                    </td>

                    <td
                      className={cx("border-b border-line px-4", cellPadding)}
                    >
                      <div className="flex min-w-[190px] items-center gap-3">
                        <CustomerAvatar order={order} />
                        <div className="min-w-0">
                          <WorkspaceTruncatedText
                            as="p"
                            className="text-[12px] font-semibold text-ink"
                          >
                            {getCustomerName(order)}
                          </WorkspaceTruncatedText>
                          <WorkspaceTruncatedText
                            as="p"
                            className="mt-1 max-w-[180px] text-[12px] text-ink-muted"
                          >
                            {getCustomerEmail(order) || "—"}
                          </WorkspaceTruncatedText>
                        </div>
                      </div>
                    </td>

                    <td
                      className={cx("border-b border-line px-4", cellPadding)}
                    >
                      <ProductSummary order={order} locale={locale} t={t} />
                    </td>

                    <td
                      className={cx(
                        "border-b border-line px-4 text-[12px] font-semibold text-ink",
                        cellPadding,
                      )}
                    >
                      <span className="whitespace-nowrap">
                        {formatMoney(
                          getOrderTotal(order),
                          getOrderCurrency(order),
                          locale,
                        )}
                      </span>
                    </td>

                    <td
                      className={cx("border-b border-line px-4", cellPadding)}
                    >
                      <PaymentSummary order={order} t={t} />
                    </td>

                    <td
                      className={cx("border-b border-line px-4", cellPadding)}
                    >
                      <StatusPill order={order} t={t} />
                    </td>

                    <td
                      className={cx(
                        "border-b border-line px-4 pr-5",
                        cellPadding,
                      )}
                    >
                      <OrderActions
                        order={order}
                        onView={onView}
                        onCopy={onCopy}
                        t={t}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </WorkspaceTable>
        </WorkspaceTableScroller>
      </WorkspaceTableFrame>
    </>
  );
}
