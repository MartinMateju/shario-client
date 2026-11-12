import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenant: null,
  sessionTenant: {},
  bookingCalls: [],
  bookings: [],
  language: "EN",
  refetch: vi.fn(),
  pagination: null,
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({ id: "customer-1" }),
  selectCurrentTenant: () => mocks.sessionTenant,
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => mocks.language,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    mocks.tenant ? { tenant: mocks.tenant } : null,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => ({ activeLocationId: "location-1" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetCustomerCatalogQuery: () => ({ data: [] }),
}));
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useGetUserBookingsQuery: (args, options) => {
    mocks.bookingCalls.push({ args, options });
    return {
      refetch: mocks.refetch,
      data: {
        bookings: mocks.bookings,
        pagination: mocks.pagination || {
          page: 1,
          limit: 20,
          totalCount: 0,
          totalPages: 1,
        },
      },
    };
  },
}));
vi.mock("@/components/sidebars/Drawer", () => ({ default: () => null }));

import MyBookingsTable from "@/components/tables/MyBookingsTable";

const withCalendar = (enabled) => ({
  publicSite: { customerPortal: { pages: { calendar: { enabled } } } },
});
const lifecycleLocationId = "507f1f77bcf86cd799439011";

describe("booking overview calendar shortcuts", () => {
  beforeEach(() => {
    mocks.tenant = null;
    mocks.sessionTenant = {};
    mocks.bookingCalls = [];
    mocks.bookings = [];
    mocks.language = "EN";
    mocks.refetch.mockReset();
    mocks.pagination = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps paid unfulfilled bookings visible, labels holds, and moves expired/cancelled entries out of upcoming", () => {
    const base = {
      location: { id: lifecycleLocationId, name: "Grohova" },
      start: "2099-10-30T06:00:00Z",
      end: "2099-10-30T07:00:00Z",
    };
    mocks.bookings = [
      {
        ...base,
        id: "expired",
        product: { name: "Expired draft" },
        reservationState: "expired",
        isActiveReservation: false,
      },
      {
        ...base,
        id: "cancelled",
        product: { name: "Cancelled visit" },
        status: "cancelled",
        paymentStatus: "CONFIRMED",
        isActiveReservation: false,
      },
      {
        ...base,
        id: "paid-attention",
        product: { name: "Paid unfinished visit" },
        reservationState: "awaiting_confirmation",
        isActiveReservation: false,
      },
      {
        ...base,
        id: "hold",
        product: { name: "Unpaid checkout" },
        reservationState: "awaiting_payment",
        paymentExpiresAt: "2099-10-25T12:00:00Z",
        isActiveReservation: true,
      },
    ];
    render(<MyBookingsTable activeLocationId={lifecycleLocationId} />);
    const table = within(screen.getByRole("table"));
    expect(table.queryByText("Expired draft")).not.toBeInTheDocument();
    expect(table.queryByText("Cancelled visit")).not.toBeInTheDocument();
    expect(table.getByText("Paid unfinished visit")).toBeInTheDocument();
    expect(
      table.getByText("Payment received · awaiting confirmation"),
    ).toBeInTheDocument();
    expect(table.getByText("Awaiting payment")).toBeInTheDocument();
    expect(table.queryByText("Confirmed")).not.toBeInTheDocument();
    expect(table.getAllByRole("button", { name: "View" })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(table.getByText("Expired draft")).toBeInTheDocument();
    expect(table.getByText("Checkout expired")).toBeInTheDocument();
    expect(table.getByText("Cancelled visit")).toBeInTheDocument();
    expect(table.getByText("Cancelled")).toBeInTheDocument();
  });

  it("expires a visible hold locally without waiting for another server response", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    mocks.bookings = [
      {
        id: "hold",
        product: { name: "Short checkout hold" },
        location: { id: lifecycleLocationId, name: "Grohova" },
        start: "2026-10-30T06:00:00Z",
        end: "2026-10-30T07:00:00Z",
        reservationState: "awaiting_payment",
        isActiveReservation: true,
        paymentExpiresAt: "2026-10-22T12:00:10Z",
      },
    ];
    render(<MyBookingsTable activeLocationId={lifecycleLocationId} />);
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Short checkout hold")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(10_001));

    expect(table.queryByText("Short checkout hold")).not.toBeInTheDocument();
    expect(mocks.refetch).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(table.getByText("Checkout expired")).toBeInTheDocument();
  });

  it("uses Czech lifecycle wording on the legacy Czech booking overview", () => {
    mocks.language = "CZ";
    mocks.bookings = [
      {
        id: "attention",
        product: { name: "Rezervace" },
        location: { id: lifecycleLocationId, name: "Grohova" },
        start: "2099-10-30T06:00:00Z",
        end: "2099-10-30T07:00:00Z",
        reservationState: "awaiting_confirmation",
        isActiveReservation: false,
      },
    ];
    render(<MyBookingsTable activeLocationId={lifecycleLocationId} />);
    expect(
      within(screen.getByRole("table")).getByText(
        "Platba přijata · rezervace čeká na potvrzení",
      ),
    ).toBeInTheDocument();
  });

  it("requests the remaining page when the last page disappears after a hold expires", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-10-22T12:00:00Z"));
    const base = {
      location: { id: lifecycleLocationId, name: "Grohova" },
      start: "2026-10-30T06:00:00Z",
      end: "2026-10-30T07:00:00Z",
    };
    mocks.bookings = [
      {
        ...base,
        id: "hold",
        product: { name: "Last-page checkout" },
        reservationState: "awaiting_payment",
        paymentExpiresAt: "2026-10-22T12:00:10Z",
      },
    ];
    mocks.pagination = { page: 1, limit: 20, totalCount: 21, totalPages: 2 };
    render(<MyBookingsTable activeLocationId={lifecycleLocationId} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(mocks.bookingCalls.at(-1).args.page).toBe(2);
    mocks.refetch.mockImplementation(() => {
      mocks.pagination = { page: 2, limit: 20, totalCount: 20, totalPages: 1 };
      mocks.bookings = Array.from({ length: 20 }, (_, index) => ({
        ...base,
        id: `confirmed-${index}`,
        product: { name: `Confirmed visit ${index + 1}` },
        reservationState: "confirmed",
      }));
    });

    act(() => vi.advanceTimersByTime(10_001));

    expect(mocks.refetch).toHaveBeenCalledOnce();
    expect(mocks.bookingCalls.at(-1).args.page).toBe(1);
    expect(
      within(screen.getByRole("table")).getByText("Confirmed visit 1"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("hides new-booking shortcuts for a disabled calendar while continuing to load existing bookings", () => {
    mocks.tenant = withCalendar(false);
    render(<MyBookingsTable />);
    expect(
      screen.queryAllByRole("link", { name: "Book a session" }),
    ).toHaveLength(0);
    expect(mocks.bookingCalls.at(-1)).toMatchObject({
      args: { locationId: "location-1" },
      options: { skip: false },
    });
    expect(screen.getByText("Booking overview")).toBeInTheDocument();
  });

  it("uses published visibility and retains the studio location on enabled shortcuts", () => {
    mocks.sessionTenant = withCalendar(false);
    mocks.tenant = withCalendar(true);
    render(<MyBookingsTable />);
    expect(
      screen.getAllByRole("link", { name: "Book a session" }).length,
    ).toBeGreaterThan(0);
    for (const link of screen.getAllByRole("link", {
      name: "Book a session",
    })) {
      expect(link).toHaveAttribute(
        "href",
        "/portal?tab=studio-calendar&location=location-1",
      );
    }
  });

  it("keeps populated mobile cards and desktop rows on the surface palette when sorting and switching history", () => {
    const locationId = "507f1f77bcf86cd799439011";
    mocks.bookings = ["Wheel", "Clay"].map((name, index) => ({
      id: `booking-${index}`,
      tag: "course",
      product: { name },
      location: { id: locationId, name: "Main studio" },
      start: `2099-11-0${index + 1}T09:00:00Z`,
      end: `2099-11-0${index + 1}T10:00:00Z`,
    }));
    render(<MyBookingsTable activeLocationId={locationId} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Wheel")).toHaveClass(
      "text-[var(--tenant-text-on-surface)]",
    );
    expect(
      screen.getByRole("heading", { name: "Wheel" }).closest("article")
        .firstChild,
    ).toHaveClass("bg-[var(--tenant-surface)]");
    fireEvent.click(within(table).getByRole("button", { name: "Booking" }));
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Clay");
    fireEvent.click(screen.getByRole("button", { name: "History" }));
    expect(mocks.bookingCalls.at(-1).args.scope).toBe("history");
    expect(within(table).getAllByRole("button", { name: "View" })).toHaveLength(
      2,
    );
  });
});
