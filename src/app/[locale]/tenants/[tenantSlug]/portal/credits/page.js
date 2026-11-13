"use client";

import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useSelector } from "react-redux";

import CreditBalance from "@/components/credits/CreditBalance";
import CreditPurchaseModal from "@/components/credits/CreditPurchaseModal";
import CreditTransactionHistory from "@/components/credits/CreditTransactionHistory";
import {
  CustomerPortalPage,
  CustomerPortalPageHeader,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";

export default function CreditsPage() {
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const copy = useLegacyCopy("creditsPage");

  return (
    <>
      <CustomerPortalPage contentClassName="max-w-[1320px]">
        <CustomerPortalPageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
        />

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:items-stretch sm:mt-8">
          <CreditBalance showPurchaseButton />
          <CreditTransactionHistory />
        </div>
      </CustomerPortalPage>
      <CreditPurchaseModal />
    </>
  );
}
