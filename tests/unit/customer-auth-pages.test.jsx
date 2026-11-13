import React from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Login from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/page";
import Registration from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/register/page";
import CustomerPasswordRecoveryShell from "@/components/auth/CustomerPasswordRecoveryShell";
import { resolvePublicTenantLabelColor } from "@/components/public-tenant/publicTenant.config";
import translation from "@/translations/translation";
import portugueseMessages from "@/messages/pt-PT.json";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  currentCustomerLocale: null,
  getCustomerCurrentLocale: vi.fn(),
  getUserAccess: vi.fn(),
  language: "EN",
  locale: "en",
  login: vi.fn(),
  loginUnwrap: vi.fn(),
  publicLocations: [],
  register: vi.fn(),
  registerUnwrap: vi.fn(),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  searchNext: "",
  tenant: {
    name: "Atelier Nami",
    slug: "studio-olivie",
    publicCapabilities: {
      registration: true,
    },
    publicSite: {
      branding: {
        accentColor: "#4056D6",
        backgroundColor: "#FCFBF8",
        displayName: "Atelier Nami",
        logoUrl: "https://images.example.com/atelier-nami-logo.webp",
        secondaryColor: "#D9806E",
        textColor: "#1F1F1F",
      },
      footer: {
        legal: {
          privacy: "https://legal.example.com/privacy",
          studioRules: "/studio-rules",
          terms: "https://legal.example.com/terms",
        },
      },
      login: {
        backgroundImageUrl:
          "https://images.example.com/atelier-nami-studio.webp",
        headline: {
          cs: "Vítejte v Atelieru Nami.",
          en: "Welcome to Atelier Nami.",
        },
        helpText: {
          cs: "Pokud potřebujete pomoc, obraťte se na studio.",
          en: "Contact the studio if you need a hand.",
        },
        supportingText: {
          cs: "Vaše rezervace, výrobky a kredity na jednom místě.",
          en: "Your bookings, pottery pieces and credits in one calm place.",
        },
      },
    },
  },
}));

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => mocks.locale,
      useTranslations: () => (key) => key,
    }))(...args),
  );
});

vi.mock("@/i18n/customerLocalePreference", () => ({
  getCustomerCurrentLocale: (...args) =>
    mocks.getCustomerCurrentLocale(...args),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "Studio-Olivie" }),
  useSearchParams: () => ({
    get: (key) => (key === "next" ? mocks.searchNext : null),
  }),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => mocks.language,
}));

vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");

  return {
    Link: ({ children, href, ...props }) =>
      createElement("a", { ...props, href }, children),
    useRouter: () => mocks.router,
  };
});

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant, degraded: false }),
  usePublicTenant: () => ({ tenant: mocks.tenant, degraded: false }),
}));

vi.mock("@/components/public-tenant/PublicCapabilityGate", async () => {
  const { createElement, Fragment } = await import("react");

  return {
    default: ({ children }) => createElement(Fragment, null, children),
  };
});

vi.mock("@/components/auth/CustomerSocialAuthButtons", async () => {
  const { createElement } = await import("react");

  return {
    default: ({ locale, nextPath, tenantSlug, variant }) =>
      createElement("div", {
        "data-testid": "customer-social-auth",
        "data-locale": locale,
        "data-next-path": nextPath,
        "data-tenant-slug": tenantSlug,
        "data-variant": variant,
      }),
  };
});

vi.mock("@/components/modals/ConformationModal", async () => {
  const { createElement } = await import("react");

  return {
    default: ({ href, text, title }) =>
      createElement("div", { "data-confirmation-href": href }, title, text),
  };
});

vi.mock("@/lib/features/auth/authApiSlice", () => ({
  useCustomerLoginMutation: () => [mocks.login, { isLoading: false }],
}));

vi.mock("@/lib/features/users/usersApiSlice", () => ({
  useRegisterNewUserMutation: () => [mocks.register, { isLoading: false }],
}));

vi.mock("@/lib/features/config/configSlice", () => ({
  setLoaderRunning: (payload) => ({
    payload,
    type: "config/setLoaderRunning",
  }),
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: vi.fn(),
}));

vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicBookingLocationsQuery: () => ({
    data: mocks.publicLocations,
  }),
}));

vi.mock("@/utils/tenantRouting", () => ({
  buildInternalAdminUrl: () => "https://admin.shario.io/en",
}));

vi.mock("@/utils/user-profile.utils", () => ({
  getUserAccess: (...args) => mocks.getUserAccess(...args),
}));

const renderLogin = (next = "") => {
  mocks.searchNext = next;
  return render(<Login />);
};

const renderRegistration = (next = "") => {
  mocks.searchNext = next;
  return render(<Registration />);
};

const expectedAuthHref = (pathname, next) =>
  `${pathname}?next=${encodeURIComponent(next)}`;

beforeEach(() => {
  delete mocks.tenant.publicSite.branding.logoRedirectEnabled;
  delete mocks.tenant.publicSite.branding.logoRedirectUrl;
  delete mocks.tenant.settings;
  delete mocks.tenant.publicSite.login.eyebrow;
  delete mocks.tenant.publicSite.login.labelColor;
  delete mocks.tenant.publicSite.register;
  mocks.dispatch.mockReset();
  mocks.currentCustomerLocale = null;
  mocks.getCustomerCurrentLocale.mockReset();
  mocks.getCustomerCurrentLocale.mockImplementation(
    () => mocks.currentCustomerLocale,
  );
  mocks.getUserAccess.mockReset();
  mocks.login.mockReset();
  mocks.loginUnwrap.mockReset();
  mocks.register.mockReset();
  mocks.registerUnwrap.mockReset();
  mocks.router.push.mockReset();
  mocks.router.replace.mockReset();
  mocks.language = "EN";
  mocks.locale = "en";
  mocks.publicLocations = [];
  mocks.searchNext = "";

  mocks.getUserAccess.mockReturnValue({ isTenantUser: false });
  mocks.login.mockImplementation(() => ({ unwrap: mocks.loginUnwrap }));
  mocks.loginUnwrap.mockResolvedValue({
    tenant: { onboarding: { completed: true } },
    user: { platformRole: "none" },
    workspaceAccess: null,
  });
  mocks.register.mockImplementation(() => ({
    unwrap: mocks.registerUnwrap,
  }));
  mocks.registerUnwrap.mockResolvedValue({ verificationRequired: true });

  vi.stubGlobal("requestAnimationFrame", (callback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
});

describe("customer authentication logo destination", () => {
  it.each([
    ["login", Login],
    ["registration", Registration],
    ["password recovery", CustomerPasswordRecoveryShell],
  ])("uses the tenant opt-in on the real %s surface", (_name, Component) => {
    mocks.tenant.publicSite.branding.logoRedirectUrl =
      "https://www.atelierklei.cz/";
    const { rerender, container } = render(<Component />);

    expect(screen.queryByRole("link", { name: "Atelier Nami" })).toBeNull();
    expect(
      container.querySelector("[data-auth-form-brand]"),
    ).not.toHaveAttribute("href");

    mocks.tenant.publicSite.branding.logoRedirectEnabled = true;
    rerender(<Component />);
    expect(screen.getByRole("link", { name: "Atelier Nami" })).toHaveAttribute(
      "href",
      "https://www.atelierklei.cz/",
    );

    mocks.tenant.publicSite.branding.logoRedirectEnabled = false;
    rerender(<Component />);
    expect(screen.queryByRole("link", { name: "Atelier Nami" })).toBeNull();
    expect(
      container.querySelector("[data-auth-form-brand]"),
    ).not.toHaveAttribute("tabindex");
  });
});

describe("end-customer login page", () => {
  it("uses the customized login eyebrow and page label colour", () => {
    const originalLogin = mocks.tenant.publicSite.login;
    mocks.tenant.publicSite.login = {
      ...originalLogin,
      eyebrow: { en: "A place to make", cs: "Místo pro tvorbu" },
      labelColor: "#77402F",
    };

    const { unmount } = renderLogin();

    expect(screen.getByText("A place to make")).toHaveStyle({
      color: resolvePublicTenantLabelColor("#77402F", "#292720", "#FFFFFF"),
    });
    expect(screen.getByText("Customer access")).toHaveStyle({
      color:
        "var(--tenant-page-label-color, var(--tenant-label-color, var(--tenant-accent-link)))",
    });

    unmount();
    mocks.tenant.publicSite.login = originalLogin;
  });

  it("renders the tenant story and the exact customer login controls", () => {
    const next = "/book?offer=wheel#availability";

    renderLogin(next);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Welcome to Atelier Nami.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your bookings, pottery pieces and credits in one calm place.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Contact the studio if you need a hand."),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Sign in" }),
    ).toBeInTheDocument();
    expect(document.querySelector('label[for="email"]')).toHaveTextContent(
      "Email",
    );
    expect(document.querySelector('label[for="password"]')).toHaveTextContent(
      "Password",
    );
    expect(screen.getByRole("button", { name: "Show password" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", expectedAuthHref("/password", next));
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveClass(
      "text-[var(--tenant-auth-form-link)]",
    );
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", expectedAuthHref("/register", next));
    expect(screen.getByRole("link", { name: "Create account" })).toHaveClass(
      "text-[var(--tenant-auth-form-link)]",
    );
    expect(
      screen.getByText(
        "Your booking selection is saved. Sign in to continue where you left off.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("customer-social-auth")).toHaveAttribute(
      "data-next-path",
      next,
    );
    expect(screen.getByTestId("customer-social-auth")).toHaveAttribute(
      "data-tenant-slug",
      "studio-olivie",
    );
    expect(screen.getByTestId("customer-social-auth")).toHaveAttribute(
      "data-variant",
      "compact",
    );
  });

  it("uses the URL locale even while Redux still holds another language", () => {
    mocks.locale = "en";
    mocks.language = "CZ";

    renderLogin();

    expect(screen.getByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Přihlášení" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show password" })).toBeVisible();
  });

  it("reveals and hides the password without submitting the form", async () => {
    const user = userEvent.setup();
    renderLogin();

    const password = document.getElementById("password");
    const reveal = screen.getByRole("button", { name: "Show password" });

    expect(password).toHaveAttribute("type", "password");
    expect(reveal).toHaveAttribute("aria-pressed", "false");

    await user.click(reveal);

    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(mocks.login).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Hide password" }));

    expect(password).toHaveAttribute("type", "password");
  });

  it("normalizes the email and preserves a safe booking destination", async () => {
    const user = userEvent.setup();
    const next = "/book?offer=wheel#availability";
    renderLogin(next);

    await user.type(document.getElementById("email"), "  Maker @Example.COM ");
    await user.type(document.getElementById("password"), "ClayPass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        email: "maker@example.com",
        password: "ClayPass1",
        tenantSlug: "studio-olivie",
      });
    });
    expect(mocks.router.replace).toHaveBeenCalledWith(next, { locale: "en" });
    expect(mocks.router.push).not.toHaveBeenCalled();
  });

  it("names the requested studio and preserves it through password and social sign-in", async () => {
    const user = userEvent.setup();
    const next = "/portal?location=studio-olivka&tab=studio-calendar";
    mocks.publicLocations = [
      {
        id: "64b000000000000000000002",
        name: "Studio Olivka",
        slug: "studio-olivka",
      },
    ];
    renderLogin(next);

    expect(
      screen.getByText("Sign in to continue to Studio Olivka."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Sign in with your customer account to open Studio Olivka.",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("customer-social-auth")).toHaveAttribute(
      "data-next-path",
      next,
    );

    await user.type(document.getElementById("email"), "maker@example.com");
    await user.type(document.getElementById("password"), "ClayPass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith(next, { locale: "en" }),
    );
  });

  it.each([
    ["the saved default on a new browser", null, "cs", "cs"],
    ["a current-session choice before the default", "en", "cs", "en"],
    ["the default after an unsupported session choice", "de", "cs", "cs"],
    ["the studio primary after an unsupported default", null, "de", "cs"],
    ["the explicit URL when no preference is saved", null, null, "en"],
    ["a Czech session choice before an English default", "cs", "en", "cs"],
  ])(
    "uses %s after password sign-in without changing the payment return path",
    async (_, currentChoice, savedDefault, expectedLocale) => {
      mocks.currentCustomerLocale = currentChoice;
      mocks.tenant.settings = {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      };
      mocks.loginUnwrap.mockResolvedValue({
        tenant: { slug: "studio-olivie", settings: mocks.tenant.settings },
        user: { platformRole: "none", customerDefaultLanguage: savedDefault },
        workspaceAccess: null,
      });
      const next =
        "/portal/credits/purchase-success?session_id=checkout-1&location=grohova#receipt";
      renderLogin(next);

      fireEvent.change(document.getElementById("email"), {
        target: { value: "maker@example.com" },
      });
      fireEvent.change(document.getElementById("password"), {
        target: { value: "ClayPass1" },
      });
      fireEvent.submit(screen.getByRole("form", { name: "Sign in" }));

      await waitFor(() => {
        expect(mocks.router.replace).toHaveBeenCalledWith(next, {
          locale: expectedLocale,
        });
      });
      expect(mocks.getCustomerCurrentLocale).toHaveBeenCalledWith(
        "studio-olivie",
      );
    },
  );

  it("uses the newly authenticated studio language settings before stale public settings", async () => {
    mocks.tenant.settings = {
      publicDefaultLanguage: "en",
      supportedPublicLanguages: ["en"],
    };
    mocks.loginUnwrap.mockResolvedValue({
      tenant: {
        slug: "studio-olivie",
        settings: {
          publicDefaultLanguage: "cs",
          supportedPublicLanguages: ["cs"],
        },
      },
      user: { platformRole: "none", customerDefaultLanguage: "en" },
      workspaceAccess: null,
    });
    renderLogin("//attacker.example/portal");
    fireEvent.change(document.getElementById("email"), {
      target: { value: "maker@example.com" },
    });
    fireEvent.change(document.getElementById("password"), {
      target: { value: "ClayPass1" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Sign in" }));

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/portal", {
        locale: "cs",
      });
    });
  });

  it("announces and focuses an authentication error after a 401", async () => {
    const user = userEvent.setup();
    mocks.loginUnwrap.mockRejectedValueOnce({ status: 401 });
    renderLogin();

    await user.type(document.getElementById("email"), "maker@example.com");
    await user.type(document.getElementById("password"), "WrongPass1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(translation.ERROR_UNAUTHORIZED.EN);
    expect(alert).toHaveAttribute("tabindex", "-1");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});

describe("end-customer registration page", () => {
  it("uses the URL locale even while Redux still holds another language", () => {
    mocks.locale = "en";
    mocks.language = "CZ";

    renderRegistration();

    expect(
      screen.getByRole("form", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Vytvořit účet" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeVisible();
  });

  it("uses registration-specific story content and image", () => {
    mocks.tenant.publicSite.register = {
      eyebrow: { en: "Join the studio", cs: "Přidejte se" },
      headline: { en: "Make your own space.", cs: "Vytvořte si prostor." },
      supportingText: {
        en: "Your creative account starts here.",
        cs: "Váš tvůrčí účet začíná zde.",
      },
      helpText: {
        en: "The studio team can help.",
        cs: "Tým studia vám pomůže.",
      },
      labelColor: "#315D42",
      backgroundImageUrl: "https://images.example.com/register.webp",
    };

    const { container, unmount } = renderRegistration();

    expect(
      screen.getByRole("heading", { level: 1, name: "Make your own space." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Join the studio")).toHaveStyle({
      color: resolvePublicTenantLabelColor("#315D42", "#292720", "#FFFFFF"),
    });
    expect(
      screen.getByText("Your creative account starts here."),
    ).toBeInTheDocument();
    expect(screen.getByText("The studio team can help.")).toBeInTheDocument();
    expect(container.querySelector("[data-auth-hero-image]")).toHaveAttribute(
      "src",
      "https://images.example.com/register.webp",
    );

    unmount();
    delete mocks.tenant.publicSite.register;
  });

  it("shows and focuses an error for an invalid submit", async () => {
    const user = userEvent.setup();
    renderRegistration();

    const form = screen.getByRole("form", { name: "Create account" });
    const social = screen.getByTestId("customer-social-auth");

    expect(form).toContainElement(social);
    expect(social).toHaveAttribute("data-variant", "compact");

    await user.click(screen.getByRole("button", { name: "Register" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please enter a valid name.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("keeps fields, password controls, and legal agreements accessible", async () => {
    const user = userEvent.setup();
    renderRegistration();

    const firstName = document.getElementById("firstname");
    const lastName = document.getElementById("lastname");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const password = document.getElementById("password");
    const passwordConfirm = document.getElementById("password_confirm");

    expect(firstName).toHaveAccessibleName(/First Name/);
    expect(firstName).toBeRequired();
    expect(firstName).toHaveAttribute("autocomplete", "given-name");
    expect(firstName).toHaveClass("min-h-[52px]");
    expect(lastName).toHaveAccessibleName(/Last Name/);
    expect(lastName).toBeRequired();
    expect(email).toHaveAccessibleName(/Email/);
    expect(email).toHaveAttribute("inputmode", "email");
    expect(phone).toHaveAccessibleName(/Phone/);
    expect(phone).toHaveAttribute("autocomplete", "tel");
    expect(password).toHaveAccessibleName(/^Password/);
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveClass("min-h-[52px]");
    expect(password).toHaveAccessibleDescription(
      "At least 8 characters and 1 number.",
    );
    expect(passwordConfirm).toHaveAccessibleName(/Confirm password/);
    expect(passwordConfirm).toHaveAttribute("type", "password");

    await user.type(email, "not-an-email");
    await user.tab();

    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription(
      "Please enter a valid email address.",
    );

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");

    const rules = screen.getByRole("checkbox", {
      name: /I accept the studio rules/i,
    });
    const terms = screen.getByRole("checkbox", {
      name: /I accept the Terms and Conditions/i,
    });

    expect(rules).not.toBeChecked();
    expect(rules).toHaveAttribute("aria-describedby", "rules-agreement");
    expect(terms).not.toBeChecked();
    expect(terms).toHaveAttribute("aria-describedby", "terms-agreement");
    expect(screen.getByRole("link", { name: "studio rules" })).toHaveAttribute(
      "href",
      "/studio-rules",
    );
    expect(
      screen.getByRole("link", { name: "Terms and Conditions" }),
    ).toHaveAttribute("href", "https://legal.example.com/terms");
    expect(
      screen.getByRole("link", { name: "privacy policy" }),
    ).toHaveAttribute("href", "https://legal.example.com/privacy");
    expect(screen.getByRole("link", { name: "privacy policy" })).toHaveClass(
      "text-[var(--tenant-auth-form-link)]",
    );

    await user.click(rules);
    await user.click(terms);

    expect(rules).toBeChecked();
    expect(terms).toBeChecked();
  });

  it("submits normalized details and redirects to verification with the safe next path", async () => {
    const user = userEvent.setup();
    const next = "/courses/wheel?date=2026-08-18";
    mocks.locale = "pt_PT";
    renderRegistration(next);

    expect(
      screen.getByRole("link", { name: "Iniciar sessão" }),
    ).toHaveAttribute("href", expectedAuthHref("/login", next));

    await user.type(document.getElementById("firstname"), "  Ada  ");
    await user.type(document.getElementById("lastname"), "  Lovelace  ");
    await user.type(document.getElementById("email"), " Maker @Example.COM ");
    await user.type(document.getElementById("phone"), " +420 777 123 456 ");
    await user.type(document.getElementById("password"), "Studio123");
    await user.type(document.getElementById("password_confirm"), "Studio123");
    await user.click(
      screen.getByRole("checkbox", {
        name: `${portugueseMessages.Legacy.copy.TermsText_I_accept_the_0dc66}${portugueseMessages.Legacy.copy.TermsText_studio_rules_d3727}.`,
      }),
    );
    await user.click(
      screen.getByRole("checkbox", {
        name: `${portugueseMessages.Legacy.copy.TermsText_I_accept_the_0dc66}${portugueseMessages.Legacy.copy.TermsText_Terms_and_Conditions_89403}.`,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: portugueseMessages.Legacy.BUTTON_REGISTER,
      }),
    );

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith({
        email: "maker@example.com",
        firstname: "Ada",
        lastname: "Lovelace",
        locale: "pt-PT",
        next,
        password: "Studio123",
        phone: "+420 777 123 456",
        tenantSlug: "studio-olivie",
      });
    });
    expect(mocks.router.push).toHaveBeenCalledWith(
      `/verify-email?email=${encodeURIComponent(
        "maker@example.com",
      )}&next=${encodeURIComponent(next)}`,
    );
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
