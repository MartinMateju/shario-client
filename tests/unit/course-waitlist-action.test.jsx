import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: false,
  checkout: vi.fn(),
  join: vi.fn(),
  leave: vi.fn(),
  requestGuest: vi.fn(),
  status: { data: { entries: [] }, isFetching: false },
  t: (key, values = {}) => {
    const copy = {
      join: "Join waitlist",
      joining: "Joining…",
      withdraw: "Leave waitlist",
      bookingAvailable: "A seat is available now. Availability was refreshed.",
      joinedAt: `Joined ${values.date || ""}`,
      "states.waiting": "Waiting",
      "states.payment_pending": "Payment pending",
      "stateDescriptions.waiting": "We will email you if a seat opens.",
      "stateDescriptions.payment_pending": "The booking is not confirmed yet.",
      "offer.resumePayment": "Resume payment",
      "guest.formLabel": "Join this class waitlist by email",
      "guest.title": "Get notified if a seat opens",
      "guest.description": "Verify your email first.",
      "guest.close": "Close waitlist form",
      "guest.firstName": "First name",
      "guest.lastName": "Last name",
      "guest.email": "Email",
      "guest.send": "Email verification link",
      "guest.sending": "Sending…",
      "guest.sent":
        "If the address can join, a verification email is on its way.",
      "guest.validation": "Enter valid details.",
      "guest.privacy": "Used only for this request.",
      "guest.signIn": "Or sign in and keep this selection",
      "errors.generic": "Could not update the waitlist.",
    };
    return copy[key] || key;
  },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => mocks.t,
}));

vi.mock("react-redux", () => ({
  useSelector: () => mocks.authenticated,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectIsCustomerAuthenticated: (state) => state,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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
  useCheckoutWaitlistOfferMutation: () => [
    mocks.checkout,
    { isLoading: false },
  ],
  useGetMyWaitlistsQuery: () => mocks.status,
  useJoinWaitlistMutation: () => [mocks.join, { isLoading: false }],
  useLeaveWaitlistMutation: () => [mocks.leave, { isLoading: false }],
  useRequestGuestWaitlistVerificationMutation: () => [
    mocks.requestGuest,
    { isLoading: false },
  ],
}));

import CourseWaitlistAction, {
  buildWaitlistLoginHref,
} from "@/components/waitlists/CourseWaitlistAction";

const fullSession = {
  id: "session-1",
  available: false,
  remainingCapacity: 0,
  waitlist: {
    enabled: true,
    accepting: true,
    reason: "available",
  },
};

const resolvedMutation = (value) => ({ unwrap: () => Promise.resolve(value) });
const rejectedMutation = (value) => ({ unwrap: () => Promise.reject(value) });

describe("CourseWaitlistAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated = false;
    mocks.status = { data: { entries: [] }, isFetching: false };
    mocks.requestGuest.mockReturnValue(
      resolvedMutation({ verificationRequired: true }),
    );
    mocks.join.mockReturnValue(resolvedMutation({}));
    mocks.leave.mockReturnValue(resolvedMutation({}));
    mocks.checkout.mockReturnValue(resolvedMutation({}));
  });

  it("lets a logged-out guest request verification without leaking account state", async () => {
    const user = userEvent.setup();
    render(
      <CourseWaitlistAction
        session={fullSession}
        tenantSlug="studio-one"
        returnPath="/courses/course-1?date=2026-08-07"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Join waitlist" }));
    const form = screen.getByRole("form", {
      name: "Join this class waitlist by email",
    });
    expect(form).toHaveClass(
      "border-[var(--tenant-border)]",
      "bg-[var(--tenant-background)]",
      "text-[var(--tenant-text)]",
    );
    expect(form.querySelector(".sm\\:grid-cols-2")).not.toBeNull();
    await user.type(screen.getByLabelText("First name"), " Ada ");
    await user.type(screen.getByLabelText("Last name"), " Lovelace ");
    await user.type(screen.getByLabelText("Email"), "ADA@EXAMPLE.TEST");
    await user.click(
      screen.getByRole("button", { name: "Email verification link" }),
    );

    await waitFor(() =>
      expect(mocks.requestGuest).toHaveBeenCalledWith({
        tenantSlug: "studio-one",
        sessionId: "session-1",
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.test",
        locale: "en",
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "If the address can join",
    );
    expect(screen.queryByText(/already registered|already joined/i)).toBeNull();
  });

  it("preserves a safe login return path for logged-out visitors", async () => {
    const user = userEvent.setup();
    render(
      <CourseWaitlistAction
        session={fullSession}
        tenantSlug="studio-one"
        returnPath="/courses/course-1?date=2026-08-07"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Join waitlist" }));
    expect(
      screen.getByRole("link", {
        name: "Or sign in and keep this selection",
      }),
    ).toHaveAttribute(
      "href",
      "/login?next=%2Fcourses%2Fcourse-1%3Fdate%3D2026-08-07",
    );
    expect(
      buildWaitlistLoginHref({
        returnPath: "https://attacker.invalid/steal",
        sessionId: "session-1",
      }),
    ).toBe("/login?next=%2Fcourses%3FcourseSessionId%3Dsession-1");
  });

  it("refreshes normal booking when guest join reports BOOKING_AVAILABLE", async () => {
    const user = userEvent.setup();
    const onBookingAvailable = vi.fn();
    mocks.requestGuest.mockReturnValue(
      rejectedMutation({ data: { code: "BOOKING_AVAILABLE" } }),
    );
    render(
      <CourseWaitlistAction
        session={fullSession}
        tenantSlug="studio-one"
        onBookingAvailable={onBookingAvailable}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Join waitlist" }));
    await user.type(screen.getByLabelText("First name"), "Ada");
    await user.type(screen.getByLabelText("Last name"), "Lovelace");
    await user.type(screen.getByLabelText("Email"), "ada@example.test");
    await user.click(
      screen.getByRole("button", { name: "Email verification link" }),
    );

    await waitFor(() =>
      expect(onBookingAvailable).toHaveBeenCalledWith(fullSession),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "A seat is available now",
    );
  });

  it("refreshes normal booking when an authenticated join races with a free seat", async () => {
    const user = userEvent.setup();
    const onBookingAvailable = vi.fn();
    mocks.authenticated = true;
    mocks.join.mockReturnValue(
      rejectedMutation({ data: { code: "BOOKING_AVAILABLE" } }),
    );
    render(
      <CourseWaitlistAction
        session={fullSession}
        tenantSlug="studio-one"
        onBookingAvailable={onBookingAvailable}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Join waitlist" }));

    await waitFor(() =>
      expect(onBookingAvailable).toHaveBeenCalledWith(fullSession),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Availability was refreshed",
    );
  });

  it("shows waiting state and joined time without exposing queue position", () => {
    mocks.authenticated = true;
    mocks.status = {
      data: {
        entries: [
          {
            id: "entry-1",
            sessionId: "session-1",
            state: "waiting",
            joinedAt: "2026-08-07T09:00:00.000Z",
            position: 12,
          },
        ],
      },
      isFetching: false,
    };

    const { container } = render(
      <CourseWaitlistAction session={fullSession} tenantSlug="studio-one" />,
    );

    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText(/Joined/)).toBeInTheDocument();
    expect(container).not.toHaveTextContent("position");
    expect(container).not.toHaveTextContent("12");
  });

  it("allows a fresh join when the session history contains only terminal entries", async () => {
    const user = userEvent.setup();
    mocks.authenticated = true;
    mocks.status = {
      data: {
        entries: [
          {
            id: "entry-withdrawn",
            sessionId: "session-1",
            state: "withdrawn",
            joinedAt: "2026-07-01T09:00:00.000Z",
          },
          {
            id: "entry-expired",
            sessionId: "session-1",
            state: "expired",
            joinedAt: "2026-06-01T09:00:00.000Z",
          },
        ],
      },
      isFetching: false,
    };

    render(
      <CourseWaitlistAction session={fullSession} tenantSlug="studio-one" />,
    );

    await user.click(screen.getByRole("button", { name: "Join waitlist" }));
    expect(mocks.join).toHaveBeenCalledWith({
      sessionId: "session-1",
      locale: "en",
    });
    expect(screen.queryByText("Withdrawn")).toBeNull();
  });

  it("resumes the idempotent entry checkout for payment_pending", async () => {
    const user = userEvent.setup();
    mocks.authenticated = true;
    mocks.status = {
      data: {
        entries: [
          {
            id: "entry-pending",
            sessionId: "session-1",
            state: "payment_pending",
          },
        ],
      },
      isFetching: false,
    };
    mocks.checkout.mockReturnValue(
      resolvedMutation({
        checkoutUrl: "https://checkout.stripe.com/c/pay/test",
      }),
    );

    render(
      <CourseWaitlistAction session={fullSession} tenantSlug="studio-one" />,
    );
    await user.click(screen.getByRole("button", { name: "Resume payment" }));

    expect(mocks.checkout).toHaveBeenCalledWith({
      entryId: "entry-pending",
      sessionId: "session-1",
      locale: "en",
      origin: "http://localhost:3000",
    });
  });
});
