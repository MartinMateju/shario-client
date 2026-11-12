"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import {
  useCreateManualPromoCodeMutation,
  useGetPromoCodesWithFiltersMutation,
} from "@/lib/features/coupons/couponsApiSlice";
import { useGetAllProductsQuery } from "@/lib/features/products/productsApiSlice";
import { hasPermission, PERMISSIONS } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  WorkspaceTable,
  WorkspaceTableCell,
  WorkspaceTableFrame,
  WorkspaceTableHeadCell,
  WorkspaceTableScroller,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import ConfirmationModal from "@/components/modals/ConformationModal";
import RevokeVoucherDialog from "@/components/vouchers/RevokeVoucherDialog";
import ArchiveVoucherCodeDialog from "@/components/vouchers/ArchiveVoucherCodeDialog";
import {
  formatIssuedVoucherAmount,
  formatIssuedVoucherDate,
  formatIssuedVoucherRemaining,
  getIssuedVoucherName,
  getIssuedVoucherStatus,
} from "@/components/vouchers/voucherRecord";
import {
  formatProductPrice,
  getProductName,
} from "@/components/products/products.utils";

const INITIAL_FILTERS = {
  search: "",
  status: "all",
  archiveState: "unarchived",
};
const STATUSES = [
  "active",
  "partially_redeemed",
  "reserved",
  "redeemed",
  "expired",
  "revoked",
  "review_required",
  "inactive",
];
const inputClass =
  "min-h-11 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-cobalt-500 focus:outline-none focus:ring-2 focus:ring-cobalt-500/20";
const labelClass = "mb-1.5 block text-xs font-medium text-ink-soft";
const statusClass = (status) => {
  if (status === "active") return "bg-emerald-50 text-emerald-800";
  if (status === "revoked") return "bg-red-50 text-red-700";
  if (["expired", "review", "reserved"].includes(status))
    return "bg-amber-50 text-amber-800";
  return "bg-sand-100 text-ink-soft";
};

// Reset a scoped list on navigation so no previous offering's rows or unfinished
// issuance form can appear under the newly selected offering.
export default function PromoCodesTable(props) {
  return <VoucherCodes key={props.productId || "all"} {...props} />;
}

function VoucherCodes({ productId = "", productName = "" }) {
  const t = useTranslations("VoucherFoundation");
  const locale = useLocale();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const canView = hasPermission(access, PERMISSIONS.VOUCHERS_VIEW);
  const canManage = hasPermission(access, PERMISSIONS.VOUCHERS_MANAGE);
  const canReadProducts = hasPermission(access, PERMISSIONS.PRODUCTS_VIEW);
  const {
    data: couponProducts = [],
    isLoading: isLoadingProducts,
    isError: productsError,
  } = useGetAllProductsQuery(
    { kind: "voucher" },
    { skip: !canManage || !canReadProducts },
  );
  const [getCodes, { data: codesData, isLoading: isLoadingCodes, isError }] =
    useGetPromoCodesWithFiltersMutation();
  const [createCode, { isLoading: isCreatingCode }] =
    useCreateManualPromoCodeMutation();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(productId);
  const [email, setEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const [createdCode, setCreatedCode] = useState(null);
  const [couponToRevoke, setCouponToRevoke] = useState(null);
  const [couponToArchive, setCouponToArchive] = useState(null);
  const createOperationId = useRef(null);
  const createInFlight = useRef(false);
  const listRequestId = useRef(0);

  const offerings = useMemo(
    () =>
      couponProducts.filter(
        (product) =>
          (product.kind === "voucher" || product.type === "coupon") &&
          product.voucherSettings?.type !== "experience" &&
          product.isActive !== false &&
          !product.isArchived &&
          !product.archivedAt &&
          !product.deletedAt &&
          product.status !== "archived",
      ),
    [couponProducts],
  );
  const selectedProduct = offerings.find(
    (product) => String(product._id || product.id) === selectedProductId,
  );
  const scopedProduct = couponProducts.find(
    (product) => String(product._id || product.id) === productId,
  );
  const scopeName =
    productName || (scopedProduct ? getProductName(scopedProduct, locale) : "");
  const coupons = codesData?.coupons || [];
  const totalPages = codesData?.totalPages || 0;
  const totalCount = codesData?.totalCount || 0;
  const canCreate =
    canManage &&
    canReadProducts &&
    !isLoadingProducts &&
    !productsError &&
    (productId
      ? offerings.some(
          (product) => String(product._id || product.id) === productId,
        )
      : offerings.length > 0);

  const fetchCodes = useCallback(
    async (page = 1, nextFilters = INITIAL_FILTERS) => {
      if (!canView) return;
      const requestId = ++listRequestId.current;
      try {
        await getCodes({
          ...nextFilters,
          search: nextFilters.search.trim(),
          isActive: "all",
          ...(productId ? { productId } : {}),
          page,
          limit: 8,
          sortOrder: "desc",
        }).unwrap();
        if (requestId === listRequestId.current) {
          setCurrentPage(page);
          setAppliedFilters(nextFilters);
        }
      } catch {
        // Keep controls and the mutation's error state available for a retry.
      }
    },
    [canView, getCodes, productId],
  );
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const refreshCodes = () => fetchCodes(1, appliedFilters);
  const updateFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    fetchCodes(1, INITIAL_FILTERS);
  };
  const openCreate = () => {
    setSelectedProductId(productId);
    setEmail("");
    setCreateError("");
    createOperationId.current = null;
    setShowCreate(true);
  };
  const create = async () => {
    if (!canCreate || createInFlight.current) return;
    setCreateError("");
    if (!selectedProduct || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setCreateError(t("manual.validation"));
      return;
    }
    createInFlight.current = true;
    try {
      createOperationId.current ||= crypto.randomUUID();
      const result = await createCode({
        productId: selectedProductId,
        email: email.trim(),
        operationId: createOperationId.current,
      }).unwrap();
      setShowCreate(false);
      setCreatedCode(result);
      setFilters(INITIAL_FILTERS);
      fetchCodes(1, INITIAL_FILTERS);
    } catch (error) {
      setCreateError(error?.data?.message || t("manual.error"));
    } finally {
      createInFlight.current = false;
    }
  };

  const formatExpiry = (coupon) =>
    coupon.expiresAt
      ? formatIssuedVoucherDate(
          coupon.expiresAt,
          locale,
          tenant?.settings?.timezone || "UTC",
        )
      : t("noExpiry");
  const customer = (coupon) =>
    coupon.order?.email || coupon.recipientEmail || coupon.email || "—";
  const renderStatus = (coupon) => {
    const status = getIssuedVoucherStatus(coupon);
    return (
      <div className="flex flex-wrap gap-1.5">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(status)}`}
        >
          {t(`status.${status}`)}
        </span>
        {coupon.archivedAt && (
          <span className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted">
            {t("codes.archived")}
          </span>
        )}
        {coupon.revocationReason && (
          <p className="w-full max-w-64 text-xs text-red-700 [overflow-wrap:anywhere]">
            {t("revoke.reason")}: {coupon.revocationReason}
          </p>
        )}
      </div>
    );
  };
  const renderActions = (coupon) => {
    if (!canManage) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {(coupon.archivedAt ? coupon.canRestore : coupon.canArchive) && (
          <button
            type="button"
            className="min-h-9 text-xs font-semibold text-cobalt-700 underline underline-offset-2"
            onClick={() => setCouponToArchive(coupon)}
          >
            {t(coupon.archivedAt ? "codes.restore" : "codes.archive")}
          </button>
        )}
        {coupon.canRevoke === true && (
          <button
            type="button"
            className="min-h-9 text-xs font-medium text-red-700 underline underline-offset-2"
            onClick={() => setCouponToRevoke(coupon)}
          >
            {t("revoke.action")}
          </button>
        )}
      </div>
    );
  };

  if (!canView)
    return (
      <p className="rounded-2xl border border-line p-5">
        {t("codes.noAccess")}
      </p>
    );

  return (
    <>
      <WorkspaceTableFrame>
        <div className="space-y-5 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-ink [overflow-wrap:anywhere]">
                {productId
                  ? scopeName
                    ? t("codes.productTitle", { name: scopeName })
                    : t("codes.scopedTitle")
                  : t("codes.title")}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                {t("codes.description")}
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={openCreate}
                disabled={!canCreate}
                className={`${workspacePrimaryButtonClass} shrink-0`}
              >
                {t("codes.create")}
              </button>
            )}
          </div>
          {canManage && !canCreate && (
            <p className="text-sm text-ink-muted">
              {isLoadingProducts
                ? t("codes.loadingOfferings")
                : productsError
                  ? t("manual.productsError")
                  : t("codes.noIssuableOffering")}
            </p>
          )}
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              fetchCodes(1, filters);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_1fr_1fr]">
              <div>
                <label htmlFor="voucher-code-search" className={labelClass}>
                  {t("codes.searchLabel")}
                </label>
                <input
                  id="voucher-code-search"
                  value={filters.search}
                  onChange={(event) =>
                    updateFilter("search", event.target.value)
                  }
                  placeholder={t("codes.searchPlaceholder")}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="voucher-code-status" className={labelClass}>
                  {t("codes.columns.status")}
                </label>
                <select
                  id="voucher-code-status"
                  value={filters.status}
                  onChange={(event) =>
                    updateFilter("status", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                >
                  <option value="all">{t("codes.allStatuses")}</option>
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(
                        `status.${status === "review_required" ? "review" : status}`,
                      )}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="voucher-code-archive" className={labelClass}>
                  {t("codes.archiveLabel")}
                </label>
                <select
                  id="voucher-code-archive"
                  value={filters.archiveState}
                  onChange={(event) =>
                    updateFilter("archiveState", event.target.value)
                  }
                  className={`${inputClass} pr-10`}
                >
                  {["unarchived", "archived", "all"].map((state) => (
                    <option key={state} value={state}>
                      {t(`codes.archiveStates.${state}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isLoadingCodes}
                className={workspaceSecondaryButtonClass}
              >
                {t("codes.search")}
              </button>
              <button
                type="button"
                disabled={isLoadingCodes}
                onClick={clearFilters}
                className="min-h-10 px-3 text-sm font-medium text-ink-muted"
              >
                {t("codes.clear")}
              </button>
            </div>
          </form>
        </div>
        {isLoadingCodes ? (
          <p role="status" className="p-8 text-center text-sm text-ink-muted">
            {t("codes.loading")}
          </p>
        ) : isError ? (
          <div role="alert" className="space-y-3 p-8 text-center">
            <p>{t("codes.loadError")}</p>
            <button
              type="button"
              onClick={() => fetchCodes(1, filters)}
              className={workspaceSecondaryButtonClass}
            >
              {t("retry")}
            </button>
          </div>
        ) : !coupons.length ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            {t("codes.empty")}
          </p>
        ) : (
          <>
            <p className="border-b border-line px-5 py-3 text-xs text-ink-muted">
              {t("codes.count", { count: coupons.length, total: totalCount })}
            </p>
            <div className="divide-y divide-line sm:hidden">
              {coupons.map((coupon) => (
                <article key={coupon._id} className="space-y-3 p-4">
                  <div>
                    <p className="break-all font-mono text-sm font-semibold text-ink">
                      {coupon.promoCode}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {getIssuedVoucherName(coupon, locale)}
                    </p>
                  </div>
                  {renderStatus(coupon)}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {[
                      ["value", formatIssuedVoucherAmount(coupon, locale)],
                      [
                        "remaining",
                        formatIssuedVoucherRemaining(coupon, locale),
                      ],
                      ["customer", customer(coupon)],
                      ["expiry", formatExpiry(coupon)],
                    ].map(([key, value]) => (
                      <div key={key} className="min-w-0">
                        <dt className="text-xs text-ink-muted">
                          {t(`codes.columns.${key}`)}
                        </dt>
                        <dd className="mt-1 tabular-nums [overflow-wrap:anywhere]">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {renderActions(coupon)}
                </article>
              ))}
            </div>
            <WorkspaceTableScroller
              className="hidden sm:block"
              ariaLabel={t("codes.title")}
            >
              <WorkspaceTable className="min-w-[1000px]">
                <thead>
                  <tr>
                    {[
                      "code",
                      "offering",
                      "value",
                      "remaining",
                      "customer",
                      "expiry",
                      "status",
                      ...(canManage ? ["actions"] : []),
                    ].map((column) => (
                      <WorkspaceTableHeadCell key={column}>
                        {t(`codes.columns.${column}`)}
                      </WorkspaceTableHeadCell>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon._id}>
                      <WorkspaceTableCell className="whitespace-nowrap font-mono font-semibold">
                        {coupon.promoCode}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell>
                        {getIssuedVoucherName(coupon, locale)}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell className="whitespace-nowrap tabular-nums">
                        {formatIssuedVoucherAmount(coupon, locale)}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell className="whitespace-nowrap tabular-nums">
                        {formatIssuedVoucherRemaining(coupon, locale)}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell className="max-w-64 [overflow-wrap:anywhere]">
                        {customer(coupon)}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell>
                        {formatExpiry(coupon)}
                      </WorkspaceTableCell>
                      <WorkspaceTableCell>
                        {renderStatus(coupon)}
                      </WorkspaceTableCell>
                      {canManage && (
                        <WorkspaceTableCell>
                          {renderActions(coupon)}
                        </WorkspaceTableCell>
                      )}
                    </tr>
                  ))}
                </tbody>
              </WorkspaceTable>
            </WorkspaceTableScroller>
          </>
        )}
        {!isLoadingCodes && !isError && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
            <p className="text-sm text-ink-muted">
              {t("codes.page", { page: currentPage, total: totalPages })}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => fetchCodes(currentPage - 1, appliedFilters)}
                className={workspaceSecondaryButtonClass}
              >
                {t("codes.previous")}
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => fetchCodes(currentPage + 1, appliedFilters)}
                className={workspaceSecondaryButtonClass}
              >
                {t("codes.next")}
              </button>
            </div>
          </div>
        )}
      </WorkspaceTableFrame>
      {canManage && showCreate && (
        <ConfirmationModal
          show
          title={t("codes.createTitle")}
          onClose={() => {
            if (!createInFlight.current) setShowCreate(false);
          }}
          onConfirm={create}
          confirmText={t("codes.issue")}
          cancelText={t("cancel")}
          isLoading={isCreatingCode}
          message={
            <div className="space-y-4 text-left">
              <div>
                <label htmlFor="couponProduct" className={labelClass}>
                  {t("codes.offeringLabel")}
                </label>
                <select
                  id="couponProduct"
                  value={selectedProductId}
                  disabled={isCreatingCode || Boolean(productId)}
                  onChange={(event) => {
                    setSelectedProductId(event.target.value);
                    createOperationId.current = null;
                  }}
                  className={`${inputClass} pr-10`}
                >
                  <option value="">{t("codes.chooseOffering")}</option>
                  {offerings.map((product) => (
                    <option
                      key={product._id || product.id}
                      value={product._id || product.id}
                    >
                      {getProductName(product, locale)} —{" "}
                      {formatProductPrice(product, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="voucher-recipient-email" className={labelClass}>
                  {t("manual.recipient")}
                </label>
                <input
                  id="voucher-recipient-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    createOperationId.current = null;
                  }}
                  disabled={isCreatingCode}
                  autoComplete="off"
                  className={inputClass}
                />
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {t("manual.recipientHelp")}
                </p>
              </div>
              {selectedProduct && (
                <p className="rounded-xl bg-sand-50 p-3 text-sm">
                  {t("codes.creditHelp", {
                    amount: formatProductPrice(selectedProduct, locale),
                  })}
                </p>
              )}
              {createError && (
                <p role="alert" className="text-sm text-red-700">
                  {createError}
                </p>
              )}
            </div>
          }
        />
      )}
      {createdCode && (
        <ConfirmationModal
          show
          title={t("codes.createdTitle")}
          onClose={() => setCreatedCode(null)}
          onConfirm={() => setCreatedCode(null)}
          confirmText={t("codes.done")}
          cancelText={t("codes.close")}
          message={
            <div className="space-y-3 text-left">
              <p className="break-all rounded-xl bg-sand-50 p-4 text-center font-mono text-xl font-semibold">
                {createdCode.promoCode}
              </p>
              <p>
                {t("codes.createdRecipient", {
                  email: createdCode.email || email,
                })}
              </p>
              <p>
                {t("codes.creditHelp", {
                  amount: formatIssuedVoucherAmount(createdCode, locale),
                })}
              </p>
            </div>
          }
        />
      )}
      {canManage && couponToArchive && (
        <ArchiveVoucherCodeDialog
          key={couponToArchive._id}
          coupon={couponToArchive}
          onClose={() => setCouponToArchive(null)}
          onUpdated={refreshCodes}
        />
      )}
      {canManage && couponToRevoke && (
        <RevokeVoucherDialog
          key={couponToRevoke._id}
          coupon={couponToRevoke}
          onClose={() => setCouponToRevoke(null)}
          onRevoked={refreshCodes}
        />
      )}
    </>
  );
}
