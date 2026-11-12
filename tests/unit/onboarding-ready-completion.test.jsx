import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const replace = vi.fn();

  return {
    complete: vi.fn(),
    completeUnwrap: vi.fn(),
    dispatch: vi.fn(),
    navigateToLaunchCenter: vi.fn(),
    onboardingData: {
      tenant: {
        id: "tenant-1",
        name: "Clay Lab",
        settings: { currency: "CZK", timezone: "Europe/Prague" },
      },
      onboarding: {
        completed: false,
        currentStep: 3,
        businessType: "pottery_studio",
        businessDetails: { country: "Czech Republic" },
        bookingSetup: {
          bookingTypes: ["private_sessions"],
          confirmationMode: "manual",
        },
      },
    },
    replace,
    router: { replace, push: vi.fn() },
    saveStep: vi.fn(),
    saveUnwrap: vi.fn(),
  };
});

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) =>
    selector({
      auth: {
        token: "token",
        userInfo: { id: "user-1" },
      },
    }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  markTenantOnboardingComplete: () => ({ type: "auth/onboardingComplete" }),
  selectIsAuthenticated: () => true,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/components/onboarding/OnboardingHeader", () => ({
  OnboardingHeader: () => <header>Header</header>,
}));
vi.mock("@/components/onboarding/OnboardingSidebar", () => ({
  OnboardingSidebar: () => <aside>Sidebar</aside>,
}));
vi.mock("@/components/onboarding/StepHeading", () => ({
  StepHeading: () => <h1>Launch your studio</h1>,
}));
vi.mock("@/components/onboarding/onboardingNavigation", () => ({
  navigateToLaunchCenter: (...args) => mocks.navigateToLaunchCenter(...args),
}));
vi.mock("@/components/onboarding/steps/StudioStep", () => ({
  StudioStep: ({ form }) => <div>Studio form: {form.studioName}</div>,
}));
vi.mock("@/components/onboarding/steps/BusinessStep", () => ({
  BusinessStep: ({ form }) => (
    <div>
      Country, timezone and currency: {form.country}, {form.timezone},{" "}
      {form.currency}
    </div>
  ),
}));
vi.mock("@/components/ui/buttons/Button", () => ({
  Button: ({ children, type = "button", onClick, disabled }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));
vi.mock("@/components/ui/form/InlineNotice", () => ({
  InlineNotice: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  setActiveStudioId: (payload) => ({ type: "studio/set", payload }),
}));
vi.mock("@/lib/features/tenants/tenantApiSlice", () => ({
  useGetCurrentTenantOnboardingQuery: () => ({
    data: mocks.onboardingData,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useSaveCurrentTenantOnboardingMutation: () => [
    mocks.saveStep,
    { isLoading: false },
  ],
  useCompleteCurrentTenantOnboardingMutation: () => [
    mocks.complete,
    { isLoading: false },
  ],
}));

import TenantOnboardingPage from "@/app/[locale]/tenants/[tenantSlug]/app/onboarding/page";

describe("one-screen launch essentials", () => {
  beforeEach(() => {
    mocks.complete.mockReset();
    mocks.completeUnwrap.mockReset();
    mocks.dispatch.mockReset();
    mocks.navigateToLaunchCenter.mockReset();
    mocks.replace.mockReset();
    mocks.saveStep.mockReset();
    mocks.saveUnwrap.mockReset();
    mocks.completeUnwrap.mockResolvedValue({ tenant: { id: "tenant-1" } });
    mocks.complete.mockReturnValue({ unwrap: mocks.completeUnwrap });
    mocks.saveStep.mockReturnValue({ unwrap: mocks.saveUnwrap });
  });

  it("saves only the five essentials and opens Launch Center", async () => {
    render(<TenantOnboardingPage />);

    expect(
      await screen.findByText("Studio form: Clay Lab"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Country, timezone and currency: Czech Republic, Europe/Prague, CZK",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "actions.openLaunchCenter" }),
    );

    await waitFor(() => expect(mocks.complete).toHaveBeenCalledTimes(1));
    expect(mocks.saveStep).toHaveBeenNthCalledWith(1, {
      step: 1,
      tenantName: "Clay Lab",
      businessType: "pottery_studio",
    });
    expect(mocks.saveStep).toHaveBeenNthCalledWith(2, {
      step: 2,
      businessDetails: { country: "Czech Republic" },
      settings: { currency: "CZK", timezone: "Europe/Prague" },
    });
    expect(JSON.stringify(mocks.saveStep.mock.calls)).not.toMatch(
      /teamSize|city|address|phone|bookingTypes|confirmationMode/,
    );
    expect(mocks.navigateToLaunchCenter).toHaveBeenCalledWith({
      locale: "en",
    });
  });
});
