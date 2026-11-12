"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { selectCurrentTenant } from "@/lib/features/auth/authSlice";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import {
  retainCustomerPortalLocation,
  getPortalLocationReferenceFromSearchParams,
} from "@/utils/customerPortalLocation";
import CustomerShellStatus from "./CustomerShellStatus";
import { getCustomerVoucherShopHref } from "@/utils/customerVoucherRouting";
import { useOptionalCustomerPortalLocation } from "./CustomerPortalLocationProvider";
import {
  getCustomerPortalFallbackHref,
  getCustomerPortalPageId,
  isCustomerPortalPageEnabled,
} from "./customerPortalVisibility";

const COPY = {
  en: {
    title: "Page unavailable",
    description: "This studio has disabled this customer portal page.",
    continue: "Continue in the portal",
    empty:
      "Contact the studio if you need help with your account or an existing booking.",
  },
  cs: {
    title: "Stránka není dostupná",
    description: "Studio tuto stránku zákaznického portálu vypnulo.",
    continue: "Pokračovat v portálu",
    empty:
      "Pokud potřebujete pomoc s účtem nebo existující rezervací, kontaktujte studio.",
  },
};

export function CustomerPortalPageUnavailable({ fallbackHref }) {
  const locale = useLocale();
  const copy = COPY[locale === "cs" ? "cs" : "en"];
  return (
    <main
      data-customer-portal-page-unavailable
      className="mx-auto max-w-2xl px-6 py-16"
      style={{ color: "var(--tenant-text)" }}
    >
      <h1 className="text-3xl font-semibold">{copy.title}</h1>
      <p className="mt-4">{copy.description}</p>
      {fallbackHref ? (
        <Link
          href={fallbackHref}
          className="tenant-button-primary mt-6 inline-flex min-h-12 items-center rounded-full px-6"
        >
          {copy.continue}
        </Link>
      ) : (
        <p className="mt-4">{copy.empty}</p>
      )}
    </main>
  );
}

export default function CustomerPortalPageGate({
  children,
  pathnameOverride,
  searchParamsOverride,
  autoRedirect = true,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionTenant = useSelector(selectCurrentTenant);
  const tenant = useOptionalPublicTenant()?.tenant || sessionTenant;
  const location = useOptionalCustomerPortalLocation()?.activeLocation;
  const route = pathnameOverride || pathname;
  const params = searchParamsOverride || searchParams;
  const pageId = getCustomerPortalPageId(route, params);
  const enabled =
    isCustomerPortalPageEnabled(tenant, pageId, location) &&
    (pageId !== "vouchers" || sessionTenant?.modules?.vouchers !== false);
  const fallback = getCustomerPortalFallbackHref(
    tenant,
    sessionTenant?.modules,
    location,
  );
  const fallbackHref =
    fallback &&
    retainCustomerPortalLocation(
      fallback,
      getPortalLocationReferenceFromSearchParams(params),
    );
  const legacyVoucherHref =
    route === "/portal" && enabled
      ? getCustomerVoucherShopHref(route, params)
      : "";
  const redirect =
    autoRedirect &&
    (legacyVoucherHref ||
      (!enabled && route === "/portal" && !params.get("tab") && fallbackHref));
  useEffect(() => {
    if (redirect) router.replace(redirect, { scroll: false });
  }, [redirect, router]);

  if (redirect) return <CustomerShellStatus />;
  if (enabled) return children;
  return <CustomerPortalPageUnavailable fallbackHref={fallbackHref} />;
}
