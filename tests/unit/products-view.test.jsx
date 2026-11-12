import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProductsView from "@/components/products/ProductsView";

const state = vi.hoisted(() => ({
  access: { roleKey: "owner", status: "active", permissions: [] },
  tenant: {
    name: "Studio Olive",
    modules: {
      bookings: true,
      courses: true,
      memberships: true,
      vouchers: true,
    },
  },
  user: { tenantName: "Studio Olive" },
  activeStudioId: "location-a",
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const api = vi.hoisted(() => ({
  getProducts: vi.fn(),
  getMembershipPlans: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => state.activeStudioId,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => state.tenant,
  selectCurrentUser: () => state.user,
  selectCurrentWorkspaceAccess: () => state.access,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => state.searchParams,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
  useRouter: () => ({ push: state.push, replace: state.replace }),
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: false,
    refreshAndContinue: vi.fn(),
    stepId: "bookable_offer",
    track: vi.fn(),
  }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const labels = {
        title: "Products & Classes",
        eyebrow: "Catalog",
        description: "Catalog for Studio Olive",
        fallbackStudioName: "your studio",
        readOnly: "View only",
        plansReadOnly: "Plans view only",
        moduleDisabled: "Creation disabled",
        noAccess: "No access",
        sectionCount: `${values.count || 0} items`,
        "sections.label": "Product and class categories",
        "sections.openStudio.label": "Open Studio",
        "sections.openStudio.description": "Shared or exclusive booking",
        "sections.openStudio.action": "Add Open Studio",
        "sections.openStudio.heading": "Open Studio",
        "sections.openStudio.detail": "Open Studio detail",
        "openStudioLimit.title": "One Open Studio product per location",
        "openStudioLimit.description":
          "Inactive products still count toward this limit.",
        "openStudioLimit.existing": "Edit or reactivate the existing product.",
        "openStudioLimit.edit": "Edit Open Studio",
        "openStudioLimit.duplicates": "Keep one and archive the extras.",
        "sections.openStudio.searchPlaceholder": "Search Open Studio",
        "sections.openStudio.emptyTitle": "No Open Studio offers",
        "sections.openStudio.emptyDescription": "Create Open Studio",
        "sections.classes.label": "Classes",
        "sections.classes.description": "Scheduled classes",
        "sections.classes.action": "Create class",
        "sections.classes.heading": "Classes",
        "sections.classes.detail": "Class detail",
        "sections.classes.searchPlaceholder": "Search classes",
        "sections.classes.emptyTitle": "No classes",
        "sections.classes.emptyDescription": "Create class",
        "sections.memberships.label": "Memberships",
        "sections.memberships.description": "Plans and members",
        "sections.memberships.action": "Create membership",
        "sections.vouchers.label": "Vouchers",
        "sections.vouchers.description": "Giftable credit",
        "sections.vouchers.action": "Create voucher",
        "sections.vouchers.heading": "Vouchers",
        "sections.vouchers.detail": "Voucher detail",
        "sections.vouchers.searchPlaceholder": "Search vouchers",
        "sections.vouchers.emptyTitle": "No vouchers",
        "sections.vouchers.emptyDescription": "Create voucher",
        "sections.privateStudio.label": "Private Studio",
        "sections.privateStudio.description": "Internal-only studio time",
        "sections.privateStudio.action": "Add Private Studio",
        "sections.privateStudio.heading": "Private Studio",
        "sections.privateStudio.detail": "Internal studio entries",
        "sections.privateStudio.searchPlaceholder": "Search Private Studio",
        "sections.privateStudio.emptyTitle": "No Private Studio entries",
        "sections.privateStudio.emptyDescription": "Create an internal entry",
        "legacyMemberships.title": "Legacy membership products",
        "legacyMemberships.description": "Review legacy products",
        "legacyMemberships.count": `${values.count || 0} legacy items`,
        "legacyProducts.title": "Legacy catalog items",
        "legacyProducts.description": "Review legacy catalog items",
        "legacyProducts.count": `${values.count || 0} legacy items`,
        "notices.created": "Product created successfully.",
        "notices.updated": "Product updated successfully.",
        "pagination.showing": "Showing",
        "pagination.previous": "Previous",
        "pagination.next": "Next",
        "pagination.rows": "Rows",
      };

      return labels[key] || key;
    },
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetAllProductsQuery: (...args) => {
    const result = api.getProducts(...args);
    return { currentData: result.data, ...result };
  },
  useUpdateProductMutation: () => [api.updateProduct, { isLoading: false }],
  useDeleteProductMutation: () => [api.deleteProduct, { isLoading: false }],
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetAllMembershipPlansQuery: (...args) => api.getMembershipPlans(...args),
}));

vi.mock("@/components/products/ProductToolbar", () => ({
  default: ({ searchPlaceholder, onSearchChange }) => (
    <input
      data-testid="product-toolbar"
      placeholder={searchPlaceholder}
      onChange={(event) => onSearchChange(event.target.value)}
    />
  ),
}));

vi.mock("@/components/products/ProductCatalog", () => ({
  default: ({
    products,
    onEdit,
    onManageCodes,
    emptyDescription,
    canEdit = () => true,
  }) => (
    <div
      data-testid="product-catalog"
      data-empty-description={emptyDescription}
    >
      {products.map((product) => (
        <span key={product.id}>
          {product.name}
          {onEdit && canEdit(product) ? (
            <button type="button" onClick={() => onEdit(product)}>
              Edit {product.name}
            </button>
          ) : null}
          {onManageCodes && (
            <button onClick={() => onManageCodes(product)}>
              Manage codes for {product.name}
            </button>
          )}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/tables/PromoCodesTable", () => ({
  default: ({ productId, productName }) => (
    <div data-testid="issued-codes">
      Scope:{productId || "all"} Name:{productName}
    </div>
  ),
}));
vi.mock("@/components/vouchers/VoucherAllowance", () => ({
  default: () => <div>Voucher allowance</div>,
}));
vi.mock("@/components/vouchers/VoucherOrdersPanel", () => ({
  default: () => <div data-testid="voucher-orders">Voucher orders</div>,
}));

vi.mock("@/components/products/ProductFormDialog", () => ({
  default: ({ catalogKind }) => (
    <div role="dialog" aria-label={`${catalogKind} editor`} />
  ),
}));

vi.mock("@/components/views/membership_plans/MembershipPlansPage", () => ({
  default: ({ embedded, createOpen, onCreateOpenChange }) => (
    <div data-testid="membership-manager">
      embedded:{String(embedded)} create:{String(createOpen)}
      {createOpen ? (
        <button type="button" onClick={() => onCreateOpenChange(false)}>
          Close membership editor
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));

describe("Products & Classes workspace", () => {
  it("explains Starter V3 Open Studio restriction without offering creation", () => {
    state.tenant = { ...state.tenant, plan: "starter", planVersion: 3 };
    api.getProducts.mockReturnValue({ data: [] });
    render(<ProductsView />);
    expect(
      screen.getByRole("heading", { name: "openStudioPlan.title" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add Open Studio" }),
    ).toBeNull();
    expect(screen.getByTestId("product-catalog")).toHaveAttribute(
      "data-empty-description",
      "openStudioPlan.description",
    );
    expect(
      screen.getByRole("link", { name: "openStudioPlan.action" }),
    ).toHaveAttribute("href", "/app/settings/billing");
  });

  it("does not show a billing action to product editors without billing permission", () => {
    state.tenant = { ...state.tenant, plan: "starter", planVersion: 3 };
    state.access = {
      role: "custom",
      status: "active",
      permissions: ["products.view", "products.manage"],
    };
    api.getProducts.mockReturnValue({ data: [] });
    render(<ProductsView />);
    expect(
      screen.getByRole("heading", { name: "openStudioPlan.title" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "openStudioPlan.action" }),
    ).toBeNull();
  });
  it("opens the dispatch view beside offerings and codes without a create-offering action", () => {
    state.searchParams = new URLSearchParams("category=vouchers&view=orders");
    render(<ProductsView />);
    expect(screen.getByTestId("voucher-orders")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create voucher" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Voucher allowance")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "voucherCodes.orders" }),
    ).toHaveAttribute("aria-current", "page");
    fireEvent.click(
      screen.getByRole("button", { name: "voucherCodes.orders" }),
    );
    expect(state.push).toHaveBeenLastCalledWith(
      "/app/products?category=vouchers&view=orders",
    );
  });
  it("opens exact voucher codes from an offering and provides All codes navigation", () => {
    state.searchParams = new URLSearchParams("category=vouchers");
    render(<ProductsView />);
    fireEvent.click(
      screen.getByRole("button", { name: "Manage codes for Gift voucher" }),
    );
    expect(state.push).toHaveBeenLastCalledWith(
      "/app/products?category=vouchers&view=codes&voucherProductId=voucher",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "voucherCodes.allCodes" }),
    );
    expect(state.push).toHaveBeenLastCalledWith(
      "/app/products?category=vouchers&view=codes",
    );
  });

  it("renders exact scoped codes even when the product catalog fails", () => {
    state.searchParams = new URLSearchParams(
      "category=vouchers&view=codes&voucherProductId=voucher",
    );
    api.getProducts.mockReturnValue({ isError: true, data: undefined });
    render(<ProductsView />);
    expect(screen.getByTestId("issued-codes")).toHaveTextContent(
      "Scope:voucher",
    );
    expect(screen.queryByTestId("product-toolbar")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create voucher" }),
    ).not.toBeInTheDocument();
  });

  it("denies issued codes to product-only editors and hides the navigation entry", () => {
    state.access = {
      role: "custom",
      status: "active",
      permissions: ["products.view", "products.manage"],
    };
    state.searchParams = new URLSearchParams(
      "category=vouchers&view=codes&voucherProductId=voucher",
    );
    render(<ProductsView />);
    expect(screen.getByText("voucherCodes.noAccess")).toBeVisible();
    expect(screen.queryByTestId("issued-codes")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "voucherCodes.allCodes" }),
    ).not.toBeInTheDocument();
  });

  beforeEach(() => {
    state.activeStudioId = "location-a";
    state.access = { roleKey: "owner", status: "active", permissions: [] };
    state.tenant = {
      name: "Studio Olive",
      modules: {
        bookings: true,
        courses: true,
        memberships: true,
        vouchers: true,
      },
    };
    state.searchParams = new URLSearchParams();
    state.push.mockReset();
    state.replace.mockReset();
    api.getProducts.mockReset();
    api.getMembershipPlans.mockReset();
    api.getProducts.mockReturnValue({
      data: [
        {
          id: "access",
          name: "Open studio",
          type: "workshop",
          locationId: "location-a",
          price: 500,
        },
        { id: "class", name: "Wheel class", type: "course", price: 1200 },
        { id: "voucher", name: "Gift voucher", type: "coupon", price: 1500 },
        {
          id: "private",
          name: "Staff maintenance",
          kind: "private-studio",
          locationId: "location-a",
          price: 0,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    api.getMembershipPlans.mockReturnValue({
      data: { plans: [{ id: "plan", name: "Studio member" }] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    api.updateProduct.mockReturnValue({
      unwrap: () => Promise.resolve(),
    });
    api.deleteProduct.mockReturnValue({
      unwrap: () => Promise.resolve(),
    });
  });

  it("shows exactly five distinct owner-facing categories and a contextual action", () => {
    render(<ProductsView showPageHeader={false} />);

    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /Open Studio/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Classes/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Memberships/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Vouchers/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Private Studio/ })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Edit Open Studio" }),
    ).toBeVisible();
    expect(screen.queryByText("Retail")).not.toBeInTheDocument();
    for (const tab of screen.getAllByRole("tab")) {
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      expect(panel).toHaveAttribute("role", "tabpanel");
      expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    }
  });

  it("opens product creation on its dedicated page", () => {
    state.activeStudioId = "empty-location";
    render(<ProductsView showPageHeader={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Open Studio" }));

    expect(state.push).toHaveBeenCalledWith(
      "/app/products/new?category=openStudio",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("explains the limit and opens the existing product from the main action", () => {
    render(<ProductsView showPageHeader={false} />);
    expect(
      screen.getByText("One Open Studio product per location"),
    ).toBeVisible();
    expect(
      screen.getByText("Inactive products still count toward this limit."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add Open Studio" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit Open Studio" }));
    expect(state.push).toHaveBeenCalledWith(
      "/app/products/access/edit?category=openStudio",
    );
  });

  it("counts inactive products even when a search hides them", () => {
    api.getProducts.mockReturnValue({
      data: [
        {
          id: "inactive",
          name: "Paused studio",
          kind: "open-studio",
          locationId: "location-a",
          isActive: false,
        },
      ],
    });
    render(<ProductsView showPageHeader={false} />);
    fireEvent.change(screen.getByPlaceholderText("Search Open Studio"), {
      target: { value: "no match" },
    });
    expect(screen.queryByText("Paused studio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Open Studio" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit Open Studio" }));
    expect(state.push).toHaveBeenCalledWith(
      "/app/products/inactive/edit?category=openStudio",
    );
  });

  it("redirects old Open Studio create links to the existing product", () => {
    state.searchParams = new URLSearchParams(
      "category=openStudio&action=create&setupStep=bookable_offer",
    );
    render(<ProductsView showPageHeader={false} />);
    expect(state.replace).toHaveBeenCalledWith(
      "/app/products/access/edit?category=openStudio&setupStep=bookable_offer",
      { scroll: false },
    );
    expect(state.replace).not.toHaveBeenCalledWith(
      expect.stringContaining("/new"),
      expect.anything(),
    );
  });

  it("blocks creation until the selected location's current catalog is loaded", () => {
    api.getProducts.mockReturnValue({
      data: [],
      currentData: undefined,
      isFetching: true,
    });
    const { rerender } = render(<ProductsView showPageHeader={false} />);
    expect(
      screen.getByRole("button", { name: "Add Open Studio" }),
    ).toBeDisabled();
    api.getProducts.mockReturnValue({
      data: [],
      currentData: undefined,
      isError: true,
    });
    rerender(<ProductsView showPageHeader={false} />);
    expect(
      screen.getByRole("button", { name: "Add Open Studio" }),
    ).toBeDisabled();
    api.getProducts.mockReturnValue({
      data: [],
      currentData: [],
      isError: false,
    });
    rerender(<ProductsView showPageHeader={false} />);
    expect(
      screen.getByRole("button", { name: "Add Open Studio" }),
    ).toBeEnabled();
  });

  it("does not use the previous location's empty response while switching locations", () => {
    api.getProducts.mockReturnValue({ data: [] });
    const { rerender } = render(<ProductsView showPageHeader={false} />);
    expect(
      screen.getByRole("button", { name: "Add Open Studio" }),
    ).toBeEnabled();
    state.activeStudioId = "location-b";
    api.getProducts.mockReturnValue({
      data: [],
      currentData: undefined,
      isFetching: true,
    });
    rerender(<ProductsView showPageHeader={false} />);
    expect(
      screen.getByRole("button", { name: "Add Open Studio" }),
    ).toBeDisabled();
  });

  it("keeps existing duplicates visible for review and prevents adding another", () => {
    api.getProducts.mockReturnValue({
      data: [
        {
          id: "a",
          name: "Shared access",
          kind: "open-studio",
          locationId: "location-a",
        },
        {
          id: "b",
          name: "Private access",
          type: "private-workshop",
          locationId: "location-a",
          isActive: false,
        },
      ],
    });
    render(<ProductsView showPageHeader={false} />);
    expect(screen.getByText("Keep one and archive the extras.")).toBeVisible();
    expect(screen.getByText("Shared access")).toBeVisible();
    expect(screen.getByText("Private access")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add Open Studio" }),
    ).toBeNull();
  });

  it("opens product editing on its dedicated page", () => {
    render(<ProductsView showPageHeader={false} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Open studio" }));

    expect(state.push).toHaveBeenCalledWith(
      "/app/products/access/edit?category=openStudio",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the active category in the URL and opens the real membership manager", () => {
    const { rerender } = render(<ProductsView showPageHeader={false} />);

    fireEvent.click(screen.getByRole("tab", { name: /Classes/ }));
    expect(state.replace).toHaveBeenCalledWith(
      "/app/products?category=classes",
      { scroll: false },
    );

    state.searchParams = new URLSearchParams("category=memberships");
    rerender(<ProductsView showPageHeader={false} />);

    expect(screen.getByTestId("membership-manager")).toHaveTextContent(
      "embedded:true create:false",
    );
    fireEvent.click(screen.getByRole("button", { name: "Create membership" }));
    expect(screen.getByTestId("membership-manager")).toHaveTextContent(
      "create:true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close membership editor" }),
    );
    expect(screen.getByTestId("membership-manager")).toHaveTextContent(
      "create:false",
    );
  });

  it("accepts old category URLs but emits canonical category URLs", () => {
    state.searchParams = new URLSearchParams("category=studioAccess");
    const { rerender } = render(<ProductsView showPageHeader={false} />);

    expect(screen.getByRole("tab", { name: /Open Studio/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Open studio")).toBeVisible();

    state.searchParams = new URLSearchParams("category=classesEvents");
    rerender(<ProductsView showPageHeader={false} />);
    expect(screen.getByRole("tab", { name: /Classes/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Wheel class")).toBeVisible();
  });

  it("redirects legacy class-create deep links to the dedicated page", () => {
    state.searchParams = new URLSearchParams(
      "category=classes&action=create&productKind=class",
    );

    render(<ProductsView showPageHeader={false} />);

    expect(state.replace).toHaveBeenCalledWith(
      "/app/products/new?category=classes&productKind=class",
      { scroll: false },
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("redirects guided product-review links to the dedicated edit page", () => {
    state.searchParams = new URLSearchParams(
      "category=classes&setupStep=bookable_offer&productId=class&action=review",
    );

    render(<ProductsView showPageHeader={false} />);

    expect(state.replace).toHaveBeenCalledWith(
      "/app/products/class/edit?category=classes&setupStep=bookable_offer",
      { scroll: false },
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows an update notice once and removes its query flag", () => {
    state.searchParams = new URLSearchParams("category=classes&updated=1");

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Product updated successfully.",
    );
    expect(state.replace).toHaveBeenCalledWith(
      "/app/products?category=classes",
      { scroll: false },
    );
  });

  it("clears a membership create deep link when its editor closes", () => {
    state.searchParams = new URLSearchParams(
      "category=memberships&action=create",
    );

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByTestId("membership-manager")).toHaveTextContent(
      "create:true",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close membership editor" }),
    );
    expect(state.replace).toHaveBeenCalledWith(
      "/app/products?category=memberships",
      { scroll: false },
    );
  });

  it("supports membership-only roles without querying or exposing product tabs", () => {
    state.access = {
      roleKey: "custom",
      status: "active",
      permissions: ["memberships.view", "memberships.manage"],
    };
    state.searchParams = new URLSearchParams("category=memberships");

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: /Memberships/ })).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Open Studio/ })).toBeNull();
    expect(api.getProducts.mock.calls[0][1]).toMatchObject({ skip: true });
    expect(screen.getByTestId("membership-manager")).toBeVisible();
  });

  it("keeps generic membership products visible for retirement beside real plans", () => {
    api.getProducts.mockReturnValue({
      data: [
        {
          id: "legacy-membership",
          name: "Legacy studio pass",
          type: "membership",
          price: 900,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    state.searchParams = new URLSearchParams("category=memberships");

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByTestId("membership-manager")).toBeVisible();
    expect(screen.getByText("Legacy membership products")).toBeVisible();
    expect(screen.getByText("Legacy studio pass")).toBeVisible();

    expect(
      screen.queryByRole("button", { name: "Edit Legacy studio pass" }),
    ).toBeNull();
  });

  it("does not orphan read/retire legacy memberships for product-only managers", () => {
    state.access = {
      roleKey: "custom",
      status: "active",
      permissions: ["products.view", "products.manage"],
    };
    api.getProducts.mockReturnValue({
      data: [
        {
          id: "legacy-pass",
          name: "Legacy credit pass",
          type: "credit-pack",
          price: 700,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProductsView showPageHeader={false} />);

    expect(screen.queryByRole("tab", { name: /Memberships/ })).toBeNull();
    expect(screen.getByText("Legacy catalog items")).toBeVisible();
    expect(screen.getByText("Legacy credit pass")).toBeVisible();

    expect(
      screen.queryByRole("button", { name: "Edit Legacy credit pass" }),
    ).toBeNull();
  });

  it("keeps ambiguous legacy service records in a separate read/retire panel", () => {
    api.getProducts.mockReturnValue({
      data: [
        {
          id: "ambiguous-service",
          name: "Old generic service",
          type: "service",
          price: 700,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByText("Legacy catalog items")).toBeVisible();
    expect(screen.getByText("Old generic service")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Edit Old generic service" }),
    ).toBeNull();
  });

  it("keeps disabled-module products visible for retirement but blocks creation", () => {
    state.tenant = {
      ...state.tenant,
      modules: {
        ...state.tenant.modules,
        courses: false,
        vouchers: false,
      },
    };
    state.searchParams = new URLSearchParams("category=classes");

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByRole("tab", { name: /Classes/ })).toBeVisible();
    expect(screen.getByText("Wheel class")).toBeVisible();
    expect(screen.getByText("Creation disabled")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Create class" })).toBeNull();
  });

  it("does not reinterpret an unavailable membership create link as Open Studio", () => {
    state.access = {
      roleKey: "custom",
      status: "active",
      permissions: ["products.view", "products.manage"],
    };
    state.searchParams = new URLSearchParams(
      "category=memberships&action=create",
    );

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByRole("tab", { name: /Open Studio/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("skips membership data when the module is disabled", () => {
    state.access = {
      roleKey: "custom",
      status: "active",
      permissions: ["memberships.view", "memberships.manage"],
    };
    state.tenant = {
      ...state.tenant,
      modules: { ...state.tenant.modules, memberships: false },
    };

    render(<ProductsView showPageHeader={false} />);

    expect(screen.getByText("No access")).toBeVisible();
    expect(api.getMembershipPlans.mock.calls[0][1]).toMatchObject({
      skip: true,
    });
  });

  it("scopes the catalog on location changes even while previous query data is retained", () => {
    const products = [
      {
        id: "a",
        name: "Grohova product",
        kind: "open-studio",
        locationId: "location-a",
      },
      {
        id: "b",
        name: "Second studio product",
        kind: "open-studio",
        locationId: "location-b",
      },
      { id: "legacy", name: "Unassigned product", kind: "open-studio" },
    ];
    api.getProducts.mockReturnValue({ data: products });
    const { rerender } = render(<ProductsView />);
    expect(screen.getByText("Grohova product")).toBeVisible();
    expect(screen.queryByText("Second studio product")).not.toBeInTheDocument();
    expect(screen.getByText("locationAssignment.title")).toBeVisible();
    expect(screen.getByText("Unassigned product")).toBeVisible();
    state.activeStudioId = "location-b";
    rerender(<ProductsView />);
    expect(screen.queryByText("Grohova product")).not.toBeInTheDocument();
    expect(screen.getByText("Second studio product")).toBeVisible();
    expect(api.getProducts).toHaveBeenLastCalledWith(
      { locationId: "location-b", includeUnassigned: true },
      expect.any(Object),
    );
  });
});
