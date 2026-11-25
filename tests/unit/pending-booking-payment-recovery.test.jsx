import {
  act,
  fireEvent,
  render as renderUi,
  screen,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import cartReducer, {
  resetBookingCheckoutAttempt,
} from "@/lib/features/cart/cartSlice";

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  dispatch: vi.fn(),
  search: "orderId=64b000000000000000000001&location=grohova",
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useCancelPendingBookingCheckoutMutation: () => [mocks.cancel, {}],
}));
import Cancel from "@/app/[locale]/tenants/[tenantSlug]/portal/cancel/page";
import csMessages from "@/messages/cs.json";

const render = (ui) =>
  renderUi(
    <NextIntlClientProvider
      locale="cs"
      messages={csMessages}
      timeZone="Europe/Prague"
    >
      {ui}
    </NextIntlClientProvider>,
  );
const orderId = "64b000000000000000000001";
const cancelled = {
  orderId,
  status: "cancelled_order",
  reservationReleased: true,
};
const clickCancel = () =>
  fireEvent.click(
    screen.getByRole("button", { name: "Zrušit nezaplacené rezervace" }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = `orderId=${orderId}&location=grohova`;
  mocks.cancel.mockReturnValue({ unwrap: () => Promise.resolve(cancelled) });
});

describe("pending booking payment recovery", () => {
  it("does not cancel on return, and resets only the checkout attempt after explicit confirmed release", async () => {
    render(<Cancel />);
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Zpět k rezervacím" }),
    ).toHaveAttribute("href", "/portal?location=grohova");
    clickCancel();
    await screen.findByText(/Nezaplacené rezervace v této platbě jsou zrušené/);
    expect(mocks.cancel).toHaveBeenCalledExactlyOnceWith({ orderId });
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(
      resetBookingCheckoutAttempt(),
    );
    const previous = {
      cart: [{ id: "saved-booking" }, { id: "piece" }],
      isOpen: false,
    };
    const next = cartReducer(previous, mocks.dispatch.mock.calls[0][0]);
    expect(next.cart).toEqual(previous.cart);
    expect(next.bookingCheckoutAttempt).toBe(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("locks repeat clicks until the server responds", async () => {
    let resolve;
    mocks.cancel.mockReturnValue({
      unwrap: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    render(<Cancel />);
    clickCancel();
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.cancel).toHaveBeenCalledOnce();
    await act(async () => resolve(cancelled));
  });

  it.each([
    ["CHECKOUT_PAYMENT_CONFIRMED", /Platba už proběhla/],
    ["CHECKOUT_PAYMENT_PENDING", /Platba se ještě ověřuje/],
  ])("does not retry or reset the cart for %s", async (code, message) => {
    mocks.cancel.mockReturnValue({
      unwrap: () => Promise.reject({ status: 409, data: { code } }),
    });
    render(<Cancel />);
    clickCancel();
    await screen.findByText(message);
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zkontrolovat stav platby" }),
    ).toHaveAttribute(
      "href",
      `/portal/success?orderId=${orderId}&location=grohova`,
    );
  });

  it("allows retry after an uncertain network result without claiming cancellation", async () => {
    mocks.cancel.mockReturnValueOnce({
      unwrap: () => Promise.reject({ status: "FETCH_ERROR" }),
    });
    render(<Cancel />);
    clickCancel();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Zrušení se nepodařilo potvrdit",
    );
    expect(mocks.dispatch).not.toHaveBeenCalled();
    clickCancel();
    await screen.findByText(/Nezaplacené rezervace v této platbě jsou zrušené/);
    expect(mocks.cancel).toHaveBeenCalledTimes(2);
  });

  it("requires an authoritative release response for the requested order", async () => {
    mocks.cancel.mockReturnValue({
      unwrap: () => Promise.resolve({ ...cancelled, orderId: "another-order" }),
    });
    render(<Cancel />);
    clickCancel();
    await screen.findByRole("alert");
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it.each(["", "orderId=invalid", `orderId=${orderId}&voucher=1`])(
    "keeps old and unsupported return links read-only: %s",
    (search) => {
      mocks.search = search;
      render(<Cancel />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(mocks.cancel).not.toHaveBeenCalled();
    },
  );
});
