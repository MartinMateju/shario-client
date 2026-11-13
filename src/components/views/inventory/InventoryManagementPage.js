"use client";

import { resolveIntlLocale } from "@/i18n/formatting";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useMemo, useState } from "react";
import { Dialog } from "@headlessui/react";
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PlusIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import {
  WorkspaceCard,
  WorkspaceTable,
  WorkspaceTableFrame,
  WorkspaceTableScroller,
} from "@/components/dashboard/WorkspaceDataSurface";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useCompleteInventoryAuditMutation,
  useCreateInventoryAuditMutation,
  useCreateInventoryItemMutation,
  useCreateInventoryMovementMutation,
  useCreateReorderRequestMutation,
  useGetInventoryAuditsQuery,
  useGetInventoryItemsQuery,
  useGetInventoryMovementsQuery,
  useGetReorderRequestsQuery,
  useLazyGetInventoryItemQuery,
  useUpdateInventoryAuditMutation,
  useUpdateInventoryItemMutation,
  useUpdateReorderRequestMutation,
} from "@/lib/features/inventory/inventoryApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getPrimaryLocation,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import {
  useCreateSupplierMutation,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from "@/lib/features/suppliers/suppliersApiSlice";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import {
  formatMajorCurrencyAmount,
  getMajorCurrencyInputStep,
} from "@/utils/money";

import {
  buildStockLevelsPayload,
  buildStockLevelThresholdsPayload,
  buildAuditUpdatePayload,
  createStockLevelForm,
  getAllowedReorderStatuses,
  getAuditFormItems,
  getInventoryItemName,
  getInventoryMinimum,
  getInventoryQuantity,
  getInventoryStockLevel,
  getReferenceId,
  INVENTORY_CATEGORIES,
  INVENTORY_PAGE_SIZE,
  INVENTORY_MOVEMENT_REASONS,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_TABS,
  INVENTORY_UNITS,
  isInventoryItemLowStock,
  normalizeInventoryCollection,
  normalizeInventoryPage,
  getSelectableSuppliers,
} from "./inventory.utils";
import {
  shouldOpenGuidedInventoryCreate,
  toggleInventoryItemAvailability,
} from "./inventoryGuided";

const TAB_ICONS = {
  items: ArchiveBoxIcon,
  movements: ArrowPathIcon,
  stocktakes: ClipboardDocumentCheckIcon,
  reorders: PlusIcon,
  suppliers: TruckIcon,
};
const INVENTORY_TABS_ID = "inventory-sections";

const controlClass =
  "h-11 w-full rounded-[13px] border border-line bg-white px-3.5 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[12px] font-semibold text-[#292925] transition hover:border-cobalt-200 hover:text-cobalt-700 disabled:cursor-not-allowed disabled:opacity-50";

const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

const getResultEntity = (result, key) => result?.[key] || result;

const getDateLocale = (locale) => resolveIntlLocale(locale);

export default function InventoryManagementPage({
  defaultSection,
  showPageHeader = true,
}) {
  const t = useTranslations("Inventory");
  const searchParams = useSearchParams();
  const guidedSetup = useGuidedSetupStep("inventory");
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);
  const activeStudioId = useSelector(selectActiveStudioId);
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canManageInventory = hasPermission(
    workspaceAccess,
    PERMISSIONS.INVENTORY_MANAGE,
  );
  const currency =
    currentTenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;

  const { data: locationsData, isLoading: locationsLoading } =
    useGetLocationsQuery({ isActive: true });
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsData),
    [locationsData],
  );
  const defaultLocationId = locations.some(
    (candidate) => candidate.id === activeStudioId,
  )
    ? activeStudioId
    : getPrimaryLocation(locations)?.id || "";

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const effectiveLocationId = selectedLocationId || defaultLocationId;
  const selectedLocation = locations.find(
    (location) => location.id === effectiveLocationId,
  );
  const locationsById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations],
  );

  const normalizedDefaultTab = INVENTORY_TABS.includes(defaultSection)
    ? defaultSection
    : "items";
  const [tabSelection, setTabSelection] = useState({
    source: defaultSection,
    active: normalizedDefaultTab,
  });
  const activeTab =
    tabSelection.source === defaultSection
      ? tabSelection.active
      : normalizedDefaultTab;
  const setActiveTab = (tab) =>
    setTabSelection({ source: defaultSection, active: tab });
  const [search, setSearch] = useState("");
  const [itemPage, setItemPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [reorderPage, setReorderPage] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [loadingItemId, setLoadingItemId] = useState("");
  const [showItemForm, setShowItemForm] = useState(() =>
    shouldOpenGuidedInventoryCreate({
      guided: guidedSetup.guided,
      setupStep: searchParams.get("setupStep"),
      action: searchParams.get("action"),
    }),
  );
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingAudit, setEditingAudit] = useState(null);
  const [receivingRequest, setReceivingRequest] = useState(null);
  const [showReorderForm, setShowReorderForm] = useState(false);
  const [notice, setNotice] = useState(null);

  const itemQuery = useGetInventoryItemsQuery({
    location: effectiveLocationId || undefined,
    search: search.trim() || undefined,
    page: itemPage,
    limit: INVENTORY_PAGE_SIZE,
  });
  const lowStockQuery = useGetInventoryItemsQuery({
    location: effectiveLocationId || undefined,
    lowStock: true,
    page: 1,
    limit: 1,
  });
  const movementQuery = useGetInventoryMovementsQuery({
    location: effectiveLocationId || undefined,
    page: movementPage,
    limit: INVENTORY_PAGE_SIZE,
  });
  const supplierQuery = useGetSuppliersQuery();
  const auditQuery = useGetInventoryAuditsQuery({
    location: effectiveLocationId || undefined,
    page: auditPage,
    limit: INVENTORY_PAGE_SIZE,
  });
  const reorderQuery = useGetReorderRequestsQuery({
    location: effectiveLocationId || undefined,
    page: reorderPage,
    limit: INVENTORY_PAGE_SIZE,
  });
  const openReorderQuery = useGetReorderRequestsQuery({
    location: effectiveLocationId || undefined,
    status: "open",
    page: 1,
    limit: 1,
  });
  const orderedReorderQuery = useGetReorderRequestsQuery({
    location: effectiveLocationId || undefined,
    status: "ordered",
    page: 1,
    limit: 1,
  });

  const itemResult = normalizeInventoryPage(itemQuery.data, "items");
  const movementResult = normalizeInventoryPage(
    movementQuery.data,
    "movements",
  );
  const auditResult = normalizeInventoryPage(auditQuery.data, "audits");
  const reorderResult = normalizeInventoryPage(reorderQuery.data, "requests");
  const lowStockResult = normalizeInventoryPage(lowStockQuery.data, "items");
  const openReorderResult = normalizeInventoryPage(
    openReorderQuery.data,
    "requests",
  );
  const orderedReorderResult = normalizeInventoryPage(
    orderedReorderQuery.data,
    "requests",
  );
  const activeReorderCount =
    openReorderResult.total + orderedReorderResult.total;
  const items = itemResult.records;
  const movements = movementResult.records;
  const suppliers = normalizeInventoryCollection(
    supplierQuery.data,
    "suppliers",
  );
  const audits = auditResult.records;
  const reorders = reorderResult.records;
  const itemsById = useMemo(
    () => new Map(items.map((item) => [getReferenceId(item), item])),
    [items],
  );

  const [createItem] = useCreateInventoryItemMutation();
  const [getInventoryItem] = useLazyGetInventoryItemQuery();
  const [updateItem, { isLoading: isUpdatingItem }] =
    useUpdateInventoryItemMutation();
  const [createMovement] = useCreateInventoryMovementMutation();
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [createAudit, { isLoading: isCreatingAudit }] =
    useCreateInventoryAuditMutation();
  const [updateAudit] = useUpdateInventoryAuditMutation();
  const [completeAudit] = useCompleteInventoryAuditMutation();
  const [createReorder] = useCreateReorderRequestMutation();
  const [updateReorder, { isLoading: isUpdatingReorder }] =
    useUpdateReorderRequestMutation();

  const showSuccess = (message) => setNotice({ type: "success", message });

  const showError = (error) =>
    setNotice({
      type: "error",
      message: getErrorMessage(error, t("messages.error")),
    });

  const submitItem = async (payload) => {
    try {
      if (editingItem) {
        await updateItem({
          id: getReferenceId(editingItem),
          ...payload,
        }).unwrap();
        showSuccess(t("messages.itemUpdated"));
      } else {
        await createItem(payload).unwrap();
        showSuccess(t("messages.itemCreated"));
        await guidedSetup.refreshAndContinue({
          metadata: { form: "inventory_item" },
        });
        if (guidedSetup.guided) return;
      }
      setShowItemForm(false);
      setEditingItem(null);
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const openItemEditor = async (item) => {
    const itemId = getReferenceId(item);

    if (!itemId || loadingItemId) return;

    setLoadingItemId(itemId);
    try {
      const result = await getInventoryItem(itemId).unwrap();
      setEditingItem(getResultEntity(result, "item"));
      setShowItemForm(true);
    } catch (error) {
      showError(error);
    } finally {
      setLoadingItemId("");
    }
  };

  const changeLocation = (locationId) => {
    setSelectedLocationId(locationId);
    setItemPage(1);
    setMovementPage(1);
    setAuditPage(1);
    setReorderPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    setItemPage(1);
  };

  const submitMovement = async (payload) => {
    try {
      await createMovement(payload).unwrap();
      showSuccess(t("messages.movementCreated"));
      setShowMovementForm(false);
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const toggleItemActive = async (item) => {
    if (isUpdatingItem) return;

    try {
      const { restoring, continued } = await toggleInventoryItemAvailability({
        itemId: getReferenceId(item),
        itemIsActive: item.isActive,
        updateItem,
        refreshAndContinue: guidedSetup.refreshAndContinue,
      });
      if (continued) return;

      showSuccess(
        restoring ? t("messages.itemRestored") : t("messages.itemArchived"),
      );
    } catch (error) {
      showError(error);
    }
  };

  const submitSupplier = async (payload) => {
    try {
      if (editingSupplier) {
        await updateSupplier({
          id: getReferenceId(editingSupplier),
          ...payload,
        }).unwrap();
        showSuccess(t("messages.supplierUpdated"));
      } else {
        await createSupplier(payload).unwrap();
        showSuccess(t("messages.supplierCreated"));
      }
      setShowSupplierForm(false);
      setEditingSupplier(null);
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const startAudit = async () => {
    if (!effectiveLocationId) return;

    try {
      const result = await createAudit({
        auditDate: new Date().toISOString(),
        location: effectiveLocationId,
      }).unwrap();
      setEditingAudit(getResultEntity(result, "audit"));
      showSuccess(t("messages.stocktakeCreated"));
    } catch (error) {
      showError(error);
    }
  };

  const saveAudit = async (payload, shouldComplete) => {
    try {
      await updateAudit({
        id: getReferenceId(editingAudit),
        ...payload,
      }).unwrap();

      if (shouldComplete) {
        await completeAudit(getReferenceId(editingAudit)).unwrap();
        showSuccess(t("messages.stocktakeCompleted"));
      } else {
        showSuccess(t("messages.stocktakeSaved"));
      }

      setEditingAudit(null);
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const changeReorderStatus = async (request, status) => {
    if (isUpdatingReorder) return;

    if (status === "received") {
      setReceivingRequest(request);
      return;
    }

    try {
      await updateReorder({
        id: getReferenceId(request),
        status,
      }).unwrap();
      showSuccess(t("messages.reorderUpdated"));
    } catch (error) {
      showError(error);
    }
  };

  const submitReorder = async (payload) => {
    try {
      await createReorder(payload).unwrap();
      setShowReorderForm(false);
      showSuccess(t("messages.reorderCreated"));
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const receiveReorder = async (payload) => {
    try {
      await updateReorder({
        id: getReferenceId(receivingRequest),
        status: "received",
        ...payload,
      }).unwrap();
      setReceivingRequest(null);
      showSuccess(t("messages.reorderReceived"));
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  return (
    <section className="min-w-0">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div
          className={
            showPageHeader
              ? "mb-6 flex min-w-0 flex-col gap-5 rounded-[24px] border border-line bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              : "mb-6 min-w-0 rounded-[20px] border border-line bg-white p-3 shadow-xs"
          }
        >
          {showPageHeader ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cobalt-600">
                {t("eyebrow")}
              </p>
              <h1 className="mt-1.5 text-[25px] font-medium tracking-[-0.04em] text-[#111111]">
                {t("title")}
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#707070]">
                {t("description")}
              </p>
            </div>
          ) : null}

          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="block min-w-0 max-w-full sm:w-auto">
              <span className="sr-only">{t("actions.location")}</span>
              <select
                value={effectiveLocationId}
                onChange={(event) => changeLocation(event.target.value)}
                disabled={locationsLoading || locations.length === 0}
                className="h-11 w-full min-w-0 max-w-full rounded-full border border-line bg-white px-4 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:opacity-50 sm:w-auto sm:max-w-[260px]"
              >
                {locations.length === 0 ? (
                  <option value="">{t("actions.noLocation")}</option>
                ) : null}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            {canManageInventory ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowMovementForm(true)}
                  disabled={!effectiveLocationId}
                  className={`${secondaryButtonClass} w-full max-w-full sm:w-auto`}
                >
                  <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                  {t("actions.addMovement")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setShowItemForm(true);
                  }}
                  disabled={locations.length === 0}
                  className={`${primaryButtonClass} w-full max-w-full sm:w-auto`}
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  {t("actions.newItem")}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {notice ? (
          <Notice
            notice={notice}
            onDismiss={() => setNotice(null)}
            dismissLabel={t("actions.dismiss")}
          />
        ) : null}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label={t("summary.items")} value={itemResult.total} />
          <SummaryCard
            label={t("summary.lowStock")}
            value={lowStockResult.total}
            attention={lowStockResult.total > 0}
          />
          <SummaryCard
            label={t("summary.movements")}
            value={movementResult.total}
          />
          <SummaryCard
            label={t("summary.reorders")}
            value={activeReorderCount}
            attention={activeReorderCount > 0}
          />
        </div>

        <WorkspaceTabs
          id={INVENTORY_TABS_ID}
          className="mb-5"
          tabs={INVENTORY_TABS.map((tab) => ({
            id: tab,
            label: t(`tabs.${tab}`),
            icon: TAB_ICONS[tab],
          }))}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel={t("tabs.label")}
        />

        <WorkspaceTabPanel tabsId={INVENTORY_TABS_ID} tabId={activeTab}>
          {activeTab === "items" ? (
            <InventoryItemsTable
              items={items}
              locationId={effectiveLocationId}
              locationName={selectedLocation?.name}
              search={search}
              setSearch={changeSearch}
              suppliers={suppliers}
              currency={currency}
              locale={dateLocale}
              isLoading={itemQuery.isLoading}
              isError={itemQuery.isError}
              onRetry={itemQuery.refetch}
              onEdit={openItemEditor}
              onToggleActive={toggleItemActive}
              canManage={canManageInventory}
              isMutating={isUpdatingItem}
              loadingItemId={loadingItemId}
              pagination={itemResult}
              onPageChange={setItemPage}
            />
          ) : null}

          {activeTab === "movements" ? (
            <InventoryMovementsTable
              movements={movements}
              currency={currency}
              locale={dateLocale}
              locationsById={locationsById}
              isLoading={movementQuery.isLoading}
              isError={movementQuery.isError}
              onRetry={movementQuery.refetch}
              pagination={movementResult}
              onPageChange={setMovementPage}
            />
          ) : null}

          {activeTab === "stocktakes" ? (
            <InventoryAuditsTable
              audits={audits}
              locationId={effectiveLocationId}
              locationsById={locationsById}
              locale={dateLocale}
              isLoading={auditQuery.isLoading}
              isError={auditQuery.isError}
              isCreating={isCreatingAudit}
              onRetry={auditQuery.refetch}
              onCreate={startAudit}
              onEdit={setEditingAudit}
              canManage={canManageInventory}
              pagination={auditResult}
              onPageChange={setAuditPage}
            />
          ) : null}

          {activeTab === "reorders" ? (
            <ReorderRequestsTable
              reorders={reorders}
              locationsById={locationsById}
              isLoading={reorderQuery.isLoading}
              isError={reorderQuery.isError}
              onRetry={reorderQuery.refetch}
              onStatusChange={changeReorderStatus}
              onCreate={() => setShowReorderForm(true)}
              canManage={canManageInventory}
              isMutating={isUpdatingReorder}
              pagination={reorderResult}
              onPageChange={setReorderPage}
            />
          ) : null}

          {activeTab === "suppliers" ? (
            <SuppliersTable
              suppliers={suppliers}
              isLoading={supplierQuery.isLoading}
              isError={supplierQuery.isError}
              onRetry={supplierQuery.refetch}
              onCreate={() => {
                setEditingSupplier(null);
                setShowSupplierForm(true);
              }}
              onEdit={(supplier) => {
                setEditingSupplier(supplier);
                setShowSupplierForm(true);
              }}
              canManage={canManageInventory}
            />
          ) : null}
        </WorkspaceTabPanel>
      </div>

      {showItemForm ? (
        <ItemFormModal
          item={editingItem}
          suppliers={suppliers}
          locations={locations}
          defaultLocationId={effectiveLocationId}
          currency={currency}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          onSubmit={submitItem}
          guided={guidedSetup.guided}
        />
      ) : null}

      {showMovementForm ? (
        <MovementFormModal
          suppliers={suppliers}
          locations={locations}
          locationId={effectiveLocationId}
          currency={currency}
          onClose={() => setShowMovementForm(false)}
          onSubmit={submitMovement}
        />
      ) : null}

      {showSupplierForm ? (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => {
            setShowSupplierForm(false);
            setEditingSupplier(null);
          }}
          onSubmit={submitSupplier}
        />
      ) : null}

      {editingAudit ? (
        <StocktakeFormModal
          audit={editingAudit}
          itemsById={itemsById}
          onClose={() => setEditingAudit(null)}
          onSubmit={saveAudit}
        />
      ) : null}

      {receivingRequest ? (
        <ReceiveReorderModal
          request={receivingRequest}
          currency={currency}
          onClose={() => setReceivingRequest(null)}
          onSubmit={receiveReorder}
        />
      ) : null}

      {showReorderForm ? (
        <ReorderFormModal
          locationId={effectiveLocationId}
          onClose={() => setShowReorderForm(false)}
          onSubmit={submitReorder}
        />
      ) : null}
    </section>
  );
}

function Notice({ notice, dismissLabel, onDismiss }) {
  const isError = notice.type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`mb-5 flex items-start justify-between gap-4 rounded-[16px] border px-4 py-3 text-[12px] ${
        isError
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <span>{notice.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="font-semibold underline underline-offset-2"
      >
        {dismissLabel}
      </button>
    </div>
  );
}

function SummaryCard({ label, value, attention = false }) {
  return (
    <WorkspaceCard className="p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#838383]">
          {label}
        </p>
        {attention ? (
          <ExclamationTriangleIcon
            className="h-4 w-4 text-terracotta-600"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <p className="mt-2 text-[28px] font-medium tracking-[-0.04em] text-[#171717]">
        {value}
      </p>
    </WorkspaceCard>
  );
}

function InventoryItemsTable({
  items,
  locationId,
  locationName,
  search,
  setSearch,
  suppliers,
  currency,
  locale,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onToggleActive,
  canManage,
  isMutating,
  loadingItemId,
  pagination,
  onPageChange,
}) {
  const t = useTranslations("Inventory");
  const suppliersById = useMemo(
    () =>
      new Map(
        suppliers.map((supplier) => [getReferenceId(supplier), supplier]),
      ),
    [suppliers],
  );

  return (
    <DataCard>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("items.search")}
          aria-label={t("items.search")}
          className={`${controlClass} sm:max-w-sm`}
        />
        <p className="text-[12px] leading-5 text-[#777777]">
          {t("items.locationStock", {
            location: locationName || t("common.unknownLocation"),
          })}
        </p>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={items.length === 0}
        emptyTitle={t("items.emptyTitle")}
        emptyDescription={t("items.emptyDescription")}
        onRetry={onRetry}
      >
        <WorkspaceTableScroller ariaLabel={t("tabs.items")}>
          <WorkspaceTable className="min-w-full text-left text-[12px]">
            <thead className="bg-[#FAF9F7] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
              <tr>
                <th className="px-4 py-3">{t("items.columns.item")}</th>
                <th className="px-4 py-3">{t("items.columns.category")}</th>
                <th className="px-4 py-3">{t("items.columns.stock")}</th>
                <th className="px-4 py-3">{t("items.columns.minimum")}</th>
                <th className="px-4 py-3">{t("items.columns.supplier")}</th>
                <th className="px-4 py-3">{t("items.columns.averageCost")}</th>
                <th className="px-4 py-3 text-right">
                  {t("items.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => {
                const currentQuantity = getInventoryQuantity(item, locationId);
                const minimumQuantity = getInventoryMinimum(item, locationId);
                const isLow = isInventoryItemLowStock(item, locationId);
                const supplier =
                  item.supplier && typeof item.supplier === "object"
                    ? item.supplier
                    : suppliersById.get(getReferenceId(item.supplier));

                return (
                  <tr
                    key={getReferenceId(item)}
                    className="hover:bg-surface-muted"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#242424]">
                          {item.name}
                        </p>
                        {item.isActive === false ? (
                          <span className="rounded-full bg-[#EEECE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#666666]">
                            {t("items.archived")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#8A8A8A]">
                        {item.sku || t("items.noSku")}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {t(`categories.${item.category || "other"}`)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
                          isLow
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {currentQuantity} {t(`units.${item.unit || "pcs"}`)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {minimumQuantity} {t(`units.${item.unit || "pcs"}`)}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {supplier?.name
                        ? supplier.isActive === false
                          ? t("suppliers.inactiveOption", {
                              name: supplier.name,
                            })
                          : supplier.name
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {formatMajorCurrencyAmount(
                        Number(item.averageUnitCostWithoutVat || 0),
                        item.currency || currency,
                        locale,
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            disabled={
                              isMutating ||
                              loadingItemId === getReferenceId(item)
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-[#555555] transition hover:border-cobalt-200 hover:text-cobalt-700"
                            aria-label={t("items.edit", { name: item.name })}
                          >
                            <PencilSquareIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleActive(item)}
                            disabled={isMutating}
                            className="inline-flex min-h-10 items-center justify-center rounded-full border border-line px-3 text-[12px] font-semibold text-[#555555] transition hover:border-cobalt-200 hover:text-cobalt-700"
                          >
                            {item.isActive === false
                              ? t("items.restore")
                              : t("items.archive")}
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </WorkspaceTable>
        </WorkspaceTableScroller>
      </QueryState>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </DataCard>
  );
}

function InventoryMovementsTable({
  movements,
  currency,
  locale,
  locationsById,
  isLoading,
  isError,
  onRetry,
  pagination,
  onPageChange,
}) {
  const t = useTranslations("Inventory");

  return (
    <DataCard>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={movements.length === 0}
        emptyTitle={t("movements.emptyTitle")}
        emptyDescription={t("movements.emptyDescription")}
        onRetry={onRetry}
      >
        <WorkspaceTableScroller ariaLabel={t("tabs.movements")}>
          <WorkspaceTable className="min-w-full text-left text-[12px]">
            <thead className="bg-[#FAF9F7] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
              <tr>
                <th className="px-4 py-3">{t("movements.columns.date")}</th>
                <th className="px-4 py-3">{t("movements.columns.item")}</th>
                <th className="px-4 py-3">{t("movements.columns.type")}</th>
                <th className="px-4 py-3">{t("movements.columns.location")}</th>
                <th className="px-4 py-3">{t("movements.columns.quantity")}</th>
                <th className="px-4 py-3">{t("movements.columns.cost")}</th>
                <th className="px-4 py-3">{t("movements.columns.reason")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movements.map((movement) => {
                const movementCurrency = movement.currency || currency;
                const calculatedTotal =
                  Number(movement.quantity || 0) *
                  Number(movement.unitCostWithoutVat || 0) *
                  (1 + Number(movement.vatRate || 0) / 100);
                const total = Number(
                  movement.totalWithVat ?? calculatedTotal ?? 0,
                );
                const source = formatLocation(
                  movement.location,
                  locationsById,
                  t("common.unknownLocation"),
                );
                const destination = movement.destinationLocation
                  ? formatLocation(
                      movement.destinationLocation,
                      locationsById,
                      t("common.unknownLocation"),
                    )
                  : "";
                const auditQuantityDelta = Number(movement.quantityDelta);
                const quantity =
                  movement.reason === "inventory-audit" &&
                  Number.isFinite(auditQuantityDelta)
                    ? `${auditQuantityDelta > 0 ? "+" : ""}${auditQuantityDelta}`
                    : movement.quantity;

                return (
                  <tr
                    key={getReferenceId(movement)}
                    className="hover:bg-surface-muted"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-[#666666]">
                      {new Date(movement.createdAt).toLocaleDateString(locale)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-[#242424]">
                      {movement.item?.name || "—"}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {t(`movementTypes.${movement.type}`)}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      <span className="inline-flex items-center gap-1">
                        {source}
                        {destination ? (
                          <>
                            <ArrowRightIcon
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            {destination}
                          </>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#444444]">
                      {quantity}{" "}
                      {movement.item?.unit
                        ? t(`units.${movement.item.unit}`)
                        : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[#666666]">
                      {formatMajorCurrencyAmount(
                        total,
                        movementCurrency,
                        locale,
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {t(`movementReasons.${movement.reason}`)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </WorkspaceTable>
        </WorkspaceTableScroller>
      </QueryState>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </DataCard>
  );
}

function InventoryAuditsTable({
  audits,
  locationId,
  locationsById,
  locale,
  isLoading,
  isError,
  isCreating,
  onRetry,
  onCreate,
  onEdit,
  canManage,
  pagination,
  onPageChange,
}) {
  const t = useTranslations("Inventory");

  return (
    <DataCard>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242424]">
            {t("stocktakes.title")}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[#777777]">
            {t("stocktakes.description")}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={onCreate}
            disabled={!locationId || isCreating}
            className={primaryButtonClass}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            {isCreating ? t("stocktakes.creating") : t("stocktakes.create")}
          </button>
        ) : null}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={audits.length === 0}
        emptyTitle={t("stocktakes.emptyTitle")}
        emptyDescription={t("stocktakes.emptyDescription")}
        onRetry={onRetry}
      >
        <div className="divide-y divide-line">
          {audits.map((audit) => {
            const isCompleted = audit.status === "completed";

            return (
              <div
                key={getReferenceId(audit)}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-[#242424]">
                    {t("stocktakes.stocktakeDate", {
                      date: new Date(audit.auditDate).toLocaleDateString(
                        locale,
                      ),
                    })}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#777777]">
                    {formatLocation(
                      audit.location,
                      locationsById,
                      t("common.unknownLocation"),
                    )}{" "}
                    · {t(`stocktakes.statuses.${audit.status || "draft"}`)} ·{" "}
                    {t("stocktakes.itemCount", {
                      count: audit.items?.length || 0,
                    })}
                  </p>
                </div>

                {!isCompleted && canManage ? (
                  <button
                    type="button"
                    onClick={() => onEdit(audit)}
                    className={secondaryButtonClass}
                  >
                    <ClipboardDocumentCheckIcon
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {t("stocktakes.continue")}
                  </button>
                ) : (
                  <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700">
                    {t("stocktakes.completed")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </QueryState>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </DataCard>
  );
}

function ReorderRequestsTable({
  reorders,
  locationsById,
  isLoading,
  isError,
  onRetry,
  onStatusChange,
  onCreate,
  canManage,
  isMutating,
  pagination,
  onPageChange,
}) {
  const t = useTranslations("Inventory");

  return (
    <DataCard>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242424]">
            {t("reorders.title")}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[#777777]">
            {t("reorders.description")}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={onCreate}
            className={primaryButtonClass}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            {t("reorders.add")}
          </button>
        ) : null}
      </div>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={reorders.length === 0}
        emptyTitle={t("reorders.emptyTitle")}
        emptyDescription={t("reorders.emptyDescription")}
        onRetry={onRetry}
      >
        <WorkspaceTableScroller ariaLabel={t("tabs.reorders")}>
          <WorkspaceTable className="min-w-full text-left text-[12px]">
            <thead className="bg-[#FAF9F7] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
              <tr>
                <th className="px-4 py-3">{t("reorders.columns.item")}</th>
                <th className="px-4 py-3">{t("reorders.columns.location")}</th>
                <th className="px-4 py-3">{t("reorders.columns.supplier")}</th>
                <th className="px-4 py-3">{t("reorders.columns.current")}</th>
                <th className="px-4 py-3">{t("reorders.columns.requested")}</th>
                <th className="px-4 py-3">{t("reorders.columns.priority")}</th>
                <th className="px-4 py-3">{t("reorders.columns.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reorders.map((request) => {
                const finalStatus =
                  request.status === "received" ||
                  request.status === "cancelled";

                return (
                  <tr
                    key={getReferenceId(request)}
                    className="hover:bg-surface-muted"
                  >
                    <td className="px-4 py-4 font-semibold text-[#242424]">
                      {request.item?.name || "—"}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {formatLocation(
                        request.location,
                        locationsById,
                        t("common.unknownLocation"),
                      )}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {request.supplier?.name || "—"}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {request.currentQuantity}
                    </td>
                    <td className="px-4 py-4 text-[#444444]">
                      {request.requestedQuantity}
                    </td>
                    <td className="px-4 py-4 text-[#666666]">
                      {t(`reorders.priorities.${request.priority || "medium"}`)}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={request.status}
                        disabled={finalStatus || !canManage || isMutating}
                        onChange={(event) =>
                          onStatusChange(request, event.target.value)
                        }
                        aria-label={t("reorders.statusFor", {
                          item: request.item?.name || t("common.item"),
                        })}
                        className="h-10 rounded-full border border-line bg-white px-3 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:bg-[#F4F2EF] disabled:text-[#777777]"
                      >
                        {getAllowedReorderStatuses(request.status).map(
                          (status) => (
                            <option key={status} value={status}>
                              {t(`reorders.statuses.${status}`)}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </WorkspaceTable>
        </WorkspaceTableScroller>
      </QueryState>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </DataCard>
  );
}

function SuppliersTable({
  suppliers,
  isLoading,
  isError,
  onRetry,
  onCreate,
  onEdit,
  canManage,
}) {
  const t = useTranslations("Inventory");

  return (
    <DataCard>
      <div className="flex items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[#242424]">
            {t("suppliers.title")}
          </h2>
          <p className="mt-1 text-[12px] leading-5 text-[#777777]">
            {t("suppliers.description")}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={onCreate}
            className={primaryButtonClass}
          >
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            {t("suppliers.add")}
          </button>
        ) : null}
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        isEmpty={suppliers.length === 0}
        emptyTitle={t("suppliers.emptyTitle")}
        emptyDescription={t("suppliers.emptyDescription")}
        onRetry={onRetry}
      >
        <div className="divide-y divide-line">
          {suppliers.map((supplier) => (
            <div
              key={getReferenceId(supplier)}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#242424]">
                    {supplier.name}
                  </p>
                  {supplier.isActive === false ? (
                    <span className="rounded-full bg-[#EEECE8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#666666]">
                      {t("suppliers.inactive")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] leading-5 text-[#777777]">
                  {[supplier.contactPerson, supplier.email, supplier.phone]
                    .filter(Boolean)
                    .join(" · ") || t("suppliers.noContact")}
                </p>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => onEdit(supplier)}
                  className={secondaryButtonClass}
                >
                  <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                  {t("suppliers.edit")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </QueryState>
    </DataCard>
  );
}

function PaginationControls({ pagination, onPageChange }) {
  const t = useTranslations("Inventory");
  const page = Math.max(Number(pagination?.page) || 1, 1);
  const pages = Math.max(Number(pagination?.pages) || 1, 1);
  const displayPage = Math.min(page, pages);

  if (pages <= 1 && page <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[12px] text-[#777777] sm:flex-row sm:items-center sm:justify-between">
      <p>
        {t("common.pageSummary", {
          page: displayPage,
          pages,
          total: Math.max(Number(pagination?.total) || 0, 0),
        })}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.min(page - 1, pages))}
          disabled={page <= 1}
          className="inline-flex h-9 items-center justify-center rounded-full border border-line bg-white px-3 font-semibold text-[#555555] transition hover:border-cobalt-200 hover:text-cobalt-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common.previous")}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="inline-flex h-9 items-center justify-center rounded-full border border-line bg-white px-3 font-semibold text-[#555555] transition hover:border-cobalt-200 hover:text-cobalt-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("common.next")}
        </button>
      </div>
    </div>
  );
}

function DataCard({ children }) {
  return (
    <WorkspaceTableFrame className="overflow-hidden shadow-xs">
      {children}
    </WorkspaceTableFrame>
  );
}

function QueryState({
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  children,
}) {
  const t = useTranslations("Inventory");

  if (isLoading) {
    return (
      <div className="p-8 text-center text-[12px] text-[#777777]">
        {t("common.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13px] font-semibold text-[#292925]">
          {t("common.loadError")}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-[12px] font-semibold text-cobalt-700 underline underline-offset-4"
        >
          {t("common.tryAgain")}
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-8 text-center">
        <p className="text-[13px] font-semibold text-[#292925]">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-[#777777]">
          {emptyDescription}
        </p>
      </div>
    );
  }

  return children;
}

function formatLocation(location, locationsById, fallback) {
  if (location && typeof location === "object") {
    return location.name || fallback;
  }

  return locationsById.get(getReferenceId(location))?.name || fallback;
}

function ModalShell({ title, description, children, onClose }) {
  const t = useTranslations("Inventory");

  return (
    <Dialog open onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="form">
        <WorkspaceDialogPanel layout="form" size="small">
          <WorkspaceDialogHeader
            title={title}
            description={description}
            onClose={onClose}
            closeLabel={t("actions.close")}
          />
          <WorkspaceDialogBody>{children}</WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

function ItemFormModal({
  item,
  suppliers,
  locations,
  defaultLocationId,
  currency,
  onClose,
  onSubmit,
  guided = false,
}) {
  const t = useTranslations("Inventory");
  const setupT = useTranslations("SetupCenter");
  const stockLocations = [...locations];

  (Array.isArray(item?.stockLevels) ? item.stockLevels : []).forEach(
    (stockLevel) => {
      const locationId = getReferenceId(stockLevel?.location);

      if (
        locationId &&
        !stockLocations.some((location) => location.id === locationId)
      ) {
        const location =
          stockLevel.location && typeof stockLevel.location === "object"
            ? stockLevel.location
            : null;

        stockLocations.push({
          id: locationId,
          name: location?.name || t("common.unknownLocation"),
          isActive: location?.isActive !== false,
        });
      }
    },
  );

  const initialStockLevels = createStockLevelForm({
    locations: stockLocations,
    item,
    defaultLocationId,
  });
  if (guided && defaultLocationId && initialStockLevels[defaultLocationId]) {
    initialStockLevels[defaultLocationId] = {
      ...initialStockLevels[defaultLocationId],
      enabled: true,
    };
  }

  const [form, setForm] = useState({
    name: item?.name || "",
    sku: item?.sku || "",
    category: item?.category || "other",
    unit: item?.unit || "pcs",
    supplier: getReferenceId(item?.supplier),
    averageUnitCostWithoutVat: String(item?.averageUnitCostWithoutVat ?? ""),
    note: item?.note || "",
    stockLevels: initialStockLevels,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const itemSupplier =
    item?.supplier && typeof item.supplier === "object" ? item.supplier : null;
  const supplierOptionsSource =
    itemSupplier &&
    !suppliers.some(
      (supplier) => getReferenceId(supplier) === getReferenceId(itemSupplier),
    )
      ? [...suppliers, itemSupplier]
      : suppliers;
  const selectableSuppliers = getSelectableSuppliers(
    supplierOptionsSource,
    form.supplier,
  );
  const guidedLocation =
    stockLocations.find((location) => location.id === defaultLocationId) ||
    stockLocations[0];
  const visibleStockLocations = guided
    ? guidedLocation
      ? [guidedLocation]
      : []
    : stockLocations;

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateStockLevel = (locationId, key, value) =>
    setForm((current) => {
      const currentStockLevel = current.stockLevels[locationId] || {
        enabled: false,
        currentQuantity: "",
        minimumQuantity: "",
      };

      return {
        ...current,
        stockLevels: {
          ...current.stockLevels,
          [locationId]: {
            ...currentStockLevel,
            [key]: value,
          },
        },
      };
    });

  const createStockLevels = buildStockLevelsPayload(form.stockLevels);
  const updateStockLevels = buildStockLevelThresholdsPayload(form.stockLevels);
  const selectedStockLevelCount = updateStockLevels.length;

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (selectedStockLevelCount === 0) {
      setError(t("itemForm.locationRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        sku: item ? form.sku.trim() || null : form.sku.trim() || undefined,
        category: form.category,
        unit: form.unit,
        supplier: form.supplier || null,
        averageUnitCostWithoutVat: Number(form.averageUnitCostWithoutVat || 0),
        note: form.note.trim(),
        stockLevels: item ? updateStockLevels : createStockLevels,
      });
    } catch {
      setError(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={item ? t("itemForm.editTitle") : t("itemForm.createTitle")}
      description={t("itemForm.description")}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={submit}
        data-guided-form={guided ? "inventory" : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("itemForm.name")}
            value={form.name}
            onChange={(value) => update("name", value)}
            required
          />
          {!guided ? (
            <Input
              label={t("itemForm.sku")}
              value={form.sku}
              onChange={(value) => update("sku", value)}
              placeholder={t("itemForm.skuPlaceholder")}
            />
          ) : null}
          <Select
            label={t("itemForm.category")}
            value={form.category}
            onChange={(value) => update("category", value)}
            options={INVENTORY_CATEGORIES.map((category) => ({
              value: category,
              label: t(`categories.${category}`),
            }))}
          />
          <Select
            label={t("itemForm.unit")}
            value={form.unit}
            onChange={(value) => update("unit", value)}
            options={INVENTORY_UNITS.map((unit) => ({
              value: unit,
              label: t(`units.${unit}`),
            }))}
          />
          {!guided ? (
            <>
              <Select
                label={t("itemForm.supplier")}
                value={form.supplier}
                onChange={(value) => update("supplier", value)}
                options={[
                  { value: "", label: t("itemForm.noSupplier") },
                  ...selectableSuppliers.map((supplier) => ({
                    value: getReferenceId(supplier),
                    label:
                      supplier.isActive === false
                        ? t("suppliers.inactiveOption", { name: supplier.name })
                        : supplier.name,
                  })),
                ]}
              />
              <Input
                label={t("itemForm.averageCost", { currency })}
                type="number"
                min="0"
                step={getMajorCurrencyInputStep(currency)}
                value={form.averageUnitCostWithoutVat}
                onChange={(value) => update("averageUnitCostWithoutVat", value)}
              />
            </>
          ) : null}
        </div>

        <fieldset className="rounded-[18px] border border-line bg-white p-4">
          <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777777]">
            {t("itemForm.stockLevels")}
          </legend>
          <div className="mt-1 space-y-3">
            {visibleStockLocations.map((location) => {
              const stockLevel = form.stockLevels[location.id] || {
                enabled: false,
                currentQuantity: "",
                minimumQuantity: "",
              };

              return (
                <div
                  key={location.id}
                  className="rounded-[14px] border border-line bg-surface-muted p-3"
                >
                  <label className="flex items-center gap-2 text-[12px] font-semibold text-[#292925]">
                    <input
                      type="checkbox"
                      checked={stockLevel.enabled}
                      onChange={(event) =>
                        updateStockLevel(
                          location.id,
                          "enabled",
                          event.target.checked,
                        )
                      }
                      className="h-4 w-4 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
                    />
                    {location.isActive === false
                      ? t("common.inactiveLocation", { name: location.name })
                      : location.name}
                  </label>

                  {stockLevel.enabled ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {item ? (
                        <div>
                          <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#777777]">
                            {t("itemForm.currentQuantity")}
                          </span>
                          <div className="flex h-11 items-center rounded-[13px] border border-line bg-[#F4F2EF] px-3.5 text-[12px] text-[#555555]">
                            {getInventoryStockLevel(item, location.id)
                              ?.currentQuantity ?? 0}
                          </div>
                          <p className="mt-1 text-[12px] leading-5 text-[#777777]">
                            {t("itemForm.quantityLedgerHint")}
                          </p>
                        </div>
                      ) : (
                        <Input
                          label={t("itemForm.openingQuantity")}
                          type="number"
                          min="0"
                          step="any"
                          value={stockLevel.currentQuantity}
                          onChange={(value) =>
                            updateStockLevel(
                              location.id,
                              "currentQuantity",
                              value,
                            )
                          }
                        />
                      )}
                      {!guided ? (
                        <Input
                          label={t("itemForm.minimumQuantity")}
                          type="number"
                          min="0"
                          step="any"
                          value={stockLevel.minimumQuantity}
                          onChange={(value) =>
                            updateStockLevel(
                              location.id,
                              "minimumQuantity",
                              value,
                            )
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </fieldset>

        {!guided ? (
          <TextArea
            label={t("itemForm.note")}
            value={form.note}
            onChange={(value) => update("note", value)}
          />
        ) : null}

        {error ? <FormError>{error}</FormError> : null}

        <button
          type="submit"
          disabled={isSaving || selectedStockLevelCount === 0}
          className={`${primaryButtonClass} w-full`}
        >
          {isSaving
            ? t("actions.saving")
            : guided
              ? setupT("guided.saveAndContinue")
              : t("itemForm.save")}
        </button>
      </form>
    </ModalShell>
  );
}

function InventoryItemPicker({
  label,
  value,
  onChange,
  locationId,
  emptyLabel,
}) {
  const t = useTranslations("Inventory");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const itemQuery = useGetInventoryItemsQuery({
    location: locationId || undefined,
    search: search.trim() || undefined,
    page: 1,
    limit: INVENTORY_PAGE_SIZE,
  });
  const items = normalizeInventoryPage(itemQuery.data, "items").records.filter(
    (item) => item.isActive !== false,
  );
  const optionItems =
    selectedItem &&
    !items.some((item) => getReferenceId(item) === getReferenceId(selectedItem))
      ? [selectedItem, ...items]
      : items;

  const selectItem = (itemId) => {
    setSelectedItem(
      optionItems.find((item) => getReferenceId(item) === itemId) || null,
    );
    onChange(itemId);
  };

  return (
    <div className="space-y-2">
      <Input
        label={t("common.searchItems")}
        type="search"
        value={search}
        onChange={setSearch}
        placeholder={t("common.searchItemsPlaceholder")}
      />
      <Select
        label={label}
        value={value ?? ""}
        onChange={selectItem}
        required
        options={[
          { value: "", label: emptyLabel },
          ...optionItems.map((item) => ({
            value: getReferenceId(item),
            label: item.sku ? `${item.name} · ${item.sku}` : item.name,
          })),
        ]}
      />
      <p className="text-[12px] leading-5 text-[#777777]">
        {t("common.showingItemMatches")}
      </p>
    </div>
  );
}

function MovementFormModal({
  suppliers,
  locations,
  locationId,
  currency,
  onClose,
  onSubmit,
}) {
  const t = useTranslations("Inventory");
  const [form, setForm] = useState({
    item: "",
    supplier: "",
    type: "in",
    reason: "purchase",
    destinationLocation: "",
    quantity: "",
    unitCostWithoutVat: "",
    vatRate: "21",
    invoiceNumber: "",
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const sourceLocation = locations.find(
    (location) => location.id === locationId,
  );

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const changeType = (type) => {
    const defaultReasons = {
      in: "purchase",
      out: "studio-consumption",
      transfer: "transfer",
      adjustment: "manual-adjustment",
    };
    setForm((current) => ({
      ...current,
      type,
      reason: defaultReasons[type],
      destinationLocation:
        type === "transfer" ? current.destinationLocation : "",
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (
      form.type === "transfer" &&
      (!form.destinationLocation || form.destinationLocation === locationId)
    ) {
      setError(t("movementForm.destinationRequired"));
      return;
    }

    if (form.type !== "adjustment" && Number(form.quantity) <= 0) {
      setError(t("movementForm.quantityRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        item: form.item,
        supplier: form.supplier || null,
        type: form.type,
        reason: form.reason,
        location: locationId,
        ...(form.type === "transfer"
          ? { destinationLocation: form.destinationLocation }
          : {}),
        quantity: Number(form.quantity || 0),
        ...(form.unitCostWithoutVat !== ""
          ? { unitCostWithoutVat: Number(form.unitCostWithoutVat) }
          : {}),
        vatRate: Number(form.vatRate),
        invoiceNumber: form.invoiceNumber.trim(),
        note: form.note.trim(),
      });
    } catch {
      setError(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={t("movementForm.title")}
      description={t("movementForm.description")}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="rounded-[14px] border border-cobalt-100 bg-cobalt-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-600">
            {t("movementForm.sourceLocation")}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-cobalt-900">
            {sourceLocation?.name || t("common.unknownLocation")}
          </p>
        </div>

        <InventoryItemPicker
          label={t("movementForm.item")}
          value={form.item}
          onChange={(value) => update("item", value)}
          locationId={locationId}
          emptyLabel={t("movementForm.selectItem")}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label={t("movementForm.type")}
            value={form.type}
            onChange={changeType}
            options={INVENTORY_MOVEMENT_TYPES.map((type) => ({
              value: type,
              label: t(`movementTypes.${type}`),
            }))}
          />
          <Select
            label={t("movementForm.reason")}
            value={form.reason}
            onChange={(value) => update("reason", value)}
            options={INVENTORY_MOVEMENT_REASONS.map((reason) => ({
              value: reason,
              label: t(`movementReasons.${reason}`),
            }))}
          />
        </div>

        {form.type === "transfer" ? (
          <Select
            label={t("movementForm.destination")}
            value={form.destinationLocation}
            onChange={(value) => update("destinationLocation", value)}
            required
            options={[
              { value: "", label: t("movementForm.selectDestination") },
              ...locations
                .filter((location) => location.id !== locationId)
                .map((location) => ({
                  value: location.id,
                  label: location.name,
                })),
            ]}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={
              form.type === "adjustment"
                ? t("movementForm.resultingQuantity")
                : t("movementForm.quantity")
            }
            type="number"
            min="0"
            step="any"
            value={form.quantity}
            onChange={(value) => update("quantity", value)}
            required
          />
          <Select
            label={t("movementForm.supplier")}
            value={form.supplier}
            onChange={(value) => update("supplier", value)}
            options={[
              { value: "", label: t("movementForm.noSupplier") },
              ...getSelectableSuppliers(suppliers).map((supplier) => ({
                value: getReferenceId(supplier),
                label: supplier.name,
              })),
            ]}
          />
          <Input
            label={t("movementForm.unitCost", { currency })}
            type="number"
            min="0"
            step={getMajorCurrencyInputStep(currency)}
            value={form.unitCostWithoutVat}
            onChange={(value) => update("unitCostWithoutVat", value)}
          />
          <Select
            label={t("movementForm.vat")}
            value={form.vatRate}
            onChange={(value) => update("vatRate", value)}
            options={[0, 10, 12, 15, 21].map((rate) => ({
              value: String(rate),
              label: `${rate} %`,
            }))}
          />
          <Input
            label={t("movementForm.invoice")}
            value={form.invoiceNumber}
            onChange={(value) => update("invoiceNumber", value)}
          />
        </div>

        <TextArea
          label={t("movementForm.note")}
          value={form.note}
          onChange={(value) => update("note", value)}
        />

        {error ? <FormError>{error}</FormError> : null}

        <button
          type="submit"
          disabled={isSaving || !form.item}
          className={`${primaryButtonClass} w-full`}
        >
          {isSaving ? t("actions.saving") : t("movementForm.save")}
        </button>
      </form>
    </ModalShell>
  );
}

function StocktakeFormModal({ audit, itemsById, onClose, onSubmit }) {
  const t = useTranslations("Inventory");
  const [items, setItems] = useState(() => getAuditFormItems(audit));
  const [note, setNote] = useState(audit.note || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const updateItem = (itemId, key, value) =>
    setItems((current) =>
      current.map((item) =>
        item.item === itemId ? { ...item, [key]: value } : item,
      ),
    );

  const submit = async (shouldComplete) => {
    setError("");
    setIsSaving(true);

    try {
      await onSubmit(buildAuditUpdatePayload(items, note), shouldComplete);
    } catch {
      setError(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={t("stocktakeForm.title")}
      description={t("stocktakeForm.description")}
      onClose={onClose}
    >
      {items.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-white p-5 text-center text-[12px] text-[#777777]">
          {t("stocktakeForm.noItems")}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => {
            const difference =
              Number(entry.actualQuantity || 0) -
              Number(entry.expectedQuantity || 0);

            return (
              <div
                key={entry.item}
                className="rounded-[16px] border border-line bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] font-semibold text-[#292925]">
                    {entry.itemName ||
                      getInventoryItemName(entry.item, itemsById) ||
                      t("common.item")}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      difference === 0
                        ? "bg-[#F2F1EE] text-[#666666]"
                        : difference > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                    }`}
                  >
                    {difference > 0 ? "+" : ""}
                    {difference}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    label={t("stocktakeForm.expected")}
                    value={String(entry.expectedQuantity)}
                    onChange={() => {}}
                    readOnly
                  />
                  <Input
                    label={t("stocktakeForm.actual")}
                    type="number"
                    min="0"
                    step="any"
                    value={entry.actualQuantity}
                    onChange={(value) =>
                      updateItem(entry.item, "actualQuantity", value)
                    }
                    required
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <TextArea
          label={t("stocktakeForm.note")}
          value={note}
          onChange={setNote}
        />
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={isSaving || items.length === 0}
          className={secondaryButtonClass}
        >
          {t("stocktakeForm.saveDraft")}
        </button>
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={isSaving || items.length === 0}
          className={primaryButtonClass}
        >
          {isSaving ? t("actions.saving") : t("stocktakeForm.saveComplete")}
        </button>
      </div>
    </ModalShell>
  );
}

function ReorderFormModal({ locationId, onClose, onSubmit }) {
  const t = useTranslations("Inventory");
  const [form, setForm] = useState({
    item: "",
    requestedQuantity: "",
    priority: "medium",
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (Number(form.requestedQuantity) <= 0) {
      setError(t("reorderForm.quantityRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        item: form.item,
        location: locationId,
        requestedQuantity: Number(form.requestedQuantity),
        priority: form.priority,
        note: form.note.trim(),
      });
    } catch {
      setError(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={t("reorderForm.title")}
      description={t("reorderForm.description")}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <InventoryItemPicker
          label={t("reorderForm.item")}
          value={form.item}
          onChange={(value) => update("item", value)}
          locationId={locationId}
          emptyLabel={t("reorderForm.selectItem")}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("reorderForm.quantity")}
            type="number"
            min="0.0001"
            step="any"
            value={form.requestedQuantity}
            onChange={(value) => update("requestedQuantity", value)}
            required
          />
          <Select
            label={t("reorderForm.priority")}
            value={form.priority}
            onChange={(value) => update("priority", value)}
            options={["low", "medium", "high"].map((priority) => ({
              value: priority,
              label: t(`reorders.priorities.${priority}`),
            }))}
          />
        </div>
        <TextArea
          label={t("reorderForm.note")}
          value={form.note}
          onChange={(value) => update("note", value)}
        />

        {error ? <FormError>{error}</FormError> : null}

        <button
          type="submit"
          disabled={isSaving || !form.item}
          className={`${primaryButtonClass} w-full`}
        >
          {isSaving ? t("actions.saving") : t("reorderForm.save")}
        </button>
      </form>
    </ModalShell>
  );
}

function ReceiveReorderModal({ request, currency, onClose, onSubmit }) {
  const t = useTranslations("Inventory");
  const [form, setForm] = useState({
    receivedQuantity: String(request.requestedQuantity || ""),
    unitCostWithoutVat: "",
    vatRate: "21",
    invoiceNumber: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (Number(form.receivedQuantity) <= 0) {
      setError(t("receiveForm.quantityRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        receivedQuantity: Number(form.receivedQuantity),
        ...(form.unitCostWithoutVat !== ""
          ? { unitCostWithoutVat: Number(form.unitCostWithoutVat) }
          : {}),
        ...(form.unitCostWithoutVat !== ""
          ? { vatRate: Number(form.vatRate) }
          : {}),
        ...(form.invoiceNumber.trim()
          ? { invoiceNumber: form.invoiceNumber.trim() }
          : {}),
      });
    } catch {
      setError(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={t("receiveForm.title")}
      description={t("receiveForm.description", {
        item: request.item?.name || t("common.item"),
      })}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input
          label={t("receiveForm.quantity")}
          type="number"
          min="0.0001"
          step="any"
          value={form.receivedQuantity}
          onChange={(value) => update("receivedQuantity", value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("receiveForm.unitCost", { currency })}
            type="number"
            min="0"
            step={getMajorCurrencyInputStep(currency)}
            value={form.unitCostWithoutVat}
            onChange={(value) => update("unitCostWithoutVat", value)}
          />
          <Select
            label={t("receiveForm.vat")}
            value={form.vatRate}
            onChange={(value) => update("vatRate", value)}
            options={[0, 10, 12, 15, 21].map((rate) => ({
              value: String(rate),
              label: `${rate} %`,
            }))}
          />
        </div>
        <Input
          label={t("receiveForm.invoice")}
          value={form.invoiceNumber}
          onChange={(value) => update("invoiceNumber", value)}
        />

        {error ? <FormError>{error}</FormError> : null}

        <button
          type="submit"
          disabled={isSaving}
          className={`${primaryButtonClass} w-full`}
        >
          {isSaving ? t("actions.saving") : t("receiveForm.confirm")}
        </button>
      </form>
    </ModalShell>
  );
}

function SupplierFormModal({ supplier, onClose, onSubmit }) {
  const t = useTranslations("Inventory");
  const [form, setForm] = useState({
    name: supplier?.name || "",
    ico: supplier?.ico || "",
    dic: supplier?.dic || "",
    contactPerson: supplier?.contactPerson || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    note: supplier?.note || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      await onSubmit(
        Object.fromEntries(
          Object.entries(form).map(([key, value]) => [key, value.trim()]),
        ),
      );
    } catch {
      setError(t("messages.error"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      title={
        supplier ? t("supplierForm.editTitle") : t("supplierForm.createTitle")
      }
      description={t("supplierForm.description")}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={t("supplierForm.name")}
            value={form.name}
            onChange={(value) => update("name", value)}
            required
          />
          <Input
            label={t("supplierForm.contactPerson")}
            value={form.contactPerson}
            onChange={(value) => update("contactPerson", value)}
          />
          <Input
            label={t("supplierForm.email")}
            type="email"
            value={form.email}
            onChange={(value) => update("email", value)}
          />
          <Input
            label={t("supplierForm.phone")}
            value={form.phone}
            onChange={(value) => update("phone", value)}
          />
          <Input
            label={t("supplierForm.companyId")}
            value={form.ico}
            onChange={(value) => update("ico", value)}
          />
          <Input
            label={t("supplierForm.vatId")}
            value={form.dic}
            onChange={(value) => update("dic", value)}
          />
        </div>
        <TextArea
          label={t("supplierForm.address")}
          value={form.address}
          onChange={(value) => update("address", value)}
        />
        <TextArea
          label={t("supplierForm.note")}
          value={form.note}
          onChange={(value) => update("note", value)}
        />

        {error ? <FormError>{error}</FormError> : null}

        <button
          type="submit"
          disabled={isSaving}
          className={`${primaryButtonClass} w-full`}
        >
          {isSaving ? t("actions.saving") : t("supplierForm.save")}
        </button>
      </form>
    </ModalShell>
  );
}

function FormError({ children }) {
  return (
    <p role="alert" className="mt-3 text-[12px] font-medium text-red-700">
      {children}
    </p>
  );
}

function Input({ label, value, onChange, type = "text", ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#777777]">
        {label}
      </span>
      <input
        {...props}
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      />
    </label>
  );
}

function Select({ label, value, onChange, options, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#777777]">
        {label}
      </span>
      <select
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      >
        {options.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#777777]">
        {label}
      </span>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[13px] border border-line bg-white px-3.5 py-3 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
      />
    </label>
  );
}
