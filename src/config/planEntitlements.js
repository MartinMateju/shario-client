import { normalizeSubscriptionPlan } from "@/config/subscriptionPlans";

// Auth responses carry the immutable plan version. Prefer an explicit server
// capability when present and preserve historical/missing-version behavior.
export const isOpenStudioPlanEntitled = (tenant) => {
  const explicit = tenant?.capabilities?.booking?.openStudio;
  if (typeof explicit === "boolean") return explicit;
  return !(
    normalizeSubscriptionPlan(tenant?.plan) === "starter" &&
    Number(tenant?.planVersion) === 3
  );
};

export const getAiModuleUnavailableReason = (tenant) => {
  return tenant?.moduleEntitlements?.ai === false ||
    tenant?.capabilities?.ai?.studioAssistant === "none"
    ? "plan"
    : "disabled";
};

export const isAiFeaturePlanEntitled = (tenant, feature) => {
  const capabilities = tenant?.capabilities?.ai;
  if (!capabilities || !feature || feature === "settings") return true;
  if (feature === "assistant") return capabilities.studioAssistant !== "none";
  const key = {
    dailyBriefing: "dailyStudioBriefing",
    businessAdvisor: "businessAdvisor",
    knowledgeBase: "knowledgeHub",
    customerConcierge: "knowledgeAwareCustomerAssistant",
    publicConcierge: "knowledgeAwareCustomerAssistant",
    reportInsights: "commandCenter",
    staffPlanning: "commandCenter",
  }[feature];
  return !key || capabilities[key] !== false;
};

export const canCreateCustomRolesForPlan = (tenant) => {
  if (Number(tenant?.planVersion ?? 1) < 3) return true;
  const explicit = tenant?.capabilities?.enterprise?.customRolesAndPermissions;
  if (typeof explicit === "boolean") return explicit;
  return (
    Number(tenant?.planVersion) !== 3 ||
    normalizeSubscriptionPlan(tenant?.plan) === "enterprise"
  );
};
