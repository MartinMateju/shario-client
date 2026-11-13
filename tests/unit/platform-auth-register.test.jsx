import fs from "node:fs";
import path from "node:path";
import React from "react";

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlatformRegisterPage from "@/app/[locale]/register/page";
import czechMessages from "@/messages/cs.json";
import englishMessages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  buildOnboardingUrl: vi.fn(),
  catalogs: {},
  isLoading: false,
  locale: "en",
  registerTenant: vi.fn(),
  registerUnwrap: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const message = `${namespace}.${key}`
        .split(".")
        .reduce(
          (current, segment) => current?.[segment],
          mocks.catalogs[mocks.locale],
        );

      if (typeof message !== "string") {
        return `${namespace}.${key}`;
      }

      return message.replace(/\{([^}]+)\}/g, (_match, name) =>
        String(values[name] ?? `{${name}}`),
      );
    },
}));

vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");

  return {
    Link: ({ children, href, locale, ...props }) =>
      createElement(
        "a",
        {
          ...props,
          "data-locale": locale,
          href,
        },
        children,
      ),
  };
});

vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useRegisterTenantMutation: () => [
    mocks.registerTenant,
    { isLoading: mocks.isLoading },
  ],
}));

vi.mock("@/utils/tenantRouting", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    buildRegisteredTenantOnboardingUrl: (...args) =>
      mocks.buildOnboardingUrl(...args),
  };
});

const COPY = {
  en: {
    checkbox: /I agree to the Terms of Service and Privacy Policy/i,
    completeRequired: "Please complete all required fields.",
    confirmPassword: "Confirm password",
    createFailed: "We could not create your account. Please try again.",
    email: "Email address",
    firstName: "First name",
    hidePassword: "Hide password",
    hidePasswordConfirm: "Hide password confirmation",
    lastName: "Last name",
    password: "Password",
    privacy: "Privacy Policy",
    showPassword: "Show password",
    showPasswordConfirm: "Show password confirmation",
    signIn: "Sign in",
    studioName: "Studio name",
    submit: "Create my studio",
    terms: "Terms of Service",
    title: "Create your studio workspace",
    workspace: "Workspace address",
  },
  cs: {
    checkbox: /Souhlasím.*Obchodní.*Zásady ochrany osobních údajů/i,
    completeRequired: "Vyplňte prosím všechna povinná pole.",
    confirmPassword: "Potvrzení hesla",
    createFailed: "Účet se nepodařilo vytvořit. Zkuste to prosím znovu.",
    email: "E-mail",
    firstName: "Jméno",
    hidePassword: "Skrýt heslo",
    hidePasswordConfirm: "Skrýt potvrzení hesla",
    lastName: "Příjmení",
    password: "Heslo",
    privacy: "Zásady ochrany osobních údajů",
    showPassword: "Zobrazit heslo",
    showPasswordConfirm: "Zobrazit potvrzení hesla",
    signIn: "Přihlásit se",
    studioName: "Název studia",
    submit: "Vytvořit studio",
    terms: "Obchodní podmínky",
    title: "Vytvořte si studio",
    workspace: "Adresa studia",
  },
};

const leafKeys = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object"
      ? leafKeys(child, keyPath)
      : [keyPath];
  });

const renderRegister = (locale = "en") => {
  mocks.locale = locale;

  return render(<PlatformRegisterPage />);
};

const completeRegistration = async ({ locale = "en", user }) => {
  const copy = COPY[locale];

  await user.type(screen.getByLabelText(copy.firstName), "  Ada  ");
  await user.type(screen.getByLabelText(copy.lastName), "  Lovelace  ");
  await user.type(screen.getByLabelText(copy.studioName), "  Atelier Nova  ");
  fireEvent.change(screen.getByLabelText(copy.workspace), {
    target: { value: "atelier-nova-custom" },
  });
  await user.type(screen.getByLabelText(copy.email), "  Owner@Example.COM  ");
  await user.type(screen.getByLabelText(copy.password), "StudioPass1");
  await user.type(screen.getByLabelText(copy.confirmPassword), "StudioPass1");
  await user.click(screen.getByRole("checkbox", { name: copy.checkbox }));
};

beforeEach(() => {
  mocks.catalogs = {
    cs: czechMessages,
    en: englishMessages,
  };
  mocks.locale = "en";
  mocks.isLoading = false;
  mocks.registerTenant.mockReset();
  mocks.registerUnwrap.mockReset();
  mocks.buildOnboardingUrl.mockReset();

  mocks.registerTenant.mockImplementation(() => ({
    unwrap: mocks.registerUnwrap,
  }));
  mocks.registerUnwrap.mockResolvedValue({
    tenant: { slug: "atelier-nova" },
  });
  mocks.buildOnboardingUrl.mockReturnValue("#tenant-onboarding");

  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.stubGlobal("requestAnimationFrame", (callback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (frame) => window.clearTimeout(frame));
});

describe("global workspace registration presentation", () => {
  it("keeps the English and Czech registration catalogs in parity", () => {
    expect(englishMessages.PlatformAuth.register).toBeTruthy();
    expect(czechMessages.PlatformAuth.register).toBeTruthy();
    expect(leafKeys(czechMessages.PlatformAuth.register).sort()).toEqual(
      leafKeys(englishMessages.PlatformAuth.register).sort(),
    );
  });

  it.each(["en", "cs"])(
    "renders the exact accessible %s registration controls",
    (locale) => {
      const copy = COPY[locale];

      renderRegister(locale);

      const form = screen.getByRole("form", { name: copy.title });

      expect(
        within(form).getByRole("heading", {
          level: 1,
          name: copy.title,
        }),
      ).toBeVisible();

      for (const label of [
        copy.firstName,
        copy.lastName,
        copy.studioName,
        copy.workspace,
        copy.email,
        copy.password,
        copy.confirmPassword,
      ]) {
        expect(within(form).getByLabelText(label)).toBeRequired();
      }

      expect(within(form).getByLabelText(copy.email)).toHaveAttribute(
        "autocomplete",
        "email",
      );
      expect(within(form).getByLabelText(copy.firstName)).toHaveAttribute(
        "autocomplete",
        "given-name",
      );
      expect(within(form).getByLabelText(copy.lastName)).toHaveAttribute(
        "autocomplete",
        "family-name",
      );
      expect(within(form).getByLabelText(copy.studioName)).toHaveAttribute(
        "autocomplete",
        "organization",
      );
      expect(within(form).getByLabelText(copy.workspace)).toHaveAttribute(
        "pattern",
        "[a-z0-9]+(?:-[a-z0-9]+)*",
      );
      expect(within(form).getByLabelText(copy.password)).toHaveAttribute(
        "autocomplete",
        "new-password",
      );
      expect(within(form).getByLabelText(copy.confirmPassword)).toHaveAttribute(
        "autocomplete",
        "new-password",
      );
      expect(
        within(form).getByRole("checkbox", { name: copy.checkbox }),
      ).toBeRequired();
      expect(
        within(form).getByRole("button", { name: copy.showPassword }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        within(form).getByRole("button", {
          name: copy.showPasswordConfirm,
        }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(
        within(form).getByRole("button", { name: copy.submit }),
      ).toBeEnabled();
      expect(screen.getByRole("link", { name: copy.signIn })).toHaveAttribute(
        "href",
        "/login",
      );
    },
  );

  it("renders breakpoint-exclusive WebP brush accents without another page header", () => {
    renderRegister();

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    const brushes = screen.getAllByTestId("brush-swash");

    const mobileBrushes = within(
      document.querySelector("[data-platform-auth-brushes]"),
    ).getAllByTestId("brush-swash");
    const desktopBrushes = within(
      document.querySelector("[data-platform-auth-visual]"),
    ).getAllByTestId("brush-swash");

    expect(brushes).toHaveLength(4);
    expect(mobileBrushes).toHaveLength(2);
    expect(desktopBrushes).toHaveLength(2);
    expect(
      brushes.map((brush) => brush.getAttribute("data-brush-texture")),
    ).toEqual(["loaded", "rake", "loaded", "rake"]);
    expect(
      brushes.map((brush) => brush.getAttribute("data-brush-texture-src")),
    ).toEqual([
      "/images/marketing/brush-loaded-wide.webp",
      "/images/marketing/brush-dry-rake.webp",
      "/images/marketing/brush-loaded-wide.webp",
      "/images/marketing/brush-dry-rake.webp",
    ]);
  });

  it("uses the shared public theme and short-height controls from login", () => {
    renderRegister();

    const page = document.querySelector("[data-platform-register-page]");
    const grid = document.querySelector("[data-platform-auth-grid]");
    const leftPanel = document.querySelector("[data-platform-auth-left]");
    const card = document.querySelector("[data-platform-register-card]");
    const workspaceControl = document.querySelector(
      "[data-platform-workspace-control]",
    );
    const editorialPanel = document.querySelector(
      "[data-platform-register-visual]",
    );
    const storyCard = document.querySelector("[data-platform-auth-story-card]");
    const submit = screen.getByRole("button", { name: COPY.en.submit });
    const benefits = screen.getByText("14 days free").parentElement;

    expect(page).toHaveAttribute("data-skab-public-surface");
    expect(grid).toHaveClass("xl:grid-cols-2");
    expect(leftPanel).toHaveClass("flex", "flex-col");
    expect(card).toHaveClass(
      "max-w-[620px]",
      "rounded-[var(--studio-radius)]",
      "border-[var(--studio-rule)]",
      "bg-[var(--studio-white)]",
      "[@media(max-height:800px)]:p-5",
    );
    expect(workspaceControl).toHaveClass(
      "rounded-[var(--studio-radius)]",
      "[@media(max-height:800px)]:h-11",
    );
    expect(benefits).toHaveClass(
      "xl:hidden",
      "[@media(max-height:800px)]:mt-2",
    );
    expect(editorialPanel).toHaveAttribute("data-platform-auth-full-height");
    expect(editorialPanel).toHaveClass("self-stretch", "xl:sticky", "xl:top-0");
    expect(editorialPanel).toHaveStyle({
      height: "100dvh",
      minHeight: "100dvh",
    });
    expect(editorialPanel?.getAttribute("style")).toContain(
      "var(--studio-paper)",
    );
    expect(storyCard).toHaveClass(
      "max-w-[350px]",
      "rounded-[var(--studio-radius)]",
      "bg-[var(--studio-white)]",
    );
    expect(submit).toHaveAttribute("data-platform-auth-submit");
    expect(submit).toBeEnabled();
    expect(submit).toHaveClass(
      "disabled:bg-[var(--studio-soft)]",
      "disabled:text-[var(--studio-muted)]",
      "disabled:opacity-100",
      "[@media(max-height:800px)]:min-h-11",
    );
  });

  it("provides independent stateful visibility controls for both passwords", async () => {
    const user = userEvent.setup();
    renderRegister();

    const password = screen.getByLabelText(COPY.en.password);
    const confirmation = screen.getByLabelText(COPY.en.confirmPassword);
    const revealPassword = screen.getByRole("button", {
      name: COPY.en.showPassword,
    });
    const revealConfirmation = screen.getByRole("button", {
      name: COPY.en.showPasswordConfirm,
    });

    expect(password).toHaveAttribute("type", "password");
    expect(confirmation).toHaveAttribute("type", "password");
    expect(revealPassword).toHaveAttribute("aria-pressed", "false");
    expect(revealConfirmation).toHaveAttribute("aria-pressed", "false");

    await user.click(revealPassword);

    expect(password).toHaveAttribute("type", "text");
    expect(confirmation).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: COPY.en.hidePassword }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(revealConfirmation);

    expect(confirmation).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: COPY.en.hidePasswordConfirm }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps legal agreement names in the required consent without dead links", () => {
    renderRegister();

    expect(screen.getByText(COPY.en.terms)).toBeVisible();
    expect(screen.getByText(COPY.en.privacy)).toBeVisible();
    expect(
      screen.queryByRole("link", { name: COPY.en.terms }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: COPY.en.privacy }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: COPY.en.checkbox }),
    ).toBeRequired();
  });
});

describe("global workspace registration behavior", () => {
  it("shows and focuses a validation alert while keeping correction available", async () => {
    const user = userEvent.setup();
    renderRegister();

    const submit = screen.getByRole("button", { name: COPY.en.submit });

    expect(submit).toBeEnabled();
    await user.click(submit);

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(COPY.en.completeRequired);
    expect(alert).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(mocks.registerTenant).not.toHaveBeenCalled();
  });

  it("generates a diacritic-safe workspace slug and keeps it manually editable", async () => {
    const user = userEvent.setup();
    renderRegister("cs");

    const studioName = screen.getByLabelText(COPY.cs.studioName);
    const workspace = screen.getByLabelText(COPY.cs.workspace);

    await user.type(studioName, "Ateliér Žlutá Hlína");
    expect(workspace).toHaveValue("atelier-zluta-hlina");

    fireEvent.change(workspace, {
      target: { value: "moje-vlastni-studio" },
    });
    expect(workspace).toHaveValue("moje-vlastni-studio");
  });

  it("marks mismatched password confirmation invalid with a description", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(COPY.en.password), "StudioPass1");
    await user.type(
      screen.getByLabelText(COPY.en.confirmPassword),
      "DifferentPass1",
    );
    await user.click(screen.getByRole("button", { name: COPY.en.submit }));

    const confirmation = screen.getByLabelText(COPY.en.confirmPassword);

    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(confirmation).toHaveAccessibleDescription();
  });

  it("submits normalized account fields and independent region preferences for tenant onboarding", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-PL"]);
    const user = userEvent.setup();
    window.localStorage.setItem("shario:last-workspace", "existing-studio");
    renderRegister();
    await completeRegistration({ user });

    await user.click(screen.getByRole("button", { name: COPY.en.submit }));

    await waitFor(() => {
      expect(mocks.registerTenant).toHaveBeenCalledWith({
        email: "owner@example.com",
        firstname: "Ada",
        lastname: "Lovelace",
        password: "StudioPass1",
        slug: "atelier-nova-custom",
        tenantName: "Atelier Nova",
        locale: "en",
        country: "PL",
        currency: "PLN",
        timezone: expect.any(String),
      });
    });
    expect(mocks.buildOnboardingUrl).toHaveBeenCalledWith({
      locale: "en",
      requestedSlug: "atelier-nova-custom",
      tenant: { slug: "atelier-nova" },
    });
    expect(window.localStorage.getItem("shario:last-workspace")).toBe(
      "existing-studio",
    );
    expect(window.location.hash).toBe("#tenant-onboarding");
  });

  it("announces and focuses localized copy instead of raw registration errors", async () => {
    const user = userEvent.setup();
    mocks.registerUnwrap.mockRejectedValueOnce({
      data: { message: "Tento identifikátor studia je již obsazený." },
      status: 409,
    });
    renderRegister("cs");
    await completeRegistration({ locale: "cs", user });

    await user.click(screen.getByRole("button", { name: COPY.cs.submit }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(COPY.cs.createFailed);
    expect(alert).not.toHaveTextContent(
      "Tento identifikátor studia je již obsazený.",
    );
    expect(alert).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(alert).toHaveFocus());
  });

  it("uses the localized fallback when registration has no server message", async () => {
    const user = userEvent.setup();
    mocks.registerUnwrap.mockRejectedValueOnce({ status: 500 });
    renderRegister("cs");
    await completeRegistration({ locale: "cs", user });

    await user.click(screen.getByRole("button", { name: COPY.cs.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      COPY.cs.createFailed,
    );
  });
});

describe("global registration source contracts", () => {
  it("keeps owner registration separate and hands the route to the auth-only header", () => {
    const repositoryRoot = process.cwd();
    const authApiSource = fs.readFileSync(
      path.join(repositoryRoot, "src/lib/features/auth/authApiSlice.js"),
      "utf8",
    );
    const headerSource = fs.readFileSync(
      path.join(repositoryRoot, "src/components/headers/Header.js"),
      "utf8",
    );
    const registerSource = fs.readFileSync(
      path.join(repositoryRoot, "src/app/[locale]/register/page.js"),
      "utf8",
    );
    const authHeaderSource = fs.readFileSync(
      path.join(repositoryRoot, "src/components/auth/PlatformAuthHeader.js"),
      "utf8",
    );

    expect(authApiSource).toMatch(
      /export const buildRegisterTenantRequest[\s\S]*?url:\s*["']\/auth\/tenant\/register["']/,
    );
    expect(authApiSource).toMatch(
      /registerTenant:\s*builder\.mutation\(\{[\s\S]*?query:\s*buildRegisterTenantRequest/,
    );
    expect(registerSource).toContain("useRegisterTenantMutation");
    expect(registerSource).toContain("buildRegisteredTenantOnboardingUrl");
    expect(registerSource).not.toMatch(/<header\b/);
    expect(headerSource).toContain("PlatformAuthHeader");
    expect(headerSource).toContain('pathname === "/register"');
    expect(
      authHeaderSource.includes("PlatformAuth.register.header") ||
        /PlatformAuth\.\$\{[\s\S]*?register[\s\S]*?login[\s\S]*?\}\.header/.test(
          authHeaderSource,
        ),
    ).toBe(true);
    expect(authHeaderSource).toContain('"alreadyHaveWorkspace"');
    expect(authHeaderSource).toContain('"signIn"');
    expect(authHeaderSource).toContain("<LanguageSelector");
    expect(authHeaderSource).toContain("<Link");
    expect(authHeaderSource).not.toContain("DesktopNavPublic");
    expect(authHeaderSource).not.toContain("DesktopActions");
    expect(authHeaderSource).not.toContain("MobileMenu");
    expect(authHeaderSource).not.toContain("MobileRight");
    expect(registerSource).toContain("data-platform-auth-grid");
    expect(registerSource).toContain("data-platform-auth-left");
    expect(registerSource).toContain("data-platform-auth-card");
    expect(registerSource).toContain("data-platform-workspace-control");
    expect(registerSource).toContain("data-platform-auth-submit");
    expect(registerSource).toContain("data-platform-auth-full-height");
    expect(registerSource).toContain("data-platform-auth-right");
    expect(registerSource).toContain("data-platform-auth-story-card");
    expect(registerSource).toContain("xl:grid-cols-");
    expect(registerSource).toContain("xl:block");
    expect(registerSource).toContain("xl:sticky");
    expect(registerSource).toContain("xl:top-0");
    expect(registerSource).toContain("xl:hidden");
    expect(registerSource).not.toContain("lg:grid-cols-");
    expect(registerSource).not.toContain("lg:block");
    expect(registerSource).not.toContain("lg:sticky");
    expect(registerSource).not.toContain("lg:hidden");
    expect(registerSource).not.toContain("PLATFORM_AUTH_HEADER_HEIGHT");
    expect(registerSource).not.toMatch(/top:\s*PLATFORM_AUTH_/);
    expect(registerSource).toContain(
      "mx-auto my-auto min-w-0 w-full max-w-[620px]",
    );
    expect(registerSource).toContain("data-skab-public-surface");
    expect(registerSource).toContain("rounded-[var(--studio-radius)]");
    expect(registerSource).toContain("border-[var(--studio-rule)]");
    expect(registerSource).toContain("bg-[var(--studio-white)]");
    expect(registerSource).toContain("[@media(max-height:800px)]:h-11");
    expect(registerSource).toContain("[@media(max-height:800px)]:min-h-11");
    expect(registerSource).toContain("disabled:bg-[var(--studio-soft)]");
    expect(registerSource).toContain("disabled:text-[var(--studio-muted)]");
    expect(registerSource).toContain("disabled:opacity-100");
    expect(registerSource).not.toContain("disabled:opacity-40");
    expect(registerSource).toMatch(/disabled=\{isLoading\}/);
    expect(registerSource).not.toMatch(/disabled=\{!isValid/);
    expect(registerSource).toContain('"var(--studio-paper)"');
    expect(registerSource).toContain("height: PLATFORM_AUTH_VIEWPORT_HEIGHT");
    expect(registerSource).toContain(
      "minHeight: PLATFORM_AUTH_VIEWPORT_HEIGHT",
    );
    expect(registerSource).toContain("max-w-[350px]");
  });
});
