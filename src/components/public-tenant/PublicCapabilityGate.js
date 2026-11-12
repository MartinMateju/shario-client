"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { usePublicTenant } from "./PublicTenantProvider";
import { isPublicTenantPageVisible } from "./publicTenant.config";

export default function PublicCapabilityGate({ capability, children }) {
  const t = useTranslations("PublicTenant");
  const { tenant } = usePublicTenant();

  const pageKey = capability === "bookStudio" ? "book" : capability;

  if (
    tenant.publicCapabilities[capability] === true &&
    isPublicTenantPageVisible(tenant, pageKey)
  ) {
    return children;
  }

  return (
    <main
      className="flex min-h-[60vh] items-center justify-center bg-[var(--tenant-background)] px-6 py-20 text-center text-[var(--tenant-text)]"
      data-tenant-layout="section"
    >
      <section
        className="max-w-lg rounded-[26px] border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-7 py-10 text-[var(--tenant-text-on-surface)] shadow-[0_18px_60px_rgba(17,17,15,0.05)]"
        data-tenant-layout="card"
        data-tenant-surface="panel"
      >
        <h1
          className="text-3xl font-semibold tracking-[-0.045em]"
          data-tenant-type="display"
        >
          {t("unavailable.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--tenant-muted-on-surface)]">
          {t("unavailable.description")}
        </p>
        <Link
          href="/"
          data-tenant-button="secondary"
          className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[var(--tenant-border)] px-5 text-xs font-semibold text-[var(--tenant-text-on-surface)] transition hover:border-[var(--tenant-accent-on-surface)]"
        >
          {t("unavailable.back")}
        </Link>
      </section>
    </main>
  );
}
