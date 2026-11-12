import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: null,
  state: null,
  locale: "cs",
  pathname: "/portal",
  params: new URLSearchParams("location=vaclavska&tab=studio-calendar"),
  router: { replace: vi.fn() },
}));
vi.mock("next-intl", () => ({ useLocale: () => mocks.locale }));
vi.mock("next/navigation", () => ({ useSearchParams: () => mocks.params }));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => mocks.context,
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => mocks.router,
}));

import CustomerLocalePreferenceSync from "@/components/customer-shell/CustomerLocalePreferenceSync";
import {
  getCustomerDefaultLocale,
  persistCustomerCurrentLocale,
} from "@/i18n/customerLocalePreference";

beforeEach(() => {
  for (const cookie of document.cookie.split(";"))
    document.cookie = `${cookie.split("=")[0].trim()}=; Path=/; Max-Age=0`;
  mocks.context = {
    surface: "portal",
    tenant: {
      slug: "studio-a",
      settings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
    },
  };
  mocks.state = {
    auth: {
      token: "token",
      userInfo: { id: "customer-a", customerDefaultLanguage: "en" },
      tenant: { slug: "studio-a" },
      authContext: "customer",
      workspaceAccessResolved: true,
      workspaceAccess: null,
      sessionReady: true,
    },
  };
  mocks.locale = "cs";
  mocks.pathname = "/portal";
  mocks.router.replace.mockClear();
  window.history.replaceState({}, "", "/cs/portal#calendar");
});

describe("restored customer language", () => {
  it("mirrors the account default without overriding the current explicit URL", () => {
    render(<CustomerLocalePreferenceSync />);
    expect(getCustomerDefaultLocale("studio-a")).toBe("en");
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(window.location.href).toContain("/cs/portal#calendar");
  });
  it("leaves an explicit current choice in place", () => {
    persistCustomerCurrentLocale("cs", "studio-a");
    render(<CustomerLocalePreferenceSync />);
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it("retains a now-unavailable saved default for the entry resolver to clamp", () => {
    mocks.locale = "en";
    mocks.state.auth.userInfo.customerDefaultLanguage = "de";
    render(<CustomerLocalePreferenceSync />);
    expect(getCustomerDefaultLocale("studio-a")).toBe("de");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it("does not change current language when the saved default is edited", () => {
    mocks.state.auth.userInfo.customerDefaultLanguage = null;
    const view = render(<CustomerLocalePreferenceSync />);
    mocks.state.auth.userInfo = {
      ...mocks.state.auth.userInfo,
      customerDefaultLanguage: "en",
    };
    view.rerender(<CustomerLocalePreferenceSync />);
    expect(getCustomerDefaultLocale("studio-a")).toBe("en");
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it("keeps an explicit URL when no account default is set", () => {
    mocks.locale = "en";
    mocks.state.auth.userInfo.customerDefaultLanguage = null;
    render(<CustomerLocalePreferenceSync />);
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
  it.each(["auth", "transaction"])(
    "does not interfere with %s callbacks",
    (surface) => {
      mocks.context.surface = surface;
      const view = render(<CustomerLocalePreferenceSync />);
      expect(mocks.router.replace).not.toHaveBeenCalled();
      mocks.context = { ...mocks.context, surface: "portal" };
      view.rerender(<CustomerLocalePreferenceSync />);
      expect(mocks.router.replace).not.toHaveBeenCalled();
    },
  );
  it.each(["preview", "degraded", "tenant mismatch", "workspace", "not ready"])(
    "skips preference effects for %s",
    (reason) => {
      if (reason === "preview") mocks.context.previewMode = true;
      if (reason === "degraded") mocks.context.degraded = true;
      if (reason === "tenant mismatch")
        mocks.state.auth.tenant.slug = "studio-b";
      if (reason === "workspace") mocks.state.auth.authContext = "workspace";
      if (reason === "not ready") mocks.state.auth.sessionReady = false;
      render(<CustomerLocalePreferenceSync />);
      expect(mocks.router.replace).not.toHaveBeenCalled();
      expect(getCustomerDefaultLocale("studio-a")).toBeNull();
    },
  );
});
