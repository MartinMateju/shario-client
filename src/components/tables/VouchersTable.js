"use client";

import { useTranslations } from "next-intl";
import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useLegacyCopy, useLegacyText } from "@/i18n/useLegacyCopy";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/20/solid";
import { XMarkIcon, PencilIcon } from "@heroicons/react/24/outline";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetCouponOrdersWithFiltersMutation,
  useUpdateCouponOrderStatusMutation,
} from "@/lib/features/coupons/couponsApiSlice";
import { useGetUsersQuery } from "@/lib/features/users/usersApiSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import Loader from "../loaders/Loader";
import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";
import ConfirmationModal from "../modals/ConformationModal";
import VoucherOrderRefundStatus from "../vouchers/VoucherOrderRefundStatus";

const INITIAL_FILTERS = {
  search: "",
  userCustomId: "",
  userEmail: "",
  productType: "",
  status: "",
  sendPost: "all",
};

const getStatusOptions = (labels) => [
  { value: "pending_coupon_payment", label: labels.pending_coupon_payment },
  { value: "processed_coupon", label: labels.processed_coupon },
  { value: "shipped_coupon", label: labels.shipped_coupon },
];

const getStatusLabel = (status, labels) => labels[status] || status || "—";
const getDisplayStatus = (order) =>
  order.physicalDelivery?.status === "dispatched"
    ? "shipped_coupon"
    : order.status;

const getStatusColor = (status) => {
  const colorMap = {
    pending_coupon_payment: "bg-amber-50 text-amber-700 border-amber-100",
    processed_coupon: "bg-emerald-50 text-emerald-700 border-emerald-100",
    shipped_coupon: "bg-cobalt-50 text-cobalt-700 border-cobalt-100",
  };

  return colorMap[status] || "bg-gray-50 text-gray-700 border-gray-100";
};

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-black/55 font-medium">
      {children}
    </label>
  );
}

function FilterInput({
  value,
  onChange,
  placeholder,
  type = "text",
  icon = null,
  onKeyDown,
}) {
  return (
    <div className="relative">
      {icon ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {icon}
        </div>
      ) : null}

      <input
        type={type}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`
          block w-full rounded-[18px] border border-black/10 bg-white
          ${icon ? "pl-11 pr-4" : "px-4"}
          py-3 text-sm text-black placeholder:text-black/35
          outline-none transition-all duration-200
          focus:border-[var(--unnamed-color-b3a292)]
          focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
        `}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="
        block w-full rounded-[18px] border border-black/10 bg-white px-4 py-3
        text-sm text-black outline-none transition-all duration-200
        focus:border-[var(--unnamed-color-b3a292)]
        focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
      "
    >
      {children}
    </select>
  );
}

const getShortId = (id) => {
  if (!id) return "—";
  return `${String(id).substring(0, 8)}...`;
};

const getCustomerName = (order) => {
  const name = `${order?.firstname || ""} ${order?.lastname || ""}`.trim();
  return name || "—";
};

export default function VouchersTable() {
  const commonT = useTranslations("Common");
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const statusLabels = useLegacyCopy("voucherStatuses");
  const { id, isAdmin } = useSelector(selectCurrentUser);
  const language = useSelector(selectCurrentLanguage);

  const { isLoading: isLoadingUsers } = useGetUsersQuery({
    userId: id,
  });

  const [
    getCouponOrdersWithFilters,
    { data: couponOrdersData, isLoading: isLoadingCouponOrders, isError },
  ] = useGetCouponOrdersWithFiltersMutation();

  const [updateCouponOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateCouponOrderStatusMutation();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [editStatus, setEditStatus] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState(null);

  const couponOrders = useMemo(
    () => couponOrdersData?.couponOrders || [],
    [couponOrdersData],
  );

  const totalPages = couponOrdersData?.totalPages || 0;
  const totalCount = couponOrdersData?.totalCount || 0;

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === "sendPost") return value !== INITIAL_FILTERS.sendPost;
      return String(value).trim() !== "";
    });
  }, [filters]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchCouponOrders = useCallback(
    async ({ page = 1, activeFilters = INITIAL_FILTERS } = {}) => {
      try {
        await getCouponOrdersWithFilters({
          search: activeFilters.search.trim(),
          userCustomId: activeFilters.userCustomId.trim() || undefined,
          userEmail: activeFilters.userEmail.trim() || undefined,
          productType: activeFilters.productType.trim() || undefined,
          ...(activeFilters.status === "shipped_coupon"
            ? { physicalStatus: "dispatched" }
            : { status: activeFilters.status || undefined }),
          sendPost: activeFilters.sendPost,
          page,
          limit: 8,
          sortBy: "_id",
          sortOrder: "desc",
        }).unwrap();

        setCurrentPage(page);
      } catch (error) {
        console.error("Failed to fetch coupon orders:", error);
      }
    },
    [getCouponOrdersWithFilters],
  );

  useEffect(() => {
    fetchCouponOrders({ page: 1, activeFilters: INITIAL_FILTERS });
  }, [fetchCouponOrders]);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      fetchCouponOrders({ page: 1, activeFilters: filters });
    },
    [fetchCouponOrders, filters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    fetchCouponOrders({ page: 1, activeFilters: INITIAL_FILTERS });
  }, [fetchCouponOrders]);

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= totalPages) {
        fetchCouponOrders({ page: newPage, activeFilters: filters });
      }
    },
    [fetchCouponOrders, filters, totalPages],
  );

  const handleEditClick = useCallback((order) => {
    setOrderToUpdate(order);
    setEditStatus(order.status || "");
    setShowConfirmModal(true);
  }, []);

  const handleStatusUpdate = async () => {
    if (!orderToUpdate || !editStatus) return;

    try {
      await updateCouponOrderStatus({
        couponOrderId: orderToUpdate._id,
        newStatus: editStatus,
      }).unwrap();

      setShowConfirmModal(false);
      setOrderToUpdate(null);
      setEditStatus("");

      fetchCouponOrders({ page: currentPage, activeFilters: filters });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert(
        getLocalizedApiErrorMessage(error, legacyText("voucherUpdateError")),
      );
    }
  };

  if (isLoadingUsers) {
    return <Loader />;
  }

  return (
    <>
      <div className="overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
        <div className="border-b border-black/5 bg-[#FCFBF9] px-4 py-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="mt-1 text-lg font-medium text-black sm:text-xl">
                {legacyText("VouchersTable_Voucher_management_384c5")}{" "}
              </h3>

              <p className="mt-1 text-sm text-black/45">
                {legacyText(
                  "VouchersTable_Find_voucher_orders_by_ID_email_customer_product_or_pro_0ef29",
                )}{" "}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
              <div className="flex-1">
                <FilterInput
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  placeholder={legacyText(
                    "VouchersTable_Order_ID_Email_Name_Product_Promo_code_30146",
                  )}
                  icon={
                    <MagnifyingGlassIcon className="h-5 w-5 text-black/35" />
                  }
                />
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className={`
                    inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px]
                    border px-4 py-3 text-sm font-medium transition-all duration-200
                    ${
                      showFilters
                        ? "border-[var(--unnamed-color-b3a292)] bg-[var(--unnamed-color-b3a292)]/10 text-[var(--unnamed-color-b3a292)]"
                        : "border-black/10 bg-white text-black hover:border-[var(--unnamed-color-b3a292)] hover:text-[var(--unnamed-color-b3a292)]"
                    }
                  `}
                >
                  <FunnelIcon className="h-5 w-5" />
                </button>

                <button
                  type="submit"
                  disabled={isLoadingCouponOrders}
                  className="
                    inline-flex min-h-[48px] min-w-[130px] items-center justify-center rounded-[18px]
                    bg-black px-6 py-3 text-sm font-medium text-white
                    transition-all duration-200
                    hover:bg-[var(--unnamed-color-b3a292)]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {isLoadingCouponOrders
                    ? commonT("loading")
                    : commonT("search")}
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-5 rounded-[22px] border border-black/5 bg-[#F7F5F2] p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <FieldLabel>
                      {legacyText("VouchersTable_Delivery_type_58a44")}{" "}
                    </FieldLabel>
                    <FilterSelect
                      value={filters.sendPost}
                      onChange={(e) => updateFilter("sendPost", e.target.value)}
                    >
                      <option value="true">
                        {legacyText(
                          "VouchersTable_Postal_delivery_only_3b7bf",
                        )}{" "}
                      </option>
                      <option value="all">
                        {legacyText("VouchersTable_All_orders_e6909")}{" "}
                      </option>
                      <option value="false">
                        {legacyText(
                          "VouchersTable_Without_postal_delivery_e1788",
                        )}{" "}
                      </option>
                    </FilterSelect>
                  </div>

                  <div>
                    <FieldLabel>
                      {legacyText("VouchersTable_Custom_ID_bf59e")}{" "}
                    </FieldLabel>
                    <FilterInput
                      value={filters.userCustomId}
                      onChange={(e) =>
                        updateFilter("userCustomId", e.target.value)
                      }
                      placeholder={legacyText("VouchersTable_e_g_0023_929f2")}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      {legacyText("VouchersTable_Email_84add")}{" "}
                    </FieldLabel>
                    <FilterInput
                      type="email"
                      value={filters.userEmail}
                      onChange={(e) =>
                        updateFilter("userEmail", e.target.value)
                      }
                      placeholder="email@domena.cz"
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      {legacyText("VouchersTable_Product_dd3b8")}{" "}
                    </FieldLabel>
                    <FilterInput
                      value={filters.productType}
                      onChange={(e) =>
                        updateFilter("productType", e.target.value)
                      }
                      placeholder={legacyText(
                        "VouchersTable_Product_name_63c0f",
                      )}
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      {legacyText("VouchersTable_Status_bae7d")}{" "}
                    </FieldLabel>
                    <FilterSelect
                      value={filters.status}
                      onChange={(e) => updateFilter("status", e.target.value)}
                    >
                      <option value="">
                        {legacyText("VouchersTable_All_statuses_64051")}{" "}
                      </option>
                      {getStatusOptions(statusLabels).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </FilterSelect>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="
                        inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px]
                        border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black
                        transition-all duration-200
                        hover:border-[var(--unnamed-color-b3a292)] hover:text-[var(--unnamed-color-b3a292)]
                      "
                    >
                      <XMarkIcon className="h-4 w-4" />
                      {legacyText("VouchersTable_Clear_filters_41222")}{" "}
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="bg-white">
          {isLoadingCouponOrders && (
            <div className="px-4 py-8 text-center text-sm text-black/55 sm:px-6">
              {legacyText("VouchersTable_Loading_vouchers_eec52")}{" "}
            </div>
          )}

          {isError && (
            <div className="px-4 py-8 text-center text-sm text-red-600 sm:px-6">
              {legacyText(
                "VouchersTable_We_could_not_load_the_vouchers_bd8c3",
              )}{" "}
            </div>
          )}

          {!isLoadingCouponOrders && !isError && (
            <>
              <div className="border-b border-black/5 px-4 py-3 text-sm text-black/55 sm:px-6">
                {legacyText("VouchersTable_Showing_163d8")}{" "}
                <span className="font-medium text-black">
                  {couponOrders.length}
                </span>{" "}
                z <span className="font-medium text-black">{totalCount}</span>{" "}
                {legacyText("VouchersTable_orders_96584")}{" "}
                {totalPages > 1 && (
                  <span>
                    {" "}
                    {legacyText("VouchersTable__page_34ef9")} {currentPage} z{" "}
                    {totalPages}
                  </span>
                )}
              </div>

              <div className="max-h-[60vh] divide-y divide-black/5 overflow-y-auto overscroll-contain sm:hidden">
                {couponOrders.length > 0 ? (
                  couponOrders.map((order) => (
                    <div key={order._id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-black">
                            {order.productNameSnapshot || "—"}
                          </p>

                          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--unnamed-color-b3a292)]">
                            #{getShortId(order._id)}
                          </p>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleEditClick(order)}
                            className="
                              inline-flex shrink-0 items-center justify-center gap-1 rounded-[14px]
                              border border-black/10 bg-[#F7F5F2] px-3 py-2 text-xs font-medium text-black
                              transition-all duration-200
                              hover:border-[var(--unnamed-color-b3a292)] hover:text-[var(--unnamed-color-b3a292)]
                            "
                          >
                            <PencilIcon className="h-4 w-4" />
                            {translation["EDIT"][language]}
                          </button>
                        )}
                      </div>

                      <VoucherOrderRefundStatus order={order} />

                      <div className="mt-3 space-y-1.5 text-sm text-black/65">
                        <div>
                          <span className="font-medium text-black/80">
                            {legacyText("VouchersTable_Customer_5e0d7")}{" "}
                          </span>{" "}
                          {getCustomerName(order)}
                        </div>

                        <div>
                          <span className="font-medium text-black/80">
                            {legacyText("VouchersTable_Email_4c4e6")}{" "}
                          </span>{" "}
                          {order.email || "—"}
                        </div>

                        <div>
                          <span className="font-medium text-black/80">
                            {legacyText("VouchersTable_Quantity_fe2c3")}{" "}
                          </span>{" "}
                          {order.quantity || 0}
                        </div>

                        <div>
                          <span className="font-medium text-black/80">
                            {legacyText("VouchersTable_Delivery_4e854")}{" "}
                          </span>{" "}
                          {order.sendPost ? "Poštou" : "E-mailem"}
                        </div>

                        <div>
                          <span className="font-medium text-black/80">
                            {legacyText("VouchersTable_Status_11dc9")}{" "}
                          </span>{" "}
                          <span
                            className={`ml-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                              getDisplayStatus(order),
                            )}`}
                          >
                            {getStatusLabel(
                              getDisplayStatus(order),
                              statusLabels,
                            )}
                          </span>
                        </div>

                        {order.promoCodesSnapshot?.length > 0 && (
                          <div>
                            <span className="font-medium text-black/80">
                              {legacyText(
                                "VouchersTable_Promo_codes_9a9df",
                              )}{" "}
                            </span>{" "}
                            {order.promoCodesSnapshot.join(", ")}
                          </div>
                        )}

                        {order.sendPost && (
                          <div>
                            <span className="font-medium text-black/80">
                              {legacyText("VouchersTable_Address_303d9")}{" "}
                            </span>{" "}
                            {[order.street, order.city, order.postalCode]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-black/45">
                    {legacyText("VouchersTable_No_vouchers_found_95f3e")}{" "}
                  </div>
                )}
              </div>

              <div className="hidden max-h-[60vh] overflow-y-auto sm:block">
                <WorkspaceTable className="min-w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#FCFBF9]">
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_ID_89f89")}{" "}
                      </th>
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_Customer_0e857")}{" "}
                      </th>
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_Email_84add")}{" "}
                      </th>
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_Product_dd3b8")}{" "}
                      </th>
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_Qty_1e5ff")}{" "}
                      </th>
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_Delivery_9631a")}{" "}
                      </th>
                      <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                        {legacyText("VouchersTable_Status_bae7d")}{" "}
                      </th>
                      {isAdmin && (
                        <th className="border-b border-black/5 px-6 py-4 text-left text-xs uppercase tracking-[0.14em] text-black/55 font-medium">
                          {legacyText("VouchersTable_Actions_c3cd6")}{" "}
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {couponOrders.length > 0 ? (
                      couponOrders.map((order) => (
                        <tr
                          key={order._id}
                          className="transition-colors duration-150 hover:bg-[#F7F5F2]"
                        >
                          <td className="border-b border-black/5 px-6 py-4 text-sm font-medium text-black">
                            {getShortId(order._id)}
                          </td>

                          <td className="border-b border-black/5 px-6 py-4 text-sm text-black">
                            {getCustomerName(order)}
                          </td>

                          <td className="border-b border-black/5 px-6 py-4 text-sm text-black/70">
                            {order.email || "—"}
                          </td>

                          <td className="border-b border-black/5 px-6 py-4 text-sm text-black/70">
                            {order.productNameSnapshot || "—"}
                          </td>

                          <td className="border-b border-black/5 px-6 py-4 text-sm text-black/70">
                            {order.quantity || 0}
                          </td>

                          <td className="border-b border-black/5 px-6 py-4 text-sm text-black/70">
                            {order.sendPost ? "Poštou" : "E-mailem"}
                          </td>

                          <td className="border-b border-black/5 px-6 py-4 text-sm">
                            <VoucherOrderRefundStatus order={order} />
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(
                                getDisplayStatus(order),
                              )}`}
                            >
                              {getStatusLabel(
                                getDisplayStatus(order),
                                statusLabels,
                              )}
                            </span>
                          </td>

                          {isAdmin && (
                            <td className="border-b border-black/5 px-6 py-4 text-sm">
                              <button
                                type="button"
                                onClick={() => handleEditClick(order)}
                                className="font-medium text-black transition-colors duration-200 hover:text-[var(--unnamed-color-b3a292)]"
                              >
                                {translation["EDIT"][language]}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={isAdmin ? 8 : 7}
                          className="px-6 py-10 text-center text-sm text-black/45"
                        >
                          {legacyText(
                            "VouchersTable_No_vouchers_found_95f3e",
                          )}{" "}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </WorkspaceTable>
              </div>

              {totalPages > 1 && (
                <div className="border-t border-black/5 bg-[#FCFBF9] px-4 py-4 sm:px-6">
                  <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <p className="text-sm text-black/55">
                      {legacyText("VouchersTable_Page_fb062")}{" "}
                      <span className="font-medium text-black">
                        {currentPage}
                      </span>{" "}
                      z{" "}
                      <span className="font-medium text-black">
                        {totalPages}
                      </span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="
                          inline-flex min-h-[42px] items-center justify-center rounded-[16px]
                          border border-black/10 bg-white px-3 text-sm font-medium text-black
                          transition-all duration-200
                          hover:border-[var(--unnamed-color-b3a292)] hover:text-[var(--unnamed-color-b3a292)]
                          disabled:cursor-not-allowed disabled:opacity-40
                        "
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="
                          inline-flex min-h-[42px] items-center justify-center rounded-[16px]
                          border border-black/10 bg-white px-3 text-sm font-medium text-black
                          transition-all duration-200
                          hover:border-[var(--unnamed-color-b3a292)] hover:text-[var(--unnamed-color-b3a292)]
                          disabled:cursor-not-allowed disabled:opacity-40
                        "
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showConfirmModal && orderToUpdate && (
        <ConfirmationModal
          show={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setOrderToUpdate(null);
            setEditStatus("");
          }}
          onConfirm={handleStatusUpdate}
          title={legacyText("VouchersTable_Edit_voucher_status_6c496")}
          message={
            <div className="space-y-4 text-left">
              <p className="text-sm text-black/70">
                {legacyText("VouchersTable_Order_3c124")}{" "}
                <span className="font-medium text-black">
                  #{getShortId(orderToUpdate._id)}
                </span>
              </p>

              <p className="text-sm text-black/70">
                {legacyText("VouchersTable_Current_status_02d14")}{" "}
                <span className="font-medium text-black">
                  {getStatusLabel(orderToUpdate.status, statusLabels)}
                </span>
              </p>

              <div>
                <FieldLabel>
                  {legacyText("VouchersTable_New_status_660b4")}{" "}
                </FieldLabel>

                <FilterSelect
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  {getStatusOptions(statusLabels).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            </div>
          }
          confirmText="Uložit"
          cancelText="Zrušit"
          isLoading={isUpdatingStatus}
        />
      )}
    </>
  );
}
