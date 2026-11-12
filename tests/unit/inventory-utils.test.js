import { describe, expect, it } from "vitest";

import {
  buildStockLevelsPayload,
  buildStockLevelThresholdsPayload,
  buildAuditUpdatePayload,
  createStockLevelForm,
  getAuditFormItems,
  getAllowedReorderStatuses,
  getInventoryMinimum,
  getInventoryQuantity,
  getInventoryStockLevel,
  getReferenceId,
  getSelectableSuppliers,
  INVENTORY_MOVEMENT_TYPES,
  isInventoryItemLowStock,
  normalizeInventoryCollection,
  normalizeInventoryPage,
  REORDER_STATUSES,
} from "@/components/views/inventory/inventory.utils";

const locationA = "64b000000000000000000011";
const locationB = "64b000000000000000000012";

const item = {
  _id: "64b000000000000000000021",
  name: "Stoneware",
  stockLevels: [
    {
      location: { _id: locationA, name: "Grohova" },
      currentQuantity: 8,
      minimumQuantity: 10,
    },
    {
      location: locationB,
      currentQuantity: 24,
      minimumQuantity: 6,
    },
  ],
};

describe("inventory location stock helpers", () => {
  it("normalizes populated and plain references", () => {
    expect(getReferenceId({ _id: locationA })).toBe(locationA);
    expect(getReferenceId({ id: locationB })).toBe(locationB);
    expect(getReferenceId(locationA)).toBe(locationA);
    expect(getReferenceId(null)).toBe("");
  });

  it("reads quantity and thresholds from the selected location only", () => {
    expect(getInventoryStockLevel(item, locationA)).toEqual(
      item.stockLevels[0],
    );
    expect(getInventoryQuantity(item, locationA)).toBe(8);
    expect(getInventoryMinimum(item, locationA)).toBe(10);
    expect(isInventoryItemLowStock(item, locationA)).toBe(true);

    expect(getInventoryQuantity(item, locationB)).toBe(24);
    expect(isInventoryItemLowStock(item, locationB)).toBe(false);
  });

  it("does not treat an unset zero threshold as low stock", () => {
    const untracked = {
      stockLevels: [
        { location: locationA, currentQuantity: 0, minimumQuantity: 0 },
      ],
    };

    expect(isInventoryItemLowStock(untracked, locationA)).toBe(false);
  });

  it("builds opening balances for creates and threshold-only item updates", () => {
    const form = createStockLevelForm({
      locations: [
        { id: locationA, name: "Grohova" },
        { id: locationB, name: "Vaclavska" },
      ],
      item,
      defaultLocationId: locationA,
    });

    expect(buildStockLevelsPayload(form)).toEqual([
      { location: locationA, currentQuantity: 8, minimumQuantity: 10 },
      { location: locationB, currentQuantity: 24, minimumQuantity: 6 },
    ]);
    expect(buildStockLevelThresholdsPayload(form)).toEqual([
      { location: locationA, minimumQuantity: 10 },
      { location: locationB, minimumQuantity: 6 },
    ]);
  });
});

describe("inventory response and workflow contracts", () => {
  it("normalizes direct and envelope collection responses", () => {
    expect(normalizeInventoryCollection([item], "items")).toEqual([item]);
    expect(normalizeInventoryCollection({ items: [item] }, "items")).toEqual([
      item,
    ]);
    expect(normalizeInventoryCollection({}, "items")).toEqual([]);
  });

  it("preserves pagination metadata and safely normalizes empty page counts", () => {
    expect(
      normalizeInventoryPage(
        { items: [item], total: 51, page: 2, pages: 3 },
        "items",
      ),
    ).toEqual({
      records: [item],
      total: 51,
      page: 2,
      pages: 3,
    });
    expect(
      normalizeInventoryPage(
        { items: [], total: 0, page: 4, pages: 0 },
        "items",
      ),
    ).toEqual({
      records: [],
      total: 0,
      page: 4,
      pages: 1,
    });
  });

  it("keeps the stocktake snapshot read-only while preparing actual counts", () => {
    const formItems = getAuditFormItems({
      items: [
        {
          item: { _id: item._id, name: item.name },
          expectedQuantity: 8,
          actualQuantity: 7,
          note: "One damaged bag",
        },
      ],
    });

    expect(formItems).toEqual([
      {
        item: item._id,
        itemName: item.name,
        expectedQuantity: 8,
        actualQuantity: "7",
        note: "One damaged bag",
      },
    ]);
    expect(buildAuditUpdatePayload(formItems, " Counted together ")).toEqual({
      items: [
        {
          item: item._id,
          actualQuantity: 7,
          note: "One damaged bag",
        },
      ],
      note: "Counted together",
    });
    expect(buildAuditUpdatePayload(formItems).items[0]).not.toHaveProperty(
      "expectedQuantity",
    );
  });

  it("uses the canonical movement types and reorder statuses", () => {
    expect(INVENTORY_MOVEMENT_TYPES).toEqual([
      "in",
      "out",
      "transfer",
      "adjustment",
    ]);
    expect(REORDER_STATUSES).toEqual([
      "open",
      "ordered",
      "received",
      "cancelled",
    ]);
    expect(getAllowedReorderStatuses("open")).toEqual([
      "open",
      "ordered",
      "cancelled",
    ]);
    expect(getAllowedReorderStatuses("ordered")).toEqual([
      "ordered",
      "received",
      "cancelled",
    ]);
    expect(getAllowedReorderStatuses("received")).toEqual(["received"]);
    expect(getAllowedReorderStatuses("cancelled")).toEqual(["cancelled"]);
  });

  it("excludes inactive suppliers unless one is already linked", () => {
    const suppliers = [
      { _id: "supplier-active", name: "Active", isActive: true },
      { _id: "supplier-inactive", name: "Inactive", isActive: false },
    ];

    expect(getSelectableSuppliers(suppliers)).toEqual([suppliers[0]]);
    expect(getSelectableSuppliers(suppliers, "supplier-inactive")).toEqual(
      suppliers,
    );
  });
});
