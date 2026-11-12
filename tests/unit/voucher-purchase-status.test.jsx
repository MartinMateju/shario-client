import { StrictMode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VoucherPurchaseStatusPage from "@/components/vouchers/purchase/VoucherPurchaseStatusPage";
import messages from "@/messages/en.json";
import { getVoucherAccessStorageKey } from "@/components/vouchers/purchase/voucherPurchaseAccess";
const mocks = vi.hoisted(() => ({
  tenantSlug: "clay-studio",
  orderId: "507f1f77bcf86cd799439012",
  request: vi.fn(),
  save: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ couponOrderId: mocks.orderId }),
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      let text = `${namespace}.${key}`
        .split(".")
        .reduce((value, part) => value?.[part], messages);
      for (const [name, value] of Object.entries(values))
        text = text.replaceAll(`{${name}}`, String(value));
      return text;
    },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: { slug: mocks.tenantSlug } }),
}));
vi.mock("@/lib/features/coupons/voucherPurchaseApi", () => ({
  requestVoucherPurchase: (...args) => mocks.request(...args),
}));
vi.mock(
  "@/components/vouchers/purchase/voucherPurchaseAccess",
  async (original) => ({
    ...(await original()),
    savePurchasedVoucherPdf: (...args) => mocks.save(...args),
  }),
);
const token = "a".repeat(43);
const ready = {
  status: "ready",
  paymentStatus: "paid",
  productName: "A day with clay",
  deliveryStatus: "sent",
  maskedEmail: "m***@example.test",
  documents: [{ index: 0, filename: "voucher-1.pdf" }],
  canResend: true,
};
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function setProof() {
  window.history.replaceState(
    {},
    "",
    `/?couponOrderId=${mocks.orderId}#accessToken=${token}`,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.tenantSlug = "clay-studio";
  mocks.orderId = "507f1f77bcf86cd799439012";
  setProof();
  mocks.request.mockResolvedValue(ready);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("voucher purchase status", () => {
  it("shows postal progress separately while keeping the same digital voucher available", async () => {
    mocks.request.mockResolvedValue({
      ...ready,
      physicalDelivery: {
        requested: true,
        status: "awaiting_dispatch",
        postageFeeMinor: 750,
        currency: "EUR",
        dispatchedAt: null,
      },
    });
    render(<VoucherPurchaseStatusPage />);
    expect(
      await screen.findByRole("heading", { name: "Postal delivery" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your studio will print and post your voucher."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/email backup and printed voucher use the same code/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download voucher 1" }),
    ).toBeEnabled();
    expect(screen.getByText("Postage: €7.5")).toBeInTheDocument();
  });
  it("never infers payment from an order id without its private proof", async () => {
    window.history.replaceState({}, "", `/?couponOrderId=${mocks.orderId}`);
    render(<VoucherPurchaseStatusPage />);
    expect(
      await screen.findByRole("heading", {
        name: "Open your private order link",
      }),
    ).toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Download voucher/ }),
    ).not.toBeInTheDocument();
  });
  it("distinguishes pending payment from confirmed payment being prepared", async () => {
    mocks.request
      .mockResolvedValueOnce({
        status: "pending_payment",
        paymentStatus: "pending",
      })
      .mockResolvedValueOnce({ status: "processing", paymentStatus: "paid" });
    render(<VoucherPurchaseStatusPage />);
    expect(
      await screen.findByRole("heading", {
        name: "Waiting for payment confirmation",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(
      await screen.findByRole("heading", {
        name: "Payment confirmed. Preparing your vouchers.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Download voucher/ }),
    ).not.toBeInTheDocument();
  });
  it("allows a paid PDF download even when email delivery failed", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    mocks.request.mockImplementation(async (args) =>
      args.action === "download"
        ? blob
        : { ...ready, deliveryStatus: "failed" },
    );
    render(<VoucherPurchaseStatusPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Download voucher 1" }),
    );
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(blob, 0));
    expect(mocks.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "download",
        tenantSlug: mocks.tenantSlug,
        orderId: mocks.orderId,
        accessToken: token,
        index: 0,
      }),
    );
    expect(
      screen.getByText(/We could not send the voucher email/),
    ).toBeInTheDocument();
  });
  it("shows network failure without claiming payment failed", async () => {
    mocks.request.mockRejectedValue(new Error("Network unavailable"));
    render(<VoucherPurchaseStatusPage />);
    expect(
      await screen.findByRole("heading", {
        name: "We could not check your order",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This does not mean your payment failed/),
    ).toBeInTheDocument();
  });
  it("clears stored expired or invalid access credentials", async () => {
    mocks.request.mockRejectedValue({ status: 404 });
    render(<VoucherPurchaseStatusPage />);
    await screen.findByRole("heading", {
      name: "Open your private order link",
    });
    expect(
      window.sessionStorage.getItem(
        getVoucherAccessStorageKey(mocks.tenantSlug, mocks.orderId),
      ),
    ).toBeNull();
  });
  it.each(["refunded", "revoked", "review_required"])(
    "withholds download and resend controls for %s",
    async (status) => {
      mocks.request.mockResolvedValue({ ...ready, status });
      render(<VoucherPurchaseStatusPage />);
      await screen.findByRole("heading", {
        name: messages.VoucherPurchase.states[status].title,
      });
      expect(
        screen.queryByRole("button", { name: /Download voucher/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Resend voucher email" }),
      ).not.toBeInTheDocument();
    },
  );
  it("shows expired voucher history without treating payment as expired", async () => {
    mocks.request.mockResolvedValue({
      ...ready,
      voucherExpired: true,
      canResend: false,
    });
    render(<VoucherPurchaseStatusPage />);
    expect(
      await screen.findByRole("button", { name: "Download voucher 1" }),
    ).toBeEnabled();
    expect(screen.getByRole("note")).toHaveTextContent(
      "These vouchers have expired.",
    );
    expect(
      screen.getByRole("button", { name: "Resend voucher email" }),
    ).toBeDisabled();
  });
  it("resends the same order to the original email and checks delivery again", async () => {
    render(<VoucherPurchaseStatusPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Resend voucher email" }),
    );
    await screen.findByText(/Your request was accepted/);
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "resend",
        orderId: mocks.orderId,
        accessToken: token,
      }),
    );
    await waitFor(() =>
      expect(
        mocks.request.mock.calls.filter(([args]) => !args.action),
      ).toHaveLength(2),
    );
    expect(
      screen.getByRole("button", { name: "Resend voucher email" }),
    ).toBeDisabled();
  });
  it("ignores and aborts a previous order's download when navigating to another order", async () => {
    const pending = deferred();
    mocks.request.mockImplementation((args) =>
      args.action === "download" ? pending.promise : Promise.resolve(ready),
    );
    const view = render(<VoucherPurchaseStatusPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Download voucher 1" }),
    );
    const request = mocks.request.mock.calls.find(
      ([args]) => args.action === "download",
    )[0];
    mocks.orderId = "507f1f77bcf86cd799439013";
    setProof();
    view.rerender(<VoucherPurchaseStatusPage />);
    await waitFor(() => expect(request.signal.aborted).toBe(true));
    await act(async () => {
      pending.resolve(new Blob(["old order"]));
    });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("does not show a stale status response after switching tenants", async () => {
    const first = deferred();
    mocks.request.mockImplementation((args) =>
      args.tenantSlug === "clay-studio"
        ? first.promise
        : Promise.resolve({
            status: "pending_payment",
            paymentStatus: "pending",
          }),
    );
    const view = render(<VoucherPurchaseStatusPage />);
    await waitFor(() => expect(mocks.request).toHaveBeenCalledOnce());
    mocks.tenantSlug = "another-studio";
    setProof();
    view.rerender(<VoucherPurchaseStatusPage />);
    await screen.findByRole("heading", {
      name: "Waiting for payment confirmation",
    });
    await act(async () => {
      first.resolve(ready);
    });
    expect(
      screen.queryByRole("button", { name: /Download voucher/ }),
    ).not.toBeInTheDocument();
  });
  it("retains the initial proof through StrictMode effect replay when storage is disabled", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    render(
      <StrictMode>
        <VoucherPurchaseStatusPage />
      </StrictMode>,
    );
    expect(
      await screen.findByRole("heading", { name: "Your vouchers are ready" }),
    ).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: token }),
    );
  });
});

describe("voucher delivery polling", () => {
  it("polls a scheduled email retry and stops after it has been sent", async () => {
    vi.useFakeTimers();
    mocks.request
      .mockResolvedValueOnce({
        ...ready,
        deliveryStatus: "failed",
        deliveryNextAttemptAt: new Date(Date.now() + 1000).toISOString(),
        canResend: false,
      })
      .mockResolvedValue(ready);
    render(<VoucherPurchaseStatusPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText(/We will retry automatically/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mocks.request).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
  it("bounds slow payment polling and keeps a manual check available", async () => {
    vi.useFakeTimers();
    mocks.request.mockResolvedValue({
      status: "pending_payment",
      paymentStatus: "pending",
    });
    render(<VoucherPurchaseStatusPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(123_000);
    });
    expect(
      screen.getByText(/Confirmation is taking longer than usual/),
    ).toBeInTheDocument();
    const count = mocks.request.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(mocks.request).toHaveBeenCalledTimes(count);
    expect(screen.getByRole("button", { name: "Check again" })).toBeEnabled();
  });
  it("resumes polling when a hidden tab becomes visible within the original budget", async () => {
    vi.useFakeTimers();
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    mocks.request
      .mockResolvedValueOnce({
        status: "pending_payment",
        paymentStatus: "pending",
      })
      .mockResolvedValue(ready);
    render(<VoucherPurchaseStatusPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    hidden = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mocks.request).toHaveBeenCalledTimes(1);
    hidden = false;
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("heading", { name: "Your vouchers are ready" }),
    ).toBeInTheDocument();
  });
});
