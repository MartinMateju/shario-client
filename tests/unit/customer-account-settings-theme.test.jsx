import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AccountSettingsPage from "@/components/views/settings/AccountSettingsPage";

vi.mock("next-intl", () => ({
  useLocale: () => "cs",
  useTranslations: () => (key) => key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/portal/account",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({ auth: { userInfo: { id: "account-42" }, tenant: null } }),
  useStore: () => ({ getState: () => ({ auth: {} }) }),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({
    tenant: {
      slug: "clay-studio",
      settings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
    },
  }),
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetAccountQuery: () => {
    const data = {
      account: {
        customId: "CUSTOMER-42",
        email: "mia@example.com",
        firstname: "Mia",
        id: "account-42",
        lastname: "Maker",
        memberNumber: 234,
        phone: "+420 123 456 789",
      },
    };
    return {
      data,
      currentData: data,
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
  useUpdateAccountPasswordMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateAccountProfileMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateCustomerPreferencesMutation: () => [vi.fn(), { isLoading: false }],
}));

const darkTenantStyle = {
  "--tenant-accent": "#E6C96D",
  "--tenant-accent-foreground": "#111111",
  "--tenant-accent-link": "#F6DE91",
  "--tenant-accent-on-surface": "#F6DE91",
  "--tenant-background": "#111111",
  "--tenant-label-color": "#F6DE91",
  "--tenant-muted-on-surface": "#C8C8C8",
  "--tenant-muted-text": "#BDBDBD",
  "--tenant-surface": "#2D2D2D",
  "--tenant-text": "#FFFFFF",
  "--tenant-text-on-surface": "#FFFFFF",
};

describe("customer portal account settings theme", () => {
  it("uses page and raised-surface tokens for a dark tenant palette", () => {
    render(
      <div data-testid="dark-tenant" style={darkTenantStyle}>
        <AccountSettingsPage portalMode />
      </div>,
    );

    const tenantRoot = screen.getByTestId("dark-tenant");
    const surfaces = tenantRoot.querySelectorAll(
      "[data-customer-portal-surface]",
    );

    expect(tenantRoot).toHaveStyle({
      "--tenant-background": "#111111",
      "--tenant-surface": "#2D2D2D",
    });
    expect(surfaces).toHaveLength(4);
    for (const surface of surfaces) {
      expect(surface).toHaveClass(
        "bg-[var(--tenant-surface)]",
        "text-[var(--tenant-text-on-surface)]",
      );
    }

    expect(screen.getByText("eyebrow")).toHaveClass(
      "text-[var(--tenant-label-color)]",
    );
    expect(
      screen.getByRole("heading", { name: "title", level: 1 }),
    ).toHaveClass("text-[var(--tenant-text)]");

    const profileTitle = screen.getByRole("heading", {
      name: "profile.title",
    });
    const profileHeader = profileTitle.closest("div.border-b");
    expect(profileHeader).toHaveClass(
      "bg-[var(--tenant-background)]",
      "text-[var(--tenant-text)]",
    );
    expect(profileTitle).toHaveClass("text-[var(--tenant-text)]");
    expect(screen.getByText("profile.description")).toHaveClass(
      "text-[var(--tenant-muted-text)]",
    );

    for (const label of [
      "fields.firstname",
      "fields.lastname",
      "fields.phone",
      "fields.email",
      "fields.currentPassword",
      "fields.newPassword",
      "fields.confirmPassword",
      "currentLabel",
      "defaultLabel",
    ]) {
      expect(screen.getByText(label)).toHaveClass(
        "text-[var(--tenant-text-on-surface)]",
      );
    }

    expect(screen.getByText("emailNotice")).toHaveClass(
      "text-[var(--tenant-muted-on-surface)]",
    );
    expect(screen.getByText(/accountId: #234/)).toBeVisible();
    expect(screen.queryByText(/CUSTOMER-42/)).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "actions.showPassword" })[0],
    ).toHaveClass("text-[var(--tenant-muted-on-surface)]");
  });
});
