import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  notifyPublished: vi.fn(),
  uploadResults: [],
  editorResult: null,
  previewResult: null,
  uploadMedia: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
  publishStudio: vi.fn(),
  resetDraft: vi.fn(),
  refetchEditor: vi.fn(),
  refetchSetup: vi.fn(),
  refetchVersions: vi.fn(),
  latestOnChange: null,
  latestOnUpload: null,
  latestPortalProps: null,
  saveLoading: false,
  persistedStyle: "classic-editorial-v1",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/publicTenant/publicationEvents", () => ({
  notifyPublicSitePublished: mocks.notifyPublished,
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: false,
    refreshAndContinue: vi.fn(),
  }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({
    name: "Studio Olivka",
    slug: "studio-olivka",
    modules: {
      bookings: true,
      courses: true,
      memberships: true,
      knowledge: true,
    },
  }),
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: { WORKSPACE_PUBLISH: "workspace.publish" },
  hasPermission: () => true,
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
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

vi.mock("@/components/dashboard/WorkspaceTabs", () => ({
  default: ({ ariaLabel, className, onChange }) => (
    <div data-testid="editor-tabs" aria-label={ariaLabel} className={className}>
      <button type="button" onClick={() => onChange("customerPortal")}>
        customer portal editor
      </button>
    </div>
  ),
  WorkspaceTabPanel: ({ children }) => <div>{children}</div>,
}));

vi.mock("@/components/public-site-editor/PublicSiteEditorFields", () => ({
  PublicSiteEditorLocaleProvider: ({ children }) => children,
  BrandingFields: ({
    draft,
    onChange,
    onUpload,
    onClearUpload,
    uploadState,
  }) => {
    mocks.latestOnChange = onChange;
    mocks.latestOnUpload = onUpload;
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            mocks.uploadResults.push(
              onUpload({
                file: new File(["image"], "cover.png", {
                  type: "image/png",
                }),
                slot: "cover",
                path: "branding.coverImageUrl",
              }),
            )
          }
        >
          valid upload
        </button>
        <button
          type="button"
          onClick={() =>
            mocks.uploadResults.push(
              onUpload({
                file: new File(["svg"], "cover.svg", {
                  type: "image/svg+xml",
                }),
                slot: "cover",
                path: "branding.coverImageUrl",
              }),
            )
          }
        >
          rapid invalid upload
        </button>
        <button type="button" onClick={onClearUpload}>
          clear upload feedback
        </button>
        <button
          type="button"
          onClick={() => onChange("branding.displayName", "Studio first edit")}
        >
          edit draft
        </button>
        <button
          type="button"
          onClick={() => onChange("branding.stylePreset", "modern-minimal-v1")}
        >
          choose modern style
        </button>
        <output data-testid="draft-name">{draft.branding.displayName}</output>
        <output data-testid="draft-style">{draft.branding.stylePreset}</output>
        <output data-testid="upload-busy">{String(uploadState.busy)}</output>
        <output data-testid="upload-error">
          {uploadState.errorMessage || ""}
        </output>
        <output data-testid="upload-reset-token">
          {uploadState.resetToken}
        </output>
        <output data-testid="upload-retryable">
          {String(Boolean(uploadState.failedUpload))}
        </output>
      </div>
    );
  },
  PagesFields: () => null,
  HeaderFields: () => null,
  FooterFields: () => null,
  LoginFields: () => null,
  RegisterFields: () => null,
  CustomerPortalFields: (props) => {
    mocks.latestPortalProps = props;
    return null;
  },
}));

vi.mock("@/components/public-site-editor/PublicSiteLivePreview", () => ({
  default: ({ device, locale, page, publicSite }) => (
    <>
      <output data-testid="preview-page">{page}</output>
      <output data-testid="preview-device">{device}</output>
      <output data-testid="preview-locale">{locale}</output>
      <output data-testid="preview-draft-name">
        {publicSite.branding.displayName}
      </output>
      <output data-testid="preview-style">
        {publicSite.branding.stylePreset}
      </output>
      <output data-testid="preview-portal-settings">
        {JSON.stringify(publicSite.customerPortal)}
      </output>
    </>
  ),
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useGetSetupCenterQuery: () => ({
    data: {
      definitionVersion: 1,
      launchReview: { required: { incompleteStepIds: [] } },
    },
    isLoading: false,
    refetch: mocks.refetchSetup,
  }),
  usePublishStudioMutation: () => [mocks.publishStudio, { isLoading: false }],
}));

vi.mock("@/lib/features/publicSite/publicSiteApiSlice", () => ({
  useGetPublicSiteEditorQuery: () => mocks.editorResult,
  useGetPublicSitePreviewQuery: () => mocks.previewResult,
  useGetPublicSiteVersionsQuery: () => ({
    data: { versions: [] },
    isLoading: false,
    isError: false,
    refetch: mocks.refetchVersions,
  }),
  useSavePublicSiteDraftMutation: () => [
    mocks.saveDraft,
    { isLoading: mocks.saveLoading },
  ],
  usePublishPublicSiteMutation: () => [mocks.publish, { isLoading: false }],
  useResetPublicSiteDraftMutation: () => [
    mocks.resetDraft,
    { isLoading: false },
  ],
  useRestorePublicSiteVersionMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve(editorState()) })),
    { isLoading: false },
  ],
  useUploadPublicSiteMediaMutation: () => [mocks.uploadMedia],
}));

import PublicSiteEditorPage from "@/components/public-site-editor/PublicSiteEditorPage";

const editorState = ({
  revision = 1,
  hasChanges = false,
  displayName = "Studio Olivka",
  stylePreset = "classic-editorial-v1",
} = {}) => ({
  tenant: { name: "Studio Olivka", slug: "studio-olivka" },
  draft: {
    branding: {
      displayName,
      stylePreset,
      logoUrl: "https://media.example/logo.png",
      accentColor: "#4056D6",
      secondaryColor: "#D9806E",
      backgroundColor: "#FCFBF8",
      textColor: "#292925",
    },
    pages: {
      home: {
        headline: { en: "Studio Olivka", cs: "Studio Olivka" },
      },
    },
    header: {
      navOrder: ["help", "book", "courses", "memberships", "vouchers"],
      hiddenItems: ["courses"],
    },
  },
  editor: {
    draftRevision: revision,
    publishedRevision: hasChanges ? revision - 1 : revision,
    hasUnpublishedChanges: hasChanges,
    publicationStatus: "not_published",
  },
});

const mutation = (factory) =>
  vi.fn((input) => ({ unwrap: () => Promise.resolve(factory(input)) }));

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("public-site editor page state", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
    mocks.dispatch.mockReset();
    mocks.notifyPublished.mockReset();
    mocks.uploadResults.length = 0;
    mocks.latestOnChange = null;
    mocks.latestOnUpload = null;
    mocks.latestPortalProps = null;
    mocks.saveLoading = false;
    mocks.persistedStyle = "classic-editorial-v1";
    const state = editorState();
    mocks.refetchEditor.mockReset();
    mocks.refetchEditor.mockReturnValue({
      unwrap: () => Promise.resolve(state),
    });
    mocks.refetchSetup.mockReset();
    mocks.refetchSetup.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          definitionVersion: 1,
          launchReview: { required: { incompleteStepIds: [] } },
        }),
    });
    mocks.refetchVersions.mockReset();
    mocks.refetchVersions.mockResolvedValue({ data: { versions: [] } });
    mocks.publishStudio.mockReset();
    mocks.publishStudio.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
    mocks.editorResult = {
      data: state,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchEditor,
    };
    mocks.previewResult = {
      data: {
        editor: {
          publicationStatus: "not_published",
          publiclyAvailable: false,
        },
        tenant: {
          publicCapabilities: {
            bookStudio: true,
            courses: true,
            memberships: true,
            help: true,
          },
        },
      },
      isError: false,
      refetch: vi.fn(),
    };
    mocks.uploadMedia.mockReset();
    mocks.saveDraft = mutation(({ patch }) => {
      mocks.persistedStyle = patch.branding.stylePreset;
      return editorState({
        revision: 2,
        hasChanges: true,
        displayName: patch.branding.displayName,
        stylePreset: patch.branding.stylePreset,
      });
    });
    mocks.publish = mutation(() => ({
      ...editorState({
        revision: 2,
        stylePreset: mocks.persistedStyle,
      }),
      editor: {
        draftRevision: 2,
        publishedRevision: 2,
        hasUnpublishedChanges: false,
        publicationStatus: "live",
        publishedAt: "2026-08-10T12:00:00.000Z",
      },
    }));
    mocks.resetDraft = mutation(() => editorState({ revision: 2 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a rapid second selection without corrupting the active upload", async () => {
    let resolveUpload;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    mocks.uploadMedia.mockReturnValue({ unwrap: () => uploadPromise });
    render(<PublicSiteEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "valid upload" }));
    fireEvent.click(
      screen.getByRole("button", { name: "rapid invalid upload" }),
    );

    expect(mocks.uploadResults).toEqual([true, false]);
    expect(mocks.uploadMedia).toHaveBeenCalledOnce();
    expect(screen.getByTestId("upload-busy")).toHaveTextContent("true");
    expect(screen.getByTestId("upload-error")).toBeEmptyDOMElement();

    await act(async () => {
      resolveUpload({
        ...editorState({ revision: 2, hasChanges: true }),
        media: { url: "https://media.example/cover.png" },
      });
      await uploadPromise;
    });

    await waitFor(() =>
      expect(screen.getByTestId("upload-busy")).toHaveTextContent("false"),
    );
  });

  it("serializes save and upload while preserving an edit queued after submit", async () => {
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    mocks.saveDraft = vi.fn(() => {
      mocks.saveLoading = true;
      return { unwrap: () => savePromise };
    });
    const view = render(<PublicSiteEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "edit draft" }));
    expect(screen.getByTestId("draft-name")).toHaveTextContent(
      "Studio first edit",
    );
    fireEvent.click(screen.getByRole("button", { name: "actions.saveDraft" }));
    expect(mocks.saveDraft).toHaveBeenCalledOnce();

    view.rerender(<PublicSiteEditorPage />);
    expect(screen.getByRole("button", { name: "edit draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "valid upload" })).toBeDisabled();
    expect(
      mocks.latestOnUpload({
        file: new File(["image"], "blocked.png", { type: "image/png" }),
        slot: "cover",
        path: "branding.coverImageUrl",
      }),
    ).toBe(false);
    expect(mocks.uploadMedia).not.toHaveBeenCalled();

    act(() => {
      mocks.latestOnChange("branding.displayName", "Studio late edit");
    });
    expect(screen.getByTestId("draft-name")).toHaveTextContent(
      "Studio late edit",
    );

    await act(async () => {
      resolveSave(
        editorState({ revision: 2, displayName: "Studio first edit" }),
      );
      await savePromise;
    });
    mocks.saveLoading = false;
    view.rerender(<PublicSiteEditorPage />);

    expect(screen.getByTestId("draft-name")).toHaveTextContent(
      "Studio late edit",
    );
    expect(
      screen.getByRole("button", { name: "actions.saveDraft" }),
    ).toBeEnabled();
  });

  it("keeps retryability provider-driven and clears stale field feedback", async () => {
    mocks.uploadMedia.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: {
            code: "PUBLIC_SITE_MEDIA_STORAGE_UNAVAILABLE",
            details: { retryable: false },
          },
        }),
    });
    render(<PublicSiteEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "valid upload" }));
    await waitFor(() =>
      expect(screen.getByTestId("upload-error")).toHaveTextContent(
        "messages.mediaStorageUnavailable",
      ),
    );
    expect(screen.getByTestId("upload-retryable")).toHaveTextContent("false");
    const token = Number(screen.getByTestId("upload-reset-token").textContent);

    fireEvent.click(
      screen.getByRole("button", { name: "clear upload feedback" }),
    );
    expect(screen.getByTestId("upload-error")).toBeEmptyDOMElement();
    expect(Number(screen.getByTestId("upload-reset-token").textContent)).toBe(
      token + 1,
    );
  });

  it("locks revision-sensitive actions while reloading a conflicted draft", async () => {
    mocks.uploadMedia.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { code: "PUBLIC_SITE_REVISION_CONFLICT" },
        }),
    });
    let resolveReload;
    const reloadPromise = new Promise((resolve) => {
      resolveReload = resolve;
    });
    mocks.refetchEditor.mockReturnValue({ unwrap: () => reloadPromise });
    render(<PublicSiteEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "valid upload" }));
    const reloadButton = await screen.findByRole("button", {
      name: "actions.reload",
    });
    fireEvent.click(reloadButton);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "valid upload" }),
      ).toBeDisabled(),
    );
    expect(
      mocks.latestOnUpload({
        file: new File(["image"], "blocked.png", { type: "image/png" }),
        slot: "cover",
        path: "branding.coverImageUrl",
      }),
    ).toBe(false);

    await act(async () => {
      resolveReload(editorState({ revision: 2 }));
      await reloadPromise;
    });

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "valid upload" }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByRole("button", { name: "actions.reload" }),
    ).not.toBeInTheDocument();
  });

  it("normalizes a selected preview page when server capabilities remove it", () => {
    const view = render(<PublicSiteEditorPage />);
    fireEvent.change(screen.getByLabelText("preview.page"), {
      target: { value: "memberships" },
    });
    expect(screen.getByTestId("preview-page")).toHaveTextContent("memberships");

    mocks.previewResult = {
      ...mocks.previewResult,
      data: {
        ...mocks.previewResult.data,
        tenant: {
          publicCapabilities: {
            ...mocks.previewResult.data.tenant.publicCapabilities,
            memberships: false,
          },
        },
      },
    };
    view.rerender(<PublicSiteEditorPage />);

    expect(screen.getByTestId("preview-page")).toHaveTextContent("home");
    expect(screen.getByLabelText("preview.page")).toHaveValue("home");
  });

  it("offers course-only studios in the course editor and preview selector", () => {
    const courseLocations = [
      { id: "course-only", name: "Course studio", bookingEnabled: false },
    ];
    mocks.previewResult.data.preview = {
      data: { locations: [], courseLocations },
    };
    render(<PublicSiteEditorPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "customer portal editor" }),
    );
    expect(mocks.latestPortalProps.locations).toEqual(courseLocations);
    expect(mocks.latestPortalProps.selectedCourseLocationId).toBe(
      "course-only",
    );
    fireEvent.change(screen.getByLabelText("preview.page"), {
      target: { value: "portalCourses" },
    });
    expect(
      screen.getByLabelText("customerPortal.courses.location"),
    ).toHaveValue("course-only");
    expect(
      screen.getByRole("option", { name: "Course studio" }),
    ).toBeInTheDocument();
  });

  it("presents page and language as clear labelled preview controls", () => {
    mocks.editorResult = {
      ...mocks.editorResult,
      data: {
        ...mocks.editorResult.data,
        tenant: {
          ...mocks.editorResult.data.tenant,
          settings: {
            publicDefaultLanguage: "cs",
            supportedPublicLanguages: ["cs", "en"],
          },
        },
      },
    };

    render(<PublicSiteEditorPage />);

    const pageSelect = screen.getByRole("combobox", {
      name: "preview.page",
    });
    const languageSelect = screen.getByRole("combobox", {
      name: "preview.language",
    });

    expect(pageSelect.labels).toHaveLength(1);
    expect(pageSelect.labels[0]).toBeVisible();
    expect(pageSelect.labels[0]).toHaveTextContent("preview.page");
    expect(pageSelect).toHaveAttribute("data-preview-selector", "page");
    expect(pageSelect).toHaveAttribute(
      "data-contextual-guide-target",
      "customer-journey-preview-page",
    );
    expect(languageSelect.labels).toHaveLength(1);
    expect(languageSelect.labels[0]).toBeVisible();
    expect(languageSelect.labels[0]).toHaveTextContent("preview.language");
    expect(languageSelect).toHaveAttribute("data-preview-selector", "language");
    expect([...languageSelect.options].map((option) => option.value)).toEqual([
      "cs",
      "en",
    ]);
  });

  it("derives a valid preview locale when tenant language settings change", () => {
    const view = render(<PublicSiteEditorPage />);
    fireEvent.change(screen.getByLabelText("preview.language"), {
      target: { value: "cs" },
    });
    expect(screen.getByTestId("preview-locale")).toHaveTextContent("cs");

    mocks.editorResult = {
      ...mocks.editorResult,
      data: {
        ...mocks.editorResult.data,
        tenant: {
          ...mocks.editorResult.data.tenant,
          settings: {
            publicDefaultLanguage: "de",
            supportedPublicLanguages: ["de"],
          },
        },
      },
    };
    view.rerender(<PublicSiteEditorPage />);

    expect(screen.getByTestId("preview-locale")).toHaveTextContent("de");
    expect(screen.getByLabelText("preview.language")).toHaveValue("de");
  });

  it("keeps editing focused below 2xl and preserves the draft across workspace views", () => {
    render(<PublicSiteEditorPage showPageHeader={false} />);

    const workspace = screen.getByRole("group", {
      name: "workspace.label",
    });
    const editorButton = screen.getByRole("button", {
      name: "workspace.editor",
    });
    const previewButton = screen.getByRole("button", {
      name: "workspace.preview",
    });
    const editorPane = document.getElementById("public-site-editor-pane");
    const previewPane = document.getElementById("public-site-preview-pane");
    const layout = screen.getByTestId("public-site-builder-layout");
    const primaryActions = screen.getByRole("group", {
      name: "actions.primaryLabel",
    });

    expect(workspace).toBeInTheDocument();
    expect(editorButton).toHaveAttribute("aria-pressed", "true");
    expect(editorButton).not.toHaveAttribute("data-contextual-guide-target");
    expect(previewButton).toHaveAttribute("aria-pressed", "false");
    expect(previewButton).toHaveAttribute(
      "data-contextual-guide-target",
      "website-preview-toggle",
    );
    expect(editorPane).not.toHaveClass("hidden");
    expect(previewPane).toHaveClass("hidden", "2xl:block");
    expect(layout).toHaveClass(
      "2xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]",
    );
    expect(layout.className).not.toMatch(/(^|\\s)xl:grid-cols/);
    expect(primaryActions).toHaveClass("fixed", "2xl:static");
    expect(
      screen.getAllByRole("button", { name: "actions.saveDraft" }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Publish changes" }),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "edit draft" }));
    expect(screen.getByTestId("draft-name")).toHaveTextContent(
      "Studio first edit",
    );

    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    const scrollY = vi.spyOn(window, "scrollY", "get").mockReturnValue(1200);
    vi.spyOn(layout, "getBoundingClientRect").mockReturnValue({
      top: -800,
    });

    fireEvent.click(previewButton);
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 236,
      behavior: "auto",
    });
    expect(screen.getByTestId("preview-draft-name")).toHaveTextContent(
      "Studio first edit",
    );
    expect(editorButton).toHaveAttribute("aria-pressed", "false");
    expect(previewButton).toHaveAttribute("aria-pressed", "true");
    expect(editorPane).toHaveClass("hidden", "2xl:block");
    expect(previewPane).not.toHaveClass("hidden");

    scrollY.mockReturnValue(420);
    fireEvent.click(editorButton);
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 1200,
      behavior: "auto",
    });
    expect(screen.getByTestId("draft-name")).toHaveTextContent(
      "Studio first edit",
    );
  });

  it("selects an accurate mobile preview on narrow screens", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(max-width: 639px)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );

    render(<PublicSiteEditorPage />);

    await waitFor(() =>
      expect(screen.getByTestId("preview-device")).toHaveTextContent("mobile"),
    );
    expect(
      screen.getByRole("button", { name: "preview.mobile" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("group", { name: "preview.device" }),
    ).toBeInTheDocument();
  });

  it("previews a style immediately, saves it as draft, and never auto-publishes", async () => {
    render(<PublicSiteEditorPage />);

    expect(screen.getByTestId("preview-style")).toHaveTextContent(
      "classic-editorial-v1",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "choose modern style" }),
    );

    expect(screen.getByTestId("draft-style")).toHaveTextContent(
      "modern-minimal-v1",
    );
    expect(screen.getByTestId("preview-style")).toHaveTextContent(
      "modern-minimal-v1",
    );
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "actions.saveDraft" }));

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledOnce());
    expect(mocks.saveDraft).toHaveBeenCalledWith({
      revision: 1,
      patch: expect.objectContaining({
        branding: expect.objectContaining({
          displayName: "Studio Olivka",
          stylePreset: "modern-minimal-v1",
          logoUrl: "https://media.example/logo.png",
          accentColor: "#4056D6",
          secondaryColor: "#D9806E",
          backgroundColor: "#FCFBF8",
          textColor: "#292925",
        }),
        header: expect.objectContaining({
          navOrder: ["help", "book", "courses", "memberships", "vouchers"],
          hiddenItems: ["courses"],
        }),
      }),
    });
    expect(mocks.publish).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "actions.saveDraft" }),
      ).toBeDisabled(),
    );
    expect(mocks.notifyPublished).not.toHaveBeenCalled();
  });

  it("publishes the selected style only after confirmation and uses the saved revision", async () => {
    render(<PublicSiteEditorPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "choose modern style" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));

    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.notifyPublished).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(mocks.publish).toHaveBeenCalledWith({ revision: 2 }),
    );
    expect(mocks.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.publish.mock.invocationCallOrder[0],
    );
    await waitFor(() =>
      expect(mocks.notifyPublished).toHaveBeenCalledExactlyOnceWith(
        "studio-olivka",
      ),
    );
    expect(screen.getByTestId("preview-style")).toHaveTextContent(
      "modern-minimal-v1",
    );
  });

  it("previews, saves and publishes portal visibility without losing independent choices", async () => {
    let savedDraft;
    mocks.saveDraft = mutation(({ patch }) => {
      savedDraft = patch;
      return {
        ...editorState({ revision: 2, hasChanges: true }),
        draft: patch,
      };
    });
    mocks.publish = mutation(() => ({
      ...editorState({ revision: 2 }),
      draft: savedDraft,
    }));
    render(<PublicSiteEditorPage />);
    act(() =>
      mocks.latestOnChange("customerPortal.pages.calendar.enabled", false),
    );
    act(() =>
      mocks.latestOnChange(
        "customerPortal.navigation.memberships.visible",
        false,
      ),
    );
    const readPreview = () =>
      JSON.parse(screen.getByTestId("preview-portal-settings").textContent);

    expect(readPreview().pages.calendar.enabled).toBe(false);
    expect(readPreview().navigation.bookSession.visible).toBe(true);
    expect(readPreview().navigation.memberships.visible).toBe(false);
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "actions.saveDraft" }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "actions.saveDraft" }),
      ).toBeDisabled(),
    );
    expect(savedDraft.customerPortal).toMatchObject({
      pages: { calendar: { enabled: false } },
      navigation: {
        bookSession: { visible: true },
        memberships: { visible: false },
      },
    });
    expect(readPreview()).toEqual(savedDraft.customerPortal);
    expect(mocks.publish).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    expect(mocks.publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    await waitFor(() =>
      expect(mocks.publish).toHaveBeenCalledWith({ revision: 2 }),
    );
    expect(mocks.saveDraft).toHaveBeenCalledOnce();
    expect(readPreview()).toEqual(savedDraft.customerPortal);
  });

  it("ignores an undo shortcut fired while a publish is in flight", async () => {
    let resolveSave;
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    mocks.saveDraft = vi.fn(({ patch }) => {
      mocks.persistedStyle = patch.branding.stylePreset;
      return { unwrap: () => savePromise };
    });

    render(<PublicSiteEditorPage />);

    fireEvent.click(
      screen.getByRole("button", { name: "choose modern style" }),
    );
    expect(screen.getByTestId("draft-style")).toHaveTextContent(
      "modern-minimal-v1",
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledOnce());

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(screen.getByTestId("draft-style")).toHaveTextContent(
      "modern-minimal-v1",
    );
    expect(mocks.publish).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave(
        editorState({ revision: 2, stylePreset: "modern-minimal-v1" }),
      );
      await savePromise;
    });

    await waitFor(() =>
      expect(mocks.publish).toHaveBeenCalledWith({ revision: 2 }),
    );
    expect(screen.getByTestId("draft-style")).toHaveTextContent(
      "modern-minimal-v1",
    );
  });

  it("publishes the current snapshot before making the website public after confirmation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<PublicSiteEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Publish website" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Publish your website?",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Your studio website will become publicly available to anyone. Future edits use Publish changes.",
    );
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "cancel" }),
      ).toHaveFocus(),
    );
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.publishStudio).not.toHaveBeenCalled();
    expect(mocks.notifyPublished).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Publish website" }),
    );

    await waitFor(() =>
      expect(mocks.publish).toHaveBeenCalledWith({ revision: 1 }),
    );
    await waitFor(() => expect(mocks.publishStudio).toHaveBeenCalledWith(1));
    expect(mocks.publish.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.publishStudio.mock.invocationCallOrder[0],
    );
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mocks.notifyPublished).toHaveBeenCalledExactlyOnceWith(
      "studio-olivka",
    );
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it.each(["cancel", "Escape"])(
    "dismisses the launch modal with %s without saving or publishing",
    async (dismissal) => {
      render(<PublicSiteEditorPage />);
      fireEvent.click(screen.getByRole("button", { name: "edit draft" }));
      const launchButton = screen.getByRole("button", {
        name: "Publish website",
      });
      launchButton.focus();
      fireEvent.click(launchButton);

      const dialog = await screen.findByRole("dialog", {
        name: "Publish your website?",
      });
      const cancelButton = within(dialog).getByRole("button", {
        name: "cancel",
      });
      await waitFor(() => expect(cancelButton).toHaveFocus());

      if (dismissal === "cancel") {
        fireEvent.click(cancelButton);
      } else {
        fireEvent.keyDown(cancelButton, { key: "Escape" });
      }

      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      await waitFor(() => expect(launchButton).toHaveFocus());
      expect(mocks.saveDraft).not.toHaveBeenCalled();
      expect(mocks.publish).not.toHaveBeenCalled();
      expect(mocks.publishStudio).not.toHaveBeenCalled();
      expect(mocks.refetchSetup).not.toHaveBeenCalled();
      expect(mocks.notifyPublished).not.toHaveBeenCalled();
      expect(screen.getByTestId("draft-name")).toHaveTextContent(
        "Studio first edit",
      );
    },
  );

  it("keeps launch busy through saving, publication, and refreshes without duplicate requests", async () => {
    const save = deferred();
    const snapshot = deferred();
    const setup = deferred();
    const launch = deferred();
    const editor = deferred();
    const preview = deferred();
    mocks.saveDraft.mockReturnValue({ unwrap: () => save.promise });
    mocks.publish.mockReturnValue({ unwrap: () => snapshot.promise });
    mocks.refetchSetup.mockReturnValueOnce({ unwrap: () => setup.promise });
    mocks.publishStudio.mockReturnValue({ unwrap: () => launch.promise });
    mocks.refetchEditor.mockReturnValue({ unwrap: () => editor.promise });
    mocks.previewResult.refetch.mockReturnValue(preview.promise);
    render(<PublicSiteEditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "edit draft" }));
    fireEvent.click(
      screen.getByRole("button", { name: "choose modern style" }),
    );
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByTestId("draft-style")).toHaveTextContent(
      "classic-editorial-v1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish website" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Publish your website?",
    });

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.getByTestId("draft-name")).toHaveTextContent(
      "Studio first edit",
    );
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(screen.getByTestId("draft-style")).toHaveTextContent(
      "classic-editorial-v1",
    );

    const confirmButton = within(dialog).getByRole("button", {
      name: "Publish website",
    });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    const expectBusy = () => {
      const busyButton = within(dialog).getByRole("button", {
        name: "Publishing website…",
      });
      expect(busyButton).toBeDisabled();
      const cancelButton = within(dialog).getByRole("button", {
        name: "cancel",
      });
      expect(cancelButton).toBeDisabled();
      fireEvent.click(busyButton);
      fireEvent.click(cancelButton);
      fireEvent.keyDown(dialog, { key: "Escape" });
      expect(dialog).toBeInTheDocument();
    };
    expectBusy();
    expect(mocks.saveDraft).toHaveBeenCalledOnce();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.publishStudio).not.toHaveBeenCalled();

    const savedState = editorState({
      revision: 7,
      hasChanges: true,
      displayName: "Studio first edit",
    });
    await act(async () => save.resolve(savedState));
    expect(mocks.publish).toHaveBeenCalledExactlyOnceWith({ revision: 7 });
    expectBusy();

    await act(async () => snapshot.resolve(savedState));
    expect(mocks.refetchSetup).toHaveBeenCalledOnce();
    expect(mocks.publishStudio).not.toHaveBeenCalled();
    expectBusy();

    await act(async () => setup.resolve({ definitionVersion: 3 }));
    expect(mocks.publishStudio).toHaveBeenCalledExactlyOnceWith(3);
    expectBusy();

    await act(async () => launch.resolve({}));
    expect(mocks.refetchEditor).toHaveBeenCalledOnce();
    expectBusy();

    await act(async () => editor.resolve(savedState));
    expect(mocks.previewResult.refetch).toHaveBeenCalledOnce();
    expect(mocks.refetchVersions).toHaveBeenCalledOnce();
    expect(mocks.refetchSetup).toHaveBeenCalledTimes(2);
    expectBusy();

    await act(async () => preview.resolve({}));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mocks.saveDraft).toHaveBeenCalledOnce();
    expect(mocks.saveDraft).toHaveBeenCalledWith({
      revision: 1,
      patch: expect.objectContaining({
        branding: expect.objectContaining({ displayName: "Studio first edit" }),
      }),
    });
    expect(mocks.publish).toHaveBeenCalledOnce();
    expect(mocks.publishStudio).toHaveBeenCalledOnce();
  });

  it.each(["publish", "publishStudio"])(
    "shows a %s failure inside the launch modal and allows a successful retry",
    async (failingMutation) => {
      mocks[failingMutation].mockReturnValueOnce({
        unwrap: () => Promise.reject({ status: 500 }),
      });
      render(<PublicSiteEditorPage />);
      fireEvent.click(screen.getByRole("button", { name: "Publish website" }));
      const dialog = await screen.findByRole("dialog", {
        name: "Publish your website?",
      });
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Publish website" }),
      );

      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        "messages.publishError",
      );
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByRole("button", { name: "cancel" }),
      ).toBeEnabled();
      const retryButton = within(dialog).getByRole("button", {
        name: "Publish website",
      });
      expect(retryButton).toBeEnabled();
      expect(mocks.publishStudio).toHaveBeenCalledTimes(
        failingMutation === "publish" ? 0 : 1,
      );
      expect(mocks.notifyPublished).not.toHaveBeenCalled();

      fireEvent.click(retryButton);

      await waitFor(() => expect(dialog).not.toBeInTheDocument());
      expect(mocks[failingMutation]).toHaveBeenCalledTimes(2);
      expect(mocks.publish).toHaveBeenCalledTimes(2);
      expect(mocks.publishStudio).toHaveBeenCalled();
      expect(mocks.notifyPublished).toHaveBeenCalledExactlyOnceWith(
        "studio-olivka",
      );
    },
  );

  it("disables both publish actions while the draft has an invalid colour", () => {
    render(<PublicSiteEditorPage />);

    expect(
      screen.getByRole("button", { name: "Publish website" }),
    ).toBeEnabled();

    act(() => {
      mocks.latestOnChange("branding.accentColor", "not-a-color");
    });

    expect(
      screen.getByRole("button", { name: "Publish changes" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Publish website" }),
    ).toBeDisabled();
  });

  it("allows the first publish and stays disabled after it succeeds", async () => {
    render(<PublicSiteEditorPage />);
    const publishButton = screen.getByRole("button", {
      name: "Publish changes",
    });
    expect(publishButton).toBeEnabled();

    fireEvent.click(publishButton);
    fireEvent.click(screen.getByRole("button", { name: "Publish changes" }));

    await waitFor(() => expect(mocks.publish).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Publish changes" }),
      ).toBeDisabled(),
    );
  });
});
