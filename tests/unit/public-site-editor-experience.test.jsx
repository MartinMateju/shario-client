import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveDraft: vi.fn(() => ({ unwrap: vi.fn() })),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/components/dashboard/WorkspaceTabs", () => ({
  default: ({ tabs, value, onChange, ariaLabel }) => (
    <div role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  ),
  WorkspaceTabPanel: ({ children }) => <div role="tabpanel">{children}</div>,
}));

vi.mock("@/components/decorations/WorkspaceBrushField", () => ({
  default: () => null,
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({ guided: false, refreshAndContinue: vi.fn() }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({
    name: "Clay House",
    slug: "clay-house",
    modules: {},
  }),
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: { WORKSPACE_PUBLISH: "workspace:publish" },
  hasPermission: () => true,
}));

vi.mock("@/lib/features/publicSite/publicSiteApiSlice", () => ({
  useGetPublicSiteEditorQuery: () => ({
    data: {
      tenant: { name: "Clay House", slug: "clay-house" },
      draft: {
        branding: {
          displayName: "Clay House",
          accentColor: "#2563EB",
          secondaryColor: "#FF715B",
          backgroundColor: "#FFFFFF",
          textColor: "#182333",
          buttonTextColor: "",
          labelColor: "#2563EB",
        },
      },
      editor: { draftRevision: 3, hasUnpublishedChanges: false },
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useGetPublicSitePreviewQuery: () => ({
    data: {
      tenant: {
        publicCapabilities: {
          bookStudio: true,
          courses: true,
          memberships: true,
          vouchers: true,
          help: true,
          registration: true,
        },
      },
      editor: { publicationStatus: "live", publiclyAvailable: true },
    },
    isError: false,
  }),
  useGetPublicSiteVersionsQuery: () => ({
    data: { versions: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePublishPublicSiteMutation: () => [vi.fn(), { isLoading: false }],
  useRestorePublicSiteVersionMutation: () => [vi.fn(), { isLoading: false }],
  useResetPublicSiteDraftMutation: () => [vi.fn(), { isLoading: false }],
  useSavePublicSiteDraftMutation: () => [mocks.saveDraft, { isLoading: false }],
  useUploadPublicSiteMediaMutation: () => [vi.fn()],
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useGetSetupCenterQuery: () => ({
    data: { launchReview: { required: { incompleteStepIds: [] } } },
    isLoading: false,
    refetch: vi.fn(),
  }),
  usePublishStudioMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/components/public-site-editor/PublicSiteLivePreview", () => ({
  default: ({ publicSite, page, device }) => (
    <output
      data-testid="editor-draft-snapshot"
      data-preview-page={page}
      data-preview-device={device}
    >
      {JSON.stringify(publicSite)}
    </output>
  ),
}));

import PublicSiteEditorPage from "@/components/public-site-editor/PublicSiteEditorPage";
import { PUBLIC_TENANT_FONT_PRESET_IDS } from "@/components/public-tenant/publicTenantStylePresets";
import enMessages from "@/messages/en.json";

const readDraft = () =>
  JSON.parse(screen.getByTestId("editor-draft-snapshot").textContent);

describe("PublicSiteEditorPage experience controls", () => {
  it("previews and saves an optional logo link and prevents publishing an invalid destination", async () => {
    mocks.saveDraft.mockClear();
    mocks.saveDraft.mockImplementationOnce(({ patch }) => ({
      unwrap: vi.fn().mockResolvedValue({
        draft: patch,
        editor: { draftRevision: 4, hasUnpublishedChanges: true },
      }),
    }));

    render(
      <NextIntlClientProvider
        locale="en"
        messages={{ PublicSiteEditor: enMessages.PublicSiteEditor }}
      >
        <PublicSiteEditorPage />
      </NextIntlClientProvider>,
    );

    const toggle = screen.getByRole("switch", {
      name: /Make the logo a link/,
    });
    const save = screen.getByRole("button", { name: "Save draft" });
    const publish = screen.getByRole("button", { name: "Publish changes" });
    expect(toggle).not.toBeChecked();
    expect(
      screen.queryByLabelText("Logo destination URL"),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);
    const destination = screen.getByLabelText("Logo destination URL");
    expect(destination).toHaveValue("");
    expect(destination).toHaveAttribute("aria-invalid", "true");
    expect(save).toBeDisabled();
    expect(publish).toBeDisabled();

    fireEvent.change(destination, { target: { value: "javascript:alert(1)" } });
    expect(destination).toHaveAttribute("aria-invalid", "true");
    expect(save).toBeDisabled();
    expect(
      screen.getByText(
        "Enter a valid HTTPS address or a path starting with /.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(destination, {
      target: { value: "https://www.atelierklei.cz/" },
    });
    expect(destination).toHaveAttribute("aria-invalid", "false");
    expect(save).toBeEnabled();
    expect(publish).toBeEnabled();
    expect(readDraft().branding).toMatchObject({
      logoRedirectEnabled: true,
      logoRedirectUrl: "https://www.atelierklei.cz/",
    });

    fireEvent.click(toggle);
    expect(
      screen.queryByLabelText("Logo destination URL"),
    ).not.toBeInTheDocument();
    expect(readDraft().branding).toMatchObject({
      logoRedirectEnabled: false,
      logoRedirectUrl: "https://www.atelierklei.cz/",
    });
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Logo destination URL")).toHaveValue(
      "https://www.atelierklei.cz/",
    );
    fireEvent.click(save);
    await waitFor(() =>
      expect(mocks.saveDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            branding: expect.objectContaining({
              logoRedirectEnabled: true,
              logoRedirectUrl: "https://www.atelierklei.cz/",
            }),
          }),
        }),
      ),
    );
  });

  it("applies recipes to the draft and exposes font, registration and portal controls", () => {
    render(
      <NextIntlClientProvider
        locale="en"
        messages={{ PublicSiteEditor: enMessages.PublicSiteEditor }}
      >
        <PublicSiteEditorPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("radio", { name: "Manrope" })).toBeChecked();
    expect(
      screen.queryByRole("radio", { name: /Modern Condensed/ }),
    ).not.toBeInTheDocument();
    const warmPresetPreview = document.querySelector(
      '[data-style-preset-preview="warm-organic-v1"]',
    );
    expect(warmPresetPreview).toHaveStyle({ backgroundColor: "#F9EADC" });
    expect(
      warmPresetPreview.querySelector('[data-tenant-button="primary"]'),
    ).toHaveStyle({ backgroundColor: "#9B4B35" });

    fireEvent.click(screen.getByRole("radio", { name: "Classic Editorial" }));
    expect(readDraft().branding).toMatchObject({
      stylePreset: "classic-editorial-v1",
      fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.EDITORIAL_SERIF,
      accentColor: "#2563EB",
      secondaryColor: "#FF715B",
      backgroundColor: "#FFFFFF",
      textColor: "#182333",
      labelColor: "#2563EB",
    });

    fireEvent.click(screen.getByRole("radio", { name: "Warm Organic" }));

    expect(readDraft().branding).toMatchObject({
      stylePreset: "warm-organic-v1",
      fontPreset: PUBLIC_TENANT_FONT_PRESET_IDS.WARM_SERIF,
      accentColor: "#9B4B35",
      secondaryColor: "#C96F4F",
      backgroundColor: "#F9EADC",
      textColor: "#2F241F",
      labelColor: "#88422F",
    });

    fireEvent.click(screen.getByRole("radio", { name: "Manrope" }));
    expect(readDraft().branding.fontPreset).toBe(
      PUBLIC_TENANT_FONT_PRESET_IDS.SKAB_SANS,
    );
    expect(readDraft().branding.accentColor).toBe("#9B4B35");

    const buttonTextColor = screen.getByLabelText(
      "Button text colour hex value",
    );
    const automaticContrast = screen.getByRole("button", {
      name: "Use automatic contrast",
    });
    expect(buttonTextColor).toHaveValue("");
    expect(automaticContrast).toBeDisabled();
    expect(
      screen.getByText("Automatic · strongest contrast"),
    ).toBeInTheDocument();

    fireEvent.change(buttonTextColor, { target: { value: "#FEFEFE" } });
    expect(automaticContrast).toBeEnabled();
    expect(readDraft().branding.buttonTextColor).toBe("#FEFEFE");
    expect(screen.getByText("Custom button text colour")).toBeInTheDocument();

    fireEvent.change(buttonTextColor, { target: { value: "#9B4B35" } });
    expect(
      screen.getByText(
        "Custom colour has low contrast · automatic colour applied",
      ),
    ).toBeInTheDocument();

    fireEvent.click(automaticContrast);
    expect(buttonTextColor).toHaveValue("");
    expect(readDraft().branding.buttonTextColor).toBe("");

    fireEvent.click(screen.getByRole("tab", { name: "Pages" }));
    const headlineColor = screen.getByLabelText(
      "Homepage headline colour · optional hex value",
    );
    const inheritTextColor = screen.getByRole("button", {
      name: "Use text colour",
    });
    expect(headlineColor).toHaveValue("");
    expect(inheritTextColor).toBeDisabled();
    expect(
      screen.getByText("Inheriting the brand text colour"),
    ).toBeInTheDocument();

    fireEvent.change(headlineColor, { target: { value: "#F9EADC" } });
    expect(readDraft().pages.home.headlineColor).toBe("#F9EADC");
    expect(
      screen.getByText("Custom colour adjusted for readable contrast"),
    ).toBeInTheDocument();

    fireEvent.change(headlineColor, { target: { value: "#243B53" } });
    expect(
      screen.getByText("Custom headline colour override"),
    ).toBeInTheDocument();
    fireEvent.click(inheritTextColor);
    expect(headlineColor).toHaveValue("");
    expect(readDraft().pages.home.headlineColor).toBe("");

    fireEvent.click(screen.getByRole("tab", { name: "Registration" }));
    expect(screen.getByText("Customer registration copy")).toBeInTheDocument();
    expect(screen.getByTestId("editor-draft-snapshot")).toHaveAttribute(
      "data-preview-page",
      "register",
    );

    const registrationLabelColor = screen.getByLabelText(
      "Registration label colour · optional hex value",
    );
    const inheritButton = screen.getByRole("button", {
      name: "Use brand colour",
    });
    expect(registrationLabelColor).toHaveValue("");
    expect(inheritButton).toBeDisabled();

    fireEvent.change(registrationLabelColor, {
      target: { value: "#3146C8" },
    });
    expect(inheritButton).toBeEnabled();
    expect(readDraft().register.labelColor).toBe("#3146C8");

    fireEvent.click(inheritButton);
    expect(registrationLabelColor).toHaveValue("");
    expect(readDraft().register.labelColor).toBe("");

    fireEvent.click(screen.getByRole("tab", { name: "Customer portal" }));
    expect(screen.getByText("Customer dashboard welcome")).toBeInTheDocument();
    expect(screen.getByTestId("editor-draft-snapshot")).toHaveAttribute(
      "data-preview-page",
      "portal",
    );
    expect(
      screen.getByLabelText("Dashboard label colour · optional hex value"),
    ).toHaveValue("");
    expect(screen.getByText("Portal appearance")).toBeInTheDocument();

    const appearanceInputs = [
      ["Page background hex value", "#101820"],
      ["Cards and panels hex value", "#202B39"],
      ["Body text hex value", "#FFFFFF"],
      ["Headings hex value", "#E9B949"],
      ["Header background hex value", "#151B28"],
      ["Header text hex value", "#FFFFFF"],
      ["Primary button colour hex value", "#E9B949"],
      ["Calendar background hex value", "#243247"],
      ["Calendar text hex value", "#FFFFFF"],
      ["Profile menu background hex value", "#FFF1DE"],
    ];

    for (const [label, value] of appearanceInputs) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveValue("");
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveValue(value);
    }

    expect(readDraft().customerPortal.appearance).toEqual({
      backgroundColor: "#101820",
      surfaceColor: "#202B39",
      textColor: "#FFFFFF",
      headingColor: "#E9B949",
      headerBackgroundColor: "#151B28",
      headerTextColor: "#FFFFFF",
      primaryButtonColor: "#E9B949",
      calendarBackgroundColor: "#243247",
      calendarTextColor: "#FFFFFF",
      profileMenuBackgroundColor: "#FFF1DE",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Use brand colours for all" }),
    );
    expect(Object.values(readDraft().customerPortal.appearance)).toEqual(
      Array(10).fill(""),
    );
    expect(
      screen.getByRole("button", { name: "Use brand colours for all" }),
    ).toBeDisabled();
  });

  it("keeps save and publish blocked while a colour value is incomplete", () => {
    mocks.saveDraft.mockClear();

    render(
      <NextIntlClientProvider
        locale="en"
        messages={{ PublicSiteEditor: enMessages.PublicSiteEditor }}
      >
        <PublicSiteEditorPage />
      </NextIntlClientProvider>,
    );

    const primaryColor = screen.getByLabelText("Primary colour hex value");
    const save = screen.getByRole("button", { name: "Save draft" });
    const publish = screen.getByRole("button", { name: "Publish changes" });

    fireEvent.change(primaryColor, { target: { value: "#12" } });

    expect(primaryColor).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(
        "Fix the highlighted colour before saving or publishing.",
      ),
    ).toBeInTheDocument();
    expect(save).toBeDisabled();
    expect(publish).toBeDisabled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();

    fireEvent.change(primaryColor, { target: { value: "#3146C8" } });

    expect(primaryColor).toHaveAttribute("aria-invalid", "false");
    expect(save).toBeEnabled();
    expect(publish).toBeEnabled();
  });
});
