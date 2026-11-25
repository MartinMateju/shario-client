import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/cs/courses/wheel",
  config: vi.fn(),
  product: vi.fn(),
  locale: vi.fn(),
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "x-shario-public-pathname": mocks.pathname }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("@/lib/publicTenant/server", () => ({
  getPublicTenantConfig: mocks.config,
}));
vi.mock("@/lib/publicTenant/courses.server", () => ({
  getPublicCourseProduct: mocks.product,
}));
vi.mock("@/lib/publicTenant/localeRouting", () => ({
  enforcePublicTenantRouteLocale: mocks.locale,
}));
vi.mock("@/components/customer-shell/CustomerTenantShell", () => ({
  default: ({ children }) => children,
}));
vi.mock("@/components/public-tenant/PublicTenantUnavailable", () => ({
  default: () => null,
}));

import PublicFoundationLayout from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/layout";

const input = {
  params: Promise.resolve({ tenantSlug: "klei", locale: "cs" }),
  children: "Course page",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/cs/courses/wheel";
  mocks.config.mockResolvedValue({ tenant: { slug: "klei" } });
  mocks.product.mockResolvedValue({ product: { id: "wheel" } });
  mocks.locale.mockResolvedValue(undefined);
});

describe("public course response status before streaming", () => {
  it("rejects a confirmed missing course before rendering the loading boundary", async () => {
    mocks.product.mockResolvedValue({ notFound: true });
    await expect(PublicFoundationLayout(input)).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(mocks.product).toHaveBeenCalledWith("klei", "wheel");
  });

  it("preserves published courses and the client recovery flow during transient outages", async () => {
    expect((await PublicFoundationLayout(input)).props.children).toBe(
      "Course page",
    );
    mocks.product.mockResolvedValue({ unavailable: true, notFound: false });
    expect((await PublicFoundationLayout(input)).props.children).toBe(
      "Course page",
    );
  });

  it.each([
    "/cs/courses",
    "/cs/book/wheel",
    "/cs/portal/courses/wheel",
    "/cs/courses/wheel/checkout",
    "/cs",
  ])("does not fetch product data for %s", async (pathname) => {
    mocks.pathname = pathname;
    await PublicFoundationLayout(input);
    expect(mocks.product).not.toHaveBeenCalled();
  });

  it("resolves the canonical host and language before checking product existence", async () => {
    mocks.locale.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(PublicFoundationLayout(input)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.product).not.toHaveBeenCalled();
  });
});
