import { describe, expect, it } from "vitest";

import { PERMISSIONS } from "@/config/permissions";
import { dashboardNavigation } from "@/components/dashboard/dashboard.data";
import {
  inventoryApiRoutes,
  inventoryInvalidationTags,
} from "@/lib/features/inventory/inventoryApiSlice";
import { supplierApiRoutes } from "@/lib/features/suppliers/suppliersApiSlice";

describe("inventory API paths", () => {
  it("uses the inventory endpoint family for all five workflows", () => {
    expect(inventoryApiRoutes.items).toBe("/inventory/items");
    expect(inventoryApiRoutes.item("item-1")).toBe("/inventory/items/item-1");
    expect(inventoryApiRoutes.movements).toBe("/inventory/movements");
    expect(inventoryApiRoutes.audits).toBe("/inventory/audits");
    expect(inventoryApiRoutes.completeAudit("audit-1")).toBe(
      "/inventory/audits/audit-1/complete",
    );
    expect(inventoryApiRoutes.reorders).toBe("/inventory/reorders");
    expect(inventoryApiRoutes.reorder("request-1")).toBe(
      "/inventory/reorders/request-1",
    );
  });

  it("uses the mounted supply-order supplier endpoints", () => {
    expect(supplierApiRoutes.collection).toBe("/supply-orders/suppliers");
    expect(supplierApiRoutes.supplier("supplier-1")).toBe(
      "/supply-orders/suppliers/supplier-1",
    );
  });

  it("refreshes every workflow affected by ledger mutations", () => {
    expect(inventoryInvalidationTags.createItem).toEqual([
      "InventoryItem",
      "InventoryMovement",
      "ReorderRequest",
      "SetupCenter",
    ]);
    expect(inventoryInvalidationTags.updateItem).toEqual([
      "InventoryItem",
      "ReorderRequest",
      "SetupCenter",
    ]);
    expect(inventoryInvalidationTags.createMovement).toEqual([
      "InventoryItem",
      "InventoryMovement",
      "ReorderRequest",
    ]);
    expect(inventoryInvalidationTags.completeAudit).toEqual([
      "InventoryAudit",
      "InventoryItem",
      "InventoryMovement",
      "ReorderRequest",
    ]);
  });
});

describe("Inventory workspace navigation", () => {
  it("is directly discoverable and gated by its module and view permission", () => {
    expect(
      dashboardNavigation.find((entry) => entry.key === "inventory"),
    ).toMatchObject({
      href: "/app/operations?section=inventory",
      module: "inventory",
      permissions: [PERMISSIONS.INVENTORY_VIEW],
    });
  });
});
