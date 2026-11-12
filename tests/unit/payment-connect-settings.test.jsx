import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getConnect: vi.fn(),
  locale: "en",
  openDashboardHook: vi.fn(),
  startOnboarding: vi.fn(),
  startOnboardingHook: vi.fn(),
  unwrap: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => apiMocks.locale,
  useTranslations: () => (key) => key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: false,
    refreshAndContinue: vi.fn(),
    stepId: "payments",
    track: vi.fn(),
  }),
}));

vi.mock("@/lib/features/tenant-payments/tenantPaymentsApiSlice", () => ({
  useGetTenantPaymentConnectQuery: apiMocks.getConnect,
  useOpenTenantPaymentConnectDashboardMutation: apiMocks.openDashboardHook,
  useStartTenantPaymentConnectOnboardingMutation: apiMocks.startOnboardingHook,
}));

import PaymentConnectSettingsPage from "@/components/views/payments/PaymentConnectSettingsPage";

const never = () => new Promise(() => {});

describe("payment Connect settings actions", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/settings/payments");
    apiMocks.locale = "en";
    apiMocks.startOnboarding.mockClear();

    apiMocks.getConnect.mockReturnValue({
      data: {
        account: {
          connected: false,
          onboardingStatus: "not_started",
        },
        permissions: { canManage: true },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    apiMocks.unwrap.mockReturnValue(never());
    apiMocks.startOnboarding.mockReturnValue({
      unwrap: apiMocks.unwrap,
    });
    apiMocks.startOnboardingHook.mockReturnValue([
      apiMocks.startOnboarding,
      { isLoading: false },
    ]);
    apiMocks.openDashboardHook.mockReturnValue([vi.fn(), { isLoading: false }]);
  });

  it.each([
    ["fr-FR", "fr"],
    ["es_ES", "es"],
    ["it-IT", "it"],
    ["pt_PT", "pt-PT"],
    ["sv-SE", "sv"],
    ["no_NO", "nb"],
    ["fi-FI", "fi"],
    ["hu-HU", "hu"],
    ["el_GR", "el"],
    ["tr-TR", "tr"],
    ["nl_NL", "nl"],
    ["ro-RO", "ro"],
    ["ja-JP", "en"],
    ["pt-BR", "en"],
  ])("canonicalizes %s for Stripe onboarding as %s", (locale, expected) => {
    apiMocks.locale = locale;
    render(<PaymentConnectSettingsPage />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "actions.connect",
      }),
    );

    expect(apiMocks.startOnboarding).toHaveBeenCalledWith({
      locale: expected,
    });
  });

  it("allows only one onboarding request while a redirect is in flight", () => {
    render(<PaymentConnectSettingsPage />);

    const connectButton = screen.getByRole("button", {
      name: "actions.connect",
    });

    fireEvent.click(connectButton);
    fireEvent.click(connectButton);

    expect(apiMocks.startOnboarding).toHaveBeenCalledOnce();
    expect(apiMocks.startOnboarding).toHaveBeenCalledWith({
      locale: "en",
    });
  });

  it("consumes a refresh URL once and prevents a click race", async () => {
    window.history.replaceState(
      {},
      "",
      "/settings/payments?connect=refresh&keep=yes&setupStep=payments",
    );

    render(<PaymentConnectSettingsPage />);

    await waitFor(() => {
      expect(apiMocks.startOnboarding).toHaveBeenCalledOnce();
    });

    expect(apiMocks.startOnboarding).toHaveBeenCalledWith({
      locale: "en",
      setupStep: "payments",
    });
    expect(window.location.search).toBe("?keep=yes&setupStep=payments");

    fireEvent.click(
      screen.getByRole("button", {
        name: "actions.connect",
      }),
    );

    expect(apiMocks.startOnboarding).toHaveBeenCalledOnce();
  });
});
