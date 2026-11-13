import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  purchase: vi.fn(),
  language: "CZ",
  locale: "cs",
  user: { id: "customer-1" },
  location: { activeLocationReference: "atelier-brno" },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));
vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({ useLocale: () => mocks.locale }))(...args),
  );
});
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => mocks.user,
  selectCurrentTenant: () => ({
    id: "tenant-1",
    settings: { currency: "CZK" },
  }),
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => mocks.language,
}));
vi.mock("@/lib/features/credits/creditsSlice", () => ({
  selectShowCreditPurchase: () => true,
  hideCreditPurchaseModal: () => ({ type: "credits/hideCreditPurchaseModal" }),
}));
vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  usePurchaseCreditsMutation: () => [mocks.purchase, { isLoading: false }],
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => null,
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => mocks.location,
}));

import CreditPurchaseModal from "@/components/credits/CreditPurchaseModal";

const purchaseButton = () => screen.getByRole("button", { name: /^Zakoupit / });
const packageRadio = (amount) =>
  screen.getAllByRole("radio").find((radio) => radio.value === String(amount));

describe("credit purchase dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.language = "CZ";
    mocks.locale = "cs";
    mocks.user = { id: "customer-1" };
    mocks.location = { activeLocationReference: "atelier-brno" };
    mocks.purchase.mockReturnValue({ unwrap: async () => ({}) });
    window.history.replaceState({}, "", "/");
  });

  it("labels the selected package in Czech and updates the payment amount", async () => {
    render(<CreditPurchaseModal />);
    expect(
      screen.getByRole("dialog", { name: "Zakoupit kredity" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Vyberte balíček" }),
    ).toBeVisible();
    expect(packageRadio(1000)).toBeChecked();
    expect(screen.getByText("Vybráno")).toBeInTheDocument();
    expect(screen.queryByText("Selected")).not.toBeInTheDocument();
    await userEvent.click(packageRadio(500));
    expect(packageRadio(500)).toBeChecked();
    expect(purchaseButton()).toHaveTextContent(/500,00\s*Kč/);
  });

  it.each([
    undefined,
    "",
    "javascript:alert(1)",
    "https://unrelated.example/pay",
  ])(
    "keeps the dialog open with a retryable error for an unusable checkout URL: %s",
    async (url) => {
      mocks.purchase.mockReturnValue({ unwrap: async () => ({ url }) });
      render(<CreditPurchaseModal />);
      await userEvent.click(purchaseButton());
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Platební stránku se nepodařilo otevřít. Zkuste to prosím znovu.",
      );
      expect(purchaseButton()).toBeEnabled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );

  it("locks immediate repeated submissions until a failed attempt resolves, then permits retry", async () => {
    let rejectPurchase;
    mocks.purchase.mockReturnValue({
      unwrap: () =>
        new Promise((_resolve, reject) => {
          rejectPurchase = reject;
        }),
    });
    render(<CreditPurchaseModal />);
    const submit = purchaseButton();
    act(() => {
      fireEvent.click(submit);
      fireEvent.click(submit);
    });
    expect(mocks.purchase).toHaveBeenCalledExactlyOnceWith({
      amount: 1000,
      locale: "cs",
      locationReference: "atelier-brno",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Čekejte prosím");
    expect(submit).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zavřít" })).toBeDisabled();
    expect(packageRadio(500)).toBeDisabled();
    await act(async () =>
      rejectPurchase({ data: { code: "TENANT_PAYMENTS_NOT_READY" } }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Online platby tohoto studia",
    );
    expect(purchaseButton()).toBeEnabled();
    mocks.purchase.mockReturnValue({ unwrap: async () => ({}) });
    await userEvent.click(purchaseButton());
    expect(mocks.purchase).toHaveBeenCalledTimes(2);
  });

  it("opens a valid checkout URL with the chosen amount and active studio, keeping submission locked", async () => {
    mocks.purchase.mockReturnValue({
      unwrap: async () => ({
        url: new URL("/#credit-checkout", window.location.origin).href,
      }),
    });
    render(<CreditPurchaseModal />);
    await userEvent.click(packageRadio(2000));
    await userEvent.click(purchaseButton());
    expect(mocks.purchase).toHaveBeenCalledExactlyOnceWith({
      amount: 2000,
      locale: "cs",
      locationReference: "atelier-brno",
    });
    await waitFor(() => expect(window.location.hash).toBe("#credit-checkout"));
    expect(
      screen.getByRole("button", { name: "Zpracovávání..." }),
    ).toBeDisabled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it("does not invent a studio when the optional location context is absent", async () => {
    mocks.location = null;
    render(<CreditPurchaseModal />);
    await userEvent.click(purchaseButton());
    expect(mocks.purchase).toHaveBeenCalledExactlyOnceWith({
      amount: 1000,
      locale: "cs",
    });
  });

  it("unlocks a checkout restored from browser history without losing the selected package", async () => {
    mocks.purchase.mockReturnValue({
      unwrap: async () => ({
        url: new URL("/#credit-checkout", window.location.origin).href,
      }),
    });
    render(<CreditPurchaseModal />);
    await userEvent.click(packageRadio(500));
    await userEvent.click(purchaseButton());
    const pendingButton = screen.getByRole("button", {
      name: "Zpracovávání...",
    });
    expect(pendingButton).toBeDisabled();
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: false }),
      ),
    );
    expect(pendingButton).toBeDisabled();
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    expect(purchaseButton()).toBeEnabled();
    expect(screen.getByRole("button", { name: "Zavřít" })).toBeEnabled();
    expect(packageRadio(500)).toBeChecked();
    expect(packageRadio(500)).toBeEnabled();
    mocks.purchase.mockReturnValue({ unwrap: async () => ({}) });
    await userEvent.click(purchaseButton());
    expect(mocks.purchase).toHaveBeenCalledTimes(2);
    expect(mocks.purchase).toHaveBeenLastCalledWith({
      amount: 500,
      locale: "cs",
      locationReference: "atelier-brno",
    });
  });

  it("explains the disabled purchase in the selected language when signed out", () => {
    mocks.user = null;
    mocks.language = "EN";
    mocks.locale = "en";
    render(<CreditPurchaseModal />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please sign in to purchase credits.",
    );
    expect(screen.getByRole("button", { name: /^Purchase / })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
    expect(mocks.purchase).not.toHaveBeenCalled();
  });
});
