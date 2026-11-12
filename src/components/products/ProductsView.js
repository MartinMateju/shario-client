"use client";

import { isOpenStudioPlanEntitled } from "@/config/planEntitlements";
import OpenStudioPlanNotice from "./OpenStudioPlanNotice";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { WorkspaceTabPanel } from "@/components/dashboard/WorkspaceTabs";
import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import { normalizePlans } from "@/components/memberships/membership.utils";
import ConfirmationModal from "@/components/modals/ConformationModal";
import VoucherDeleteDialog from "@/components/vouchers/VoucherDeleteDialog";
import VoucherAllowance from "@/components/vouchers/VoucherAllowance";
import PromoCodesTable from "@/components/tables/PromoCodesTable";
import VoucherOrdersPanel from "@/components/vouchers/VoucherOrdersPanel";
import MembershipPlansPage from "@/components/views/membership_plans/MembershipPlansPage";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetAllMembershipPlansQuery } from "@/lib/features/memberships/membershipsApiSlice";
import {
  useDeleteProductMutation,
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from "@/lib/features/products/productsApiSlice";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import {
  getProductLocationId,
  isLocationSpecificProduct,
  isProductAvailableAtLocation,
} from "@/lib/features/products/products.contract.mjs";

import CatalogSectionTabs, { CATALOG_TABS_ID } from "./CatalogSectionTabs";
import ProductCatalog from "./ProductCatalog";
import ProductToolbar from "./ProductToolbar";
import {
  getProductCreateHref,
  getProductEditHref,
  getProductFormCloseHref,
  isGuidedProductSetupStep,
} from "./products.navigation";
import {
  buildProductUpdatePayload,
  getCategoryCounts,
  getOpenStudioProductsAtLocation,
  getProductCategory,
  getProductDescription,
  getProductId,
  getProductName,
  isProductActive,
  isProductBookableOnline,
  isLegacyCatalogProduct,
  PRODUCT_CATEGORIES,
  resolveCatalogSection,
} from "./products.utils";

const DEFAULT_PAGE_SIZE = 5;
const PRODUCT_BACKED_SECTIONS = new Set([
  "openStudio",
  "classes",
  "vouchers",
  "privateStudio",
]);

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

const isModuleEnabled = (tenant, module) => tenant?.modules?.[module] !== false;

function LegacyProductsPanel({
  products,
  messageKey,
  locale,
  canManage,
  updatingId,
  onEdit,
  onDelete,
  onToggle,
  t,
}) {
  if (!products.length) return null;

  return (
    <section className="rounded-[20px] border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-amber-950">
            {t(`${messageKey}.title`)}
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-amber-900/75">
            {t(`${messageKey}.description`)}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-semibold text-amber-900">
          {t(`${messageKey}.count`, { count: products.length })}
        </span>
      </div>
      <ProductCatalog
        products={products}
        view="table"
        locale={locale}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
        updatingId={updatingId}
        canManage={canManage}
        // Ambiguous legacy records may be reviewed, deactivated or deleted,
        // but editing would silently repurpose them into the V2 taxonomy.
        canEdit={() => false}
        isFiltered
        t={t}
      />
    </section>
  );
}

export default function ProductsView({
  showPageHeader = true,
  initialCategory = "openStudio",
}) {
  const locale = useLocale();
  const t = useTranslations("Products");
  const router = useRouter();
  const searchParams = useSearchParams();
  const guidedSetup = useGuidedSetupStep();

  const currentUser = useSelector(selectCurrentUser) || {};
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const activeStudioId = useSelector(selectActiveStudioId);

  const canViewProducts = hasPermission(
    workspaceAccess,
    PERMISSIONS.PRODUCTS_VIEW,
  );
  const canManageProducts = hasPermission(
    workspaceAccess,
    PERMISSIONS.PRODUCTS_MANAGE,
  );
  // Classes and voucher offers are stored by the generic products API, whose
  // authoritative server contract is products.view/manage.
  const canViewClasses = canViewProducts;
  const canManageClasses = canManageProducts;
  const canViewMemberships = hasPermission(
    workspaceAccess,
    PERMISSIONS.MEMBERSHIPS_VIEW,
  );
  const canManageMemberships = hasPermission(
    workspaceAccess,
    PERMISSIONS.MEMBERSHIPS_MANAGE,
  );
  const canViewVouchers = canViewProducts;
  const canManageVouchers = canManageProducts;
  const canViewVoucherCodes = hasPermission(
    workspaceAccess,
    PERMISSIONS.VOUCHERS_VIEW,
  );

  const sectionVisibility = useMemo(
    () => ({
      openStudio: canViewProducts,
      classes: canViewClasses,
      memberships:
        canViewMemberships && isModuleEnabled(currentTenant, "memberships"),
      vouchers: canViewVouchers,
      privateStudio: canViewProducts,
    }),
    [
      canViewClasses,
      canViewMemberships,
      canViewProducts,
      canViewVouchers,
      currentTenant,
    ],
  );

  const availableSections = useMemo(
    () => PRODUCT_CATEGORIES.filter((section) => sectionVisibility[section]),
    [sectionVisibility],
  );

  const requestedCategory = resolveCatalogSection({
    category: searchParams.get("category"),
    productKind:
      searchParams.get("productKind") || searchParams.get("productType"),
    productType: searchParams.get("productType"),
    setupTemplate: searchParams.get("setupTemplate"),
    fallback: initialCategory,
  });
  const activeCategory = availableSections.includes(requestedCategory)
    ? requestedCategory
    : availableSections[0] || "openStudio";
  const productBacked = PRODUCT_BACKED_SECTIONS.has(activeCategory);
  const showingVoucherCodes =
    activeCategory === "vouchers" && searchParams.get("view") === "codes";
  const showingVoucherOrders =
    activeCategory === "vouchers" && searchParams.get("view") === "orders";
  const showingVoucherRecords = showingVoucherCodes || showingVoucherOrders;
  const voucherProductId = searchParams.get("voucherProductId") || "";

  const productsQuery = useGetAllProductsQuery(
    {
      ...(activeStudioId ? { locationId: activeStudioId } : {}),
      includeUnassigned: true,
    },
    {
      skip: !canViewProducts,
      refetchOnMountOrArgChange: true,
    },
  );
  const membershipPlansQuery = useGetAllMembershipPlansQuery(
    { includeInactive: true },
    {
      skip:
        !canViewMemberships || !isModuleEnabled(currentTenant, "memberships"),
      refetchOnMountOrArgChange: true,
    },
  );

  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("table");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updatingId, setUpdatingId] = useState("");
  const [membershipCreateOpen, setMembershipCreateOpen] = useState(false);
  const [notice, setNotice] = useState(() =>
    searchParams.get("updated") === "1"
      ? { type: "success", message: t("notices.updated") }
      : searchParams.get("created") === "1"
        ? { type: "success", message: t("notices.created") }
        : null,
  );

  const products = useMemo(
    () =>
      canViewProducts && Array.isArray(productsQuery.currentData)
        ? productsQuery.currentData.filter(
            (product) =>
              isProductAvailableAtLocation(product, activeStudioId) ||
              (isLocationSpecificProduct(product) &&
                !getProductLocationId(product)),
          )
        : [],
    [activeStudioId, canViewProducts, productsQuery.currentData],
  );
  const openStudioProducts = getOpenStudioProductsAtLocation(
    products,
    activeStudioId,
  );
  const existingOpenStudio =
    openStudioProducts.length === 1 ? openStudioProducts[0] : null;
  const openStudioCatalogReady =
    Boolean(activeStudioId) &&
    Array.isArray(productsQuery.currentData) &&
    !productsQuery.isFetching &&
    !productsQuery.isError;
  const unassignedStudioProducts = products.filter(
    (product) =>
      isLocationSpecificProduct(product) &&
      !getProductLocationId(product) &&
      getProductCategory(product) === activeCategory,
  );
  const requestedProductId = searchParams.get("productId");
  const reviewOfferRequested =
    searchParams.get("setupStep") === "bookable_offer" &&
    searchParams.get("action") !== "create";
  const membershipPlans = normalizePlans(membershipPlansQuery.data);
  const legacyMembershipProducts = useMemo(
    () =>
      products.filter(
        (product) => getProductCategory(product) === "memberships",
      ),
    [products],
  );
  const unmappedLegacyProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          getProductCategory(product) === "legacy" &&
          isLegacyCatalogProduct(product),
      ),
    [products],
  );
  const legacyProductsForOpenStudio = useMemo(
    () =>
      sectionVisibility.memberships
        ? unmappedLegacyProducts
        : [...unmappedLegacyProducts, ...legacyMembershipProducts],
    [
      legacyMembershipProducts,
      unmappedLegacyProducts,
      sectionVisibility.memberships,
    ],
  );

  const workspaceName =
    currentTenant?.name || currentUser.tenantName || t("fallbackStudioName");

  const categoryCounts = useMemo(() => {
    const counts = getCategoryCounts(
      products.filter((product) =>
        isProductAvailableAtLocation(product, activeStudioId),
      ),
    );

    return {
      ...counts,
      memberships: membershipPlans.length + legacyMembershipProducts.length,
    };
  }, [
    activeStudioId,
    legacyMembershipProducts.length,
    membershipPlans.length,
    products,
  ]);

  const canManageActive =
    activeCategory === "memberships"
      ? canManageMemberships
      : activeCategory === "classes"
        ? canManageClasses
        : activeCategory === "vouchers"
          ? canManageVouchers
          : canManageProducts;
  const activeModuleEnabled =
    activeCategory === "openStudio"
      ? isModuleEnabled(currentTenant, "bookings")
      : activeCategory === "classes"
        ? isModuleEnabled(currentTenant, "courses")
        : activeCategory === "vouchers"
          ? isModuleEnabled(currentTenant, "vouchers")
          : true;
  const canCreateActive =
    canManageActive &&
    activeModuleEnabled &&
    (activeCategory !== "openStudio" ||
      isOpenStudioPlanEntitled(currentTenant)) &&
    (activeCategory !== "openStudio" ||
      (openStudioCatalogReady && openStudioProducts.length === 0));
  const canEditExistingOpenStudio =
    activeCategory === "openStudio" &&
    canManageActive &&
    Boolean(existingOpenStudio);
  const showPrimaryAction =
    canCreateActive ||
    canEditExistingOpenStudio ||
    (activeCategory === "openStudio" &&
      canManageActive &&
      activeModuleEnabled &&
      isOpenStudioPlanEntitled(currentTenant) &&
      openStudioProducts.length === 0);

  const filteredProducts = useMemo(() => {
    if (!productBacked) return [];

    const normalizedSearch = search.trim().toLocaleLowerCase(locale);

    return [...products]
      .filter((product) => {
        const categoryMatches =
          getProductCategory(product) === activeCategory &&
          isProductAvailableAtLocation(product, activeStudioId) &&
          !isLegacyCatalogProduct(product);
        const statusMatches =
          status === "all" ||
          (status === "active"
            ? isProductActive(product)
            : !isProductActive(product));
        const haystack = [
          getProductName(product, locale),
          getProductDescription(product, locale),
          product?.sku,
          product?.kind,
          product?.type,
          product?.bookingMode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale);

        return (
          categoryMatches &&
          statusMatches &&
          (!normalizedSearch || haystack.includes(normalizedSearch))
        );
      })
      .sort((left, right) => {
        const orderDifference =
          Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0);

        if (orderDifference) return orderDifference;

        return getProductName(left, locale).localeCompare(
          getProductName(right, locale),
          locale,
        );
      });
  }, [
    activeCategory,
    activeStudioId,
    locale,
    productBacked,
    products,
    search,
    status,
  ]);

  const guidedReviewProduct = useMemo(() => {
    if (
      !canManageProducts ||
      !productBacked ||
      (!requestedProductId && !reviewOfferRequested)
    ) {
      return null;
    }

    if (requestedProductId) {
      return (
        products.find(
          (product) => String(getProductId(product)) === requestedProductId,
        ) ?? null
      );
    }

    return (
      products.find(
        (product) =>
          getProductCategory(product) === activeCategory &&
          !isLegacyCatalogProduct(product) &&
          !isProductActive(product),
      ) ??
      products.find(
        (product) =>
          getProductCategory(product) === activeCategory &&
          !isLegacyCatalogProduct(product),
      ) ??
      null
    );
  }, [
    activeCategory,
    canManageProducts,
    productBacked,
    products,
    requestedProductId,
    reviewOfferRequested,
  ]);

  const totalPages = Math.max(Math.ceil(filteredProducts.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);

  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const rangeStart = filteredProducts.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const rangeEnd = Math.min(currentPage * pageSize, filteredProducts.length);
  const createRequested =
    productBacked &&
    canManageActive &&
    activeModuleEnabled &&
    (activeCategory !== "openStudio" || openStudioCatalogReady) &&
    requestedCategory === activeCategory &&
    searchParams.get("action") === "create";
  const productNoticeRequested =
    searchParams.get("created") === "1" || searchParams.get("updated") === "1";
  const membershipCreateRequested =
    activeCategory === "memberships" &&
    requestedCategory === activeCategory &&
    canManageMemberships &&
    searchParams.get("action") === "create";

  useEffect(() => {
    if (!createRequested) return;
    if (activeCategory === "openStudio" && openStudioProducts.length > 1)
      return;

    router.replace(
      existingOpenStudio && activeCategory === "openStudio"
        ? getProductEditHref({
            productId: getProductId(existingOpenStudio),
            category: activeCategory,
            searchParams,
          })
        : getProductCreateHref({
            category: activeCategory,
            searchParams,
          }),
      { scroll: false },
    );
  }, [
    activeCategory,
    createRequested,
    existingOpenStudio,
    openStudioProducts.length,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!productNoticeRequested) return;

    const query = new URLSearchParams(searchParams.toString());
    query.delete("created");
    query.delete("updated");
    const suffix = query.toString();
    router.replace(`/app/products${suffix ? `?${suffix}` : ""}`, {
      scroll: false,
    });
  }, [productNoticeRequested, router, searchParams]);

  useEffect(() => {
    const productId = getProductId(guidedReviewProduct);
    if (!productId) return;

    router.replace(
      getProductEditHref({
        productId,
        category: getProductCategory(guidedReviewProduct),
        searchParams,
      }),
      { scroll: false },
    );
  }, [guidedReviewProduct, router, searchParams]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const clearActionParam = useCallback(() => {
    if (
      searchParams.get("action") ||
      isGuidedProductSetupStep(searchParams.get("setupStep"))
    ) {
      router.replace(
        getProductFormCloseHref(searchParams.get("setupStep"), activeCategory),
        {
          scroll: false,
        },
      );
    }
  }, [activeCategory, router, searchParams]);

  const handleMembershipCreateOpenChange = useCallback(
    (nextOpen) => {
      setMembershipCreateOpen(nextOpen);
      if (!nextOpen) clearActionParam();
    },
    [clearActionParam],
  );

  const openCreate = () => {
    if (!canCreateActive) return;

    if (activeCategory === "memberships") {
      setMembershipCreateOpen(true);
      return;
    }

    router.push(
      getProductCreateHref({
        category: activeCategory,
        searchParams,
      }),
    );
  };

  const handleCategoryChange = (category) => {
    if (!availableSections.includes(category)) return;

    setPage(1);
    setSearch("");
    setStatus("all");
    setShowFilters(false);
    setMembershipCreateOpen(false);

    const query = new URLSearchParams(searchParams.toString());
    query.set("category", category);
    query.delete("action");
    query.delete("productKind");
    query.delete("productType");
    query.delete("setupTemplate");
    query.delete("view");
    query.delete("voucherProductId");

    router.replace(`/app/products?${query.toString()}`, {
      scroll: false,
    });
  };

  const openVoucherCodes = (product) => {
    const query = new URLSearchParams({ category: "vouchers", view: "codes" });
    if (product) query.set("voucherProductId", getProductId(product));
    router.push(`/app/products?${query.toString()}`);
  };

  const openEdit = (product) => {
    const productId = getProductId(product);
    if (!canManageActive || !productId || isLegacyCatalogProduct(product)) {
      return;
    }

    router.push(
      getProductEditHref({
        productId,
        category: getProductCategory(product),
        searchParams,
      }),
    );
  };

  const handleToggle = async (product) => {
    const productId = getProductId(product);

    if (!canManageProducts || !productId || updatingId) return;

    setUpdatingId(productId);
    setNotice(null);

    try {
      await updateProduct(
        buildProductUpdatePayload(product, {
          isActive: !isProductActive(product),
        }),
      ).unwrap();
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("notices.updateError")),
      });
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async () => {
    const productId = getProductId(deleteTarget);

    if (!canManageProducts || !productId) return;

    try {
      await deleteProduct({ id: productId }).unwrap();
      setDeleteTarget(null);
      setNotice({
        type: "success",
        message: t(
          isLocationSpecificProduct(deleteTarget)
            ? "notices.archived"
            : "notices.deleted",
        ),
      });
    } catch (error) {
      setNotice({
        type: "error",
        message: getErrorMessage(error, t("notices.deleteError")),
      });
    }
  };

  if (!availableSections.length) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-line bg-white px-6 text-center text-[12px] text-ink-muted">
        {t("noAccess")}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        {activeCategory === "openStudio" &&
        !isOpenStudioPlanEntitled(currentTenant) ? (
          <OpenStudioPlanNotice t={t} />
        ) : null}
        <WorkspaceSectionHeader
          showTitle={showPageHeader}
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description", { studio: workspaceName })}
          actions={
            showingVoucherRecords ? null : showPrimaryAction ? (
              <button
                type="button"
                onClick={() =>
                  canEditExistingOpenStudio
                    ? openEdit(existingOpenStudio)
                    : openCreate()
                }
                disabled={!canEditExistingOpenStudio && !canCreateActive}
                data-contextual-guide-target="first-offer-create"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white shadow-cobalt transition enabled:hover:-translate-y-0.5 enabled:hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {canEditExistingOpenStudio ? (
                  <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {t(
                  canEditExistingOpenStudio
                    ? "openStudioLimit.edit"
                    : `sections.${activeCategory}.action`,
                )}
              </button>
            ) : activeCategory === "openStudio" &&
              canManageActive &&
              openStudioProducts.length > 1 ? null : canManageActive &&
              !activeModuleEnabled ? (
              <span className="inline-flex min-h-9 items-center rounded-full border border-amber-200 bg-amber-50 px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-800">
                {t("moduleDisabled")}
              </span>
            ) : activeCategory === "memberships" && canManageProducts ? (
              <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {t("plansReadOnly")}
              </span>
            ) : (
              <span className="inline-flex min-h-9 items-center rounded-full border border-line bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {t("readOnly")}
              </span>
            )
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

        {activeCategory === "vouchers" && !showingVoucherRecords && (
          <VoucherAllowance />
        )}

        <CatalogSectionTabs
          value={activeCategory}
          counts={categoryCounts}
          availableSections={availableSections}
          onChange={handleCategoryChange}
          t={t}
        />

        {availableSections
          .filter((section) => section !== activeCategory)
          .map((section) => (
            <WorkspaceTabPanel
              key={section}
              tabsId={CATALOG_TABS_ID}
              tabId={section}
              active={false}
            />
          ))}

        <WorkspaceTabPanel
          tabsId={CATALOG_TABS_ID}
          tabId={activeCategory}
          className="min-h-[360px]"
        >
          {activeCategory === "vouchers" && canViewVoucherCodes && (
            <nav
              aria-label={t("voucherCodes.navigation")}
              className="mb-5 flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-current={!showingVoucherRecords ? "page" : undefined}
                onClick={() => handleCategoryChange("vouchers")}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold ${!showingVoucherRecords ? "border-cobalt-500 bg-cobalt-50 text-cobalt-800" : "border-line bg-white text-ink-soft"}`}
              >
                {t("voucherCodes.offerings")}
              </button>
              <button
                type="button"
                aria-current={
                  showingVoucherCodes && !voucherProductId ? "page" : undefined
                }
                onClick={() => openVoucherCodes()}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold ${showingVoucherCodes && !voucherProductId ? "border-cobalt-500 bg-cobalt-50 text-cobalt-800" : "border-line bg-white text-ink-soft"}`}
              >
                {t("voucherCodes.allCodes")}
              </button>
              <button
                type="button"
                aria-current={showingVoucherOrders ? "page" : undefined}
                onClick={() =>
                  router.push("/app/products?category=vouchers&view=orders")
                }
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold ${showingVoucherOrders ? "border-cobalt-500 bg-cobalt-50 text-cobalt-800" : "border-line bg-white text-ink-soft"}`}
              >
                {t("voucherCodes.orders")}
              </button>
            </nav>
          )}
          {activeCategory === "openStudio" && (
            <section className="mb-5 rounded-[20px] border border-cobalt-200 bg-cobalt-50 px-5 py-4 sm:px-6">
              <h2 className="text-[15px] font-semibold text-cobalt-900">
                {t("openStudioLimit.title")}
              </h2>
              <p className="mt-1 max-w-3xl text-[13px] leading-6 text-ink-soft">
                {t("openStudioLimit.description")}
              </p>
              {openStudioProducts.length > 0 && (
                <p className="mt-2 text-[13px] font-medium leading-6 text-cobalt-800">
                  {t(
                    openStudioProducts.length > 1
                      ? "openStudioLimit.duplicates"
                      : "openStudioLimit.existing",
                  )}
                </p>
              )}
              {!activeStudioId && (
                <p className="mt-2 text-[13px] leading-6 text-cobalt-800">
                  {t("openStudioLimit.selectLocation")}
                </p>
              )}
            </section>
          )}
          {showingVoucherOrders ? (
            <VoucherOrdersPanel />
          ) : showingVoucherCodes ? (
            canViewVoucherCodes ? (
              <PromoCodesTable
                productId={voucherProductId}
                productName={
                  (productsQuery.currentData || []).find(
                    (product) => getProductId(product) === voucherProductId,
                  )
                    ? getProductName(
                        productsQuery.currentData.find(
                          (product) =>
                            getProductId(product) === voucherProductId,
                        ),
                        locale,
                      )
                    : ""
                }
              />
            ) : (
              <p className="rounded-2xl border border-line bg-white p-5 text-sm text-ink-muted">
                {t("voucherCodes.noAccess")}
              </p>
            )
          ) : activeCategory === "memberships" ? (
            <div className="space-y-7">
              <MembershipPlansPage
                showPageHeader={false}
                embedded
                createOpen={membershipCreateOpen || membershipCreateRequested}
                onCreateOpenChange={handleMembershipCreateOpenChange}
                guidedSetup={guidedSetup.guided}
                onGuidedSaved={() =>
                  guidedSetup.refreshAndContinue({
                    metadata: { form: "membership" },
                  })
                }
              />

              <LegacyProductsPanel
                products={legacyMembershipProducts}
                messageKey="legacyMemberships"
                locale={locale}
                canManage={canManageProducts}
                updatingId={updatingId}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggle={handleToggle}
                t={t}
              />
            </div>
          ) : productsQuery.isLoading ||
            (productsQuery.isFetching && !productsQuery.currentData) ? (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <div className="h-20 animate-pulse rounded-[20px] border border-line bg-white/65" />
              <div className="h-80 animate-pulse rounded-[20px] border border-line bg-white/65" />
              <span className="sr-only">{t("loading")}</span>
            </div>
          ) : productsQuery.isError ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[22px] border border-line bg-white px-6 text-center">
              <h2 className="text-[19px] font-semibold text-[#252524]">
                {t("loadError")}
              </h2>
              <button
                type="button"
                onClick={() => productsQuery.refetch()}
                className="mt-5 min-h-11 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white"
              >
                {t("retry")}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-[#252524]">
                    {t(`sections.${activeCategory}.heading`)}
                  </h2>
                  <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink-muted">
                    {t(`sections.${activeCategory}.detail`)}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-ink-muted">
                  {t("sectionCount", {
                    count: filteredProducts.length,
                  })}
                </span>
              </div>

              <ProductToolbar
                search={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                searchPlaceholder={t(
                  `sections.${activeCategory}.searchPlaceholder`,
                )}
                status={status}
                onStatusChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                view={view}
                onViewChange={setView}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((current) => !current)}
                t={t}
              />

              {unassignedStudioProducts.length > 0 && (
                <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-5">
                  <h2 className="font-semibold">
                    {t("locationAssignment.title")}
                  </h2>
                  <p className="mb-4 mt-1 text-sm">
                    {t("locationAssignment.description")}
                  </p>
                  <ProductCatalog
                    products={unassignedStudioProducts}
                    view="table"
                    locale={locale}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onToggle={openEdit}
                    updatingId={updatingId}
                    canManage={canManageActive}
                    isFiltered
                    t={t}
                  />
                </section>
              )}

              <div data-contextual-guide-target="first-offer-catalog">
                <ProductCatalog
                  products={visibleProducts}
                  view={view}
                  locale={locale}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggle}
                  onManageCodes={
                    activeCategory === "vouchers" && canViewVoucherCodes
                      ? openVoucherCodes
                      : undefined
                  }
                  updatingId={updatingId}
                  canManage={canManageActive}
                  canCreate={canCreateActive}
                  onCreate={openCreate}
                  isFiltered={Boolean(search.trim()) || status !== "all"}
                  emptyTitle={t(`sections.${activeCategory}.emptyTitle`)}
                  emptyDescription={t(
                    activeCategory === "openStudio" &&
                      !isOpenStudioPlanEntitled(currentTenant)
                      ? "openStudioPlan.description"
                      : `sections.${activeCategory}.emptyDescription`,
                  )}
                  createLabel={t(`sections.${activeCategory}.action`)}
                  t={t}
                />
              </div>

              <footer className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12px] text-ink-muted">
                  {t("pagination.showing", {
                    from: rangeStart,
                    to: rangeEnd,
                    total: filteredProducts.length,
                  })}
                </p>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPage(Math.max(currentPage - 1, 1))}
                      disabled={currentPage <= 1}
                      aria-label={t("pagination.previous")}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white text-[#555553] transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="min-w-10 text-center text-[12px] font-semibold text-ink-soft">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPage(Math.min(currentPage + 1, totalPages))
                      }
                      disabled={currentPage >= totalPages}
                      aria-label={t("pagination.next")}
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white text-[#555553] transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRightIcon
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-[12px] text-ink-muted">
                    <span className="hidden sm:inline">
                      {t("pagination.rows")}
                    </span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(1);
                      }}
                      className="h-9 min-w-[4.5rem] rounded-[10px] border border-line bg-white pl-3 pr-9 text-[12px] text-ink-soft outline-none focus:border-cobalt-500"
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

              {activeCategory === "openStudio" ? (
                <LegacyProductsPanel
                  products={legacyProductsForOpenStudio}
                  messageKey="legacyProducts"
                  locale={locale}
                  canManage={canManageProducts}
                  updatingId={updatingId}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                  onToggle={handleToggle}
                  t={t}
                />
              ) : null}
            </div>
          )}
        </WorkspaceTabPanel>
      </div>

      {canManageProducts && getProductCategory(deleteTarget) === "vouchers" ? (
        <VoucherDeleteDialog
          key={getProductId(deleteTarget)}
          product={deleteTarget}
          locale={locale}
          onClose={() => setDeleteTarget(null)}
          onSaved={(message) => {
            setDeleteTarget(null);
            setNotice({ type: "success", message });
          }}
        />
      ) : (
        canManageProducts && (
          <ConfirmationModal
            open={Boolean(deleteTarget)}
            setOpen={(open) => {
              if (!open && !isDeleting) setDeleteTarget(null);
            }}
            title={t(
              isLocationSpecificProduct(deleteTarget)
                ? "archive.title"
                : "delete.title",
            )}
            text={t(
              isLocationSpecificProduct(deleteTarget)
                ? "archive.message"
                : "delete.message",
              {
                name: getProductName(deleteTarget, locale),
              },
            )}
            onConfirm={handleDelete}
            confirmText={t(
              isLocationSpecificProduct(deleteTarget)
                ? "actions.archive"
                : "delete.confirm",
            )}
            cancelText={t("delete.cancel")}
            isLoading={isDeleting}
          />
        )
      )}
    </>
  );
}
