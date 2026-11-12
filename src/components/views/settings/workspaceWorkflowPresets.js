import { isWorkspaceModuleSelected } from "./workspaceModuleSelection";
export const WORKSPACE_WORKFLOW_PRESETS = [
  {
    id: "bookingStudio",
    modules: [
      "bookings",
      "payments",
      "customers",
      "courses",
      "memberships",
      "communications",
    ],
    requiredModules: ["bookings"],
    visibleGroups: ["bookings", "sales", "messages"],
    visibleItems: [
      "calendar",
      "bookings",
      "customers",
      "products",
      "sales",
      "invoices",
      "messages",
    ],
  },
  {
    id: "membershipStudio",
    modules: ["customers", "memberships"],
    requiredModules: ["memberships"],
    visibleGroups: ["sales"],
    visibleItems: ["customers", "products"],
  },
  {
    id: "fullWorkspace",
    modules: [
      "bookings",
      "payments",
      "customers",
      "courses",
      "memberships",
      "credits",
      "vouchers",
      "automations",
      "newsletter",
      "inventory",
      "staff_tasks",
      "communications",
      "ai",
    ],
    requiredModules: ["bookings"],
    visibleGroups: ["bookings", "studio", "sales", "messages"],
    visibleItems: [
      "calendar",
      "bookings",
      "customers",
      "inventory",
      "staffPlanning",
      "knowledge",
      "sales",
      "products",
      "invoices",
      "messages",
      "automations",
      "reports",
    ],
  },
];
const presetById = new Map(
  WORKSPACE_WORKFLOW_PRESETS.map((preset) => [preset.id, preset]),
);
export const isWorkflowPresetAvailable = (preset, modules = {}) =>
  preset.requiredModules.every((key) => modules[key]?.entitled !== false);
export const buildWorkflowPresetState = ({
  presetId,
  moduleKeys,
  modules,
  navigationEntries,
}) => {
  const preset = presetById.get(presetId);
  if (!preset || !isWorkflowPresetAvailable(preset, modules)) return null;
  const selectedModules = new Set(preset.modules);
  const visibleGroups = new Set(preset.visibleGroups);
  const visibleItems = new Set(preset.visibleItems);
  return {
    modules: Object.fromEntries(
      moduleKeys.map((key) => [
        key,
        isWorkspaceModuleSelected({
          moduleKey: key,
          modules,
          selectedModules,
        }),
      ]),
    ),
    navigation: {
      hiddenGroups: navigationEntries
        .filter(
          (entry) => entry.type === "group" && !visibleGroups.has(entry.key),
        )
        .map((entry) => entry.key)
        .sort(),
      hiddenItems: navigationEntries
        .flatMap((entry) => entry.items)
        .filter((item) => !visibleItems.has(item.key))
        .map((item) => item.key)
        .sort(),
    },
  };
};
export const getMatchingWorkflowPresetId = ({ moduleKeys, modules, draft }) =>
  WORKSPACE_WORKFLOW_PRESETS.find((preset) => {
    if (!isWorkflowPresetAvailable(preset, modules)) return false;
    const selectedModules = new Set(preset.modules);
    return moduleKeys.every((key) => {
      const expected = isWorkspaceModuleSelected({
        moduleKey: key,
        modules,
        selectedModules,
      });
      return Boolean(draft?.modules?.[key]) === expected;
    });
  })?.id ?? null;
