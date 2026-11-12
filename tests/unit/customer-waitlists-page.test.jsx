import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkout: vi.fn(),
  leave: vi.fn(),
  modules: { courses: true, payments: true },
  query: null,
  user: { email: "customer@example.com" },
  tenant: {},
  location: null,
}));

const copy = {
  "portal.eyebrow": "Your studio activity",
  "portal.title": "Waitlists",
  "portal.description": "Review waitlists. Queue positions stay private.",
  "portal.browse": "Browse classes",
  "portal.sessionFallback": "Class session",
  "portal.loading": "Loading your waitlists…",
  "portal.unavailable.title": "Waitlists are not available",
  "portal.unavailable.description": "Classes and payments are required.",
  "portal.paused.title": "Waitlist checkout is temporarily unavailable",
  "portal.paused.description":
    "You can still review or leave existing waitlists.",
  "portal.loadError.title": "Waitlists could not be loaded",
  "portal.loadError.description": "Try again.",
  "portal.loadError.retry": "Try again",
  "portal.verificationRequired.title": "Verify your email",
  "portal.verificationRequired.description":
    "Verify your email to manage waitlist requests and accept seat offers.",
  "portal.verificationRequired.action": "Verify email",
  "portal.empty.title": "No waitlists yet",
  "portal.empty.description": "Join from a full class.",
  "states.offered": "Seat offered",
  "states.payment_pending": "Payment pending",
  "states.confirmed": "Booked",
  "states.refunded": "Refunded",
  "stateDescriptions.offered": "Complete payment to book it.",
  "stateDescriptions.payment_pending":
    "The booking is not confirmed until payment succeeds.",
  "stateDescriptions.confirmed": "Payment succeeded and your place is booked.",
  "stateDescriptions.refunded":
    "Your payment was returned and this seat offer is closed.",
  "refund.title": "Refund completed",
  "refund.refundedAt": "Returned on refund date",
  "offer.priceSnapshot": "Saved offer price",
  "offer.expires": "Pay by deadline",
  "offer.pay": "Continue to secure payment",
  "offer.resumePayment": "Resume payment",
  joinedAt: "Joined today",
  withdraw: "Leave waitlist",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace) => (key) => {
    const prefix =
      namespace === "Waitlists.portal"
        ? "portal."
        : namespace === "Waitlists.refund"
          ? "refund."
          : "";
    return copy[`${prefix}${key}`] || key;
  },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => mocks.location,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({ modules: mocks.modules }),
  selectCurrentUser: () => mocks.user,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/customer-shell/CustomerPortalPrimitives", () => ({
  CustomerPortalEmptyState: ({ title, description, action }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  ),
  CustomerPortalLoadingState: ({ label }) => <p role="status">{label}</p>,
  CustomerPortalPage: ({ children, ...props }) => (
    <main {...props}>{children}</main>
  ),
  CustomerPortalPageHeader: ({ eyebrow, title, description, actions }) => (
    <header>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
  CustomerPortalSurface: ({ children, className }) => (
    <section className={className}>{children}</section>
  ),
  customerPortalPrimaryActionClass: "primary min-h-12",
  customerPortalSecondaryActionClass: "secondary min-h-11",
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
  useCheckoutWaitlistOfferMutation: () => [mocks.checkout],
  useGetMyWaitlistsQuery: (...args) => {
    mocks.query.args = args;
    return mocks.query;
  },
  useLeaveWaitlistMutation: () => [mocks.leave],
}));

import CustomerWaitlistsPage from "@/components/waitlists/CustomerWaitlistsPage";

describe("CustomerWaitlistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.modules = { courses: true, payments: true };
    mocks.tenant = {};
    mocks.location = {
      activeLocationReference: "vaclavska",
      activeLocation: { booking: { enabled: true } },
    };
    mocks.user = { email: "customer@example.com" };
    mocks.query = {
      args: [],
      data: {
        entries: [
          {
            id: "entry-offered",
            sessionId: "session-1",
            state: "offered",
            joinedAt: "2026-08-07T08:00:00.000Z",
            offerExpiresAt: "2026-08-08T08:00:00.000Z",
            price: { amount: 1250, currency: "CZK", version: "price-v1" },
            session: {
              id: "session-1",
              title: "Wheel throwing",
              start: "2026-08-20T16:00:00.000Z",
              end: "2026-08-20T18:00:00.000Z",
              locationName: "Main studio",
            },
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("keeps both class-browsing actions in the authenticated course catalog", () => {
    mocks.query.data.entries = [];
    mocks.tenant = {
      publicCapabilities: { courses: false },
      publicSite: { pages: { courses: { visible: false } } },
    };
    render(<CustomerWaitlistsPage />);
    const links = screen.getAllByRole("link", { name: "Browse classes" });
    expect(links).toHaveLength(2);
    links.forEach((link) =>
      expect(link).toHaveAttribute(
        "href",
        "/portal/courses?location=vaclavska",
      ),
    );
  });

  it.each(["page", "module"])(
    "does not advertise courses disabled by %s settings",
    (disabled) => {
      if (disabled === "page")
        mocks.tenant = {
          publicSite: {
            customerPortal: { pages: { courses: { enabled: false } } },
          },
        };
      if (disabled === "module") mocks.modules.courses = false;
      render(<CustomerWaitlistsPage />);
      expect(
        screen.queryByRole("link", { name: "Browse classes" }),
      ).not.toBeInTheDocument();
    },
  );

  it("shows an offered server price and payment CTA without claiming confirmation", () => {
    const { container } = render(<CustomerWaitlistsPage />);

    expect(
      screen.getByRole("heading", { name: "Waitlists" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Wheel throwing")).toBeInTheDocument();
    expect(screen.getByText("Seat offered")).toBeInTheDocument();
    expect(screen.getByText(/Saved offer price/)).toHaveTextContent(/1.?250/);
    expect(
      screen.getByRole("button", { name: "Continue to secure payment" }),
    ).toHaveClass("min-h-12");
    expect(container).not.toHaveTextContent(/confirmed/i);
    expect(container).not.toHaveTextContent(/position\s+\d|you are #/i);
  });

  it("resumes payment_pending checkout and confirms only after server state changes", async () => {
    const user = userEvent.setup();
    mocks.checkout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          checkoutUrl: "https://checkout.stripe.com/c/pay/test",
        }),
    });
    mocks.query.data.entries = [
      {
        id: "entry-pending",
        sessionId: "session-1",
        state: "payment_pending",
        session: { id: "session-1", title: "Wheel throwing" },
      },
      {
        id: "entry-confirmed",
        sessionId: "session-2",
        state: "confirmed",
        session: { id: "session-2", title: "Glazing" },
      },
    ];

    render(<CustomerWaitlistsPage />);

    expect(screen.getByText("Payment pending")).toBeInTheDocument();
    expect(
      screen.getByText("The booking is not confirmed until payment succeeds."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume payment" }));
    expect(mocks.checkout).toHaveBeenCalledWith({
      entryId: "entry-pending",
      sessionId: "session-1",
      locale: "en",
      origin: "http://localhost:3000",
    });
    expect(screen.getByText("Booked")).toBeInTheDocument();
    expect(
      screen.getByText("Payment succeeded and your place is booked."),
    ).toBeInTheDocument();
  });

  it("presents a terminal refunded entry with the returned amount and date instead of an expired offer", () => {
    mocks.query.data.entries = [
      {
        id: "entry-refunded",
        sessionId: "session-1",
        state: "expired",
        joinedAt: "2026-08-07T08:00:00.000Z",
        price: { amount: 1250, currency: "CZK", version: "price-v1" },
        refund: {
          amount: 1250,
          amountMinor: 1250,
          currency: "JPY",
          refundedAt: "2026-08-07T10:00:00.000Z",
        },
        session: { id: "session-1", title: "Wheel throwing" },
      },
    ];

    const { container } = render(<CustomerWaitlistsPage />);

    expect(screen.getByText("Refunded")).toHaveAttribute(
      "data-waitlist-state",
      "refunded",
    );
    expect(
      screen.getByText(
        "Your payment was returned and this seat offer is closed.",
      ),
    ).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Refund completed" });
    expect(summary).toHaveTextContent(/1.?250/);
    expect(summary).toHaveTextContent("Returned on refund date");
    expect(screen.queryByText(/Saved offer price/)).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("keeps history and withdrawal available while module shutdown pauses checkout", () => {
    mocks.modules = { courses: true, payments: false };
    render(<CustomerWaitlistsPage />);

    expect(
      screen.getByRole("heading", { name: "Waitlists" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Wheel throwing")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "You can still review or leave existing waitlists.",
    );
    expect(
      screen.getByRole("button", { name: "Continue to secure payment" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Leave waitlist" }),
    ).toBeEnabled();
    expect(mocks.query.args).toEqual([]);
  });

  it("shows the module unavailable state only when there is no history", () => {
    mocks.modules = { courses: false, payments: false };
    mocks.query.data.entries = [];
    render(<CustomerWaitlistsPage />);

    expect(
      screen.getByRole("heading", { name: "Waitlists are not available" }),
    ).toBeInTheDocument();
    expect(mocks.query.args).toEqual([]);
  });

  it("explains the email requirement and keeps a return path without sending anything", () => {
    mocks.user = { email: " Customer+Studio@Example.com " };
    mocks.query.data = undefined;
    mocks.query.isError = true;
    mocks.query.error = {
      status: 403,
      data: { code: "EMAIL_VERIFICATION_REQUIRED", message: "Forbidden" },
    };

    render(<CustomerWaitlistsPage />);

    expect(
      screen.getByRole("heading", { name: "Verify your email" }),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Verify email" });
    const url = new URL(link.getAttribute("href"), "https://studio.example");
    expect(url.pathname).toBe("/verify-email");
    expect(url.searchParams.get("email")).toBe("customer+studio@example.com");
    expect(url.searchParams.get("next")).toBe("/portal/waitlists");
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
    expect(mocks.checkout).not.toHaveBeenCalled();
    expect(mocks.leave).not.toHaveBeenCalled();
    expect(mocks.query.refetch).not.toHaveBeenCalled();
  });

  it.each(["Continue to secure payment", "Leave waitlist"])(
    "offers verification recovery when %s is rejected, retaining the existing entries",
    async (actionLabel) => {
      const user = userEvent.setup();
      const failure = {
        status: 403,
        data: { code: "EMAIL_VERIFICATION_REQUIRED", message: "Forbidden" },
      };
      mocks.checkout.mockReturnValue({ unwrap: () => Promise.reject(failure) });
      mocks.leave.mockReturnValue({ unwrap: () => Promise.reject(failure) });

      render(<CustomerWaitlistsPage />);
      await user.click(screen.getByRole("button", { name: actionLabel }));

      expect(screen.getByRole("alert")).toHaveTextContent("Verify your email");
      expect(
        screen.getByRole("link", { name: "Verify email" }),
      ).toHaveAttribute(
        "href",
        "/verify-email?email=customer%40example.com&next=%2Fportal%2Fwaitlists",
      );
      expect(screen.getByText("Wheel throwing")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: actionLabel })).toBeEnabled();
    },
  );

  it("keeps ordinary loading errors retryable instead of asking for verification", async () => {
    const user = userEvent.setup();
    mocks.query.isError = true;
    mocks.query.error = { status: 500, data: { message: "Unavailable" } };

    render(<CustomerWaitlistsPage />);

    expect(
      screen.getByRole("heading", { name: "Waitlists could not be loaded" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Verify email" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.query.refetch).toHaveBeenCalledOnce();
  });
});
