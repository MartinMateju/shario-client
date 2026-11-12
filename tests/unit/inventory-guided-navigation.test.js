import { describe, expect, it, vi } from "vitest";

import {
  shouldOpenGuidedInventoryCreate,
  toggleInventoryItemAvailability,
} from "@/components/views/inventory/inventoryGuided";

describe("guided inventory navigation", () => {
  it("auto-opens only the explicit create action", () => {
    expect(
      shouldOpenGuidedInventoryCreate({
        guided: true,
        setupStep: "inventory",
        action: "create",
      }),
    ).toBe(true);
    expect(
      shouldOpenGuidedInventoryCreate({
        guided: true,
        setupStep: "inventory",
        action: "review",
      }),
    ).toBe(false);
    expect(
      shouldOpenGuidedInventoryCreate({
        guided: false,
        setupStep: "inventory",
        action: "create",
      }),
    ).toBe(false);
  });

  it("restores an inactive item before returning to Launch Center", async () => {
    const unwrap = vi.fn().mockResolvedValue({ id: "item-1", isActive: true });
    const updateItem = vi.fn(() => ({ unwrap }));
    const refreshAndContinue = vi.fn().mockResolvedValue(true);

    await expect(
      toggleInventoryItemAvailability({
        itemId: "item-1",
        itemIsActive: false,
        updateItem,
        refreshAndContinue,
      }),
    ).resolves.toEqual({ restoring: true, continued: true });

    expect(updateItem).toHaveBeenCalledWith({
      id: "item-1",
      isActive: true,
    });
    expect(unwrap).toHaveBeenCalledOnce();
    expect(refreshAndContinue).toHaveBeenCalledWith({
      metadata: { form: "inventory_item", action: "restore" },
    });
  });

  it("archives without completing the guided restore step", async () => {
    const updateItem = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({ id: "item-1", isActive: false }),
    }));
    const refreshAndContinue = vi.fn();

    await expect(
      toggleInventoryItemAvailability({
        itemId: "item-1",
        itemIsActive: true,
        updateItem,
        refreshAndContinue,
      }),
    ).resolves.toEqual({ restoring: false, continued: false });

    expect(updateItem).toHaveBeenCalledWith({
      id: "item-1",
      isActive: false,
    });
    expect(refreshAndContinue).not.toHaveBeenCalled();
  });
});
