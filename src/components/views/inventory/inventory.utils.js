export const INVENTORY_TABS = [
  "items",
  "movements",
  "stocktakes",
  "reorders",
  "suppliers",
];

export const INVENTORY_CATEGORIES = [
  "tool",
  "coffee",
  "milk",
  "packaging",
  "cleaning",
  "other",
];

export const INVENTORY_UNITS = ["pcs", "kg", "g", "l", "ml", "package"];

export const INVENTORY_MOVEMENT_TYPES = ["in", "out", "transfer", "adjustment"];

export const INVENTORY_MOVEMENT_REASONS = [
  "purchase",
  "studio-consumption",
  "sale",
  "damage",
  "lost",
  "return",
  "transfer",
  "manual-adjustment",
  "other",
];

export const REORDER_STATUSES = ["open", "ordered", "received", "cancelled"];

export const INVENTORY_PAGE_SIZE = 25;

const REORDER_STATUS_TRANSITIONS = Object.freeze({
  open: Object.freeze(["open", "ordered", "cancelled"]),
  ordered: Object.freeze(["ordered", "received", "cancelled"]),
  received: Object.freeze(["received"]),
  cancelled: Object.freeze(["cancelled"]),
});

export const getReferenceId = (reference) => {
  if (reference && typeof reference === "object") {
    return String(reference.id ?? reference._id ?? "").trim();
  }

  return String(reference ?? "").trim();
};

export const normalizeInventoryCollection = (data, key) => {
  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.[key]) ? data[key] : [];
};

export const normalizeInventoryPage = (data, key) => {
  const records = normalizeInventoryCollection(data, key);
  const parsedTotal = Number(data?.total);
  const parsedPage = Number(data?.page);
  const parsedPages = Number(data?.pages);

  return {
    records,
    total: Number.isFinite(parsedTotal)
      ? Math.max(0, parsedTotal)
      : records.length,
    page:
      Number.isFinite(parsedPage) && parsedPage > 0
        ? Math.floor(parsedPage)
        : 1,
    pages:
      Number.isFinite(parsedPages) && parsedPages > 0
        ? Math.floor(parsedPages)
        : 1,
  };
};

export const getAllowedReorderStatuses = (status) =>
  REORDER_STATUS_TRANSITIONS[status] || [status].filter(Boolean);

export const getSelectableSuppliers = (suppliers, selectedSupplierId = "") => {
  const selectedId = getReferenceId(selectedSupplierId);

  return (Array.isArray(suppliers) ? suppliers : []).filter(
    (supplier) =>
      supplier?.isActive !== false || getReferenceId(supplier) === selectedId,
  );
};

export const getInventoryStockLevel = (item, locationId) => {
  const targetLocationId = getReferenceId(locationId);
  const stockLevels = Array.isArray(item?.stockLevels) ? item.stockLevels : [];

  return (
    stockLevels.find(
      (stockLevel) => getReferenceId(stockLevel?.location) === targetLocationId,
    ) || null
  );
};

export const getInventoryQuantity = (item, locationId) =>
  Number(getInventoryStockLevel(item, locationId)?.currentQuantity ?? 0);

export const getInventoryMinimum = (item, locationId) =>
  Number(getInventoryStockLevel(item, locationId)?.minimumQuantity ?? 0);

export const isInventoryItemLowStock = (item, locationId) => {
  const minimumQuantity = getInventoryMinimum(item, locationId);

  return (
    minimumQuantity > 0 &&
    getInventoryQuantity(item, locationId) <= minimumQuantity
  );
};

export const createStockLevelForm = ({ locations, item, defaultLocationId }) =>
  locations.reduce((result, location) => {
    const locationId = getReferenceId(location);
    const stockLevel = getInventoryStockLevel(item, locationId);
    const enabled =
      Boolean(stockLevel) ||
      (!item && Boolean(defaultLocationId) && locationId === defaultLocationId);

    result[locationId] = {
      enabled,
      currentQuantity: String(stockLevel?.currentQuantity ?? ""),
      minimumQuantity: String(stockLevel?.minimumQuantity ?? ""),
    };

    return result;
  }, {});

export const buildStockLevelsPayload = (stockLevelForm) =>
  Object.entries(stockLevelForm)
    .filter(([, stockLevel]) => stockLevel.enabled)
    .map(([location, stockLevel]) => ({
      location,
      currentQuantity: Number(stockLevel.currentQuantity || 0),
      minimumQuantity: Number(stockLevel.minimumQuantity || 0),
    }));

export const buildStockLevelThresholdsPayload = (stockLevelForm) =>
  Object.entries(stockLevelForm)
    .filter(([, stockLevel]) => stockLevel.enabled)
    .map(([location, stockLevel]) => ({
      location,
      minimumQuantity: Number(stockLevel.minimumQuantity || 0),
    }));

export const getInventoryItemName = (itemReference, itemsById) => {
  if (itemReference && typeof itemReference === "object") {
    return itemReference.name || "";
  }

  return itemsById.get(getReferenceId(itemReference))?.name || "";
};

export const getAuditFormItems = (audit) =>
  (Array.isArray(audit?.items) ? audit.items : []).map((entry) => ({
    item: getReferenceId(entry.item),
    itemName:
      entry.item && typeof entry.item === "object" ? entry.item.name || "" : "",
    expectedQuantity: Number(entry.expectedQuantity || 0),
    actualQuantity: String(entry.actualQuantity ?? entry.expectedQuantity ?? 0),
    note: entry.note || "",
  }));

export const buildAuditUpdatePayload = (items, note = "") => ({
  items: items.map((item) => ({
    item: item.item,
    actualQuantity: Number(item.actualQuantity || 0),
    note: String(item.note || "").trim(),
  })),
  note: String(note || "").trim(),
});
