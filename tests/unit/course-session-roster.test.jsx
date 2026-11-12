import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelParticipants: vi.fn(),
  getRoster: vi.fn(),
  getSettings: vi.fn(),
  promote: vi.fn(),
  refetchRoster: vi.fn(),
  remove: vi.fn(),
  resend: vi.fn(),
  updateSettings: vi.fn(),
}));

const copy = {
  eyebrow: "Session attendance",
  title: "Booked & waitlist roster",
  "tabs.label": "Roster views",
  "tabs.booked": "Booked",
  "tabs.waitlist": "Waitlist",
  loading: "Loading waitlist…",
  loadError: "Could not load",
  retry: "Try again",
  emptyBooked: "No confirmed bookings",
  emptyWaitlist: "Nobody is waiting",
  orderedList: "Waitlist in FIFO order",
  customerFallback: "Waitlist customer",
  auditReason: "Reason for this audited action",
  fifoOverride: "I understand this skips people ahead",
  "bookedActions.removeAndRefund": "Remove & refund",
  "bookedActions.removedAttendance": "Removed from attendance",
  "bookedActions.confirmationLabel": "Confirm paid course booking cancellation",
  "bookedActions.warning":
    "This removes every participant purchased in this order and refunds the saved course amount to the customer's studio credits.",
  "bookedActions.reason": "Reason for cancellation and refund",
  "bookedActions.confirmRefund":
    "I confirm that I want to remove this paid booking and issue the refund.",
  "bookedActions.cancel": "Keep booking",
  "bookedActions.confirm": "Remove and refund",
  "bookedActions.refunding": "Refunding…",
  "bookedActions.refunded":
    "The paid booking was removed and refunded to the customer's studio credits.",
  "bookedActions.alreadyProcessed":
    "This paid booking had already been removed and refunded.",
  "bookedActions.errors.manualReview":
    "This payment needs a manual entitlement or refund review. No participant was removed.",
  "bookedActions.errors.generic":
    "The paid booking could not be removed or refunded. Nothing was changed.",
  "actions.promote": "Offer next seat",
  "actions.promoteOutOfOrder": "Offer out of order",
  "actions.resend": "Resend offer",
  "actions.remove": "Remove",
  "actions.cancel": "Cancel",
  "actions.confirm": "Confirm action",
  "actions.saving": "Saving…",
  "errors.fifo": "The queue changed",
  "errors.generic": "Could not update",
  "states.waiting": "Waiting",
  "states.offered": "Seat offered",
  "settings.title": "Session waitlist settings",
  "settings.description": "Waitlists are off until enabled.",
  "settings.loading": "Loading settings…",
  "settings.loadError": "Could not load settings",
  "settings.retry": "Try again",
  "settings.enabled": "Enable waitlist for this session",
  "settings.enabledHint": "Show the action when full.",
  "settings.autoPromote": "Automatically offer the next seat",
  "settings.autoPromoteHint": "Promote in FIFO order.",
  "settings.offerWindow": "Offer window (hours)",
  "settings.cutoff": "Close before start (hours)",
  "settings.cutoffHint": "The earlier deadline wins.",
  "settings.save": "Save settings",
  "settings.saving": "Saving…",
  "settings.saved": "Saved",
  "settings.error": "Could not save settings",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const prefix =
        namespace === "Waitlists.admin.settings" ? "settings." : "";
      if (key === "position") return `Waitlist order ${values.position}`;
      return copy[`${prefix}${key}`] || copy[key] || key;
    },
}));

vi.mock("@/lib/features/waitlists/waitlistsApiSlice", () => ({
  WAITLIST_STATES: {
    WAITING: "waiting",
    OFFERED: "offered",
    PAYMENT_PENDING: "payment_pending",
    CONFIRMED: "confirmed",
    DECLINED: "declined",
    EXPIRED: "expired",
    WITHDRAWN: "withdrawn",
    CANCELLED: "cancelled",
  },
  useGetAdminWaitlistRosterQuery: (...args) => mocks.getRoster(...args),
  useGetAdminWaitlistSettingsQuery: (...args) => mocks.getSettings(...args),
  useCancelCourseOrderParticipantsMutation: () => [
    mocks.cancelParticipants,
    { isLoading: false },
  ],
  usePromoteAdminWaitlistEntryMutation: () => [
    mocks.promote,
    { isLoading: false },
  ],
  useRemoveAdminWaitlistEntryMutation: () => [
    mocks.remove,
    { isLoading: false },
  ],
  useResendAdminWaitlistOfferMutation: () => [
    mocks.resend,
    { isLoading: false },
  ],
  useUpdateAdminWaitlistSettingsMutation: () => [
    mocks.updateSettings,
    { isLoading: false },
  ],
}));

import CourseSessionRoster from "@/components/waitlists/CourseSessionRoster";

const resolvedMutation = (value) => ({ unwrap: () => Promise.resolve(value) });

const roster = {
  entries: [
    {
      id: "entry-confirmed-history",
      sessionId: "session-1",
      state: "confirmed",
      position: 1,
      joinedAt: "2026-08-06T08:00:00.000Z",
      customer: { name: "Historical Customer", email: "old@example.test" },
    },
    {
      id: "entry-1",
      sessionId: "session-1",
      state: "waiting",
      position: 1,
      joinedAt: "2026-08-07T08:00:00.000Z",
      customer: { name: "First Customer", email: "first@example.test" },
    },
    {
      id: "entry-2",
      sessionId: "session-1",
      state: "waiting",
      position: 2,
      joinedAt: "2026-08-07T08:05:00.000Z",
      customer: { name: "Second Customer", email: "second@example.test" },
    },
  ],
  summary: { booked: 1, capacity: 2, waiting: 2, offered: 0 },
};

describe("CourseSessionRoster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRoster.mockReturnValue({
      data: roster,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchRoster,
    });
    mocks.getSettings.mockReturnValue({
      data: {
        enabled: false,
        autoPromote: true,
        offerWindowHours: 24,
        cutoffHours: 2,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mocks.promote.mockReturnValue(resolvedMutation({}));
    mocks.cancelParticipants.mockReturnValue(
      resolvedMutation({
        sessionId: "session-1",
        orderId: "order-1",
        removedParticipants: 2,
        refund: {
          amount: 500,
          amountMinor: 50000,
          currency: "CZK",
          method: "money_credits",
          newBalance: 750,
        },
        idempotent: false,
      }),
    );
    mocks.remove.mockReturnValue(resolvedMutation({}));
    mocks.resend.mockReturnValue(resolvedMutation({}));
    mocks.updateSettings.mockReturnValue(
      resolvedMutation({
        enabled: true,
        autoPromote: true,
        offerWindowHours: 24,
        cutoffHours: 2,
      }),
    );
  });

  it("labels removed attendance, excludes it from occupied places and preserves the explicit refund action", () => {
    render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canRefundParticipants
        modules={{ courses: true, payments: true }}
        bookedEntries={[
          {
            id: "removed",
            orderId: "paid-order",
            attendanceStatus: "removed",
            customer: { name: "Removed customer" },
          },
          { id: "manual", customer: { name: "Manual guest" } },
        ]}
      />,
    );
    expect(
      screen.getByRole("tab", { name: /^Booked\s*1$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Removed from attendance")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Remove & refund" }),
    ).toHaveLength(1);
    expect(mocks.cancelParticipants).not.toHaveBeenCalled();
  });

  it("renders responsive Booked and FIFO Waitlist tabs with admin-only identity", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CourseSessionRoster
        sessionId="session-1"
        bookedEntries={[
          {
            id: "booking-1",
            customer: { name: "Booked Customer", email: "booked@example.test" },
          },
        ]}
        canView
        canPromote
        canCancel
        canConfigure
        modules={{ courses: true, payments: true }}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Roster views" });
    const bookedTab = screen.getByRole("tab", { name: /Booked/ });
    const waitlistTab = screen.getByRole("tab", { name: /Waitlist/ });
    expect(tablist).toHaveClass("grid-cols-2");
    expect(bookedTab).toHaveAttribute("aria-selected", "true");
    expect(bookedTab).toHaveAttribute("tabindex", "0");
    expect(waitlistTab).toHaveAttribute("tabindex", "-1");
    expect(bookedTab).toHaveAttribute("aria-controls");
    expect(bookedTab).toHaveClass("min-h-11");
    expect(screen.getByText("Booked Customer")).toBeInTheDocument();

    await user.click(waitlistTab);
    expect(waitlistTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("list", { name: "Waitlist in FIFO order" }),
    ).toBeInTheDocument();
    expect(screen.getByText("First Customer")).toBeInTheDocument();
    expect(screen.getByText("first@example.test")).toBeInTheDocument();
    expect(screen.queryByText("Historical Customer")).toBeNull();
    expect(screen.getByLabelText("Waitlist order 1")).toHaveTextContent("1");
    expect(screen.getByLabelText("Waitlist order 2")).toHaveTextContent("2");
    expect(container.querySelector(".sm\\:flex-row")).not.toBeNull();
  });

  it("supports roving keyboard focus across the roster tabs", async () => {
    const user = userEvent.setup();
    render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        modules={{ courses: true, payments: true }}
      />,
    );

    const bookedTab = screen.getByRole("tab", { name: /Booked/ });
    const waitlistTab = screen.getByRole("tab", { name: /Waitlist/ });
    bookedTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(waitlistTab).toHaveFocus();
    expect(waitlistTab).toHaveAttribute("aria-selected", "true");
    expect(waitlistTab).toHaveAttribute("aria-controls");
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      waitlistTab.id,
    );

    await user.keyboard("{Home}");
    expect(bookedTab).toHaveFocus();
    expect(bookedTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows paid removal only with refund authority and requires a reason plus explicit confirmation", async () => {
    const user = userEvent.setup();
    const bookedEntries = [
      {
        id: "booking-1",
        orderId: "order-1",
        customer: { name: "Ada Lovelace", email: "ada@example.test" },
      },
      {
        id: "booking-2",
        orderId: "order-1",
        customer: { name: "Grace Hopper", email: "grace@example.test" },
      },
    ];
    const { rerender } = render(
      <CourseSessionRoster
        sessionId="session-1"
        bookedEntries={bookedEntries}
        canView
        modules={{ courses: true, payments: true }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Remove & refund" }),
    ).toBeNull();

    rerender(
      <CourseSessionRoster
        sessionId="session-1"
        bookedEntries={bookedEntries}
        canView
        canRefundParticipants
        modules={{ courses: true, payments: true }}
      />,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Remove & refund" })[0],
    );
    const form = screen.getByRole("form", {
      name: "Confirm paid course booking cancellation",
    });
    const confirm = screen.getByRole("button", {
      name: "Remove and refund",
    });
    expect(form).toBeInTheDocument();
    expect(confirm).toBeDisabled();

    await user.type(
      screen.getByLabelText("Reason for cancellation and refund"),
      "Customer requested cancellation",
    );
    expect(confirm).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /I confirm that I want to remove this paid booking/,
      }),
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(mocks.cancelParticipants).toHaveBeenCalledWith({
        sessionId: "session-1",
        orderId: "order-1",
        reason: "Customer requested cancellation",
      }),
    );
    expect(mocks.refetchRoster).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.queryByText("Grace Hopper")).toBeNull();
    expect(screen.getByText("No confirmed bookings")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "The paid booking was removed and refunded",
    );
  });

  it("treats an idempotent cancellation replay as success", async () => {
    mocks.cancelParticipants.mockReturnValue(
      resolvedMutation({
        sessionId: "session-1",
        orderId: "order-1",
        removedParticipants: 0,
        idempotent: true,
        refund: {
          amount: 500,
          amountMinor: 50000,
          currency: "CZK",
          method: "money_credits",
          newBalance: 750,
        },
      }),
    );
    const user = userEvent.setup();
    render(
      <CourseSessionRoster
        sessionId="session-1"
        bookedEntries={[
          {
            id: "booking-1",
            orderId: "order-1",
            customer: { name: "Ada Lovelace" },
          },
        ]}
        canView
        canRefundParticipants
        modules={{ courses: true, payments: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove & refund" }));
    await user.type(
      screen.getByLabelText("Reason for cancellation and refund"),
      "Replay after a lost response",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Remove and refund" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "already been removed and refunded",
    );
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
  });

  it("keeps participants visible and shows the manual-review error when a refund cannot be proven", async () => {
    mocks.cancelParticipants.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { code: "COURSE_PARTICIPANT_MEMBERSHIP_REFUND_REVIEW" },
        }),
    });
    const user = userEvent.setup();
    render(
      <CourseSessionRoster
        sessionId="session-1"
        bookedEntries={[
          {
            id: "booking-1",
            orderId: "order-1",
            customer: { name: "Ada Lovelace" },
          },
        ]}
        canView
        canRefundParticipants
        modules={{ courses: true, payments: true }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove & refund" }));
    await user.type(
      screen.getByLabelText("Reason for cancellation and refund"),
      "Customer requested cancellation",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Remove and refund" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "manual entitlement or refund review",
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(mocks.refetchRoster).not.toHaveBeenCalled();
  });

  it("requires an audit reason before manually promoting the FIFO head", async () => {
    const user = userEvent.setup();
    render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canPromote
        canCancel
        canConfigure
        modules={{ courses: true, payments: true }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Waitlist/ }));
    await user.click(screen.getByRole("button", { name: "Offer next seat" }));
    const confirm = screen.getByRole("button", { name: "Confirm action" });
    expect(confirm).toBeDisabled();
    await user.type(
      screen.getByLabelText("Reason for this audited action"),
      "A confirmed booking was cancelled",
    );
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() =>
      expect(mocks.promote).toHaveBeenCalledWith({
        sessionId: "session-1",
        entryId: "entry-1",
        reason: "A confirmed booking was cancelled",
        overrideFifo: false,
      }),
    );
  });

  it("keeps legacy sessions disabled by default and enforces server bounds", () => {
    render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canPromote
        canCancel
        canConfigure
        modules={{ courses: true, payments: true }}
      />,
    );

    expect(
      screen.getByRole("checkbox", {
        name: /Enable waitlist for this session/,
      }),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Offer window (hours)")).toHaveAttribute(
      "min",
      "1",
    );
    expect(screen.getByLabelText("Offer window (hours)")).toHaveAttribute(
      "max",
      "168",
    );
    expect(screen.getByLabelText("Close before start (hours)")).toHaveAttribute(
      "min",
      "0",
    );
    expect(screen.getByLabelText("Close before start (hours)")).toHaveAttribute(
      "max",
      "168",
    );
  });

  it("separates promote, cancel and configure permissions", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canPromote
        modules={{ courses: true, payments: true }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Waitlist/ }));
    expect(
      screen.getByRole("button", { name: "Offer next seat" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(screen.queryByText("Session waitlist settings")).toBeNull();

    unmount();
    render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canCancel
        modules={{ courses: true, payments: true }}
      />,
    );
    await user.click(screen.getByRole("tab", { name: /Waitlist/ }));
    expect(screen.queryByRole("button", { name: /Offer/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
    expect(screen.queryByText("Session waitlist settings")).toBeNull();
  });

  it("keeps roster recovery and removal available when payments are disabled", async () => {
    const user = userEvent.setup();
    render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canPromote
        canCancel
        canConfigure
        modules={{ courses: true, payments: false }}
      />,
    );

    expect(mocks.getRoster).toHaveBeenCalledWith(
      { sessionId: "session-1" },
      { skip: false },
    );
    await user.click(screen.getByRole("tab", { name: /Waitlist/ }));
    expect(screen.queryByRole("button", { name: /Offer/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
    expect(screen.queryByText("Session waitlist settings")).toBeNull();
  });

  it("fails closed when the courses module is disabled", () => {
    const { container } = render(
      <CourseSessionRoster
        sessionId="session-1"
        canView
        canCancel
        modules={{ courses: false, payments: true }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(mocks.getRoster).toHaveBeenCalledWith(
      { sessionId: "session-1" },
      { skip: true },
    );
  });
});
