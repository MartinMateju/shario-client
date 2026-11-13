import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  bookingQuery: {},
  creditQuery: {},
  pieceQuery: {},
  loadBooking: vi.fn(),
  loadCredit: vi.fn(),
  loadPiece: vi.fn(),
  dispatch: vi.fn(),
  replace: vi.fn(),
  locale: "en",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => mocks.locale,
      useTranslations: () => (key) => key,
    }))(...args),
    [undefined],
  );
});
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector({}),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectIsAuthenticated: () => true,
  getAuthCacheIdentity: () => "customer-a",
  selectCurrentTenant: () => ({
    customerCapabilities: {
      myWork: true,
    },
  }),
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useLazyGetMyOrderConfirmationQuery: () => [
    mocks.loadBooking,
    mocks.bookingQuery,
  ],
  useLazyGetCheckoutOrderStatusQuery: () => [
    mocks.loadCredit,
    mocks.creditQuery,
  ],
}));
vi.mock("@/lib/features/potteryPieces/potteryPiecesApiSlice", () => ({
  useLazyGetPieceCheckoutOrderQuery: () => [mocks.loadPiece, mocks.pieceQuery],
  useResumePieceCheckoutMutation: () => [vi.fn(), {}],
  useCancelPieceCheckoutMutation: () => [vi.fn(), {}],
}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    util: {
      invalidateTags: (tags) => ({
        type: "invalidate",
        payload: tags,
      }),
    },
  },
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => null,
}));
import Success from "@/app/[locale]/tenants/[tenantSlug]/portal/success/page";
import Cancel from "@/app/[locale]/tenants/[tenantSlug]/portal/cancel/page";
import CreditCancel from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/cancel/page";
import CreditSuccess from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/purchase-success/page";
import LegacyCreditSuccess from "@/app/[locale]/tenants/[tenantSlug]/portal/credits/success/page";
import Capacity from "@/app/[locale]/tenants/[tenantSlug]/portal/kapacita/page";
import Overlap from "@/app/[locale]/tenants/[tenantSlug]/portal/overlap/page";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";
import { mergePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";
const studio = {
  name: "Clay studio",
  publicSite: {
    customerPortal: {
      appearance: {
        backgroundColor: "#FFFFFF",
        surfaceColor: "#EEEEEE",
        textColor: "#111111",
        primaryButtonColor: "#112299",
      },
    },
  },
};
const personal = {
  backgroundColor: "#111111",
  surfaceColor: "#222222",
  textColor: "#EEEEEE",
  headingColor: "#FFFFFF",
  primaryButtonColor: "#FFCC00",
};
const orderId = "64b000000000000000000001";
function Appearance({ children, preferences = personal }) {
  return (
    <div
      data-testid="appearance"
      style={
        getPublicTenantTheme(mergePortalAppearance(studio, preferences), {
          surface: "portal",
        }).style
      }
    >
      {children}
    </div>
  );
}
function expectResultPalette() {
  const root = screen.getByTestId("appearance");
  expect(root.style.getPropertyValue("--tenant-background")).toBe("#111111");
  expect(root.style.getPropertyValue("--tenant-surface")).toBe("#222222");
  expect(root.firstElementChild).toHaveClass("bg-[var(--tenant-background)]");
  for (const heading of screen.getAllByRole("heading")) {
    expect(heading.className).toMatch(
      /text-\[var\(--tenant-heading-(?:on-surface|color)\)\]/,
    );
  }
  // Neutral surfaces and copy must not override the selected dark palette.
  expect(root.innerHTML).not.toMatch(
    /(?:bg-white|bg-brand-offset|text-gray-\d|text-ink|(?:bg|text|border)-\[#[\dA-F])/i,
  );
  expect(root.querySelector(".customer-portal-button-primary")).toHaveClass(
    "bg-[var(--tenant-portal-button)]",
    "text-[var(--tenant-portal-button-foreground)]",
  );
}
describe("portal payment results follow personal colors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locale = "en";
    mocks.searchParams = new URLSearchParams(
      `orderId=${orderId}&location=vaclavska`,
    );
    mocks.bookingQuery = {
      data: {
        status: "processed_order",
        isPaid: true,
        terminal: true,
        confirmation: {
          bookings: [
            {
              productName: "Studio session",
              locationName: "Václavská",
            },
          ],
          totals: {
            grossAmountMinor: 2500,
            currency: "CZK",
          },
        },
      },
    };
    mocks.creditQuery = {
      data: {
        status: "processed_order",
        isPaid: true,
        terminal: true,
      },
    };
    mocks.pieceQuery = {};
  });
  it("translates payment allocation methods while preserving amounts", () => {
    mocks.locale = "nl";
    mocks.bookingQuery.data.confirmation.paymentAllocations = [
      { method: "stripe", amountMinor: 1000 },
      { method: "credits", amountMinor: 500 },
      { method: "membership_credit", amountMinor: 1000 },
      { method: "unknown_method", amountMinor: 0 },
    ];
    render(
      <Appearance>
        <Success />
      </Appearance>,
    );
    expect(screen.getByText("Betaalkaart")).toBeVisible();
    expect(screen.getByText("Studiotegoed")).toBeVisible();
    expect(screen.getByText("Lidmaatschapsvoordeel")).toBeVisible();
    expect(screen.getByText("Betalingsbron")).toBeVisible();
    expect(
      screen.queryByText(/membership.credit|unknown.method|stripe/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/10/).length).toBeGreaterThan(0);
  });
  it("themes booking details and restores studio colors without reconciling the payment again", () => {
    const view = render(
      <Appearance>
        <Success />
      </Appearance>,
    );
    expectResultPalette();
    expect(screen.getByText("Studio session")).toHaveClass(
      "text-[var(--tenant-text-on-surface)]",
    );
    expect(screen.getByText("Total").parentElement).toHaveClass(
      "text-[var(--tenant-text-on-surface)]",
    );
    expect(
      screen.getByRole("link", {
        name: "Proceed to bookings",
      }),
    ).toHaveAttribute("href", "/portal?location=vaclavska");
    const reconciliations = mocks.dispatch.mock.calls.length;
    view.rerender(
      <Appearance
        preferences={{
          backgroundColor: "",
          surfaceColor: "",
          textColor: "",
          primaryButtonColor: "",
        }}
      >
        <Success />
      </Appearance>,
    );
    const style = screen.getByTestId("appearance").style;
    expect(style.getPropertyValue("--tenant-background")).toBe("#FFFFFF");
    expect(style.getPropertyValue("--tenant-surface")).toBe("#EEEEEE");
    expect(style.getPropertyValue("--tenant-portal-button")).toBe("#112299");
    expect(mocks.dispatch).toHaveBeenCalledTimes(reconciliations);
  });
  it.each(["pending", "failed", "unavailable", "invalid"])(
    "themes the %s booking result and preserves retry behavior",
    (state) => {
      if (state === "invalid") mocks.searchParams.delete("orderId");
      mocks.bookingQuery = {
        data: {
          status: state === "failed" ? "failed_order" : "pending_order",
          terminal: state === "failed",
        },
        isError: state === "unavailable",
      };
      render(
        <Appearance>
          <Success />
        </Appearance>,
      );
      expectResultPalette();
      if (["failed", "unavailable"].includes(state)) {
        fireEvent.click(
          screen.getByRole("button", {
            name: "Check again",
          }),
        );
        expect(mocks.loadBooking).toHaveBeenCalledWith({
          orderId,
        });
      }
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["booking cancellation", Cancel],
    ["credit cancellation", CreditCancel],
    ["capacity conflict", Capacity],
    ["overlap conflict", Overlap],
  ])("themes %s including its return action", (_name, Page) => {
    render(
      <Appearance>
        <Page />
      </Appearance>,
    );
    expectResultPalette();
    expect(
      screen
        .getByRole("link", {
          name: "Back to bookings",
        })
        .getAttribute("href"),
    ).toMatch(/^\/portal/);
  });
  it.each(["success", "pending", "failed", "unavailable", "invalid"])(
    "themes the %s credit result without changing verification or recovery",
    (state) => {
      if (state === "invalid") mocks.searchParams.delete("orderId");
      mocks.creditQuery = {
        originalArgs: {
          orderId,
          ownerScope: "customer-a",
        },
        currentData: {
          orderId,
          status:
            state === "success"
              ? "processed_order"
              : state === "failed"
                ? "failed_order"
                : "pending_order",
          isPaid: state === "success",
          terminal: ["success", "failed"].includes(state),
        },
        isError: state === "unavailable",
      };
      render(
        <Appearance>
          <CreditSuccess />
        </Appearance>,
      );
      expectResultPalette();
      expect(
        screen.getByRole("link", {
          name: "actions.viewCredits",
        }),
      ).toHaveAttribute("href", "/portal/credits?location=vaclavska");
      if (["failed", "unavailable"].includes(state)) {
        fireEvent.click(
          screen.getByRole("button", {
            name: "actions.retry",
          }),
        );
        expect(mocks.loadCredit).toHaveBeenCalledWith({
          orderId,
          ownerScope: "customer-a",
        });
      }
      if (state !== "success") expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it("uses the page text palette while credit verification loads", () => {
    mocks.creditQuery = {
      isLoading: true,
    };
    render(
      <Appearance>
        <CreditSuccess />
      </Appearance>,
    );
    expect(screen.getByRole("status")).toHaveClass(
      "bg-[var(--tenant-background)]",
      "text-[var(--tenant-text)]",
    );
    expect(screen.getByText("loading")).toHaveClass(
      "text-[var(--tenant-muted-text)]",
    );
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("keeps the legacy credit redirect and its loading palette", () => {
    render(
      <Appearance>
        <LegacyCreditSuccess />
      </Appearance>,
    );
    expect(screen.getByRole("status")).toHaveClass(
      "bg-[var(--tenant-background)]",
    );
    expect(mocks.replace).toHaveBeenCalledWith(
      `/portal/credits/purchase-success?orderId=${orderId}&location=vaclavska`,
    );
  });
});
