"use client";

import { useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";

import {
  selectCurrentTenant,
  selectCurrentUser,
} from "@/lib/features/auth/authSlice";
import {
  useGetCustomerConciergeConfigQuery,
  useSendCustomerConciergeMessageMutation,
} from "@/lib/features/ai/aiApiSlice";
import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";
import { getTenantSlugParam } from "@/utils/tenantRouting";
import { usePathname } from "@/i18n/navigation";
import {
  CUSTOMER_SHELL_SURFACES,
  getCustomerShellSurface,
} from "@/components/customer-shell/customerShell.config";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { getEntityId } from "./ai.utils";

// The widget only renders when the studio has the concierge enabled, so its
// code loads after the config says so instead of with every page.
const ConciergeWidget = dynamic(() => import("./ConciergeWidget"), {
  ssr: false,
});

export default function CustomerStudioConcierge() {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const tenant = useSelector(selectCurrentTenant);
  const user = useSelector(selectCurrentUser);
  const location = useOptionalCustomerPortalLocation();
  const locationId = location?.activeLocationId || "";
  const publicTenant = useOptionalPublicTenant();
  const tenantTheme = getPublicTenantTheme(publicTenant?.tenant || {}, {
    surface: publicTenant?.surface,
  });
  const tenantSlug = getTenantSlugParam(params);
  const customerSurface = getCustomerShellSurface("portal", pathname);
  const eligible = Boolean(
    tenantSlug &&
    tenant?.modules?.ai === true &&
    customerSurface !== CUSTOMER_SHELL_SURFACES.TRANSACTION,
  );
  const configQuery = useGetCustomerConciergeConfigQuery(undefined, {
    skip: !eligible,
  });
  const config = configQuery.data?.config ?? configQuery.data;
  const [send] = useSendCustomerConciergeMessageMutation();
  const conversationScope = `${tenantSlug}:${getEntityId(user)}:${locale}:${locationId || "default"}`;

  if (
    !eligible ||
    config?.enabled !== true ||
    (location && (!locationId || location.isLoading || location.isSwitching))
  ) {
    return null;
  }

  return (
    <ConciergeWidget
      key={conversationScope}
      surface="customer"
      studioName={tenant?.name || formatTenantNameFromSlug(tenantSlug)}
      tenantStylePresetId={tenantTheme.stylePresetId}
      tenantThemeStyle={tenantTheme.style}
      onSend={(body) =>
        send({
          locale,
          ...body,
          ...(locationId ? { locationId } : {}),
        }).unwrap()
      }
    />
  );
}
