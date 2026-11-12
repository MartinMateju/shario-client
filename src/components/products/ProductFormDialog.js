"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "@/i18n/navigation";
import { isOpenStudioPlanEntitled } from "@/config/planEntitlements";
import OpenStudioPlanNotice from "./OpenStudioPlanNotice";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  WorkspaceFormActions,
  workspaceInputClass,
  workspaceLabelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  DEFAULT_STUDIO_COMMERCE_CURRENCY,
  STUDIO_COMMERCE_CURRENCY_OPTIONS,
  resolveStudioCommerceCurrency,
} from "@/config/currencies";
import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import {
  selectActiveStudioId,
  setActiveStudioId,
} from "@/lib/features/studio/studioContextSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  normalizeLocationsResponse,
  getPrimaryLocation,
  getTenantIdFromUser,
} from "@/lib/features/locations/location.utils";
import {
  useAddNewProductMutation,
  useGetAllProductsQuery,
  useUpdateProductMutation,
} from "@/lib/features/products/productsApiSlice";
import {
  OPEN_STUDIO_BOOKING_MODE,
  PRODUCT_KIND,
  normalizeProductKind,
  getProductLocationId,
  isLocationSpecificProduct,
} from "@/lib/features/products/products.contract.mjs";
import { getMajorCurrencyInputStep } from "@/utils/money";
import ProductImageField from "./ProductImageField";
import ClassCategoryField from "./ClassCategoryField";
import CourseContentFields from "./CourseContentFields";
import {
  getCourseContentError,
  getCourseContentForm,
} from "./courseContentForm";
import { getProductEditHref } from "./products.navigation";
import VoucherValidityFields from "@/components/vouchers/VoucherValidityFields";
import VoucherPhysicalDeliveryFields from "@/components/vouchers/VoucherPhysicalDeliveryFields";
import {
  buildVoucherPhysicalDelivery,
  getVoucherPhysicalDeliveryForm,
  isVoucherPostageValid,
} from "@/components/vouchers/voucherPhysicalDelivery.mjs";
import VoucherDesignEditor from "@/components/vouchers/editor/VoucherDesignEditor";
import VoucherEditorConfirmation from "@/components/vouchers/editor/VoucherEditorConfirmation";
import { isVoucherDesignValid } from "@/components/vouchers/editor/voucherDesign";
import {
  buildVoucherSettings,
  getVoucherValidityForm,
  isVoucherValidityValid,
} from "@/components/vouchers/voucherValidity.mjs";
import {
  getProductDescription,
  getDefaultProductType,
  getProductId,
  getProductKind,
  getProductName,
  getProductFormTypes,
  getOpenStudioBookingMode,
  getOpenStudioProductsAtLocation,
  getProductTypeKey,
  isProductActive,
} from "./products.utils";
const EMPTY_FORM = {
  ...getVoucherValidityForm(),
  ...getVoucherPhysicalDeliveryForm(),
  name: "",
  locationId: "",
  description: "",
  classCategory: "",
  sku: "",
  kind: PRODUCT_KIND.OPEN_STUDIO,
  bookingMode: OPEN_STUDIO_BOOKING_MODE.PUBLIC,
  publicCapacityMode: "activity",
  publicCapacityLimit: "2",
  privateBookingSurcharge: "0",
  price: "",
  maxNumberOfParticipants: "1",
  currency: DEFAULT_STUDIO_COMMERCE_CURRENCY,
  imageSrc: "",
  label: "",
  isActive: true,
  sortOrder: "0",
};
const BOOKABLE_CAPACITY_KINDS = new Set([
  PRODUCT_KIND.OPEN_STUDIO,
  PRODUCT_KIND.CLASS,
]);
const SETUP_TEMPLATE_KINDS = Object.freeze({
  open_studio: PRODUCT_KIND.OPEN_STUDIO,
  "open-studio": PRODUCT_KIND.OPEN_STUDIO,
  course: PRODUCT_KIND.CLASS,
  workshop: PRODUCT_KIND.OPEN_STUDIO,
  class: PRODUCT_KIND.CLASS,
  voucher: PRODUCT_KIND.VOUCHER,
  membership: PRODUCT_KIND.MEMBERSHIP,
  private_session: PRODUCT_KIND.OPEN_STUDIO,
  private_studio: PRODUCT_KIND.PRIVATE_STUDIO,
  "private-studio": PRODUCT_KIND.PRIVATE_STUDIO,
});
const PRODUCT_FORM_KINDS = new Set([
  "openStudio",
  "classes",
  "vouchers",
  "privateStudio",
  "legacy",
]);
const inputClass = workspaceInputClass;
const labelClass = workspaceLabelClass;
const getApiError = (error, fallback) =>
  error?.data?.message || error?.error || fallback;
const getInitialForm = ({
  product,
  initialType,
  initialTemplate,
  guided = false,
  catalogKind,
  locale,
  tenantCurrency,
}) => {
  if (!product) {
    const templateKind = SETUP_TEMPLATE_KINDS[initialTemplate];
    const productKinds = getProductFormTypes(catalogKind);
    const requestedKind = normalizeProductKind(initialType);
    const kind = productKinds.includes(requestedKind)
      ? requestedKind
      : productKinds.includes(templateKind)
        ? templateKind
        : getDefaultProductType(catalogKind);
    const privateStudio = kind === PRODUCT_KIND.PRIVATE_STUDIO;
    return {
      ...EMPTY_FORM,
      courseContent: getCourseContentForm(),
      kind,
      bookingMode:
        initialTemplate === "private_session"
          ? OPEN_STUDIO_BOOKING_MODE.PRIVATE
          : OPEN_STUDIO_BOOKING_MODE.PUBLIC,
      price: privateStudio ? "0" : EMPTY_FORM.price,
      maxNumberOfParticipants: privateStudio
        ? ""
        : EMPTY_FORM.maxNumberOfParticipants,
      currency: tenantCurrency,
      label: catalogKind === "vouchers" ? "voucher" : EMPTY_FORM.label,
    };
  }
  return {
    ...getVoucherValidityForm(product?.voucherSettings),
    ...getVoucherPhysicalDeliveryForm(
      product?.voucherSettings,
      product?.currency || tenantCurrency,
    ),
    name: getProductName(product, locale),
    locationId: getProductLocationId(product),
    description: getProductDescription(product, locale),
    classCategory: product?.classCategory || "",
    courseContent: getCourseContentForm(product?.courseContent),
    sku: product?.sku || "",
    kind: getProductKind(product) || PRODUCT_KIND.OPEN_STUDIO,
    bookingMode: getOpenStudioBookingMode(product),
    publicCapacityMode:
      product?.openStudioPolicy?.publicCapacityMode || "activity",
    publicCapacityLimit: String(
      product?.openStudioPolicy?.publicCapacityLimit ?? 2,
    ),
    privateBookingSurcharge: String(
      product?.openStudioPolicy?.privateBookingSurcharge ?? 0,
    ),
    price: String(product?.price ?? ""),
    maxNumberOfParticipants: String(product?.maxNumberOfParticipants ?? ""),
    currency: resolveStudioCommerceCurrency(
      product?.currency || tenantCurrency,
    ),
    imageSrc: product?.imageSrc || "",
    label: product?.label || "",
    isActive: isProductActive(product),
    sortOrder: String(product?.sortOrder ?? 0),
  };
};
export default function ProductFormDialog({
  open,
  product,
  duplicate = false,
  initialType,
  initialTemplate,
  catalogKind = "openStudio",
  locale,
  onClose,
  onSaved,
  guided = false,
  guidedStep = "",
  surface = "dialog",
  t,
}) {
  const setupT = useTranslations("SetupCenter");
  const voucherT = useTranslations("VoucherFoundation");
  const editorT = useTranslations("VoucherEditor");
  const resolvedCatalogKind = PRODUCT_FORM_KINDS.has(catalogKind)
    ? catalogKind
    : "openStudio";
  const currentTenant = useSelector(selectCurrentTenant);
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  const activeStudioId = useSelector(selectActiveStudioId);
  const [createProduct, { isLoading: isCreating }] = useAddNewProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const configuredTenantCurrency = currentTenant?.settings?.currency;
  const tenantCurrency = resolveStudioCommerceCurrency(
    configuredTenantCurrency,
  );
  const [form, setForm] = useState(() => ({
    ...getInitialForm({
      product,
      initialType,
      initialTemplate,
      catalogKind: resolvedCatalogKind,
      locale,
      tenantCurrency,
    }),
    ...(duplicate
      ? {
          locationId: "",
          sku: "",
          isActive: false,
        }
      : {}),
  }));
  const [imageFile, setImageFile] = useState(null);
  const [templatePdf, setTemplatePdf] = useState(null);
  const [voucherMode, setVoucherMode] = useState(() =>
    product?.voucherDesign
      ? "editor"
      : product?.voucherTemplate
        ? "pdf"
        : "editor",
  );
  const [voucherDesign, setVoucherDesign] = useState(
    product?.voucherDesign || null,
  );
  const [voucherEditorBusy, setVoucherEditorBusy] = useState(false);
  const [voucherEditorValid, setVoucherEditorValid] = useState(
    Boolean(product?.voucherDesign),
  );
  const [voucherDirty, setVoucherDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingNavigation = useRef(null);
  const navigationApproved = useRef(false);
  const [error, setError] = useState("");
  const [openStudioConflict, setOpenStudioConflict] = useState(null);
  const [capacityEdited, setCapacityEdited] = useState(false);
  const editing = !duplicate && Boolean(getProductId(product));
  const locationSpecific = isLocationSpecificProduct(form);
  const locationsQuery = useGetLocationsQuery(
    {
      limit: 100,
    },
    {
      skip: !locationSpecific && form.kind !== PRODUCT_KIND.CLASS,
    },
  );
  const locations = normalizeLocationsResponse(locationsQuery.data);
  const selectableLocations = locations.filter(
    (location) =>
      location.isActive !== false &&
      (!duplicate || location.id !== getProductLocationId(product)),
  );
  const defaultLocationId =
    selectableLocations.find((location) => location.id === activeStudioId)
      ?.id ||
    getPrimaryLocation(selectableLocations)?.id ||
    "";
  const locationId =
    form.locationId || (!editing && !duplicate ? defaultLocationId : "");
  const locationLocked = editing && Boolean(getProductLocationId(product));
  const isLoading = isCreating || isUpdating;
  const capacityRequired = BOOKABLE_CAPACITY_KINDS.has(form.kind);
  const isOpenStudio = form.kind === PRODUCT_KIND.OPEN_STUDIO;
  const openStudioPlanUnavailable =
    isOpenStudio && !isOpenStudioPlanEntitled(currentTenant);
  const openStudioPlanBlocked =
    openStudioPlanUnavailable && (!editing || form.isActive);
  // Existing assigned Open Studio products remain editable even if legacy
  // duplicates exist. Only a new claim on a location needs an available slot.
  const claimsOpenStudioLocation =
    isOpenStudio &&
    (!editing ||
      getProductKind(product) !== PRODUCT_KIND.OPEN_STUDIO ||
      getProductLocationId(product) !== locationId);
  const openStudioProductsQuery = useGetAllProductsQuery(
    {
      locationId,
    },
    {
      skip: !open || !claimsOpenStudioLocation || !locationId,
      refetchOnMountOrArgChange: true,
    },
  );
  const existingOpenStudio = getOpenStudioProductsAtLocation(
    openStudioProductsQuery.currentData,
    locationId,
    {
      excludeProductId: editing ? getProductId(product) : undefined,
    },
  )[0];
  const serverOpenStudioConflict =
    isOpenStudio && openStudioConflict?.locationId === locationId
      ? openStudioConflict
      : null;
  const openStudioOccupied = Boolean(
    serverOpenStudioConflict ||
    (claimsOpenStudioLocation && existingOpenStudio),
  );
  const checkingOpenStudio = Boolean(
    claimsOpenStudioLocation &&
    locationId &&
    !openStudioProductsQuery.isError &&
    (openStudioProductsQuery.isFetching ||
      openStudioProductsQuery.isLoading ||
      !Array.isArray(openStudioProductsQuery.currentData)),
  );
  const openStudioCheckFailed = Boolean(
    claimsOpenStudioLocation && locationId && openStudioProductsQuery.isError,
  );
  const openStudioSaveBlocked =
    openStudioPlanBlocked ||
    openStudioOccupied ||
    checkingOpenStudio ||
    openStudioCheckFailed;
  const existingOpenStudioId =
    getProductId(existingOpenStudio) || serverOpenStudioConflict?.productId;
  const isCustomerChoice =
    isOpenStudio &&
    form.bookingMode === OPEN_STUDIO_BOOKING_MODE.CUSTOMER_CHOICE;
  const locationCapacity = Number(
    locations.find((location) => location.id === locationId)?.booking
      ?.globalCapacity,
  );
  const hasLocationCapacity =
    Number.isSafeInteger(locationCapacity) && locationCapacity > 0;
  // This is a starting value for a new offer, not a saved inheritance policy.
  // Existing products, duplicates and a user's explicit limit stay unchanged.
  const maxNumberOfParticipants =
    !product && isOpenStudio && !capacityEdited && hasLocationCapacity
      ? String(Math.min(500, locationCapacity))
      : form.maxNumberOfParticipants;
  const isClass = form.kind === PRODUCT_KIND.CLASS;
  const isVoucher = form.kind === PRODUCT_KIND.VOUCHER;
  const voucherUnsaved = isVoucher && voucherDirty;
  const formBusy = isLoading || (isVoucher && voucherEditorBusy);
  const initializeVoucherDesign = useCallback(
    (design) => setVoucherDesign(design),
    [],
  );
  const changeVoucherDesign = useCallback((design) => {
    setVoucherDesign(design);
    setVoucherDirty(true);
  }, []);
  const requestClose = () => {
    if (formBusy) return;
    if (voucherUnsaved) {
      pendingNavigation.current = null;
      setDiscardOpen(true);
    } else onClose();
  };
  useEffect(() => {
    if (!voucherUnsaved) return undefined;
    const beforeUnload = (event) => {
      if (navigationApproved.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const beforeNavigation = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const destination = new URL(link.href, window.location.href);
      if (
        !["http:", "https:"].includes(destination.protocol) ||
        destination.href === window.location.href ||
        (destination.origin === window.location.origin &&
          destination.pathname === window.location.pathname &&
          destination.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      pendingNavigation.current = destination.href;
      setDiscardOpen(true);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigation, true);
    };
  }, [voucherUnsaved]);
  const isPrivateStudio = form.kind === PRODUCT_KIND.PRIVATE_STUDIO;
  const title = t(
    `form.kinds.${resolvedCatalogKind}.${editing ? "editTitle" : "createTitle"}`,
  );
  const productKindOptions = useMemo(() => {
    return getProductFormTypes(
      resolvedCatalogKind,
      editing ? form.kind : undefined,
    );
  }, [editing, form.kind, resolvedCatalogKind]);
  const showTypeSelector = productKindOptions.length > 1;
  const updateField = (field, value) => {
    if (isVoucher) setVoucherDirty(true);
    if (field === "maxNumberOfParticipants") setCapacityEdited(true);
    if (field === "locationId" && value !== locationId) {
      setOpenStudioConflict(null);
    }
    setForm((previous) => ({
      ...previous,
      [field]: value,
      ...(field === "kind" &&
      BOOKABLE_CAPACITY_KINDS.has(value) &&
      !previous.maxNumberOfParticipants
        ? {
            maxNumberOfParticipants: "1",
          }
        : {}),
      ...(field === "kind" && value !== PRODUCT_KIND.CLASS
        ? {
            classCategory: "",
          }
        : {}),
    }));
    if (error) setError("");
  };
  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setTemplatePdf(null);
      return;
    }
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf || file.size > 10 * 1024 * 1024) {
      event.target.value = "";
      setTemplatePdf(null);
      setError(t("form.pdfError"));
      return;
    }
    setTemplatePdf(file);
    setVoucherDirty(true);
    setError("");
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (openStudioSaveBlocked) return;
    if (
      locationSpecific &&
      (!locationId ||
        (!locationLocked &&
          !selectableLocations.some((location) => location.id === locationId)))
    ) {
      setError(t("form.locationRequired"));
      return;
    }
    if (isVoucher && !isVoucherPostageValid(form)) {
      setError(voucherT("physicalDelivery.invalid"));
      return;
    }
    const voucherSettings = isVoucher
      ? {
          ...buildVoucherSettings(form),
          physicalDelivery: buildVoucherPhysicalDelivery(form),
        }
      : null;
    if (voucherSettings && !isVoucherValidityValid(voucherSettings.validity)) {
      setError(voucherT("validity.invalid"));
      return;
    }
    if (
      isVoucher &&
      (voucherEditorBusy ||
        (voucherMode === "editor" &&
          (!isVoucherDesignValid(voucherDesign) || !voucherEditorValid)))
    ) {
      setError(editorT("invalidDesign"));
      return;
    }
    if (
      isVoucher &&
      voucherMode === "pdf" &&
      !templatePdf &&
      !product?.voucherTemplate
    ) {
      setError(editorT("pdfRequired"));
      return;
    }
    const name = form.name.trim();
    const priceInput = isPrivateStudio ? "0" : String(form.price).trim();
    const price = isPrivateStudio ? 0 : Number(form.price);
    const capacity = isCustomerChoice
      ? Number(maxNumberOfParticipants) || 1
      : Number(maxNumberOfParticipants);
    const publicCapacityLimit = Number(form.publicCapacityLimit);
    const privateBookingSurcharge = Number(form.privateBookingSurcharge);
    if (
      isCustomerChoice &&
      (!String(form.privateBookingSurcharge).trim() ||
        !Number.isFinite(privateBookingSurcharge) ||
        privateBookingSurcharge < 0 ||
        (form.publicCapacityMode === "fixed" &&
          (!Number.isSafeInteger(publicCapacityLimit) ||
            publicCapacityLimit < 1)))
    ) {
      setError(t("form.openStudioPolicy.invalid"));
      return;
    }
    if (
      !name ||
      !form.kind ||
      !priceInput ||
      !Number.isFinite(price) ||
      price < 0 ||
      (false && !selectedPiecePricingProfileIsActive) ||
      (capacityRequired &&
        (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 500))
    ) {
      setError(t("form.requiredError"));
      return;
    }
    if (isClass) {
      const courseContentError = getCourseContentError(form.courseContent);
      if (courseContentError) {
        setError(t(courseContentError));
        return;
      }
    }
    const body = new FormData();
    if (editing) body.append("id", getProductId(product));
    body.append("name", name);
    body.append("description", form.description.trim());
    if (isClass) {
      body.append("classCategory", form.classCategory.trim());
      body.append("courseContent", JSON.stringify(form.courseContent));
    }
    body.append("sku", form.sku.trim());
    body.append("kind", form.kind);
    if (locationSpecific) body.append("locationId", locationId);
    if (isOpenStudio) body.append("bookingMode", form.bookingMode);
    if (isCustomerChoice)
      body.append(
        "openStudioPolicy",
        JSON.stringify({
          publicCapacityMode: form.publicCapacityMode,
          publicCapacityLimit:
            form.publicCapacityMode === "fixed" ? publicCapacityLimit : null,
          privateBookingSurcharge,
        }),
      );
    body.append("price", String(price));
    if (duplicate)
      body.append("extraCharge", String(product?.extraCharge ?? 0));
    body.append(
      "maxNumberOfParticipants",
      isPrivateStudio
        ? ""
        : isCustomerChoice
          ? String(capacity)
          : String(maxNumberOfParticipants || ""),
    );
    body.append("currency", form.currency);
    body.append("imageSrc", form.imageSrc.trim());
    if (imageFile) body.append("image", imageFile);
    body.append(
      "label",
      isVoucher && !form.label.trim() ? "voucher" : form.label.trim(),
    );
    body.append("isActive", form.isActive ? "true" : "false");
    body.append("sortOrder", String(Number(form.sortOrder || 0)));
    if (voucherSettings) {
      body.append("voucherSettings", JSON.stringify(voucherSettings));
      body.append(
        "voucherDesign",
        JSON.stringify(voucherMode === "editor" ? voucherDesign : null),
      );
    }
    if (editing && product?.voucherTemplate) {
      body.append("voucherTemplate", product.voucherTemplate);
    }
    if (editing && typeof product?.couponProduct === "string") {
      body.append("couponProduct", product.couponProduct);
    }
    if (templatePdf && (!isVoucher || voucherMode === "pdf"))
      body.append("file", templatePdf);
    try {
      const response = editing
        ? await updateProduct(body).unwrap()
        : await createProduct(body).unwrap();
      setVoucherDirty(false);
      if (duplicate && locationSpecific) {
        dispatch(
          setActiveStudioId({
            tenantId: getTenantIdFromUser(currentUser),
            studioId: locationId,
          }),
        );
      }
      const guidedHandled = await onSaved?.(
        response?.product || response,
        editing ? "updated" : "created",
      );
      if (!guidedHandled) onClose();
    } catch (requestError) {
      if (requestError?.data?.code === "OPEN_STUDIO_ALREADY_EXISTS") {
        setOpenStudioConflict({
          locationId: String(
            requestError.data.details?.locationId || locationId,
          ),
          productId: String(requestError.data.details?.existingProductId || ""),
        });
        setError("");
        if (claimsOpenStudioLocation && locationId) {
          openStudioProductsQuery.refetch();
        }
      } else {
        setError(getApiError(requestError, t("form.requestError")));
      }
    }
  };
  const content = (
    <>
      {surface === "dialog" ? (
        <header className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-terracotta-600">
              {t("eyebrow")}
            </p>
            <DialogTitle className="mt-2 text-[21px] font-semibold tracking-[-0.04em] text-[#171717]">
              {title}
            </DialogTitle>
            <p className="mt-1 text-[10px] leading-5 text-[#777773]">
              {t(
                `form.kinds.${resolvedCatalogKind}.${editing ? "editDescription" : "createDescription"}`,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={formBusy}
            aria-label={t("form.close")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-[#555553] transition hover:border-line-strong hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
      ) : null}

      <form
        onSubmit={handleSubmit}
        data-guided-form={guided || surface === "page" ? "product" : undefined}
        className={
          surface === "page" ? "min-h-0" : "min-h-0 flex-1 overflow-y-auto"
        }
      >
        <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-7">
          {openStudioPlanUnavailable ? (
            <div className="sm:col-span-2">
              <OpenStudioPlanNotice t={t} />
            </div>
          ) : null}
          {locationSpecific && (
            <label className={`${labelClass} sm:col-span-2`}>
              {t("form.location")} <span aria-hidden="true">*</span>
              <select
                aria-label={t("form.location")}
                className={inputClass}
                value={locationId}
                onChange={(event) =>
                  updateField("locationId", event.target.value)
                }
                disabled={locationLocked || locationsQuery.isLoading}
                required
              >
                <option value="">{t("form.locationPlaceholder")}</option>
                {locationLocked &&
                  !locations.some((location) => location.id === locationId) && (
                    <option value={locationId}>
                      {product?.location?.name || locationId}
                    </option>
                  )}
                {(locationLocked ? locations : selectableLocations).map(
                  (location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ),
                )}
              </select>
              <span className="mt-1 block text-[11px] font-normal text-ink-muted">
                {t(
                  locationLocked
                    ? "form.locationLocked"
                    : duplicate
                      ? "form.duplicateHelp"
                      : "form.locationHelp",
                )}
              </span>
              {locationsQuery.isError && !locationLocked && (
                <span role="alert">{t("form.locationsError")}</span>
              )}
            </label>
          )}
          {!openStudioPlanBlocked && openStudioSaveBlocked && (
            <div
              role={
                openStudioOccupied || openStudioCheckFailed ? "alert" : "status"
              }
              className="rounded-[14px] border border-coral-200 bg-coral-50 p-4 text-[12px] leading-5 text-ink sm:col-span-2"
            >
              {openStudioOccupied ? (
                <>
                  <p className="font-semibold">{t("openStudioLimit.title")}</p>
                  <p className="mt-1">{t("openStudioLimit.existing")}</p>
                  {existingOpenStudioId && (
                    <Link
                      href={getProductEditHref({
                        productId: existingOpenStudioId,
                        category: "openStudio",
                        searchParams: guidedStep
                          ? new URLSearchParams({
                              setupStep: guidedStep,
                            })
                          : undefined,
                      })}
                      className={`${workspaceSecondaryButtonClass} mt-3`}
                    >
                      {t("openStudioLimit.edit")}
                    </Link>
                  )}
                </>
              ) : openStudioCheckFailed ? (
                <>
                  <p>{t("openStudioLimit.checkError")}</p>
                  <button
                    type="button"
                    onClick={() => openStudioProductsQuery.refetch()}
                    className={`${workspaceSecondaryButtonClass} mt-3`}
                  >
                    {t("retry")}
                  </button>
                </>
              ) : (
                <p>{t("openStudioLimit.checking")}</p>
              )}
            </div>
          )}
          {
            <>
              <label
                className={`${labelClass} ${!showTypeSelector ? "sm:col-span-2" : ""}`}
              >
                {t("form.name")}
                <span aria-hidden="true" className="ml-1 text-terracotta-600">
                  *
                </span>
                <input
                  aria-label={t("form.name")}
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className={inputClass}
                  required
                />
              </label>

              {showTypeSelector && (
                <label className={labelClass}>
                  {t("form.type")}
                  <select
                    value={form.kind}
                    onChange={(event) =>
                      updateField("kind", event.target.value)
                    }
                    className={inputClass}
                  >
                    {productKindOptions.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(
                          `types.${getProductTypeKey({
                            kind,
                          })}`,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {!isPrivateStudio && (
                <>
                  <label className={labelClass}>
                    {t("form.price")}
                    <span
                      aria-hidden="true"
                      className="ml-1 text-terracotta-600"
                    >
                      *
                    </span>
                    <input
                      aria-label={t("form.price")}
                      type="number"
                      min="0"
                      step={getMajorCurrencyInputStep(form.currency)}
                      value={form.price}
                      onChange={(event) =>
                        updateField("price", event.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </label>

                  <label className={labelClass}>
                    {t("form.currency")}
                    <select
                      value={form.currency}
                      onChange={(event) =>
                        updateField("currency", event.target.value)
                      }
                      disabled={Boolean(configuredTenantCurrency)}
                      className={inputClass}
                    >
                      {STUDIO_COMMERCE_CURRENCY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {configuredTenantCurrency && (
                      <span className="mt-1.5 block text-[10px] normal-case leading-4 tracking-normal text-[#969691]">
                        {t("form.currencyHelp")}
                      </span>
                    )}
                  </label>
                </>
              )}

              {isOpenStudio && (
                <fieldset className="rounded-[15px] border border-cobalt-100 bg-cobalt-50/45 p-4 sm:col-span-2">
                  <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cobalt-700">
                    {t("form.bookingMode")}
                  </legend>
                  <p className="mb-3 text-[10px] leading-5 text-[#686864]">
                    {t("form.bookingModeHelp")}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {Object.values(OPEN_STUDIO_BOOKING_MODE).map((mode) => {
                      const selected = form.bookingMode === mode;
                      return (
                        <label
                          key={mode}
                          className={`cursor-pointer rounded-[13px] border p-3.5 transition ${selected ? "border-cobalt-400 bg-white shadow-sm ring-2 ring-cobalt-500/10" : "border-line bg-white/70 hover:border-line-strong"}`}
                        >
                          <span className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="open-studio-booking-mode"
                              value={mode}
                              checked={selected}
                              onChange={(event) =>
                                updateField("bookingMode", event.target.value)
                              }
                              className="mt-0.5 h-4 w-4 border-line text-cobalt-500 focus:ring-cobalt-500"
                            />
                            <span>
                              <span className="block text-[11px] font-semibold text-[#353533]">
                                {t(`form.bookingModes.${mode}.label`)}
                              </span>
                              <span className="mt-1 block text-[10px] normal-case leading-4 tracking-normal text-[#777773]">
                                {t(`form.bookingModes.${mode}.description`)}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {isCustomerChoice && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        {t("form.openStudioPolicy.publicCapacityMode")}
                        <select
                          className={inputClass}
                          value={form.publicCapacityMode}
                          onChange={(event) =>
                            updateField(
                              "publicCapacityMode",
                              event.target.value,
                            )
                          }
                        >
                          <option value="activity">
                            {t("form.openStudioPolicy.activity")}
                          </option>
                          <option value="fixed">
                            {t("form.openStudioPolicy.fixed")}
                          </option>
                        </select>
                      </label>
                      {form.publicCapacityMode === "fixed" && (
                        <label className={labelClass}>
                          {t("form.openStudioPolicy.publicCapacityLimit")}
                          <input
                            className={inputClass}
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={form.publicCapacityLimit}
                            onChange={(event) =>
                              updateField(
                                "publicCapacityLimit",
                                event.target.value,
                              )
                            }
                          />
                          <span className="mt-1 block text-[10px] normal-case tracking-normal">
                            {t("form.openStudioPolicy.publicCapacityLimitHelp")}
                          </span>
                        </label>
                      )}
                      <label className={labelClass}>
                        {t("form.openStudioPolicy.privateBookingSurcharge")} (
                        {form.currency})
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step={getMajorCurrencyInputStep(form.currency)}
                          required
                          value={form.privateBookingSurcharge}
                          onChange={(event) =>
                            updateField(
                              "privateBookingSurcharge",
                              event.target.value,
                            )
                          }
                        />
                        <span className="mt-1 block text-[10px] normal-case tracking-normal">
                          {t(
                            "form.openStudioPolicy.privateBookingSurchargeHelp",
                          )}
                        </span>
                      </label>
                    </div>
                  )}
                </fieldset>
              )}

              {capacityRequired && !isCustomerChoice && (
                <label className={labelClass}>
                  {t(
                    isOpenStudio ? "form.openStudioCapacity" : "form.capacity",
                  )}
                  <span className="ml-1 text-terracotta-600">*</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    aria-label={t(
                      isOpenStudio
                        ? "form.openStudioCapacity"
                        : "form.capacity",
                    )}
                    value={maxNumberOfParticipants}
                    onChange={(event) =>
                      updateField("maxNumberOfParticipants", event.target.value)
                    }
                    placeholder={t(
                      isOpenStudio
                        ? "form.openStudioCapacityHelp"
                        : "form.capacityHelp",
                    )}
                    className={inputClass}
                    required
                  />
                  <span className="mt-1.5 block text-[10px] normal-case leading-4 tracking-normal text-[#969691]">
                    {t(
                      isOpenStudio
                        ? "form.openStudioCapacityHelp"
                        : "form.capacityHelp",
                    )}
                  </span>
                  {isOpenStudio && hasLocationCapacity && (
                    <span className="mt-1.5 block text-xs font-normal normal-case leading-5 tracking-normal text-ink-muted">
                      {t("form.openStudioLocationCapacity", {
                        count: locationCapacity,
                      })}
                    </span>
                  )}
                </label>
              )}

              {isClass ? (
                <ClassCategoryField
                  value={form.classCategory}
                  onChange={(value) => updateField("classCategory", value)}
                  disabled={isLoading}
                  t={t}
                />
              ) : null}
            </>
          }

          {null}

          {!guided ? (
            <ProductImageField
              currentImageSrc={form.imageSrc}
              disabled={isLoading}
              file={imageFile}
              onChange={(file) => {
                setImageFile(file);
                if (isVoucher) setVoucherDirty(true);
              }}
              onRemove={() => {
                setImageFile(null);
                updateField("imageSrc", "");
              }}
              t={t}
            />
          ) : null}

          {!guided ? (
            <label className={`${labelClass} sm:col-span-2`}>
              {t("form.description")}
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                rows={4}
                className="mt-2 w-full resize-y rounded-[13px] border border-line bg-white px-3.5 py-3 text-[11px] leading-5 text-[#252524] outline-none transition placeholder:text-[#A3A3A0] hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
              />
            </label>
          ) : null}

          {!guided && isClass ? (
            <CourseContentFields
              value={form.courseContent}
              onChange={(value) => updateField("courseContent", value)}
              locale={locale}
              productImage={imageFile ? "" : form.imageSrc}
              locations={locations}
              locationsLoading={locationsQuery.isLoading}
              locationsError={locationsQuery.isError}
              disabled={isLoading}
              t={t}
            />
          ) : null}

          {!guided ? (
            <details className="group rounded-[15px] border border-line bg-white sm:col-span-2">
              <summary className="cursor-pointer list-none px-4 py-3.5 text-[11px] font-semibold text-[#555553] marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  <span>
                    {t("form.advanced")}
                    <span className="mt-0.5 block text-[10px] font-normal leading-4 text-[#969691]">
                      {t("form.advancedHelp")}
                    </span>
                  </span>
                  <span
                    className="text-base font-normal text-[#858580] transition group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </span>
              </summary>
              <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2">
                <label className={labelClass}>
                  {t("form.sku")}
                  <input
                    value={form.sku}
                    onChange={(event) => updateField("sku", event.target.value)}
                    placeholder={t("form.skuPlaceholder")}
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  {t("form.sortOrder")}
                  <input
                    type="number"
                    step="1"
                    value={form.sortOrder}
                    onChange={(event) =>
                      updateField("sortOrder", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>

                <label className={`${labelClass} sm:col-span-2`}>
                  {t("form.label")}
                  <input
                    value={form.label}
                    onChange={(event) =>
                      updateField("label", event.target.value)
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            </details>
          ) : null}

          {isVoucher && (
            <VoucherValidityFields
              form={form}
              updateField={updateField}
              disabled={isLoading}
            />
          )}

          {isVoucher && (
            <VoucherPhysicalDeliveryFields
              form={form}
              updateField={updateField}
              disabled={formBusy}
            />
          )}

          {isVoucher && (
            <section
              className="min-w-0 space-y-4 sm:col-span-2"
              aria-label={editorT("modeTitle")}
            >
              <fieldset disabled={formBusy}>
                <legend className="mb-3 text-sm font-semibold text-ink">
                  {editorT("modeTitle")}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {["editor", "pdf"].map((mode) => (
                    <label
                      key={mode}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${voucherMode === mode ? "border-cobalt-400 bg-cobalt-50/40 ring-2 ring-cobalt-500/10" : "border-line bg-white hover:border-line-strong"}`}
                    >
                      <input
                        type="radio"
                        name="voucher-design-mode"
                        value={mode}
                        checked={voucherMode === mode}
                        onChange={() => {
                          setVoucherMode(mode);
                          setVoucherDirty(true);
                        }}
                        className="mt-0.5 h-4 w-4 border-line text-cobalt-500 focus:ring-cobalt-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-ink">
                          {editorT(
                            mode === "editor" ? "modeEditor" : "modePdf",
                          )}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-ink-muted">
                          {editorT(
                            mode === "editor"
                              ? "modeEditorHelp"
                              : "modePdfHelp",
                          )}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {voucherMode === "editor" && (
                <VoucherDesignEditor
                  value={voucherDesign}
                  onChange={changeVoucherDesign}
                  onInitialize={initializeVoucherDesign}
                  onBusyChange={setVoucherEditorBusy}
                  onValidationChange={setVoucherEditorValid}
                  productName={form.name}
                  price={form.price}
                  currency={form.currency}
                  validity={buildVoucherSettings(form).validity}
                  locale={locale}
                  disabled={isLoading}
                />
              )}
              {voucherMode === "pdf" && product?.voucherTemplate && (
                <p className="text-sm leading-5 text-ink-muted">
                  {editorT("legacyHelp")}
                </p>
              )}
            </section>
          )}

          {isVoucher && voucherMode === "pdf" && (
            <div className={`${labelClass} sm:col-span-2`}>
              <label htmlFor="voucher-template-pdf">{t("form.pdf")}</label>
              <input
                id="voucher-template-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                aria-describedby="voucher-template-pdf-help"
                className="mt-2 block w-full rounded-[13px] border border-line bg-white px-3 py-2 text-[10px] text-[#777773] file:mr-3 file:rounded-[9px] file:border-0 file:bg-coral-50 file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-terracotta-600"
              />
              <span
                id="voucher-template-pdf-help"
                className="mt-1.5 block text-[10px] normal-case tracking-normal text-[#969691]"
              >
                {templatePdf?.name || t("form.pdfHelp")}
              </span>
            </div>
          )}

          <label className="flex items-center justify-between gap-4 rounded-[15px] border border-line bg-white p-4 sm:col-span-2">
            <span>
              <span className="block text-[11px] font-semibold text-[#353533]">
                {t(isPrivateStudio ? "form.internal" : "form.online")}
              </span>
              <span className="mt-1 block text-[10px] leading-4 text-[#858580]">
                {t(isPrivateStudio ? "form.internalHelp" : "form.onlineHelp")}
              </span>
            </span>
            <input
              type="checkbox"
              aria-label={t(isPrivateStudio ? "form.internal" : "form.online")}
              checked={form.isActive}
              onChange={(event) =>
                updateField("isActive", event.target.checked)
              }
              className="h-5 w-5 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
            />
          </label>

          {error && (
            <p
              className="rounded-[13px] border border-coral-200 bg-coral-50 px-4 py-3 text-[10px] leading-5 text-terracotta-700 sm:col-span-2"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <WorkspaceFormActions>
          <button
            type="button"
            onClick={requestClose}
            disabled={formBusy}
            className={workspaceSecondaryButtonClass}
          >
            {t("form.cancel")}
          </button>
          <button
            type="submit"
            disabled={
              formBusy ||
              openStudioSaveBlocked ||
              (isVoucher && voucherMode === "editor" && !voucherEditorValid)
            }
            className={workspacePrimaryButtonClass}
          >
            {isLoading
              ? t("form.saving")
              : guided
                ? setupT("guided.saveAndContinue")
                : editing
                  ? t("form.save")
                  : t(`form.kinds.${resolvedCatalogKind}.createAction`)}
          </button>
        </WorkspaceFormActions>
      </form>
      <VoucherEditorConfirmation
        open={discardOpen}
        title={editorT("unsavedTitle")}
        description={editorT("unsavedDescription")}
        confirmLabel={editorT("discard")}
        cancelLabel={editorT("keepEditing")}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          const destination = pendingNavigation.current;
          setVoucherDirty(false);
          setDiscardOpen(false);
          if (destination) {
            navigationApproved.current = true;
            window.location.assign(destination);
          } else onClose();
        }}
      />
    </>
  );
  if (surface === "page") {
    return (
      <section
        aria-busy={isLoading}
        className="mt-6 overflow-hidden rounded-[22px] border border-line bg-white shadow-card"
      >
        {content}
      </section>
    );
  }
  return (
    <Dialog open={open} onClose={requestClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />

      <WorkspaceDialogViewport>
        <WorkspaceDialogPanel
          size={isVoucher ? "xlarge" : "medium"}
          aria-busy={formBusy}
        >
          {content}
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
