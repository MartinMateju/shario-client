import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getVoucherAccessStorageKey,
  getVoucherOrderId,
  readVoucherPurchaseAccess,
} from "@/components/vouchers/purchase/voucherPurchaseAccess";
import { requestVoucherPurchase } from "@/lib/features/coupons/voucherPurchaseApi";

const orderId = "507f1f77bcf86cd799439012";
const token = "a".repeat(43);
const tenantSlug = "clay-studio";
const args = { tenantSlug, orderId, accessToken: token };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("private voucher purchase access", () => {
  it("captures a fragment proof, removes it from browser history, and scopes refresh recovery", () => {
    const history = { state: { preserved: true }, replaceState: vi.fn() };
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    const location = {
      pathname: "/en/vouchers/success",
      search: `?couponOrderId=${orderId}`,
      hash: `#accessToken=${token}`,
    };
    expect(
      readVoucherPurchaseAccess({
        tenantSlug,
        orderId,
        history,
        storage,
        location,
      }),
    ).toBe(token);
    expect(storage.setItem).toHaveBeenCalledWith(
      getVoucherAccessStorageKey(tenantSlug, orderId),
      token,
    );
    expect(history.replaceState).toHaveBeenCalledWith(
      { preserved: true },
      "",
      `/en/vouchers/success?couponOrderId=${orderId}`,
    );
    storage.getItem.mockReturnValue(token);
    expect(
      readVoucherPurchaseAccess({
        tenantSlug: "another-studio",
        orderId,
        history,
        storage,
        location: { ...location, hash: "" },
      }),
    ).toBe(token);
    expect(storage.getItem).toHaveBeenLastCalledWith(
      getVoucherAccessStorageKey("another-studio", orderId),
    );
  });
  it("uses the initial proof when browser storage is unavailable", () => {
    expect(
      readVoucherPurchaseAccess({
        tenantSlug,
        orderId,
        location: { pathname: "/", search: "", hash: `#accessToken=${token}` },
        history: { replaceState: vi.fn() },
        storage: {
          setItem: () => {
            throw new Error("disabled");
          },
        },
      }),
    ).toBe(token);
  });
  it.each(["short", "a".repeat(42), "a".repeat(44), "<script>"])(
    "rejects invalid proof %s without falling back to an older proof",
    (invalid) => {
      const storage = {
        getItem: vi.fn().mockReturnValue(token),
        setItem: vi.fn(),
      };
      expect(
        readVoucherPurchaseAccess({
          tenantSlug,
          orderId,
          storage,
          history: { replaceState: vi.fn() },
          location: {
            pathname: "/",
            search: "",
            hash: `#accessToken=${invalid}`,
          },
        }),
      ).toBe("");
      expect(storage.getItem).not.toHaveBeenCalled();
      expect(storage.setItem).not.toHaveBeenCalled();
    },
  );
  it("does not accept an arbitrary order id", () => {
    expect(getVoucherOrderId("../another-order")).toBe("");
    expect(getVoucherOrderId(orderId)).toBe(orderId);
  });
  it.each(["status", "resend", "download"])(
    "uses a full tenant-scoped POST path for %s with no bearer URL, cookies, or referrer",
    async (action) => {
      const blob = new Blob(["%PDF-1.7"], { type: "application/pdf" });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/pdf" }),
        json: async () => ({ status: "ready" }),
        blob: async () => blob,
      });
      vi.stubGlobal("fetch", fetchMock);
      await requestVoucherPurchase({ ...args, action, index: 1 });
      const [url, request] = fetchMock.mock.calls[0];
      expect(url).toContain(
        `/public/tenants/${tenantSlug}/vouchers/orders/${orderId}/${action}`,
      );
      expect(url).not.toContain(token);
      expect(request).toMatchObject({
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
      });
      expect(request.headers.authorization).toBeUndefined();
      expect(JSON.parse(request.body)).toEqual({
        accessToken: token,
        ...(action === "download" ? { index: 1 } : {}),
      });
    },
  );
  it("does not download an HTML success page as a PDF", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
      }),
    );
    await expect(
      requestVoucherPurchase({ ...args, action: "download", index: 0 }),
    ).rejects.toThrow("Expected a voucher PDF");
  });
  it("preserves HTTP failure status without exposing server response details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          code: "VOUCHER_RESEND_RATE_LIMITED",
          secret: token,
        }),
      }),
    );
    await expect(
      requestVoucherPurchase({ ...args, action: "resend" }),
    ).rejects.toMatchObject({
      status: 429,
      code: "VOUCHER_RESEND_RATE_LIMITED",
      message: "Voucher request failed",
    });
  });
  it("times out stalled requests so a customer can retry", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            ),
          ),
      ),
    );
    const request = requestVoucherPurchase(args);
    const assertion = expect(request).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });
});
