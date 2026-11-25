"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import TableLoadingState from "@/components/loaders/TableLoadingState";
import NewLecturerForm from "@/components/forms/lecturers/NewLecturerForm";
import AlertModal from "@/components/modals/AlertModal";
import ConfirmationModal from "@/components/modals/ConformationModal";
import ErrorModal from "@/components/modals/ErrorModal";
import ResponsiveModal from "@/components/modals/ResponsiveModal";
import { WorkspaceTabPanel } from "@/components/dashboard/WorkspaceTabs";
import {
  getAuthCacheIdentity,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import {
  useDeleteLecturerMutation,
  useGetAllLecturersQuery,
} from "@/lib/features/lecturers/lecturersApiSlice";
import {
  useExportCustomerDirectoryMutation,
  useGetCustomerDirectoryQuery,
  useGetCustomerDirectorySummaryQuery,
} from "@/lib/features/users/customerDirectoryApiSlice";
import { Link } from "@/i18n/navigation";

import CustomersDataTable from "./people/CustomersDataTable";
import PeopleInsights from "./people/PeopleInsights";
import PeopleOverview from "./people/PeopleOverview";
import PeoplePagination from "./people/PeoplePagination";
import PeopleTabs, {
  PEOPLE_HEADING_ID,
  PEOPLE_TABS_ID,
} from "./people/PeopleTabs";
import PeopleToolbar from "./people/PeopleToolbar";
import StaffDataTable from "./people/StaffDataTable";
import { DEFAULT_PAGE_SIZE } from "./people/people-table.constants";
import { getCompleteCustomerExport } from "./people/customer-directory.utils";
import {
  EMPTY_FINANCIAL_FILTERS,
  countFinancialFilters,
  financialFiltersDiffer,
  hasSpendingPeriod,
  pickFinancialFilters,
  validateFinancialFilters,
} from "./people/customer-financial-filters.utils";
import { isStudioCommerceCurrency } from "@/config/currencies";
import {
  buildStaffRoleOptions,
  exportCustomersToCsv,
  exportStaffToCsv,
  getFullName,
  getId,
  getStaffRole,
  getStaffStatus,
  humanizeValue,
  normalizeCollection,
  translateValue,
} from "./people/people-table.utils";

const INITIAL_FILTERS = {
  customers: { search: "", membership: "", status: "" },
  staff: { search: "", role: "", status: "" },
};

const getTenantAccess = (user) => {
  const roles = [
    user?.tenantRole,
    user?.tenant_role,
    user?.role,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ]
    .filter(Boolean)
    .map((role) =>
      typeof role === "string" ? role.toUpperCase() : role?.name?.toUpperCase(),
    );

  const canDeleteStaff = Boolean(
    user?.isAdmin ||
    user?.isOwner ||
    roles.some((role) => ["OWNER", "ADMIN", "MANAGER"].includes(role)),
  );

  return { canDeleteStaff };
};

function LoadingOverlay({ label }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-canvas/65 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-3 shadow-[0_16px_45px_rgba(17,17,15,0.1)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
        <span className="text-[13px] font-medium text-ink-soft">{label}</span>
      </div>
    </div>
  );
}

function QueryError({ message }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-12 text-center">
      <p className="max-w-md text-[13px] leading-5 text-danger">{message}</p>
    </div>
  );
}

export default function UsersAndStaffTable(props) {
  const currentUser = useSelector(selectCurrentUser) || {};
  const cacheScope = useSelector(getAuthCacheIdentity);
  // Reset selection and export ownership on an auth/tenant boundary. Ordinary
  // token rotation for the same principal does not change this key.
  return (
    <PeopleDirectory
      key={cacheScope || "signed-out"}
      {...props}
      currentUser={currentUser}
      cacheScope={cacheScope}
    />
  );
}

function PeopleDirectory({
  showPageHeader = true,
  showCreateButton = true,
  showInsights = true,
  showStaff = true,
  addCustomerHref = null,
  insightsHref = null,
  getCustomerHref,
  getStaffHref,
  onAddCustomer,
  onOpenCustomer,
  onOpenStaff,
  onAddCredits,
  onAddCreditsToCustomers,
  currentUser,
  cacheScope,
}) {
  const locale = useLocale();
  const t = useTranslations("People");
  const userId = currentUser.id || currentUser._id;
  const { canDeleteStaff } = getTenantAccess(currentUser);
  const staffQuery = useGetAllLecturersQuery(
    { userId },
    { skip: !userId || !showStaff },
  );
  const [deleteLecturer, { isLoading: isDeletingStaff }] =
    useDeleteLecturerMutation();

  const [activeTab, setActiveTab] = useState("customers");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [financialDraft, setFinancialDraft] = useState(EMPTY_FINANCIAL_FILTERS);
  const [customerSearch, setCustomerSearch] = useState("");
  const [pages, setPages] = useState({ customers: 1, staff: 1 });
  const [pageSizes, setPageSizes] = useState({
    customers: DEFAULT_PAGE_SIZE,
    staff: DEFAULT_PAGE_SIZE,
  });
  const [selectedCustomersById, setSelectedCustomersById] = useState(
    () => new Map(),
  );
  const selectedCustomerIds = useMemo(
    () => new Set(selectedCustomersById.keys()),
    [selectedCustomersById],
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const exportRequest = useRef(null);
  const mounted = useRef(true);
  const [exportDirectory] = useExportCustomerDirectoryMutation();
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const searchPending = customerSearch !== filters.customers.search;
  const spendingPeriod = hasSpendingPeriod(filters.customers);

  useEffect(() => {
    if (!searchPending) return;
    const timer = setTimeout(() => {
      setFilters((previous) => ({
        ...previous,
        customers: { ...previous.customers, search: customerSearch },
      }));
      setPages((previous) => ({ ...previous, customers: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, searchPending]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      exportRequest.current?.abort?.();
    };
  }, []);

  const usersQuery = useGetCustomerDirectoryQuery(
    {
      cacheScope,
      page: pages.customers,
      limit: pageSizes.customers,
      ...filters.customers,
      ...(spendingPeriod ? { timeZone } : {}),
    },
    {
      skip: !cacheScope || activeTab !== "customers",
      refetchOnMountOrArgChange: 60,
    },
  );
  const summaryQuery = useGetCustomerDirectorySummaryQuery(
    { cacheScope, timeZone },
    { skip: !cacheScope, refetchOnMountOrArgChange: 60, refetchOnFocus: true },
  );
  // `data` can belong to the previous page/filter. Only currentData is safe
  // to label with this request's pagination and offer for row actions.
  const currentDirectory =
    searchPending || [401, 403].includes(usersQuery.error?.status)
      ? undefined
      : usersQuery.currentData;
  const lastCustomerPage = Math.max(1, currentDirectory?.totalPages || 1);
  const pageOutOfRange = Boolean(
    currentDirectory &&
    currentDirectory.currentPage === pages.customers &&
    pages.customers > lastCustomerPage,
  );
  useEffect(() => {
    if (!pageOutOfRange) return;
    setPages((previous) => ({ ...previous, customers: lastCustomerPage }));
  }, [pageOutOfRange, lastCustomerPage]);
  // A deletion can make the current page disappear. Fetch the actual last
  // page rather than relabeling an empty response with another page number.
  const directory = pageOutOfRange ? undefined : currentDirectory;
  const summaryData =
    summaryQuery.isError || [401, 403].includes(summaryQuery.error?.status)
      ? undefined
      : summaryQuery.currentData;
  const currency = isStudioCommerceCurrency(summaryData?.currency)
    ? summaryData.currency
    : null;
  const financialFiltersLoading =
    !summaryData || !isStudioCommerceCurrency(summaryData.currency);
  const spendingAvailable = summaryData?.spendingAvailable === true;
  const financialValidation = validateFinancialFilters(
    financialDraft,
    currency,
  );
  const financialFilterErrors = Object.fromEntries(
    Object.entries(financialValidation.errors).map(([key, error]) => [
      key,
      t(`errors.${error}`),
    ]),
  );
  const financialFiltersDirty = financialFiltersDiffer(
    financialDraft,
    filters.customers,
  );

  useEffect(() => {
    if (!summaryData || spendingAvailable) return;
    const spendingFields = ["spendMin", "spendMax", "spendFrom", "spendTo"];
    if (
      !spendingFields.some(
        (key) => filters.customers[key] || financialDraft[key],
      )
    )
      return;
    setFilters((previous) => ({
      ...previous,
      customers: Object.fromEntries(
        Object.entries(previous.customers).filter(
          ([key]) => !spendingFields.includes(key),
        ),
      ),
    }));
    setFinancialDraft((previous) => ({
      ...previous,
      spendMin: "",
      spendMax: "",
      spendFrom: "",
      spendTo: "",
    }));
    setPages((previous) => ({ ...previous, customers: 1 }));
    setSelectedCustomersById(new Map());
  }, [summaryData, spendingAvailable, filters.customers, financialDraft]);

  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [staffError, setStaffError] = useState(null);

  const customers = useMemo(
    () => normalizeCollection(directory, ["data"]),
    [directory],
  );
  useEffect(() => {
    setSelectedCustomersById((previous) => {
      let next = previous;
      for (const customer of customers) {
        const id = String(getId(customer));
        if (previous.has(id) && previous.get(id) !== customer) {
          if (next === previous) next = new Map(previous);
          next.set(id, customer);
        }
      }
      return next;
    });
  }, [customers]);
  const staff = useMemo(
    () =>
      normalizeCollection(staffQuery.data, [
        "staff",
        "lecturers",
        "members",
        "items",
        "data",
      ]),
    [staffQuery.data],
  );

  const membershipAvailable = summaryData?.membershipAvailable !== false;
  useEffect(() => {
    if (membershipAvailable || !filters.customers.membership) return;
    setFilters((previous) => ({
      ...previous,
      customers: { ...previous.customers, membership: "" },
    }));
    setPages((previous) => ({ ...previous, customers: 1 }));
    setSelectedCustomersById(new Map());
  }, [membershipAvailable, filters.customers.membership]);
  const summary = membershipAvailable
    ? summaryData?.summary || {}
    : { ...summaryData?.summary, activeMemberships: null };
  const membershipOptions = membershipAvailable
    ? summaryData?.membershipOptions || []
    : [];
  const roleOptions = useMemo(
    () =>
      buildStaffRoleOptions(staff).map((role) => ({
        value: role,
        label: translateValue(t, `roles.${role}`, humanizeValue(role)),
      })),
    [staff, t],
  );

  const filteredStaff = useMemo(() => {
    const currentFilters = filters.staff;
    const search = currentFilters.search.trim().toLowerCase();

    return staff.filter((member) => {
      const haystack = [
        getFullName(member),
        member?.email,
        member?.phone,
        member?.phoneNumber,
        member?.memberNumber,
        member?.customId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!search || haystack.includes(search)) &&
        (!currentFilters.role ||
          getStaffRole(member) === currentFilters.role) &&
        (!currentFilters.status ||
          getStaffStatus(member) === currentFilters.status)
      );
    });
  }, [filters.staff, staff]);

  const isCustomers = activeTab === "customers";
  const activeTotal = isCustomers
    ? directory?.totalCount || 0
    : filteredStaff.length;
  const activePageSize = pageSizes[activeTab];
  const totalPages = isCustomers
    ? directory?.totalPages || 1
    : Math.ceil(activeTotal / activePageSize);
  const activePage = isCustomers
    ? directory?.currentPage || pages.customers
    : Math.min(pages[activeTab], Math.max(totalPages, 1));
  const visibleItems = isCustomers
    ? customers
    : filteredStaff.slice(
        (activePage - 1) * activePageSize,
        activePage * activePageSize,
      );
  const activeQuery = activeTab === "customers" ? usersQuery : staffQuery;
  const activeFilters = filters[activeTab];
  const activeFilterCount = isCustomers
    ? Number(Boolean(activeFilters.membership)) +
      Number(Boolean(activeFilters.status)) +
      countFinancialFilters(activeFilters)
    : Object.entries(activeFilters).filter(
        ([key, value]) => key !== "search" && String(value ?? "").trim(),
      ).length;

  const selectedCustomers = useMemo(
    () => [...selectedCustomersById.values()],
    [selectedCustomersById],
  );

  const updateFilter = useCallback((tab, key, value) => {
    setExportError("");
    if (tab === "customers") setSelectedCustomersById(new Map());
    if (tab === "customers" && key === "search") {
      setCustomerSearch(value);
      return;
    }
    setFilters((previous) => ({
      ...previous,
      [tab]: { ...previous[tab], [key]: value },
    }));
    setPages((previous) => ({ ...previous, [tab]: 1 }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((previous) => ({
      ...previous,
      [activeTab]: INITIAL_FILTERS[activeTab],
    }));
    setPages((previous) => ({ ...previous, [activeTab]: 1 }));
    if (activeTab === "customers") {
      setCustomerSearch("");
      setFinancialDraft(EMPTY_FINANCIAL_FILTERS);
      setSelectedCustomersById(new Map());
    }
    setExportError("");
  }, [activeTab]);

  const updateFinancialFilter = (key, value) => {
    if (!Object.hasOwn(EMPTY_FINANCIAL_FILTERS, key)) return;
    setFinancialDraft((previous) => ({ ...previous, [key]: value }));
  };
  const applyFinancialFilters = () => {
    if (
      financialFiltersLoading ||
      Object.keys(financialValidation.errors).length
    )
      return;
    const values = {
      ...financialValidation.values,
      ...(!spendingAvailable
        ? { spendMin: "", spendMax: "", spendFrom: "", spendTo: "" }
        : {}),
    };
    setFilters((previous) => ({
      ...previous,
      customers: {
        search: customerSearch,
        membership: previous.customers.membership,
        status: previous.customers.status,
        ...Object.fromEntries(
          Object.entries(values).filter(([, value]) => value !== ""),
        ),
      },
    }));
    setFinancialDraft(pickFinancialFilters(values));
    setPages((previous) => ({ ...previous, customers: 1 }));
    setSelectedCustomersById(new Map());
    setExportError("");
  };

  const changeTab = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedCustomersById(new Map());
    setExportError("");
  }, []);

  const changePage = useCallback(
    (page) => {
      if (page < 1 || page > Math.max(totalPages, 1)) return;
      setPages((previous) => ({ ...previous, [activeTab]: page }));
    },
    [activeTab, totalPages],
  );

  const changePageSize = useCallback(
    (pageSize) => {
      setPageSizes((previous) => ({ ...previous, [activeTab]: pageSize }));
      setPages((previous) => ({ ...previous, [activeTab]: 1 }));
    },
    [activeTab],
  );

  const toggleCustomer = useCallback(
    (id) => {
      setSelectedCustomersById((previous) => {
        const next = new Map(previous);
        const normalizedId = String(id);
        if (next.has(normalizedId)) next.delete(normalizedId);
        else {
          const customer = customers.find(
            (row) => String(getId(row)) === normalizedId,
          );
          if (customer) next.set(normalizedId, customer);
        }
        return next;
      });
    },
    [customers],
  );

  const toggleAllVisibleCustomers = useCallback(() => {
    setSelectedCustomersById((previous) => {
      const next = new Map(previous);
      const visibleIds = visibleItems.map((customer) =>
        String(getId(customer)),
      );
      const allSelected = visibleIds.every((id) => next.has(id));

      visibleItems.forEach((customer) => {
        const id = String(getId(customer));
        if (allSelected) next.delete(id);
        else next.set(id, customer);
      });

      return next;
    });
  }, [visibleItems]);

  const runCustomerExport = useCallback(
    async (ids) => {
      if (
        exportRequest.current ||
        !cacheScope ||
        searchPending ||
        financialFiltersDirty ||
        financialFiltersLoading
      )
        return;
      setExporting(true);
      setExportError("");
      try {
        const request = exportDirectory({
          cacheScope,
          ...(ids
            ? {
                ids,
                ...(spendingPeriod
                  ? {
                      ...(filters.customers.spendFrom
                        ? { spendFrom: filters.customers.spendFrom }
                        : {}),
                      ...(filters.customers.spendTo
                        ? { spendTo: filters.customers.spendTo }
                        : {}),
                    }
                  : {}),
              }
            : filters.customers),
          ...(spendingPeriod ? { timeZone } : {}),
        });
        exportRequest.current = request;
        const response = await request.unwrap();
        const rows = getCompleteCustomerExport(response, ids);
        if (mounted.current)
          exportCustomersToCsv({
            customers: rows,
            locale,
            t,
            spendingPeriod,
            currency,
          });
      } catch {
        if (mounted.current) setExportError(t("errors.export"));
      } finally {
        exportRequest.current = null;
        if (mounted.current) setExporting(false);
      }
    },
    [
      cacheScope,
      searchPending,
      exportDirectory,
      filters.customers,
      locale,
      t,
      spendingPeriod,
      timeZone,
      currency,
      financialFiltersDirty,
      financialFiltersLoading,
    ],
  );

  const handleExport = useCallback(() => {
    if (activeTab === "customers") return runCustomerExport();
    exportStaffToCsv({ staff: filteredStaff, locale, t });
  }, [activeTab, runCustomerExport, filteredStaff, locale, t]);

  const handleExportSelected = useCallback(() => {
    if (selectedCustomerIds.size)
      return runCustomerExport([...selectedCustomerIds]);
  }, [runCustomerExport, selectedCustomerIds]);

  const handleDeleteStaff = useCallback(async () => {
    const staffId = getId(staffToDelete);
    if (!staffId) return;

    try {
      await deleteLecturer({
        id: staffId,
        userId,
        isAdmin: Boolean(currentUser.isAdmin),
      }).unwrap();
      setShowDeleteAlert(false);
      setStaffToDelete(null);
      setConfirmation({
        title: t("modals.staffDeletedTitle"),
        text: t("modals.staffDeletedText"),
      });
    } catch (error) {
      setShowDeleteAlert(false);
      setStaffError(
        getLocalizedApiErrorMessage(error, t("modals.staffDeleteErrorText")),
      );
    }
  }, [currentUser.isAdmin, deleteLecturer, staffToDelete, t, userId]);

  const requestDeleteStaff = useCallback((member) => {
    setStaffToDelete(member);
    setShowDeleteAlert(true);
  }, []);

  const primaryAction =
    activeTab === "customers" ? (
      onAddCustomer ? (
        <button
          type="button"
          onClick={onAddCustomer}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.addCustomer")}
        </button>
      ) : addCustomerHref ? (
        <Link
          href={addCustomerHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.addCustomer")}
        </Link>
      ) : null
    ) : (
      <button
        type="button"
        onClick={() => setShowCreateStaff(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600"
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
        {t("actions.addStaff")}
      </button>
    );

  const ContentPanel = showStaff ? WorkspaceTabPanel : "section";

  return (
    <>
      <AlertModal
        open={showDeleteAlert}
        setOpen={setShowDeleteAlert}
        onSubmitClicked={handleDeleteStaff}
        title={t("modals.removeStaffTitle")}
        text={t("modals.removeStaffText", {
          name: getFullName(staffToDelete),
        })}
      />

      <ConfirmationModal
        open={Boolean(confirmation)}
        setOpen={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title || ""}
        text={confirmation?.text || ""}
      />

      <ErrorModal
        open={Boolean(staffError)}
        setOpen={(open) => {
          if (!open) setStaffError(null);
        }}
        error={staffError || ""}
        title={t("modals.staffErrorTitle")}
        text={t("modals.staffErrorText")}
      />

      <div className="space-y-5">
        {(showPageHeader || (showCreateButton && primaryAction)) && (
          <div
            className={
              showPageHeader
                ? "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
                : "flex justify-end"
            }
          >
            {showPageHeader ? (
              <div>
                <h1 className="text-[27px] font-medium tracking-[-0.045em] text-[#11110F] sm:text-[32px]">
                  {t("title")}
                </h1>
                <p className="mt-1 text-[13px] text-ink-muted">
                  {t("subtitle")}
                </p>
              </div>
            ) : null}
            {showCreateButton && primaryAction}
          </div>
        )}

        <PeopleOverview
          summary={summary}
          currency={currency}
          loading={!summaryData}
          locale={locale}
          t={t}
        />
        {summaryQuery.isError ? (
          <p role="alert" className="text-sm text-danger">
            {t("errors.summary")}{" "}
            <button
              type="button"
              onClick={summaryQuery.refetch}
              className="underline"
            >
              {t("profile.retry")}
            </button>
          </p>
        ) : null}
        {exportError ? (
          <p role="alert" className="text-sm text-danger">
            {exportError}
          </p>
        ) : null}

        <section className="relative overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.045)]">
          {!isCustomers && activeQuery.isFetching && (
            <LoadingOverlay label={t("loading")} />
          )}

          <div
            className={`flex flex-col gap-2 border-b border-line px-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${showStaff ? "" : "py-3"}`}
          >
            <PeopleTabs
              activeTab={activeTab}
              counts={{
                customers: summaryData ? summary.totalCustomers : "—",
                staff: staff.length,
              }}
              tabs={showStaff ? ["customers", "staff"] : ["customers"]}
              t={t}
              onChange={changeTab}
            />
            {(showStaff ||
              (directory && activeTotal !== summary.totalCustomers)) && (
              <p className="text-[13px] text-ink-muted">
                {t(`counts.${activeTab}`, { count: activeTotal })}
              </p>
            )}
          </div>

          <ContentPanel
            {...(showStaff
              ? { tabsId: PEOPLE_TABS_ID, tabId: activeTab }
              : { "aria-labelledby": PEOPLE_HEADING_ID })}
          >
            <PeopleToolbar
              activeTab={activeTab}
              search={isCustomers ? customerSearch : activeFilters.search}
              status={activeFilters.status}
              membership={filters.customers.membership}
              role={filters.staff.role}
              membershipOptions={membershipOptions}
              roleOptions={roleOptions}
              activeFilterCount={activeFilterCount}
              total={activeTotal}
              exportDisabled={
                isCustomers &&
                (exporting ||
                  searchPending ||
                  financialFiltersDirty ||
                  financialFiltersLoading ||
                  !directory)
              }
              exporting={isCustomers && exporting}
              membershipLoading={!summaryData || !membershipAvailable}
              financialFilters={financialDraft}
              financialFiltersDirty={financialFiltersDirty}
              financialFilterErrors={financialFilterErrors}
              financialFiltersLoading={financialFiltersLoading}
              spendingAvailable={spendingAvailable}
              currency={currency}
              onFinancialFilterChange={updateFinancialFilter}
              onApplyFinancialFilters={applyFinancialFilters}
              t={t}
              onSearchChange={(value) =>
                updateFilter(activeTab, "search", value)
              }
              onStatusChange={(value) =>
                updateFilter(activeTab, "status", value)
              }
              onMembershipChange={(value) =>
                updateFilter("customers", "membership", value)
              }
              onRoleChange={(value) => updateFilter("staff", "role", value)}
              onClearFilters={clearFilters}
              onExport={handleExport}
            />

            {isCustomers && spendingPeriod ? (
              <p className="border-b border-line px-5 py-3 text-[13px] text-ink-muted">
                {t("filters.spendingPeriodSummary", {
                  from: filters.customers.spendFrom || t("filters.allTime"),
                  to: filters.customers.spendTo || t("filters.allTime"),
                })}
              </p>
            ) : null}

            {isCustomers && directory && usersQuery.isFetching ? (
              <TableLoadingState refreshing label={t("profile.refreshing")} />
            ) : null}
            {isCustomers && directory && usersQuery.isError ? (
              <p role="alert" className="px-5 py-2 text-sm text-danger">
                {t("errors.customers")}{" "}
                <button
                  type="button"
                  onClick={usersQuery.refetch}
                  className="underline"
                >
                  {t("profile.retry")}
                </button>
              </p>
            ) : null}
            {isCustomers && !directory ? (
              usersQuery.isError && !searchPending ? (
                <div>
                  <QueryError message={t("errors.customers")} />
                  <button
                    type="button"
                    onClick={usersQuery.refetch}
                    className="mx-5 mb-5 underline"
                  >
                    {t("profile.retry")}
                  </button>
                </div>
              ) : (
                <TableLoadingState label={t("loading")} />
              )
            ) : !isCustomers && activeQuery.isError ? (
              <QueryError message={t("errors.staff")} />
            ) : activeTab === "customers" ? (
              <CustomersDataTable
                customers={visibleItems}
                selectedIds={selectedCustomerIds}
                locale={locale}
                spendingPeriod={spendingPeriod}
                currency={currency}
                t={t}
                getCustomerHref={getCustomerHref}
                onToggleRow={toggleCustomer}
                onToggleAll={toggleAllVisibleCustomers}
                onClearSelection={() => setSelectedCustomersById(new Map())}
                onOpenCustomer={onOpenCustomer}
                onAddCredits={onAddCredits}
                onAddCreditsSelected={
                  onAddCreditsToCustomers
                    ? () => onAddCreditsToCustomers(selectedCustomers)
                    : undefined
                }
                onExportSelected={handleExportSelected}
                exporting={exporting}
                exportDisabled={
                  searchPending ||
                  financialFiltersDirty ||
                  financialFiltersLoading
                }
              />
            ) : (
              <StaffDataTable
                staff={visibleItems}
                locale={locale}
                canDelete={canDeleteStaff}
                isDeleting={isDeletingStaff}
                t={t}
                getStaffHref={getStaffHref}
                onOpenStaff={onOpenStaff}
                onDelete={requestDeleteStaff}
              />
            )}

            {(isCustomers ? Boolean(directory) : !activeQuery.isError) && (
              <PeoplePagination
                activeTab={activeTab}
                currentPage={activePage}
                pageSize={activePageSize}
                totalCount={activeTotal}
                totalPages={totalPages}
                t={t}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
              />
            )}
          </ContentPanel>
        </section>

        {showInsights && activeTab === "customers" && summaryData && (
          <PeopleInsights
            currency={currency}
            summary={summary}
            locale={locale}
            t={t}
            insightsHref={insightsHref}
          />
        )}
      </div>

      <ResponsiveModal
        open={showCreateStaff}
        onClose={() => setShowCreateStaff(false)}
        title={t("modals.addStaffTitle")}
        maxWidthClass="sm:max-w-4xl"
      >
        <NewLecturerForm
          key={showCreateStaff ? "staff-create-open" : "staff-create-closed"}
          show={showCreateStaff}
          setShow={setShowCreateStaff}
          showConfirmation={(open) => {
            if (!open) return;
            setShowCreateStaff(false);
            setConfirmation({
              title: t("modals.staffCreatedTitle"),
              text: t("modals.staffCreatedText"),
            });
          }}
          showErrModal={(open) => {
            if (open) setStaffError(t("modals.staffCreateErrorText"));
          }}
          setErrMsg={setStaffError}
        />
      </ResponsiveModal>
    </>
  );
}
