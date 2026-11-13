import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: { user: { _id: "owner-1", isOwner: true } },
  users: [],
  usersQuery: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: (state) => state.user,
}));
vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useGetUsersQuery: (...args) => {
    mocks.usersQuery(...args);
    return { data: mocks.users, isFetching: false, isError: false };
  },
}));
vi.mock("@/lib/features/lecturers/lecturersApiSlice", () => ({
  useGetAllLecturersQuery: () => ({ data: [] }),
  useDeleteLecturerMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock("@/components/forms/lecturers/NewLecturerForm", () => ({
  default: () => null,
}));
vi.mock("@/components/modals/AlertModal", () => ({ default: () => null }));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));
vi.mock("@/components/modals/ErrorModal", () => ({ default: () => null }));
vi.mock("@/components/modals/ResponsiveModal", () => ({ default: () => null }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

import UsersAndStaffTable from "@/components/tables/UsersAndStaffTable";

const customer = {
  id: "customer-with-metrics",
  firstname: "Metric",
  lastname: "Customer",
  email: "metric@example.test",
  lastBookingAt: "2025-01-02T12:00:00.000Z",
  totalSpentByCurrency: [{ currency: "EUR", amountMinor: 12345 }],
  totalSpent: 123.45,
  totalSpentCurrency: "EUR",
};

function renderDirectory() {
  return render(
    <UsersAndStaffTable
      showStaff={false}
      showInsights={false}
      showCreateButton={false}
    />,
  );
}

describe("customer directory API metric wiring", () => {
  beforeEach(() => {
    mocks.usersQuery.mockClear();
    mocks.users = [customer];
  });

  it("preserves GET /users metrics through the real directory table on desktop and mobile", () => {
    const { container } = renderDirectory();
    expect(mocks.usersQuery).toHaveBeenCalledWith(
      { userId: "owner-1", tenantRole: "customer" },
      { skip: false, refetchOnMountOrArgChange: true },
    );
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent("Jan 2, 2025");
    expect(cells[6]).toHaveTextContent(/^€123\.45$/);
    const mobile = container.querySelector("article dl").closest("article");
    expect(
      within(mobile).getByText("columns.totalSpent").nextElementSibling,
    ).toHaveTextContent(/^€123\.45$/);
  });

  it("keeps metrics through pagination and customer search without fetching each customer's history", () => {
    mocks.users = [
      ...Array.from({ length: 10 }, (_, index) => ({
        id: `customer-${index}`,
        firstname: `Other${index}`,
        lastname: "Customer",
        lastBookingAt: null,
        totalSpentByCurrency: [],
        totalSpent: 0,
        totalSpentCurrency: "CZK",
      })),
      customer,
    ];
    renderDirectory();
    expect(screen.queryByText("€123.45")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(screen.getAllByText("€123.45")).toHaveLength(2);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "metric@example.test" },
    });
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    const cells = within(rows[1]).getAllByRole("cell");
    expect(cells[5]).toHaveTextContent("Jan 2, 2025");
    expect(cells[6]).toHaveTextContent(/^€123\.45$/);
    expect(
      screen.getByRole("button", { name: "pagination.previous" }),
    ).toBeDisabled();
    expect(
      mocks.usersQuery.mock.calls.every(
        ([args]) => args.tenantRole === "customer" && !args.locationId,
      ),
    ).toBe(true);
  });

  it("passes the filtered metrics to CSV export without relabeling currencies", async () => {
    mocks.users = {
      users: [
        customer,
        {
          ...customer,
          id: "hidden",
          firstname: "Hidden",
          email: "hidden@example.test",
          totalSpentByCurrency: null,
        },
      ],
    };
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    renderDirectory();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "metric@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "actions.export" }));
    const blob = createObjectURL.mock.calls.at(-1)[0];
    const csv = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(csv).toContain('"Jan 2, 2025",€123.45,');
    expect(csv).not.toContain("hidden@example.test");
  });
});
