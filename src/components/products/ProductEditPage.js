"use client";

import { useMemo, useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";

import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import { Link, useRouter } from "@/i18n/navigation";
import { useGetAllProductsQuery } from "@/lib/features/products/productsApiSlice";
import { isLocationSpecificProduct } from "@/lib/features/products/products.contract.mjs";

import ProductFormDialog from "./ProductFormDialog";
import {
  getProductFormCloseHref,
  withProductUpdatedNotice,
  withProductCreatedNotice,
} from "./products.navigation";
import {
  getProductCategory,
  getProductId,
  isLegacyCatalogProduct,
  isSystemProduct,
  resolveCatalogSection,
} from "./products.utils";

const EDITABLE_PRODUCT_CATEGORIES = new Set([
  "openStudio",
  "classes",
  "vouchers",
  "privateStudio",
]);

const getRouteProductId = (params) => {
  const value = params?.productId;
  return String(Array.isArray(value) ? value[0] || "" : value || "").trim();
};

export default function ProductEditPage() {
  const locale = useLocale();
  const t = useTranslations("Products");
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const guidedSetup = useGuidedSetupStep();
  const productId = getRouteProductId(params);
  const [duplicate, setDuplicate] = useState(false);
  const productsQuery = useGetAllProductsQuery(
    {},
    { refetchOnMountOrArgChange: true },
  );
  const products = useMemo(
    () => (Array.isArray(productsQuery.data) ? productsQuery.data : []),
    [productsQuery.data],
  );
  const product = useMemo(
    () =>
      products.find((candidate) => getProductId(candidate) === productId) ||
      null,
    [productId, products],
  );
  const productCategory = product ? getProductCategory(product) : "";
  const requestedCategory = resolveCatalogSection({
    category: searchParams.get("category"),
    fallback: "openStudio",
  });
  const catalogKind = EDITABLE_PRODUCT_CATEGORIES.has(productCategory)
    ? productCategory
    : requestedCategory;
  const returnHref = getProductFormCloseHref(
    searchParams.get("setupStep"),
    catalogKind,
  );
  const editableProduct = Boolean(
    product &&
    EDITABLE_PRODUCT_CATEGORIES.has(productCategory) &&
    !isLegacyCatalogProduct(product) &&
    !isSystemProduct(product),
  );
  const loading =
    !product && (productsQuery.isLoading || productsQuery.isFetching);
  const title = editableProduct
    ? t(`form.kinds.${productCategory}.editTitle`)
    : t("form.editTitle");
  const description = editableProduct
    ? t(`form.kinds.${productCategory}.editDescription`)
    : t("form.editDescription");

  const close = () => router.replace(returnHref);
  const handleSaved = async (_product, action) => {
    if (guidedSetup.guided) {
      await guidedSetup.refreshAndContinue({
        metadata: { form: "product", action },
      });
      return true;
    }

    router.replace(
      action === "created"
        ? withProductCreatedNotice(returnHref)
        : withProductUpdatedNotice(returnHref),
    );
    return true;
  };

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link
        href={returnHref}
        className="inline-flex items-center gap-2 text-[11px] font-semibold text-ink-muted transition hover:text-ink"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("form.backToCatalog")}
      </Link>

      <header className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-terracotta-600">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.055em] text-ink sm:text-[36px]">
          {duplicate ? t("form.duplicateTitle") : title}
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
          {description}
        </p>
        <p className="mt-1 text-[10px] text-ink-subtle">
          {t("form.requiredNote")}
        </p>
        {editableProduct && isLocationSpecificProduct(product) && (
          <button
            type="button"
            onClick={() => setDuplicate((value) => !value)}
            className="mt-4 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold"
          >
            {t(duplicate ? "form.cancelDuplicate" : "form.duplicateTitle")}
          </button>
        )}
      </header>

      {loading ? (
        <section
          className="mt-6 overflow-hidden rounded-[22px] border border-line bg-white p-6 shadow-card"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="h-12 animate-pulse rounded-[14px] bg-sand-100" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-[14px] bg-sand-100" />
            <div className="h-20 animate-pulse rounded-[14px] bg-sand-100" />
            <div className="h-40 animate-pulse rounded-[14px] bg-sand-100 sm:col-span-2" />
          </div>
          <span className="sr-only">{t("loading")}</span>
        </section>
      ) : !product && productsQuery.isError ? (
        <section
          className="mt-6 rounded-[22px] border border-coral-200 bg-coral-50 px-5 py-7 shadow-card sm:px-7"
          role="alert"
        >
          <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-terracotta-800">
            {t("loadError")}
          </h2>
          <button
            type="button"
            onClick={() => productsQuery.refetch()}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white transition hover:bg-cobalt-600"
          >
            {t("retry")}
          </button>
        </section>
      ) : editableProduct ? (
        <ProductFormDialog
          key={`${getProductId(product)}-${productCategory}-${duplicate}`}
          open
          surface="page"
          product={product}
          duplicate={duplicate}
          catalogKind={productCategory}
          guided={guidedSetup.guided}
          guidedStep={guidedSetup.stepId}
          locale={locale}
          onClose={close}
          onSaved={handleSaved}
          t={t}
        />
      ) : (
        <section className="mt-6 rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-7 shadow-card sm:px-7">
          <h2 className="text-[18px] font-semibold tracking-[-0.035em] text-amber-950">
            {t("form.editNotFoundTitle")}
          </h2>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-amber-900/75">
            {t("form.editNotFoundDescription")}
          </p>
          <Link
            href={returnHref}
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-amber-300 bg-white px-5 text-[12px] font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            {t("form.backToCatalog")}
          </Link>
        </section>
      )}
    </div>
  );
}
