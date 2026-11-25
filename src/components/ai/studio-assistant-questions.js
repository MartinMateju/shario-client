import { PERMISSIONS, hasPermission } from "@/config/permissions";

const QUESTIONS = Object.freeze([
  { key: "today", period: "today" },
  {
    key: "bookings",
    period: "today",
    module: "bookings",
    permissions: [PERMISSIONS.BOOKINGS_VIEW],
  },
  {
    key: "bookingTrend",
    period: "last30Days",
    module: "bookings",
    permissions: [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.REPORTS_VIEW],
  },
  {
    key: "teamBlockers",
    period: "today",
    module: "staff_tasks",
    anyPermission: [
      PERMISSIONS.PLANNING_TEAM_VIEW,
      PERMISSIONS.PLANNING_MANAGE,
    ],
  },
  {
    key: "reorders",
    period: "current",
    module: "inventory",
    permissions: [PERMISSIONS.INVENTORY_VIEW],
  },
]);

export const getStudioAssistantQuestions = ({ tenant, access } = {}) => {
  if (
    tenant?.modules?.ai !== true ||
    !hasPermission(access, PERMISSIONS.AI_USE)
  ) {
    return [];
  }

  const questions = QUESTIONS.filter(
    ({ module, permissions = [], anyPermission }) =>
      (!module || tenant.modules[module] === true) &&
      permissions.every((permission) => hasPermission(access, permission)) &&
      (!anyPermission ||
        anyPermission.some((permission) => hasPermission(access, permission))),
  ).map(({ key, period }) => ({ key, period }));

  if (questions.length === 1) {
    questions.push({ key: "generalHelp", period: "current" });
  }

  return questions.slice(0, 4);
};
