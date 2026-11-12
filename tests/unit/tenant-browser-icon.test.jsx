import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicTenantConfig: vi.fn(),
  headers: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/publicTenant/server", () => ({
  getPublicTenantConfig: mocks.getPublicTenantConfig,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
}));
vi.mock("@/components/public-tenant/TenantSiteRefresh", () => ({
  default: (props) => {
    mocks.refresh(props);
    return null;
  },
}));
vi.mock("@/components/ai/PublicStudioConcierge", () => ({
  default: () => <aside aria-label="Studio assistant" />,
}));
vi.mock("@/components/customer-shell/CustomerTenantShell", () => ({
  default: ({ children }) => children,
}));
vi.mock("@/components/public-tenant/PublicTenantUnavailable", () => ({
  default: () => null,
}));
vi.mock("@/lib/publicTenant/localeRouting", () => ({
  enforcePublicTenantRouteLocale: vi.fn(),
}));

import TenantLayout, {
  generateMetadata,
} from "@/app/[locale]/tenants/[tenantSlug]/layout";
import * as publicLayout from "@/app/[locale]/tenants/[tenantSlug]/(public-foundation)/layout";
import * as authLayout from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/layout";

const paramsFor = (tenantSlug = "clay-house", locale = "cs") =>
  Promise.resolve({ tenantSlug, locale });
const platformIcons = {
  icon: [
    { url: "/favicon.svg", type: "image/svg+xml" },
    {
      url: "/favicon.ico",
      sizes: "16x16 32x32 48x48 64x64",
      type: "image/x-icon",
    },
  ],
  apple: [
    {
      url: "/brand/shario-app-icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
  ],
  shortcut: "/favicon.ico",
};
const publishedTenant = (
  faviconUrl = "https://media.example/clay-house/favicon-v1.png",
  slug = "clay-house",
) => ({
  notFound: false,
  unavailable: false,
  tenant: {
    slug,
    publicSite: {
      branding: { displayName: "Clay House", faviconUrl },
      pages: { home: { description: { cs: "Keramické studio" } } },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TENANT_ROOT_DOMAIN", "shario.io");
  vi.stubEnv("CUSTOM_DOMAIN_TENANTS", "{}");
  mocks.headers.mockResolvedValue(
    new Headers({ host: "clay-house.shario.io" }),
  );
  mocks.getPublicTenantConfig.mockResolvedValue(publishedTenant());
});

describe("shared tenant browser-icon metadata", () => {
  it("sets browser, shortcut and Apple icons at the common tenant ancestor", async () => {
    const metadata = await generateMetadata({ params: paramsFor() });
    const icon = "https://media.example/clay-house/favicon-v1.png";

    expect(metadata.icons).toEqual({ icon, shortcut: icon, apple: icon });
    expect(mocks.getPublicTenantConfig).toHaveBeenCalledWith("clay-house");
    expect(metadata.metadataBase.href).toBe("https://clay-house.shario.io/");
    expect(metadata.title).toEqual({
      default: "Clay House",
      template: "%s | Clay House",
    });
    expect(metadata.alternates.canonical).toBe("/cs");
  });

  it("uses the latest published icon when metadata is refreshed", async () => {
    const firstIcon = "https://media.example/clay-house/favicon-v1.png";
    const nextIcon = "https://media.example/clay-house/favicon-v2.png";
    mocks.getPublicTenantConfig
      .mockResolvedValueOnce(publishedTenant(firstIcon))
      .mockResolvedValueOnce(publishedTenant(nextIcon));

    expect((await generateMetadata({ params: paramsFor() })).icons.icon).toBe(
      firstIcon,
    );
    expect((await generateMetadata({ params: paramsFor() })).icons).toEqual({
      icon: nextIcon,
      shortcut: nextIcon,
      apple: nextIcon,
    });
  });

  it("restores explicit platform icons after a published icon is removed", async () => {
    mocks.getPublicTenantConfig
      .mockResolvedValueOnce(publishedTenant())
      .mockResolvedValueOnce(publishedTenant(""));

    expect(
      (await generateMetadata({ params: paramsFor() })).icons,
    ).toBeDefined();
    expect((await generateMetadata({ params: paramsFor() })).icons).toEqual(
      platformIcons,
    );
  });

  it.each([
    ["missing favicon", { publicSite: { branding: {} } }],
    ["null favicon", { publicSite: { branding: { faviconUrl: null } } }],
    ["missing branding", { publicSite: {} }],
    ["missing public site", {}],
  ])("preserves the platform fallback for %s", async (_label, tenant) => {
    mocks.getPublicTenantConfig.mockResolvedValue({
      notFound: false,
      unavailable: false,
      tenant: { slug: "clay-house", ...tenant },
    });

    const metadata = await generateMetadata({ params: paramsFor() });

    expect(metadata.icons).toEqual(platformIcons);
    expect(metadata.metadataBase.href).toBe("https://clay-house.shario.io/");
  });

  it.each([
    [
      "an unavailable public-config service",
      { unavailable: true, notFound: false },
    ],
    ["a tenant that was not found", { unavailable: false, notFound: true }],
  ])("does not break shared metadata for %s", async (_label, status) => {
    mocks.getPublicTenantConfig.mockResolvedValue({ tenant: null, ...status });

    const metadata = await generateMetadata({ params: paramsFor() });

    expect(metadata.icons).toEqual(platformIcons);
    expect(metadata.title.default).toBe("Clay House");
  });

  it("does not leak one tenant's icon into another tenant's metadata", async () => {
    const firstIcon = "https://media.example/clay-house/favicon.png";
    const secondIcon = "https://media.example/new-studio/favicon.png";
    mocks.getPublicTenantConfig.mockImplementation(async (slug) =>
      publishedTenant(slug === "clay-house" ? firstIcon : secondIcon, slug),
    );

    const first = await generateMetadata({ params: paramsFor("clay-house") });
    const second = await generateMetadata({ params: paramsFor("new-studio") });

    expect(first.icons.icon).toBe(firstIcon);
    expect(second.icons).toEqual({
      icon: secondIcon,
      shortcut: secondIcon,
      apple: secondIcon,
    });
    expect(second.metadataBase.href).toBe("https://new-studio.shario.io/");
    expect(mocks.getPublicTenantConfig).toHaveBeenNthCalledWith(
      2,
      "new-studio",
    );
  });

  it.each(["", "../other-studio", "bad/slug", "admin"])(
    "rejects invalid tenant slug %j before requesting tenant branding",
    async (tenantSlug) => {
      await expect(
        generateMetadata({ params: paramsFor(tenantSlug) }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mocks.getPublicTenantConfig).not.toHaveBeenCalled();
      expect(mocks.headers).not.toHaveBeenCalled();
    },
  );

  it("leaves icon ownership at the shared ancestor instead of public or auth layouts", async () => {
    const publicMetadata = await publicLayout.generateMetadata({
      params: paramsFor(),
    });
    const authMetadata = authLayout.generateMetadata
      ? await authLayout.generateMetadata({ params: paramsFor() })
      : authLayout.metadata;

    expect(publicMetadata).not.toHaveProperty("icons");
    expect(authMetadata?.icons).toBeUndefined();
    expect((await generateMetadata({ params: paramsFor() })).icons.icon).toBe(
      "https://media.example/clay-house/favicon-v1.png",
    );
  });
});

describe("tenant-wide published-site refresh mounting", () => {
  it("mounts a tenant-scoped refresh listener alongside any nested surface content", async () => {
    render(
      await TenantLayout({
        params: paramsFor("clay-house"),
        children: <main>Nested tenant content</main>,
      }),
    );

    expect(screen.getByRole("main")).toHaveTextContent("Nested tenant content");
    expect(
      screen.getByRole("complementary", { name: "Studio assistant" }),
    ).toBeVisible();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledWith({ tenantSlug: "clay-house" });
  });

  it("does not mount refresh or child content for an invalid tenant", async () => {
    await expect(
      TenantLayout({
        params: paramsFor("../other-studio"),
        children: <main>Nested tenant content</main>,
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
