import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CustomerAuthField from "@/components/auth/CustomerAuthField";
import CustomerAuthShell from "@/components/auth/CustomerAuthShell";

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

describe("public customer login split layout", () => {
  it("renders one responsive image story beside a minimal form panel", () => {
    render(
      <CustomerAuthShell {...shellProps}>
        <form aria-label="Customer sign in form">
          <input aria-label="E-mail" />
        </form>
      </CustomerAuthShell>,
    );

    const surface = screen.getByRole("main");
    const layout = surface.querySelector("[data-auth-layout]");
    const visualColumn = surface.querySelector("[data-auth-visual-column]");
    const visual = surface.querySelector("[data-auth-visual]");
    const visualContent = surface.querySelector("[data-auth-visual-content]");
    const formPanel = surface.querySelector("[data-auth-form-panel]");
    const card = surface.querySelector("[data-auth-card]");
    const brand = surface.querySelector("[data-auth-form-brand]");
    const hero = surface.querySelector("[data-auth-hero-image]");

    expect(surface).toHaveAttribute("data-auth-surface", "login");
    expect(layout).toHaveClass(
      "grid",
      "overflow-clip",
      "lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]",
    );
    expect(visualColumn).toHaveClass("bg-[#34312B]");
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
      "lg:overscroll-contain",
      "lg:overflow-y-auto",
    );
    expect(visualContent).not.toHaveClass("absolute");
    expect(visualContent).toHaveAttribute("role", "region");
    expect(visualContent).toHaveAttribute(
      "aria-labelledby",
      "customer-auth-story-title",
    );
    expect(visualContent).toHaveAttribute("tabindex", "0");
    expect(formPanel).toHaveClass("items-center");
    expect(formPanel).toHaveAttribute("data-tenant-layout", "panel");
    expect(formPanel.getAttribute("style")).toContain(
      "background-color: var(--tenant-auth-form-surface",
    );
    expect(formPanel.getAttribute("style")).toContain(
      "color: var(--tenant-auth-form-text",
    );
    expect(card).toHaveClass("w-full", "max-w-[480px]");
    expect(hero).toHaveAttribute(
      "src",
      "https://images.example.com/studio.webp",
    );
    expect(hero).toHaveAttribute("alt", "");
    expect(hero).toHaveClass("object-cover");
    expect(hero.getAttribute("class")).not.toContain("opacity");

    const storyTitle = screen.getAllByRole("heading", {
      level: 1,
      name: "Welcome back.",
    });
    expect(storyTitle).toHaveLength(1);
    expect(storyTitle[0]).toHaveAttribute("id", "customer-auth-story-title");
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
      surface.querySelector("[data-auth-card] > div:last-child"),
    ).not.toHaveTextContent("Studio Olivie");
  });

  it("uses a restrained tenant-colour fallback when no image or logo exists", () => {
    render(
      <CustomerAuthShell {...shellProps} backgroundImageUrl="" logoUrl="">
        <form aria-label="Customer sign in form" />
      </CustomerAuthShell>,
    );

    const surface = screen.getByRole("main");

    expect(
      surface.querySelector("[data-auth-visual-fallback]"),
    ).toBeInTheDocument();
    expect(
      surface.querySelector("[data-auth-visual-fallback]").style.background,
    ).toContain("color-mix");
    expect(
      surface.querySelectorAll('[data-testid="brush-swash"]'),
    ).toHaveLength(2);
    expect(surface.querySelector("[data-auth-form-brand]")).toHaveTextContent(
      "Studio Olivie",
    );
    expect(surface.querySelector("[data-auth-hero-image]")).toBeNull();
  });

  it("uses the same split system for the longer registration surface", () => {
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
      "grid",
      "lg:grid-cols-[minmax(320px,0.82fr)_minmax(560px,1.18fr)]",
    );
    expect(visual).toHaveClass("lg:sticky", "lg:top-0");
    expect(formPanel).toHaveClass("items-start", "lg:py-10");
    expect(surface.querySelector("[data-auth-form-brand]")).toBeInTheDocument();
    expect(
      surface.querySelector("[data-auth-story-highlights]"),
    ).toHaveTextContent("Bookings together");
    expect(surface.querySelector("[data-auth-desktop-story]")).toBeNull();
    expect(surface.querySelector("[data-auth-mobile-story]")).toBeNull();
    expect(
      within(card).getByLabelText("Customer registration form"),
    ).toBeInTheDocument();
  });

  it("uses an unambiguous compact field size on the login surface", () => {
    const view = render(
      <CustomerAuthField
        compact
        id="compact-email"
        label="E-mail"
        value=""
        onChange={() => {}}
      />,
    );

    const input = screen.getByRole("textbox", { name: "E-mail" });

    expect(input).toHaveClass("min-h-[52px]");
    expect(input).not.toHaveClass("min-h-14", "sm:min-h-[58px]");

    view.rerender(
      <CustomerAuthField
        id="registration-email"
        label="Registration e-mail"
        value=""
        onChange={() => {}}
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "Registration e-mail" }),
    ).toHaveClass("min-h-14", "sm:min-h-[58px]");
  });
});
