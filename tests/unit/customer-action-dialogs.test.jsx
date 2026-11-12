import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AssignMembershipDialog,
  CancelMembershipDialog,
  CreateCustomerDialog,
  GrantCreditsDialog,
} from "@/components/customers/CustomerActionDialogs";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  grant: vi.fn(),
  assign: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("next-intl", () => ({ useLocale: () => "en" }));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({ tenant: { settings: { currency: "CZK" } } }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ open, children }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
}));

vi.mock("@/components/dashboard/WorkspaceDialogSurface", () => ({
  WorkspaceDialogBackdrop: () => null,
  WorkspaceDialogViewport: ({ children }) => <div>{children}</div>,
  WorkspaceDialogPanel: ({ children }) => <section>{children}</section>,
}));

vi.mock("@/components/dashboard/WorkspaceFormSurface", () => ({
  WorkspaceFormActions: ({ children }) => <footer>{children}</footer>,
  WorkspaceFormSection: ({ title, description, children }) => (
    <section>
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
  workspaceInputClass: "input",
  workspaceLabelClass: "label",
  workspacePrimaryButtonClass: "primary",
  workspaceSecondaryButtonClass: "secondary",
  workspaceTextareaClass: "textarea",
}));

vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useAddNewUserMutation: () => [mocks.create, { isLoading: false }],
}));

vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useAdminGrantCreditsMutation: () => [mocks.grant, { isLoading: false }],
  useGetCreditBalanceQuery: () => ({
    data: { balance: 100, currency: "CZK" },
    isLoading: false,
  }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: { locations: [{ id: "location-1", name: "Main studio" }] },
    isLoading: false,
  }),
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetAllMembershipPlansQuery: () => ({
    data: {
      plans: [
        {
          id: "plan-1",
          status: "published",
          publishedVersion: {
            id: "version-1",
            name: "Monthly studio",
            prices: [{ currency: "CZK", amountMinor: 10_000 }],
            locationScope: {
              type: "selected",
              locationIds: ["location-1"],
            },
          },
        },
      ],
    },
    isError: false,
    isLoading: false,
  }),
  useAssignMembershipToUserMutation: () => [mocks.assign, { isLoading: false }],
  useCancelManagedMembershipMutation: () => [
    mocks.cancel,
    { isLoading: false },
  ],
}));

const labels = {
  "create.firstname": "First name",
  "create.lastname": "Last name",
  "create.email": "Email address",
  "create.phone": "Phone number",
  "create.customId": "Member ID",
  "create.password": "Temporary password",
  "create.submit": "Add customer",
  "creditsDialog.amount": "Amount",
  "creditsDialog.reason": "Credit reason",
  "creditsDialog.submit": "Add credits",
  "membershipDialog.plan": "Membership plan",
  "membershipDialog.location": "Studio location",
  "membershipDialog.submit": "Assign membership",
  "membershipCancel.effective": "Effective date",
  "membershipCancel.reason": "Cancellation reason",
  "membershipCancel.comment": "Internal comment",
  "membershipCancel.submit": "Cancel membership",
};

const t = (key) => labels[key] || key;
const customer = {
  id: "customer-1",
  firstname: "Ada",
  lastname: "Lovelace",
  email: "ada@example.com",
  phone: "+420700111222",
};

const successfulMutation = (result) => ({
  unwrap: vi.fn().mockResolvedValue(result),
});

describe("customer action dialogs", () => {
  beforeEach(() => {
    mocks.create.mockReset();
    mocks.grant.mockReset();
    mocks.assign.mockReset();
    mocks.cancel.mockReset();
    mocks.create.mockImplementation(() => successfulMutation({ id: "new" }));
    mocks.grant.mockImplementation(() => successfulMutation({ balance: 125 }));
    mocks.assign.mockImplementation(() =>
      successfulMutation({ id: "membership" }),
    );
    mocks.cancel.mockImplementation(() =>
      successfulMutation({ id: "membership" }),
    );
  });

  it("creates a customer with the exact API contract", async () => {
    const onCreated = vi.fn();
    render(
      <CreateCustomerDialog
        open
        onClose={vi.fn()}
        onCreated={onCreated}
        t={t}
      />,
    );

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: " Ada " },
    });
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: " Lovelace " },
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: " ADA@EXAMPLE.COM " },
    });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: " +420700111222 " },
    });
    expect(screen.queryByLabelText(/^Customer ID/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Temporary password/), {
      target: { value: "password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add customer" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        firstname: "Ada",
        lastname: "Lovelace",
        email: "ada@example.com",
        phone: "+420700111222",
        password: "password-123",
      }),
    );
    expect(onCreated).toHaveBeenCalledWith({ id: "new" });
  });

  it("grants credits once with a reason and idempotency key", async () => {
    render(
      <GrantCreditsDialog
        open
        customer={customer}
        onClose={vi.fn()}
        onGranted={vi.fn()}
        t={t}
      />,
    );

    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/^Credit reason/), {
      target: { value: " Welcome credit " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));

    await waitFor(() => expect(mocks.grant).toHaveBeenCalledOnce());
    expect(mocks.grant.mock.calls[0][0]).toEqual({
      targetUserId: "customer-1",
      amount: 25,
      reason: "Welcome credit",
      idempotencyKey: expect.stringMatching(/^credit-grant-/),
    });
  });

  it("keeps the same grant key when retrying after a network failure", async () => {
    mocks.grant.mockImplementationOnce(() => ({
      unwrap: vi.fn().mockRejectedValue({
        status: "FETCH_ERROR",
        error: "Failed to fetch",
      }),
    }));
    const onGranted = vi.fn();
    render(
      <GrantCreditsDialog
        open
        customer={customer}
        onClose={vi.fn()}
        onGranted={onGranted}
        t={t}
      />,
    );
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "3400" },
    });
    fireEvent.change(screen.getByLabelText(/^Credit reason/), {
      target: { value: "1x poukaz glazování a 1x točení" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    await screen.findByRole("alert");
    expect(onGranted).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    await waitFor(() => expect(onGranted).toHaveBeenCalledOnce());
    expect(mocks.grant).toHaveBeenCalledTimes(2);
    expect(mocks.grant.mock.calls[1][0]).toEqual(mocks.grant.mock.calls[0][0]);
  });

  it("uses a different key for a newly opened credit grant", async () => {
    const props = {
      open: true,
      customer,
      onClose: vi.fn(),
      onGranted: vi.fn(),
      t,
    };
    const submitGrant = () => {
      fireEvent.change(screen.getByLabelText("Amount"), {
        target: { value: "25" },
      });
      fireEvent.change(screen.getByLabelText(/^Credit reason/), {
        target: { value: "Welcome credit" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    };
    const first = render(<GrantCreditsDialog {...props} />);
    submitGrant();
    await waitFor(() => expect(props.onGranted).toHaveBeenCalledOnce());
    first.unmount();

    render(<GrantCreditsDialog {...props} />);
    submitGrant();
    await waitFor(() => expect(props.onGranted).toHaveBeenCalledTimes(2));
    const firstKey = mocks.grant.mock.calls[0][0].idempotencyKey;
    const nextKey = mocks.grant.mock.calls[1][0].idempotencyKey;
    expect(firstKey).toMatch(/^[A-Za-z0-9._:-]{8,160}$/);
    expect(nextKey).toMatch(/^[A-Za-z0-9._:-]{8,160}$/);
    expect(nextKey).not.toBe(firstKey);
  });

  it("assigns a published membership version in the selected location", async () => {
    render(
      <AssignMembershipDialog
        open
        customer={customer}
        onClose={vi.fn()}
        onAssigned={vi.fn()}
        t={t}
      />,
    );

    fireEvent.change(screen.getByLabelText("Membership plan"), {
      target: { value: "plan-1" },
    });
    fireEvent.change(screen.getByLabelText("Studio location"), {
      target: { value: "location-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Assign membership" }));

    await waitFor(() => expect(mocks.assign).toHaveBeenCalledOnce());
    expect(mocks.assign.mock.calls[0][0]).toEqual({
      userId: "customer-1",
      planId: "plan-1",
      planVersionId: "version-1",
      currency: "CZK",
      locationId: "location-1",
      reason: "paid_offline",
      note: "",
      autoRenew: false,
    });
  });

  it("cancels a membership with the selected timing and audit detail", async () => {
    render(
      <CancelMembershipDialog
        open
        membership={{ id: "membership-1" }}
        onClose={vi.fn()}
        onCancelled={vi.fn()}
        t={t}
      />,
    );

    fireEvent.change(screen.getByLabelText("Effective date"), {
      target: { value: "immediate" },
    });
    fireEvent.change(screen.getByLabelText("Cancellation reason"), {
      target: { value: "moving" },
    });
    fireEvent.change(screen.getByLabelText("Internal comment"), {
      target: { value: " Relocated " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel membership" }));

    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledOnce());
    expect(mocks.cancel).toHaveBeenCalledWith({
      id: "membership-1",
      effective: "immediate",
      reason: "moving",
      comment: "Relocated",
    });
  });
});
