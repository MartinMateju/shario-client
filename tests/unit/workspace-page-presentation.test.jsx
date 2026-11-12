import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Retain presentation coverage for invoice pages when the feature is restored.
vi.mock("@/config/features", () => ({
  NATIVE_INVOICES_ENABLED: true,
}));
const HeaderProbe = ({ id, showPageHeader, initialCategory }) => (
  <div
    data-testid={id}
    data-show-page-header={String(showPageHeader)}
    data-initial-category={initialCategory}
  />
);
vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children }) => children,
}));
vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  default: ({ children }) => children,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({
    tenantId: "64b000000000000000000001",
  }),
  selectCurrentWorkspaceAccess: () => ({
    role: "owner",
  }),
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: {
      locations: [],
    },
  }),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));
vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: false,
    refreshAndContinue: vi.fn(),
    stepId: "location",
    track: vi.fn(),
  }),
}));
vi.mock("@/components/ai/StudioAssistantPage", () => ({
  default: (props) => <HeaderProbe id="ai" {...props} />,
}));
vi.mock("@/components/communications/CommunicationsWorkspace", () => ({
  default: (props) => <HeaderProbe id="communications" {...props} />,
}));
vi.mock("@/components/knowledge/KnowledgeManagementPage", () => ({
  default: (props) => <HeaderProbe id="knowledge" {...props} />,
}));
vi.mock("@/components/products/ProductsView", () => ({
  default: (props) => <HeaderProbe id="products" {...props} />,
}));
vi.mock("@/components/sales/SalesView", () => ({
  default: (props) => <HeaderProbe id="orders" {...props} />,
}));
vi.mock("@/components/invoices/InvoicesView", () => ({
  default: (props) => <HeaderProbe id="invoices" {...props} />,
}));
vi.mock("@/components/tables/KilnsAndFiringsTable", () => ({
  default: (props) => <HeaderProbe id="firings" {...props} />,
}));
vi.mock("@/components/views/membership_plans/MembershipPlansPage", () => ({
  default: (props) => <HeaderProbe id="memberships" {...props} />,
}));
vi.mock("@/components/customers/CustomersWorkspace", () => ({
  default: (props) => <HeaderProbe id="users" {...props} />,
}));
vi.mock("@/components/views/settings/WorkspaceSettingsPage", () => ({
  default: (props) => <HeaderProbe id="settings" {...props} />,
}));
vi.mock("@/components/settings/SettingsOverviewPage", () => ({
  default: () => <div data-testid="settings-overview" />,
}));
vi.mock("@/components/public-site-editor/PublicSiteEditorPage", () => ({
  default: (props) => <HeaderProbe id="public-site" {...props} />,
}));
vi.mock("@/components/views/locations/StudioLocationsPage", () => ({
  default: (props) => <HeaderProbe id="locations" {...props} />,
}));
vi.mock("@/components/views/team/TeamSettingsPage", () => ({
  default: (props) => <HeaderProbe id="team" {...props} />,
}));
vi.mock("@/components/views/roles/RolesSettingsPage", () => ({
  default: (props) => <HeaderProbe id="roles" {...props} />,
}));
vi.mock("@/components/views/payments/PaymentConnectSettingsPage", () => ({
  default: (props) => <HeaderProbe id="payments" {...props} />,
}));
vi.mock("@/components/views/billing/BillingSettingsPage", () => ({
  default: (props) => <HeaderProbe id="billing" {...props} />,
}));
vi.mock("@/components/views/invoices/InvoicingSettingsPage", () => ({
  default: (props) => <HeaderProbe id="invoicing" {...props} />,
}));
vi.mock("@/components/ai/AiSettingsPage", () => ({
  default: (props) => <HeaderProbe id="ai-settings" {...props} />,
}));
vi.mock("@/components/views/settings/AccountSettingsPage", () => ({
  default: (props) => <HeaderProbe id="account" {...props} />,
}));
vi.mock("@/components/views/settings/WorkspacePreferencesPage", () => ({
  default: (props) => <HeaderProbe id="preferences" {...props} />,
}));
import AccountPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/account/page";
import AiPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/ai/page";
import CommunicationsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/communications/page";
import KnowledgePage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/knowledge/page";
import InvoicesPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/finance/invoices/page";
import OrdersPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/finance/orders/page";
import MembershipsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/memberships/page";
import PreferencesPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/preferences/page";
import ProductsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/products/page";
import AiSettingsPageRoute from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/ai/page";
import BillingPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/billing/page";
import InvoicingPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/invoicing/page";
import LocationsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/locations/page";
import PaymentsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/payments/page";
import RolesPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/roles/page";
import GeneralSettingsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/general/page";
import SettingsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/page";
import PublicSiteSettingsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/public-site/page";
import TeamPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/team/page";
import UsersPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/users/page";
describe("workspace page presentation", () => {
  it.each([
    ["ai", AiPage],
    ["communications", CommunicationsPage],
    ["knowledge", KnowledgePage],
    ["products", ProductsPage],
    ["orders", OrdersPage],
    ["invoices", InvoicesPage],
    ["products", MembershipsPage],
    ["users", UsersPage],
    ["settings", GeneralSettingsPage],
    ["public-site", PublicSiteSettingsPage],
    ["locations", LocationsPage],
    ["team", TeamPage],
    ["roles", RolesPage],
    ["payments", PaymentsPage],
    ["billing", BillingPage],
    ["invoicing", InvoicingPage],
    ["ai-settings", AiSettingsPageRoute],
    ["account", AccountPage],
    ["preferences", PreferencesPage],
  ])("hides the duplicate local header on %s", (id, Page) => {
    render(<Page />);
    expect(screen.getByTestId(id)).toHaveAttribute(
      "data-show-page-header",
      "false",
    );
  });
  it("renders the categorized overview at the Settings root", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-overview")).toBeInTheDocument();
  });
  it("opens the legacy memberships route inside the unified catalog", () => {
    render(<MembershipsPage />);
    expect(screen.getByTestId("products")).toHaveAttribute(
      "data-initial-category",
      "memberships",
    );
  });
});
