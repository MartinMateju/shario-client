import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {
    tenant: { modules: {} },
    workspaceAccess: { role: "owner", status: "active" },
  },
  tableProps: null,
  createProps: null,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: (state) => state.workspaceAccess,
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: {
    BOOKINGS_VIEW: "bookings:view",
    COMMUNICATIONS_MANAGE: "communications:manage",
    COMMUNICATIONS_SEND: "communications:send",
    CREDITS_MANAGE: "credits:manage",
    CREDITS_VIEW: "credits:view",
    CUSTOMERS_MANAGE: "customers:manage",
    MEMBERSHIPS_MANAGE: "memberships:manage",
    MEMBERSHIPS_VIEW: "memberships:view",
  },
  hasPermission: () => true,
}));

vi.mock("@/components/tables/UsersAndStaffTable", () => ({
  default: (props) => {
    mocks.tableProps = props;

    return (
      <div data-testid="customers-table">
        <button type="button" onClick={props.onAddCustomer}>
          Create customer
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/customers/CustomerProfileDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/customers/CustomerActionDialogs", () => ({
  CreateCustomerDialog: (props) => {
    mocks.createProps = props;
    return props.open ? <div data-testid="create-customer" /> : null;
  },
  GrantCreditsDialog: () => null,
  AssignMembershipDialog: () => null,
  CancelMembershipDialog: () => null,
}));

vi.mock("@/components/customers/customers.utils", () => ({
  getCustomerName: () => "Ada",
}));

import CustomersWorkspace from "@/components/customers/CustomersWorkspace";

describe("CustomersWorkspace organization scope", () => {
  beforeEach(() => {
    mocks.tableProps = null;
    mocks.createProps = null;
  });

  it("renders without an active studio and does not pass a location", () => {
    render(<CustomersWorkspace />);

    expect(screen.getByTestId("customers-table")).toBeInTheDocument();
    expect(mocks.tableProps).toMatchObject({
      showInsights: false,
      showStaff: false,
    });
    expect(mocks.tableProps).not.toHaveProperty("customerLocationId");
    expect(mocks.tableProps).not.toHaveProperty("requireCustomerLocation");

    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));

    expect(screen.getByTestId("create-customer")).toBeInTheDocument();
    expect(mocks.createProps).not.toHaveProperty("locationId");
  });
});
