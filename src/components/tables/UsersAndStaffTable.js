"use client";

import { useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import NewLecturerForm from "@/components/forms/lecturers/NewLecturerForm";
import AlertModal from "@/components/modals/AlertModal";
import ConfirmationModal from "@/components/modals/ConformationModal";
import ErrorModal from "@/components/modals/ErrorModal";
import ResponsiveModal from "@/components/modals/ResponsiveModal";
import { WorkspaceTabPanel } from "@/components/dashboard/WorkspaceTabs";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import {
  useDeleteLecturerMutation,
  useGetAllLecturersQuery,
} from "@/lib/features/lecturers/lecturersApiSlice";
import { useGetUsersQuery } from "@/lib/features/users/usersApiSlice";
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
import {
  buildMembershipOptions,
  buildPeopleSummary,
  buildStaffRoleOptions,
  exportCustomersToCsv,
  exportStaffToCsv,
  filterCustomers,
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
      <div className="flex items-center gap-3 rounded-full border border-[#E7E4DE] bg-white px-4 py-3 shadow-[0_16px_45px_rgba(17,17,15,0.1)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary" />
        <span className="text-[11px] font-medium text-[#4F4F4F]">{label}</span>
      </div>
    </div>
  );
}

function QueryError({ message }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center px-6 py-12 text-center">
      <p className="max-w-md text-[11px] leading-5 text-[#B54B36]">{message}</p>
    </div>
  );
}

export default function UsersAndStaffTable({
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
}) {
  const locale = useLocale();
  const t = useTranslations("People");
  const currentUser = useSelector(selectCurrentUser) || {};
  const userId = currentUser.id || currentUser._id;
  const { canDeleteStaff } = getTenantAccess(currentUser);
  const usersQuery = useGetUsersQuery(
    { userId, tenantRole: "customer" },
    { skip: !userId, refetchOnMountOrArgChange: true },
  );
  const staffQuery = useGetAllLecturersQuery(
    { userId },
    { skip: !userId || !showStaff },
  );
  const [deleteLecturer, { isLoading: isDeletingStaff }] =
    useDeleteLecturerMutation();

  const [activeTab, setActiveTab] = useState("customers");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [pages, setPages] = useState({ customers: 1, staff: 1 });
  const [pageSizes, setPageSizes] = useState({
    customers: DEFAULT_PAGE_SIZE,
    staff: DEFAULT_PAGE_SIZE,
  });
  const [selectedCustomerIds, setSelectedCustomerIds] = useState(
    () => new Set(),
  );

  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [staffError, setStaffError] = useState(null);

  const customers = useMemo(
    () =>
      normalizeCollection(usersQuery.data, [
        "users",
        "customers",
        "items",
        "data",
      ]),
    [usersQuery.data],
  );
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

  const summary = useMemo(
    () => buildPeopleSummary({ usersData: usersQuery.data, customers }),
    [customers, usersQuery.data],
  );
  const membershipOptions = useMemo(
    () => buildMembershipOptions(customers),
    [customers],
  );
  const roleOptions = useMemo(
    () =>
      buildStaffRoleOptions(staff).map((role) => ({
        value: role,
        label: translateValue(t, `roles.${role}`, humanizeValue(role)),
      })),
    [staff, t],
  );

  const filteredCustomers = useMemo(
    () => filterCustomers(customers, filters.customers),
    [customers, filters.customers],
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

  const activeList =
    activeTab === "customers" ? filteredCustomers : filteredStaff;
  const activePageSize = pageSizes[activeTab];
  const totalPages = Math.ceil(activeList.length / activePageSize);
  const activePage = Math.min(pages[activeTab], Math.max(totalPages, 1));
  const visibleItems = activeList.slice(
    (activePage - 1) * activePageSize,
    activePage * activePageSize,
  );
  const activeQuery = activeTab === "customers" ? usersQuery : staffQuery;
  const activeFilters = filters[activeTab];
  const activeFilterCount = Object.entries(activeFilters).filter(
    ([key, value]) => key !== "search" && String(value || "").trim(),
  ).length;

  const selectedCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        selectedCustomerIds.has(String(getId(customer))),
      ),
    [customers, selectedCustomerIds],
  );

  const updateFilter = useCallback((tab, key, value) => {
    setFilters((previous) => ({
      ...previous,
      [tab]: { ...previous[tab], [key]: value },
    }));
    setPages((previous) => ({ ...previous, [tab]: 1 }));
    if (tab === "customers") setSelectedCustomerIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((previous) => ({
      ...previous,
      [activeTab]: INITIAL_FILTERS[activeTab],
    }));
    setPages((previous) => ({ ...previous, [activeTab]: 1 }));
    if (activeTab === "customers") setSelectedCustomerIds(new Set());
  }, [activeTab]);

  const changeTab = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedCustomerIds(new Set());
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

  const toggleCustomer = useCallback((id) => {
    setSelectedCustomerIds((previous) => {
      const next = new Set(previous);
      const normalizedId = String(id);
      if (next.has(normalizedId)) next.delete(normalizedId);
      else next.add(normalizedId);
      return next;
    });
  }, []);

  const toggleAllVisibleCustomers = useCallback(() => {
    setSelectedCustomerIds((previous) => {
      const next = new Set(previous);
      const visibleIds = visibleItems.map((customer) =>
        String(getId(customer)),
      );
      const allSelected = visibleIds.every((id) => next.has(id));

      visibleIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });

      return next;
    });
  }, [visibleItems]);

  const handleExport = useCallback(() => {
    if (activeTab === "customers") {
      exportCustomersToCsv({ customers: filteredCustomers, locale, t });
      return;
    }

    exportStaffToCsv({ staff: filteredStaff, locale, t });
  }, [activeTab, filteredCustomers, filteredStaff, locale, t]);

  const handleExportSelected = useCallback(() => {
    exportCustomersToCsv({ customers: selectedCustomers, locale, t });
  }, [locale, selectedCustomers, t]);

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
        error?.data?.message ||
          error?.message ||
          t("modals.staffDeleteErrorText"),
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
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.addCustomer")}
        </button>
      ) : addCustomerHref ? (
        <Link
          href={addCustomerHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.addCustomer")}
        </Link>
      ) : null
    ) : (
      <button
        type="button"
        onClick={() => setShowCreateStaff(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-primary px-5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgb(var(--skab-blue-rgb)/0.2)] transition hover:-translate-y-0.5 hover:bg-skab-cobalt-600"
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
                <p className="mt-1 text-[12px] text-[#73726D]">
                  {t("subtitle")}
                </p>
              </div>
            ) : null}
            {showCreateButton && primaryAction}
          </div>
        )}

        <PeopleOverview summary={summary} locale={locale} t={t} />

        <section className="relative overflow-hidden rounded-[20px] border border-[#E7E4DE] bg-white shadow-[0_14px_38px_rgba(17,17,15,0.045)]">
          {activeQuery.isFetching && <LoadingOverlay label={t("loading")} />}

          <div
            className={`flex flex-col gap-2 border-b border-line px-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${showStaff ? "" : "py-3"}`}
          >
            <PeopleTabs
              activeTab={activeTab}
              counts={{ customers: customers.length, staff: staff.length }}
              tabs={showStaff ? ["customers", "staff"] : ["customers"]}
              t={t}
              onChange={changeTab}
            />
            {(showStaff || activeList.length !== customers.length) && (
              <p className="text-[12px] text-ink-muted">
                {t(`counts.${activeTab}`, { count: activeList.length })}
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
              search={activeFilters.search}
              status={activeFilters.status}
              membership={filters.customers.membership}
              role={filters.staff.role}
              membershipOptions={membershipOptions}
              roleOptions={roleOptions}
              activeFilterCount={activeFilterCount}
              total={activeList.length}
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

            {activeQuery.isError ? (
              <QueryError message={t(`errors.${activeTab}`)} />
            ) : activeTab === "customers" ? (
              <CustomersDataTable
                customers={visibleItems}
                selectedIds={selectedCustomerIds}
                locale={locale}
                t={t}
                getCustomerHref={getCustomerHref}
                onToggleRow={toggleCustomer}
                onToggleAll={toggleAllVisibleCustomers}
                onClearSelection={() => setSelectedCustomerIds(new Set())}
                onOpenCustomer={onOpenCustomer}
                onAddCredits={onAddCredits}
                onAddCreditsSelected={
                  onAddCreditsToCustomers
                    ? () => onAddCreditsToCustomers(selectedCustomers)
                    : undefined
                }
                onExportSelected={handleExportSelected}
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

            {!activeQuery.isError && (
              <PeoplePagination
                activeTab={activeTab}
                currentPage={activePage}
                pageSize={activePageSize}
                totalCount={activeList.length}
                totalPages={totalPages}
                t={t}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
              />
            )}
          </ContentPanel>
        </section>

        {showInsights && activeTab === "customers" && (
          <PeopleInsights
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
