import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  guided: true,
  refreshAndContinue: vi.fn(),
  replace: vi.fn(),
  search: "",
  settings: {
    id: "tenant-1",
    name: "Legacy Studio",
    businessType: "",
    country: "",
    defaultLanguage: "EN",
    currency: "EUR",
    timezone: "Europe/Prague",
  },
  unwrap: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace) => (key) => `${namespace}.${key}`,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/app/settings/general",
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/i18n/routing", () => ({
  routing: {
    locales: [
      "en",
      "cs",
      "de",
      "pl",
      "sk",
      "da",
      "fr",
      "es",
      "it",
      "pt-PT",
      "sv",
      "nb",
      "fi",
      "hu",
      "el",
      "tr",
      "nl",
      "ro",
    ],
  },
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: mocks.guided,
    stepId: "studio",
    refreshAndContinue: mocks.refreshAndContinue,
  }),
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetWorkspaceSettingsQuery: () => ({
    data: { settings: mocks.settings },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useUpdateWorkspaceSettingsMutation: () => [
    mocks.updateSettings,
    { isLoading: false },
  ],
}));

import WorkspaceSettingsPage from "@/components/views/settings/WorkspaceSettingsPage";

describe("guided workspace settings", () => {
  beforeEach(() => {
    window.location.hash = "";
    mocks.guided = true;
    mocks.search = "";
    mocks.refreshAndContinue.mockReset().mockResolvedValue(true);
    mocks.replace.mockReset();
    mocks.unwrap.mockReset().mockResolvedValue({});
    mocks.updateSettings.mockReset().mockReturnValue({ unwrap: mocks.unwrap });
    mocks.settings = {
      id: "tenant-1",
      name: "Legacy Studio",
      businessType: "",
      country: "",
      defaultLanguage: "EN",
      currency: "EUR",
      timezone: "Europe/Prague",
    };
  });

  it("requires the launch fields, persists canonical locales, then returns", async () => {
    render(<WorkspaceSettingsPage />);

    const submit = screen.getByRole("button", {
      name: "SetupCenter.guided.saveAndContinue",
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Onboarding.studio.typeQuestion"), {
      target: { value: "coworking_space" },
    });
    fireEvent.change(screen.getByLabelText("Onboarding.business.country"), {
      target: { value: "Czech Republic" },
    });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    await waitFor(() =>
      expect(mocks.updateSettings).toHaveBeenCalledWith({
        name: "Legacy Studio",
        businessType: "coworking_space",
        country: "Czech Republic",
        adminLanguage: "en",
        publicDefaultLanguage: "en",
        supportedPublicLanguages: ["en"],
        currency: "EUR",
        timezone: "Europe/Prague",
      }),
    );
    expect(mocks.refreshAndContinue).toHaveBeenCalledWith({
      metadata: { form: "workspace_settings" },
    });
  });

  it("preserves a legacy country outside the onboarding shortlist", () => {
    mocks.settings = {
      ...mocks.settings,
      businessType: "coworking_space",
      country: "United States",
    };

    render(<WorkspaceSettingsPage />);

    expect(screen.getByLabelText("Onboarding.business.country")).toHaveValue(
      "United States",
    );
  });

  it("opens the saved workspace language while preserving the current route", async () => {
    mocks.guided = false;
    mocks.settings = {
      ...mocks.settings,
      adminLanguage: "en",
      publicDefaultLanguage: "en",
      supportedPublicLanguages: ["en"],
    };
    mocks.search = "section=languages";
    window.location.hash = "#languages";

    render(<WorkspaceSettingsPage />);
    fireEvent.change(
      screen.getByRole("combobox", {
        name: /^WorkspaceSettings\.fields\.adminLanguage/,
      }),
      { target: { value: "hu" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "WorkspaceSettings.actions.save" }),
    );

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/app/settings/general?section=languages#languages",
        { locale: "hu", scroll: false },
      ),
    );
  });

  it("does not leave the form when the save fails", async () => {
    mocks.settings = {
      ...mocks.settings,
      businessType: "coworking_space",
      country: "Czech Republic",
    };
    mocks.unwrap.mockRejectedValueOnce({ data: { message: "Save failed" } });

    render(<WorkspaceSettingsPage />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "SetupCenter.guided.saveAndContinue",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "WorkspaceSettings.messages.error",
    );
    expect(mocks.refreshAndContinue).not.toHaveBeenCalled();
  });
});
