import { describe, expect, it } from "vitest";

import {
  getPublicTenantNavigation,
  getPublicTenantPrimaryAction,
  getPublicTenantTheme,
  isPublicTenantPageVisible,
  normalizePublicTenant,
} from "@/components/public-tenant/publicTenant.config";

const tenantWith = (overrides = {}) => ({
  slug: "studio-olivie",
  name: "Studio Olivie",
  publicCapabilities: {
    bookStudio: true,
    memberships: true,
    vouchers: true,
    help: true,
  },
  publicSite: {
    branding: { displayName: "Studio Olivie" },
    header: {
      navOrder: ["book", "memberships", "vouchers", "help"],
      hiddenItems: [],
      primaryCta: "auto",
    },
  },
  ...overrides,
});

describe("public tenant navigation", () => {
  it.each([
    ["public page", { pages: { courses: { visible: false } } }],
    [
      "customer Courses page",
      { customerPortal: { pages: { courses: { enabled: false } } } },
    ],
  ])(
    "honours the disabled %s on public course routes and navigation",
    (_name, publicSite) => {
      const tenant = tenantWith({
        publicCapabilities: { courses: true, memberships: true },
        publicSite: { ...publicSite, header: { primaryCta: "courses" } },
      });

      expect(isPublicTenantPageVisible(tenant, "courses")).toBe(false);
      expect(
        getPublicTenantNavigation(tenant).map((item) => item.key),
      ).not.toContain("courses");
      expect(getPublicTenantPrimaryAction(tenant)).toEqual({
        key: "memberships",
        href: "/memberships",
      });
      expect(normalizePublicTenant(tenant).publicCapabilities.courses).toBe(
        true,
      );
      expect(isPublicTenantPageVisible(tenant, "memberships")).toBe(true);
    },
  );

  it("keeps public course navigation configurable without disabling guest browsing", () => {
    const tenant = tenantWith({
      publicCapabilities: { courses: true },
      publicSite: {
        header: { hiddenItems: ["courses"] },
        customerPortal: { navigation: { courses: { visible: false } } },
      },
    });

    expect(isPublicTenantPageVisible(tenant, "courses")).toBe(true);
    expect(getPublicTenantNavigation(tenant)).toEqual([]);
    expect(getPublicTenantPrimaryAction(tenant)).toEqual({
      key: "courses",
      href: "/courses",
    });
  });
  it("inserts the new voucher destination before Studio guide for legacy orders", () => {
    const normalized = normalizePublicTenant(
      tenantWith({
        publicSite: {
          branding: { displayName: "Studio Olivie" },
          header: {
            navOrder: ["book", "courses", "memberships", "help"],
            hiddenItems: [],
            primaryCta: "auto",
          },
        },
      }),
    );

    expect(normalized.publicSite.header.navOrder).toEqual([
      "book",
      "courses",
      "memberships",
      "vouchers",
      "help",
    ]);
  });

  it("exposes only published public capabilities in the configured order", () => {
    const navigation = getPublicTenantNavigation(tenantWith());

    expect(navigation).toEqual([
      { key: "book", href: "/book" },
      { key: "memberships", href: "/memberships" },
      { key: "vouchers", href: "/vouchers" },
      { key: "help", href: "/help" },
    ]);
  });

  it("does not infer a public page from private tenant modules", () => {
    const normalized = normalizePublicTenant({
      slug: "studio-private",
      modules: {
        bookings: true,
        memberships: true,
        vouchers: true,
        knowledge: true,
      },
      billing: "PRIVATE_SENTINEL_DO_NOT_RENDER",
      publicCapabilities: {},
    });

    expect(getPublicTenantNavigation(normalized)).toEqual([]);
    expect(normalized).not.toHaveProperty("modules");
    expect(normalized).not.toHaveProperty("billing");
    expect(JSON.stringify(normalized)).not.toContain(
      "PRIVATE_SENTINEL_DO_NOT_RENDER",
    );
  });

  it("keeps hidden navigation out of menus without disabling the capability", () => {
    const tenant = tenantWith({
      publicSite: {
        branding: { displayName: "Studio Olivie" },
        header: {
          navOrder: ["vouchers", "book", "unknown", "help"],
          hiddenItems: ["vouchers"],
          primaryCta: "vouchers",
        },
      },
    });

    expect(getPublicTenantNavigation(tenant)).toEqual([
      { key: "book", href: "/book" },
      { key: "help", href: "/help" },
      { key: "memberships", href: "/memberships" },
    ]);
    expect(normalizePublicTenant(tenant).publicCapabilities.vouchers).toBe(
      true,
    );
    expect(getPublicTenantPrimaryAction(tenant)).toEqual({
      key: "vouchers",
      href: "/vouchers",
    });
  });

  it("falls back to the first enabled action when a preferred action is disabled", () => {
    const tenant = tenantWith({
      publicCapabilities: {
        bookStudio: false,
        courses: false,
        memberships: false,
        vouchers: true,
        help: true,
      },
      publicSite: {
        branding: { displayName: "Studio Olivie" },
        header: {
          navOrder: ["book", "memberships", "vouchers", "help"],
          hiddenItems: [],
          primaryCta: "book",
        },
      },
    });

    expect(getPublicTenantPrimaryAction(tenant)).toEqual({
      key: "vouchers",
      href: "/vouchers",
    });
  });

  it("exposes the complete public theme token contract", () => {
    const theme = getPublicTenantTheme(tenantWith());

    expect(theme.style).toMatchObject({
      "--tenant-background": expect.any(String),
      "--tenant-surface": expect.any(String),
      "--tenant-text-muted": expect.any(String),
      "--tenant-border": expect.any(String),
    });
  });
});
