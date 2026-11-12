import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CustomerProfileDialog from "@/components/customers/CustomerProfileDialog";

const mocks = vi.hoisted(() => ({
  customerHook: vi.fn(),
  bookingHook: vi.fn(),
  balanceHook: vi.fn(),
  transactionsHook: vi.fn(),
  membershipsHook: vi.fn(),
  customerResult: null,
  bookingResult: null,
  balanceResult: null,
  transactionsResult: null,
  membershipsResult: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ open, children, ...props }) =>
    open ? (
      <div role="dialog" {...props}>
        {children}
      </div>
    ) : null,
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
}));

vi.mock("@/components/dashboard/WorkspaceDialogSurface", () => ({
  WorkspaceDialogBackdrop: () => <div data-testid="dialog-backdrop" />,
  WorkspaceDialogViewport: ({ children }) => <div>{children}</div>,
  WorkspaceDialogPanel: ({ children }) => <section>{children}</section>,
}));

vi.mock("@/components/dashboard/WorkspaceTabs", () => ({
  default: ({ id, tabs, value, onChange, ariaLabel }) => (
    <div role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${id}-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
  WorkspaceTabPanel: ({ active, unmount, tabId, children }) =>
    unmount && !active ? null : (
      <div role="tabpanel" data-tab-id={tabId} hidden={!active}>
        {children}
      </div>
    ),
}));

vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useGetCustomerQuery: (...args) => mocks.customerHook(...args),
}));

vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useGetCustomerBookingHistoryQuery: (...args) => mocks.bookingHook(...args),
}));

vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useGetCreditBalanceQuery: (...args) => mocks.balanceHook(...args),
  useGetCreditTransactionsQuery: (...args) => mocks.transactionsHook(...args),
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetUserMembershipsQuery: (...args) => mocks.membershipsHook(...args),
}));

const labels = {
  "actions.addCredits": "Add credits",
  "actions.message": "Message",
  "profile.actions.assignMembership": "Assign membership",
  "profile.actions.cancelMembership": "Cancel membership",
  "profile.close": "Close profile",
  "profile.next": "Next",
  "profile.previous": "Previous",
  "profile.tabs.bookings": "Bookings",
  "profile.tabs.credits": "Credits",
  "profile.tabs.label": "Customer profile",
  "profile.tabs.memberships": "Memberships",
  "profile.tabs.overview": "Overview",
};

const t = (key, values = {}) => {
  if (key.endsWith(".count")) return `${values.count} records`;
  if (key.endsWith(".guests")) return `${values.count} guests`;
  return labels[key] || key;
};

const idleQuery = (data) => ({
  data,
  error: null,
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
});

const rowCustomer = {
  id: "customer-1",
  firstname: "Row",
  lastname: "Customer",
  email: "row@example.com",
  status: "active",
};

const freshCustomer = {
  id: "customer-1",
  firstname: "Fresh",
  lastname: "Customer",
  email: "fresh@example.com",
  phoneNumber: "+420700111222",
  memberNumber: 234,
  customId: "C-1001",
  status: "active",
};

const allPermissions = {
  canViewBookings: true,
  canViewCredits: true,
  canViewMemberships: true,
  canMessage: true,
  canGrantCredits: true,
  canManageMemberships: true,
};

function renderDialog(overrides = {}) {
  const props = {
    open: true,
    customer: rowCustomer,
    scope: "all",
    permissions: allPermissions,
    onClose: vi.fn(),
    onMessage: vi.fn(),
    onGrantCredits: vi.fn(),
    onAssignMembership: vi.fn(),
    onCancelMembership: vi.fn(),
    t,
    ...overrides,
  };

  return { props, ...render(<CustomerProfileDialog {...props} />) };
}

describe("CustomerProfileDialog", () => {
  beforeEach(() => {
    mocks.customerResult = idleQuery(freshCustomer);
    mocks.bookingResult = idleQuery({
      bookings: [],
      currentPage: 1,
      totalCount: 0,
      totalPages: 1,
    });
    mocks.balanceResult = idleQuery({ balance: 0, currency: "CZK" });
    mocks.transactionsResult = idleQuery({
      transactions: [],
      pagination: { page: 1, totalCount: 0, totalPages: 1 },
    });
    mocks.membershipsResult = idleQuery({
      memberships: [],
      page: 1,
      total: 0,
      pages: 1,
    });

    mocks.customerHook.mockReset();
    mocks.bookingHook.mockReset();
    mocks.balanceHook.mockReset();
    mocks.transactionsHook.mockReset();
    mocks.membershipsHook.mockReset();
    mocks.customerHook.mockImplementation(() => mocks.customerResult);
    mocks.bookingHook.mockImplementation(() => mocks.bookingResult);
    mocks.balanceHook.mockImplementation(() => mocks.balanceResult);
    mocks.transactionsHook.mockImplementation(() => mocks.transactionsResult);
    mocks.membershipsHook.mockImplementation(() => mocks.membershipsResult);
  });

  it("uses the fresh profile DTO and passes it to quick actions", () => {
    const { props } = renderDialog();

    expect(
      screen.getByRole("heading", { name: "Fresh Customer" }),
    ).toBeVisible();
    expect(screen.getAllByText("fresh@example.com")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    expect(props.onGrantCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "customer-1",
        firstname: "Fresh",
        email: "fresh@example.com",
      }),
    );
  });

  it("shows inactive for disabled access even when the cached row said active", () => {
    mocks.customerResult = idleQuery({
      ...freshCustomer,
      isAccessGranted: false,
    });
    renderDialog();
    expect(screen.getAllByText("status.inactive").length).toBeGreaterThan(0);
    expect(screen.queryByText("status.active")).not.toBeInTheDocument();
  });

  it("shows an em dash instead of a legacy QR customer identifier", () => {
    mocks.customerResult = idleQuery({
      ...freshCustomer,
      customId: "C-1001",
      memberNumber: null,
    });

    renderDialog();

    expect(
      screen.getByText("profile.fields.customerId").parentElement,
    ).toHaveTextContent("profile.fields.customerId—");
    expect(screen.queryByText("C-1001")).not.toBeInTheDocument();
  });

  it("omits the retired messaging action while preserving other quick actions", () => {
    renderDialog();

    expect(
      screen.queryByRole("button", { name: "Message" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add credits" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Assign membership" }),
    ).toBeInTheDocument();
  });

  it("only exposes permitted tabs and keeps their queries skipped", () => {
    renderDialog({
      permissions: {
        canViewBookings: true,
        canViewCredits: false,
        canViewMemberships: false,
      },
    });

    expect(screen.getByRole("tab", { name: "Overview" })).toBeVisible();
    expect(screen.getByText("#234")).toBeVisible();
    expect(screen.queryByText("C-1001")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Bookings" })).toBeVisible();
    expect(
      screen.queryByRole("tab", { name: "Credits" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Memberships" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Message" }),
    ).not.toBeInTheDocument();

    expect(mocks.bookingHook).toHaveBeenLastCalledWith(
      expect.objectContaining({ customerId: "customer-1", page: 1 }),
      { skip: true },
    );
    expect(mocks.balanceHook).toHaveBeenLastCalledWith("customer-1", {
      skip: true,
    });
    expect(mocks.membershipsHook).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: "customer-1" }),
      { skip: true },
    );
  });

  it("loads and paginates booking history only after its tab is selected", () => {
    mocks.bookingResult = idleQuery({
      bookings: [
        {
          id: "booking-1",
          productName: "Morning Pilates",
          startsAt: "2026-08-03T08:00:00.000Z",
          status: "confirmed",
          participantCount: 3,
        },
      ],
      currentPage: 1,
      totalCount: 9,
      totalPages: 2,
    });

    renderDialog();
    expect(mocks.bookingHook).toHaveBeenLastCalledWith(
      { customerId: "customer-1", scope: "all", page: 1, limit: 8 },
      { skip: true },
    );

    fireEvent.click(screen.getByRole("tab", { name: "Bookings" }));
    expect(screen.getByText("Morning Pilates")).toBeVisible();
    expect(screen.getByText("3 guests")).toBeVisible();
    expect(mocks.bookingHook).toHaveBeenLastCalledWith(
      { customerId: "customer-1", scope: "all", page: 1, limit: 8 },
      { skip: false },
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(mocks.bookingHook).toHaveBeenLastCalledWith(
      { customerId: "customer-1", scope: "all", page: 2, limit: 8 },
      { skip: false },
    );
  });

  it("renders credit balance and transactions with a permission-gated grant action", () => {
    mocks.balanceResult = idleQuery({ balance: 1250, currency: "CZK" });
    mocks.transactionsResult = idleQuery({
      transactions: [
        {
          id: "transaction-1",
          amount: 250,
          currency: "CZK",
          description: "Welcome credit",
          createdAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      pagination: { page: 1, totalCount: 1, totalPages: 1 },
    });
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Credits" }));

    expect(screen.getByText("Welcome credit")).toBeVisible();
    expect(screen.getByText(/1[,.\s]250/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Add credits" }));
    expect(props.onGrantCredits).toHaveBeenCalledWith(
      expect.objectContaining({ id: "customer-1", firstname: "Fresh" }),
    );
    expect(mocks.transactionsHook).toHaveBeenLastCalledWith(
      { userId: "customer-1", page: 1, limit: 8 },
      { skip: false },
    );
  });

  it("supports assigning and cancelling a membership from membership history", () => {
    const membership = {
      id: "membership-1",
      name: "Unlimited Monthly",
      status: "active",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    };
    mocks.membershipsResult = idleQuery({
      memberships: [membership],
      page: 1,
      total: 1,
      pages: 1,
    });
    const { props } = renderDialog();

    fireEvent.click(screen.getByRole("tab", { name: "Memberships" }));

    expect(screen.getByText("Unlimited Monthly")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Assign membership" }));
    expect(props.onAssignMembership).toHaveBeenCalledWith(
      expect.objectContaining({ id: "customer-1", firstname: "Fresh" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel membership" }));
    expect(props.onCancelMembership).toHaveBeenCalledWith(membership);
    expect(mocks.membershipsHook).toHaveBeenLastCalledWith(
      { userId: "customer-1", page: 1, limit: 8 },
      { skip: false },
    );
  });
});
