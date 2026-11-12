"use client";

import { customerPortalPrimaryActionClass } from "@/components/customer-shell/CustomerPortalPrimitives";

import { XCircleIcon } from "@heroicons/react/20/solid";
import translation from "@/translations/translation";
import { useSelector } from "react-redux";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { Link } from "@/i18n/navigation";

export default function CourseCapacity() {
  const language = useSelector(selectCurrentLanguage);
  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height,78px))] items-center justify-center bg-[var(--tenant-background)] px-4 py-10 text-[var(--tenant-text)]">
      <div className="flex justify-center text-center">
        <div className="ml-3">
          <div className="flex justify-center items-center">
            <XCircleIcon
              className="h-11 w-11 text-red-500"
              aria-hidden="true"
            />
          </div>
          <h3 className="text-lg text-[var(--tenant-heading-color)] font-medium">
            {translation["OVERLAP_TITLE"][language]}
          </h3>
          <p className="mt-2 text-base text-[var(--tenant-text)] max-w-xl">
            {translation["RESERVATION_LIMIT_EXCEEDED_PAGE"]?.[language] ||
              translation["COURSE_CAPACITY_ERR_CONTENT"][language]}
          </p>
          <div className="-mx-2 p-2 mt-2 -my-1.5 flex justify-center ">
            <Link
              type="button"
              href="/portal"
              className={customerPortalPrimaryActionClass}
            >
              {translation["CANCEL_BUTTON"][language]}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
