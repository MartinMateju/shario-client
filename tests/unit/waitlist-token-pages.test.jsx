import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const MANAGEMENT_TOKEN = `manage-${"a".repeat(32)}`;
const OFFER_TOKEN = `offer-${"b".repeat(32)}`;
const VERIFICATION_TOKEN = `verify-${"c".repeat(32)}`;

const mocks = vi.hoisted(() => {
  const t = (key) => {
    const copy = {
      title: "Manage your waitlist request",
      description: "Use this private email link.",
      loading: "Checking link…",
      sessionLabel: "Waitlist for",
      sessionFallback: "Class session",
      "invalid.title": "This waitlist link is not valid",
      "invalid.description": "The link is incomplete or expired.",
      "invalid.action": "Browse classes",
      withdraw: "Leave waitlist",
      "states.refunded": "Refunded",
      "stateDescriptions.refunded":
        "Your payment was returned and this seat offer is closed.",
      "refund.title": "Refund completed",
      "refund.refundedAt": "Returned on refund date",
      "offerLanding.loading": "Checking offer…",
      "offerLanding.title": "A seat is waiting for you",
      "offerLanding.description": "Complete payment before the deadline.",
      "offerLanding.sessionLabel": "Your class",
      "offerLanding.sessionFallback": "Class session",
      "offerLanding.signIn": "Sign in to continue",
      "offerLanding.resumePayment": "Resume payment",
      "offerLanding.pay": "Pay now",
      "offerLanding.starting": "Starting payment…",
      "offerLanding.email": "Verified email",
      "offerLanding.verifiedEmail": "Use the verified waitlist email.",
      "offerLanding.sameEmail": "Use the same verified email.",
      "offerLanding.confirmationNotice": "Confirmation follows payment.",
      "offerLanding.invalid.title": "This seat offer is not available",
      "offerLanding.invalid.description": "The offer is incomplete or expired.",
      "offerLanding.invalid.action": "Browse classes",
      "offerLanding.errors.invalid": "This seat offer is invalid or expired.",
    };
    return copy[key] || key;
  };

  return {
    authenticated: false,
    checkout: vi.fn(),
    guestCheckout: vi.fn(),
    inspect: vi.fn(),
    manage: vi.fn(),
    offerT: (key) => t(`offerLanding.${key}`),
    refundT: (key) => t(`refund.${key}`),
    t,
    verify: vi.fn(),
    withdraw: vi.fn(),
  };
});

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace) =>
    namespace === "Waitlists.offerLanding"
      ? mocks.offerT
      : namespace === "Waitlists.refund"
        ? mocks.refundT
        : mocks.t,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "studio-one" }),
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

vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useCheckoutMutation: () => [mocks.checkout, { isLoading: false }],
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
  getSafeWaitlistToken: (value) =>
    /^[A-Za-z0-9._~-]{32,256}$/.test(String(value || "")) ? String(value) : "",
  useCheckoutGuestWaitlistOfferMutation: () => [
    mocks.guestCheckout,
    { isLoading: false },
  ],
  useInspectWaitlistOfferMutation: () => [mocks.inspect, { isLoading: false }],
  useManageGuestWaitlistMutation: () => [mocks.manage, { isLoading: false }],
  useVerifyGuestWaitlistMutation: () => [mocks.verify, { isLoading: false }],
  useWithdrawGuestWaitlistMutation: () => [
    mocks.withdraw,
    { isLoading: false },
  ],
}));

import PublicWaitlistManagementPage, {
  WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY,
  parseWaitlistHash,
  storeWaitlistManagementLink,
} from "@/components/waitlists/PublicWaitlistManagementPage";
import WaitlistOfferPage, {
  WAITLIST_OFFER_RESUME_STORAGE_KEY,
  buildWaitlistOfferLoginHref,
  getWaitlistOfferTokenFromHash,
  storeWaitlistOfferForResume,
} from "@/components/waitlists/WaitlistOfferPage";

describe("public waitlist token pages", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    mocks.authenticated = false;
    window.sessionStorage.clear();
    window.history.replaceState(
      null,
      "",
      "/en/tenants/studio-one/waitlists/manage",
    );
  });

  it("shows an invalid management-link result after parsing a missing fragment", async () => {
    render(<PublicWaitlistManagementPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "This waitlist link is not valid",
        }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.manage).not.toHaveBeenCalled();
    expect(document.querySelector("main")).toHaveClass(
      "bg-[var(--tenant-background)]",
      "text-[var(--tenant-text)]",
    );
    expect(document.querySelector("main > section")).toHaveClass(
      "bg-[var(--tenant-surface)]",
      "text-[var(--tenant-text-on-surface)]",
    );
  });

  it("shows an invalid offer result after parsing a missing fragment", async () => {
    window.history.replaceState(
      null,
      "",
      "/en/tenants/studio-one/waitlists/offer",
    );
    render(<WaitlistOfferPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "This seat offer is not available",
        }),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(mocks.inspect).not.toHaveBeenCalled();
    expect(document.querySelector("main")).toHaveClass(
      "bg-[var(--tenant-background)]",
      "text-[var(--tenant-text)]",
    );
    expect(document.querySelector("main > section")).toHaveClass(
      "bg-[var(--tenant-surface)]",
      "text-[var(--tenant-text-on-surface)]",
    );
  });

  it("moves a management bearer from the URL fragment into session storage", async () => {
    window.history.replaceState(
      null,
      "",
      `/en/tenants/studio-one/waitlists/manage#manage=${MANAGEMENT_TOKEN}`,
    );
    mocks.manage.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entry: {
            id: "entry-1",
            sessionId: "session-1",
            state: "waiting",
            session: {
              id: "session-1",
              title: "Glazing workshop",
              start: "2026-08-12T15:00:00.000Z",
              locationName: "Studio Emilka",
            },
          },
        }),
    });

    render(<PublicWaitlistManagementPage />);

    await waitFor(() =>
      expect(mocks.manage).toHaveBeenCalledWith({
        tenantSlug: "studio-one",
        token: MANAGEMENT_TOKEN,
      }),
    );
    expect(window.location.hash).toBe("#manage");
    expect(window.location.href).not.toContain(MANAGEMENT_TOKEN);
    expect(
      window.sessionStorage.getItem(WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY),
    ).toContain(MANAGEMENT_TOKEN);
  });

  it("shows a privacy-safe refund result on the public management link", async () => {
    window.history.replaceState(
      null,
      "",
      `/en/tenants/studio-one/waitlists/manage#manage=${MANAGEMENT_TOKEN}`,
    );
    mocks.manage.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entry: {
            id: "entry-refunded",
            sessionId: "session-1",
            state: "cancelled",
            refund: {
              amount: 1250,
              amountMinor: 125000,
              currency: "CZK",
              refundedAt: "2026-08-07T10:00:00.000Z",
            },
            session: { id: "session-1", title: "Glazing workshop" },
          },
        }),
    });

    render(<PublicWaitlistManagementPage />);

    expect(await screen.findByText("Refunded")).toHaveAttribute(
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
    expect(screen.queryByRole("button", { name: "Leave waitlist" })).toBeNull();
    expect(summary).not.toHaveTextContent(
      /refund id|payment method|succeeded/i,
    );
  });

  it("rotates a verified guest into a stable management link and withdraws", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      "",
      `/en/tenants/studio-one/waitlists/manage#verify=${VERIFICATION_TOKEN}`,
    );
    mocks.verify.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          managementToken: MANAGEMENT_TOKEN,
          entry: {
            id: "entry-1",
            sessionId: "session-1",
            state: "waiting",
            session: {
              id: "session-1",
              title: "Glazing workshop",
              start: "2026-08-12T15:00:00.000Z",
              locationName: "Studio Emilka",
            },
          },
        }),
    });
    mocks.withdraw.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entry: {
            id: "entry-1",
            sessionId: "session-1",
            state: "withdrawn",
          },
        }),
    });

    render(<PublicWaitlistManagementPage />);

    expect(
      await screen.findByRole("heading", { name: "Glazing workshop" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Studio Emilka/)).toBeInTheDocument();
    const leave = screen.getByRole("button", { name: "Leave waitlist" });
    expect(window.location.hash).toBe("#manage");
    expect(window.location.href).not.toContain(MANAGEMENT_TOKEN);
    await user.click(leave);

    await waitFor(() =>
      expect(mocks.withdraw).toHaveBeenCalledWith({
        tenantSlug: "studio-one",
        token: MANAGEMENT_TOKEN,
      }),
    );
    expect(window.location.hash).toBe("");
    expect(
      window.sessionStorage.getItem(WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY),
    ).toBeNull();
  });

  it("keeps a functional fragment fallback when token storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    window.history.replaceState(
      null,
      "",
      `/en/tenants/studio-one/waitlists/manage#verify=${VERIFICATION_TOKEN}`,
    );
    mocks.verify.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          managementToken: MANAGEMENT_TOKEN,
          entry: {
            id: "entry-1",
            sessionId: "session-1",
            state: "waiting",
          },
        }),
    });

    render(<PublicWaitlistManagementPage />);

    await waitFor(() =>
      expect(window.location.hash).toBe(
        `#manage=${encodeURIComponent(MANAGEMENT_TOKEN)}`,
      ),
    );
  });

  it("does not erase a raw offer bearer when session storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    window.history.replaceState(
      null,
      "",
      `/en/tenants/studio-one/waitlists/offer#offer=${OFFER_TOKEN}`,
    );
    mocks.inspect.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entryId: "entry-1",
          sessionId: "session-1",
          guestCheckoutAllowed: false,
          requiresAuthentication: true,
          price: null,
        }),
    });

    render(<WaitlistOfferPage />);

    await waitFor(() =>
      expect(mocks.inspect).toHaveBeenCalledWith({
        tenantSlug: "studio-one",
        token: OFFER_TOKEN,
      }),
    );
    expect(window.location.hash).toBe(`#offer=${OFFER_TOKEN}`);
  });

  it("accepts only bounded fragment tokens and preserves the offer on login", () => {
    expect(parseWaitlistHash(`#verify=${VERIFICATION_TOKEN}`)).toEqual({
      action: "verify",
      token: VERIFICATION_TOKEN,
    });
    expect(parseWaitlistHash(`#manage=${MANAGEMENT_TOKEN}`)).toEqual({
      action: "manage",
      token: MANAGEMENT_TOKEN,
    });
    expect(parseWaitlistHash("#verify=short")).toEqual({
      action: "",
      token: "",
    });
    expect(
      storeWaitlistManagementLink(
        { action: "manage", token: MANAGEMENT_TOKEN },
        window.sessionStorage,
      ),
    ).toBe(true);
    expect(parseWaitlistHash("#manage", window.sessionStorage)).toEqual({
      action: "manage",
      token: MANAGEMENT_TOKEN,
    });
    expect(
      window.sessionStorage.getItem(WAITLIST_MANAGEMENT_RESUME_STORAGE_KEY),
    ).toContain(MANAGEMENT_TOKEN);
    expect(getWaitlistOfferTokenFromHash(`#offer=${OFFER_TOKEN}`)).toBe(
      OFFER_TOKEN,
    );
    const storage = {
      value: new Map(),
      getItem(key) {
        return this.value.get(key) ?? null;
      },
      removeItem(key) {
        this.value.delete(key);
      },
      setItem(key, value) {
        this.value.set(key, value);
      },
    };
    expect(storeWaitlistOfferForResume(OFFER_TOKEN, storage)).toBe(true);
    const loginHref = buildWaitlistOfferLoginHref();
    expect(loginHref).toBe("/login?next=%2Fwaitlists%2Foffer%23resume");
    expect(loginHref).not.toContain(OFFER_TOKEN);
    expect(new URL(loginHref, "https://studio.test").search).not.toContain(
      OFFER_TOKEN,
    );
    expect(getWaitlistOfferTokenFromHash("#resume", storage)).toBe(OFFER_TOKEN);
    expect(getWaitlistOfferTokenFromHash("#resume", storage)).toBe("");
  });

  it("recovers and keeps the origin-scoped resume token out of the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/en/tenants/studio-one/waitlists/offer#resume",
    );
    expect(
      storeWaitlistOfferForResume(OFFER_TOKEN, window.sessionStorage),
    ).toBe(true);
    mocks.inspect.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entryId: "entry-1",
          sessionId: "session-1",
          guestCheckoutAllowed: false,
          requiresAuthentication: true,
          price: null,
        }),
    });

    render(<WaitlistOfferPage />);

    await waitFor(() =>
      expect(mocks.inspect).toHaveBeenCalledWith({
        tenantSlug: "studio-one",
        token: OFFER_TOKEN,
      }),
    );
    expect(
      window.sessionStorage.getItem(WAITLIST_OFFER_RESUME_STORAGE_KEY),
    ).toBe(OFFER_TOKEN);
    expect(window.location.hash).toBe("#resume");
    expect(window.location.href).not.toContain(OFFER_TOKEN);
    const signIn = await screen.findByRole("link", {
      name: "Sign in to continue",
    });
    expect(signIn).toHaveAttribute(
      "href",
      "/login?next=%2Fwaitlists%2Foffer%23resume",
    );
    expect(signIn.getAttribute("href")).not.toContain(OFFER_TOKEN);
  });

  it("renders payment resume and preserves its token for a checkout cancel return", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      null,
      "",
      "/en/tenants/studio-one/waitlists/offer#resume",
    );
    storeWaitlistOfferForResume(OFFER_TOKEN, window.sessionStorage);
    mocks.inspect.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entryId: "entry-1",
          sessionId: "session-1",
          state: "payment_pending",
          guestCheckoutAllowed: true,
          requiresAuthentication: false,
          price: null,
        }),
    });
    mocks.guestCheckout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          checkoutUrl: "https://checkout.stripe.com/c/pay/test",
        }),
    });

    render(<WaitlistOfferPage />);

    const resume = await screen.findByRole("button", {
      name: "Resume payment",
    });
    await user.type(
      screen.getByLabelText("Verified email"),
      "guest@example.test",
    );
    await user.click(resume);

    await waitFor(() =>
      expect(mocks.guestCheckout).toHaveBeenCalledWith({
        tenantSlug: "studio-one",
        token: OFFER_TOKEN,
        email: "guest@example.test",
        checkout: { locale: "en", origin: "http://localhost:3000" },
      }),
    );
    expect(
      window.sessionStorage.getItem(WAITLIST_OFFER_RESUME_STORAGE_KEY),
    ).toBe(OFFER_TOKEN);
    expect(window.location.search).not.toContain(OFFER_TOKEN);
  });

  it("resumes the real authenticated checkout after sign-in", async () => {
    const user = userEvent.setup();
    mocks.authenticated = true;
    window.history.replaceState(
      null,
      "",
      "/en/tenants/studio-one/waitlists/offer#resume",
    );
    storeWaitlistOfferForResume(OFFER_TOKEN, window.sessionStorage);
    mocks.inspect.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          entryId: "entry-1",
          sessionId: "session-1",
          state: "offered",
          guestCheckoutAllowed: false,
          requiresAuthentication: false,
          price: null,
          session: {
            id: "session-1",
            title: "Wheel throwing intensive",
            start: "2026-08-10T08:00:00.000Z",
            locationName: "Studio Olivie",
          },
        }),
    });
    mocks.checkout.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          checkoutUrl: "https://checkout.stripe.com/c/pay/customer",
        }),
    });

    render(<WaitlistOfferPage />);

    expect(
      await screen.findByRole("heading", { name: "Wheel throwing intensive" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Studio Olivie/)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Pay now" }));
    await waitFor(() =>
      expect(mocks.checkout).toHaveBeenCalledWith({
        waitlistOfferToken: OFFER_TOKEN,
        locale: "en",
        origin: "http://localhost:3000",
      }),
    );
    expect(
      window.sessionStorage.getItem(WAITLIST_OFFER_RESUME_STORAGE_KEY),
    ).toBe(OFFER_TOKEN);
  });
});
