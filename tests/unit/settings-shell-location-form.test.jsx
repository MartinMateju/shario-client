import { render, screen } from "@testing-library/react";

import SettingsShell from "@/components/settings/SettingsShell";

const pathname = vi.hoisted(() => ({
  value: "/app/settings/locations/64b000000000000000000001/edit",
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => pathname.value,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({}),
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
}));

vi.mock("@/components/decorations/WorkspaceBrushField", () => ({
  default: () => null,
}));

vi.mock("@/components/ui/horizontalScroll", () => ({
  revealElementHorizontally: vi.fn(),
}));

vi.mock("@/components/settings/settingsNavigation", () => ({
  SETTINGS_OVERVIEW_PATH: "/app/settings",
  canAccessSettingsItem: () => false,
  getActiveSettingsGroup: () => null,
  getVisibleSettingsGroups: () => [],
  isSettingsItemActive: () => false,
  launchCenterItem: { href: "/app/setup", icon: () => null },
}));

describe("SettingsShell location forms", () => {
  it("gives the edit route the same full-width focused shell as create", () => {
    render(
      <SettingsShell>
        <div>Edit form</div>
      </SettingsShell>,
    );

    const focusedShell = document.querySelector(
      '[data-focused-settings-mode="location-edit"]',
    );
    expect(focusedShell).toBeInTheDocument();
    expect(focusedShell).toHaveClass("w-full", "max-w-none");
    expect(screen.getByText("Edit form")).toBeInTheDocument();
    expect(document.querySelector("aside")).not.toBeInTheDocument();
  });
});
