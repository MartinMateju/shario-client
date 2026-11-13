"use client";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import { useCallback, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useSelector } from "react-redux";
import {
  selectCurrentTenant,
  selectIsCustomerAuthenticated,
} from "@/lib/features/auth/authSlice";
import { getCustomerCourseHref } from "@/components/courses/customerCourses.utils";
import { retainPublicCourseLocation } from "@/components/courses/usePublicCourseLocation";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";
import { isCustomerPortalPageEnabled } from "@/components/customer-shell/customerPortalVisibility";

import CourseImageGallery from "@/components/galleries/CourseImageGallery";
import { usePublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import CourseDetailsModal from "../modals/CourseDetailsModal";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const safeText = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const getLocalizedValue = (value, language, fallback = "") => {
  if (typeof value === "string") return value;
  return safeText(value?.[language], fallback);
};

const ACTION_BUTTON =
  "inline-flex min-h-[44px] w-full items-center justify-center rounded-full border px-6 " +
  "font-medium text-[11px] uppercase tracking-[0.16em] " +
  "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#483827]/20 focus-visible:ring-offset-2 " +
  "sm:w-[277px]";

const SECONDARY_BUTTON =
  "border-[#d8cec3] bg-white/45 text-[#7f6d5d] hover:border-[#483827] hover:bg-[#483827] hover:text-white";

const DETAILS_BUTTON =
  "group inline-flex items-center gap-2 rounded-full px-3 py-2 " +
  "font-medium text-[11px] uppercase tracking-[0.14em] text-[#8f7b69] " +
  "transition-all duration-200 hover:bg-white/70 hover:text-[#483827] active:scale-[0.98] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#483827]/20 focus-visible:ring-offset-2";

export default function CourseCard({
  course,
  courseIdx = 0,
  language = "CZ",
  translation = {},
  locationReference = "",
}) {
  const activeLocale = useLegacyLocale();
  const legacyText = useLegacyText();
  const publicTenant = usePublicTenant();
  const currentTenant = useSelector(selectCurrentTenant);
  const customerAuthenticated = useSelector(selectIsCustomerAuthenticated);
  const customerForTenant =
    customerAuthenticated &&
    Boolean(publicTenant.tenant?.slug) &&
    String(currentTenant?.slug || "").toLowerCase() ===
      String(publicTenant.tenant?.slug || "").toLowerCase();
  const productId = String(course?.productId || "");
  const courseHref = customerForTenant
    ? getCustomerCourseHref({ productId, locationReference })
    : retainPublicCourseLocation(
        `/courses/${encodeURIComponent(productId)}`,
        locationReference,
      );
  const vouchersEnabled = customerForTenant
    ? currentTenant?.modules?.vouchers !== false &&
      isCustomerPortalPageEnabled(publicTenant.tenant, "vouchers")
    : publicTenant.tenant?.publicCapabilities?.vouchers === true &&
      publicTenant.tenant?.publicSite?.pages?.vouchers?.visible !== false;
  const voucherHref = customerForTenant
    ? retainCustomerPortalLocation("/portal/vouchers", locationReference)
    : retainPublicCourseLocation("/vouchers", locationReference);
  const tenantTheme = useMemo(
    () =>
      getPublicTenantPortalTheme(
        publicTenant.tenant,
        "light",
        publicTenant.surface,
      ),
    [publicTenant.tenant, publicTenant.surface],
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const titleText = useMemo(() => {
    const courseName = getLocalizedValue(course?.name, language);

    if (courseName) {
      return courseName.replace(/^["']|["']$/g, "").trim();
    }

    return getLocalizedValue(
      course?.courseDetailTitle,
      language,
      legacyText("courseFallback"),
    );
  }, [course?.courseDetailTitle, course?.name, language, legacyText]);

  const description = useMemo(() => {
    const value = course?.description?.[language];

    if (typeof value === "string") return value;

    return value || null;
  }, [course, language]);

  const courseDetailsTitle = useMemo(() => {
    return getLocalizedValue(course?.courseDetailTitle, language, titleText);
  }, [course, language, titleText]);

  const courseDetailsContent = useMemo(() => {
    const content = course?.courseDetailContent?.[language];
    return Array.isArray(content) ? content : [];
  }, [course, language]);

  const hasCourseDetails = courseDetailsContent.length > 0;

  const capacityLabel = safeText(
    translation?.COURSE_CAPACITY?.[language],
    legacyText("CourseCard_Capacity_45bd9"),
  );

  const lengthLabel = safeText(
    translation?.COURSE_LENGTH?.[language],
    legacyText("CourseCard_Length_3bade"),
  );

  const priceLabel = safeText(
    translation?.PRICE_PER_PERSON?.[language],
    legacyText("CourseCard_Price_per_person_59050"),
  );

  const bookLabel = safeText(
    translation?.BOOK_COURSE_BUTTON?.[language],
    legacyText("CourseCard_Book_course_e7003"),
  );

  const voucherLabel = safeText(
    translation?.COUPON_BUTTON?.[language],
    legacyText("CourseCard_Gift_voucher_aa850"),
  );

  const formattedPrice = useMemo(() => {
    const price = Number(course?.price);

    if (!Number.isFinite(price)) {
      return "—";
    }

    return formatMajorCurrencyAmount(
      price,
      course?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
      activeLocale,
    );
  }, [activeLocale, course?.currency, course?.price]);

  const imageFirst = courseIdx % 2 === 0;

  const handleDetailsClick = useCallback(() => {
    setShowDetailsModal(true);
  }, []);

  const handleDetailsClose = useCallback(() => {
    setShowDetailsModal(false);
  }, []);

  const imageBlock = (
    <div
      className={classNames(
        "order-2 min-w-0 lg:col-span-5",
        imageFirst ? "lg:order-1 lg:col-start-1" : "lg:order-3 lg:col-start-8",
        "flex",
        imageFirst ? "lg:justify-start" : "lg:justify-end",
      )}
    >
      <CourseImageGallery
        images={Array.isArray(course?.images) ? course.images : []}
        courseName={titleText}
        language={language}
      />
    </div>
  );

  return (
    <article
      aria-labelledby={`course-${course?.productId || courseIdx}-title`}
      className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:items-start lg:gap-x-10 lg:gap-y-0 xl:gap-x-12"
    >
      <div
        className={classNames(
          "order-1 min-w-0 lg:col-span-7",
          imageFirst
            ? "lg:col-start-6 lg:order-2"
            : "lg:col-start-1 lg:order-1",
          imageFirst ? "lg:pl-10 xl:pl-16" : "lg:pr-10 xl:pr-16",
        )}
      >
        <h2
          id={`course-${course?.productId || courseIdx}-title`}
          className=" text-[34px] uppercase leading-[1] tracking-[-0.04em] text-[#483827] sm:text-[44px] lg:text-[54px]"
        >
          {titleText}
        </h2>

        <div className="max-w-2xl">
          {description && (
            <div className="mt-5  text-[16px] leading-[1.8] text-[#665b52] sm:text-[17px] [&_a]:text-[#483827] [&_a]:underline [&_a]:underline-offset-4">
              {description}
            </div>
          )}

          {hasCourseDetails && (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleDetailsClick}
                className={DETAILS_BUTTON}
                aria-haspopup="dialog"
              >
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>

                <span>{legacyText("CourseCard_Course_description_17fff")}</span>
              </button>
            </div>
          )}

          <div className="mt-7 h-px bg-[#e2d8ce]" />

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            <div>
              <dt className="font-medium text-[10px] uppercase tracking-[0.18em] text-[#9f8d7c]">
                {capacityLabel}
              </dt>
              <dd className="mt-1 font-medium text-sm text-[#483827]">
                {legacyText("CourseCard_Maximum_a8df2")}{" "}
                {getLocalizedValue(course?.capacity, language, "—")}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-[10px] uppercase tracking-[0.18em] text-[#9f8d7c]">
                {lengthLabel}
              </dt>
              <dd className="mt-1 font-medium text-sm text-[#483827]">
                {getLocalizedValue(course?.hours, language, "—")}
              </dd>
            </div>

            <div>
              <dt className="font-medium text-[10px] uppercase tracking-[0.18em] text-[#9f8d7c]">
                {priceLabel}
              </dt>
              <dd className="mt-1 font-medium text-sm text-[#483827]">
                {formattedPrice}
              </dd>
            </div>
          </dl>

          <div className="mt-7 h-px bg-[#e2d8ce]" />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={courseHref}
              className={classNames(ACTION_BUTTON, SECONDARY_BUTTON)}
            >
              {bookLabel}
            </Link>

            {vouchersEnabled ? (
              <Link
                href={voucherHref}
                className={classNames(ACTION_BUTTON, SECONDARY_BUTTON)}
              >
                {voucherLabel}
              </Link>
            ) : null}
          </div>
        </div>

        <CourseDetailsModal
          isOpen={showDetailsModal}
          onClose={handleDetailsClose}
          title={courseDetailsTitle}
          tenantStylePresetId={tenantTheme?.stylePresetId}
          tenantThemeStyle={tenantTheme?.style}
        >
          {courseDetailsContent}
        </CourseDetailsModal>
      </div>

      {imageBlock}
    </article>
  );
}
