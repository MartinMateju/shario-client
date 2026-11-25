import { describe, expect, it } from "vitest";

import {
  getFirstPartyAuthRequest,
  needsFirstPartyAuthTransport,
} from "@/lib/features/auth/firstPartyAuthTransport";

const customLocation = {
  hostname: "booking.commonground.example",
  rootHostname: "shario.io",
};

describe("first-party custom-domain session transport", () => {
  it.each([
    "/auth",
    "/auth/customer",
    "/auth/customer/login",
    "/auth/register",
    "/auth/logout",
    "/auth/customer/logout",
    "/auth/refresh",
    "/auth/customer/refresh",
    "/auth/session-handoff",
    "/auth/customer/session-handoff",
  ])("keeps %s on the custom origin", (url) => {
    const body = { tenantSlug: "common-ground" };
    expect(
      getFirstPartyAuthRequest({ url, method: "POST", body }, customLocation),
    ).toEqual({
      url: `/api/tenant-auth${url}`,
      method: "POST",
      body,
      credentials: "same-origin",
    });
  });

  it.each(["/users/pass", "/account/password"])(
    "clears first-party cookies after %s",
    (url) => {
      expect(
        getFirstPartyAuthRequest({ url, method: "PATCH" }, customLocation)?.url,
      ).toBe(`/api/tenant-auth${url}`);
    },
  );

  it.each([
    "shario.io",
    "common-ground.shario.io",
    "admin.shario.io",
    "localhost",
    "studio.shario.localhost",
  ])("preserves the existing transport on %s", (hostname) => {
    expect(
      getFirstPartyAuthRequest(
        { url: "/auth/customer/refresh", method: "POST" },
        {
          hostname,
          rootHostname: "shario.io",
        },
      ),
    ).toBeNull();
  });

  it.each([
    { url: "/public/tenants/common-ground/products", method: "GET" },
    { url: "/bookings", method: "POST" },
    { url: "/auth/customer/social/google/start", method: "GET" },
    { url: "/auth/customer/refresh", method: "GET" },
    { url: "https://attacker.example/auth/customer/refresh", method: "POST" },
    { url: "//attacker.example/auth", method: "POST" },
  ])("does not turn unrelated requests into an open proxy: $url", (request) => {
    expect(getFirstPartyAuthRequest(request, customLocation)).toBeNull();
  });

  it("does not mistake a root-domain suffix attack for a first-party host", () => {
    expect(
      needsFirstPartyAuthTransport({
        hostname: "shario.io.attacker.example",
        rootHostname: "shario.io",
      }),
    ).toBe(true);
    expect(
      needsFirstPartyAuthTransport({
        hostname: "not-shario.io",
        rootHostname: "shario.io",
      }),
    ).toBe(true);
  });
});
