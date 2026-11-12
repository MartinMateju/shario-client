import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("react-redux", () => ({
  useSelector: () => ({
    role: "owner",
    status: "active",
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children }) => children,
}));

vi.mock("@/components/tables/BookingsTable", () => ({
  default: ({
    showPageHeader,
    showCreateButton,
    requestedBookingId,
    onBookingContextChange,
  }) => (
    <div
      data-testid="bookings-table"
      data-show-page-header={String(showPageHeader)}
      data-show-create-button={String(showCreateButton)}
      data-requested-booking-id={requestedBookingId}
    >
      <button
        type="button"
        onClick={() => onBookingContextChange("507f1f77bcf86cd799439011")}
      >
        Open booking
      </button>
      <button type="button" onClick={() => onBookingContextChange("")}>
        Close booking
      </button>
    </div>
  ),
}));

import TenantBookingsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/bookings/page";

describe("TenantBookingsPage presentation", () => {
  beforeEach(() => {
    mocks.search = "";
    mocks.replace.mockReset();
  });

  it("delegates the title and primary action to the persistent topbar", () => {
    render(<TenantBookingsPage />);

    const table = screen.getByTestId("bookings-table");

    expect(table).toHaveAttribute("data-show-page-header", "false");
    expect(table).toHaveAttribute("data-show-create-button", "false");
  });

  it("redirects old booking links directly to the editor even when absent from the current table page", async () => {
    mocks.search = "view=all&bookingId=507f1f77bcf86cd799439011";
    render(<TenantBookingsPage />);
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/app/bookings/507f1f77bcf86cd799439011/edit",
        { scroll: false },
      ),
    );
    expect(screen.queryByTestId("bookings-table")).not.toBeInTheDocument();
  });

  it("redirects the legacy create query to the full-page composer and preserves prefill", async () => {
    mocks.search =
      "action=create&productId=product-1&locationId=location-1&setupStep=practice_booking";

    render(<TenantBookingsPage />);

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/app/bookings/new?productId=product-1&locationId=location-1&setupStep=practice_booking",
        { scroll: false },
      ),
    );
    expect(screen.queryByTestId("bookings-table")).not.toBeInTheDocument();
  });
});
