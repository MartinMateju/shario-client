import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  tenant: { settings: { adminLanguage: "cs" } },
  access: { role: "owner", status: "active" },
}));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => en.UnifiedSettings.language[key],
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({ auth: { tenant: mocks.tenant, workspaceAccess: mocks.access } }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
import SettingsLanguageSummary from "@/components/settings/SettingsLanguageSummary";

describe("settings language summary", () => {
  beforeEach(() => {
    mocks.tenant = { settings: { adminLanguage: "cs" } };
    mocks.access = { role: "owner", status: "active" };
  });
  it("shows the configured studio language and a direct edit destination", () => {
    render(<SettingsLanguageSummary />);
    expect(screen.getByText("Čeština")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Change language" }),
    ).toHaveAttribute("href", "/app/settings/general#workspace-language");
    expect(
      screen.getByText(en.UnifiedSettings.language.sharedScope),
    ).toBeInTheDocument();
  });
  it("shows staff who manages the shared language without an inaccessible edit link", () => {
    mocks.access = { role: "staff", status: "active", permissions: [] };
    render(<SettingsLanguageSummary />);
    expect(screen.getByText("Čeština")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(en.UnifiedSettings.language.managedByAdmin),
    ).toBeInTheDocument();
  });
  it("uses the displayed language until configured locale data is available", () => {
    mocks.tenant = {};
    render(<SettingsLanguageSummary />);
    expect(screen.getByText("English")).toBeInTheDocument();
  });
});
