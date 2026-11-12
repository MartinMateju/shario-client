import { describe, expect, it, vi } from "vitest";

import {
  getSubscriptionBillingPathForPathname,
  prepareApiHeaders,
  createBaseQueryWithReauth,
} from "@/lib/features/api/apiSlice";
import {
  buildCustomerLoginRequest,
  buildLoginRequest,
  buildRegisterTenantRequest,
  buildRequestCustomerEmailVerificationRequest,
  buildResendCustomerEmailVerificationRequest,
} from "@/lib/features/auth/authApiSlice";

describe("authentication request contracts", () => {
  it.each([
    "getPublicConciergeConfig",
    "sendPublicConciergeMessage",
    "getPublicCourseLocations",
    "guestCheckout",
    "quoteGuestCourseVoucher",
    "getGuestCheckoutOrderStatus",
    "previewTeamInvitation",
    "acceptTeamInvitation",
  ])("never sends a bearer token for %s", (endpoint) => {
    const headers = new Headers({ authorization: "Bearer stale-token" });

    prepareApiHeaders(headers, {
      endpoint,
      getState: () => ({ auth: { token: "private-token" } }),
    });

    expect(headers.has("authorization")).toBe(false);
  });

  it.each([
    "guestCheckout",
    "quoteGuestCourseVoucher",
    "getGuestCheckoutOrderStatus",
    "previewTeamInvitation",
    "acceptTeamInvitation",
  ])(
    "does not refresh, replay or wait for a signed-in session when %s rejects anonymous access",
    async (endpoint) => {
      const rejection = {
        error: { status: 401, data: { code: "GUEST_CHECKOUT_ACCESS_INVALID" } },
      };
      const executeBaseQuery = vi.fn().mockResolvedValue(rejection);
      const authMutex = {
        waitForUnlock: vi.fn(),
        acquire: vi.fn(),
        isLocked: vi.fn(),
      };
      const dispatch = vi.fn();
      const query = createBaseQueryWithReauth({
        executeBaseQuery,
        authMutex,
        getCurrentAuthContext: () => "workspace",
      });
      const args = {
        url: "/public/tenants/klei/checkout/guest",
        method: "POST",
      };
      const result = await query(
        args,
        {
          endpoint,
          dispatch,
          getState: () => ({ auth: { token: "private-token" } }),
        },
        {},
      );
      expect(result).toBe(rejection);
      expect(executeBaseQuery).toHaveBeenCalledTimes(1);
      expect(authMutex.waitForUnlock).not.toHaveBeenCalled();
      expect(authMutex.acquire).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("keeps the customer concierge authenticated", () => {
    const headers = new Headers();

    prepareApiHeaders(headers, {
      endpoint: "sendCustomerConciergeMessage",
      getState: () => ({ auth: { token: "customer-token" } }),
    });

    expect(headers.get("authorization")).toBe("Bearer customer-token");
  });

  it.each([
    ["/fr/app", "/fr/app/settings/billing"],
    ["/pt_PT/app", "/pt-PT/app/settings/billing"],
    ["/sv/app", "/sv/app/settings/billing"],
    ["/no-NO/app", "/nb/app/settings/billing"],
    ["/fi-FI/app", "/fi/app/settings/billing"],
    ["/hu/app", "/hu/app/settings/billing"],
    ["/el-GR/app", "/el/app/settings/billing"],
    ["/tr_TR/app", "/tr/app/settings/billing"],
    ["/nl-NL/app", "/nl/app/settings/billing"],
    ["/ro_RO/app", "/ro/app/settings/billing"],
    ["/pt-BR/app", "/en/app/settings/billing"],
  ])("builds the subscription redirect for %s", (pathname, expected) => {
    expect(getSubscriptionBillingPathForPathname(pathname)).toBe(expected);
  });

  it("sends only the generic login schema fields and lets the server select the audience", () => {
    expect(
      buildLoginRequest({
        tenantSlug: "studio-olivie",
        email: "owner@example.test",
        password: "secret",
        authContext: "workspace",
      }),
    ).toEqual({
      url: "/auth",
      method: "POST",
      body: {
        tenantSlug: "studio-olivie",
        email: "owner@example.test",
        password: "secret",
      },
    });
  });

  it("sends the strict customer login schema without an authContext field", () => {
    const request = buildCustomerLoginRequest({
      tenantSlug: "studio-olivie",
      email: "owner@example.test",
      password: "secret",
      authContext: "customer",
      workspaceAccess: { role: "owner" },
    });

    expect(request).toEqual({
      url: "/auth/customer",
      method: "POST",
      body: {
        tenantSlug: "studio-olivie",
        email: "owner@example.test",
        password: "secret",
      },
    });
    expect(request.body).not.toHaveProperty("authContext");
  });

  it("strips authContext from strict tenant registration bodies", () => {
    const request = buildRegisterTenantRequest({
      tenantSlug: "studio-olivie",
      email: "owner@example.test",
      password: "secret",
      firstname: "Ada",
      lastname: "Lovelace",
      authContext: "workspace",
    });

    expect(request).toEqual({
      url: "/auth/tenant/register",
      method: "POST",
      body: {
        tenantSlug: "studio-olivie",
        email: "owner@example.test",
        password: "secret",
        firstname: "Ada",
        lastname: "Lovelace",
      },
    });
    expect(request.body).not.toHaveProperty("authContext");
  });

  it.each([
    ["pt_PT", "pt-PT"],
    ["sv-SE", "sv"],
    ["no_NO", "nb"],
    ["fi-FI", "fi"],
    ["hu-HU", "hu"],
    ["el_GR", "el"],
    ["tr-TR", "tr"],
    ["nl_NL", "nl"],
    ["ro-RO", "ro"],
  ])(
    "sends canonical preview locale %s for customer verification emails",
    (locale, expectedLocale) => {
      for (const [buildRequest, action] of [
        [buildRequestCustomerEmailVerificationRequest, "request"],
        [buildResendCustomerEmailVerificationRequest, "resend"],
      ]) {
        expect(
          buildRequest({
            tenantSlug: "studio-olivie",
            email: "maker@example.test",
            next: "/courses/wheel",
            locale,
          }),
        ).toEqual({
          url: `/auth/customer/email-verification/${action}`,
          method: "POST",
          body: {
            tenantSlug: "studio-olivie",
            email: "maker@example.test",
            next: "/courses/wheel",
            locale: expectedLocale,
          },
        });
      }
    },
  );

  it.each(["ja-JP", "pt-BR", undefined])(
    "omits non-live verification locale %s from the optional API field",
    (locale) => {
      const request = buildRequestCustomerEmailVerificationRequest({
        tenantSlug: "studio-olivie",
        email: "maker@example.test",
        locale,
      });

      expect(request.body).not.toHaveProperty("locale");
    },
  );
});
