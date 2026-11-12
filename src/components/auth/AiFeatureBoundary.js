"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  getAiModuleUnavailableReason,
  isAiFeaturePlanEntitled,
} from "@/config/planEntitlements";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
  selectIsAuthenticated,
} from "@/lib/features/auth/authSlice";
import { aiAccessCacheScope } from "@/lib/features/ai/aiApi.utils";
import { useGetAiCapabilitiesQuery } from "@/lib/features/ai/aiApiSlice";

const featureIsAvailable = (capabilities, feature) => {
  if (!capabilities) return true;
  if (capabilities.enabled === false || capabilities.available === false) {
    return false;
  }

  const features = capabilities.features ?? capabilities.capabilities;
  if (!feature || !features || typeof features !== "object") return true;
  const value = features[feature];
  return (
    value !== false && value?.enabled !== false && value?.available !== false
  );
};

export const useAiAccess = ({
  permission = PERMISSIONS.AI_USE,
  feature,
  skipCapabilities = false,
} = {}) => {
  const isSettingsSurface = feature === "settings";
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const cacheScope = aiAccessCacheScope({ tenant, access });
  const hasRequiredPermission = hasPermission(access, permission);
  const moduleEnabled = tenant?.modules?.ai === true;
  const planEntitled = isAiFeaturePlanEntitled(tenant, feature);
  const shouldQuery =
    isAuthenticated &&
    hasRequiredPermission &&
    moduleEnabled &&
    planEntitled &&
    !skipCapabilities;
  const query = useGetAiCapabilitiesQuery(
    { cacheScope },
    { skip: !shouldQuery, refetchOnFocus: true, refetchOnReconnect: true },
  );
  const capabilities = query.data ?? null;
  // Settings must remain reachable when the master switch is off or credits
  // are exhausted; otherwise an owner could not re-enable or restrict AI.
  const capabilityAvailable = isSettingsSurface
    ? true
    : featureIsAvailable(capabilities, feature);
  const capabilityChecked =
    skipCapabilities ||
    (shouldQuery &&
      !query.isLoading &&
      !query.isError &&
      capabilities !== null);
  const usageBlocked =
    !isSettingsSurface &&
    (capabilities?.usage?.exhausted === true ||
      capabilities?.credits?.remaining === 0 ||
      capabilities?.remainingCredits === 0);
  const canReadCached =
    isAuthenticated &&
    hasRequiredPermission &&
    moduleEnabled &&
    planEntitled &&
    capabilityChecked &&
    capabilityAvailable;
  const canUseAssistant =
    canReadCached &&
    !usageBlocked &&
    featureIsAvailable(capabilities, "assistant");

  return {
    available: canReadCached && !usageBlocked,
    cacheScope,
    canReadCached,
    canUseAssistant,
    capabilities,
    hasPermission: hasRequiredPermission,
    isLoading: shouldQuery && query.isLoading,
    isError: query.isError,
    moduleEnabled,
    planEntitled,
    moduleUnavailableReason: getAiModuleUnavailableReason(tenant),
    canManageModules: hasPermission(
      access,
      PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
    ),
    canViewPlan: hasPermission(access, PERMISSIONS.SUBSCRIPTION_VIEW),
    usageBlocked,
    refetch: query.refetch,
  };
};

function AiUnavailable({
  reason,
  compact = false,
  canManageModules,
  canViewPlan,
}) {
  const t = useTranslations("AI");
  const action =
    reason === "disabled" && canManageModules
      ? { href: "/app/settings/modules", key: "disabled" }
      : reason === "plan" && canViewPlan
        ? { href: "/app/settings/billing", key: "plan" }
        : null;

  return (
    <section
      className={
        compact
          ? "rounded-[16px] border border-line bg-sand-50 p-4"
          : "rounded-[24px] border border-line bg-white p-6 text-center shadow-card sm:p-8"
      }
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-600">
        <SparklesIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-sm font-semibold text-ink">
        {t(`unavailable.${reason}.title`)}
      </h2>
      <p className="mt-1.5 text-xs leading-5 text-ink-muted">
        {t(`unavailable.${reason}.description`)}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex min-h-10 items-center rounded-full bg-cobalt-500 px-4 text-xs font-semibold text-white transition hover:bg-cobalt-600"
        >
          {t(`unavailable.${action.key}.action`)}
        </Link>
      ) : null}
    </section>
  );
}

export default function AiFeatureBoundary({
  children,
  permission = PERMISSIONS.AI_USE,
  feature,
  compact = false,
  fallback = null,
}) {
  const access = useAiAccess({ permission, feature });

  if (access.isLoading) {
    return (
      <div className="flex min-h-32 items-center justify-center" role="status">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
      </div>
    );
  }

  if (!access.available) {
    if (fallback !== null) return fallback;
    const reason = !access.hasPermission
      ? "permission"
      : !access.moduleEnabled
        ? access.moduleUnavailableReason
        : !access.planEntitled
          ? "plan"
          : access.usageBlocked
            ? "credits"
            : "service";
    return (
      <AiUnavailable
        reason={reason}
        compact={compact}
        canManageModules={access.canManageModules}
        canViewPlan={access.canViewPlan}
      />
    );
  }

  return typeof children === "function" ? children(access) : children;
}
