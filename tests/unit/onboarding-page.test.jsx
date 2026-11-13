import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  authenticated: true,
  complete: vi.fn(),
  completeUnwrap: vi.fn(),
  dispatch: vi.fn(),
  isCompleting: false,
  isSaving: false,
  navigateToLaunchCenter: vi.fn(),
  query: null,
  refetch: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  saveStep: vi.fn(),
  saveUnwrap: vi.fn(),
}));

const onboardingData = () => ({
  tenant: {
    id: "64a000000000000000000001",
    name: "Clay Lab",
    settings: { currency: "CZK", timezone: "Europe/Prague" },
  },
  onboarding: {
    businessDetails: { country: "Czech Republic" },
    businessType: "coworking_space",
    completed: false,
  },
});

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: () => mocks.authenticated,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, locale, ...props }) => (
    <a href={locale ? `/${locale}${href}` : href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/app/onboarding",
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  markTenantOnboardingComplete: () => ({ type: "auth/onboardingComplete" }),
  selectIsAuthenticated: () => true,
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  setActiveStudioId: (payload) => ({ type: "studio/set", payload }),
}));

vi.mock(
  "@/components/onboarding/onboardingNavigation",
  async (importOriginal) => {
    const actual = await importOriginal();

    return {
      ...actual,
      navigateToLaunchCenter: (...args) =>
        mocks.navigateToLaunchCenter(...args),
    };
  },
);

vi.mock("@/lib/features/tenants/tenantApiSlice", () => ({
  useCompleteCurrentTenantOnboardingMutation: () => [
    mocks.complete,
    { isLoading: mocks.isCompleting },
  ],
  useGetCurrentTenantOnboardingQuery: () => mocks.query,
  useSaveCurrentTenantOnboardingMutation: () => [
    mocks.saveStep,
    { isLoading: mocks.isSaving },
  ],
}));

import TenantOnboardingPage from "@/app/[locale]/tenants/[tenantSlug]/app/onboarding/page";
import { buildLaunchCenterUrl } from "@/components/onboarding/onboardingNavigation";

const renderPage = (locale = "en") =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "cs" ? messagesCs : messagesEn}
      timeZone="Europe/Prague"
    >
      <TenantOnboardingPage />
    </NextIntlClientProvider>,
  );

describe("tenant studio setup page", () => {
  beforeEach(() => {
    mocks.authenticated = true;
    mocks.complete.mockReset();
    mocks.completeUnwrap.mockReset();
    mocks.dispatch.mockReset();
    mocks.isCompleting = false;
    mocks.isSaving = false;
    mocks.navigateToLaunchCenter.mockReset();
    mocks.query = {
      data: onboardingData(),
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: mocks.refetch,
    };
    mocks.refetch.mockReset();
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.saveStep.mockReset();
    mocks.saveUnwrap.mockReset();
    mocks.saveUnwrap.mockResolvedValue({});
    mocks.saveStep.mockImplementation(() => ({ unwrap: mocks.saveUnwrap }));
    mocks.completeUnwrap.mockResolvedValue({
      primaryLocation: { _id: "64b000000000000000000001" },
      tenant: { id: "64a000000000000000000001" },
    });
    mocks.complete.mockImplementation(() => ({
      unwrap: mocks.completeUnwrap,
    }));
  });

  it("builds a hard-navigation Launch Center URL on the current tenant host", () => {
    expect(
      buildLaunchCenterUrl({
        locale: "cs",
        origin: "http://studio-alpha.shario.localhost:3000",
      }),
    ).toBe("http://studio-alpha.shario.localhost:3000/cs/app/setup");
  });

  it("keeps saved tenant currency and timezone independent of browser and country edits", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["en-US"]);
    mocks.query.data.tenant.settings = {
      currency: "CHF",
      timezone: "Europe/Warsaw",
    };
    mocks.query.data.onboarding.businessDetails.country = "PL";
    renderPage("en");
    const country = await screen.findByRole("combobox", { name: "Country" });
    expect(country).toHaveValue("PL");
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveValue(
      "CHF",
    );
    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveValue(
      "Europe/Warsaw",
    );
    fireEvent.change(country, { target: { value: "Germany" } });
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveValue(
      "CHF",
    );
  });

  it("renders the five Czech essentials in the compact branded shell", async () => {
    const { container } = renderPage("cs");

    expect(
      await screen.findByRole("form", { name: /Pojďme spustit/ }),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-onboarding-page]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-onboarding-card]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-onboarding-grid]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-onboarding-left]"),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-onboarding-visual]"),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-onboarding-right]")).toHaveAttribute(
      "data-platform-auth-full-height",
    );

    const header = screen.getByRole("banner");

    expect(header).toHaveAttribute("data-onboarding-header");
    expect(header).toHaveClass("absolute", "bg-transparent");
    expect(header).not.toHaveClass("border-b", "bg-surface/95");
    expect(within(header).queryByRole("navigation")).not.toBeInTheDocument();
    expect(
      within(header).getByRole("link", { name: "Úvod Shario" }),
    ).toBeInTheDocument();
    expect(
      within(header).getAllByText("Nastavení studia").length,
    ).toBeGreaterThanOrEqual(1);

    const languageTriggers = within(header).getAllByRole("button", {
      name: "Změnit jazyk (CS)",
    });

    expect(languageTriggers.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(languageTriggers[0]);

    const selectedLanguage = within(
      languageTriggers[0].parentElement,
    ).getByRole("button", { pressed: true });

    expect(selectedLanguage).toHaveTextContent("CS");
    expect(selectedLanguage).toHaveTextContent("Čeština");
    expect(
      within(header).queryByRole("link", { name: /Přepnout na/ }),
    ).not.toBeInTheDocument();
    for (const publicNavigationLabel of [
      "Product",
      "Studio AI",
      "For studios",
      "Pricing",
      "Log in",
      "Start free",
    ]) {
      expect(within(header).queryByText(publicNavigationLabel)).toBeNull();
    }
    expect(screen.getByRole("textbox", { name: "Název studia" })).toHaveValue(
      "Clay Lab",
    );
    const selectedStudioType = screen.getByRole("button", {
      name: "Coworking",
    });

    expect(selectedStudioType).toHaveAttribute("aria-pressed", "true");
    expect(selectedStudioType).toHaveClass("min-h-12", "w-auto");
    expect(
      selectedStudioType.querySelector("[data-onboarding-choice-check]"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(3);
    for (const select of screen.getAllByRole("combobox")) {
      expect(select).toBeRequired();
      expect(select).toHaveClass("appearance-none", "bg-none");
      expect(
        select.parentElement.querySelectorAll("[data-select-chevron]"),
      ).toHaveLength(1);
    }
    expect(screen.getByRole("main")).toHaveAttribute(
      "data-skab-public-surface",
    );
    expect(
      screen.getByRole("button", { name: "Pokračovat do Launch Center" }),
    ).toBeEnabled();
  });

  it("supports keyboard studio choices without losing entered essentials", async () => {
    const user = userEvent.setup();
    renderPage("en");

    const studioName = await screen.findByRole("textbox", {
      name: "Studio name",
    });
    await user.clear(studioName);
    await user.type(studioName, "Mia's Clay Studio");

    const art = screen.getByRole("button", { name: "Art studio" });
    art.focus();
    await user.keyboard("{Enter}");
    expect(art).toHaveAttribute("aria-pressed", "true");

    const coworking = screen.getByRole("button", { name: "Coworking space" });
    coworking.focus();
    await user.keyboard(" ");
    expect(coworking).toHaveAttribute("aria-pressed", "true");
    expect(art).toHaveAttribute("aria-pressed", "false");
    expect(studioName).toHaveValue("Mia's Clay Studio");
    expect(screen.getByRole("combobox", { name: "Currency" })).toHaveValue(
      "CZK",
    );
    expect(mocks.saveStep).not.toHaveBeenCalled();
  });

  it.each(["isSaving", "isCompleting"])(
    "keeps submission unavailable while %s",
    async (loadingState) => {
      mocks[loadingState] = true;
      renderPage("en");

      const submit = await screen.findByRole("button", {
        name: "Continue to Launch Center",
      });
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute("aria-busy", "true");
      fireEvent.click(submit);
      expect(mocks.saveStep).not.toHaveBeenCalled();
    },
  );

  it("keeps the integrated setup exit action functional", async () => {
    renderPage("en");

    await screen.findByRole("form", { name: /Let’s launch/ });
    const exitActions = screen.getAllByRole("button", { name: "Exit" });

    expect(exitActions.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(exitActions[0]);
    expect(mocks.router.push).toHaveBeenCalledWith("/");
  });

  it("uses localized submit-time validation and focuses its error summary", async () => {
    renderPage("en");

    const studioName = await screen.findByRole("textbox", {
      name: "Studio name",
    });
    fireEvent.change(studioName, { target: { value: "" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to Launch Center" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Please complete all required fields.");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(studioName).toHaveAttribute("aria-invalid", "true");
    expect(studioName).toHaveAccessibleDescription("Enter your studio name.");
    expect(mocks.saveStep).not.toHaveBeenCalled();
  });

  it("saves changed values sequentially, initializes the studio and opens Launch Center", async () => {
    renderPage("en");

    fireEvent.change(
      await screen.findByRole("textbox", { name: "Studio name" }),
      { target: { value: "  New Clay Lab  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Art studio" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Country" }), {
      target: { value: "Denmark" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Currency" }), {
      target: { value: "EUR" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Timezone" }), {
      target: { value: "Europe/Copenhagen" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to Launch Center" }),
    );

    await waitFor(() => expect(mocks.complete).toHaveBeenCalledTimes(1));
    expect(mocks.saveStep).toHaveBeenNthCalledWith(1, {
      step: 1,
      tenantName: "New Clay Lab",
      businessType: "art_studio",
    });
    expect(mocks.saveStep).toHaveBeenNthCalledWith(2, {
      step: 2,
      businessDetails: { country: "Denmark" },
      settings: { currency: "EUR", timezone: "Europe/Copenhagen" },
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "studio/set",
      payload: {
        tenantId: "64a000000000000000000001",
        studioId: "64b000000000000000000001",
      },
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/onboardingComplete",
    });
    expect(mocks.navigateToLaunchCenter).toHaveBeenLastCalledWith({
      locale: "en",
    });
  });

  it("opens Launch Center once when the completion refetch races the submit", async () => {
    let resolveCompletion;
    mocks.completeUnwrap.mockReturnValue(
      new Promise((resolve) => {
        resolveCompletion = resolve;
      }),
    );
    const view = renderPage("en");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Continue to Launch Center",
      }),
    );
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledTimes(1));

    mocks.query = {
      ...mocks.query,
      data: {
        ...onboardingData(),
        onboarding: { ...onboardingData().onboarding, completed: true },
      },
    };
    view.rerender(
      <NextIntlClientProvider
        locale="en"
        messages={messagesEn}
        timeZone="Europe/Prague"
      >
        <TenantOnboardingPage />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(mocks.navigateToLaunchCenter).toHaveBeenCalledTimes(1),
    );

    await act(async () => {
      resolveCompletion({
        primaryLocation: { _id: "64b000000000000000000001" },
        tenant: { id: "64a000000000000000000001" },
      });
    });

    await waitFor(() =>
      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "auth/onboardingComplete",
      }),
    );
    expect(mocks.navigateToLaunchCenter).toHaveBeenCalledTimes(1);
  });

  it("allows another navigation attempt when the hard navigation throws", async () => {
    mocks.navigateToLaunchCenter.mockImplementationOnce(() => {
      throw new Error("Navigation did not start.");
    });
    renderPage("en");

    const submit = await screen.findByRole("button", {
      name: "Continue to Launch Center",
    });
    fireEvent.click(submit);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not prepare your workspace. Please try again.",
    );
    expect(mocks.navigateToLaunchCenter).toHaveBeenCalledTimes(1);

    fireEvent.click(submit);

    await waitFor(() =>
      expect(mocks.navigateToLaunchCenter).toHaveBeenCalledTimes(2),
    );
  });

  it("shows and focuses localized copy without continuing after a failed save", async () => {
    mocks.saveUnwrap.mockRejectedValueOnce({
      data: { message: "Workspace settings could not be saved." },
    });
    renderPage("en");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Continue to Launch Center",
      }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "We could not prepare your workspace. Please try again.",
    );
    expect(alert).not.toHaveTextContent(
      "Workspace settings could not be saved.",
    );
    await waitFor(() => expect(alert).toHaveFocus());
    expect(mocks.saveStep).toHaveBeenCalledTimes(1);
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.navigateToLaunchCenter).not.toHaveBeenCalled();
  });

  it("falls back to localized request copy", async () => {
    mocks.saveUnwrap.mockRejectedValueOnce({});
    renderPage("cs");

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Pokračovat do Launch Center",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Pracovní prostor se nepodařilo připravit. Zkuste to prosím znovu.",
    );
  });

  it("keeps load failures recoverable", async () => {
    mocks.query = {
      data: null,
      error: { data: { message: "Could not load this workspace." } },
      isFetching: false,
      isLoading: false,
      refetch: mocks.refetch,
    };
    renderPage("en");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not load your launch details.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });

  it("redirects completed and unauthenticated sessions", async () => {
    mocks.query = {
      data: {
        ...onboardingData(),
        onboarding: { ...onboardingData().onboarding, completed: true },
      },
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: mocks.refetch,
    };
    const view = renderPage("en");
    await waitFor(() =>
      expect(mocks.navigateToLaunchCenter).toHaveBeenCalledWith({
        locale: "en",
      }),
    );

    mocks.router.replace.mockReset();
    mocks.authenticated = false;
    view.rerender(
      <NextIntlClientProvider
        locale="en"
        messages={messagesEn}
        timeZone="Europe/Prague"
      >
        <TenantOnboardingPage />
      </NextIntlClientProvider>,
    );
    await waitFor(() =>
      expect(mocks.router.replace).toHaveBeenCalledWith("/login"),
    );
  });
});
