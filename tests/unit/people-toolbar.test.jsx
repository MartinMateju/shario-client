import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PeopleToolbar from "@/components/tables/people/PeopleToolbar";
import messages from "@/messages/en.json";

vi.mock("@/components/dashboard/WorkspaceDataSurface", () => ({
  WorkspaceToolbar: ({ children }) => <div>{children}</div>,
}));

const labels = {
  "actions.export": "Export",
  "filters.allMemberships": "All memberships",
  "filters.allStatuses": "All statuses",
  "filters.button": "Filters",
  "filters.clear": "Clear filters",
  "filters.customerSearchPlaceholder": "Search customers",
  "filters.membership": "Membership",
  "filters.searchLabel": "Search",
  "filters.status": "Status",
  "membership.none": "None",
  "status.active": "Active",
  "status.inactive": "Inactive",
  "status.invited": "Invited",
};

const t = (key, values = {}) => {
  const message =
    labels[key] ||
    key.split(".").reduce((value, part) => value?.[part], messages.People) ||
    key;
  return Object.entries(values).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, replacement),
    message,
  );
};

const buildProps = (overrides = {}) => ({
  activeTab: "customers",
  search: "",
  status: "",
  membership: "",
  role: "",
  membershipOptions: [{ value: "clay-club", label: "Clay Club" }],
  roleOptions: [],
  activeFilterCount: 0,
  total: 3,
  t,
  onSearchChange: vi.fn(),
  onStatusChange: vi.fn(),
  onMembershipChange: vi.fn(),
  onRoleChange: vi.fn(),
  onClearFilters: vi.fn(),
  onExport: vi.fn(),
  financialFilters: {},
  onFinancialFilterChange: vi.fn(),
  onApplyFinancialFilters: vi.fn(),
  ...overrides,
});

describe("PeopleToolbar filters", () => {
  it("opens the filter controls from the Filters button", async () => {
    const user = userEvent.setup();
    const props = buildProps();

    render(<PeopleToolbar {...props} />);

    expect(
      screen.queryByRole("combobox", { name: "Membership" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filters" }));

    const membership = screen.getByRole("combobox", { name: "Membership" });
    const status = screen.getByRole("combobox", { name: "Status" });

    await user.selectOptions(membership, "clay-club");
    await user.selectOptions(status, "inactive");

    expect(props.onMembershipChange).toHaveBeenCalledWith("clay-club");
    expect(props.onStatusChange).toHaveBeenCalledWith("inactive");
  });

  it("shows active filters and lets the user clear them", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();

    render(
      <PeopleToolbar
        {...buildProps({
          activeFilterCount: 1,
          membership: "clay-club",
          onClearFilters,
        })}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Membership" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("keeps financial edits as drafts until Apply and preserves zero, signed decimals and dates", async () => {
    const user = userEvent.setup();
    const props = buildProps({ financialFiltersDirty: true });
    render(<PeopleToolbar {...props} />);

    expect(
      screen.getByRole("group", { name: "Spending (CZK)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Current credits (CZK)" }),
    ).toBeInTheDocument();
    const minimum = screen.getByRole("textbox", { name: "Minimum spent" });
    expect(minimum).toHaveAttribute("inputmode", "decimal");
    fireEvent.change(minimum, { target: { value: "0" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Minimum credits" }), {
      target: { value: "-12,50" },
    });
    fireEvent.change(screen.getByLabelText("Payment date from"), {
      target: { value: "2026-10-01" },
    });

    expect(props.onFinancialFilterChange.mock.calls).toEqual([
      ["spendMin", "0"],
      ["creditMin", "-12,50"],
      ["spendFrom", "2026-10-01"],
    ]);
    expect(props.onApplyFinancialFilters).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Changes apply when you select Apply.",
    );
    await user.click(
      screen.getByRole("button", { name: "Apply financial filters" }),
    );
    expect(props.onApplyFinancialFilters).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(props.onClearFilters).toHaveBeenCalledOnce();
  });

  it("does not apply unchanged drafts and connects validation messages to invalid fields", () => {
    const props = buildProps({ activeFilterCount: 1 });
    const { rerender } = render(<PeopleToolbar {...props} />);
    expect(
      screen.getByRole("button", { name: "Apply financial filters" }),
    ).toBeDisabled();

    rerender(
      <PeopleToolbar
        {...props}
        financialFiltersDirty
        financialFilterErrors={{
          spendMin: "Enter a valid amount.",
          dateRange: "The start date must not be after the end date.",
          creditRange: "Minimum credits must not exceed maximum credits.",
        }}
      />,
    );

    const minimum = screen.getByRole("textbox", { name: "Minimum spent" });
    expect(minimum).toHaveAttribute("aria-invalid", "true");
    expect(minimum).toHaveAccessibleDescription("Enter a valid amount.");
    expect(
      screen.getByLabelText("Payment date from"),
    ).toHaveAccessibleDescription(
      "The start date must not be after the end date.",
    );
    expect(screen.getByLabelText("Payment date to")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: "Minimum credits" }),
    ).toHaveAccessibleDescription(
      "Minimum credits must not exceed maximum credits.",
    );
    expect(
      screen.getByRole("button", { name: "Apply financial filters" }),
    ).toBeDisabled();
  });

  it("keeps current credit filters usable when spending visibility is unavailable", async () => {
    const user = userEvent.setup();
    const props = buildProps({
      financialFiltersDirty: true,
      spendingAvailable: false,
      currency: "EUR",
    });
    render(<PeopleToolbar {...props} />);

    expect(
      screen.getByRole("group", { name: "Current credits (EUR)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Spending filters require access to all financial records.",
      ),
    ).toBeInTheDocument();
    for (const name of [
      "Minimum spent",
      "Maximum spent",
      "Payment date from",
      "Payment date to",
    ]) {
      expect(screen.getByLabelText(name)).toBeDisabled();
    }
    expect(
      screen.getByRole("textbox", { name: "Minimum credits" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("textbox", { name: "Maximum credits" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "Apply financial filters" }),
    );
    expect(props.onApplyFinancialFilters).toHaveBeenCalledOnce();
  });

  it("disables financial inputs and Apply while metadata is loading", () => {
    render(
      <PeopleToolbar
        {...buildProps({
          financialFiltersDirty: true,
          financialFiltersLoading: true,
        })}
      />,
    );
    for (const name of [
      "Minimum spent",
      "Maximum spent",
      "Payment date from",
      "Payment date to",
      "Minimum credits",
      "Maximum credits",
    ]) {
      expect(screen.getByLabelText(name)).toBeDisabled();
    }
    expect(
      screen.getByRole("button", { name: "Apply financial filters" }),
    ).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeEnabled();
  });

  it("keeps customer financial filters out of the team view", () => {
    render(
      <PeopleToolbar
        {...buildProps({ activeTab: "staff", activeFilterCount: 1 })}
      />,
    );
    expect(
      screen.queryByRole("group", { name: "Spending (CZK)" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Apply financial filters" }),
    ).not.toBeInTheDocument();
  });
});
