"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { getCountryName } from "@/config/regions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useGetCouponOrdersWithFiltersMutation,
  useGetCouponOrderQuery,
  useDispatchCouponOrderMutation,
  useDownloadCouponOrderPdfMutation,
} from "@/lib/features/coupons/couponsApiSlice";
import {
  WorkspaceTableFrame,
  WorkspaceTableScroller,
  WorkspaceTable,
  WorkspaceTableHeader,
  WorkspaceTableHeadCell,
  WorkspaceTableCell,
  WorkspacePagination,
  WorkspaceStatusPill,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  workspaceInputClass,
  workspaceLabelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogViewport,
  WorkspaceDialogPanel,
  WorkspaceDialogHeader,
  WorkspaceDialogBody,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  formatMajorCurrencyAmount,
  formatMinorCurrencyAmount,
} from "@/utils/money";
import { formatIssuedVoucherDate } from "./voucherRecord";
import { savePurchasedVoucherPdf } from "./purchase/voucherPurchaseAccess";
import VoucherOrderRefundStatus from "./VoucherOrderRefundStatus";

const FILTERS = { search: "", sendPost: "all", physicalStatus: "all" };
export const VOUCHER_POSTAL_STATUSES = [
  "awaiting_payment",
  "awaiting_dispatch",
  "dispatched",
  "cancelled",
  "review_required",
];
const postalTone = (status) =>
  status === "dispatched"
    ? "success"
    : status === "awaiting_dispatch"
      ? "info"
      : status === "review_required"
        ? "warning"
        : "neutral";
const DISPATCH_BLOCKERS = new Set([
  "not_paid",
  "not_issued",
  "issuance_inconsistent",
  "voucher_unavailable",
  "voucher_expired",
  "address_incomplete",
]);

function PostalStatus({ delivery, t }) {
  const status = VOUCHER_POSTAL_STATUSES.includes(delivery?.status)
    ? delivery.status
    : "unknown";
  return (
    <WorkspaceStatusPill tone={postalTone(status)}>
      {t(delivery?.requested ? `states.${status}` : "digital")}
    </WorkspaceStatusPill>
  );
}

function PostalAddress({ address, locale }) {
  if (!address) return null;
  return (
    <address className="break-words text-sm not-italic leading-6 text-ink-soft">
      <p>{[address.firstname, address.lastname].filter(Boolean).join(" ")}</p>
      <p>{address.street}</p>
      <p>{[address.postalCode, address.city].filter(Boolean).join(" ")}</p>
      {address.countryCode && (
        <p>{getCountryName(address.countryCode, locale)}</p>
      )}
    </address>
  );
}

export function VoucherOrderDialog({ orderId, canManage, onClose, onUpdated }) {
  const t = useTranslations("VoucherFoundation.orders");
  const locale = useLocale();
  const query = useGetCouponOrderQuery(orderId);
  const [dispatchOrder] = useDispatchCouponOrderMutation();
  const [downloadPdf, downloadState] = useDownloadCouponOrderPdfMutation();
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [dispatched, setDispatched] = useState(false);
  const operationId = useRef(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const detail = query.currentData;
  const delivery = detail?.physicalDelivery;
  const order = detail?.order;
  const busy = Boolean(action);
  const canDispatch =
    canManage &&
    delivery?.canDispatch === true &&
    !dispatched &&
    !query.isFetching &&
    !query.isError;

  const markDispatched = async () => {
    if (!canDispatch || inFlight.current) return;
    inFlight.current = true;
    setAction("dispatch");
    setError("");
    try {
      operationId.current ||= crypto.randomUUID();
      await dispatchOrder({
        orderId,
        operationId: operationId.current,
      }).unwrap();
      if (!mounted.current) return;
      setDispatched(true);
      onUpdated();
    } catch {
      setError(t("dispatchError"));
    } finally {
      inFlight.current = false;
      setAction("");
    }
  };

  const download = async (index) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setAction(`download-${index}`);
    setError("");
    try {
      const result = await downloadPdf({ orderId, index }).unwrap();
      if (!mounted.current) return;
      const bytes = Uint8Array.from(atob(result.base64), (char) =>
        char.charCodeAt(0),
      );
      savePurchasedVoucherPdf(
        new Blob([bytes], { type: "application/pdf" }),
        index,
      );
    } catch {
      setError(t("downloadError"));
    } finally {
      downloadState.reset();
      inFlight.current = false;
      setAction("");
    }
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (!inFlight.current) onClose();
      }}
      className="relative z-[80]"
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="modal">
        <WorkspaceDialogPanel layout="modal" size="small">
          <WorkspaceDialogHeader
            title={t("detailTitle")}
            description={t("detailDescription")}
            onClose={onClose}
            closeDisabled={busy}
            closeLabel={t("close")}
          />
          <WorkspaceDialogBody className="space-y-5">
            {query.isFetching ? (
              <p role="status">{t("loading")}</p>
            ) : query.isError || !detail ? (
              <div role="alert">
                <p>{t("loadError")}</p>
                <button
                  type="button"
                  onClick={query.refetch}
                  className={`${workspaceSecondaryButtonClass} mt-3`}
                >
                  {t("retry")}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {order?.productName}
                  </h3>
                  <p className="mt-1 break-all text-sm text-ink-muted">
                    {order?.email}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    {t("quantity", { count: order?.quantity || 1 })} ·{" "}
                    {formatMajorCurrencyAmount(
                      order?.total,
                      order?.currency,
                      locale,
                    )}
                  </p>
                  <p className="mt-2 break-all text-xs text-ink-muted">
                    {t("reference", { id: orderId })}
                  </p>
                  <VoucherOrderRefundStatus order={order} />
                </div>
                <section className="space-y-3 rounded-2xl border border-line bg-sand-50 p-4">
                  <h3 className="font-semibold text-ink">{t("delivery")}</h3>
                  <PostalStatus
                    delivery={
                      dispatched
                        ? { ...delivery, status: "dispatched" }
                        : delivery
                    }
                    t={t}
                  />
                  {delivery?.requested ? (
                    <>
                      <PostalAddress
                        address={delivery.address}
                        locale={locale}
                      />
                      <p className="text-sm text-ink-soft">
                        {t("postage", {
                          amount: Number.isSafeInteger(delivery.postageFeeMinor)
                            ? formatMinorCurrencyAmount(
                                delivery.postageFeeMinor,
                                delivery.currency,
                                locale,
                              )
                            : "—",
                        })}
                      </p>
                      {delivery.dispatchedAt && (
                        <p className="text-xs text-ink-muted">
                          {t("dispatchedAt", {
                            date: formatIssuedVoucherDate(
                              delivery.dispatchedAt,
                              locale,
                            ),
                          })}
                        </p>
                      )}
                      <p className="text-xs leading-5 text-ink-muted">
                        {t("sameCode")}
                      </p>
                      {!dispatched &&
                        !delivery.canDispatch &&
                        DISPATCH_BLOCKERS.has(delivery.blockedReason) && (
                          <p className="text-sm leading-6 text-amber-800">
                            {t(`blockers.${delivery.blockedReason}`)}
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="text-sm text-ink-muted">{t("digitalHelp")}</p>
                  )}
                </section>
                {detail.documents?.length > 0 && (
                  <section>
                    <h3 className="font-semibold text-ink">
                      {t("printTitle")}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      {t("printHelp")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detail.documents.map(({ index }) => (
                        <button
                          key={index}
                          type="button"
                          disabled={busy}
                          onClick={() => download(index)}
                          className={workspaceSecondaryButtonClass}
                        >
                          {t(
                            action === `download-${index}`
                              ? "downloading"
                              : "download",
                            { number: index + 1 },
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {canDispatch && (
                  <section className="rounded-2xl border border-cobalt-200 bg-cobalt-50 p-4">
                    <p className="text-sm leading-6 text-ink-soft">
                      {t("dispatchHelp")}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={markDispatched}
                      className={`${workspacePrimaryButtonClass} mt-3`}
                    >
                      {t(action === "dispatch" ? "dispatching" : "dispatch")}
                    </button>
                  </section>
                )}
                {dispatched && (
                  <p role="status" className="text-sm text-success">
                    {t("dispatchSuccess")}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={query.refetch}
                  className={workspaceSecondaryButtonClass}
                >
                  {t("refresh")}
                </button>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

export default function VoucherOrdersPanel() {
  const tenant = useSelector(selectCurrentTenant);
  return (
    <VoucherOrders
      key={tenant?.id || tenant?._id || tenant?.slug || "workspace"}
    />
  );
}

function VoucherOrders() {
  const t = useTranslations("VoucherFoundation.orders");
  const locale = useLocale();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const canView = hasPermission(access, PERMISSIONS.VOUCHERS_VIEW);
  const canManage = hasPermission(access, PERMISSIONS.VOUCHERS_MANAGE);
  const [getOrders] = useGetCouponOrdersWithFiltersMutation();
  const [filters, setFilters] = useState(FILTERS);
  const [applied, setApplied] = useState(FILTERS);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [response, setResponse] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const args = useMemo(
    () => ({
      ...applied,
      search: applied.search.trim(),
      sendPost:
        applied.sendPost === "all" ? "all" : applied.sendPost === "true",
      page,
      limit: 10,
    }),
    [applied, page],
  );
  const pending = response?.args !== args || response?.revision !== revision;
  const failed = !pending && response?.failed;
  const result = pending ? null : response?.data;

  useEffect(() => {
    if (!canView) return;
    let active = true;
    const request = getOrders(args);
    request
      .unwrap()
      .then((data) => {
        if (!active) return;
        if (page > Math.max(1, data.totalPages || 1)) {
          setPage(Math.max(1, data.totalPages || 1));
          return;
        }
        setResponse({ args, revision, data });
      })
      .catch(() => {
        if (!active) return;
        setResponse({ args, revision, failed: true });
      });
    return () => {
      active = false;
      request.abort?.();
    };
  }, [args, canView, getOrders, page, revision]);

  if (!canView)
    return <p className="text-sm text-ink-muted">{t("noAccess")}</p>;
  const orders = result?.couponOrders || [];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-ink">{t("title")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
          {t("description")}
        </p>
      </div>
      <WorkspaceTableFrame>
        <form
          className="grid items-end gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1.5fr)_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setApplied({ ...filters });
          }}
        >
          <label className={workspaceLabelClass}>
            {t("search")}
            <input
              value={filters.search}
              onChange={(event) =>
                setFilters({ ...filters, search: event.target.value })
              }
              className={workspaceInputClass}
              type="search"
            />
          </label>
          <label className={workspaceLabelClass}>
            {t("delivery")}
            <select
              value={filters.sendPost}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  sendPost: event.target.value,
                  physicalStatus: "all",
                })
              }
              className={workspaceInputClass}
            >
              <option value="all">{t("allDelivery")}</option>
              <option value="true">{t("postal")}</option>
              <option value="false">{t("digital")}</option>
            </select>
          </label>
          <label className={workspaceLabelClass}>
            {t("postalStatus")}
            <select
              value={filters.physicalStatus}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  physicalStatus: event.target.value,
                  ...(event.target.value !== "all" ? { sendPost: "true" } : {}),
                })
              }
              className={workspaceInputClass}
            >
              <option value="all">{t("allStatuses")}</option>
              {VOUCHER_POSTAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`states.${status}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={workspacePrimaryButtonClass}>
              {t("apply")}
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters(FILTERS);
                setApplied({ ...FILTERS });
                setPage(1);
              }}
              className={workspaceSecondaryButtonClass}
            >
              {t("clear")}
            </button>
          </div>
        </form>
        {pending ? (
          <p role="status" className="p-6 text-sm text-ink-muted">
            {t("loading")}
          </p>
        ) : failed ? (
          <div role="alert" className="p-6">
            <p>{t("loadError")}</p>
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
              className={`${workspaceSecondaryButtonClass} mt-3`}
            >
              {t("retry")}
            </button>
          </div>
        ) : !orders.length ? (
          <p className="p-8 text-center text-sm text-ink-muted">{t("empty")}</p>
        ) : (
          <>
            <WorkspaceTableScroller ariaLabel={t("title")}>
              <WorkspaceTable className="min-w-[680px]">
                <WorkspaceTableHeader>
                  <tr>
                    {[
                      "customer",
                      "offering",
                      "delivery",
                      "total",
                      "actions",
                    ].map((column) => (
                      <WorkspaceTableHeadCell key={column}>
                        {t(column)}
                      </WorkspaceTableHeadCell>
                    ))}
                  </tr>
                </WorkspaceTableHeader>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <WorkspaceTableCell>
                        <span className="block max-w-xs break-all font-medium text-ink">
                          {order.email}
                        </span>
                        <span className="mt-1 block text-xs text-ink-muted">
                          {formatIssuedVoucherDate(order.createdAt, locale)}
                        </span>
                      </WorkspaceTableCell>
                      <WorkspaceTableCell>
                        <span className="block max-w-xs break-words">
                          {order.productNameSnapshot ||
                            order.productName ||
                            "—"}
                        </span>
                        <span className="mt-1 block text-xs text-ink-muted">
                          {t("quantity", { count: order.quantity || 1 })}
                        </span>
                        <VoucherOrderRefundStatus order={order} />
                      </WorkspaceTableCell>
                      <WorkspaceTableCell>
                        <PostalStatus delivery={order.physicalDelivery} t={t} />
                      </WorkspaceTableCell>
                      <WorkspaceTableCell className="tabular-nums">
                        {formatMajorCurrencyAmount(
                          order.totalSnapshot,
                          order.currencySnapshot,
                          locale,
                        )}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell>
                        <button
                          type="button"
                          onClick={() => setSelectedId(order._id)}
                          className={workspaceSecondaryButtonClass}
                        >
                          {t("viewOrder")}
                        </button>
                      </WorkspaceTableCell>
                    </tr>
                  ))}
                </tbody>
              </WorkspaceTable>
            </WorkspaceTableScroller>
            <WorkspacePagination
              page={page}
              pageCount={result.totalPages}
              onPrevious={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() => setPage((value) => value + 1)}
              previousLabel={t("previous")}
              nextLabel={t("next")}
              pageLabel={t("pagination")}
            />
          </>
        )}
      </WorkspaceTableFrame>
      {selectedId && (
        <VoucherOrderDialog
          key={selectedId}
          orderId={selectedId}
          canManage={canManage}
          onClose={() => setSelectedId("")}
          onUpdated={() => {
            setPage(1);
            setRevision((value) => value + 1);
          }}
        />
      )}
    </section>
  );
}
