import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  providers: ["google", "apple"],
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    ({
      customerAccess: "Customer access",
      label: "Social sign in",
      or: "or",
      teamPasswordNote: "Social sign-in is for customer accounts.",
      "continueWith.google": "Continue with Google",
      "continueWith.apple": "Continue with Apple",
    })[key] || key,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ degraded: false }),
}));

vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useGetCustomerSocialProvidersQuery: () => ({ data: mocks.providers }),
}));

vi.mock("@/utils/tenantAuthRouting", () => ({
  buildCustomerSocialStartUrl: () => "https://api.example.com/start",
  shouldQueryCustomerSocialProviders: () => true,
}));

import CustomerSocialAuthButtons from "@/components/auth/CustomerSocialAuthButtons";

describe("customer social auth buttons", () => {
  beforeEach(() => {
    mocks.providers = ["google", "apple"];
  });

  it("renders configured Google and Apple providers in compact login mode", () => {
    render(
      <CustomerSocialAuthButtons
        tenantSlug="studio-olivie"
        locale="en"
        variant="compact"
      />,
    );

    const section = screen.getByRole("region", { name: "Social sign in" });
    const google = screen.getByRole("button", {
      name: "Continue with Google",
    });
    const divider = section.querySelector("[data-social-auth-divider]");

    expect(section).toHaveAttribute("data-social-auth-variant", "compact");
    expect(google).toHaveAttribute("type", "button");
    expect(
      screen.getByRole("button", { name: "Continue with Apple" }),
    ).toHaveAttribute("type", "button");
    expect(screen.getByText("or")).toBeInTheDocument();
    expect(divider).toHaveAttribute("data-social-auth-divider");
    expect(divider).toHaveClass(
      "my-3",
      "font-semibold",
      "uppercase",
      "tracking-[0.18em]",
    );
    expect(divider).toHaveStyle({
      color: "var(--tenant-page-label-color, var(--tenant-auth-form-label))",
    });
    expect(google.parentElement).toHaveClass("sm:grid-cols-2");
    expect(screen.queryByText("Customer access")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Social sign-in is for customer accounts."),
    ).not.toBeInTheDocument();
  });

  it("stays absent when the tenant has no configured provider", () => {
    mocks.providers = [];

    const { container } = render(
      <CustomerSocialAuthButtons tenantSlug="studio-olivie" locale="en" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("keeps a single compact provider full width", () => {
    mocks.providers = ["google"];

    render(
      <CustomerSocialAuthButtons
        tenantSlug="studio-olivie"
        locale="en"
        variant="compact"
      />,
    );

    const actions = screen.getByRole("button", {
      name: "Continue with Google",
    }).parentElement;

    expect(actions).toHaveClass("grid", "gap-2.5");
    expect(actions).not.toHaveClass("sm:grid-cols-2");
  });
});
