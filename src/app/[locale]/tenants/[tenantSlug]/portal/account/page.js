"use client";

import { useTranslations } from "next-intl";

import {
  CustomerPortalPage,
  CustomerPortalPageHeader,
} from "@/components/customer-shell/CustomerPortalPrimitives";
import AccountSettingsPage from "@/components/views/settings/AccountSettingsPage";

export default function PortalAccountPage() {
  const t = useTranslations("AccountSettings");

  return (
    <CustomerPortalPage contentClassName="max-w-5xl">
      <CustomerPortalPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="mt-7">
        <AccountSettingsPage showPageHeader={false} portalMode />
      </div>
    </CustomerPortalPage>
  );
}
