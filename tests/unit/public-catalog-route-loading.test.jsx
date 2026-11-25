import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  overview: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock("@/lib/publicTenant/pageVisibility", () => ({
  requirePublicTenantPageVisible: mocks.config,
}));
vi.mock("@/lib/publicTenant/courses.server", () => ({
  getPublicCourseInitialData: mocks.overview,
  getPublicCourseLocationRequest: () => "grohova",
}));
vi.mock("@/lib/publicTenant/commerceCatalog.server", () => ({
  getPublicCommerceCatalog: mocks.catalog,
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key) => key,
}));
vi.mock("@/components/courses/CustomerCoursesPage", () => ({
  PublicCustomerCoursesPage: () => null,
}));
vi.mock("@/components/memberships/PublicMembershipCatalog", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicVoucherCatalogPage", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: () => null,
}));
import Courses from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/courses/page";
import Memberships from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/memberships/page";
import Vouchers from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/vouchers/page";
import { Children, isValidElement } from "react";

function findSnapshot(element) {
  if (!isValidElement(element)) return undefined;
  if (Object.hasOwn(element.props, "initialData"))
    return element.props.initialData;
  return Children.toArray(element.props.children)
    .map(findSnapshot)
    .find((value) => value !== undefined);
}

const args = {
  params: Promise.resolve({ tenantSlug: "klei", locale: "cs" }),
  searchParams: Promise.resolve({ location: "grohova" }),
};
describe.each([
  ["courses", Courses, mocks.overview],
  ["memberships", Memberships, mocks.catalog],
  ["vouchers", Vouchers, mocks.catalog],
])("public %s route", (kind, route, read) => {
  const snapshot = { tenantSlug: "klei", kind, data: [] };
  beforeEach(() => {
    vi.clearAllMocks();
    read.mockResolvedValue(snapshot);
  });
  it("starts the catalogue read while visibility is pending and waits for permission to render", async () => {
    let finish;
    mocks.config.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const output = route(args);
    await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
    finish({ tenant: { publicCapabilities: { [kind]: true } } });
    expect(findSnapshot(await output)).toBe(snapshot);
  });
  it.each([
    { unavailable: true, tenant: null },
    { tenant: { publicCapabilities: {} } },
  ])(
    "discards the snapshot when config cannot enable the catalogue",
    async (visibility) => {
      mocks.config.mockResolvedValueOnce(visibility);
      expect(findSnapshot(await route(args))).toBeNull();
    },
  );
  it("keeps the hidden page response when the anonymous catalogue succeeds", async () => {
    mocks.config.mockRejectedValueOnce(
      new Error("NEXT_HTTP_ERROR_FALLBACK;404"),
    );
    await expect(route(args)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
