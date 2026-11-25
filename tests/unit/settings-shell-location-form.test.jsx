import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messagesEn from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  pathname: "/app/settings/locations/new",
  search: "",
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

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => mocks.pathname,
}));

vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({ modules: {} }),
  selectCurrentWorkspaceAccess: () => ({ role: "owner", status: "active" }),
}));

vi.mock("@/components/settings/SettingsPlanSummary", () => ({
  default: () => <div data-settings-plan-summary />,
}));

import SettingsShell from "@/components/settings/SettingsShell";

const renderShell = () =>
  render(
    <SettingsShell>
      <div>Settings form</div>
    </SettingsShell>,
  );

describe("SettingsShell focused forms", () => {
  beforeEach(() => {
    mocks.pathname = "/app/settings/locations/new";
    mocks.search = "";
  });

  it.each([
    ["/app/settings/locations/new", "location-create"],
    ["/app/settings/locations/new/", "location-create"],
    ["/app/settings/locations/64b000000000000000000001/edit", "location-edit"],
    ["/app/settings/locations/64b000000000000000000001/edit/", "location-edit"],
  ])("gives %s a full-width focused shell", (pathname, mode) => {
    mocks.pathname = pathname;
    const { container } = renderShell();
    const focusedShell = container.querySelector(
      `[data-focused-settings-mode="${mode}"]`,
    );

    expect(focusedShell).toHaveClass("w-full", "max-w-none");
    expect(screen.getByText("Settings form")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-settings-hub]"),
    ).not.toBeInTheDocument();
  });

  it("preserves the guided setup shell around an ordinary settings page", () => {
    mocks.pathname = "/app/settings/general";
    mocks.search = "setupStep=studio";
    const { container } = renderShell();
    const guidedShell = container.querySelector(
      '[data-guided-settings-mode="studio"]',
    );

    expect(guidedShell).toHaveClass("max-w-[1040px]");
    expect(guidedShell).not.toHaveAttribute("data-focused-settings-mode");
    expect(screen.getByText("Settings form")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-settings-hub]"),
    ).not.toBeInTheDocument();
  });

  it("preserves both guided context and full width when creating a setup location", () => {
    mocks.search = "setupStep=location";
    const { container } = renderShell();
    const focusedShell = container.querySelector(
      '[data-focused-settings-mode="location-create"]',
    );

    expect(focusedShell).toHaveAttribute(
      "data-guided-settings-mode",
      "location",
    );
    expect(focusedShell).toHaveClass("w-full", "max-w-none");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it.each([
    "/app/settings/locations",
    "/app/settings/locations/64b000000000000000000001",
  ])("retains the regular settings navigation at %s", (pathname) => {
    mocks.pathname = pathname;
    mocks.search = "setupStep=";
    const { container } = renderShell();

    expect(
      screen.getByRole("navigation", {
        name: messagesEn.UnifiedSettings.navigation,
      }),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-focused-settings-mode]"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-guided-settings-mode]"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Settings form")).toBeInTheDocument();
  });
});
