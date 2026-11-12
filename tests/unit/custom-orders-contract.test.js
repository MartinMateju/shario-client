import { describe, it, expect, vi } from "vitest";
import {
  formatOrderDate,
  validateOrderFiles,
  orderStatus,
  orderPayload,
  createOrderDraft,
  validateOrderDraft,
  orderError,
} from "@/components/custom-orders/customOrders.utils";
import {
  buildDashboardNavigation,
  getActiveDashboardNavigation,
} from "@/components/dashboard/dashboard.navigation";
import { getWorkspaceRouteTitleKey } from "@/components/dashboard/workspaceRouteConfig";
const captured = vi.hoisted(() => ({ endpoints: {} }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    enhanceEndpoints: () => ({
      injectEndpoints: ({ endpoints }) => {
        captured.endpoints = endpoints({ query: (v) => v, mutation: (v) => v });
        return {};
      },
    }),
  },
}));
import "@/lib/features/customOrders/customOrdersApiSlice";

describe("custom orders contracts", () => {
  it("validates quotation precision for both whole-unit and decimal currencies", () => {
    const draft = createOrderDraft({
      title: "Cup",
      description: "Cup",
      materials: "Clay",
      startDate: "2030-02-10",
      deadline: "2030-02-20",
      locationId: "studio-1",
      customer: { name: "Alex" },
      quotedAmount: 12.5,
      currency: "JPY",
    });
    expect(validateOrderDraft(draft).quotedAmount).toBe("quotePrecision");
    expect(
      validateOrderDraft({ ...draft, currency: "CZK" }).quotedAmount,
    ).toBeUndefined();
    expect(
      validateOrderDraft({ ...draft, currency: "CZK", quotedAmount: "12.555" })
        .quotedAmount,
    ).toBe("quotePrecision");
    expect(
      validateOrderDraft({
        ...draft,
        currency: "CZK",
        quotedAmount: "100000001",
      }).quotedAmount,
    ).toBe("quote");
  });
  it("keeps custom orders under Sales independent of payment feature and highlights detail routes", () => {
    const navigation = buildDashboardNavigation({
      tenant: { modules: { payments: false } },
      workspaceAccess: { permissions: ["orders.view"] },
    });
    const sales = navigation.primary.find((item) => item.key === "sales");
    expect(sales.children.map((item) => item.key)).toContain("customOrders");
    expect(
      getActiveDashboardNavigation({
        pathname: "/app/custom-orders/one/edit",
        ...navigation,
      }),
    ).toMatchObject({ activeItemKey: "customOrders", activeGroupKey: "sales" });
    expect(getWorkspaceRouteTitleKey("/app/custom-orders/one")).toBe(
      "routeTitles.customOrders",
    );
    expect(
      buildDashboardNavigation({
        tenant: {},
        workspaceAccess: { permissions: ["bookings.view"] },
      }).visibleItems.has("customOrders"),
    ).toBe(false);
  });
  it("keeps dates on the intended calendar day even with a timezone west of UTC", () => {
    expect(formatOrderDate("2030-02-10", "en-US", "America/Los_Angeles")).toBe(
      "Feb 10, 2030",
    );
    expect(orderStatus({ status: "closed", isOverdue: true })).toBe("closed");
  });
  it("enforces total image and document limits before uploading", () => {
    const image = { type: "image/png", size: 100 };
    const pdf = { type: "application/pdf", size: 100 };
    expect(
      validateOrderFiles(
        [image],
        Array.from({ length: 5 }, () => ({ kind: "image" })),
      ),
    ).toBe("imageLimit");
    expect(
      validateOrderFiles(
        [pdf],
        Array.from({ length: 10 }, () => ({ kind: "document" })),
      ),
    ).toBe("documentLimit");
    expect(validateOrderFiles([{ type: "image/svg+xml", size: 100 }])).toBe(
      "fileType",
    );
    expect(
      validateOrderFiles([{ type: "image/png", size: 9 * 1024 * 1024 }]),
    ).toBe("fileSize");
    expect(validateOrderFiles([{ type: "application/pdf", size: 0 }])).toBe(
      "fileSize",
    );
    expect(validateOrderFiles([image, pdf])).toBeNull();
    const largePdf = { type: "application/pdf", size: 15 * 1024 * 1024 };
    expect(validateOrderFiles([largePdf, largePdf, largePdf])).toBe(
      "uploadTotalSize",
    );
    expect(validateOrderFiles([largePdf, largePdf])).toBeNull();
    expect(
      orderError(
        { status: 413, data: { code: "CUSTOM_ORDER_UPLOAD_TOTAL_SIZE" } },
        (value) => value,
      ),
    ).toBe("errors.uploadTotalSize");
  });
  it("uses explicit close/reopen and revision-bearing requests without any delete-order or payment endpoint", () => {
    expect(
      captured.endpoints.closeCustomOrder.query({
        id: "o1",
        revision: 2,
        reason: "completed",
      }),
    ).toEqual({
      url: "/custom-orders/o1/close",
      method: "POST",
      body: { revision: 2, reason: "completed" },
    });
    expect(
      captured.endpoints.reopenCustomOrder.query({
        id: "o1",
        revision: 3,
        reason: "Changed brief",
      }),
    ).toEqual({
      url: "/custom-orders/o1/reopen",
      method: "POST",
      body: { revision: 3, reason: "Changed brief" },
    });
    expect(
      Object.keys(captured.endpoints).some((key) =>
        /payment|refund|deleteCustomOrder/i.test(key),
      ),
    ).toBe(false);
  });
  it("does not leak contact lookup metadata or quotes into payments", () => {
    const body = orderPayload(
      createOrderDraft({
        customer: { name: "Alex", email: "", phone: "", memberNumber: 42 },
        quotedAmount: 0,
      }),
    );
    expect(body.customer).toEqual({ name: "Alex", email: "", phone: "" });
    expect(body.quotedAmount).toBe(0);
    expect(body).not.toHaveProperty("paymentStatus");
  });
});
