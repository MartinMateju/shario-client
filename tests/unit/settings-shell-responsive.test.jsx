import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/app/settings/payments",
  workspaceAccess: { role: "owner", status: "active" },
  tenant: { modules: {} },
}));

const labels = {
  eyebrow: "Workspace",
  title: "Settings",
  label: "Workspace settings",
  overview: "All settings",
  overviewDescription: "Choose an area to configure.",
  categoryDescription: "{category} settings",
  currentCategory: "Current category",
  openCategory: "Open {category} settings",
  "groups.workspace": "Workspace",
  "groups.features": "Features & navigation",
  "groups.website": "Website & customer experience",
  "groups.access": "Team & access",
  "groups.payments": "Payments & invoicing",
  "groups.account": "shario.io account",
  "items.setup": "Launch Center",
  "items.general": "General",
  "items.modules": "Modules & navigation",
  "items.publicSite": "Website & branding",
  "items.locations": "Locations",
  "items.team": "Team",
  "items.roles": "Roles & permissions",
  "items.payments": "Payments from customers",
  "items.billing": "Subscription & billing",
  "items.invoicing": "Customer invoicing",
  "items.ai": "AI & automation",
  "items.migration": "Migration Center",
};

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      (labels[key] || key).replace(
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
  usePathname: () => mocks.pathname,
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import SettingsShell from "@/components/settings/SettingsShell";

describe("SettingsShell categorized navigation", () => {
  beforeEach(() => {
    mocks.pathname = "/app/settings/payments";
    mocks.workspaceAccess = { role: "owner", status: "active" };
    mocks.tenant = { modules: {} };
  });

  it("keeps the responsive rail contained and focuses detail navigation on the active category", () => {
    const { container } = render(
      <SettingsShell>
        <div>Settings content</div>
      </SettingsShell>,
    );

    expect(
      container.querySelector('[data-workspace-brush-field="settingsShell"]'),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass(
      "xl:grid-cols-[224px_minmax(0,1fr)]",
      "xl:gap-5",
    );
    expect(screen.queryByText("Current category")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Payments & invoicing settings"),
    ).not.toBeInTheDocument();

    const navigation = screen.getByRole("navigation", {
      name: "Workspace settings",
    });
    const list = within(navigation).getByRole("list");
    const activeItem = within(navigation).getByRole("link", {
      name: "Payments from customers",
    });

    expect(navigation).toHaveClass(
      "max-w-full",
      "overflow-x-auto",
      "overscroll-x-contain",
      "xl:overflow-visible",
    );
    expect(list).toHaveClass("flex", "min-w-max", "xl:block", "xl:min-w-0");
    expect(activeItem).toHaveAttribute("aria-current", "page");
    expect(activeItem).toHaveClass("max-w-[min(76vw,260px)]", "xl:max-w-none");
    expect(within(activeItem).getByText("Payments from customers")).toHaveClass(
      "min-w-0",
      "truncate",
    );
    expect(
      within(navigation).getByRole("link", { name: "Payments from customers" }),
    ).toBeInTheDocument();
    expect(
      within(navigation).queryByRole("link", { name: "General" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Launch Center and category destinations on a normalized overview path", () => {
    mocks.pathname = "/app/settings/";

    const { container } = render(
      <SettingsShell>
        <div>Settings content</div>
      </SettingsShell>,
    );

    expect(
      container.querySelector('[data-workspace-brush-field="settingsShell"]'),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: "All settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Launch Center" })).toHaveAttribute(
      "href",
      "/app/setup",
    );
    expect(
      screen.getByRole("link", { name: "Open Workspace settings" }),
    ).toHaveAttribute("href", "/app/settings/general");
    expect(
      screen.getByRole("link", {
        name: "Open Website & customer experience settings",
      }),
    ).toHaveAttribute("href", "/app/settings/public-site");
  });

  it("keeps recovery settings visible while hiding disabled payment and AI categories", () => {
    mocks.pathname = "/app/settings";
    mocks.tenant = {
      modules: {
        bookings: false,
        courses: false,
        memberships: false,
        payments: false,
        ai: false,
      },
    };

    render(
      <SettingsShell>
        <div>Settings content</div>
      </SettingsShell>,
    );

    expect(
      screen.getByRole("link", { name: "Open Features & navigation settings" }),
    ).toHaveAttribute("href", "/app/settings/modules");
    expect(
      screen.getByRole("link", {
        name: "Open Website & customer experience settings",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Open Payments from customers settings",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows only categories allowed by a custom role", () => {
    mocks.pathname = "/app/settings";
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["workspace.update"],
    };

    render(
      <SettingsShell>
        <div>Settings content</div>
      </SettingsShell>,
    );

    expect(
      screen.getByRole("link", { name: "Launch Center" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Workspace settings" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Open Features & navigation settings",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows Migration Center as a workspace setting with its dedicated permission", () => {
    mocks.pathname = "/app/settings";
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["customers.import"],
    };

    render(
      <SettingsShell>
        <div>Settings content</div>
      </SettingsShell>,
    );

    expect(
      screen.getByRole("link", { name: "Open Workspace settings" }),
    ).toHaveAttribute("href", "/app/settings/migration");
  });
});
