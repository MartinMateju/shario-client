import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomersWorkspace, {
  getCustomersWorkspaceCapabilities,
} from "@/components/customers/CustomersWorkspace";
import { PERMISSIONS } from "@/config/permissions";

const testContext = vi.hoisted(() => ({
  state: {
    tenant: { modules: {} },
    workspaceAccess: { role: "owner", status: "active" },
  },
  profileProps: null,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(testContext.state),
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      values.name ? `${key}:${values.name}` : key,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: (state) => state.workspaceAccess,
}));

vi.mock("@/components/tables/UsersAndStaffTable", () => ({
  default: (props) => (
    <div>
      {props.onAddCustomer ? (
        <button type="button" onClick={props.onAddCustomer}>
          Create customer
        </button>
      ) : null}
      <button
        type="button"
        onClick={() =>
          props.onOpenCustomer({ id: "customer-1", firstname: "Ada" })
        }
      >
        Open profile
      </button>
      {props.onMessageCustomer ? (
        <button
          type="button"
          onClick={() =>
            props.onMessageCustomer({
              id: "customer-1",
              firstname: "Ada",
              phone: "+420700111222",
            })
          }
        >
          Message customer
        </button>
      ) : null}
      {props.onAddCredits ? (
        <button
          type="button"
          onClick={() =>
            props.onAddCredits({ id: "customer-1", firstname: "Ada" })
          }
        >
          Grant credits
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/components/customers/CustomerProfileDialog", () => ({
  default: (props) => {
    testContext.profileProps = props;
    if (!props.open) return null;

    return (
      <div data-testid="customer-profile">
        {props.permissions.canMessage ? (
          <button type="button" onClick={() => props.onMessage(props.customer)}>
            Profile message
          </button>
        ) : null}
        {props.permissions.canGrantCredits ? (
          <button
            type="button"
            onClick={() => props.onGrantCredits(props.customer)}
          >
            Profile credits
          </button>
        ) : null}
        {props.permissions.canManageMemberships ? (
          <>
            <button
              type="button"
              onClick={() => props.onAssignMembership(props.customer)}
            >
              Profile membership
            </button>
            <button
              type="button"
              onClick={() => props.onCancelMembership({ id: "membership-1" })}
            >
              Cancel membership
            </button>
          </>
        ) : null}
      </div>
    );
  },
}));

vi.mock("@/components/customers/CustomerActionDialogs", () => ({
  CreateCustomerDialog: ({ open, onCreated }) =>
    open ? (
      <button type="button" onClick={() => onCreated({ id: "customer-2" })}>
        Complete creation
      </button>
    ) : null,
  GrantCreditsDialog: ({ open }) =>
    open ? <div data-testid="credits-dialog" /> : null,
  AssignMembershipDialog: ({ open }) =>
    open ? <div data-testid="membership-dialog" /> : null,
  CancelMembershipDialog: ({ open }) =>
    open ? <div data-testid="membership-cancel-dialog" /> : null,
}));

describe("CustomersWorkspace", () => {
  beforeEach(() => {
    testContext.state = {
      tenant: { modules: {} },
      workspaceAccess: { role: "owner", status: "active" },
    };
    testContext.profileProps = null;
  });

  it("wires every customer action for a workspace owner", () => {
    render(<CustomersWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "Create customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete creation" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "notices.customerCreated",
    );

    expect(
      screen.queryByRole("button", { name: "Message customer" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
    expect(screen.getByTestId("customer-profile")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Profile credits" }));
    expect(screen.getByTestId("credits-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Profile membership" }));
    expect(screen.getByTestId("membership-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel membership" }));
    expect(screen.getByTestId("membership-cancel-dialog")).toBeInTheDocument();
  });

  it("keeps the profile read-only when only customer and booking view are granted", () => {
    testContext.state.workspaceAccess = {
      role: "viewer",
      status: "active",
      effectivePermissions: [
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.BOOKINGS_VIEW,
      ],
    };

    render(<CustomersWorkspace />);

    expect(
      screen.queryByRole("button", { name: "Create customer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Message customer" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Grant credits" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open profile" }));
    expect(testContext.profileProps.permissions).toMatchObject({
      canViewBookings: true,
      canViewCredits: false,
      canViewMemberships: false,
      canGrantCredits: false,
      canManageMemberships: false,
    });
  });

  it("suppresses actions belonging to disabled workspace modules", () => {
    const capabilities = getCustomersWorkspaceCapabilities({
      tenant: {
        modules: {
          bookings: false,
          credits: false,
          memberships: false,
          communications: false,
        },
      },
      workspaceAccess: { role: "owner", status: "active" },
    });

    expect(capabilities).toEqual({
      canCreate: true,
      canViewBookings: false,
      canViewCredits: false,
      canGrantCredits: false,
      canViewMemberships: false,
      canManageMemberships: false,
    });
  });
});
