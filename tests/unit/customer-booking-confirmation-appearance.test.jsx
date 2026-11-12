import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";

const mocks = vi.hoisted(() => ({
  query: {},
  search: "intent=booking-intent",
  checkout: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("react-redux", () => ({ useSelector: () => ({}) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@/lib/features/bookingIntents/bookingIntentsApiSlice", () => ({
  bookingPaymentOptionCoversTotal: (option) => option.selectable !== false,
  getSafeBookingIntentToken: (value) => value,
  useGetBookingIntentQuery: () => mocks.query,
  useCheckoutBookingIntentMutation: () => [mocks.checkout, {}],
}));

import CustomerBookingConfirmationPage from "@/components/bookings/CustomerBookingConfirmationPage";

const themedPage = (appearance) => (
  <div
    data-testid="portal-theme"
    style={
      getPublicTenantPortalTheme({
        publicSite: { customerPortal: { appearance } },
      }).style
    }
  >
    <CustomerBookingConfirmationPage />
  </div>
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = "intent=booking-intent";
  mocks.query = {
    data: {
      intent: { location: { slug: "vaclavska" }, productId: "studio-product" },
      quote: { totalMinor: 2500, subtotalMinor: 2500, currency: "CZK" },
      paymentOptions: [{ optionId: "credits", method: "money_credits" }],
      terms: "Studio terms",
    },
  };
  mocks.checkout.mockReturnValue({
    unwrap: () => Promise.resolve({ orderId: "order-12345678" }),
  });
});

describe("booking confirmation appearance", () => {
  it.each([
    "membership_open_studio_only",
    "membership_member_only",
    "membership_insufficient_hours",
    "membership_outside_paid_period",
  ])("explains why personal hours cannot pay: %s", (reason) => {
    mocks.query.data.paymentOptions = [
      {
        optionId: "member-hours",
        method: "membership_credits",
        unit: "minute",
        selectable: false,
        unavailableReason: reason,
      },
    ];
    render(themedPage({}));
    expect(screen.getByRole("radio")).toBeDisabled();
    expect(screen.getByText("payment.membershipHours")).toBeInTheDocument();
    expect(screen.getByText(`payment.${reason}`)).toBeInTheDocument();
  });

  it("uses the selected personal-hour benefit at checkout", async () => {
    mocks.query.data.paymentOptions = [
      {
        optionId: "member-hours",
        method: "membership_credits",
        benefitKey: "personal_time",
        unit: "minute",
        required: 90,
        availableUnits: 480,
        selectable: true,
      },
    ];
    render(themedPage({}));
    expect(screen.getByText("payment.hoursSummary")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "terms.accept" }));
    fireEvent.click(screen.getByRole("button", { name: "payment.confirm" }));
    await waitFor(() =>
      expect(mocks.checkout).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "membership_credits",
          membershipBenefitKey: "personal_time",
        }),
      ),
    );
  });
  it.each([
    ["#FFFFFF", "#111827"],
    ["#111827", "#FFFFFF"],
  ])(
    "pairs page %s and card %s colors without changing checkout state",
    async (backgroundColor, surfaceColor) => {
      const { rerender } = render(
        themedPage({
          backgroundColor,
          surfaceColor,
          textColor: "#111111",
          primaryButtonColor: "#F6C65B",
        }),
      );
      expect(screen.getByRole("main")).toHaveClass(
        "bg-[var(--tenant-background)]",
        "text-[var(--tenant-text)]",
      );
      const heading = screen.getByRole("heading", {
        name: "title",
        exact: true,
      });
      expect(heading).toHaveClass("text-[var(--tenant-heading-on-surface)]");
      expect(heading.closest("section")).toHaveClass(
        "bg-[var(--tenant-surface)]",
        "text-[var(--tenant-text-on-surface)]",
      );
      const pay = screen.getByRole("button", { name: "payment.confirm" });
      expect(pay).toHaveClass("customer-portal-button-primary");
      expect(pay.closest("form")).toHaveClass(
        "bg-[var(--tenant-surface)]",
        "text-[var(--tenant-text-on-surface)]",
      );
      expect(pay).toBeDisabled();
      fireEvent.click(screen.getByRole("checkbox", { name: "terms.accept" }));
      rerender(
        themedPage({ surfaceColor: "#FFF4E6", primaryButtonColor: "#3366AA" }),
      );
      expect(
        screen
          .getByTestId("portal-theme")
          .style.getPropertyValue("--tenant-surface")
          .toUpperCase(),
      ).toBe("#FFF4E6");
      expect(
        screen.getByRole("checkbox", { name: "terms.accept" }),
      ).toBeChecked();
      expect(pay).toBeEnabled();
      fireEvent.click(pay);
      await waitFor(() =>
        expect(mocks.checkout).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethod: "money_credits",
            termsAccepted: true,
            token: "booking-intent",
          }),
        ),
      );
      await waitFor(() =>
        expect(mocks.replace).toHaveBeenCalledWith(
          "/portal/success?orderId=order-12345678&location=vaclavska",
        ),
      );
    },
  );

  it.each(["loading", "invalid", "expired"])(
    "retains portal surfaces in the %s state",
    (state) => {
      if (state === "loading") mocks.query = { isLoading: true };
      if (state === "invalid") mocks.search = "";
      if (state === "expired")
        mocks.query = { isError: true, error: { status: 410 } };
      render(
        themedPage({ backgroundColor: "#0F172A", surfaceColor: "#263445" }),
      );
      const heading = screen.getByRole("heading", { name: `${state}.title` });
      expect(screen.getByRole("main")).toHaveClass(
        "bg-[var(--tenant-background)]",
      );
      expect(heading.closest("section")).toHaveClass(
        "bg-[var(--tenant-surface)]",
        "text-[var(--tenant-text-on-surface)]",
      );
      if (state !== "loading")
        expect(screen.getByRole("link")).toHaveClass(
          "customer-portal-button-primary",
        );
    },
  );
});
