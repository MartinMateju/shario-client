import { fireEvent, render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";

const mocks = vi.hoisted(() => ({
  workspaceAccess: { role: "owner", status: "active" },
  tenant: { modules: {} },
  params: "",
  locale: "en",
  setup: null,
}));
vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal()),
  useTranslations: (namespace) =>
    createTranslator({
      locale: mocks.locale,
      messages: mocks.locale === "cs" ? cs : en,
      namespace,
    }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.params),
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: { workspaceAccess: mocks.workspaceAccess, tenant: mocks.tenant },
    }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useGetSetupCenterQuery: () => ({
    data: mocks.setup,
    isSuccess: Boolean(mocks.setup),
  }),
}));
vi.mock("@/components/setup-center/setupCenter.utils", () => ({
  getLaunchCenterNavigationStatus: (data) => data,
}));
import SettingsOverviewPage from "@/components/settings/SettingsOverviewPage";

const studio = en.UnifiedSettings;
describe("Unified settings overview", () => {
  beforeEach(() => {
    mocks.workspaceAccess = { role: "owner", status: "active" };
    mocks.tenant = { modules: {} };
    mocks.params = "";
    mocks.locale = "en";
    mocks.setup = null;
  });
  it("groups studio settings and keeps advanced destinations discoverable", () => {
    const { container } = render(<SettingsOverviewPage />);
    expect(
      screen.getByRole("link", { name: studio.items.general.title }),
    ).toHaveAttribute("href", "/app/settings/general");
    expect(
      screen.getByRole("link", { name: studio.items.communications.title }),
    ).toHaveAttribute("href", "/app/settings/communications");
    expect(
      screen.getByRole("link", { name: studio.items.billing.title }),
    ).toHaveAttribute("href", "/app/settings/billing");
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(studio.advancedTitle));
    expect(
      screen.getByRole("link", { name: studio.items.modules.title }),
    ).toHaveAttribute("href", "/app/settings/modules");
    expect(
      screen.getByRole("link", { name: studio.items.migration.title }),
    ).toHaveAttribute("href", "/app/settings/migration");
    expect(
      screen.queryByRole("link", { name: studio.setupAction }),
    ).not.toBeInTheDocument();
  });
  it("filters permissions and disabled modules without hiding configuration recovery", () => {
    mocks.tenant = {
      modules: { payments: false, ai: false, communications: false },
    };
    render(<SettingsOverviewPage />);
    expect(
      screen.queryByRole("heading", { name: studio.groups.payments.title }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: studio.groups.communications.title,
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(studio.advancedTitle));
    expect(
      screen.getByRole("link", { name: studio.items.modules.title }),
    ).toBeInTheDocument();
  });
  it("shows only locations to a member with location access", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["locations.view"],
    };
    render(<SettingsOverviewPage />);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: studio.items.locations.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: studio.items.general.title }),
    ).not.toBeInTheDocument();
  });
  it("opens personal settings for members with no studio administration permissions", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: [],
    };
    render(<SettingsOverviewPage />);
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: studio.items.profile.title }),
    ).toHaveAttribute("href", "/app/settings/profile");
    expect(
      screen.getByRole("link", { name: studio.items.notifications.title }),
    ).toHaveAttribute(
      "href",
      "/app/settings/preferences#notification-preferences",
    );
    expect(
      screen.queryByRole("link", { name: studio.items.general.title }),
    ).not.toBeInTheDocument();
  });
  it("searches translated descriptions without accents and exposes advanced matches", () => {
    mocks.locale = "cs";
    const { container } = render(<SettingsOverviewPage />);
    const search = screen.getByRole("searchbox");
    fireEvent.change(search, { target: { value: "pobocky" } });
    expect(
      screen.getByRole("link", {
        name: cs.UnifiedSettings.items.locations.title,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: cs.UnifiedSettings.items.team.title }),
    ).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "import zakazniku" } });
    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(
      screen.getByRole("link", {
        name: cs.UnifiedSettings.items.migration.title,
      }),
    ).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "nonexistent setting" } });
    expect(screen.getByText(cs.UnifiedSettings.emptyTitle)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: cs.UnifiedSettings.clearSearch }),
    );
    expect(
      screen.getByRole("link", { name: cs.UnifiedSettings.items.team.title }),
    ).toBeInTheDocument();
  });
  it("resets the section search on navigation and does not expose studio settings in personal", () => {
    const view = render(<SettingsOverviewPage />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "email" },
    });
    mocks.params = "section=personal";
    view.rerender(<SettingsOverviewPage />);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(
      screen.getByRole("link", { name: studio.items.profile.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: studio.items.communications.title }),
    ).not.toBeInTheDocument();
  });
  it.each([
    [{ status: "progress", completed: 2, total: 5 }, true],
    [{ status: "progress", completed: 5, total: 5 }, false],
    [{ status: "live", completed: 2, total: 5 }, false],
    [{ status: "attention", completed: 5, total: 5, issueCount: 1 }, false],
  ])("only offers setup for an incomplete checklist: %j", (setup, visible) => {
    mocks.setup = setup;
    render(<SettingsOverviewPage />);
    expect(
      Boolean(screen.queryByRole("link", { name: studio.setupAction })),
    ).toBe(visible);
  });
});
