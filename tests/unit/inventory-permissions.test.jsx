import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  guided: false,
  searchParams: new URLSearchParams(),
  locations: [
    {
      _id: "64b000000000000000000011",
      name: "Grohova",
      isPrimary: true,
      isActive: true,
    },
    {
      _id: "64b000000000000000000012",
      name: "Vaclavska",
      isActive: true,
    },
  ],
  workspaceAccess: {
    role: "staff",
    status: "active",
    effectivePermissions: ["inventory.view"],
  },
  itemUpdates: [],
  itemFetches: [],
  itemQueries: [],
  itemTotal: 1,
  fullInventoryItem: null,
  movementCreates: [],
  reorders: [],
  suppliers: [],
  mutationHook: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
  updateItemHook: () => [
    vi.fn((payload) => {
      mocks.itemUpdates.push(payload);
      return { unwrap: () => Promise.resolve({}) };
    }),
    { isLoading: false },
  ],
  createMovementHook: () => [
    vi.fn((payload) => {
      mocks.movementCreates.push(payload);
      return { unwrap: () => Promise.resolve({}) };
    }),
    { isLoading: false },
  ],
  getItemHook: () => [
    vi.fn((id) => {
      mocks.itemFetches.push(id);
      return {
        unwrap: () => Promise.resolve(mocks.fullInventoryItem),
      };
    }),
    { isFetching: false },
  ],
}));

const tenantId = "64b000000000000000000001";
const locationId = "64b000000000000000000011";
const destinationLocationId = "64b000000000000000000012";
const inactiveLocationId = "64b000000000000000000013";
const itemId = "64b000000000000000000021";

const messages = {
  "actions.addMovement": "Add movement",
  "actions.newItem": "New item",
  "tabs.items": "Items",
  "tabs.movements": "Movements",
  "tabs.stocktakes": "Stocktakes",
  "tabs.reorders": "Reorders",
  "tabs.suppliers": "Suppliers",
  "items.edit": "Edit {name}",
  "stocktakes.create": "Start stocktake",
  "reorders.add": "Add reorder",
  "reorders.statusFor": "Reorder status for {item}",
  "suppliers.add": "Add supplier",
  "common.next": "Next",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) =>
      (messages[key] || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? `{${name}}`,
      ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: mocks.guided,
    stepId: "inventory",
    refreshAndContinue: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: {
          id: tenantId,
          modules: { inventory: true },
          settings: { currency: "CZK" },
        },
        userInfo: { tenant: tenantId },
        workspaceAccess: mocks.workspaceAccess,
      },
      studioContext: {
        tenantId,
        activeStudioId: locationId,
      },
    }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.studioContext.activeStudioId,
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: { locations: mocks.locations },
    isLoading: false,
  }),
}));

vi.mock("@/lib/features/inventory/inventoryApiSlice", () => ({
  useGetInventoryItemsQuery: (params = {}) => {
    mocks.itemQueries.push(params);
    const isLowStockCount = params.lowStock === true;

    return {
      data: {
        items: isLowStockCount
          ? []
          : [
              {
                _id: itemId,
                name: "Stoneware",
                category: "other",
                unit: "kg",
                isActive: true,
                stockLevels: [
                  {
                    location: locationId,
                    currentQuantity: 20,
                    minimumQuantity: 5,
                  },
                ],
              },
            ],
        total: isLowStockCount ? 0 : mocks.itemTotal,
        page: params.page || 1,
        pages: isLowStockCount ? 0 : Math.ceil(mocks.itemTotal / 25),
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useLazyGetInventoryItemQuery: mocks.getItemHook,
  useGetInventoryMovementsQuery: () => ({
    data: { movements: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetInventoryAuditsQuery: () => ({
    data: { audits: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGetReorderRequestsQuery: (params = {}) => ({
    data: {
      requests: params.status ? [] : mocks.reorders,
      total: params.status ? 0 : mocks.reorders.length,
      page: params.page || 1,
      pages: params.status ? 0 : Math.ceil(mocks.reorders.length / 25),
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateInventoryItemMutation: mocks.mutationHook,
  useUpdateInventoryItemMutation: mocks.updateItemHook,
  useCreateInventoryMovementMutation: mocks.createMovementHook,
  useCreateInventoryAuditMutation: mocks.mutationHook,
  useUpdateInventoryAuditMutation: mocks.mutationHook,
  useCompleteInventoryAuditMutation: mocks.mutationHook,
  useCreateReorderRequestMutation: mocks.mutationHook,
  useUpdateReorderRequestMutation: mocks.mutationHook,
}));

vi.mock("@/lib/features/suppliers/suppliersApiSlice", () => ({
  useGetSuppliersQuery: () => ({
    data: { suppliers: mocks.suppliers },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateSupplierMutation: mocks.mutationHook,
  useUpdateSupplierMutation: mocks.mutationHook,
}));

import InventoryManagementPage from "@/components/views/inventory/InventoryManagementPage";

describe("Inventory management permissions", () => {
  beforeEach(() => {
    mocks.guided = false;
    mocks.searchParams = new URLSearchParams();
    mocks.locations = [
      {
        _id: locationId,
        name: "Grohova",
        isPrimary: true,
        isActive: true,
      },
      {
        _id: destinationLocationId,
        name: "Vaclavska",
        isActive: true,
      },
    ];
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view"],
    };
    mocks.itemUpdates.length = 0;
    mocks.itemFetches.length = 0;
    mocks.itemQueries.length = 0;
    mocks.itemTotal = 1;
    mocks.movementCreates.length = 0;
    mocks.reorders.length = 0;
    mocks.suppliers.length = 0;
    mocks.fullInventoryItem = {
      _id: itemId,
      name: "Stoneware",
      category: "other",
      unit: "kg",
      isActive: true,
      stockLevels: [
        {
          location: locationId,
          currentQuantity: 20,
          minimumQuantity: 5,
        },
        {
          location: destinationLocationId,
          currentQuantity: 8,
          minimumQuantity: 3,
        },
        {
          location: {
            _id: inactiveLocationId,
            name: "Archived studio",
            isActive: false,
          },
          currentQuantity: 0,
          minimumQuantity: 2,
        },
      ],
    };
  });

  it("keeps every workflow readable while hiding mutation actions", () => {
    render(<InventoryManagementPage showPageHeader={false} />);

    expect(screen.getByRole("region", { name: "Items" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.queryByRole("button", { name: "New item" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add movement" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit Stoneware" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Stocktakes" }));
    expect(
      screen.queryByRole("button", { name: "Start stocktake" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Reorders" }));
    expect(screen.queryByRole("button", { name: "Add reorder" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));
    expect(screen.queryByRole("button", { name: "Add supplier" })).toBeNull();
  });

  it("shows item and movement actions to inventory managers", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view", "inventory.manage"],
    };

    render(<InventoryManagementPage showPageHeader={false} />);

    expect(
      screen.getByRole("button", { name: "Add movement" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New item" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Stoneware" }),
    ).toBeInTheDocument();
  });

  it("keeps current stock out of item metadata updates", async () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view", "inventory.manage"],
    };

    render(<InventoryManagementPage showPageHeader={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Stoneware" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "itemForm.save" }),
    );

    await waitFor(() => expect(mocks.itemUpdates).toHaveLength(1));
    expect(mocks.itemFetches).toEqual([itemId]);
    expect(mocks.itemUpdates[0]).toMatchObject({
      id: itemId,
      stockLevels: [
        { location: locationId, minimumQuantity: 5 },
        { location: destinationLocationId, minimumQuantity: 3 },
        { location: inactiveLocationId, minimumQuantity: 2 },
      ],
    });
    mocks.itemUpdates[0].stockLevels.forEach((stockLevel) => {
      expect(stockLevel).not.toHaveProperty("currentQuantity");
    });
  });

  it("submits transfers with canonical source and destination fields", async () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view", "inventory.manage"],
    };

    render(<InventoryManagementPage showPageHeader={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Add movement" }));
    fireEvent.change(screen.getByLabelText("movementForm.item"), {
      target: { value: itemId },
    });
    fireEvent.change(screen.getByLabelText("movementForm.type"), {
      target: { value: "transfer" },
    });
    fireEvent.change(screen.getByLabelText("movementForm.destination"), {
      target: { value: destinationLocationId },
    });
    fireEvent.change(screen.getByLabelText("movementForm.quantity"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "movementForm.save" }));

    await waitFor(() => expect(mocks.movementCreates).toHaveLength(1));
    expect(mocks.movementCreates[0]).toMatchObject({
      item: itemId,
      type: "transfer",
      reason: "transfer",
      location: locationId,
      destinationLocation: destinationLocationId,
      quantity: 4,
    });
    expect(mocks.movementCreates[0]).not.toHaveProperty("locationId");
    expect(mocks.movementCreates[0]).not.toHaveProperty(
      "destinationLocationId",
    );
  });

  it("requests the next item page from the compact pagination controls", async () => {
    mocks.itemTotal = 26;

    render(<InventoryManagementPage showPageHeader={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(
        mocks.itemQueries.some(
          (params) => params.lowStock !== true && params.page === 2,
        ),
      ).toBe(true),
    );
  });

  it("offers only valid lifecycle transitions for an ordered reorder", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view", "inventory.manage"],
    };
    mocks.reorders.push({
      _id: "64b000000000000000000031",
      item: { _id: itemId, name: "Stoneware" },
      location: locationId,
      requestedQuantity: 10,
      currentQuantity: 2,
      priority: "medium",
      status: "ordered",
    });

    render(<InventoryManagementPage showPageHeader={false} />);
    fireEvent.click(screen.getByRole("tab", { name: "Reorders" }));

    const status = screen.getByLabelText("Reorder status for Stoneware");
    expect(Array.from(status.options, (option) => option.value)).toEqual([
      "ordered",
      "received",
      "cancelled",
    ]);
  });

  it("labels inactive suppliers but excludes them from a new item selector", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view", "inventory.manage"],
    };
    mocks.suppliers.push(
      { _id: "supplier-active", name: "Active supplier", isActive: true },
      { _id: "supplier-inactive", name: "Legacy supplier", isActive: false },
    );

    render(<InventoryManagementPage showPageHeader={false} />);

    fireEvent.click(screen.getByRole("button", { name: "New item" }));
    const supplierSelect = screen.getByLabelText("itemForm.supplier");
    expect(
      Array.from(supplierSelect.options, (option) => option.value),
    ).toContain("supplier-active");
    expect(
      Array.from(supplierSelect.options, (option) => option.value),
    ).not.toContain("supplier-inactive");

    fireEvent.click(screen.getByRole("button", { name: "actions.close" }));
    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));
    expect(screen.getByText("suppliers.inactive")).toBeInTheDocument();
  });

  it("keeps guided stock inputs controlled when locations arrive after the modal opens", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["inventory.view", "inventory.manage"],
    };
    mocks.guided = true;
    mocks.searchParams = new URLSearchParams(
      "action=create&setupStep=inventory",
    );
    mocks.locations = [];
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const { rerender } = render(
        <InventoryManagementPage showPageHeader={false} />,
      );

      mocks.locations = [
        {
          _id: locationId,
          name: "Grohova",
          isPrimary: true,
          isActive: true,
        },
      ];
      rerender(<InventoryManagementPage showPageHeader={false} />);

      fireEvent.click(screen.getByRole("checkbox", { name: "Grohova" }));
      const openingQuantity = screen.getByLabelText("itemForm.openingQuantity");
      fireEvent.change(openingQuantity, { target: { value: "12" } });

      expect(openingQuantity).toHaveValue(12);
      expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(
        /changing an uncontrolled input to be controlled/i,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
