"use client";

import { useLegacyText } from "@/i18n/useLegacyCopy";
import { customerPortalPrimaryActionClass } from "@/components/customer-shell/CustomerPortalPrimitives";

import { Link } from "@/i18n/navigation";
import { useSelector } from "react-redux";
import { XCircleIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getPortalLocationReferenceFromSearchParams } from "@/utils/customerPortalLocation";
import useCustomerPortalReturnHref from "@/components/customer-shell/useCustomerPortalReturnHref";

export default function Cancel() {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const t = useTranslations("CreditPurchaseStatus");
  const language = useSelector(selectCurrentLanguage);
  const searchParams = useSearchParams();
  const portalHref = useCustomerPortalReturnHref(
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
              {legacyText("Cancel_Payment_cancelled_af438")}
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
                {legacyText("Cancel_What_you_can_do_next_78edc")}
              </h2>
            </div>

            <ul className="mt-3 list-disc pl-5 space-y-2 text-sm sm:text-base text-[var(--tenant-text-on-surface)]">
              <li>
                {legacyText(
                  "Cancel_Try_again_sometimes_a_second_attempt_works_c3e09",
                )}
              </li>
              <li>
                {legacyText(
                  "Cancel_If_you_used_Apple_Pay_Google_Pay_try_paying_by_card_ins_084d5",
                )}
              </li>
              <li>
                {legacyText(
                  "Cancel_If_it_keeps_happening_message_us_and_we_ll_help_ebf8e",
                )}
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href={portalHref}
              className={customerPortalPrimaryActionClass}
            >
              {portalHref.split("?")[0] === "/portal"
                ? translation["CANCEL_BUTTON"][language]
                : t("actions.portal")}
            </Link>
          </div>

          <p className="mt-6 text-center text-xs sm:text-sm text-[var(--tenant-muted-on-surface)]">
            {legacyText(
              "Cancel_No_charge_is_made_until_the_payment_is_completed_5ec3b",
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
