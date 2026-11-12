import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PeopleToolbar from "@/components/tables/people/PeopleToolbar";

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

const t = (key) => labels[key] || key;

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
});
