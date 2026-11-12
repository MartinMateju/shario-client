import { studioPlanLabels } from "./dashboard.data";

const DEFAULT_PLAN = "professional";

export const formatPlan = (plan, t) => {
  const rawPlan = String(plan || DEFAULT_PLAN).trim();
  const normalizedPlan = rawPlan.toLowerCase();
  const fallbackLabel = Object.hasOwn(studioPlanLabels, normalizedPlan)
    ? studioPlanLabels[normalizedPlan]
    : null;

  if (!fallbackLabel) {
    return rawPlan.replaceAll("_", " ");
  }

  const translationKey = `plans.${normalizedPlan}`;

  if (
    typeof t !== "function" ||
    (typeof t.has === "function" && !t.has(translationKey))
  ) {
    return fallbackLabel;
  }

  return t(translationKey);
};
