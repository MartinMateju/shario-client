import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  authenticated: true,
  endpoints: null,
  tenant: null,
  appearanceTenant: null,
  products: [],
  redirect: vi.fn(),
  history: vi.fn(),
  redeem: vi.fn(),
  query: vi.fn(),
  modal: vi.fn(),
}));

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => "en",
      useTranslations:
        (namespace) =>
        (key, values = {}) => {
          const value = `${namespace}.${key}`
            .split(".")
            .reduce((text, part) => text?.[part], messages);
          return Object.entries(values).reduce(
            (text, [name, replacement]) =>
              text.replaceAll(`{${name}}`, String(replacement)),
            typeof value === "string" ? value : key,
          );
        },
    }))(...args),
  );
});
vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "test-studio" }),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectIsCustomerAuthenticated: () => mocks.authenticated,
  selectCurrentUser: () =>
    mocks.authenticated
      ? { id: "customer-1", email: "buyer@example.test" }
      : null,
  selectCurrentTenant: () => mocks.tenant,
}));
vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: (props) => {
    mocks.modal(props);
    return null;
  },
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: mocks.appearanceTenant || mocks.tenant }),
  useOptionalPublicTenant: () => ({
    tenant: mocks.appearanceTenant || mocks.tenant,
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      mocks.endpoints = endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      });
      return {
        useGetCouponsQuery: (args, options) => {
          mocks.query(args, options);
          return {
            data: mocks.products,
            isLoading: false,
            isFetching: false,
            isError: false,
          };
        },
        useCreateCouponOrderMutation: () => [
          (payload) => ({
            unwrap: async () => {
              const result = await mocks.endpoints.createCouponOrder.queryFn(
                payload,
                {},
              );
              if (result.error) throw result.error;
              return result.data;
            },
          }),
          { isLoading: false },
        ],
        useGetUserRedeemedCouponsQuery: (...args) => {
          mocks.history(...args);
          return {
            data: [],
            isLoading: false,
            isError: false,
            refetch: vi.fn(),
          };
        },
        useRedeemPromoCodeMutation: () => [mocks.redeem, { isLoading: false }],
      };
    },
  },
}));
vi.mock(
  "@/components/public-tenant/PublicVoucherCatalogPage",
  async (importOriginal) => {
    const { default: Catalog } = await importOriginal();
    return {
      default: (props) => (
        <Catalog {...props} onCheckoutRedirect={mocks.redirect} />
      ),
    };
  },
);

import CustomerVouchersPage from "@/components/vouchers/CustomerVouchersPage";
import PublicVoucherCatalogPage from "@/components/public-tenant/PublicVoucherCatalogPage";
import { mergePortalAppearance } from "@/components/public-tenant/publicTenantPortalAppearance";
import { getPublicTenantTheme } from "@/components/public-tenant/publicTenant.config";

describe("customer voucher purchase entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticated = true;
    mocks.appearanceTenant = null;
    mocks.tenant = {
      slug: "test-studio",
      name: "Test Studio",
      modules: { vouchers: true },
      settings: { currency: "CZK" },
      publicCapabilities: { vouchers: true },
      publicSite: {
        branding: { displayName: "Test Studio" },
        pages: {
          vouchers: {
            title: { en: "Gift vouchers" },
            description: { en: "Give a creative day." },
          },
        },
      },
    };
    mocks.products = [
      {
        _id: "507f1f77bcf86cd799439012",
        name: { EN: "Creative day", CZ: "Tvořivý den" },
        description: { EN: "A studio gift." },
        type: "coupon",
        hasVoucherDesign: true,
        price: 500,
        currency: "CZK",
        isActive: true,
      },
    ];
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          url: "https://checkout.stripe.com/c/pay/test-session",
        }),
      }),
    );
  });

  it("offers buying first and separate authenticated redemption without nesting page landmarks", () => {
    mocks.tenant.publicCapabilities.vouchers = false;
    mocks.tenant.publicSite.pages.vouchers.visible = false;
    const { container } = render(<CustomerVouchersPage />);
    expect(
      screen.getByRole("button", { name: /Continue to payment/i }),
    ).toBeEnabled();
    expect(screen.getByLabelText(/Email address/i)).toHaveValue(
      "buyer@example.test",
    );
    expect(
      screen.getByRole("link", { name: messages.VoucherShopping.buy }),
    ).toHaveAttribute("href", "#voucher-shop");
    expect(
      screen.getByRole("link", { name: messages.VoucherShopping.manage }),
    ).toHaveAttribute("href", "#my-vouchers");
    expect(container.querySelector("#voucher-shop")).toBeInTheDocument();
    expect(container.querySelector("#my-vouchers input")).toBeInTheDocument();
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(mocks.history).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it("uses personal portal colours and restores studio colours, including the redemption confirmation", () => {
    mocks.tenant.publicSite.customerPortal = {
      appearance: { backgroundColor: "#FFFFFF", primaryButtonColor: "#183864" },
    };
    mocks.appearanceTenant = mergePortalAppearance(mocks.tenant, {
      backgroundColor: "#101820",
      surfaceColor: "#202830",
      textColor: "#FFFFFF",
      primaryButtonColor: "#E6C34A",
    });
    const view = render(<CustomerVouchersPage />);
    const buy = screen.getByRole("link", {
      name: messages.VoucherShopping.buy,
    });
    const checkout = screen.getByRole("button", {
      name: /Continue to payment/i,
    });
    for (const button of [buy, checkout]) {
      expect(button.style.backgroundColor).toBe("var(--tenant-portal-button)");
      expect(button.style.color).toBe("var(--tenant-portal-button-foreground)");
    }
    const selectedVoucher = view.container.querySelector(
      '#voucher-shop button[aria-pressed="true"]',
    );
    expect(selectedVoucher.style.borderColor).toBe(
      "var(--tenant-accent-on-surface)",
    );
    expect(mocks.modal.mock.lastCall[0].tenantThemeStyle).toMatchObject({
      "--tenant-background": "#101820",
      "--tenant-portal-button": "#E6C34A",
    });

    mocks.appearanceTenant = null;
    view.rerender(<CustomerVouchersPage />);
    expect(mocks.modal.mock.lastCall[0].tenantThemeStyle).toMatchObject({
      "--tenant-background": "#FFFFFF",
      "--tenant-portal-button": "#183864",
    });
    expect(
      getPublicTenantTheme(mocks.tenant, { surface: "portal" })
        .portalButtonColor,
    ).toBe("#183864");
    expect(checkout.style.backgroundColor).toBe("var(--tenant-portal-button)");
  });

  it.each([true, false])(
    "starts a credential-free checkout when signed in is %s",
    async (authenticated) => {
      mocks.authenticated = authenticated;
      const { container } = render(
        authenticated ? <CustomerVouchersPage /> : <PublicVoucherCatalogPage />,
      );
      if (!authenticated) {
        expect(mocks.history).not.toHaveBeenCalled();
        expect(container.querySelector("#my-vouchers")).not.toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/i)).toHaveValue("");
        fireEvent.change(screen.getByLabelText(/Email address/i), {
          target: { value: "guest@example.test" },
        });
      }
      fireEvent.submit(container.querySelector("#voucher-shop form"));
      await waitFor(() =>
        expect(mocks.redirect).toHaveBeenCalledWith(
          "https://checkout.stripe.com/c/pay/test-session",
        ),
      );
      const [url, request] = fetch.mock.calls[0];
      expect(url).toBe(
        "https://api.example.test/public/tenants/test-studio/vouchers/checkout",
      );
      expect(request).toMatchObject({
        method: "POST",
        credentials: "omit",
        cache: "no-store",
      });
      expect(request.headers).not.toHaveProperty("authorization");
      expect(request.headers).not.toHaveProperty("Authorization");
      expect(JSON.parse(request.body)).toMatchObject({
        productId: mocks.products[0]._id,
        quantity: 1,
        email: authenticated ? "buyer@example.test" : "guest@example.test",
        sendPost: false,
        locale: "en",
      });
      expect(mocks.redeem).not.toHaveBeenCalled();
    },
  );

  it("never mounts private redemption when the customer wrapper has no customer session", () => {
    mocks.authenticated = false;
    const { container } = render(<CustomerVouchersPage />);
    expect(mocks.history).not.toHaveBeenCalled();
    expect(container.querySelector("#my-vouchers")).not.toBeInTheDocument();
  });

  it("keeps a disabled public voucher page unavailable to guests", () => {
    mocks.authenticated = false;
    mocks.tenant.publicSite.pages.vouchers.visible = false;
    render(<PublicVoucherCatalogPage />);
    expect(
      screen.queryByRole("button", { name: /Continue to payment/i }),
    ).not.toBeInTheDocument();
    expect(mocks.history).not.toHaveBeenCalled();
  });
});
