import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CatalogSectionTabs from "@/components/products/CatalogSectionTabs";
import ProductToolbar from "@/components/products/ProductToolbar";
import SalesToolbar from "@/components/sales/SalesToolbar";

const labels = {
  "sections.label": "Product and class categories",
  "toolbar.statusFiltersLabel": "Order status filters",
  "toolbar.searchLabel": "Search",
  "toolbar.searchPlaceholder": "Search…",
  "toolbar.filters": "Filters",
  "toolbar.statusLabel": "Status",
  "toolbar.tableView": "Table view",
  "toolbar.gridView": "Grid view",
  "toolbar.dateRangeLabel": "Date range",
  "toolbar.densityLabel": "Density",
  "toolbar.comfortable": "Comfortable",
  "toolbar.compact": "Compact",
  "sections.openStudio.label": "Open Studio",
  "sections.openStudio.description": "Bookable access",
  "sections.classes.label": "Classes",
  "sections.classes.description": "Scheduled sessions",
  "sections.memberships.label": "Memberships",
  "sections.memberships.description": "Plans and members",
  "sections.vouchers.label": "Vouchers",
  "sections.vouchers.description": "Giftable credit",
  "sections.privateStudio.label": "Private Studio",
  "sections.privateStudio.description": "Internal only",
  "tabs.all": "All",
  "tabs.awaitingPayment": "Awaiting payment",
  "tabs.processing": "Processing",
  "tabs.completed": "Completed",
  "tabs.failed": "Failed",
};

const t = (key) => labels[key] || key;

describe("workspace filter rails", () => {
  it("exposes exactly five product families as accessible card tabs", () => {
    const onCategoryChange = vi.fn();

    render(
      <CatalogSectionTabs
        value="openStudio"
        counts={{
          openStudio: 4,
          classes: 2,
          memberships: 1,
          vouchers: 3,
          privateStudio: 1,
        }}
        onChange={onCategoryChange}
        t={t}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    const openStudio = screen.getByRole("tab", {
      name: /Open Studio/i,
    });
    const classes = screen.getByRole("tab", {
      name: /Classes/i,
    });

    expect(
      screen.getByRole("tablist", {
        name: "Product and class categories",
      }),
    ).toBeVisible();
    expect(tabs).toHaveLength(5);
    expect(openStudio).toHaveAttribute("aria-selected", "true");
    expect(classes).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /Private Studio/i })).toBeVisible();
    expect(screen.queryByText("Retail")).not.toBeInTheDocument();
    expect(screen.queryByText("Add-ons")).not.toBeInTheDocument();

    fireEvent.click(classes);
    expect(onCategoryChange).toHaveBeenCalledWith("classes");
  });

  it("keeps the compact filter disclosure mobile-only", () => {
    render(
      <ProductToolbar
        search=""
        onSearchChange={vi.fn()}
        status="all"
        onStatusChange={vi.fn()}
        view="table"
        onViewChange={vi.fn()}
        showFilters={false}
        onToggleFilters={vi.fn()}
        t={t}
      />,
    );

    expect(screen.getByRole("button", { name: "Filters" })).toHaveClass(
      "md:hidden",
    );
  });

  it("exposes order statuses as pressed filters rather than ARIA tabs", () => {
    const onStatusChange = vi.fn();

    render(
      <SalesToolbar
        activeStatus="processing"
        counts={{ all: 8, processing: 3 }}
        onStatusChange={onStatusChange}
        search=""
        onSearchChange={vi.fn()}
        filters={{
          dateRange: "30",
          dateFrom: "",
          dateTo: "",
          userCustomId: "",
          userEmail: "",
          productType: "",
        }}
        onFilterChange={vi.fn()}
        onResetFilters={vi.fn()}
        showFilters={false}
        onToggleFilters={vi.fn()}
        density="comfortable"
        onDensityChange={vi.fn()}
        selectedCount={0}
        t={t}
      />,
    );

    const group = screen.getByRole("group", {
      name: "Order status filters",
    });
    const processing = screen.getByRole("button", {
      name: /Processing\s*3/,
    });
    const failed = screen.getByRole("button", { name: /Failed\s*0/ });

    expect(group).toContainElement(processing);
    expect(processing).toHaveAttribute("aria-pressed", "true");
    expect(failed).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

    fireEvent.click(failed);
    expect(onStatusChange).toHaveBeenCalledWith("failed");
  });
});
