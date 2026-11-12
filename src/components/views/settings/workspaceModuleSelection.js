const CORE_MODULE_KEYS = new Set(["ai"]);

export const isWorkspaceModuleSelected = ({
  moduleKey,
  modules,
  selectedModules,
}) => {
  const moduleConfig = modules[moduleKey];

  if (moduleConfig?.entitled === false) return false;
  if (selectedModules.has(moduleKey)) return true;
  if (!CORE_MODULE_KEYS.has(moduleKey)) return false;

  return typeof moduleConfig?.selected === "boolean"
    ? moduleConfig.selected
    : true;
};
