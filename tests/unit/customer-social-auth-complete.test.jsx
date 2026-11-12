import { render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentCustomerLocale: null,
  getCustomerCurrentLocale: vi.fn(),
  locale: "en",
  search: "",
  replace: vi.fn(),
  refresh: vi.fn(),
  refreshUnwrap: vi.fn(),
  refreshReset: vi.fn(),
  logout: vi.fn(),
  logoutUnwrap: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));

vi.mock("@/i18n/customerLocalePreference", () => ({
  getCustomerCurrentLocale: (...args) =>
    mocks.getCustomerCurrentLocale(...args),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "studio-olivka" }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useCustomerRefreshMutation: () => [mocks.refresh],
  useSendCustomerLogoutMutation: () => [mocks.logout],
}));

import CustomerSocialAuthComplete from "@/components/auth/CustomerSocialAuthComplete";
import authReducer from "@/lib/features/auth/authSlice";

const encodeTokenSegment = (value) =>
  globalThis
    .btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const buildAccessToken = (userInfo) =>
  [
    encodeTokenSegment({ alg: "none", typ: "JWT" }),
    encodeTokenSegment({ UserInfo: userInfo }),
    "test-signature",
  ].join(".");

const customerSession = {
  accessToken: buildAccessToken({
    id: "customer-1",
    authContext: "customer",
    platformRole: "none",
    tenantRole: "customer",
    tenantId: "tenant-1",
  }),
  authContext: "customer",
  tenant: { id: "tenant-1", slug: "studio-olivka" },
  user: {
    id: "customer-1",
    email: "owner@example.com",
    platformRole: "none",
    tenantRole: "owner",
  },
  workspaceAccess: null,
};

const renderCallback = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
  });

  render(
    <Provider store={store}>
      <CustomerSocialAuthComplete />
    </Provider>,
  );

  return store;
};

describe("customer social authentication callback", () => {
  beforeEach(() => {
    mocks.locale = "en";
    mocks.currentCustomerLocale = null;
    mocks.getCustomerCurrentLocale.mockReset();
    mocks.getCustomerCurrentLocale.mockImplementation(
      () => mocks.currentCustomerLocale,
    );
    mocks.search = "";
    mocks.replace.mockReset();
    mocks.refresh.mockReset();
    mocks.refreshUnwrap.mockReset();
    mocks.refreshReset.mockReset();
    mocks.logout.mockReset();
    mocks.logoutUnwrap.mockReset();
    mocks.refresh.mockReturnValue({
      unwrap: mocks.refreshUnwrap,
      reset: mocks.refreshReset,
    });
    mocks.logout.mockReturnValue({ unwrap: mocks.logoutUnwrap });
    mocks.logoutUnwrap.mockResolvedValue({});
  });

  it("consumes a provider socialError without attempting a session refresh", () => {
    mocks.search =
      "socialError=access_denied&next=%2Fcourses%2Fwheel-basics%23dates";

    renderCallback();

    expect(screen.getByText("accessDenied")).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("accepts a signed customer audience even for underlying owner credentials and restores the exact safe intent", async () => {
    mocks.search =
      "next=%2Fportal%3Ftab%3Dstudio-calendar%26productId%3Dproduct-1%26locationId%3Dlocation-1%26start%3D2026-08-03T08%253A00%253A00.000Z%26end%3D2026-08-03T10%253A00%253A00.000Z";
    mocks.refreshUnwrap.mockResolvedValue(customerSession);

    const store = renderCallback();

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith(
        "/portal?tab=studio-calendar&productId=product-1&locationId=location-1&start=2026-08-03T08%3A00%3A00.000Z&end=2026-08-03T10%3A00%3A00.000Z",
        { locale: "en" },
      );
    });
    expect(store.getState().auth).toMatchObject({
      authContext: "customer",
      token: customerSession.accessToken,
      workspaceAccess: null,
      sessionReady: true,
    });
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it.each([
    ["a saved default on a new browser", null, "cs", "cs"],
    ["the explicit current-session choice", "en", "cs", "en"],
    [
      "the studio primary when the saved default is unsupported",
      null,
      "de",
      "cs",
    ],
    ["a saved default after an unsupported session choice", "de", "cs", "cs"],
  ])(
    "applies %s after accepting social authentication and preserves the callback intent",
    async (_, currentChoice, savedDefault, expectedLocale) => {
      mocks.currentCustomerLocale = currentChoice;
      const next =
        "/portal/credits/purchase-success?session_id=checkout-1&location=grohova#receipt";
      mocks.search = new URLSearchParams({ next }).toString();
      mocks.refreshUnwrap.mockResolvedValue({
        ...customerSession,
        tenant: {
          ...customerSession.tenant,
          settings: {
            publicDefaultLanguage: "cs",
            supportedPublicLanguages: ["cs", "en"],
          },
        },
        user: {
          ...customerSession.user,
          customerDefaultLanguage: savedDefault,
        },
      });

      const store = renderCallback();

      await waitFor(() => {
        expect(mocks.replace).toHaveBeenCalledWith(next, {
          locale: expectedLocale,
        });
      });
      expect(mocks.getCustomerCurrentLocale).toHaveBeenCalledWith(
        "studio-olivka",
      );
      expect(store.getState().auth.sessionReady).toBe(true);
      expect(mocks.logout).not.toHaveBeenCalled();
    },
  );

  it("rejects and clears a workspace member session", async () => {
    mocks.refreshUnwrap.mockResolvedValue({
      ...customerSession,
      accessToken: buildAccessToken({
        id: "owner-1",
        authContext: "workspace",
        platformRole: "none",
        tenantRole: "owner",
      }),
      authContext: "workspace",
      workspaceAccess: {
        role: "owner",
        status: "active",
        permissions: [],
      },
    });

    const store = renderCallback();

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledOnce();
      expect(screen.getByText("customerOnly")).toBeInTheDocument();
    });
    expect(store.getState().auth.token).toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("rejects a customer session issued for another tenant", async () => {
    mocks.refreshUnwrap.mockResolvedValue({
      ...customerSession,
      tenant: { slug: "another-studio" },
    });

    renderCallback();

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledOnce();
      expect(screen.getByText("customerOnly")).toBeInTheDocument();
    });
    // The rejected tenant's access token must not stay in the API cache.
    expect(mocks.refreshReset).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("rejects signed workspace authorization claims on a customer callback", async () => {
    mocks.refreshUnwrap.mockResolvedValue({
      ...customerSession,
      accessToken: buildAccessToken({
        id: "owner-1",
        authContext: "customer",
        platformRole: "none",
        tenantRole: "customer",
        tenantId: "tenant-1",
        membershipId: "membership-1",
      }),
    });

    const store = renderCallback();

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledOnce();
      expect(screen.getByText("customerOnly")).toBeInTheDocument();
    });
    expect(store.getState().auth.token).toBeNull();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
