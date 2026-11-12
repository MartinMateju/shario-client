import { apiSlice } from "../api/apiSlice";

export const passResetApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    requestPassReset: builder.mutation({
      query: ({ tenantSlug, email, locale }) => ({
        url: "/password-reset/request",
        method: "POST",
        body: { tenantSlug, email, locale },
      }),
    }),
    passReset: builder.mutation({
      query: ({ tenantSlug, resetToken, password }) => ({
        url: "/password-reset/reset",
        method: "POST",
        body: { tenantSlug, resetToken, password },
      }),
    }),
    verifyOtp: builder.mutation({
      query: ({ tenantSlug, email, otp }) => ({
        url: "/password-reset/verify-otp",
        method: "POST",
        body: { tenantSlug, email, otp },
      }),
    }),
  }),
});

export const {
  useRequestPassResetMutation,
  usePassResetMutation,
  useVerifyOtpMutation,
} = passResetApiSlice;
