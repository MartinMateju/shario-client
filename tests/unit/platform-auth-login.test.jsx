import fs from "node:fs";
import path from "node:path";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PlatformLoginPage from "@/app/[locale]/login/page";
import {
  getPostLoginPath,
  getPostLoginUrl,
} from "@/components/auth/platformAuthRouting";
import czechMessages from "@/messages/cs.json";
import englishMessages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  auth: {
    currentTenant: null,
    currentUser: null,
    currentWorkspaceAccess: null,
    isAuthenticated: false,
    sessionReady: false,
  },
  buildInternalAdminUrl: vi.fn(),
  buildTenantUrl: vi.fn(),
  catalogs: {},
  getUserAccess: vi.fn(),
  isLoading: false,
  locale: "en",
  login: vi.fn(),
  loginUnwrap: vi.fn(),
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

vi.mock("react-redux", () => ({
  useSelector: (selector) => mocks.auth[selector],
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: "currentTenant",
  selectCurrentUser: "currentUser",
  selectCurrentWorkspaceAccess: "currentWorkspaceAccess",
  selectIsAuthenticated: "isAuthenticated",
  selectIsSessionReady: "sessionReady",
}));

vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useLoginMutation: () => [
    mocks.login,
    {
      isLoading: mocks.isLoading,
    },
  ],
}));

vi.mock("@/utils/user-profile.utils", () => ({
  getUserAccess: (...args) => mocks.getUserAccess(...args),
}));

vi.mock("@/utils/tenantRouting", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    buildInternalAdminUrl: (...args) => mocks.buildInternalAdminUrl(...args),
    buildTenantUrl: (...args) => mocks.buildTenantUrl(...args),
  };
});

const COPY = {
  en: {
    email: "Email address",
    findWorkspace: "Find your workspace",
    forgotPassword: "Forgot password?",
    hidePassword: "Hide password",
    incorrectCredentials: "The email or password is incorrect.",
    password: "Password",
    rememberWorkspace: "Remember workspace",
    showPassword: "Show password",
    story: "Your studio, beautifully run",
    submit: "Sign in",
    title: "Sign in to your workspace",
    workspace: "Workspace URL",
    workspaceCleared: "Enter the workspace slug supplied by your studio.",
    workspaceHelpDescription:
      "It’s the unique address you use to open your workspace, for example common-ground.shario.io. You can find it in your welcome or invitation email.",
    workspaceHelpOpen: "What is a workspace URL?",
    workspaceHelpTitle: "Your studio’s Shario address",
    workspaceRequired: "Enter your workspace URL first.",
  },
  cs: {
    email: "E-mail",
    findWorkspace: "Najít své studio",
    forgotPassword: "Zapomněli jste heslo?",
    hidePassword: "Skrýt heslo",
    incorrectCredentials: "E-mail nebo heslo není správné.",
    password: "Heslo",
    rememberWorkspace: "Zapamatovat studio",
    showPassword: "Zobrazit heslo",
    story: "Vaše studio, krásně řízené",
    submit: "Přihlásit se",
    title: "Přihlaste se do studia",
    workspace: "Adresa studia",
    workspaceCleared: "Zadejte identifikátor pracovního prostoru svého studia.",
    workspaceHelpDescription:
      "Je to jedinečná adresa vašeho pracovního prostoru, například common-ground.shario.io. Najdete ji v uvítacím e-mailu nebo pozvánce.",
    workspaceHelpOpen: "Co je adresa studia?",
    workspaceHelpTitle: "Adresa vašeho studia na Shario",
    workspaceRequired: "Nejprve zadejte adresu svého studia.",
  },
};

const leafKeys = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return child && typeof child === "object" ? leafKeys(child, path) : [path];
  });

const renderLogin = (locale = "en") => {
  mocks.locale = locale;

  return render(<PlatformLoginPage />);
};

const completeLoginForm = async ({ locale = "en", user }) => {
  const copy = COPY[locale];

  fireEvent.change(screen.getByLabelText(copy.workspace), {
    target: {
      value: "https://Studio-Alpha.shario.localhost:3000/en/app",
    },
  });
  await user.type(screen.getByLabelText(copy.email), " Maker @Example.COM ");
  await user.type(screen.getByLabelText(copy.password), "StudioPass1");
};

beforeEach(() => {
  mocks.catalogs = {
    cs: czechMessages,
    en: englishMessages,
  };
  mocks.locale = "en";
  mocks.isLoading = false;
  mocks.auth.currentTenant = null;
  mocks.auth.currentUser = null;
  mocks.auth.currentWorkspaceAccess = null;
  mocks.auth.isAuthenticated = false;
  mocks.auth.sessionReady = false;

  mocks.login.mockReset();
  mocks.loginUnwrap.mockReset();
  mocks.buildInternalAdminUrl.mockReset();
  mocks.buildTenantUrl.mockReset();
  mocks.getUserAccess.mockReset();

  mocks.login.mockImplementation(() => ({ unwrap: mocks.loginUnwrap }));
  mocks.loginUnwrap.mockResolvedValue({
    tenant: {
      onboarding: { completed: true },
      slug: "studio-alpha",
    },
    user: {
      isTenantUser: true,
      platformRole: "none",
    },
    workspaceAccess: undefined,
  });
  mocks.buildInternalAdminUrl.mockReturnValue("#admin");
  mocks.buildTenantUrl.mockImplementation(({ pathname }) =>
    pathname.startsWith("/password") ? "#password" : "#signed-in",
  );
  mocks.getUserAccess.mockImplementation((user, workspaceAccess) => ({
    isTenantUser:
      workspaceAccess === null
        ? false
        : (workspaceAccess?.isTenantUser ?? Boolean(user?.isTenantUser)),
  }));

  window.history.replaceState({}, "", "/");
  vi.stubGlobal("requestAnimationFrame", (callback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", (frame) => window.clearTimeout(frame));
});

describe("global workspace login presentation", () => {
  it("keeps the English and Czech platform-auth catalogs in parity", () => {
    expect(leafKeys(czechMessages.PlatformAuth).sort()).toEqual(
      leafKeys(englishMessages.PlatformAuth).sort(),
    );
  });

  it("removes rapidly dismissed workspace help and restores its trigger", async () => {
    renderLogin();
    const trigger = screen.getByRole("button", {
      name: COPY.en.workspaceHelpOpen,
    });
    act(() => trigger.focus());
    fireEvent.click(trigger);
    const panel = document.querySelector(
      "[data-platform-workspace-help-panel]",
    );
    expect(panel).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Escape may arrive before the opening animation has finished.
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expect(panel).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(
      document.querySelectorAll("[data-platform-workspace-help-panel]"),
    ).toHaveLength(1);
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(
        document.querySelector("[data-platform-workspace-help-panel]"),
      ).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });

  it.each(["en", "cs"])(
    "renders the exact accessible %s controls and localized story",
    (locale) => {
      const copy = COPY[locale];

      renderLogin(locale);

      const form = screen.getByRole("form", { name: copy.title });
      const workspace = within(form).getByLabelText(copy.workspace);
      const workspaceControl = workspace.closest(
        "[data-platform-workspace-control]",
      );
      const submit = within(form).getByRole("button", { name: copy.submit });

      expect(
        within(form).getByRole("heading", {
          level: 1,
          name: copy.title,
        }),
      ).toBeVisible();
      expect(workspace).toBeRequired();
      expect(workspace).toHaveClass(
        "appearance-none",
        "border-0",
        "shadow-none",
        "ring-0",
        "focus:border-0",
        "focus:outline-none",
        "focus:ring-0",
      );
      expect(workspaceControl).toBeInTheDocument();
      expect(within(workspaceControl).getByText(".shario.io")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(within(form).getByLabelText(copy.email)).toHaveAttribute(
        "inputmode",
        "email",
      );
      expect(within(form).getByLabelText(copy.password)).toHaveAttribute(
        "autocomplete",
        "current-password",
      );
      expect(
        within(form).getByRole("checkbox", {
          name: copy.rememberWorkspace,
        }),
      ).toBeChecked();
      expect(
        within(form).getByRole("button", { name: copy.findWorkspace }),
      ).toBeVisible();
      expect(
        within(form).getByRole("button", { name: copy.forgotPassword }),
      ).toBeVisible();
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute("data-platform-auth-submit");
      expect(
        screen.getByRole("complementary", { name: copy.story }),
      ).toBeInTheDocument();
      expect(
        document.querySelector("[data-platform-auth-story-card]"),
      ).toBeInTheDocument();
    },
  );

  it("uses two optimized WebP brush accents per responsive canvas without a duplicate page header", () => {
    renderLogin();

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();

    const mobileCanvas = document.querySelector("[data-platform-auth-brushes]");
    const desktopCanvas = document.querySelector("[data-platform-auth-visual]");
    const responsiveGroups = [mobileCanvas, desktopCanvas].map((canvas) => [
      ...canvas.querySelectorAll('[data-testid="brush-swash"]'),
    ]);

    for (const brushes of responsiveGroups) {
      expect(brushes).toHaveLength(2);
      expect(
        brushes.map((brush) => brush.getAttribute("data-brush-texture")),
      ).toEqual(["loaded", "rake"]);
      expect(
        brushes.map((brush) => brush.getAttribute("data-brush-texture-src")),
      ).toEqual([
        "/images/marketing/brush-loaded-wide.webp",
        "/images/marketing/brush-dry-rake.webp",
      ]);
    }

    expect(
      responsiveGroups
        .flat()
        .every((brush) =>
          brush.getAttribute("data-brush-texture-src")?.endsWith(".webp"),
        ),
    ).toBe(true);
  });

  it("reveals and hides the password with a named, stateful control", async () => {
    const user = userEvent.setup();
    renderLogin();

    const password = screen.getByLabelText(COPY.en.password);
    const reveal = screen.getByRole("button", {
      name: COPY.en.showPassword,
    });

    expect(password).toHaveAttribute("type", "password");
    expect(reveal).toHaveAttribute("aria-pressed", "false");

    await user.click(reveal);

    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: COPY.en.hidePassword }),
    ).toHaveAttribute("aria-pressed", "true");

    await user.click(
      screen.getByRole("button", { name: COPY.en.hidePassword }),
    );

    expect(password).toHaveAttribute("type", "password");
    expect(
      screen.getByRole("button", { name: COPY.en.showPassword }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it.each(["en", "cs"])(
    "opens and dismisses the localized %s workspace explanation",
    async (locale) => {
      const user = userEvent.setup();
      const copy = COPY[locale];

      renderLogin(locale);

      const helpTrigger = screen.getByRole("button", {
        name: copy.workspaceHelpOpen,
      });

      expect(helpTrigger).toHaveAttribute("aria-expanded", "false");
      expect(
        document.querySelector("[data-platform-workspace-help-panel]"),
      ).not.toBeInTheDocument();

      await user.click(helpTrigger);

      const helpPanel = document.querySelector(
        "[data-platform-workspace-help-panel]",
      );

      expect(helpTrigger).toHaveAttribute("aria-expanded", "true");
      expect(helpPanel).toBeVisible();
      expect(
        within(helpPanel).getByText(copy.workspaceHelpTitle),
      ).toBeVisible();
      expect(
        within(helpPanel).getByText(copy.workspaceHelpDescription),
      ).toBeVisible();

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(
          document.querySelector("[data-platform-workspace-help-panel]"),
        ).not.toBeInTheDocument(),
      );
      expect(helpTrigger).toHaveFocus();
    },
  );
});

describe("global workspace discovery and login behavior", () => {
  it("enables server-rendered inputs only when their change handlers are ready", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<PlatformLoginPage />);
    document.body.appendChild(container);
    const fields = [COPY.en.workspace, COPY.en.email, COPY.en.password];
    let root;
    try {
      for (const label of fields) {
        expect(within(container).getByLabelText(label)).toBeDisabled();
      }
      const recoverableErrors = [];
      await act(async () => {
        root = hydrateRoot(container, <PlatformLoginPage />, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });
      for (const label of fields) {
        expect(within(container).getByLabelText(label)).toBeEnabled();
      }
      expect(recoverableErrors).toEqual([]);
      fireEvent.change(within(container).getByLabelText(COPY.en.workspace), {
        target: { value: "studio-alpha" },
      });
      fireEvent.change(within(container).getByLabelText(COPY.en.email), {
        target: { value: "maker@example.com" },
      });
      fireEvent.change(within(container).getByLabelText(COPY.en.password), {
        target: { value: "StudioPass1" },
      });
      await userEvent
        .setup()
        .click(within(container).getByRole("button", { name: COPY.en.submit }));
      expect(mocks.login).toHaveBeenCalledWith({
        tenantSlug: "studio-alpha",
        email: "maker@example.com",
        password: "StudioPass1",
      });
    } finally {
      if (root) act(() => root.unmount());
      container.remove();
    }
  });

  it("restores a saved workspace, then clears it and returns focus on request", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "shario:last-workspace",
      "https://Studio-Alpha.shario.io/en/app",
    );

    renderLogin();

    const workspace = screen.getByLabelText(COPY.en.workspace);

    await waitFor(() => expect(workspace).toHaveValue("studio-alpha"));
    await user.click(
      screen.getByRole("button", { name: COPY.en.findWorkspace }),
    );

    expect(window.localStorage.getItem("shario:last-workspace")).toBeNull();
    expect(workspace).toHaveValue("");
    expect(screen.getByRole("alert")).toHaveTextContent(
      COPY.en.workspaceCleared,
    );
    await waitFor(() => expect(workspace).toHaveFocus());
  });

  it("announces a missing workspace and focuses its input for password recovery", async () => {
    const user = userEvent.setup();
    renderLogin();

    const workspace = screen.getByLabelText(COPY.en.workspace);

    await user.click(
      screen.getByRole("button", { name: COPY.en.forgotPassword }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      COPY.en.workspaceRequired,
    );
    await waitFor(() => expect(workspace).toHaveFocus());
    expect(mocks.buildTenantUrl).not.toHaveBeenCalled();
  });

  it("hands a valid workspace to its tenant password-recovery route", async () => {
    const user = userEvent.setup();
    renderLogin("cs");

    await user.type(screen.getByLabelText(COPY.cs.workspace), "Studio-Alpha");
    await user.click(
      screen.getByRole("button", { name: COPY.cs.forgotPassword }),
    );

    expect(mocks.buildTenantUrl).toHaveBeenCalledWith({
      locale: "cs",
      pathname: "/password?source=platform",
      slug: "studio-alpha",
    });
    expect(window.localStorage.getItem("shario:last-workspace")).toBe(
      "studio-alpha",
    );
    expect(window.location.hash).toBe("#password");
  });

  it("does not retain the recovery workspace when remembering is turned off", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("shario:last-workspace", "legacy-studio");
    renderLogin();

    const workspace = screen.getByLabelText(COPY.en.workspace);
    await waitFor(() => expect(workspace).toHaveValue("legacy-studio"));
    await user.clear(workspace);
    await user.type(workspace, "Studio-Alpha");
    await user.click(
      screen.getByRole("checkbox", { name: COPY.en.rememberWorkspace }),
    );
    await user.click(
      screen.getByRole("button", { name: COPY.en.forgotPassword }),
    );

    expect(window.localStorage.getItem("shario:last-workspace")).toBeNull();
    expect(window.location.hash).toBe("#password");
  });

  it("normalizes pasted workspace and email values before signing in", async () => {
    const user = userEvent.setup();
    renderLogin();
    await completeLoginForm({ user });

    const submit = screen.getByRole("button", { name: COPY.en.submit });

    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        email: "maker@example.com",
        password: "StudioPass1",
        tenantSlug: "studio-alpha",
      });
    });
    expect(window.localStorage.getItem("shario:last-workspace")).toBe(
      "studio-alpha",
    );
    expect(window.location.hash).toBe("#signed-in");
  });

  it("removes workspace persistence when remembering is turned off", async () => {
    const user = userEvent.setup();
    renderLogin();
    window.localStorage.setItem("shario:last-workspace", "legacy-studio");
    await completeLoginForm({ user });

    await user.click(
      screen.getByRole("checkbox", { name: COPY.en.rememberWorkspace }),
    );
    await user.click(screen.getByRole("button", { name: COPY.en.submit }));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledOnce());
    expect(window.localStorage.getItem("shario:last-workspace")).toBeNull();
  });

  it("shows and focuses a localized Czech authentication error", async () => {
    const user = userEvent.setup();
    mocks.loginUnwrap.mockRejectedValueOnce({ status: 401 });
    renderLogin("cs");
    await completeLoginForm({ locale: "cs", user });

    await user.click(screen.getByRole("button", { name: COPY.cs.submit }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent(COPY.cs.incorrectCredentials);
    expect(alert).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(alert).toHaveFocus());
  });
});

describe("post-login route decisions", () => {
  it("redirects a ready authenticated session through the same route policy", async () => {
    mocks.auth.currentTenant = {
      onboarding: { completed: true },
      slug: "studio-alpha",
    };
    mocks.auth.currentUser = {
      isTenantUser: true,
      platformRole: "none",
    };
    mocks.auth.currentWorkspaceAccess = undefined;
    mocks.auth.isAuthenticated = true;
    mocks.auth.sessionReady = true;

    renderLogin();

    await waitFor(() => expect(window.location.hash).toBe("#signed-in"));
    expect(mocks.buildTenantUrl).toHaveBeenCalledWith({
      locale: "en",
      pathname: "/app",
      slug: "studio-alpha",
    });
  });

  it("sends customers to their portal", () => {
    expect(getPostLoginPath({}, {}, null)).toBe("/portal");
  });

  it("uses the signed customer audience even for underlying owner credentials", () => {
    expect(
      getPostLoginPath(
        { authContext: "customer", isTenantUser: true },
        { onboarding: { completed: false } },
        null,
        "customer",
      ),
    ).toBe("/portal");
  });

  it("does not treat unresolved workspace access as a customer session", () => {
    expect(
      getPostLoginPath(
        { authContext: "workspace", isTenantUser: true },
        { onboarding: { completed: true } },
        undefined,
        "workspace",
      ),
    ).toBe("/app");
  });

  it("sends a tenant owner with incomplete setup to onboarding", () => {
    expect(
      getPostLoginPath(
        { isTenantUser: true },
        { onboarding: { completed: false } },
        undefined,
      ),
    ).toBe("/app/onboarding");
  });

  it.each(["/app", "/app/calendar", "/app/settings?tab=team"])(
    "preserves the safe tenant landing page %s",
    (defaultLandingPage) => {
      expect(
        getPostLoginPath(
          { isTenantUser: true },
          { onboarding: { completed: true } },
          {
            isTenantUser: true,
            preferences: { defaultLandingPage },
          },
        ),
      ).toBe(defaultLandingPage);
    },
  );

  it.each([undefined, "", "/portal", "/application", "https://evil.test"])(
    "falls back to the app for an unsafe landing page %s",
    (defaultLandingPage) => {
      expect(
        getPostLoginPath(
          { isTenantUser: true },
          { onboarding: { completed: true } },
          {
            isTenantUser: true,
            preferences: { defaultLandingPage },
          },
        ),
      ).toBe("/app");
    },
  );

  it("routes platform roles to the internal admin origin", () => {
    const result = getPostLoginUrl({
      locale: "cs",
      tenant: null,
      user: { platformRole: "support" },
      workspaceAccess: null,
    });

    expect(result).toBe("#admin");
    expect(mocks.buildInternalAdminUrl).toHaveBeenCalledWith({
      locale: "cs",
      pathname: "/",
    });
    expect(mocks.buildTenantUrl).not.toHaveBeenCalled();
  });

  it("uses the configured workspace language after login instead of the marketing locale", () => {
    getPostLoginUrl({
      authContext: "workspace",
      locale: "en",
      routeableLocaleCodes: ["en", "sk"],
      tenant: {
        slug: "studio-alpha",
        settings: {
          defaultLanguage: "en",
          adminLanguage: "sk",
        },
      },
      user: { isTenantUser: true, platformRole: "none" },
      workspaceAccess: undefined,
    });

    expect(mocks.buildTenantUrl).toHaveBeenCalledWith({
      locale: "sk",
      pathname: "/app",
      slug: "studio-alpha",
    });
  });

  it("uses customer defaults or studio primary rather than the platform login language", () => {
    const tenant = {
      slug: "studio-alpha",
      settings: {
        publicDefaultLanguage: "de",
        supportedPublicLanguages: ["de", "en"],
      },
    };
    const input = {
      authContext: "customer",
      routeableLocaleCodes: ["en", "de", "sk"],
      tenant,
      user: { platformRole: "none" },
      workspaceAccess: null,
    };

    getPostLoginUrl({ ...input, locale: "sk" });

    expect(mocks.buildTenantUrl).toHaveBeenLastCalledWith({
      locale: "de",
      pathname: "/portal",
      slug: "studio-alpha",
    });

    getPostLoginUrl({ ...input, locale: "en" });

    expect(mocks.buildTenantUrl).toHaveBeenLastCalledWith({
      locale: "de",
      pathname: "/portal",
      slug: "studio-alpha",
    });

    getPostLoginUrl({
      ...input,
      locale: "sk",
      user: { ...input.user, customerDefaultLanguage: "en" },
    });
    expect(mocks.buildTenantUrl).toHaveBeenLastCalledWith({
      locale: "en",
      pathname: "/portal",
      slug: "studio-alpha",
    });
    getPostLoginUrl({
      ...input,
      locale: "en",
      user: { ...input.user, customerDefaultLanguage: "sk" },
    });
    expect(mocks.buildTenantUrl).toHaveBeenLastCalledWith({
      locale: "de",
      pathname: "/portal",
      slug: "studio-alpha",
    });
  });

  it("routes a non-platform customer through the selected tenant", () => {
    const result = getPostLoginUrl({
      authContext: "customer",
      locale: "en",
      tenant: { slug: "studio-alpha" },
      user: { platformRole: "none" },
      workspaceAccess: null,
    });

    expect(result).toBe("#signed-in");
    expect(mocks.buildTenantUrl).toHaveBeenCalledWith({
      locale: "en",
      pathname: "/portal",
      slug: "studio-alpha",
    });
  });
});

describe("global auth header integration contract", () => {
  it("hands auth routes to one auth-only transparent header outside the page", () => {
    const repositoryRoot = process.cwd();
    const headerSource = fs.readFileSync(
      path.join(repositoryRoot, "src/components/headers/Header.js"),
      "utf8",
    );
    const authHeaderSource = fs.readFileSync(
      path.join(repositoryRoot, "src/components/auth/PlatformAuthHeader.js"),
      "utf8",
    );
    const languageSelectorSource = fs.readFileSync(
      path.join(repositoryRoot, "src/components/headers/LanguageSelector.js"),
      "utf8",
    );
    const loginSource = fs.readFileSync(
      path.join(repositoryRoot, "src/app/[locale]/login/page.js"),
      "utf8",
    );
    const registerSource = fs.readFileSync(
      path.join(repositoryRoot, "src/app/[locale]/register/page.js"),
      "utf8",
    );
    const authLayoutSource = fs.readFileSync(
      path.join(repositoryRoot, "src/components/auth/platformAuthLayout.js"),
      "utf8",
    );
    const authLayoutStylesSource = fs.readFileSync(
      path.join(
        repositoryRoot,
        "src/components/auth/platformAuthLayout.module.css",
      ),
      "utf8",
    );
    const globalStylesSource = fs.readFileSync(
      path.join(repositoryRoot, "src/styles/globals.css"),
      "utf8",
    );
    const authHeaderOpeningTag =
      authHeaderSource.match(/<header[\s\S]*?>/)?.[0] ?? "";

    expect(headerSource).toMatch(
      /pathname === "\/login"[\s\S]*pathname === "\/register"/,
    );
    expect(headerSource).toMatch(/return \(\s*<PlatformAuthHeader[\s\S]*mode=/);
    expect(authHeaderSource.match(/<header\b/g)).toHaveLength(1);
    expect(authHeaderSource).toContain(
      'import Brand from "@/components/headers/Brand";',
    );
    expect(authHeaderSource).toContain(
      'import LanguageSelector from "@/components/headers/LanguageSelector";',
    );
    expect(authHeaderSource).toContain(
      'import { Link } from "@/i18n/navigation";',
    );
    expect(authHeaderSource).toContain(
      'import { routing } from "@/i18n/routing";',
    );
    expect(authHeaderSource).not.toContain(
      'import SkabLogo from "@/components/brand/SkabLogo";',
    );
    expect(authHeaderSource).toContain("<Brand");
    expect(authHeaderSource).toContain("<LanguageSelector");
    expect(authHeaderSource).toContain("localeCodes={routing.locales}");
    expect(
      (authHeaderSource.includes("PlatformAuth.login.header") &&
        authHeaderSource.includes("PlatformAuth.register.header")) ||
        /PlatformAuth\.\$\{[\s\S]*?register[\s\S]*?login[\s\S]*?\}\.header/.test(
          authHeaderSource,
        ),
    ).toBe(true);
    expect(authHeaderSource).toContain('"newToSkab"');
    expect(authHeaderSource).toContain('"createWorkspace"');
    expect(authHeaderSource).toContain('"alreadyHaveWorkspace"');
    expect(authHeaderSource).toContain('"signIn"');
    expect(authHeaderSource).toContain('"/login"');
    expect(authHeaderSource).toContain('"/register"');
    for (const publicHeaderComponent of [
      "DesktopNavPublic",
      "DesktopActions",
      "MobileMenu",
      "MobileRight",
    ]) {
      expect(authHeaderSource).not.toContain(publicHeaderComponent);
    }
    expect(authHeaderSource).not.toContain('useTranslations("Header")');
    expect(authHeaderSource).not.toContain('useTranslations("Header.mobile")');
    expect(authHeaderSource).not.toContain("publicEyebrow");
    expect(authHeaderSource).not.toContain("getStarted");
    expect(languageSelectorSource).toContain(
      "const hash = window.location.hash",
    );
    expect(languageSelectorSource).toContain(
      "router.replace(`${currentHref}${hash}`",
    );
    expect(authHeaderSource).not.toContain("nextLocale");
    expect(authHeaderSource).not.toContain('locale === "cs"');
    expect(authHeaderSource).not.toContain("GlobeAltIcon");
    expect(authHeaderOpeningTag).toContain("absolute inset-x-0 top-0");
    expect(authHeaderOpeningTag).toContain("bg-transparent");
    expect(authHeaderOpeningTag).not.toContain("fixed inset-x-0 top-0");
    expect(authHeaderOpeningTag).not.toContain("border-b");
    expect(authHeaderOpeningTag).not.toContain("shadow-");
    expect(authHeaderOpeningTag).not.toContain("backdrop-blur");
    expect(authHeaderSource).toContain(
      'import { PLATFORM_AUTH_HEADER_HEIGHT } from "@/components/auth/platformAuthLayout";',
    );
    expect(authHeaderSource).toContain("height: PLATFORM_AUTH_HEADER_HEIGHT");
    expect(authHeaderSource).toContain(
      "minHeight: PLATFORM_AUTH_HEADER_HEIGHT",
    );
    expect(globalStylesSource).toContain("--platform-header-height: 4.5rem;");
    expect(globalStylesSource).toMatch(
      /header\[data-platform-auth-header\]\s*~\s*#page-content\s*\{[\s\S]*?padding-top:\s*0;[\s\S]*?\}/,
    );
    expect(authLayoutStylesSource).not.toContain(
      "padding-top: var(--platform-auth-header-height",
    );
    expect(authLayoutSource).toMatch(
      /PLATFORM_AUTH_VIEWPORT_HEIGHT\s*=\s*["']100dvh["']/,
    );
    expect(authLayoutSource).toContain("PLATFORM_AUTH_HEADER_HEIGHT");
    expect(authLayoutStylesSource).toMatch(
      /\.viewport\s*\{[\s\S]*?min-height:\s*100dvh;/,
    );
    expect(authLayoutStylesSource).toMatch(
      /\.fullHeightPanel\s*\{[\s\S]*?min-height:\s*100dvh;/,
    );
    expect(loginSource).toContain("PLATFORM_AUTH_VIEWPORT_HEIGHT");
    expect(loginSource).toContain("data-platform-auth-grid");
    expect(loginSource).toContain("data-platform-auth-full-height");
    expect(loginSource).toContain("xl:grid-cols-");
    expect(loginSource).toContain("xl:block");
    expect(loginSource).not.toContain("lg:grid-cols-");
    expect(loginSource).not.toContain("lg:block");
    expect(loginSource).not.toContain("PLATFORM_AUTH_HEADER_HEIGHT");
    expect(registerSource).toContain("PLATFORM_AUTH_VIEWPORT_HEIGHT");
    expect(registerSource).toContain("data-platform-auth-grid");
    expect(registerSource).toContain("data-platform-register-visual");
    expect(registerSource).toContain("xl:grid-cols-");
    expect(registerSource).toContain("xl:block");
    expect(registerSource).not.toContain("lg:grid-cols-");
    expect(registerSource).not.toContain("lg:block");
    expect(registerSource).not.toContain("lg:sticky");
    expect(registerSource).not.toContain("PLATFORM_AUTH_HEADER_HEIGHT");
    expect(registerSource).not.toMatch(/top:\s*PLATFORM_AUTH_/);
    expect(loginSource).not.toMatch(/<header\b/);
    expect(registerSource).not.toMatch(/<header\b/);
    expect(loginSource).not.toMatch(/export const getPostLogin/);
    expect(loginSource).toContain("grid-cols-[minmax(0,1fr)]");
    expect(loginSource).toContain("data-platform-auth-left");
    expect(loginSource).toContain("data-platform-auth-right");
    expect(loginSource).toContain("flex min-w-0 flex-col");
    expect(loginSource).toContain(
      "mx-auto my-auto min-w-0 w-full max-w-[620px]",
    );
  });

  it("keeps one workspace focus boundary and a solid readable disabled action", () => {
    const loginSource = fs.readFileSync(
      path.join(process.cwd(), "src/app/[locale]/login/page.js"),
      "utf8",
    );

    expect(loginSource).toContain("data-platform-workspace-control");
    expect(loginSource).toMatch(/aria-hidden(?:=\{true\}|="true")/);
    expect(loginSource).toContain("data-platform-auth-submit");
    expect(loginSource).toContain("data-skab-public-surface");
    expect(loginSource).toContain("disabled:border-[var(--studio-rule)]");
    expect(loginSource).toContain("disabled:bg-[var(--studio-soft)]");
    expect(loginSource).toContain("disabled:text-[var(--studio-muted)]");
    expect(loginSource).toContain("disabled:opacity-100");
    expect(loginSource).toContain("disabled:shadow-none");
    expect(loginSource).not.toContain("disabled:opacity-40");
  });
});
