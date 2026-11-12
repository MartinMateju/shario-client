import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tenantThemeMock = vi.hoisted(() => ({
  appearanceSurface: undefined,
  current: {
    stylePresetId: "classic-editorial-v1",
    backgroundColor: "#FCFBF8",
    textColor: "#292925",
    textForeground: "#292925",
    style: {
      "--tenant-accent": "#4056D6",
      "--tenant-font-display": 'var(--font-editorial, "Playfair Display")',
    },
  },
}));

vi.mock("@/components/auth/CustomerAuthControls", () => ({
  default: () => <div data-testid="customer-auth-controls" />,
}));

vi.mock("@/components/headers/Header", () => ({
  default: () => <div data-testid="public-header" />,
}));

vi.mock("@/components/public-tenant/PublicTenantFooter", () => ({
  default: () => <div data-testid="public-footer" />,
}));

vi.mock("@/components/public-tenant/PublicTenantAnnouncementSpacer", () => ({
  default: () => <div data-testid="announcement-spacer" />,
}));
vi.mock("@/components/customer-shell/CustomerLocalePreferenceSync", () => ({
  default: () => null,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", async () => {
  const { createContext, useContext } = await import("react");
  const Context = createContext(null);
  return {
    default: ({ children, initialTenant, surface }) => (
      <Context.Provider
        value={{
          tenant: initialTenant,
          surface,
          appearanceSurface: tenantThemeMock.appearanceSurface,
        }}
      >
        {children}
      </Context.Provider>
    ),
    usePublicTenant: () => useContext(Context),
  };
});

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getPublicTenantTheme: () => tenantThemeMock.current,
}));

vi.mock("@/components/public-tenant/publicTenantPortalTheme", () => ({
  getPublicTenantPortalTheme: () => ({
    ...tenantThemeMock.current,
    backgroundColor: "#111827",
    textForeground: "#F3F4F6",
  }),
}));

import PublicTenantChrome from "@/components/public-tenant/PublicTenantChrome";

describe("public tenant auth chrome", () => {
  beforeEach(() => {
    tenantThemeMock.appearanceSurface = undefined;
  });
  const tenant = { name: "Studio Olivie" };

  it("keeps a portal payment result in transaction chrome with personal colours", () => {
    tenantThemeMock.appearanceSurface = "portal";
    render(
      <PublicTenantChrome tenant={tenant} surface="transaction">
        <main>Payment result</main>
      </PublicTenantChrome>,
    );
    const chrome = document.querySelector("[data-customer-portal-theme]");
    expect(chrome).toHaveStyle({
      backgroundColor: "#111827",
      color: "#F3F4F6",
    });
    expect(screen.getByTestId("public-header")).toBeInTheDocument();
    expect(
      screen.queryByTestId("customer-auth-controls"),
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      "Classic Editorial",
      "classic-editorial-v1",
      'var(--font-editorial, "Playfair Display")',
    ],
    [
      "Modern Minimal",
      "modern-minimal-v1",
      'var(--font-modern-display, "Barlow Condensed")',
    ],
    ["Warm Organic", "warm-organic-v1", 'var(--font-warm-display, "Fraunces")'],
  ])(
    "propagates %s through the headerless auth chrome",
    (_, presetId, font) => {
      tenantThemeMock.current = {
        ...tenantThemeMock.current,
        stylePresetId: presetId,
        style: {
          ...tenantThemeMock.current.style,
          "--tenant-font-display": font,
        },
      };

      render(
        <PublicTenantChrome tenant={tenant} surface="auth">
          <main>Login</main>
        </PublicTenantChrome>,
      );

      const chrome = document.querySelector("[data-customer-auth-chrome]");

      expect(screen.getByTestId("customer-auth-controls")).toBeInTheDocument();
      expect(chrome).toHaveAttribute("data-customer-auth-chrome", "headerless");
      expect(chrome).toHaveAttribute("data-tenant-style", presetId);
      expect(chrome.style.getPropertyValue("--tenant-font-display")).toBe(font);
      expect(chrome).toHaveStyle({ fontFamily: "var(--tenant-font-body)" });
      expect(chrome).toHaveClass("-mt-[var(--header-height)]", "min-h-dvh");
      expect(screen.queryByTestId("public-header")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("announcement-spacer"),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("public-footer")).not.toBeInTheDocument();
    },
  );

  it("preserves the complete chrome on public surfaces", () => {
    render(
      <PublicTenantChrome tenant={tenant} surface="public">
        <main>Studio</main>
      </PublicTenantChrome>,
    );

    expect(screen.getByTestId("public-header")).toBeInTheDocument();
    expect(screen.getByTestId("announcement-spacer")).toBeInTheDocument();
    expect(screen.getByTestId("public-footer")).toBeInTheDocument();
    expect(
      screen.queryByTestId("customer-auth-controls"),
    ).not.toBeInTheDocument();
  });
});
