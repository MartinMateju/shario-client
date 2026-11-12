import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MenuHeader from "@/components/menu/MenuHeader";

const copy = {
  admin: "Admin",
  moderator: "Moderator",
  eyebrow: "Your studio",
  greeting: "Welcome back",
  intro: "Your bookings, creative work and benefits in one calm place.",
  book: "Book a session",
  upcoming: "Next visit",
  upcomingLoading: "Finding your next visit…",
  upcomingError: "Your next visit is temporarily unavailable.",
  upcomingEmpty: "Nothing booked yet",
  upcomingEmptyDescription: "Choose a time whenever you are ready.",
  chooseTime: "Choose a time",
  manageBooking: "View booking",
  cancelBooking: "Cancel booking",
  member: "Member ID",
  credits: "Credits",
  copyMemberId: "Copy member ID",
  copiedMemberId: "Member ID copied",
};

const createProps = (overrides = {}) => ({
  name: "Mia",
  memberNumber: 234,
  customId: "U-MS79UT9H-OLIVIE",
  creditValue: "400",
  copy,
  upcoming: null,
  upcomingStatus: "ready",
  bookingAccountEnabled: true,
  bookingsEnabled: true,
  showCredits: true,
  onBookStudio: vi.fn(),
  onChooseTime: vi.fn(),
  onCancelBooking: vi.fn(),
  onOpenBookings: vi.fn(),
  ...overrides,
});

describe("customer portal overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the welcome area compact and offers one contextual calendar action", () => {
    const props = createProps();
    render(<MenuHeader {...props} />);

    const overview = document.querySelector("[data-customer-portal-overview]");
    const greeting = screen.getByRole("heading", {
      name: "Welcome back, Mia",
    });

    expect(overview).toHaveAttribute(
      "aria-labelledby",
      "customer-portal-greeting",
    );
    expect(overview.style.backgroundColor).toBe("var(--tenant-background)");
    expect(overview.style.color).toBe("var(--tenant-text)");
    expect(overview).toHaveClass("pb-5", "pt-6", "sm:py-6");
    expect(
      overview.querySelector("[data-customer-portal-upcoming-layout]"),
    ).toHaveClass(
      "grid",
      "grid-cols-[auto_minmax(0,1fr)]",
      "sm:grid-cols-[auto_minmax(0,1fr)_auto]",
    );
    expect(
      overview.querySelectorAll("[data-customer-portal-action-priority]"),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Book a session" }),
    ).not.toBeInTheDocument();

    expect(greeting).toHaveAttribute("data-tenant-type", "display");
    expect(greeting).not.toHaveClass("font-serif");
    expect(greeting.style.fontFamily).toBe("var(--tenant-font-display)");
    expect(greeting.style.color).toBe("var(--tenant-heading-color)");
    expect(
      overview.querySelector("[data-tenant-type='eyebrow']"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a time" })).toHaveClass(
      "col-start-2",
      "min-h-11",
      "w-full",
      "whitespace-nowrap",
      "sm:col-start-3",
      "sm:row-start-1",
      "sm:w-auto",
    );
    expect(
      screen.getByRole("button", { name: "Choose a time" }),
    ).toHaveAttribute("data-customer-portal-choose-time", "true");
    expect(
      screen.getByRole("button", { name: "Choose a time" }),
    ).toHaveAttribute("data-tenant-button", "primary");
    expect(
      screen.getByRole("button", { name: "Choose a time" }),
    ).toHaveAttribute("data-tenant-hover", "preserve");
    expect(
      screen.getByRole("button", { name: "Choose a time" }).style
        .backgroundColor,
    ).toBe("var(--tenant-portal-button)");

    const summary = document.querySelector(
      "[data-customer-portal-account-summary]",
    );
    expect(summary).toContainElement(screen.getByText("Next visit"));
    expect(summary).toContainElement(screen.getByText("Member ID"));
    expect(summary).toContainElement(screen.getByText("Credits"));
    expect(
      summary.querySelectorAll('[data-tenant-surface="card"]'),
    ).toHaveLength(0);
    expect(
      summary.querySelector("[data-customer-portal-summary-layout]"),
    ).not.toHaveClass(
      "xl:grid-cols-[minmax(0,1.08fr)_1px_minmax(240px,0.92fr)]",
    );
    expect(
      summary.querySelector("[data-customer-portal-summary-divider]"),
    ).toHaveClass("h-px", "w-full");
    expect(
      screen.getByText("Member ID").closest("[data-visual-priority]"),
    ).toHaveAttribute("data-visual-priority", "primary");
    expect(
      screen.getByText("Credits").closest("[data-visual-priority]"),
    ).toHaveAttribute("data-visual-priority", "primary");
    const accountStats = Array.from(
      summary.querySelectorAll("[data-customer-portal-account-stat]"),
    );
    expect(accountStats[0]).toHaveTextContent("Member ID");
    expect(accountStats[1]).toHaveTextContent("Credits");
  });

  it("shows the complete member ID and copies its unformatted value", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<MenuHeader {...createProps()} />);

    const memberId = document.querySelector("[data-customer-member-id]");
    const copyButton = screen.getByRole("button", { name: "Copy member ID" });

    expect(memberId).toHaveTextContent("#234");
    expect(memberId).toHaveAttribute("title", "#234");
    expect(memberId).toHaveAttribute("aria-label", "#234");
    expect(copyButton).toHaveClass("h-11", "w-11");

    await user.click(copyButton);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("234"));
    expect(
      screen.getByRole("button", { name: "Member ID copied" }),
    ).toBeInTheDocument();
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Member ID copied",
    );
  });

  it("shows an em dash instead of the preserved legacy QR identifier", () => {
    render(<MenuHeader {...createProps({ memberNumber: null })} />);

    expect(
      document.querySelector("[data-customer-member-id]"),
    ).toHaveTextContent("—");
    expect(
      screen.getByRole("button", { name: "Copy member ID" }),
    ).toBeDisabled();
    expect(screen.queryByText(/U-MS79UT9H-OLIVIE/)).not.toBeInTheDocument();
  });

  it("covers loading, unavailable, empty, and populated upcoming-visit states", async () => {
    const user = userEvent.setup();
    const onChooseTime = vi.fn();
    const onCancelBooking = vi.fn();
    const onOpenBookings = vi.fn();
    const view = render(
      <MenuHeader
        {...createProps({
          upcomingStatus: "loading",
          onChooseTime,
          onCancelBooking,
          onOpenBookings,
        })}
      />,
    );

    expect(screen.getByText("Finding your next visit…")).toBeInTheDocument();

    view.rerender(<MenuHeader {...createProps({ upcomingStatus: "error" })} />);
    expect(
      screen.getByText("Your next visit is temporarily unavailable."),
    ).toBeInTheDocument();

    view.rerender(
      <MenuHeader
        {...createProps({ onChooseTime, onCancelBooking, onOpenBookings })}
      />,
    );
    const emptyUpcoming = document.querySelector(
      "[data-customer-portal-upcoming]",
    );
    expect(emptyUpcoming).toHaveAttribute("data-empty-state", "true");
    expect(screen.getByText("Nothing booked yet")).toBeInTheDocument();
    expect(
      screen.getByText("Choose a time whenever you are ready."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose a time" }));
    expect(onChooseTime).toHaveBeenCalledOnce();
    expect(onOpenBookings).not.toHaveBeenCalled();

    view.rerender(
      <MenuHeader
        {...createProps({
          upcoming: {
            title: "Wheel basics",
            date: "Fri, 7 August",
            time: "16:30–18:00",
            locationName: "Studio Olivie",
          },
          onChooseTime,
          onCancelBooking,
          onOpenBookings,
        })}
      />,
    );

    const upcoming = document.querySelector("[data-customer-portal-upcoming]");

    expect(within(upcoming).getByText("Wheel basics")).toBeInTheDocument();
    expect(upcoming).not.toHaveAttribute("data-empty-state");
    expect(upcoming).toHaveTextContent(
      "Fri, 7 August · 16:30–18:00 · Studio Olivie",
    );
    expect(
      within(upcoming).getByRole("button", { name: "View booking" }),
    ).toHaveClass("min-h-11");
    await user.click(
      within(upcoming).getByRole("button", { name: "View booking" }),
    );
    expect(onOpenBookings).toHaveBeenCalledOnce();

    view.rerender(
      <MenuHeader
        {...createProps({
          upcoming: {
            title: "Wheel basics",
            date: "Fri, 7 August",
            time: "16:30–18:00",
            locationName: "Studio Olivie",
          },
          canCancelUpcoming: true,
          onChooseTime,
          onCancelBooking,
          onOpenBookings,
        })}
      />,
    );

    const cancelButton = screen.getByRole("button", {
      name: "Cancel booking",
    });
    expect(cancelButton).toHaveAttribute(
      "data-customer-portal-cancel-booking",
      "true",
    );
    expect(cancelButton).toHaveAttribute("data-tenant-intent", "danger");
    await user.click(cancelButton);
    expect(onCancelBooking).toHaveBeenCalledOnce();
    expect(onOpenBookings).toHaveBeenCalledOnce();
  });

  it("hides booking-only account content when booking modules are disabled", () => {
    render(
      <MenuHeader
        {...createProps({
          bookingAccountEnabled: false,
          bookingsEnabled: false,
        })}
      />,
    );

    expect(
      document.querySelector("[data-customer-portal-overview]"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your studio")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Welcome back, Mia" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Next visit")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Book a session" }),
    ).not.toBeInTheDocument();
  });
});
