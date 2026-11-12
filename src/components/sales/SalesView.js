"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import { Link, useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";
import { useCreateInvoiceFromOrderMutation } from "@/lib/features/invoices/invoicesApiSlice";
import {
  getLocationId,
  getPrimaryLocation,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { useGetOrdersWithFiltersMutation } from "@/lib/features/orders/ordersApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

import OrderDetailsDialog from "./OrderDetailsDialog";
import OrdersCatalog from "./OrdersCatalog";
import SalesOverview from "./SalesOverview";
import SalesPeriodControls from "./SalesPeriodControls";
import SalesToolbar from "./SalesToolbar";
import { formatSalesPeriod, getSalesPeriod } from "./sales-period.utils";
import {
  downloadOrdersCsv,
  formatMoney,
  getBackendStatus,
  getOrderCurrency,
  getOrderId,
  getOrderStatusKey,
  getOrderTotal,
  isPendingSubgroup,
} from "./sales.utils";

const DEFAULT_PAGE_SIZE = 5;

const INITIAL_FILTERS = {
  dateRange: "30",
  dateFrom: "",
  dateTo: "",
  userCustomId: "",
  userEmail: "",
  productType: "",
};

const emptyPage = {
  orders: [],
  totalCount: 0,
  totalPages: 1,
};

const normalizeOrdersPage = (data) => ({
  orders: Array.isArray(data?.orders) ? data.orders : [],
  totalCount: Number(data?.totalCount || 0),
  totalPages: Math.max(Number(data?.totalPages || 0), 1),
});

const fetchAllPages = async ({ trigger, query, maxPages = 100 }) => {
  const firstPage = normalizeOrdersPage(
    await trigger({ ...query, page: 1, limit: 100 }).unwrap(),
  );
  const orders = [...firstPage.orders];
  const pageCount = Math.min(firstPage.totalPages, maxPages);

  for (let page = 2; page <= pageCount; page += 1) {
    const nextPage = normalizeOrdersPage(
      await trigger({ ...query, page, limit: 100 }).unwrap(),
    );
    orders.push(...nextPage.orders);
  }

  return {
    orders,
    totalCount: firstPage.totalCount,
    isTruncated: firstPage.totalPages > pageCount,
  };
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

export default function SalesView({ showPageHeader = true }) {
  const locale = useLocale();
  const t = useTranslations("Sales");
  const router = useRouter();

  const currentUser = useSelector(selectCurrentUser) || {};
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const activeStudioId = useSelector(selectActiveStudioId);

  const locationsQuery = useGetLocationsQuery(
    { isActive: true, limit: 100 },
    { skip: !isAuthenticated },
  );

  const [loadOrders] = useGetOrdersWithFiltersMutation();
  const [loadSummary] = useGetOrdersWithFiltersMutation();
  const [loadExport, { isLoading: isExporting }] =
    useGetOrdersWithFiltersMutation();
  const [createInvoiceFromOrder, { isLoading: isCreatingInvoice }] =
    useCreateInvoiceFromOrderMutation();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [periodReferenceDate, setPeriodReferenceDate] = useState(
    () => new Date(),
  );
  const [activeStatus, setActiveStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [density, setDensity] = useState("comfortable");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageData, setPageData] = useState(emptyPage);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [detailOrder, setDetailOrder] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [summary, setSummary] = useState({
    orders: 0,
    revenue: 0,
    currency: null,
    revenueTruncated: false,
    awaitingPayment: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  const pageRequestRef = useRef(0);
  const canCreateInvoice =
    NATIVE_INVOICES_ENABLED &&
    hasPermission(workspaceAccess, PERMISSIONS.INVOICES_VIEW) &&
    hasPermission(workspaceAccess, PERMISSIONS.INVOICES_CREATE);

  const handleCreateInvoice = async (order) => {
    if (!canCreateInvoice) return;
    if (!window.confirm(t("details.confirmCreateInvoice"))) return;

    setNotice(null);
    try {
      await createInvoiceFromOrder({ orderId: getOrderId(order) }).unwrap();
      setDetailOrder(null);
      router.push("/app/finance/invoices");
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("notices.invoiceError")),
      });
    }
  };

  const studios = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );

  const activeStudio = useMemo(
    () =>
      studios.find((studio) => getLocationId(studio) === activeStudioId) ||
      getPrimaryLocation(studios) ||
      null,
    [activeStudioId, studios],
  );

  const studioName =
    activeStudio?.name || currentUser.tenantName || t("fallbackStudioName");

  const selectedStudioId =
    activeStudioId || getLocationId(activeStudio) || undefined;

  const loadErrorText = t("loadError");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
      setSelectedIds(new Set());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const period = useMemo(
    () => getSalesPeriod(filters, periodReferenceDate),
    [filters, periodReferenceDate],
  );
  const { dateFrom, dateTo } = period;
  const periodLabel = period.from
    ? formatSalesPeriod(period, locale)
    : t("period.allTime");

  const commonQuery = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      dateFrom,
      dateTo,
      userCustomId: filters.userCustomId.trim() || undefined,
      userEmail: filters.userEmail.trim() || undefined,
      productType: filters.productType || undefined,
      locationId: selectedStudioId,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [
      dateFrom,
      debouncedSearch,
      dateTo,
      filters.productType,
      filters.userCustomId,
      filters.userEmail,
      selectedStudioId,
    ],
  );

  useEffect(() => {
    if (!isAuthenticated || locationsQuery.isLoading) return undefined;

    const requestId = pageRequestRef.current + 1;
    pageRequestRef.current = requestId;
    let cancelled = false;

    const fetchPage = async () => {
      setIsPageLoading(true);
      setPageError("");
      setPageData(emptyPage);

      try {
        const status = getBackendStatus(activeStatus);

        if (isPendingSubgroup(activeStatus)) {
          const pendingResult = await fetchAllPages({
            trigger: loadOrders,
            query: { ...commonQuery, status },
            maxPages: 20,
          });
          const matchingOrders = pendingResult.orders.filter(
            (order) => getOrderStatusKey(order) === activeStatus,
          );
          const totalPages = Math.max(
            Math.ceil(matchingOrders.length / pageSize),
            1,
          );
          const safePage = Math.min(page, totalPages);
          const visibleOrders = matchingOrders.slice(
            (safePage - 1) * pageSize,
            safePage * pageSize,
          );

          if (!cancelled && requestId === pageRequestRef.current) {
            setPageData({
              orders: visibleOrders,
              totalCount: matchingOrders.length,
              totalPages,
            });
            if (safePage !== page) setPage(safePage);
          }
        } else {
          const response = normalizeOrdersPage(
            await loadOrders({
              ...commonQuery,
              status,
              page,
              limit: pageSize,
            }).unwrap(),
          );

          if (!cancelled && requestId === pageRequestRef.current) {
            setPageData(response);
            if (page > response.totalPages) setPage(response.totalPages);
          }
        }
      } catch (error) {
        if (!cancelled && requestId === pageRequestRef.current) {
          setPageError(getErrorMessage(error, loadErrorText));
        }
      } finally {
        if (!cancelled && requestId === pageRequestRef.current) {
          setIsPageLoading(false);
        }
      }
    };

    fetchPage();

    return () => {
      cancelled = true;
    };
  }, [
    activeStatus,
    commonQuery,
    isAuthenticated,
    loadErrorText,
    loadOrders,
    locationsQuery.isLoading,
    page,
    pageSize,
    retryToken,
  ]);

  useEffect(() => {
    if (!isAuthenticated || locationsQuery.isLoading) return undefined;

    let cancelled = false;

    const fetchSummary = async () => {
      setIsSummaryLoading(true);
      setSummaryError(false);
      const summaryQuery = {
        dateFrom,
        dateTo,
        locationId: selectedStudioId,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      try {
        const [allResult, pendingResult, completedResult, failedResult] =
          await Promise.all([
            fetchAllPages({
              trigger: loadSummary,
              query: summaryQuery,
              maxPages: 10,
            }),
            fetchAllPages({
              trigger: loadSummary,
              query: { ...summaryQuery, status: "pending_order" },
              maxPages: 10,
            }),
            loadSummary({
              ...summaryQuery,
              status: "processed_order",
              page: 1,
              limit: 1,
            }).unwrap(),
            loadSummary({
              ...summaryQuery,
              status: "failed_order",
              page: 1,
              limit: 1,
            }).unwrap(),
          ]);

        if (cancelled) return;

        const pendingGroups = pendingResult.orders.reduce(
          (counts, order) => {
            const key = getOrderStatusKey(order);
            if (key in counts) counts[key] += 1;
            return counts;
          },
          { awaitingPayment: 0, processing: 0 },
        );

        setSummary({
          orders: allResult.totalCount,
          revenue: allResult.orders
            .filter((order) => order?.isPaid)
            .reduce((total, order) => total + getOrderTotal(order), 0),
          currency: allResult.orders.some((order) => order?.isPaid)
            ? getOrderCurrency(allResult.orders.find((order) => order?.isPaid))
            : null,
          revenueTruncated: allResult.isTruncated,
          awaitingPayment: pendingGroups.awaitingPayment,
          processing: pendingGroups.processing,
          completed: Number(completedResult?.totalCount || 0),
          failed: Number(failedResult?.totalCount || 0),
        });
      } catch {
        if (!cancelled) setSummaryError(true);
      } finally {
        if (!cancelled) setIsSummaryLoading(false);
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [
    dateFrom,
    dateTo,
    isAuthenticated,
    loadSummary,
    locationsQuery.isLoading,
    retryToken,
    selectedStudioId,
  ]);

  const counts = useMemo(
    () => ({
      all: summary.orders,
      awaitingPayment: summary.awaitingPayment,
      processing: summary.processing,
      completed: summary.completed,
      failed: summary.failed,
    }),
    [summary],
  );

  const overviewStats = useMemo(
    () => ({
      revenue: `${summary.revenueTruncated ? "≥ " : ""}${formatMoney(
        summary.revenue,
        summary.currency ||
          currentTenant?.settings?.currency ||
          DEFAULT_STUDIO_COMMERCE_CURRENCY,
        locale,
      )}`,
      orders: summary.orders,
      awaitingPayment: summary.awaitingPayment,
      failed: summary.failed,
    }),
    [currentTenant?.settings?.currency, locale, summary],
  );

  const handleStatusChange = useCallback((status) => {
    setActiveStatus(status);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handlePeriodChange = useCallback((nextPeriod) => {
    setFilters((current) => ({ ...current, ...nextPeriod }));
    setPeriodReferenceDate(new Date());
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setPeriodReferenceDate(new Date());
    setSearch("");
    setDebouncedSearch("");
    setActiveStatus("all");
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const handleSelect = useCallback((orderId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((orders) => {
    setSelectedIds((current) => {
      const orderIds = orders.map(getOrderId);
      const allSelected = orderIds.every((orderId) => current.has(orderId));
      const next = new Set(current);

      orderIds.forEach((orderId) => {
        if (allSelected) next.delete(orderId);
        else next.add(orderId);
      });

      return next;
    });
  }, []);

  const handleCopy = useCallback(
    async (order) => {
      const orderId = getOrderId(order);

      try {
        await navigator.clipboard.writeText(orderId);
        setNotice({ type: "success", message: t("notices.copied") });
      } catch {
        setNotice({ type: "error", message: t("notices.copyError") });
      }
    },
    [t],
  );

  const handleExport = useCallback(async () => {
    try {
      let ordersToExport = pageData.orders.filter((order) =>
        selectedIds.has(getOrderId(order)),
      );

      if (!ordersToExport.length) {
        const result = await fetchAllPages({
          trigger: loadExport,
          query: {
            ...commonQuery,
            status: getBackendStatus(activeStatus),
          },
        });

        ordersToExport = isPendingSubgroup(activeStatus)
          ? result.orders.filter(
              (order) => getOrderStatusKey(order) === activeStatus,
            )
          : result.orders;
      }

      downloadOrdersCsv({ orders: ordersToExport, locale, t });
      setNotice({
        type: "success",
        message: t("notices.exported", { count: ordersToExport.length }),
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("notices.exportError")),
      });
    }
  }, [
    activeStatus,
    commonQuery,
    loadExport,
    locale,
    pageData.orders,
    selectedIds,
    t,
  ]);

  const rangeStart = pageData.totalCount ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, pageData.totalCount);

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <WorkspaceSectionHeader
          showTitle={showPageHeader}
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description", { studio: studioName })}
          actions={
            <>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || isPageLoading || Boolean(pageError)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[12px] font-semibold text-ink-soft transition hover:border-line-strong disabled:cursor-wait disabled:opacity-55"
              >
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                {isExporting ? t("exporting") : t("export")}
              </button>

              <Link
                href="/app/bookings/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                {t("newOrder")}
              </Link>
            </>
          }
        />

        {notice && (
          <div
            className={`rounded-[14px] border px-4 py-3 text-[12px] leading-5 ${
              notice.type === "error"
                ? "border-coral-200 bg-coral-50 text-terracotta-700"
                : "border-[#D7E6D0] bg-[#F0F6ED] text-[#3F6339]"
            }`}
            role="status"
          >
            {notice.message}
          </div>
        )}

        <SalesPeriodControls
          filters={filters}
          dateFrom={period.from}
          dateTo={period.to}
          periodLabel={periodLabel}
          onChange={handlePeriodChange}
          t={t}
        />

        <SalesOverview
          isLoading={isSummaryLoading}
          error={summaryError}
          onRetry={() => setRetryToken((current) => current + 1)}
          stats={overviewStats}
          onStatusChange={handleStatusChange}
          t={t}
        />

        <SalesToolbar
          activeStatus={activeStatus}
          counts={isSummaryLoading || summaryError ? null : counts}
          onStatusChange={handleStatusChange}
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((current) => !current)}
          density={density}
          onDensityChange={setDensity}
          selectedCount={selectedIds.size}
          t={t}
        />

        <div className="relative" aria-busy={isPageLoading}>
          {isPageLoading ? (
            <div
              className="flex min-h-52 items-center justify-center rounded-[20px] border border-line bg-white/65"
              role="status"
            >
              <span className="text-[12px] text-ink-soft">{t("updating")}</span>
            </div>
          ) : pageError ? (
            <div
              className="flex min-h-52 flex-col items-center justify-center rounded-[20px] border border-line bg-white p-6 text-center"
              role="alert"
            >
              <h2 className="text-[16px] font-semibold text-ink">
                {t("loadError")}
              </h2>
              <p className="mt-2 text-[12px] text-ink-muted">{pageError}</p>
              <button
                type="button"
                onClick={() => setRetryToken((current) => current + 1)}
                className="mt-4 min-h-11 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white"
              >
                {t("retry")}
              </button>
            </div>
          ) : (
            <OrdersCatalog
              orders={pageData.orders}
              locale={locale}
              density={density}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onView={setDetailOrder}
              onCopy={handleCopy}
              t={t}
            />
          )}
        </div>

        <footer className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink-muted">
            {t("pagination.showing", {
              from: rangeStart,
              to: rangeEnd,
              total: pageData.totalCount,
            })}
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setPage((current) => Math.max(current - 1, 1));
                }}
                disabled={page <= 1 || isPageLoading}
                aria-label={t("pagination.previous")}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white text-[#555553] transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="min-w-12 text-center text-[12px] font-semibold text-ink-soft">
                {page} / {pageData.totalPages}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setPage((current) =>
                    Math.min(current + 1, pageData.totalPages),
                  );
                }}
                disabled={page >= pageData.totalPages || isPageLoading}
                aria-label={t("pagination.next")}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white text-[#555553] transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <label className="flex items-center gap-2 text-[12px] text-ink-muted">
              <span className="hidden sm:inline">{t("pagination.rows")}</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                className="h-9 rounded-[10px] border border-line bg-white px-2.5 text-[12px] text-ink-soft outline-none focus:border-cobalt-500"
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </footer>
      </div>

      <OrderDetailsDialog
        order={detailOrder}
        locale={locale}
        onClose={() => setDetailOrder(null)}
        onCopy={handleCopy}
        canCreateInvoice={canCreateInvoice && Boolean(detailOrder?.isPaid)}
        isCreatingInvoice={isCreatingInvoice}
        onCreateInvoice={handleCreateInvoice}
        t={t}
      />
    </>
  );
}
