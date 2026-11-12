"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CreditCardIcon,
  CubeIcon,
  EllipsisHorizontalIcon,
  GiftIcon,
  LockClosedIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

import {
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspaceTable,
  WorkspaceTableFrame,
  WorkspaceTableHeadCell,
  WorkspaceTableScroller,
  WorkspaceTruncatedText,
} from "@/components/dashboard/WorkspaceDataSurface";

import {
  cx,
  formatProductPrice,
  getAvailabilityKey,
  getProductDescription,
  getProductId,
  getProductKind,
  getProductName,
  getOpenStudioBookingMode,
  getProductTypeKey,
  isProductActive,
  isProductBookableOnline,
  isPrivateStudioProduct,
  isSystemProduct,
  needsProductAttention,
} from "./products.utils";
import {
  PRODUCT_KIND,
  isLocationSpecificProduct,
  getProductLocationId,
} from "@/lib/features/products/products.contract.mjs";

const TYPE_ICONS = {
  openStudio: BuildingOffice2Icon,
  class: AcademicCapIcon,
  membership: CreditCardIcon,
  voucher: GiftIcon,
  privateStudio: LockClosedIcon,
  other: CubeIcon,
};

function ProductKindLabel({ product, t, stacked = false }) {
  const isOpenStudio = getProductKind(product) === PRODUCT_KIND.OPEN_STUDIO;

  return (
    <span className={stacked ? "flex flex-col items-start gap-0.5" : ""}>
      <span>{t(`types.${getProductTypeKey(product)}`)}</span>
      {isOpenStudio && (
        <span className="text-[10px] font-medium text-cobalt-600">
          {t(`bookingModes.${getOpenStudioBookingMode(product)}`)}
        </span>
      )}
    </span>
  );
}

function ProductOnlineState({
  product,
  locale,
  canManageProduct,
  onToggle,
  isBusy,
  t,
}) {
  if (isLocationSpecificProduct(product) && !getProductLocationId(product)) {
    return (
      <span className="text-[12px] font-medium text-amber-800">
        {t("locationAssignment.status")}
      </span>
    );
  }
  if (isPrivateStudioProduct(product)) {
    return (
      <span className="text-[12px] font-medium text-stone-600">
        {t("onlineStates.internal")}
      </span>
    );
  }

  if (canManageProduct) {
    return (
      <OnlineToggle
        product={product}
        locale={locale}
        onToggle={onToggle}
        isBusy={isBusy}
        t={t}
      />
    );
  }

  return (
    <span className="text-[12px] font-medium text-ink-muted">
      {t(
        isProductBookableOnline(product)
          ? "onlineStates.available"
          : "onlineStates.hidden",
      )}
    </span>
  );
}

function ProductThumbnail({ product, locale, size = "normal" }) {
  const [failedImageSrc, setFailedImageSrc] = useState("");
  const imageSrc = String(product?.imageSrc || "").trim();
  const typeKey = getProductTypeKey(product);
  const Icon = TYPE_ICONS[typeKey] || CubeIcon;
  const imageFailed = Boolean(imageSrc && failedImageSrc === imageSrc);

  const sizeClass = size === "large" ? "h-20 w-20" : "h-12 w-14";

  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-sand-100 text-sand-700`}
    >
      {imageSrc && !imageFailed ? (
        // Product images can come from tenant-configured CDNs, so a plain img
        // avoids requiring every tenant hostname in next/image configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={getProductName(product, locale)}
          className="h-full w-full object-cover"
          onError={() => setFailedImageSrc(imageSrc)}
        />
      ) : (
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      )}
    </span>
  );
}

function OnlineToggle({ product, locale, onToggle, isBusy, t }) {
  const checked = isProductBookableOnline(product);
  const disabled = isBusy || isSystemProduct(product);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={t("actions.toggleOnline", {
        name: getProductName(product, locale),
      })}
      disabled={disabled}
      onClick={() => onToggle(product)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45",
        checked ? "bg-cobalt-500" : "bg-[#DADAD6]",
      )}
    >
      <span
        className={cx(
          "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

function StatusPill({ product, t }) {
  const active = isProductActive(product);

  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[10px] font-medium",
        active ? "bg-[#E8F3E3] text-[#315D2D]" : "bg-[#FBF0DF] text-[#A56500]",
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-[#2B7A31]" : "bg-[#C47A00]",
        )}
      />
      {t(active ? "statuses.active" : "statuses.draft")}
    </span>
  );
}

function ProductActions({
  product,
  locale,
  onEdit,
  onDelete,
  allowEdit = true,
  t,
}) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-white text-[#555553] transition hover:border-line-strong hover:text-[#171717] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35"
        aria-label={t("actions.open", {
          name: getProductName(product, locale),
        })}
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        className="z-[80] w-40 origin-top-right rounded-[13px] border border-line bg-white p-1.5 shadow-[0_16px_45px_rgba(17,17,15,0.14)] transition duration-100 ease-out [--anchor-gap:6px] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        {allowEdit && (
          <MenuItem>
            <button
              type="button"
              onClick={() => onEdit(product)}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[12px] text-ink-soft transition data-focus:bg-sand-50"
            >
              <WrenchScrewdriverIcon className="h-4 w-4" aria-hidden="true" />
              {t("actions.edit")}
            </button>
          </MenuItem>
        )}
        <MenuItem>
          <button
            type="button"
            onClick={() => onDelete(product)}
            className="flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[12px] text-terracotta-600 transition data-focus:bg-coral-50"
          >
            <TrashIcon className="h-4 w-4" aria-hidden="true" />
            {t(
              isLocationSpecificProduct(product)
                ? "actions.archive"
                : "actions.delete",
            )}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

function ProductCard({
  product,
  locale,
  onEdit,
  onDelete,
  onToggle,
  updatingId,
  canManage,
  canEdit,
  onManageCodes,
  t,
}) {
  const productId = getProductId(product);
  const canManageProduct =
    canManage && Boolean(productId) && !isSystemProduct(product);

  return (
    <WorkspaceCard className="p-4">
      <div className="flex items-start gap-3.5">
        <ProductThumbnail product={product} locale={locale} size="large" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <WorkspaceTruncatedText
                as="h3"
                className="text-[14px] font-semibold tracking-[-0.02em] text-ink"
              >
                {getProductName(product, locale)}
              </WorkspaceTruncatedText>
              <p className="mt-1 truncate text-[12px] text-ink-muted">
                <ProductKindLabel product={product} t={t} />
              </p>
            </div>
            {canManageProduct && (
              <ProductActions
                product={product}
                locale={locale}
                onEdit={onEdit}
                onDelete={onDelete}
                allowEdit={canEdit(product)}
                t={t}
              />
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-[#252524]">
              {formatProductPrice(product, locale)}
            </p>
            <ProductOnlineState
              product={product}
              locale={locale}
              canManageProduct={canManageProduct}
              onToggle={onToggle}
              isBusy={updatingId === productId}
              t={t}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
          <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
          {t(`availability.${getAvailabilityKey(product)}`)}
        </span>
        <StatusPill product={product} t={t} />
      </div>
      {onManageCodes &&
        productId &&
        getProductKind(product) === PRODUCT_KIND.VOUCHER && (
          <button
            type="button"
            onClick={() => onManageCodes(product)}
            className="mt-3 min-h-10 rounded-full border border-line px-4 text-xs font-semibold text-cobalt-700 hover:bg-cobalt-50"
          >
            {t("actions.manageCodes")}
          </button>
        )}

      {needsProductAttention(product) && (
        <p className="mt-3 text-[12px] font-medium text-terracotta-600">
          {t("attention.priceReview")}
        </p>
      )}
    </WorkspaceCard>
  );
}

export default function ProductCatalog({
  products,
  view,
  locale,
  onEdit,
  onDelete,
  onToggle,
  onManageCodes,
  updatingId,
  canManage = false,
  canEdit = () => true,
  canCreate = canManage,
  onCreate,
  isFiltered = false,
  emptyTitle,
  emptyDescription,
  createLabel,
  t,
}) {
  if (!products.length) {
    return (
      <WorkspaceEmptyState
        icon={PhotoIcon}
        title={
          isFiltered ? t("empty.filteredTitle") : emptyTitle || t("empty.title")
        }
        description={
          isFiltered
            ? t("empty.filteredDescription")
            : emptyDescription || t("empty.description")
        }
        action={
          canCreate && !isFiltered ? (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              {createLabel || t("empty.create")}
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {products.map((product, index) => (
          <ProductCard
            key={getProductId(product) || `legacy-card-${index}`}
            product={product}
            locale={locale}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
            onManageCodes={onManageCodes}
            updatingId={updatingId}
            canManage={canManage}
            canEdit={canEdit}
            t={t}
          />
        ))}
      </div>

      {view === "grid" && (
        <div className="hidden gap-3 md:grid md:grid-cols-2 2xl:grid-cols-3">
          {products.map((product, index) => (
            <ProductCard
              key={getProductId(product) || `legacy-grid-${index}`}
              product={product}
              locale={locale}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
              onManageCodes={onManageCodes}
              updatingId={updatingId}
              canManage={canManage}
              canEdit={canEdit}
              t={t}
            />
          ))}
        </div>
      )}

      {view === "table" && (
        <WorkspaceTableFrame className="hidden md:block">
          <WorkspaceTableScroller ariaLabel={t("table.label")}>
            <WorkspaceTable className="min-w-[900px]">
              <thead>
                <tr className="text-left">
                  {[
                    "product",
                    "type",
                    "availability",
                    "price",
                    "online",
                    "status",
                    ...(canManage || onManageCodes ? ["actions"] : []),
                  ].map((column) => (
                    <WorkspaceTableHeadCell
                      key={column}
                      className="first:pl-5 last:pr-5"
                    >
                      {t(`columns.${column}`)}
                    </WorkspaceTableHeadCell>
                  ))}
                </tr>
              </thead>

              <tbody>
                {products.map((product, index) => {
                  const productId = getProductId(product);
                  const description = getProductDescription(product, locale);
                  const canManageProduct =
                    canManage &&
                    Boolean(productId) &&
                    !isSystemProduct(product);

                  return (
                    <tr
                      key={productId || `legacy-row-${index}`}
                      className="group transition hover:bg-[#FBFAF7]"
                    >
                      <td className="border-b border-line px-4 py-3 first:pl-5">
                        <div className="flex min-w-[210px] items-center gap-3">
                          <ProductThumbnail product={product} locale={locale} />
                          <div className="min-w-0">
                            <WorkspaceTruncatedText
                              as="p"
                              className="text-[12px] font-semibold text-ink"
                            >
                              {getProductName(product, locale)}
                            </WorkspaceTruncatedText>
                            <WorkspaceTruncatedText
                              as="p"
                              className="mt-0.5 max-w-[210px] text-[12px] text-ink-muted"
                            >
                              {product?.sku ||
                                description ||
                                t(`types.${getProductTypeKey(product)}`)}
                            </WorkspaceTruncatedText>
                          </div>
                        </div>
                      </td>
                      <td className="border-b border-line px-4 py-3 text-[12px] text-ink-soft">
                        <ProductKindLabel product={product} t={t} stacked />
                      </td>
                      <td className="border-b border-line px-4 py-3 text-[12px] text-ink-soft">
                        {t(`availability.${getAvailabilityKey(product)}`)}
                      </td>
                      <td className="border-b border-line px-4 py-3">
                        <p className="whitespace-nowrap text-[12px] font-semibold text-ink">
                          {formatProductPrice(product, locale)}
                        </p>
                        {needsProductAttention(product) && (
                          <p className="mt-1 whitespace-nowrap text-[12px] text-terracotta-600">
                            {t("attention.priceReview")}
                          </p>
                        )}
                      </td>
                      <td className="border-b border-line px-4 py-3">
                        <ProductOnlineState
                          product={product}
                          locale={locale}
                          canManageProduct={canManageProduct}
                          onToggle={onToggle}
                          isBusy={updatingId === productId}
                          t={t}
                        />
                      </td>
                      <td className="border-b border-line px-4 py-3">
                        <StatusPill product={product} t={t} />
                      </td>
                      {(canManage || onManageCodes) && (
                        <td className="border-b border-line px-4 py-3 last:pr-5">
                          <div className="flex items-center gap-2">
                            {onManageCodes &&
                              productId &&
                              getProductKind(product) ===
                                PRODUCT_KIND.VOUCHER && (
                                <button
                                  type="button"
                                  onClick={() => onManageCodes(product)}
                                  className="min-h-10 whitespace-nowrap rounded-full border border-line px-3 text-xs font-semibold text-cobalt-700 hover:bg-cobalt-50"
                                >
                                  {t("actions.manageCodes")}
                                </button>
                              )}
                            {canManageProduct ? (
                              <ProductActions
                                product={product}
                                locale={locale}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                allowEdit={canEdit(product)}
                                t={t}
                              />
                            ) : canManage ? (
                              <span className="text-[10px] font-medium text-ink-muted">
                                {t(
                                  isSystemProduct(product)
                                    ? "actions.systemManaged"
                                    : "actions.unavailable",
                                )}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </WorkspaceTable>
          </WorkspaceTableScroller>
        </WorkspaceTableFrame>
      )}
    </>
  );
}
