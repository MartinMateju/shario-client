import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messagesEn from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  pathname: "/app/settings/payments",
  search: "",
  workspaceAccess: { role: "owner", status: "active" },
  tenant: { modules: {} },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const message = `${namespace}.${key}`
        .split(".")
        .reduce((value, part) => value?.[part], messagesEn);
      if (typeof message !== "string")
        throw new Error(`Missing message: ${namespace}.${key}`);
      return message.replace(
        /\{(\w+)\}/g,
        (_, name) => values[name] ?? `{${name}}`,
      );
    },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: { workspaceAccess: mocks.workspaceAccess, tenant: mocks.tenant },
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

vi.mock("@/components/settings/SettingsPlanSummary", () => ({
  default: () => <div data-settings-plan-summary />,
}));

import SettingsShell from "@/components/settings/SettingsShell";

const renderShell = () =>
  render(
    <SettingsShell>
      <div>Settings content</div>
    </SettingsShell>,
  );
const backLabel = (section) =>
  messagesEn.UnifiedSettings.backTo.replace("{section}", section);

describe("SettingsShell unified navigation", () => {
  beforeEach(() => {
    mocks.pathname = "/app/settings/payments";
    mocks.search = "";
    mocks.workspaceAccess = { role: "owner", status: "active" };
    mocks.tenant = { modules: {} };
  });

  it("keeps the same Studio and My settings destinations on a studio detail page", () => {
    const labels = messagesEn.UnifiedSettings;
    const { container } = renderShell();
    const navigation = screen.getByRole("navigation", {
      name: labels.navigation,
    });
    const studio = within(navigation).getByRole("link", {
      name: labels.studioTitle,
    });
    const personal = within(navigation).getByRole("link", {
      name: labels.personalTitle,
    });

    expect(
      screen.getByRole("heading", { name: labels.title }),
    ).toBeInTheDocument();
    expect(within(navigation).getAllByRole("link")).toHaveLength(2);
    expect(studio).toHaveAttribute("href", "/app/settings?section=studio");
    expect(studio).toHaveAttribute("aria-current", "page");
    expect(personal).toHaveAttribute("href", "/app/settings?section=personal");
    expect(personal).not.toHaveAttribute("aria-current");
    expect(
      screen.getByRole("link", { name: backLabel(labels.studioTitle) }),
    ).toHaveAttribute("href", "/app/settings");
    expect(container.querySelector("[data-settings-scope]")).toHaveTextContent(
      labels.studioScope,
    );
    expect(screen.getByText("Settings content")).toBeInTheDocument();
    expect(
      container.querySelector('[data-workspace-brush-field="settingsShell"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Launch Center/ }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["", "studio"],
    ["section=studio", "studio"],
    ["section=personal", "personal"],
    ["section=unknown", "studio"],
  ])(
    "selects the overview section from %s on a normalized path",
    (search, section) => {
      mocks.pathname = "/app/settings/";
      mocks.search = search;
      const labels = messagesEn.UnifiedSettings;
      const { container } = renderShell();
      const title =
        section === "personal" ? labels.personalTitle : labels.studioTitle;

      expect(container.querySelector("[data-settings-hub]")).toHaveAttribute(
        "data-settings-section",
        section,
      );
      expect(screen.getByRole("link", { name: title })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(
        screen.getByText(
          section === "personal"
            ? labels.personalDescription
            : labels.studioDescription,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: backLabel(title) }),
      ).not.toBeInTheDocument();
    },
  );

  it.each(["", "section=studio", "section=personal"])(
    "gives staff without studio permissions personal settings for %s",
    (search) => {
      mocks.pathname = "/app/settings";
      mocks.search = search;
      mocks.workspaceAccess = {
        role: "staff",
        status: "active",
        effectivePermissions: [],
      };
      const labels = messagesEn.UnifiedSettings;
      const { container } = renderShell();
      const navigation = screen.getByRole("navigation", {
        name: labels.navigation,
      });

      expect(container.querySelector("[data-settings-hub]")).toHaveAttribute(
        "data-settings-section",
        "personal",
      );
      expect(within(navigation).getAllByRole("link")).toHaveLength(1);
      expect(
        within(navigation).getByRole("link", { name: labels.personalTitle }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.queryByRole("link", { name: labels.studioTitle }),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector("[data-settings-scope]"),
      ).toHaveTextContent(labels.personalScope);
      expect(screen.getByText("Settings content")).toBeInTheDocument();
    },
  );

  it("keeps Studio available for a narrow administration role", () => {
    mocks.pathname = "/app/settings";
    mocks.workspaceAccess = {
      role: "custom",
      status: "active",
      effectivePermissions: ["customers.import"],
    };
    renderShell();

    expect(
      screen.getByRole("link", {
        name: messagesEn.UnifiedSettings.studioTitle,
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", {
        name: messagesEn.UnifiedSettings.personalTitle,
      }),
    ).toHaveAttribute("href", "/app/settings?section=personal");
  });

  it("does not expose Studio when the member's only permitted module is disabled", () => {
    mocks.pathname = "/app/settings";
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["payments.view"],
    };
    mocks.tenant = { modules: { payments: false } };
    renderShell();

    expect(
      screen.queryByRole("link", {
        name: messagesEn.UnifiedSettings.studioTitle,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: messagesEn.UnifiedSettings.personalTitle,
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["/app/settings/profile", "personalProfileScope"],
    ["/app/settings/preferences", "personalPreferencesScope"],
  ])(
    "keeps personal detail %s in its section despite a stale section query",
    (pathname, scopeKey) => {
      mocks.pathname = pathname;
      mocks.search = "section=studio";
      const labels = messagesEn.UnifiedSettings;
      const { container } = renderShell();

      expect(container.querySelector("[data-settings-hub]")).toHaveAttribute(
        "data-settings-section",
        "personal",
      );
      expect(
        screen.getByRole("link", { name: labels.personalTitle }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        screen.getByRole("link", { name: backLabel(labels.personalTitle) }),
      ).toHaveAttribute("href", "/app/settings?section=personal");
      expect(
        container.querySelector("[data-settings-scope]"),
      ).toHaveTextContent(labels.personalScope);
      expect(screen.getByText(labels[scopeKey])).toBeInTheDocument();
    },
  );

  it("keeps studio detail pages in Studio despite a stale personal query", () => {
    mocks.search = "section=personal";
    const labels = messagesEn.UnifiedSettings;
    renderShell();

    expect(
      screen.getByRole("link", { name: labels.studioTitle }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: backLabel(labels.studioTitle) }),
    ).toHaveAttribute("href", "/app/settings");
  });
});
