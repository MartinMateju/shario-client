import fs from "node:fs";
import path from "node:path";
import { createRef } from "react";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import CustomerAuthField, {
  CustomerAuthError,
  CustomerAuthPasswordField,
  CustomerAuthSubmitButton,
} from "@/components/auth/CustomerAuthField";
import CustomerAuthShell from "@/components/auth/CustomerAuthShell";

const readSource = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

const shellProps = {
  accentColor: "#4056D6",
  accountLabel: "Studio account",
  backgroundImageUrl: "https://images.example.com/studio.webp",
  description: "Keep every studio visit in one calm place.",
  eyebrow: "Your creative place",
  formDescription: "Use the account connected with this studio.",
  formEyebrow: "Customer access",
  formTitle: "Sign in",
  helpText: "Ask the studio if you need help.",
  highlights: ["Bookings together", "Secure access"],
  intentText: "Your booking selection is saved.",
  logoUrl: "https://images.example.com/logo.webp",
  mode: "login",
  secondaryColor: "#D9806E",
  tenantName: "Studio Olivie",
  themeStyle: {
    "--tenant-accent": "#4056D6",
    "--tenant-accent-foreground": "#FFFFFF",
    "--tenant-accent-link": "#3042A6",
    "--tenant-secondary": "#D9806E",
    "--tenant-background": "#FCFBF8",
    "--tenant-text": "#292925",
  },
  title: "Welcome back.",
};

describe("customer authentication design", () => {
  it("renders one semantic image story beside a minimal branded form panel", () => {
    render(
      <CustomerAuthShell {...shellProps}>
        <form aria-label="Customer sign in form">
          <input aria-label="E-mail" />
        </form>
      </CustomerAuthShell>,
    );

    const surface = screen.getByRole("main");
    const layout = surface.querySelector("[data-auth-layout]");
    const visual = surface.querySelector("[data-auth-visual]");
    const visualContent = surface.querySelector("[data-auth-visual-content]");
    const formPanel = surface.querySelector("[data-auth-form-panel]");
    const card = surface.querySelector("[data-auth-card]");
    const brand = surface.querySelector("[data-auth-form-brand]");
    const hero = surface.querySelector("[data-auth-hero-image]");

    expect(surface).toHaveAttribute("data-auth-surface", "login");
    expect(surface).toHaveClass("min-h-dvh");
    expect(surface.style.getPropertyValue("--tenant-accent")).toBe("#4056D6");
    expect(layout).toHaveClass(
      "grid",
      "overflow-clip",
      "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]",
    );
    expect(visual).toHaveClass(
      "min-h-[200px]",
      "sm:min-h-[260px]",
      "lg:sticky",
      "lg:top-0",
      "lg:h-dvh",
    );
    expect(visualContent).toHaveClass(
      "relative",
      "min-h-[200px]",
      "sm:min-h-[260px]",
      "lg:overflow-y-auto",
    );
    expect(visualContent).not.toHaveClass("absolute");
    expect(formPanel).toHaveClass("items-center");
    expect(formPanel).not.toHaveClass("bg-white");
    expect(formPanel.getAttribute("style")).toContain(
      "--tenant-auth-form-surface",
    );
    expect(formPanel.getAttribute("style")).toContain(
      "--tenant-auth-form-text",
    );
    expect(card).toHaveClass("w-full", "max-w-[480px]");
    expect(hero).toHaveAttribute(
      "src",
      "https://images.example.com/studio.webp",
    );
    expect(hero).toHaveAttribute("alt", "");
    expect(hero).toHaveClass("object-cover");
    expect(hero.getAttribute("class")).not.toContain("opacity");
    expect(
      screen.getAllByRole("heading", {
        level: 1,
        name: "Welcome back.",
      }),
    ).toHaveLength(1);
    expect(screen.getByText(shellProps.description)).toBeInTheDocument();
    expect(screen.getByText(shellProps.helpText)).toBeInTheDocument();
    expect(brand.querySelector("img")).toHaveAttribute("alt", "");
    expect(brand.querySelector("img")).toHaveClass(
      "max-h-11",
      "max-w-[160px]",
      "object-contain",
    );
    expect(brand).toHaveTextContent("Studio Olivie");
    expect(brand).not.toHaveTextContent("Studio account");
    expect(
      within(card).getByRole("heading", { level: 2, name: "Sign in" }),
    ).toHaveAttribute("id", "customer-auth-form-title");
    expect(
      within(card).getByLabelText("Customer sign in form"),
    ).toBeInTheDocument();
    expect(
      surface.querySelector("[data-booking-intent-reassurance]"),
    ).toHaveTextContent("Your booking selection is saved.");
    expect(
      surface.querySelectorAll('[data-testid="brush-swash"]'),
    ).toHaveLength(0);
    expect(
      surface.querySelector("[data-auth-visual-copy]"),
    ).toBeInTheDocument();
    expect(
      surface.querySelector(
        '[data-auth-visual-copy] [data-tenant-type="eyebrow"]',
      ),
    ).toHaveClass("border-white/45", "bg-[#11110F]");
    expect(
      surface.querySelector("[data-booking-intent-reassurance] p"),
    ).toHaveStyle({
      color:
        "var(--tenant-auth-form-text, var(--tenant-text-on-surface, #292925))",
    });
    expect(
      surface.querySelector("[data-auth-card] > div:last-child"),
    ).not.toHaveTextContent("Studio Olivie");
  });

  it("uses a tenant-colour fallback when no custom image or logo exists", () => {
    render(
      <CustomerAuthShell {...shellProps} backgroundImageUrl="" logoUrl="">
        <form aria-label="Customer sign in form" />
      </CustomerAuthShell>,
    );

    const surface = screen.getByRole("main");

    const fallback = surface.querySelector("[data-auth-visual-fallback]");

    expect(fallback).toBeInTheDocument();
    expect(fallback.getAttribute("style")).toContain("color-mix");
    expect(
      surface.querySelectorAll('[data-testid="brush-swash"]'),
    ).toHaveLength(2);
    expect(surface.querySelector("[data-auth-form-brand]")).toHaveTextContent(
      "Studio Olivie",
    );
    expect(surface.querySelector("[data-auth-hero-image]")).toBeNull();
  });

  it("aligns registration to the same responsive split composition", () => {
    render(
      <CustomerAuthShell
        {...shellProps}
        mode="register"
        formTitle="Create account"
      >
        <form aria-label="Customer registration form" />
      </CustomerAuthShell>,
    );

    const surface = screen.getByRole("main");
    const layout = surface.querySelector("[data-auth-layout]");
    const visual = surface.querySelector("[data-auth-visual]");
    const formPanel = surface.querySelector("[data-auth-form-panel]");
    const card = surface.querySelector("[data-auth-card]");

    expect(surface).toHaveAttribute("data-auth-surface", "register");
    expect(card).toHaveClass("w-full", "max-w-[620px]");
    expect(layout).toHaveClass(
      "lg:grid-cols-[minmax(320px,0.82fr)_minmax(560px,1.18fr)]",
    );
    expect(visual).toHaveClass("lg:sticky", "lg:top-0");
    expect(formPanel).toHaveClass("items-start", "lg:py-10");
    expect(
      surface.querySelector("[data-auth-story-highlights]"),
    ).toHaveTextContent("Bookings together");
    expect(surface.querySelector("[data-auth-desktop-story]")).toBeNull();
    expect(surface.querySelector("[data-auth-mobile-story]")).toBeNull();
    expect(
      within(card).getByRole("heading", {
        level: 2,
        name: "Create account",
      }),
    ).toHaveAttribute("id", "customer-auth-form-title");
    expect(
      within(card).getByLabelText("Customer registration form"),
    ).toBeInTheDocument();
  });

  it("connects field help and errors to the input accessibly", () => {
    render(
      <CustomerAuthField
        id="email"
        label="E-mail"
        value="invalid"
        onChange={() => {}}
        helperText="Use the address registered with the studio."
        error="Enter a valid e-mail address."
        required
      />,
    );

    const input = screen.getByRole("textbox", { name: /e-mail/i });

    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Use the address registered with the studio. Enter a valid e-mail address.",
    );
  });

  it("reveals and hides passwords with a named, stateful button", async () => {
    const user = userEvent.setup();

    render(
      <CustomerAuthPasswordField
        id="password"
        label="Password"
        value="Secret123"
        onChange={() => {}}
        showPasswordLabel="Show password"
        hidePasswordLabel="Hide password"
      />,
    );

    const input = screen.getByLabelText("Password");
    const reveal = screen.getByRole("button", { name: "Show password" });

    expect(input).toHaveAttribute("type", "password");
    expect(reveal).toHaveAttribute("aria-pressed", "false");

    await user.click(reveal);

    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(input).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes focused errors and a real submit control", () => {
    const errorRef = createRef();

    render(
      <form>
        <CustomerAuthError ref={errorRef}>
          Incorrect email or password.
        </CustomerAuthError>
        <CustomerAuthSubmitButton type="submit" disabled>
          Sign in
        </CustomerAuthSubmitButton>
      </form>,
    );

    const alert = screen.getByRole("alert");
    const submit = screen.getByRole("button", { name: "Sign in" });

    expect(alert).toHaveAttribute("tabindex", "-1");
    errorRef.current.focus();
    expect(alert).toHaveFocus();
    expect(submit).toHaveAttribute("type", "submit");
    expect(submit).toBeDisabled();
    expect(submit).toHaveClass(
      "w-full",
      "bg-[var(--tenant-accent)]",
      "text-[var(--tenant-accent-foreground)]",
    );
    expect(submit.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("customer auth page contracts", () => {
  const loginSource = readSource(
    "src",
    "app",
    "[locale]",
    "tenants",
    "[tenantSlug]",
    "(tenant-auth)",
    "login",
    "page.js",
  );
  const registerSource = readSource(
    "src",
    "app",
    "[locale]",
    "tenants",
    "[tenantSlug]",
    "(tenant-auth)",
    "register",
    "page.js",
  );

  it.each([
    ["login", loginSource],
    ["register", registerSource],
  ])(
    "keeps social auth and safe booking continuation directly on %s",
    (_page, source) => {
      expect(source).toContain(
        'import CustomerSocialAuthButtons from "@/components/auth/CustomerSocialAuthButtons"',
      );
      expect(source).toContain("<CustomerSocialAuthButtons");
      expect(source).toContain(
        'getSafeTenantNextPath(searchParams.get("next"))',
      );
      expect(source).toContain("nextPath={safeNextPath}");
      expect(source).toContain("buildTenantAuthHref");
      expect(source).toContain("aria-busy={isLoading}");
      expect(source).not.toContain(
        'import Loader from "@/components/loaders/Loader"',
      );
      expect(source).not.toMatch(/return\s+<Loader\b/);
    },
  );

  it("keeps login errors, password access, and customer-only continuation", () => {
    expect(loginSource).toContain("<CustomerAuthPasswordField");
    expect(loginSource).toContain("<CustomerAuthError ref={errRef}");
    expect(loginSource).toContain(
      '<CustomerAuthSubmitButton type="submit" disabled={isLoading}>',
    );
    expect(loginSource).toMatch(
      /router\.replace\(safeNextPath \|\| "\/portal",\s*\{\s*locale: resolveCustomerAuthLocale\(\s*\{/,
    );
    expect(loginSource).toContain(
      'getSafeTenantNextPath(searchParams.get("next"))',
    );
    expect(loginSource).toContain("useCustomerLoginMutation");
    expect(loginSource).not.toContain("getUserAccess");
    expect(loginSource).not.toContain('router.replace("/app")');
    expect(loginSource).toContain(
      'errorCode === "EMAIL_VERIFICATION_REQUIRED"',
    );
  });

  it("validates registration on submit without disabling the correction path", () => {
    expect(registerSource).toContain("markAllTouched();");
    expect(registerSource).toContain("if (!validation.validFirstName)");
    expect(registerSource).toContain("!validation.validLastName");
    expect(registerSource).toContain("!validation.validEmail");
    expect(registerSource).toContain("!validation.validPhone");
    expect(registerSource).toContain("!validation.validPassword");
    expect(registerSource).toContain("!validation.passwordMatch");
    expect(registerSource).toContain("legal.studioRules && !rulesAgreement");
    expect(registerSource).toContain("legal.terms && !termsAgreement");
    expect(registerSource).toContain(
      "const response = await addNewUser(payload).unwrap()",
    );
    expect(registerSource).toContain("next: safeNextPath");
    expect(registerSource).toContain(
      '<CustomerAuthSubmitButton type="submit" disabled={isLoading}>',
    );
    expect(registerSource).toContain(
      'aria-labelledby="customer-auth-form-title"',
    );
    expect(registerSource).toContain('variant="compact"');
    expect(registerSource).not.toContain(
      "disabled={!validation.isFormValid || isLoading}",
    );
  });
});
