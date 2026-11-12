import { apiSlice } from "../api/apiSlice";
import { normalizeRolloutEligibleLocaleCode } from "@/i18n/locales";
import {
  AUTH_CONTEXTS,
  isAuthResponseForContext,
  normalizeAuthContext,
} from "./authContext";
import { claimAuthRequest } from "./authSlice";
import {
  completeAuthRequest,
  createAuthRequestSnapshot,
  invalidateAuthRequestIfCurrent,
} from "./authSession";

const SOCIAL_PROVIDERS = new Set(["google", "apple"]);

export const normalizeCustomerSocialProviders = (response) => {
  const payload = response?.data ?? response ?? {};
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.providers)
      ? payload.providers
      : Object.entries(payload.providers ?? payload)
          .filter(
            ([, config]) =>
              config === true ||
              (config &&
                typeof config === "object" &&
                config.available === true),
          )
          .map(([provider]) => provider);

  return [
    ...new Set(
      source
        .map((value) =>
          typeof value === "string"
            ? value
            : value?.enabled === false || value?.available === false
              ? ""
              : (value?.provider ?? value?.id ?? value?.name),
        )
        .map((value) =>
          String(value || "")
            .trim()
            .toLowerCase(),
        )
        .filter((provider) => SOCIAL_PROVIDERS.has(provider)),
    ),
  ];
};

const validateAuthResponse = (response, authContext) => {
  if (!isAuthResponseForContext(response, authContext)) {
    throw new Error(
      `Authentication response does not match the ${authContext} audience.`,
    );
  }

  return response;
};

const validateContextualAuthResponse = (response) => {
  const authContext = normalizeAuthContext(response?.authContext);

  if (!authContext) {
    throw new Error("Authentication response is missing its audience.");
  }

  return validateAuthResponse(response, authContext);
};

const createContextualAuthLifecycle = async (
  _,
  { dispatch, getState, queryFulfilled },
) => {
  dispatch(claimAuthRequest());
  const snapshot = createAuthRequestSnapshot(getState(), null, {
    dynamicAuthContext: true,
  });

  try {
    const { data } = await queryFulfilled;
    const authContext = normalizeAuthContext(data?.authContext);

    completeAuthRequest({
      authContext,
      data,
      dispatch,
      getState,
      snapshot,
    });
  } catch {
    invalidateAuthRequestIfCurrent({
      authContext: null,
      dispatch,
      getState,
      snapshot,
    });
  }
};

const createAuthLifecycle =
  (authContext) =>
  async (_, { dispatch, getState, queryFulfilled }) => {
    dispatch(claimAuthRequest(authContext));
    const snapshot = createAuthRequestSnapshot(getState(), authContext);

    try {
      const { data } = await queryFulfilled;

      completeAuthRequest({
        authContext,
        data,
        dispatch,
        getState,
        snapshot,
      });
    } catch {
      invalidateAuthRequestIfCurrent({
        authContext,
        dispatch,
        getState,
        snapshot,
      });
    }
  };

export const buildLoginRequest = ({ tenantSlug, email, password }) => ({
  url: "/auth",
  method: "POST",
  body: {
    tenantSlug,
    email,
    password,
  },
});

export const buildCustomerLoginRequest = ({ tenantSlug, email, password }) => ({
  url: "/auth/customer",
  method: "POST",
  body: {
    tenantSlug,
    email,
    password,
  },
});

export const buildRegisterTenantRequest = (registrationData = {}) => {
  const body = { ...registrationData };

  delete body.authContext;

  return {
    url: "/auth/tenant/register",
    method: "POST",
    body,
  };
};

const buildCustomerEmailVerificationBody = ({
  tenantSlug,
  email,
  next,
  locale,
} = {}) => {
  const canonicalLocale = normalizeRolloutEligibleLocaleCode(locale);

  return {
    tenantSlug,
    email,
    ...(next ? { next } : {}),
    ...(canonicalLocale ? { locale: canonicalLocale } : {}),
  };
};

export const buildRequestCustomerEmailVerificationRequest = (args) => ({
  url: "/auth/customer/email-verification/request",
  method: "POST",
  body: buildCustomerEmailVerificationBody(args),
});

export const buildResendCustomerEmailVerificationRequest = (args) => ({
  url: "/auth/customer/email-verification/resend",
  method: "POST",
  body: buildCustomerEmailVerificationBody(args),
});

export const authApiSlice = apiSlice.injectEndpoints({
  overrideExisting: process.env.NODE_ENV === "development",

  endpoints: (builder) => ({
    login: builder.mutation({
      query: buildLoginRequest,
      transformResponse: validateContextualAuthResponse,
      onQueryStarted: createContextualAuthLifecycle,
    }),

    customerLogin: builder.mutation({
      query: buildCustomerLoginRequest,
      transformResponse: (response) =>
        validateAuthResponse(response, AUTH_CONTEXTS.CUSTOMER),
      onQueryStarted: createAuthLifecycle(AUTH_CONTEXTS.CUSTOMER),
    }),

    registerTenant: builder.mutation({
      query: buildRegisterTenantRequest,
      transformResponse: (response) =>
        validateAuthResponse(response, AUTH_CONTEXTS.WORKSPACE),
      onQueryStarted: createAuthLifecycle(AUTH_CONTEXTS.WORKSPACE),
    }),

    sendLogout: builder.mutation({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),

    sendCustomerLogout: builder.mutation({
      query: () => ({
        url: "/auth/customer/logout",
        method: "POST",
      }),
    }),

    refresh: builder.mutation({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
      transformResponse: (response) =>
        validateAuthResponse(response, AUTH_CONTEXTS.WORKSPACE),
    }),

    customerRefresh: builder.mutation({
      query: () => ({
        url: "/auth/customer/refresh",
        method: "POST",
      }),
      transformResponse: (response) =>
        validateAuthResponse(response, AUTH_CONTEXTS.CUSTOMER),
    }),

    getCustomerSocialProviders: builder.query({
      query: ({ tenantSlug }) => ({
        url: "/auth/customer/social/providers",
        params: { tenantSlug },
      }),
      transformResponse: normalizeCustomerSocialProviders,
    }),

    requestCustomerEmailVerification: builder.mutation({
      query: buildRequestCustomerEmailVerificationRequest,
    }),

    resendCustomerEmailVerification: builder.mutation({
      query: buildResendCustomerEmailVerificationRequest,
    }),

    verifyCustomerEmail: builder.mutation({
      query: ({ tenantSlug, token }) => ({
        url: "/auth/customer/email-verification/verify",
        method: "POST",
        body: { tenantSlug, token },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useCustomerLoginMutation,
  useRegisterTenantMutation,
  useSendLogoutMutation,
  useSendCustomerLogoutMutation,
  useRefreshMutation,
  useCustomerRefreshMutation,
  useGetCustomerSocialProvidersQuery,
  useRequestCustomerEmailVerificationMutation,
  useResendCustomerEmailVerificationMutation,
  useVerifyCustomerEmailMutation,
} = authApiSlice;
