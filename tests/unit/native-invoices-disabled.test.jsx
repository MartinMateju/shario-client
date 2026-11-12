import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: { role: "owner", status: "active" },
  invoiceView: vi.fn(),
  invoicingSettings: vi.fn(),
  customerInvoices: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ access: mocks.access }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: (state) => state.access,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/app/finance/orders",
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children }) => children,
}));

vi.mock("@/components/invoices/InvoicesView", () => ({
  default: () => {
    mocks.invoiceView();
    return <div>Native invoice workspace</div>;
  },
}));

vi.mock("@/components/views/invoices/InvoicingSettingsPage", () => ({
  default: () => {
    mocks.invoicingSettings();
    return <div>Native invoicing settings</div>;
  },
}));

vi.mock("@/components/views/invoices/CustomerInvoicesPage", () => ({
  default: () => {
    mocks.customerInvoices();
    return <div>Native customer invoices</div>;
  },
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetWorkspaceConfigurationQuery: vi.fn(),
  useUpdateWorkspaceConfigurationMutation: vi.fn(),
}));

vi.mock("@/components/sales/SalesView", () => ({
  default: () => <div>Orders and payment history</div>,
}));

vi.mock("@/components/views/payments/PaymentConnectSettingsPage", () => ({
  default: () => <div>Stripe Connect payment settings</div>,
}));

vi.mock("@/components/views/billing/BillingSettingsPage", () => ({
  default: () => <div>Studio subscription billing</div>,
}));

vi.mock("@/components/memberships/MembershipInvoiceHistoryPage", () => ({
  default: () => <div>Stripe membership billing history</div>,
}));

const nativeRoutes = [
  {
    name: "finance invoices",
    load: () =>
      import("@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/finance/invoices/page"),
    content: "Native invoice workspace",
  },
  {
    name: "invoicing settings",
    load: () =>
      import("@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/invoicing/page"),
    content: "Native invoicing settings",
  },
  {
    name: "customer invoices",
    load: () =>
      import("@/app/[locale]/tenants/[tenantSlug]/portal/invoices/page"),
    content: "Native customer invoices",
  },
];

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_NATIVE_INVOICES_ENABLED", undefined);
  mocks.access = { role: "owner", status: "active" };
});

describe("native invoicing is disabled by default", () => {
  it.each([undefined, "false", "1", "TRUE"])(
    "requires an explicit true value instead of %s",
    async (value) => {
      vi.stubEnv("NEXT_PUBLIC_NATIVE_INVOICES_ENABLED", value);
      const { NATIVE_INVOICES_ENABLED } = await import("@/config/features");

      expect(NATIVE_INVOICES_ENABLED).toBe(false);
    },
  );

  it.each(nativeRoutes)(
    "returns not found for a direct $name URL before mounting invoice UI",
    async ({ load }) => {
      const { default: Page } = await load();

      expect(() => Page()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mocks.notFound).toHaveBeenCalledOnce();
      expect(mocks.invoiceView).not.toHaveBeenCalled();
      expect(mocks.invoicingSettings).not.toHaveBeenCalled();
      expect(mocks.customerInvoices).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: "owner", role: "owner", status: "active" },
    {
      name: "staff with an explicit invoice grant",
      role: "staff",
      status: "active",
      permissions: ["invoices.view", "orders.view", "payments.view"],
    },
  ])("hides dashboard and finance invoice links for $name", async (access) => {
    mocks.access = access;
    const { buildDashboardNavigation } =
      await import("@/components/dashboard/dashboard.navigation");
    const { default: FinanceShell, getDefaultFinanceHref } =
      await import("@/components/finance/FinanceShell");
    const navigation = buildDashboardNavigation({
      workspaceAccess: access,
      tenant: {
        modules: { payments: true },
        settings: { navigation: { hiddenGroups: [], hiddenItems: [] } },
      },
    });

    expect(navigation.visibleItems.has("invoices")).toBe(false);
    expect(navigation.visibleItems.get("finance")?.resolvedHref).toBe(
      "/app/finance/orders",
    );
    expect(navigation.visibleItems.get("sales")?.resolvedHref).toBe(
      "/app/sales",
    );
    expect(getDefaultFinanceHref(access)).toBe("/app/finance/orders");

    render(<FinanceShell>Existing transaction content</FinanceShell>);

    expect(
      screen.queryByRole("link", { name: "navigation.invoices" }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "navigation.orders" }),
    ).toHaveAttribute("href", "/app/finance/orders");
    expect(
      screen.getByText("Existing transaction content"),
    ).toBeInTheDocument();
  });

  it("does not fall back to invoices for an invoice-only role", async () => {
    const { getDefaultFinanceHref } =
      await import("@/components/finance/FinanceShell");

    expect(
      getDefaultFinanceHref({
        role: "staff",
        status: "active",
        permissions: ["invoices.view"],
      }),
    ).toBe("/app");
    expect(
      getDefaultFinanceHref({
        role: "staff",
        status: "active",
        permissions: ["payments.view"],
      }),
    ).toBe("/app/finance/orders");
  });

  it("does not offer invoices in customizable navigation", async () => {
    const { CUSTOMIZABLE_NAVIGATION, WORKSPACE_MODULE_KEYS } =
      await import("@/components/views/settings/WorkspaceModulesPage");
    const itemKeys = CUSTOMIZABLE_NAVIGATION.flatMap((group) =>
      group.items.map((item) => item.key),
    );

    expect(itemKeys).not.toContain("invoices");
    expect(itemKeys).toEqual(expect.arrayContaining(["sales", "products"]));
    expect(WORKSPACE_MODULE_KEYS).toEqual(
      expect.arrayContaining(["payments", "memberships"]),
    );
  });

  it.each([
    { name: "owner", role: "owner", status: "active" },
    {
      name: "staff with invoicing settings and invoice permissions",
      role: "staff",
      status: "active",
      permissions: [
        "workspace.update",
        "invoices.view",
        "payments.view",
        "subscription.view",
      ],
    },
  ])(
    "keeps payment and billing settings while hiding invoicing for $name",
    async (access) => {
      const { getVisibleSettingsGroups, canAccessSettingsItem } =
        await import("@/components/settings/settingsNavigation");
      const tenant = { modules: { payments: true } };
      const groups = getVisibleSettingsGroups({ access, tenant });
      const keys = groups.flatMap((group) =>
        group.items.map((item) => item.key),
      );

      expect(keys).not.toContain("invoicing");
      expect(keys).toEqual(expect.arrayContaining(["payments", "billing"]));
      expect(groups.find((group) => group.key === "payments")?.labelKey).toBe(
        "items.payments",
      );
      expect(
        canAccessSettingsItem(
          {
            key: "invoicing",
            permission: "workspace.update",
            module: "payments",
          },
          access,
          tenant,
        ),
      ).toBe(false);
    },
  );

  it("keeps orders, Stripe Connect, subscription and membership billing routes available", async () => {
    const [
      { default: Orders },
      { default: Payments },
      { default: Billing },
      { default: MembershipBilling },
    ] = await Promise.all([
      import("@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/finance/orders/page"),
      import("@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/payments/page"),
      import("@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/billing/page"),
      import("@/app/[locale]/tenants/[tenantSlug]/portal/membership/invoices/page"),
    ]);

    render(
      <>
        <Orders />
        <Payments />
        <Billing />
        <MembershipBilling />
      </>,
    );

    expect(screen.getByText("Orders and payment history")).toBeInTheDocument();
    expect(
      screen.getByText("Stripe Connect payment settings"),
    ).toBeInTheDocument();
    expect(screen.getByText("Studio subscription billing")).toBeInTheDocument();
    expect(
      screen.getByText("Stripe membership billing history"),
    ).toBeInTheDocument();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});

describe("native invoicing can be restored explicitly", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_NATIVE_INVOICES_ENABLED", "true");
  });

  it.each(nativeRoutes)(
    "restores the $name page",
    async ({ load, content }) => {
      const { default: Page } = await load();

      render(<Page />);

      expect(screen.getByText(content)).toBeInTheDocument();
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );

  it("restores the navigation, settings and invoice-only finance fallback", async () => {
    const { NATIVE_INVOICES_ENABLED } = await import("@/config/features");
    const { buildDashboardNavigation } =
      await import("@/components/dashboard/dashboard.navigation");
    const { getDefaultFinanceHref } =
      await import("@/components/finance/FinanceShell");
    const { getVisibleSettingsGroups } =
      await import("@/components/settings/settingsNavigation");
    const tenant = { modules: { payments: true } };

    expect(NATIVE_INVOICES_ENABLED).toBe(true);
    expect(
      buildDashboardNavigation({
        tenant,
        workspaceAccess: mocks.access,
      }).visibleItems.get("invoices")?.resolvedHref,
    ).toBe("/app/finance/invoices");
    expect(
      getVisibleSettingsGroups({ tenant, access: mocks.access }).flatMap(
        (group) => group.items.map((item) => item.key),
      ),
    ).toContain("invoicing");
    expect(
      getDefaultFinanceHref({
        role: "staff",
        status: "active",
        permissions: ["invoices.view"],
      }),
    ).toBe("/app/finance/invoices");
  });
});
