"use client";

import {
  customerPortalPrimaryActionClass,
  customerPortalSecondaryActionClass,
} from "@/components/customer-shell/CustomerPortalPrimitives";

import { Link } from "@/i18n/navigation";
import { useSelector } from "react-redux";
import { XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import translation from "@/translations/translation";
import { useSearchParams } from "next/navigation";
import {
  getPortalLocationReferenceFromSearchParams,
  retainCustomerPortalLocation,
} from "@/utils/customerPortalLocation";

export default function Cancel() {
  const language = useSelector(selectCurrentLanguage);
  const searchParams = useSearchParams();
  const portalHref = retainCustomerPortalLocation(
    "/portal",
    getPortalLocationReferenceFromSearchParams(searchParams),
  );

  return (
    <main className="min-h-screen bg-[var(--tenant-background)] text-[var(--tenant-text)] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-3xl bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] mt-10 backdrop-blur border border-[var(--tenant-border)] shadow-sm px-6 py-8 sm:px-10 sm:py-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
              <XCircleIcon className="h-5 w-5" />
              {language === "cz" ? "Platba zrušena" : "Payment cancelled"}
            </div>

            <h1 className="mt-5 text-2xl sm:text-3xl font-medium text-[var(--tenant-heading-on-surface)] tracking-tight">
              {translation["CANCEL_TITLE"][language]}
            </h1>

            <p className="mt-3 text-base sm:text-lg text-[var(--tenant-text-on-surface)] max-w-prose">
              {translation["CANCEL_CONTENT"][language]}
            </p>
          </div>

          {/* Next steps */}
          <div className="mt-8 rounded-2xl border border-[var(--tenant-border)] bg-[var(--tenant-surface)] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5 text-[var(--tenant-text-on-surface)]" />
              <h2 className="text-base font-medium text-[var(--tenant-heading-on-surface)]">
                {language === "cz" ? "Co můžeš zkusit" : "What you can do next"}
              </h2>
            </div>

            <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-[var(--tenant-text-on-surface)]">
              <li>
                {language === "cz"
                  ? "Zkus platbu znovu — někdy stačí druhý pokus."
                  : "Try again — sometimes a second attempt works."}
              </li>
              <li>
                {language === "cz"
                  ? "Pokud používáš Apple Pay / Google Pay, zkus i klasickou platbu kartou."
                  : "If you used Apple Pay / Google Pay, try paying by card instead."}
              </li>
              <li>
                {language === "cz"
                  ? "Kdyby problém přetrvával, napiš nám a pomůžeme."
                  : "If it keeps happening, message us and we’ll help."}
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href={portalHref}
              className={customerPortalPrimaryActionClass}
            >
              {translation["CANCEL_BUTTON"][language]}
            </Link>

            <Link href="/" className={customerPortalSecondaryActionClass}>
              {language === "cz" ? "Zpět na úvod" : "Back to home"}
            </Link>
          </div>

          <p className="mt-6 text-center text-xs sm:text-sm text-[var(--tenant-muted-on-surface)]">
            {language === "cz"
              ? "Žádné peníze se nestrhly, dokud se platba nedokončí."
              : "No charge is made until the payment is completed."}
          </p>
        </div>
      </div>
    </main>
  );
}
