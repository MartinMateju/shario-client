import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BookingsToolbar from "@/components/tables/bookings/BookingsToolbar";
import { INITIAL_BOOKING_FILTERS } from "@/components/tables/bookings/booking-table.constants";
import { countActiveFilters } from "@/components/tables/bookings/booking-table.utils";

const labels = {
  title: "Bookings",
  "views.all": "All",
  "views.upcoming": "Upcoming",
  "views.today": "Today",
  "views.awaitingPayment": "Awaiting payment",
  "views.cancelled": "Cancelled",
  "filters.searchLabel": "Search bookings",
  "filters.searchPlaceholder": "Search by customer or booking ID",
  "filters.location": "Studio",
  "filters.allLocations": "All studios",
  "filters.button": "Filters",
  "filters.apply": "Apply filters",
  "filters.clear": "Clear filters",
  "filters.futureOnly": "Show only ongoing and upcoming bookings",
  "filters.dateFrom": "From date",
  "filters.dateTo": "To date",
  "filters.lecturer": "Lecturer",
  "filters.allLecturers": "All lecturers",
  "filters.activity": "Activity",
  "filters.allActivities": "All activities",
  "filters.customerId": "Customer / custom ID",
  "filters.customerIdPlaceholder": "For example MM001",
  "filters.paymentStatus": "Payment status",
  "filters.allPaymentStatuses": "All payment statuses",
  "filters.bookingStatus": "Booking status",
  "filters.allBookingStatuses": "All booking statuses",
  "payment.pending": "Awaiting payment",
  "payment.paid": "Paid",
  "payment.credits": "Credits",
  "payment.refunded": "Refunded",
  "payment.failed": "Failed",
  "payment.expired": "Expired",
  "status.confirmed": "Confirmed",
  "status.pending": "Pending",
  "status.processed": "Processed",
  "status.delivered": "Delivered",
  "status.completed": "Completed",
  "status.cancelled": "Cancelled",
  export: "Export",
};

const t = (key) => labels[key] || key;

const baseProps = {
  activeView: "all",
  summary: {
    total: 12,
    upcoming: 7,
    today: 2,
    awaitingPayment: 1,
    cancelled: 2,
  },
  filters: {
    ...INITIAL_BOOKING_FILTERS,
    locationId: "studio-1",
  },
  activeFilterCount: 0,
  showFilters: false,
  locations: [{ _id: "studio-1", name: "The Pottery House" }],
  products: [{ _id: "product-1", name: "Wheel throwing" }],
  lecturers: [{ _id: "lecturer-1", firstname: "Anna", lastname: "Nováková" }],
  t,
};

const renderToolbar = (overrides = {}) => {
  const handlers = {
    onViewChange: vi.fn(),
    onFilterChange: vi.fn(),
    onFutureOnlyChange: vi.fn(),
    onToggleFilters: vi.fn(),
    onApplyFilters: vi.fn(),
    onClearFilters: vi.fn(),
    onExport: vi.fn(),
  };

  render(<BookingsToolbar {...baseProps} {...handlers} {...overrides} />);

  return handlers;
};

describe("BookingsToolbar", () => {
  it("keeps the future-only checkbox visible and checked outside advanced filters", () => {
    const handlers = renderToolbar();
    const checkbox = screen.getByRole("checkbox", {
      name: "Show only ongoing and upcoming bookings",
    });

    expect(checkbox).toBeChecked();
    expect(checkbox).toBeVisible();
    expect(screen.queryByRole("region", { name: "Filters" })).toBeNull();
    fireEvent.click(checkbox);
    expect(handlers.onFutureOnlyChange).toHaveBeenCalledWith(false);
    expect(handlers.onApplyFilters).not.toHaveBeenCalled();
  });

  it("can enable future-only filtering from the unchecked state", () => {
    const handlers = renderToolbar({
      filters: { ...baseProps.filters, futureOnly: false },
    });
    const checkbox = screen.getByRole("checkbox", {
      name: "Show only ongoing and upcoming bookings",
    });

    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(handlers.onFutureOnlyChange).toHaveBeenCalledWith(true);
  });

  it("uses an understated accessible booking view rail", () => {
    const handlers = renderToolbar();
    const group = screen.getByRole("group", { name: "Bookings" });
    const all = screen.getByRole("button", { name: /All\s*12/ });
    const today = screen.getByRole("button", { name: /Today\s*2/ });

    expect(group).toContainElement(all);
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(today).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(today);
    expect(handlers.onViewChange).toHaveBeenCalledWith("today");
  });

  it("keeps one filter disclosure and removes the redundant date button", () => {
    const handlers = renderToolbar();
    const filterButton = screen.getByRole("button", { name: "Filters" });

    expect(filterButton).toHaveAttribute("aria-expanded", "false");
    expect(filterButton).toHaveAttribute(
      "aria-controls",
      "bookings-advanced-filters",
    );
    expect(screen.queryByText("Any date")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Apply filters" }),
    ).toHaveLength(1);

    fireEvent.click(filterButton);
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(handlers.onToggleFilters).toHaveBeenCalledOnce();
    expect(handlers.onApplyFilters).toHaveBeenCalledOnce();
    expect(handlers.onExport).toHaveBeenCalledOnce();
  });

  it("exposes the advanced fields with one clear primary action", () => {
    const handlers = renderToolbar({
      showFilters: true,
      activeFilterCount: 2,
      filters: {
        ...baseProps.filters,
        dateFrom: "2026-08-13",
        paymentStatus: "CONFIRMED",
      },
    });
    const filterButton = screen.getByRole("button", { name: /Filters\s*2/ });

    expect(filterButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Filters" })).toHaveAttribute(
      "id",
      "bookings-advanced-filters",
    );
    expect(screen.getByLabelText("From date")).toHaveValue("2026-08-13");
    expect(screen.getByLabelText("Lecturer")).toBeInTheDocument();
    expect(screen.getByLabelText("Activity")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment status")).toHaveValue("CONFIRMED");
    expect(
      screen.getAllByRole("button", { name: "Apply filters" }),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(handlers.onClearFilters).toHaveBeenCalledOnce();
    expect(handlers.onApplyFilters).toHaveBeenCalledOnce();
  });

  it("does not count the required studio scope as an advanced filter", () => {
    expect(
      countActiveFilters({
        ...INITIAL_BOOKING_FILTERS,
        search: "Martin",
        locationId: "studio-1",
      }),
    ).toBe(0);
    expect(
      countActiveFilters({
        ...INITIAL_BOOKING_FILTERS,
        locationId: "studio-1",
        status: "confirmed",
      }),
    ).toBe(1);
  });
});
