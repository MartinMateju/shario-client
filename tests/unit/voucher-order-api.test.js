import { describe, expect, it, vi } from "vitest";
const captured = vi.hoisted(() => ({ endpoints: null }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      captured.endpoints = endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      });
      return {};
    },
  },
}));
import "@/lib/features/coupons/couponsApiSlice";

describe("protected voucher order API", () => {
  it("encodes order ids and sends only the dispatch idempotency key", () => {
    expect(captured.endpoints.getCouponOrder.query("order/id")).toBe(
      "/coupons/orders/order%2Fid",
    );
    expect(
      captured.endpoints.dispatchCouponOrder.query({
        orderId: "order/id",
        operationId: "operation-1",
      }),
    ).toEqual({
      url: "/coupons/orders/order%2Fid/dispatch",
      method: "POST",
      body: { operationId: "operation-1" },
    });
  });
  it("keeps protected PDFs serializable and preserves their exact bytes", async () => {
    const query = captured.endpoints.downloadCouponOrderPdf.query({
      orderId: "order/id",
      index: 2,
    });
    expect(query).toMatchObject({
      url: "/coupons/orders/order%2Fid/download",
      method: "POST",
      body: { index: 2 },
    });
    const bytes = new Uint8Array([37, 80, 68, 70, 0, 255, 128]);
    const result = await query.responseHandler(
      new Response(bytes, { headers: { "content-type": "application/pdf" } }),
    );
    expect(
      Uint8Array.from(atob(result.base64), (character) =>
        character.charCodeAt(0),
      ),
    ).toEqual(bytes);
  });
  it("does not save a successful non-PDF response as a voucher", async () => {
    const handler = captured.endpoints.downloadCouponOrderPdf.query({
      orderId: "id",
      index: 0,
    }).responseHandler;
    await expect(
      handler(
        new Response("<html>sign in</html>", {
          headers: { "content-type": "text/html" },
        }),
      ),
    ).rejects.toThrow("Expected a voucher PDF");
    await expect(
      handler(
        new Response(JSON.stringify({ code: "FORBIDDEN" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    ).resolves.toEqual({ code: "FORBIDDEN" });
  });
});
