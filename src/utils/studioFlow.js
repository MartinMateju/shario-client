const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export const isAnyStudioModuleEnabled = (modules, moduleNames) => {
  const names = (
    Array.isArray(moduleNames) ? moduleNames : [moduleNames]
  ).filter(Boolean);

  if (!names.length || !modules || typeof modules !== "object") return true;

  const configuredNames = names.filter((name) => hasOwn(modules, name));

  return (
    configuredNames.length === 0 ||
    configuredNames.some((name) => modules[name] !== false)
  );
};

export const isCustomerBookingFlowEnabled = (modules) =>
  isAnyStudioModuleEnabled(modules, ["bookings", "courses"]);

export const isCustomerBookingCommerceEnabled = (modules) =>
  modules?.payments !== false && isCustomerBookingFlowEnabled(modules);

export const isServiceCatalogEnabled = (modules) =>
  modules?.payments !== false && isCustomerBookingFlowEnabled(modules);
