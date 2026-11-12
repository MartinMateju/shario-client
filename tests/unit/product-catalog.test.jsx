import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProductCatalog from "@/components/products/ProductCatalog";

const t = (key, values = {}) => {
  const labels = {
    "actions.open": `Open actions for ${values.name}`,
    "actions.toggleOnline": `Change online status for ${values.name}`,
    "actions.edit": "Edit product",
    "actions.delete": "Delete product",
    "actions.systemManaged": "Managed by shario.io",
    "actions.unavailable": "Missing product ID",
    "onlineStates.available": "Available",
    "onlineStates.hidden": "Hidden",
    "onlineStates.internal": "Internal only",
    "statuses.active": "Active",
    "statuses.draft": "Draft",
    "table.label": "Product catalog table",
    "types.openStudio": "Open Studio",
    "types.class": "Class",
    "types.privateStudio": "Private Studio",
    "types.other": "Legacy",
    "bookingModes.public": "Shared",
    "bookingModes.private": "Exclusive",
  };

  return labels[key] || key;
};

const baseProps = {
  view: "table",
  locale: "en",
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggle: vi.fn(),
  updatingId: "",
  canManage: true,
  t,
};

describe("ProductCatalog kind presentation and management safety", () => {
  it.each(["table", "grid"])(
    "exposes voucher codes on %s layouts independently from product editing",
    (view) => {
      const onManageCodes = vi.fn();
      const voucher = {
        id: "voucher-1",
        kind: "voucher",
        name: "Wheel course voucher",
        price: 1500,
      };
      render(
        <ProductCatalog
          {...baseProps}
          view={view}
          canManage={false}
          onManageCodes={onManageCodes}
          products={[
            voucher,
            { id: "class-1", kind: "class", name: "Wheel course", price: 1500 },
          ]}
        />,
      );
      const buttons = screen.getAllByRole("button", {
        name: "actions.manageCodes",
      });
      expect(buttons).toHaveLength(2);
      buttons.forEach((button) => fireEvent.click(button));
      expect(onManageCodes).toHaveBeenNthCalledWith(1, voucher);
      expect(onManageCodes).toHaveBeenNthCalledWith(2, voucher);
      expect(
        screen.queryByRole("button", { name: /Open actions for/ }),
      ).not.toBeInTheDocument();
    },
  );

  it("labels Open Studio mode and keeps id-less records read-only", () => {
    render(
      <ProductCatalog
        {...baseProps}
        products={[
          {
            id: "localized",
            name: { EN: "English product", CZ: "Český produkt" },
            kind: "open-studio",
            bookingMode: "public",
            price: 500,
          },
          {
            name: { EN: "Legacy draft", CZ: "Starší koncept" },
            type: "service",
            price: 200,
          },
        ]}
        locale="cs"
      />,
    );

    expect(screen.getAllByText("Open Studio")).not.toHaveLength(0);
    expect(screen.getAllByText("Shared")).not.toHaveLength(0);
    expect(
      screen.getAllByRole("button", {
        name: "Open actions for Český produkt",
      }),
    ).not.toHaveLength(0);
    expect(
      screen.queryByRole("button", {
        name: "Open actions for Starší koncept",
      }),
    ).toBeNull();
    expect(screen.getAllByText("Missing product ID")).not.toHaveLength(0);
  });

  it("never renders an online switch for internal Private Studio", () => {
    render(
      <ProductCatalog
        {...baseProps}
        products={[
          {
            id: "internal",
            name: "Kiln maintenance",
            kind: "private-studio",
            locationId: "location-a",
            isActive: true,
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Private Studio")).not.toHaveLength(0);
    expect(screen.getAllByText("Internal only")).not.toHaveLength(0);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(
      screen.getAllByRole("button", {
        name: "Open actions for Kiln maintenance",
      }),
    ).not.toHaveLength(0);
  });
});
