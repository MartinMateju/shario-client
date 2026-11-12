import { apiSlice } from "@/lib/features/api/apiSlice";

const PUBLIC_SITE_URL = "/tenants/current/settings/public-site";

export const publicSiteApiRoutes = Object.freeze({
  settings: PUBLIC_SITE_URL,
  preview: `${PUBLIC_SITE_URL}/preview`,
  versions: `${PUBLIC_SITE_URL}/versions`,
  restoreVersion: (versionId) =>
    `${PUBLIC_SITE_URL}/versions/${encodeURIComponent(versionId)}/restore`,
  publish: `${PUBLIC_SITE_URL}/publish`,
  resetDraft: `${PUBLIC_SITE_URL}/reset-draft`,
  media: (slot) => `${PUBLIC_SITE_URL}/media/${encodeURIComponent(slot)}`,
});

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

export const normalizePublicSiteEditorResponse = (response) => {
  const root = asObject(response);
  const draft = asObject(
    root.draft ??
      root.publicSite ??
      root.tenant?.publicSite ??
      root.preview?.publicSite,
  );
  const published = asObject(root.published);
  const editor = asObject(root.editor);

  return {
    ...root,
    draft,
    publicSite: draft,
    published,
    editor: {
      draftRevision: Number(editor.draftRevision ?? 0),
      publishedRevision: Number(editor.publishedRevision ?? 0),
      hasUnpublishedChanges:
        editor.hasUnpublishedChanges ??
        Number(editor.draftRevision ?? 0) !==
          Number(editor.publishedRevision ?? 0),
      draftUpdatedAt: editor.draftUpdatedAt ?? null,
      publishedAt: editor.publishedAt ?? null,
      publicationStatus:
        root.preview?.publicationStatus ??
        editor.publicationStatus ??
        (editor.publishedAt ? "published" : "not_published"),
      publiclyAvailable: root.preview?.publiclyAvailable ?? null,
      hasExplicitPublicationState:
        root.preview?.hasExplicitPublicationState ?? null,
      publishAction:
        root.preview?.publishAction ?? editor.publishAction ?? null,
    },
  };
};

export const buildPublicSiteMediaRequest = ({
  slot,
  file,
  revision,
  locationId,
}) => {
  const body = new FormData();
  body.append("image", file);
  if (Number.isInteger(revision)) {
    body.append("revision", String(revision));
  }
  if (locationId) body.append("locationId", locationId);

  return {
    url: publicSiteApiRoutes.media(slot),
    method: "POST",
    body,
  };
};

export const publicSiteApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPublicSiteEditor: builder.query({
      query: () => publicSiteApiRoutes.settings,
      transformResponse: normalizePublicSiteEditorResponse,
      providesTags: [{ type: "PublicSite", id: "EDITOR" }],
    }),
    getPublicSitePreview: builder.query({
      query: () => publicSiteApiRoutes.preview,
      transformResponse: normalizePublicSiteEditorResponse,
      providesTags: [{ type: "PublicSite", id: "PREVIEW" }],
    }),
    getPublicSiteVersions: builder.query({
      query: () => publicSiteApiRoutes.versions,
      transformResponse: (response) => ({
        versions: Array.isArray(response?.versions) ? response.versions : [],
      }),
      providesTags: [{ type: "PublicSite", id: "VERSIONS" }],
    }),
    savePublicSiteDraft: builder.mutation({
      query: ({ patch, revision }) => ({
        url: publicSiteApiRoutes.settings,
        method: "PATCH",
        body: {
          patch,
          ...(Number.isInteger(revision) ? { revision } : {}),
        },
      }),
      transformResponse: normalizePublicSiteEditorResponse,
      invalidatesTags: [
        { type: "PublicSite", id: "EDITOR" },
        { type: "PublicSite", id: "PREVIEW" },
      ],
    }),
    publishPublicSite: builder.mutation({
      query: ({ revision } = {}) => ({
        url: publicSiteApiRoutes.publish,
        method: "POST",
        body: Number.isInteger(revision) ? { revision } : {},
      }),
      transformResponse: normalizePublicSiteEditorResponse,
      invalidatesTags: [
        { type: "PublicSite", id: "EDITOR" },
        { type: "PublicSite", id: "PREVIEW" },
        { type: "PublicSite", id: "VERSIONS" },
        "Tenant",
      ],
    }),
    restorePublicSiteVersion: builder.mutation({
      query: ({ versionId, revision }) => ({
        url: publicSiteApiRoutes.restoreVersion(versionId),
        method: "POST",
        body: { revision },
      }),
      transformResponse: normalizePublicSiteEditorResponse,
      invalidatesTags: [
        { type: "PublicSite", id: "EDITOR" },
        { type: "PublicSite", id: "PREVIEW" },
      ],
    }),
    resetPublicSiteDraft: builder.mutation({
      query: ({ revision } = {}) => ({
        url: publicSiteApiRoutes.resetDraft,
        method: "POST",
        body: Number.isInteger(revision) ? { revision } : {},
      }),
      transformResponse: normalizePublicSiteEditorResponse,
      invalidatesTags: [
        { type: "PublicSite", id: "EDITOR" },
        { type: "PublicSite", id: "PREVIEW" },
      ],
    }),
    uploadPublicSiteMedia: builder.mutation({
      query: buildPublicSiteMediaRequest,
      transformResponse: normalizePublicSiteEditorResponse,
      invalidatesTags: [
        { type: "PublicSite", id: "EDITOR" },
        { type: "PublicSite", id: "PREVIEW" },
      ],
    }),
  }),
});

export const {
  useGetPublicSiteEditorQuery,
  useGetPublicSitePreviewQuery,
  useGetPublicSiteVersionsQuery,
  useSavePublicSiteDraftMutation,
  usePublishPublicSiteMutation,
  useRestorePublicSiteVersionMutation,
  useResetPublicSiteDraftMutation,
  useUploadPublicSiteMediaMutation,
} = publicSiteApiSlice;
