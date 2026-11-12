"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";

import { useGetOrdersWithFiltersMutation } from "@/lib/features/orders/ordersApiSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { useGetUsersQuery } from "@/lib/features/users/usersApiSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { getDateAsString, getDateHourAsString } from "@/utils/utilityFunctions";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import Loader from "../loaders/Loader";
import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";

const INITIAL_FILTERS = {
  search: "",
  dateFrom: "",
  dateTo: "",
  userCustomId: "",
  userEmail: "",
  productType: "",
  status: "",
};

const PRODUCT_TYPES = [
  { value: "", label: "Všechny typy" },
  { value: "public-course", label: "Veřejný kurz" },
  { value: "private-course", label: "Soukromý kurz" },
  { value: "public-workshop", label: "Veřejný workshop" },
  { value: "private-workshop", label: "Soukromý workshop" },
  { value: "prolong", label: "Prolongace" },
  { value: "credit-voucher", label: "Kreditový voucher" },
  { value: "guest-increase", label: "Zvýšení hostů" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Všechny stavy" },
  { value: "pending_order", label: "Čeká se na platbu" },
  { value: "processing_order", label: "Zpracovává se" },
  { value: "processed_order", label: "Zpracováno" },
  { value: "failed_order", label: "Selhalo" },
];

const STATUS_LABELS = {
  pending_order: "Čeká se na platbu",
  processing_order: "Zpracovává se",
  processed_order: "Zpracováno",
  failed_order: "Selhalo",
};

const STATUS_STYLES = {
  pending_order: "border-[#d9a441]/25 bg-[#fff8e6] text-[#6d4b00]",
  processing_order: "border-[#3b82f6]/20 bg-[#eff6ff] text-[#1d4ed8]",
  processed_order: "border-[#16a34a]/20 bg-[#ecfdf3] text-[#166534]",
  failed_order: "border-[#dc2626]/20 bg-[#fef2f2] text-[#991b1b]",
};

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getUserDisplay = (user) => {
  if (!user) return "—";

  if (typeof user === "object") {
    return (
      user.customId ||
      user.email ||
      `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
      "—"
    );
  }

  return "—";
};

const getStatusLabel = (status) => STATUS_LABELS[status] || status || "—";

const getStatusColor = (status) =>
  STATUS_STYLES[status] || "border-[#d8d1ca] bg-[#f8f6f3] text-[#3f3a35]";

const getProductName = (product) => {
  if (!product?.name) return "Neznámý produkt";

  if (typeof product.name === "object") {
    return product.name.CZ || product.name.EN || "Neznámý produkt";
  }

  return product.name;
};

function FieldLabel({ children }) {
  return (
    <label className="mb-1.5 block font-medium text-[10px] uppercase tracking-[0.16em] text-[#3f3a35]">
      {children}
    </label>
  );
}

function TextField({ type = "text", value, onChange, placeholder = "", icon }) {
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
        placeholder={placeholder}
        className={classNames(
          "block h-12 w-full rounded-[16px] border border-[#d8d1ca] bg-white text-sm text-[#0f1113]",
          icon ? "pl-11 pr-4" : "px-4",
          "placeholder:text-[#8b8178]",
          "outline-none transition-all duration-200",
          "focus:border-[#0f1113] focus:ring-2 focus:ring-[#0f1113]/10",
        )}
      />
    </div>
  );
}

function SelectField({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="
        block h-12 w-full rounded-[16px] border border-[#d8d1ca] bg-white
        px-4 text-sm text-[#0f1113] outline-none transition-all duration-200
        focus:border-[#0f1113] focus:ring-2 focus:ring-[#0f1113]/10
      "
    >
      {children}
    </select>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center rounded-full border px-2.5 py-1",
        "font-medium text-[11px] uppercase tracking-[0.08em]",
        getStatusColor(status),
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function TableLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
      <div className="rounded-[18px] border border-[#d8d1ca] bg-white px-4 py-3 shadow-[0_16px_40px_rgba(15,17,19,0.08)]">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#d8d1ca] border-t-[#0f1113]" />
          <span className="text-sm font-medium text-[#0f1113]">
            Načítám objednávky…
          </span>
        </div>
      </div>
    </div>
  );
}

export default function OrdersTable() {
  const { id, isAdmin } = useSelector(selectCurrentUser);
  const activeLocationId = useSelector(selectActiveStudioId);

  const { isLoading: isLoadingProducts } = useGetProductsQuery();
  const { isLoading: isLoadingUsers } = useGetUsersQuery({ userId: id });

  const [
    getOrdersWithFilters,
    { data: ordersData, isLoading: isLoadingOrders },
  ] = useGetOrdersWithFiltersMutation();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [sortDateOrder, setSortDateOrder] = useState("desc");
  const [hasLoadedInitially, setHasLoadedInitially] = useState(false);

  const orders = ordersData?.orders || [];
  const totalPages = ordersData?.totalPages || 0;
  const totalCount = ordersData?.totalCount || 0;

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => String(value).trim() !== "");
  }, [filters]);

  const fetchOrders = useCallback(
    async (
      page = 1,
      overrideFilters = appliedFilters,
      overrideSort = sortDateOrder,
    ) => {
      try {
        await getOrdersWithFilters({
          search: overrideFilters.search.trim(),
          dateFrom: overrideFilters.dateFrom || undefined,
          dateTo: overrideFilters.dateTo || undefined,
          userCustomId: overrideFilters.userCustomId.trim() || undefined,
          userEmail: overrideFilters.userEmail.trim() || undefined,
          productType: overrideFilters.productType || undefined,
          status: overrideFilters.status || undefined,
          locationId: activeLocationId || undefined,
          page,
          limit: 8,
          sortBy: "createdAt",
          sortOrder: overrideSort,
          isAdmin,
        }).unwrap();

        setCurrentPage(page);
        setHasLoadedInitially(true);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setHasLoadedInitially(true);
      }
    },
    [
      activeLocationId,
      appliedFilters,
      getOrdersWithFilters,
      isAdmin,
      sortDateOrder,
    ],
  );

  useEffect(() => {
    fetchOrders(1, INITIAL_FILTERS, "desc");
  }, [fetchOrders]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters(filters);
    fetchOrders(1, filters, sortDateOrder);
  }, [fetchOrders, filters, sortDateOrder]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      handleApplyFilters();
    },
    [handleApplyFilters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    fetchOrders(1, INITIAL_FILTERS, sortDateOrder);
  }, [fetchOrders, sortDateOrder]);

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage >= 1 && newPage <= (totalPages || 1)) {
        fetchOrders(newPage);
      }
    },
    [fetchOrders, totalPages],
  );

  const toggleSortDateOrder = useCallback(() => {
    const nextOrder = sortDateOrder === "asc" ? "desc" : "asc";
    setSortDateOrder(nextOrder);
    fetchOrders(1, appliedFilters, nextOrder);
  }, [appliedFilters, fetchOrders, sortDateOrder]);

  const paginationNumbers = useMemo(() => {
    if (totalPages <= 0) return [];

    const count = Math.min(5, totalPages);

    return Array.from({ length: count }, (_, index) => {
      if (totalPages <= 5) return index + 1;
      if (currentPage <= 3) return index + 1;
      if (currentPage >= totalPages - 2) return totalPages - 4 + index;
      return currentPage - 2 + index;
    });
  }, [currentPage, totalPages]);

  const isInitialPageLoading =
    !hasLoadedInitially || isLoadingProducts || isLoadingUsers;

  if (isInitialPageLoading) return <Loader />;

  return (
    <div className="bg-white text-[#0f1113]">
      <div className="space-y-4 p-3 sm:p-4 lg:p-5">
        <section className="overflow-hidden rounded-[26px] border border-[#d8d1ca] bg-white shadow-[0_18px_50px_rgba(15,17,19,0.045)]">
          <div className="border-b border-[#e7e1db] px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-medium text-[10px] uppercase tracking-[0.18em] text-[#3f3a35]">
                  Orders
                </p>

                <h3 className="mt-1 font-medium text-xl tracking-tight text-[#0f1113] sm:text-2xl">
                  Správa objednávek
                </h3>

                <p className="mt-1 text-sm leading-6 text-[#4b4540]">
                  Vyhledejte objednávku podle ID nebo použijte rozšířené filtry.
                </p>
              </div>

              <div className="rounded-full border border-[#d8d1ca] bg-[#f8f6f3] px-3.5 py-1.5 font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                {totalCount} objednávek
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
                <div className="min-w-0 flex-[1.8]">
                  <TextField
                    value={filters.search}
                    onChange={(event) =>
                      updateFilter("search", event.target.value)
                    }
                    placeholder="Vyhledat podle Order ID"
                    icon={
                      <MagnifyingGlassIcon className="h-5 w-5 text-[#3f3a35]" />
                    }
                  />
                </div>

                <div className="flex shrink-0 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className={classNames(
                      "inline-flex h-12 items-center justify-center gap-2 rounded-[16px] border px-4",
                      "font-medium text-sm transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f1113]/15",
                      showFilters
                        ? "border-[#0f1113] bg-[#0f1113] text-white"
                        : "border-[#d8d1ca] bg-white text-[#0f1113] hover:border-[#0f1113] hover:bg-[#f8f6f3]",
                    )}
                    aria-label="Zobrazit filtry"
                  >
                    <FunnelIcon className="h-5 w-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={isLoadingOrders}
                    className="
                      inline-flex h-12 min-w-[132px] items-center justify-center rounded-[16px]
                      bg-[#0f1113] px-6 font-medium text-sm text-white transition-all duration-200
                      hover:bg-[#24282c] disabled:cursor-not-allowed disabled:opacity-60
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f1113]/15
                    "
                  >
                    {isLoadingOrders ? "Hledám…" : "Hledat"}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="mt-5 rounded-[22px] border border-[#d8d1ca] bg-[#f8f6f3] p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <FieldLabel>Od data</FieldLabel>
                      <TextField
                        type="date"
                        value={filters.dateFrom}
                        onChange={(event) =>
                          updateFilter("dateFrom", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel>Do data</FieldLabel>
                      <TextField
                        type="date"
                        value={filters.dateTo}
                        onChange={(event) =>
                          updateFilter("dateTo", event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <FieldLabel>Custom ID uživatele</FieldLabel>
                      <TextField
                        value={filters.userCustomId}
                        onChange={(event) =>
                          updateFilter("userCustomId", event.target.value)
                        }
                        placeholder="Custom ID"
                      />
                    </div>

                    <div>
                      <FieldLabel>Email uživatele</FieldLabel>
                      <TextField
                        type="email"
                        value={filters.userEmail}
                        onChange={(event) =>
                          updateFilter("userEmail", event.target.value)
                        }
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <FieldLabel>Typ produktu</FieldLabel>
                      <SelectField
                        value={filters.productType}
                        onChange={(event) =>
                          updateFilter("productType", event.target.value)
                        }
                      >
                        {PRODUCT_TYPES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>

                    <div>
                      <FieldLabel>Status</FieldLabel>
                      <SelectField
                        value={filters.status}
                        onChange={(event) =>
                          updateFilter("status", event.target.value)
                        }
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-5 flex justify-end">
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="
                          inline-flex h-11 items-center justify-center gap-2 rounded-[15px]
                          border border-[#d8d1ca] bg-white px-4 font-medium text-sm text-[#0f1113]
                          transition-all duration-200 hover:border-[#0f1113] hover:bg-[#f8f6f3]
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f1113]/15
                        "
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Vymazat filtry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[26px] border border-[#d8d1ca] bg-white shadow-[0_18px_50px_rgba(15,17,19,0.045)]">
          {isLoadingOrders && hasLoadedInitially ? (
            <TableLoadingOverlay />
          ) : null}

          <div className="border-b border-[#e7e1db] bg-[#fbfaf8] px-4 py-4 sm:px-6">
            <p className="text-sm text-[#4b4540]">
              Zobrazeno{" "}
              <span className="font-medium text-[#0f1113]">
                {orders.length}
              </span>{" "}
              z <span className="font-medium text-[#0f1113]">{totalCount}</span>{" "}
              objednávek
              {totalPages > 1 && (
                <span className="ml-2">
                  Strana {currentPage} z {totalPages}
                </span>
              )}
            </p>
          </div>

          <div className="max-h-[60vh] divide-y divide-[#e7e1db] overflow-y-auto overscroll-contain sm:hidden">
            {orders.length > 0 ? (
              orders.map((order) => {
                const user = order.createdBy;
                const cart = order.cart;
                const cartItems = cart?.cartItems || [];

                return (
                  <div key={order._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#0f1113]">
                          {getDateAsString(order.createdAt)}{" "}
                          {getDateHourAsString(order.createdAt)}
                        </p>

                        <p className="mt-1 break-all font-medium text-[10px] uppercase tracking-[0.14em] text-[#4b4540]">
                          {order._id}
                        </p>
                      </div>

                      <StatusBadge status={order.status} />
                    </div>

                    <div className="mt-4 space-y-3 rounded-[22px] border border-[#d8d1ca] bg-[#fbfaf8] p-4">
                      <div>
                        <p className="font-medium text-[10px] uppercase tracking-[0.14em] text-[#3f3a35]">
                          Uživatel
                        </p>
                        <p className="mt-1 text-sm text-[#0f1113]">
                          {getUserDisplay(user)}
                        </p>
                      </div>

                      <div>
                        <p className="font-medium text-[10px] uppercase tracking-[0.14em] text-[#3f3a35]">
                          Produkty
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#0f1113]">
                          {cartItems.length > 0
                            ? cartItems.map((item, index) => (
                                <span key={index}>
                                  {getProductName(item.product)}
                                  {item.quantity > 1 &&
                                    ` (${item.quantity}x${item.product?.price})`}
                                  {index < cartItems.length - 1 && ", "}
                                </span>
                              ))
                            : "—"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="font-medium text-[10px] uppercase tracking-[0.14em] text-[#3f3a35]">
                            Cena
                          </p>
                          <p className="mt-1 text-sm text-[#0f1113]">
                            {formatMajorCurrencyAmount(
                              cart?.totalPrice || 0,
                              order.currency ||
                                cart?.currency ||
                                cartItems[0]?.product?.currency ||
                                DEFAULT_STUDIO_COMMERCE_CURRENCY,
                              "cs-CZ",
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="font-medium text-[10px] uppercase tracking-[0.14em] text-[#3f3a35]">
                            Zaplaceno
                          </p>
                          <p className="mt-1 text-sm text-[#0f1113]">
                            {order.isPaid ? "Ano" : "Ne"}
                            {order.paidAt
                              ? ` · ${getDateAsString(order.paidAt)}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-12 text-center text-sm text-[#4b4540]">
                Žádné objednávky nenalezeny.
              </div>
            )}
          </div>

          <div className="hidden max-h-[60vh] overflow-y-auto sm:block">
            <WorkspaceTable className="min-w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#fbfaf8]">
                  <th className="border-b border-[#e7e1db] px-6 py-4 text-left font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                    <button
                      type="button"
                      onClick={toggleSortDateOrder}
                      className="inline-flex items-center gap-1 text-[#3f3a35] transition-colors duration-200 hover:text-[#0f1113]"
                    >
                      <span>Datum</span>
                      {sortDateOrder === "asc" ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>

                  <th className="border-b border-[#e7e1db] px-6 py-4 text-left font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                    Uživatel
                  </th>

                  <th className="border-b border-[#e7e1db] px-6 py-4 text-left font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                    Produkty
                  </th>

                  <th className="border-b border-[#e7e1db] px-6 py-4 text-left font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                    Status
                  </th>

                  <th className="border-b border-[#e7e1db] px-6 py-4 text-left font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                    Cena
                  </th>

                  <th className="border-b border-[#e7e1db] px-6 py-4 text-left font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                    Zaplaceno
                  </th>
                </tr>
              </thead>

              <tbody>
                {orders.length > 0 ? (
                  orders.map((order) => {
                    const user = order.createdBy;
                    const cart = order.cart;
                    const cartItems = cart?.cartItems || [];

                    return (
                      <tr
                        key={order._id}
                        className="transition-colors duration-150 hover:bg-[#f8f6f3]"
                      >
                        <td className="border-b border-[#eee8e2] px-6 py-4 text-sm text-[#3f3a35]">
                          {getDateAsString(order.createdAt)}{" "}
                          {getDateHourAsString(order.createdAt)}
                        </td>

                        <td className="border-b border-[#eee8e2] px-6 py-4 text-sm font-medium text-[#0f1113]">
                          {getUserDisplay(user)}
                        </td>

                        <td className="border-b border-[#eee8e2] px-6 py-4 text-sm leading-6 text-[#3f3a35]">
                          {cartItems.length > 0
                            ? cartItems.map((item, index) => (
                                <span key={index}>
                                  {getProductName(item.product)}
                                  {item.quantity > 1 &&
                                    ` (${item.quantity}x${item.product?.price})`}
                                  {index < cartItems.length - 1 && ", "}
                                </span>
                              ))
                            : "—"}
                        </td>

                        <td className="border-b border-[#eee8e2] px-6 py-4 text-sm">
                          <StatusBadge status={order.status} />
                        </td>

                        <td className="border-b border-[#eee8e2] px-6 py-4 text-sm font-medium text-[#0f1113]">
                          {formatMajorCurrencyAmount(
                            cart?.totalPrice || 0,
                            order.currency ||
                              cart?.currency ||
                              cartItems[0]?.product?.currency ||
                              DEFAULT_STUDIO_COMMERCE_CURRENCY,
                            "cs-CZ",
                          )}
                        </td>

                        <td className="border-b border-[#eee8e2] px-6 py-4 text-sm text-[#3f3a35]">
                          {order.isPaid ? "Ano" : "Ne"}
                          {order.paidAt && (
                            <span className="block text-xs text-[#6f655d]">
                              {getDateAsString(order.paidAt)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-[#4b4540]"
                    >
                      Žádné objednávky nenalezeny.
                    </td>
                  </tr>
                )}
              </tbody>
            </WorkspaceTable>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-[#e7e1db] bg-[#fbfaf8] px-4 py-4 sm:px-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="text-sm text-[#4b4540]">
                  Strana{" "}
                  <span className="font-medium text-[#0f1113]">
                    {currentPage}
                  </span>{" "}
                  z{" "}
                  <span className="font-medium text-[#0f1113]">
                    {totalPages}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="
                      inline-flex h-11 w-11 items-center justify-center rounded-[14px]
                      border border-[#d8d1ca] bg-white text-[#0f1113] transition-all duration-200
                      hover:border-[#0f1113] hover:bg-[#f8f6f3]
                      disabled:cursor-not-allowed disabled:opacity-40
                    "
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>

                  <div className="hidden items-center gap-1 sm:flex">
                    {paginationNumbers.map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={classNames(
                          "inline-flex h-11 min-w-[44px] items-center justify-center rounded-[14px] border px-3 text-sm font-medium transition-all duration-200",
                          currentPage === pageNum
                            ? "border-[#0f1113] bg-[#0f1113] text-white"
                            : "border-[#d8d1ca] bg-white text-[#0f1113] hover:border-[#0f1113] hover:bg-[#f8f6f3]",
                        )}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="
                      inline-flex h-11 w-11 items-center justify-center rounded-[14px]
                      border border-[#d8d1ca] bg-white text-[#0f1113] transition-all duration-200
                      hover:border-[#0f1113] hover:bg-[#f8f6f3]
                      disabled:cursor-not-allowed disabled:opacity-40
                    "
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
