import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCALE_REGISTRY } from "@/i18n/locales";

const mocks = vi.hoisted(() => ({
  data: null,
  language: "EN",
  load: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("orderId=order-12345678"),
}));
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector({}),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectIsAuthenticated: () => true,
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => mocks.language,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useLazyGetMyOrderConfirmationQuery: () => [mocks.load, { data: mocks.data }],
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/pottery-pieces/PieceCheckoutResult", () => ({
  default: () => null,
}));

import Success from "@/app/[locale]/tenants/[tenantSlug]/portal/success/page";

const catalogs = Object.fromEntries(
  Object.keys(LOCALE_REGISTRY).map((locale) => [
    locale,
    JSON.parse(
      readFileSync(
        resolve(process.cwd(), `src/messages/${locale}.json`),
        "utf8",
      ),
    ),
  ]),
);

function showConfirmation(locale = "en") {
  mocks.language = locale === "cs" ? "CZ" : locale.toUpperCase();
  render(
    <NextIntlClientProvider locale={locale} messages={catalogs[locale]}>
      <Success />
    </NextIntlClientProvider>,
  );
}

describe("membership-paid booking confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.language = "EN";
    mocks.data = {
      orderId: "order-12345678",
      status: "processed_order",
      isPaid: true,
      terminal: true,
      currency: "CZK",
      totals: {
        grossAmountMinor: 25000,
        expectedAmountMinor: 0,
        paidAmountMinor: 0,
      },
      paymentAllocations: [{ method: "membership_credit", amountMinor: 25000 }],
      bookings: [{ productName: "Studio session" }],
    };
  });

  it.each(Object.keys(LOCALE_REGISTRY))(
    "shows the covered booking value and zero additional payment in %s",
    (locale) => {
      showConfirmation(locale);
      const copy = catalogs[locale].BookingConfirmation.membershipPayment;
      for (const [key, amount] of [
        ["bookingValue", 250],
        ["coveredByMembership", 250],
        ["additionalPayment", 0],
      ]) {
        expect(copy[key]).toBeTruthy();
        const label = screen.getByText(copy[key]);
        expect(label.tagName).toBe("DT");
        const value = label.parentElement.querySelector("dd").textContent;
        expect(value).toContain(String(amount));
        if (amount === 0) expect(value).not.toContain("250");
      }
      expect(screen.queryByText(/membership credit/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(locale === "cs" ? "Celkem" : "Total"),
      ).not.toBeInTheDocument();
      expect(mocks.load).not.toHaveBeenCalled();
    },
  );

  it.each(["stripe", "credits"])(
    "preserves the ordinary %s order total",
    (method) => {
      mocks.data.paymentAllocations = [{ method, amountMinor: 25000 }];
      if (method === "stripe") {
        mocks.data.totals.expectedAmountMinor = 25000;
        mocks.data.totals.paidAmountMinor = 25000;
      }
      showConfirmation();
      expect(screen.getByText("Total").parentElement).toHaveTextContent("250");
      expect(screen.getByText(method).parentElement).toHaveTextContent("250");
      expect(screen.queryByText("Additional payment")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["missing payment evidence", (data) => delete data.totals.paidAmountMinor],
    [
      "nonzero expected payment",
      (data) => {
        data.totals.expectedAmountMinor = 5000;
      },
    ],
    [
      "a recorded cash payment",
      (data) => {
        data.totals.paidAmountMinor = 5000;
      },
    ],
    [
      "partial membership cover",
      (data) => {
        data.paymentAllocations[0].amountMinor = 20000;
      },
    ],
    [
      "mixed payment methods",
      (data) => {
        data.paymentAllocations = [
          { method: "membership_credit", amountMinor: 20000 },
          { method: "stripe", amountMinor: 5000 },
        ];
      },
    ],
  ])("does not claim zero additional payment with %s", (_reason, change) => {
    change(mocks.data);
    showConfirmation();
    expect(screen.queryByText("Additional payment")).not.toBeInTheDocument();
    expect(screen.getByText("Total").parentElement).toHaveTextContent("250");
  });
});
