import { normalizeWorkspaceAccess } from "@/config/permissions";
import { apiSlice } from "@/lib/features/api/apiSlice";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";
import { getCustomerAccountQueryScope } from "./customerAccountScope";
import {
  createAuthRequestSnapshot,
  isAuthRequestBoundaryCurrent,
  isAuthRequestForSamePrincipal,
} from "@/lib/features/auth/authSession";
import {
  setWorkspaceAccess,
  selectCurrentTenant,
  selectCurrentUser,
  updateCurrentTenant,
  updateCurrentUser,
  updateWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

const ACCESS_URL = "/tenants/current/access";
const TEAM_URL = `${ACCESS_URL}/team`;
const ROLES_URL = `${ACCESS_URL}/roles`;
const SETTINGS_URL = "/tenants/current/settings";
const WORKSPACE_CONFIGURATION_URL = `${SETTINGS_URL}/workspace-configuration`;
const ACCOUNT_URL = "/account";

const hasOwn = (value, key) =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

const extractWorkspaceAccess = (response) => {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return null;
  }

  if (hasOwn(response, "workspaceAccess")) {
    return normalizeWorkspaceAccess(response.workspaceAccess);
  }

  if (hasOwn(response, "access")) {
    return normalizeWorkspaceAccess(response.access);
  }

  return normalizeWorkspaceAccess(response);
};

const normalizeCurrentAccessResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  workspaceAccess: extractWorkspaceAccess(response),
});

const normalizeAccessMutationResponse = (response) => {
  const responseObject =
    response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {};
  const hasFullAccess =
    hasOwn(responseObject, "workspaceAccess") ||
    hasOwn(responseObject, "access") ||
    hasOwn(responseObject, "membership") ||
    hasOwn(responseObject, "role") ||
    hasOwn(responseObject, "roleKey") ||
    hasOwn(responseObject, "permissions") ||
    hasOwn(responseObject, "effectivePermissions");

  return {
    ...responseObject,
    ...(hasFullAccess
      ? { workspaceAccess: extractWorkspaceAccess(response) }
      : {}),
  };
};

const toPreferencesWireBody = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const { defaultLocationId, ...body } = value;

  if (body.defaultLocation === undefined && defaultLocationId !== undefined) {
    body.defaultLocation = defaultLocationId;
  }

  return body;
};

const toTeamMemberWireBody = (value) => {
  if (!value || typeof value !== "object") {
    return value;
  }

  const { role, ...body } = value;

  if (body.roleKey === undefined && role !== undefined) {
    body.roleKey = role;
  }

  return body;
};

const normalizeTeamResponse = (response) => {
  const memberships = Array.isArray(response)
    ? response
    : (response?.memberships ?? response?.team ?? response?.items ?? []);

  return {
    ...(response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {}),
    memberships: Array.isArray(memberships) ? memberships : [],
  };
};

const normalizeMembershipResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  membership:
    response?.membership ??
    response?.teamMember ??
    response?.member ??
    response,
  ...(hasOwn(response, "workspaceAccess") || hasOwn(response, "access")
    ? { workspaceAccess: extractWorkspaceAccess(response) }
    : {}),
});

const normalizePermissionCatalogResponse = (response) => {
  const permissions = Array.isArray(response)
    ? response
    : (response?.permissions ?? response?.catalog ?? response?.items ?? []);

  return {
    ...(response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {}),
    permissions: Array.isArray(permissions) ? permissions : [],
  };
};

const isBuiltInRole = (role) =>
  role?.isBuiltIn === true ||
  role?.builtIn === true ||
  role?.type === "built_in";

const normalizeRolesResponse = (response) => {
  const directRoles = Array.isArray(response)
    ? response
    : Array.isArray(response?.roles)
      ? response.roles
      : [];
  const builtInRoles = Array.isArray(response?.builtInRoles)
    ? response.builtInRoles
    : directRoles.filter(isBuiltInRole);
  const customRoles = Array.isArray(response?.customRoles)
    ? response.customRoles
    : directRoles.filter((role) => !isBuiltInRole(role));
  const roles = directRoles.length
    ? directRoles
    : [...builtInRoles, ...customRoles];

  return {
    ...(response && typeof response === "object" && !Array.isArray(response)
      ? response
      : {}),
    builtInRoles,
    customRoles,
    roles,
  };
};

const normalizeRoleResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  role: response?.role ?? response,
});

const normalizeSettingsResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  settings: response?.settings ?? response?.tenant?.settings ?? response,
});

const unwrapData = (response) =>
  response?.configuration ??
  response?.data?.configuration ??
  response?.data ??
  response ??
  {};

const normalizeNavigationPreferences = (value) => ({
  hiddenGroups: Array.isArray(value?.hiddenGroups)
    ? [...new Set(value.hiddenGroups.filter(Boolean).map(String))]
    : [],
  hiddenItems: Array.isArray(value?.hiddenItems)
    ? [...new Set(value.hiddenItems.filter(Boolean).map(String))]
    : [],
});

export const normalizeWorkspaceConfigurationResponse = (response) => {
  const source = unwrapData(response);
  const modules =
    source?.modules && typeof source.modules === "object" ? source.modules : {};
  const effectiveModules =
    source?.effectiveModules && typeof source.effectiveModules === "object"
      ? source.effectiveModules
      : Object.fromEntries(
          Object.entries(modules).map(([key, module]) => [
            key,
            module?.enabled ?? module?.selected ?? false,
          ]),
        );

  return {
    ...source,
    definitionVersion: Number(source?.definitionVersion ?? 1),
    modules,
    effectiveModules,
    navigation: normalizeNavigationPreferences(source?.navigation),
  };
};

const normalizeAccountResponse = (response) => ({
  ...(response && typeof response === "object" && !Array.isArray(response)
    ? response
    : {}),
  account: response?.account ?? response?.user ?? response,
});

const getEntityId = (value) =>
  value?._id ?? value?.id ?? value?.membershipId ?? value?.roleId ?? null;

const provideTeamTags = (result) => [
  { type: "WorkspaceTeam", id: "LIST" },
  ...(result?.memberships ?? [])
    .map(getEntityId)
    .filter(Boolean)
    .map((id) => ({ type: "WorkspaceTeam", id: String(id) })),
];

const provideRoleTags = (result) => [
  { type: "WorkspaceRole", id: "LIST" },
  ...(result?.roles ?? [])
    .map(getEntityId)
    .filter(Boolean)
    .map((id) => ({ type: "WorkspaceRole", id: String(id) })),
];

const storeWorkspaceAccess = async (queryFulfilled, dispatch) => {
  const { data } = await queryFulfilled;

  if (hasOwn(data, "workspaceAccess")) {
    dispatch(setWorkspaceAccess(data.workspaceAccess));
  }

  return data;
};

const storeWorkspaceConfiguration = async (queryFulfilled, dispatch) => {
  const { data } = await queryFulfilled;

  dispatch(
    updateCurrentTenant(
      data?.tenant ?? {
        modules: data?.effectiveModules ?? {},
        settings: {
          navigation: normalizeNavigationPreferences(data?.navigation),
        },
      },
    ),
  );

  return data;
};

export const workspaceAccessApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentWorkspaceAccess: builder.query({
      query: () => `${ACCESS_URL}/me`,
      transformResponse: normalizeCurrentAccessResponse,
      providesTags: [{ type: "WorkspaceAccess", id: "CURRENT" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await storeWorkspaceAccess(queryFulfilled, dispatch);
        } catch {
          // RTK Query exposes the request error to the caller.
        }
      },
    }),

    updateWorkspacePreferences: builder.mutation({
      query: (body) => ({
        url: `${ACCESS_URL}/me/preferences`,
        method: "PATCH",
        body: toPreferencesWireBody(body),
      }),
      transformResponse: normalizeAccessMutationResponse,
      invalidatesTags: [{ type: "WorkspaceAccess", id: "CURRENT" }],
      async onQueryStarted(body, { dispatch, queryFulfilled }) {
        try {
          const data = await storeWorkspaceAccess(queryFulfilled, dispatch);

          if (
            !hasOwn(data, "workspaceAccess") &&
            body &&
            typeof body === "object"
          ) {
            dispatch(
              updateWorkspaceAccess({
                preferences: toPreferencesWireBody(body),
              }),
            );
          }
        } catch {
          // RTK Query exposes the request error to the caller.
        }
      },
    }),

    getWorkspaceTeam: builder.query({
      query: (params) => ({
        url: TEAM_URL,
        params,
      }),
      transformResponse: normalizeTeamResponse,
      providesTags: provideTeamTags,
    }),

    addWorkspaceTeamMember: builder.mutation({
      query: (body) => ({
        url: TEAM_URL,
        method: "POST",
        body: toTeamMemberWireBody(body),
      }),
      transformResponse: normalizeMembershipResponse,
      invalidatesTags: [{ type: "WorkspaceTeam", id: "LIST" }, "SetupCenter"],
    }),

    updateWorkspaceTeamMember: builder.mutation({
      query: ({ membershipId, id, ...body }) => ({
        url: `${TEAM_URL}/${membershipId ?? id}`,
        method: "PATCH",
        body: toTeamMemberWireBody(body),
      }),
      transformResponse: normalizeMembershipResponse,
      invalidatesTags: (_result, _error, { membershipId, id }) => [
        { type: "WorkspaceTeam", id: "LIST" },
        { type: "WorkspaceTeam", id: String(membershipId ?? id) },
        { type: "WorkspaceAccess", id: "CURRENT" },
        "SetupCenter",
      ],
    }),

    deleteWorkspaceTeamMember: builder.mutation({
      query: (membershipIdOrInput) => ({
        url: `${TEAM_URL}/${
          typeof membershipIdOrInput === "object"
            ? (membershipIdOrInput.membershipId ?? membershipIdOrInput.id)
            : membershipIdOrInput
        }`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, membershipIdOrInput) => [
        { type: "WorkspaceTeam", id: "LIST" },
        {
          type: "WorkspaceTeam",
          id: String(
            typeof membershipIdOrInput === "object"
              ? (membershipIdOrInput.membershipId ?? membershipIdOrInput.id)
              : membershipIdOrInput,
          ),
        },
        "SetupCenter",
      ],
    }),

    getPermissionCatalog: builder.query({
      query: () => `${ACCESS_URL}/permissions`,
      transformResponse: normalizePermissionCatalogResponse,
      providesTags: [{ type: "WorkspaceRole", id: "PERMISSIONS" }],
    }),

    getWorkspaceRoles: builder.query({
      query: () => ROLES_URL,
      transformResponse: normalizeRolesResponse,
      providesTags: provideRoleTags,
    }),

    createWorkspaceRole: builder.mutation({
      query: (body) => ({
        url: ROLES_URL,
        method: "POST",
        body,
      }),
      transformResponse: normalizeRoleResponse,
      invalidatesTags: [{ type: "WorkspaceRole", id: "LIST" }],
    }),

    updateWorkspaceRole: builder.mutation({
      query: ({ roleId, id, ...body }) => ({
        url: `${ROLES_URL}/${roleId ?? id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: normalizeRoleResponse,
      invalidatesTags: (_result, _error, { roleId, id }) => [
        { type: "WorkspaceRole", id: "LIST" },
        { type: "WorkspaceRole", id: String(roleId ?? id) },
        { type: "WorkspaceAccess", id: "CURRENT" },
      ],
    }),

    deleteWorkspaceRole: builder.mutation({
      query: (roleIdOrInput) => ({
        url: `${ROLES_URL}/${
          typeof roleIdOrInput === "object"
            ? (roleIdOrInput.roleId ?? roleIdOrInput.id)
            : roleIdOrInput
        }`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, roleIdOrInput) => [
        { type: "WorkspaceRole", id: "LIST" },
        {
          type: "WorkspaceRole",
          id: String(
            typeof roleIdOrInput === "object"
              ? (roleIdOrInput.roleId ?? roleIdOrInput.id)
              : roleIdOrInput,
          ),
        },
      ],
    }),

    getWorkspaceSettings: builder.query({
      query: () => SETTINGS_URL,
      transformResponse: normalizeSettingsResponse,
      providesTags: [{ type: "WorkspaceSettings", id: "CURRENT" }],
    }),

    updateWorkspaceSettings: builder.mutation({
      query: (body) => ({
        url: SETTINGS_URL,
        method: "PATCH",
        body,
      }),
      transformResponse: normalizeSettingsResponse,
      invalidatesTags: [
        { type: "WorkspaceSettings", id: "CURRENT" },
        "Tenant",
        "SetupCenter",
      ],
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const workspaceSettings = data?.settings;
          const tenantUpdate =
            data?.tenant ??
            (workspaceSettings
              ? {
                  name: workspaceSettings.name,
                  status: workspaceSettings.status,
                  plan: workspaceSettings.plan,
                  planVersion: workspaceSettings.planVersion,
                  domains: workspaceSettings.domains,
                  modules: workspaceSettings.modules,
                  limits: workspaceSettings.limits,
                  settings: {
                    defaultLanguage: workspaceSettings.defaultLanguage,
                    adminLanguage: workspaceSettings.adminLanguage,
                    publicDefaultLanguage:
                      workspaceSettings.publicDefaultLanguage,
                    supportedPublicLanguages: Array.isArray(
                      workspaceSettings.supportedPublicLanguages,
                    )
                      ? [...workspaceSettings.supportedPublicLanguages]
                      : undefined,
                    currency: workspaceSettings.currency,
                    timezone: workspaceSettings.timezone,
                    ...(workspaceSettings.navigation !== undefined
                      ? {
                          navigation: normalizeNavigationPreferences(
                            workspaceSettings.navigation,
                          ),
                        }
                      : {}),
                  },
                }
              : null);

          if (tenantUpdate) {
            dispatch(updateCurrentTenant(tenantUpdate));
          }
        } catch {
          // RTK Query exposes the request error to the caller.
        }
      },
    }),

    getWorkspaceConfiguration: builder.query({
      query: () => WORKSPACE_CONFIGURATION_URL,
      transformResponse: normalizeWorkspaceConfigurationResponse,
      providesTags: [{ type: "WorkspaceSettings", id: "CONFIGURATION" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await storeWorkspaceConfiguration(queryFulfilled, dispatch);
        } catch {
          // RTK Query exposes the request error to the caller.
        }
      },
    }),

    updateWorkspaceConfiguration: builder.mutation({
      query: (body) => ({
        url: WORKSPACE_CONFIGURATION_URL,
        method: "PATCH",
        body,
      }),
      transformResponse: normalizeWorkspaceConfigurationResponse,
      invalidatesTags: [
        { type: "WorkspaceSettings", id: "CONFIGURATION" },
        "Tenant",
        "Location",
        "SetupCenter",
        "DashboardOverview",
      ],
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          await storeWorkspaceConfiguration(queryFulfilled, dispatch);
        } catch {
          // RTK Query exposes the request error to the caller.
        }
      },
    }),

    getAccount: builder.query({
      query: () => ACCOUNT_URL,
      transformResponse: normalizeAccountResponse,
      providesTags: [{ type: "Account", id: "CURRENT" }],
    }),

    updateAccountProfile: builder.mutation({
      query: (body) => ({
        url: `${ACCOUNT_URL}/profile`,
        method: "PATCH",
        body,
      }),
      transformResponse: normalizeAccountResponse,
      invalidatesTags: [
        { type: "Account", id: "CURRENT" },
        { type: "User", id: "CURRENT" },
      ],
      async onQueryStarted(_body, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;

          if (data?.account) {
            dispatch(updateCurrentUser(data.account));
          }
        } catch {
          // RTK Query exposes the request error to the caller.
        }
      },
    }),

    updateAccountPassword: builder.mutation({
      query: (body) => ({
        url: `${ACCOUNT_URL}/password`,
        method: "PATCH",
        body,
      }),
    }),

    updateCustomerPreferences: builder.mutation({
      query: ({ defaultLanguage, portalAppearance }) => ({
        url: `${ACCOUNT_URL}/customer-preferences`,
        method: "PATCH",
        body: {
          ...(defaultLanguage !== undefined ? { defaultLanguage } : {}),
          ...(portalAppearance !== undefined ? { portalAppearance } : {}),
        },
      }),
      transformResponse: normalizeAccountResponse,
      invalidatesTags: [
        { type: "Account", id: "CURRENT" },
        { type: "User", id: "CURRENT" },
      ],
      async onQueryStarted(_body, { dispatch, getState, queryFulfilled }) {
        const initialState = getState();
        const accountScope = getCustomerAccountQueryScope(
          selectCurrentUser(initialState),
          selectCurrentTenant(initialState),
        );
        const snapshot = createAuthRequestSnapshot(
          initialState,
          AUTH_CONTEXTS.CUSTOMER,
        );
        try {
          const { data } = await queryFulfilled;
          const state = getState();
          if (
            data?.account &&
            accountScope.customerId &&
            accountScope.tenantId &&
            String(data.account.id || data.account._id || "") ===
              accountScope.customerId &&
            isAuthRequestBoundaryCurrent(state, snapshot) &&
            isAuthRequestForSamePrincipal(state, snapshot)
          ) {
            // Apply the confirmed response before the invalidated GET finishes,
            // so saving/resetting colours does not depend on a second request.
            dispatch(
              apiSlice.util.updateQueryData(
                "getAccount",
                accountScope,
                (cached) => {
                  if (
                    String(cached.account?.id || cached.account?._id || "") ===
                    accountScope.customerId
                  ) {
                    cached.account = { ...cached.account, ...data.account };
                  }
                },
              ),
            );
            dispatch(updateCurrentUser(data.account));
          }
        } catch {
          // The form displays the request error without changing the saved preference.
        }
      },
    }),
  }),
});

export const {
  useGetCurrentWorkspaceAccessQuery,
  useUpdateWorkspacePreferencesMutation,
  useGetWorkspaceTeamQuery,
  useAddWorkspaceTeamMemberMutation,
  useUpdateWorkspaceTeamMemberMutation,
  useDeleteWorkspaceTeamMemberMutation,
  useGetPermissionCatalogQuery,
  useGetWorkspaceRolesQuery,
  useCreateWorkspaceRoleMutation,
  useUpdateWorkspaceRoleMutation,
  useDeleteWorkspaceRoleMutation,
  useGetWorkspaceSettingsQuery,
  useUpdateWorkspaceSettingsMutation,
  useGetWorkspaceConfigurationQuery,
  useUpdateWorkspaceConfigurationMutation,
  useGetAccountQuery,
  useUpdateAccountProfileMutation,
  useUpdateAccountPasswordMutation,
  useUpdateCustomerPreferencesMutation,
} = workspaceAccessApiSlice;
