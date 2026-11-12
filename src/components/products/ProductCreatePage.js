"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import { Link, useRouter } from "@/i18n/navigation";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { isOpenStudioPlanEntitled } from "@/config/planEntitlements";

import ProductFormDialog from "./ProductFormDialog";
import OpenStudioPlanNotice from "./OpenStudioPlanNotice";
import {
  getProductFormCloseHref,
  withProductCreatedNotice,
} from "./products.navigation";
import { resolveCatalogSection } from "./products.utils";

const CREATABLE_PRODUCT_CATEGORIES = new Set([
  "openStudio",
  "classes",
  "vouchers",
  "privateStudio",
]);

const isModuleEnabled = (tenant, category) => {
  if (category === "openStudio") return tenant?.modules?.bookings !== false;
  if (category === "classes") return tenant?.modules?.courses !== false;
  if (category === "vouchers") return tenant?.modules?.vouchers !== false;
  return true;
};

export default function ProductCreatePage() {
  const locale = useLocale();
  const t = useTranslations("Products");
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTenant = useSelector(selectCurrentTenant);
  const guidedSetup = useGuidedSetupStep();

  const requestedCategory = resolveCatalogSection({
    category: searchParams.get("category"),
    productKind:
      searchParams.get("productKind") || searchParams.get("productType"),
    productType: searchParams.get("productType"),
    setupTemplate: searchParams.get("setupTemplate"),
    fallback: "openStudio",
  });
  const category = CREATABLE_PRODUCT_CATEGORIES.has(requestedCategory)
    ? requestedCategory
    : "openStudio";
  const returnHref = getProductFormCloseHref(
    searchParams.get("setupStep"),
    category,
  );
  const moduleEnabled = isModuleEnabled(currentTenant, category);
  const planEntitled =
    category !== "openStudio" || isOpenStudioPlanEntitled(currentTenant);
  const initialType =
    searchParams.get("productKind") || searchParams.get("productType");
  const initialTemplate = searchParams.get("setupTemplate");

  const close = () => router.replace(returnHref);
  const handleSaved = async (_product, action) => {
    if (guidedSetup.guided) {
      await guidedSetup.refreshAndContinue({
        metadata: { form: "product", action },
      });
      return true;
    }

    router.replace(withProductCreatedNotice(returnHref));
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
          {t(`form.kinds.${category}.createTitle`)}
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
          {t(`form.kinds.${category}.createDescription`)}
        </p>
        <p className="mt-1 text-[10px] text-ink-subtle">
          {t("form.requiredNote")}
        </p>
      </header>

      {!planEntitled ? (
        <div className="mt-6">
          <OpenStudioPlanNotice t={t} />
        </div>
      ) : moduleEnabled ? (
        <ProductFormDialog
          key={`${category}-${initialType || "default"}-${initialTemplate || "default"}`}
          open
          surface="page"
          product={null}
          catalogKind={category}
          initialType={initialType}
          initialTemplate={initialTemplate}
          guided={guidedSetup.guided}
          guidedStep={guidedSetup.stepId}
          locale={locale}
          onClose={close}
          onSaved={handleSaved}
          t={t}
        />
      ) : (
        <section className="mt-6 rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-6 shadow-card sm:px-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-amber-950">
            {t("form.moduleUnavailableTitle")}
          </h2>
          <p className="mt-2 text-[12px] leading-6 text-amber-900/75">
            {t("form.moduleUnavailableDescription")}
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
