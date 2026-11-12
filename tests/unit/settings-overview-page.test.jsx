import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workspaceAccess: { role: "owner", status: "active" },
  tenant: { modules: {} },
}));

const labels = {
  "WorkspaceSettingsOverview.eyebrow": "Settings overview",
  "WorkspaceSettingsOverview.title":
    "Everything your studio needs, clearly organized.",
  "WorkspaceSettingsOverview.description":
    "Configure the workspace one area at a time.",
  "WorkspaceSettingsOverview.tailored": "Tailored to your workspace",
  "WorkspaceSettingsOverview.categoryCount": "{count} categories available",
  "WorkspaceSettingsOverview.itemCount": "{count} settings",
  "WorkspaceSettingsOverview.empty.title": "No settings available",
  "WorkspaceSettingsOverview.empty.description":
    "There are no settings available for this role.",
  "WorkspaceSettingsOverview.groups.workspace.description":
    "Workspace details.",
  "WorkspaceSettingsOverview.groups.features.description": "Feature controls.",
  "WorkspaceSettingsOverview.groups.website.description": "Website controls.",
  "WorkspaceSettingsOverview.groups.access.description": "Access controls.",
  "WorkspaceSettingsOverview.groups.payments.description": "Payment controls.",
  "WorkspaceSettingsOverview.groups.account.description":
    "Subscription controls.",
  "WorkspaceSettingsOverview.launchCenter.title":
    "Continue setting up your studio",
  "WorkspaceSettingsOverview.launchCenter.description":
    "Follow your launch checklist.",
  "WorkspaceSettingsOverview.launchCenter.action": "Open Launch Center",
  "WorkspaceSettingsNav.groups.workspace": "Workspace",
  "WorkspaceSettingsNav.groups.features": "Features & navigation",
  "WorkspaceSettingsNav.groups.website": "Website & customer experience",
  "WorkspaceSettingsNav.groups.access": "Team & access",
  "WorkspaceSettingsNav.groups.payments": "Payments & invoicing",
  "WorkspaceSettingsNav.groups.account": "shario.io account",
  "WorkspaceSettingsNav.items.general": "General",
  "WorkspaceSettingsNav.items.locations": "Locations",
  "WorkspaceSettingsNav.items.modules": "Modules & navigation",
  "WorkspaceSettingsNav.items.ai": "AI & automation",
  "WorkspaceSettingsNav.items.publicSite": "Website & branding",
  "WorkspaceSettingsNav.items.team": "Team",
  "WorkspaceSettingsNav.items.roles": "Roles & permissions",
  "WorkspaceSettingsNav.items.payments": "Payments from customers",
  "WorkspaceSettingsNav.items.invoicing": "Customer invoicing",
  "WorkspaceSettingsNav.items.billing": "Subscription & billing",
  "WorkspaceSettingsNav.items.migration": "Migration Center",
  "WorkspaceSettingsNav.openCategory": "Open {category} settings",
};

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace) =>
    (key, values = {}) =>
      (labels[`${namespace}.${key}`] || key).replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? `{${name}}`,
      ),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        workspaceAccess: mocks.workspaceAccess,
        tenant: mocks.tenant,
      },
    }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import SettingsOverviewPage from "@/components/settings/SettingsOverviewPage";

describe("SettingsOverviewPage", () => {
  beforeEach(() => {
    mocks.workspaceAccess = { role: "owner", status: "active" };
    mocks.tenant = { modules: {} };
  });

  it("shows every accessible category with direct destination links", () => {
    const { container } = render(<SettingsOverviewPage />);

    expect(
      container.querySelector('[data-workspace-brush-field="settingsHero"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-workspace-brush-field="settingsLaunch"]'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Everything your studio needs, clearly organized.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "General" })).toHaveAttribute(
      "href",
      "/app/settings/general",
    );
    expect(
      screen.getByRole("link", { name: "Migration Center" }),
    ).toHaveAttribute("href", "/app/settings/migration");
    expect(
      screen.getByRole("link", { name: "Payments from customers" }),
    ).toHaveAttribute("href", "/app/settings/payments");
    expect(
      screen.getByRole("link", { name: "Open Launch Center" }),
    ).toHaveAttribute("href", "/app/setup");
  });

  it("removes empty module-gated categories without hiding configuration recovery", () => {
    mocks.tenant = { modules: { payments: false, ai: false } };

    render(<SettingsOverviewPage />);

    expect(
      screen.queryByRole("heading", { name: "Payments & invoicing" }),
    ).not.toBeInTheDocument();
    const features = screen
      .getByRole("heading", { name: "Features & navigation" })
      .closest("article");
    expect(
      within(features).getByRole("link", { name: "Modules & navigation" }),
    ).toBeInTheDocument();
    expect(
      within(features).queryByRole("link", { name: "AI & automation" }),
    ).not.toBeInTheDocument();
  });

  it("supports a limited role with location access but no workspace update", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["locations.view"],
    };

    render(<SettingsOverviewPage />);

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Locations" })).toHaveAttribute(
      "href",
      "/app/settings/locations",
    );
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open Launch Center" }),
    ).not.toBeInTheDocument();
  });

  it("explains when every accessible destination belongs to a disabled module", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["ai.settings.manage"],
    };
    mocks.tenant = { modules: { ai: false } };

    render(<SettingsOverviewPage />);

    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No settings available",
    );
    expect(
      screen.queryByRole("link", { name: "Open Launch Center" }),
    ).not.toBeInTheDocument();
  });
});
