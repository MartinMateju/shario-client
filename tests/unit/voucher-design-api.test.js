import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));
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

await import("@/lib/features/products/productsApiSlice");

const design = {
  version: 1,
  layout: "split",
  colors: { background: "#FFFFFF", text: "#191919", accent: "#D87050" },
  typography: { font: "sans", titleWeight: "bold" },
  content: {
    brandName: "Clay Studio",
    title: "A day with clay",
    subtitle: "Make something yours",
    message: "Enjoy your gift",
    footer: "See you at the studio",
  },
  assets: { logoKey: null, imageKey: null },
  imageFit: "cover",
};
const previewPayload = {
  design,
  productName: "Clay gift",
  amountMinor: 50000,
  currency: "CZK",
  validity: { mode: "months", months: 12 },
  locale: "en",
};

describe("voucher editor API", () => {
  it("loads tenant design defaults with GET", () => {
    const query = captured.endpoints.getVoucherDesignDefaults.query();
    const request = typeof query === "string" ? { url: query } : query;
    expect(request.url).toBe("/products/voucher-design/defaults");
    expect(request.method || "GET").toBe("GET");
    expect(request.body).toBeUndefined();
  });

  it("passes asset FormData through unchanged without setting a multipart boundary", () => {
    const body = new FormData();
    const file = new File([new Uint8Array([137, 80, 78, 71])], "logo.png", {
      type: "image/png",
    });
    body.append("file", file);
    body.append("purpose", "logo");
    const query = captured.endpoints.uploadVoucherDesignAsset.query(body);

    expect(query.url).toBe("/products/voucher-design/assets");
    expect(query.method).toBe("POST");
    expect(query.body).toBe(body);
    expect(query.body.get("file")).toBe(file);
    expect(query.body.get("purpose")).toBe("logo");
    expect(query.headers).toBeUndefined();
  });

  it("posts the same JSON design and preview details used for the sample PDF", () => {
    const preview =
      captured.endpoints.previewVoucherDesign.query(previewPayload);
    const pdf =
      captured.endpoints.downloadVoucherDesignPdf.query(previewPayload);

    expect(preview).toEqual({
      url: "/products/voucher-design/preview",
      method: "POST",
      body: previewPayload,
    });
    expect(preview.body).toBe(previewPayload);
    expect(pdf).toMatchObject({
      url: "/products/voucher-design/pdf",
      method: "POST",
      body: previewPayload,
    });
    expect(pdf.body).toBe(previewPayload);
  });

  it("converts a binary PDF spanning multiple chunks into serializable base64 without corrupting bytes", async () => {
    const bytes = Uint8Array.from({ length: 20001 }, (_, index) => index % 256);
    const response = {
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(bytes.buffer),
      json: vi.fn(),
    };
    const { responseHandler } =
      captured.endpoints.downloadVoucherDesignPdf.query(previewPayload);
    const result = await responseHandler(response);

    expect(result).toEqual({ base64: Buffer.from(bytes).toString("base64") });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(response.arrayBuffer).toHaveBeenCalledOnce();
    expect(response.json).not.toHaveBeenCalled();
  });

  it("preserves structured server errors from PDF requests instead of encoding them as files", async () => {
    const error = {
      code: "VOUCHER_DESIGN_INVALID",
      message: "The design needs a title",
      details: { field: "content.title" },
    };
    const response = {
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue(error),
      arrayBuffer: vi.fn(),
    };
    const { responseHandler } =
      captured.endpoints.downloadVoucherDesignPdf.query(previewPayload);

    expect(await responseHandler(response)).toBe(error);
    expect(response.json).toHaveBeenCalledOnce();
    expect(response.arrayBuffer).not.toHaveBeenCalled();
  });

  it.each(["getProducts", "getPublicProducts", "getCustomerCatalog"])(
    "preserves voucher design fields through %s normalization",
    (endpoint) => {
      const input = {
        id: "voucher-1",
        type: "coupon",
        name: "Clay gift",
        price: 500,
        currency: "CZK",
        hasVoucherDesign: true,
        voucherDesign: design,
      };
      const [product] = captured.endpoints[endpoint].transformResponse({
        products: [input],
      });

      expect(product).toMatchObject({
        id: "voucher-1",
        _id: "voucher-1",
        kind: "voucher",
        hasVoucherDesign: true,
        voucherDesign: design,
      });
      expect(product.voucherDesign).toEqual(design);
      expect(product.voucherTemplate).toBeUndefined();
    },
  );

  it("preserves design readiness when a public DTO omits private design configuration", () => {
    const product = captured.endpoints.getPublicProduct.transformResponse({
      product: {
        id: "voucher-public",
        kind: "voucher",
        hasVoucherDesign: true,
      },
    });

    expect(product).toMatchObject({
      id: "voucher-public",
      _id: "voucher-public",
      hasVoucherDesign: true,
    });
    expect(product.voucherDesign).toBeUndefined();
  });
});
