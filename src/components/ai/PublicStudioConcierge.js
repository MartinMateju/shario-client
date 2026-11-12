"use client";

import { useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";

import { usePathname } from "@/i18n/navigation";
import {
  useGetPublicConciergeConfigQuery,
  useSendPublicConciergeMessageMutation,
} from "@/lib/features/ai/aiApiSlice";
import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";
import { getTenantSlugParam } from "@/utils/tenantRouting";
import {
  findPortalLocationByReference,
  getPortalLocationReferenceFromSearchParams,
} from "@/utils/customerPortalLocation";
import { getEntityId } from "./ai.utils";
import {
  CUSTOMER_SHELL_SURFACES,
  getCustomerShellSurface,
} from "@/components/customer-shell/customerShell.config";

// The widget only renders when the studio has the concierge enabled, so its
// code loads after the config says so instead of with every page.
const ConciergeWidget = dynamic(() => import("./ConciergeWidget"), {
  ssr: false,
});

const EXCLUDED_PREFIXES = [
  "/app",
  "/portal",
  "/login",
  "/register",
  "/password",
  "/checkout",
];

export default function PublicStudioConcierge() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const tenantSlug = getTenantSlugParam(params);
  const customerSurface = getCustomerShellSurface("public", pathname);
  const excluded =
    !tenantSlug ||
    customerSurface === CUSTOMER_SHELL_SURFACES.TRANSACTION ||
    EXCLUDED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
    );
  const configQuery = useGetPublicConciergeConfigQuery(tenantSlug, {
    skip: excluded,
  });
  const config = configQuery.currentData?.config ?? configQuery.currentData;
  const [send] = useSendPublicConciergeMessageMutation();
  const hasRequestedLocation = Boolean(
    searchParams?.has("location") || searchParams?.has("locationId"),
  );
  const locationId = hasRequestedLocation
    ? getEntityId(
        findPortalLocationByReference(
          config?.locations,
          getPortalLocationReferenceFromSearchParams(searchParams),
        ),
      )
    : "";
  const conversationScope = `${tenantSlug}:${locale}:${locationId || "default"}`;

  // An explicit studio must resolve before asking. Falling back here would
  // answer using a different studio's opening hours and published guidance.
  if (
    excluded ||
    config?.enabled !== true ||
    (hasRequestedLocation && !locationId)
  ) {
    return null;
  }

  return (
    <ConciergeWidget
      key={conversationScope}
      surface="public"
      studioName={config?.studioName || formatTenantNameFromSlug(tenantSlug)}
      sessionStorageKey={`shario:concierge:${conversationScope}`}
      onSend={(request) =>
        send({
          tenantSlug,
          locale,
          locationId,
          request,
        }).unwrap()
      }
    />
  );
}
