import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshAndContinue: vi.fn(),
  saveDraft: vi.fn(),
  saveDraftUnwrap: vi.fn(),
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, open }) => (open ? <>{children}</> : null),
  DialogDescription: ({ children }) => <p>{children}</p>,
  DialogPanel: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace) => (key) =>
    namespace === "SetupCenter" && key === "guided.saveAndContinue"
      ? "Save and continue"
      : key,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/components/dashboard/WorkspaceTabs", () => ({
  default: () => null,
  WorkspaceTabPanel: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/decorations/WorkspaceBrushField", () => ({
  default: () => null,
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: true,
    refreshAndContinue: mocks.refreshAndContinue,
  }),
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
    name: "Default Studio",
    slug: "default-studio",
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
      tenant: { name: "Default Studio", slug: "default-studio" },
      draft: {},
      editor: { draftRevision: 1, hasUnpublishedChanges: false },
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
          help: true,
          registration: true,
        },
      },
      editor: { publicationStatus: "draft", publiclyAvailable: false },
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

vi.mock("@/components/public-site-editor/PublicSiteEditorFields", () => ({
  PublicSiteEditorLocaleProvider: ({ children }) => children,
  BrandingFields: () => <div>Branding fields</div>,
  FooterFields: () => null,
  HeaderFields: () => null,
  LoginFields: () => null,
  PagesFields: () => null,
  RegisterFields: () => null,
  CustomerPortalFields: () => null,
}));

vi.mock("@/components/public-site-editor/PublicSiteLivePreview", () => ({
  default: () => <div>Website preview</div>,
}));

import PublicSiteEditorPage from "@/components/public-site-editor/PublicSiteEditorPage";

describe("guided public-site setup", () => {
  beforeEach(() => {
    mocks.refreshAndContinue.mockReset();
    mocks.refreshAndContinue.mockResolvedValue(undefined);
    mocks.saveDraft.mockReset();
    mocks.saveDraft.mockReturnValue({ unwrap: mocks.saveDraftUnwrap });
    mocks.saveDraftUnwrap.mockReset();
    mocks.saveDraftUnwrap.mockResolvedValue({
      draft: {},
      editor: {
        draftRevision: 2,
        draftUpdatedAt: "2026-08-10T10:00:00.000Z",
        hasUnpublishedChanges: false,
      },
    });
  });

  it("saves an unchanged default design before returning to Launch Center", async () => {
    const { container } = render(<PublicSiteEditorPage />);

    expect(container.querySelector('[data-guided-form="public_site"]')).toBe(
      container.firstElementChild,
    );
    const continueButton = screen.getByRole("button", {
      name: "Save and continue",
    });
    expect(continueButton).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "actions.publish" }),
    ).not.toBeInTheDocument();

    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mocks.saveDraft).toHaveBeenCalledWith({
        patch: expect.any(Object),
        revision: 1,
      });
    });
    expect(mocks.refreshAndContinue).toHaveBeenCalledWith({
      metadata: { form: "public_site_editor" },
    });
    expect(mocks.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.refreshAndContinue.mock.invocationCallOrder[0],
    );
  });
});
