import { apiSlice } from "../api/apiSlice";

export const emailTemplatesApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEmailTemplates: builder.query({
      query: ({
        search = "",
        category = "all",
        active = "all",
        type = "all",
        limit = 100,
      } = {}) => ({
        url: "/email-templates",
        params: {
          search,
          category,
          active,
          type,
          limit,
        },
      }),
      providesTags: (result) =>
        result?.templates
          ? [
              ...result.templates.map(({ _id }) => ({
                type: "EmailTemplates",
                id: _id,
              })),
              { type: "EmailTemplates", id: "LIST" },
            ]
          : [{ type: "EmailTemplates", id: "LIST" }],
    }),

    getEmailTemplateById: builder.query({
      query: (id) => `/email-templates/${id}`,
      providesTags: (result, error, id) => [{ type: "EmailTemplates", id }],
    }),

    createEmailTemplate: builder.mutation({
      query: (body) => ({
        url: "/email-templates",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "EmailTemplates", id: "LIST" }],
    }),

    updateEmailTemplate: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/email-templates/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "EmailTemplates", id },
        { type: "EmailTemplates", id: "LIST" },
      ],
    }),

    deleteEmailTemplate: builder.mutation({
      query: (id) => ({
        url: `/email-templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "EmailTemplates", id: "LIST" }],
    }),

    toggleEmailTemplateActive: builder.mutation({
      query: (id) => ({
        url: `/email-templates/${id}/toggle-active`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "EmailTemplates", id },
        { type: "EmailTemplates", id: "LIST" },
      ],
    }),

    setDefaultEmailTemplate: builder.mutation({
      query: (id) => ({
        url: `/email-templates/${id}/set-default`,
        method: "PATCH",
      }),
      invalidatesTags: [{ type: "EmailTemplates", id: "LIST" }],
    }),
  }),
});

export const {
  useGetEmailTemplatesQuery,
  useGetEmailTemplateByIdQuery,
  useCreateEmailTemplateMutation,
  useUpdateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
  useToggleEmailTemplateActiveMutation,
  useSetDefaultEmailTemplateMutation,
} = emailTemplatesApiSlice;
