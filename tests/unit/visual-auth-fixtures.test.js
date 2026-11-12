import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  ADMIN_OVERVIEW_SCENARIOS,
  installAdminApiMocks,
  responseForRequest,
} from "../../e2e/visual/admin-fixtures";
import { isExpectedAnonymousRefreshConsoleError } from "../../e2e/visual/platform-auth.console";
import { installLaunchAppMocks } from "../../e2e/helpers/launch-center";
import { getLaunchReadinessItems } from "@/components/setup-center/setupCenter.utils";
import { resolveWorkspaceRouteLocale } from "@/components/views/settings/workspaceLocaleSettings";
import {
  AUTH_CONTEXTS,
  isAuthResponseForContext,
} from "@/lib/features/auth/authContext";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("visual authentication fixtures", () => {
  it("provides an empty pending invitation list without accepting invitation mutations", () => {
    const url = new URL(
      "http://api.shario.localhost:4001/tenants/current/access/invitations",
    );
    expect(responseForRequest({ method: "GET", url })).toEqual({
      invitations: [],
    });
    expect(responseForRequest({ method: "POST", url })).toBeNull();
  });
  it.each(["en", "cs", "el"])(
    "retains the %s workspace locale through refresh and onboarding",
    async (workspaceLocale) => {
      let handleRoute;
      await installAdminApiMocks(
        {
          route: async (_matcher, handler) => {
            handleRoute = handler;
          },
        },
        { workspaceLocale },
      );

      for (const [method, pathname] of [
        ["POST", "/auth/refresh"],
        ["GET", "/tenants/current/onboarding"],
        ["GET", "/tenants/current/settings"],
      ]) {
        const fulfill = vi.fn();
        await handleRoute({
          request: () => ({
            headers: () => ({}),
            method: () => method,
            url: () => `http://api.shario.localhost:4001${pathname}`,
          }),
          fulfill,
        });
        const response = JSON.parse(fulfill.mock.calls[0][0].body);
        const settings = response.tenant?.settings ?? response.settings;
        expect(settings.adminLanguage).toBe(workspaceLocale);
        expect(resolveWorkspaceRouteLocale(settings, ["en", "cs", "el"])).toBe(
          workspaceLocale,
        );
      }
    },
  );

  it("provides a signed workspace refresh response accepted by production validation", () => {
    const response = responseForRequest({
      method: "POST",
      url: new URL("http://api.shario.localhost:4001/auth/refresh"),
    });

    expect(isAuthResponseForContext(response, AUTH_CONTEXTS.WORKSPACE)).toBe(
      true,
    );
  });

  it.each([
    "/firings",
    "/firings/64d000000000000000000001",
    "/kilns",
    "/ai/firings/overview",
    "/ai/firings/64d000000000000000000001/insight",
  ])("does not serve the retired specialist endpoint %s", (pathname) => {
    expect(
      responseForRequest({
        method: "GET",
        url: new URL(pathname, "http://api.shario.localhost:4311"),
      }),
    ).toBeNull();
  });

  it("keeps completed launch readiness healthy and live attention limited to its unverified sender", () => {
    const getReadiness = (overviewScenario) =>
      getLaunchReadinessItems(
        responseForRequest({
          method: "GET",
          url: new URL(
            "http://api.shario.localhost:4001/tenants/current/setup-center",
          ),
          overviewScenario,
        }),
      );

    expect(
      getReadiness(ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING).map(
        ({ status }) => status,
      ),
    ).toEqual(["ready", "ready", "ready", "ready", "ready"]);
    expect(
      getReadiness(ADMIN_OVERVIEW_SCENARIOS.LIVE_ATTENTION)
        .filter(({ status }) => status !== "ready")
        .map(({ id, status }) => ({ id, status })),
    ).toEqual([{ id: "emails", status: "action_required" }]);
  });

  it("provides disabled social sign-in only for the visual tenant auth preview", () => {
    const response = (tenantSlug) =>
      responseForRequest({
        method: "GET",
        url: new URL(
          `http://api.shario.localhost:4001/auth/customer/social/providers?tenantSlug=${tenantSlug}`,
        ),
      });

    expect(response("studio-alpha")).toEqual({ providers: [] });
    expect(response("another-studio")).toBeNull();
  });

  it("keeps the customer preview anonymous while the workspace is authenticated", async () => {
    let handleRoute;
    const fixture = await installAdminApiMocks({
      route: async (_matcher, handler) => {
        handleRoute = handler;
      },
    });
    const fulfill = vi.fn();
    await handleRoute({
      request: () => ({
        headers: () => ({}),
        method: () => "POST",
        url: () => "http://api.shario.localhost:4001/auth/customer/refresh",
      }),
      fulfill,
    });

    expect(fulfill).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 401,
        body: JSON.stringify({ code: "UNAUTHENTICATED" }),
      }),
    );
    expect([...fixture.unexpectedRequests]).toEqual([]);
    expect([...fixture.handledRequests]).toContain(
      "POST /auth/customer/refresh",
    );
  });

  it("supports the launch editor preview without authenticating a customer", async () => {
    let handleRoute;
    const fixture = await installLaunchAppMocks({
      route: async (_matcher, handler) => {
        handleRoute = handler;
      },
    });
    for (const [method, pathname, status, body] of [
      ["POST", "/auth/customer/refresh", 401, { code: "UNAUTHENTICATED" }],
      [
        "GET",
        "/tenants/current/settings/public-site/versions",
        200,
        { versions: [] },
      ],
      [
        "GET",
        "/public/tenants/studio-alpha/ai/concierge/config",
        200,
        { config: { enabled: false } },
      ],
    ]) {
      const fulfill = vi.fn();
      await handleRoute({
        request: () => ({
          headers: () => ({}),
          method: () => method,
          url: () => `http://api.shario.localhost:4001${pathname}`,
        }),
        fulfill,
      });
      expect(fulfill).toHaveBeenCalledWith(
        expect.objectContaining({ status, body: JSON.stringify(body) }),
      );
    }
    expect([...fixture.unexpectedRequests]).toEqual([]);
  });

  it("models the platform-login visual as explicitly unauthenticated", () => {
    const visualSpec = read("e2e", "visual", "platform-auth.visual.spec.js");

    expect(visualSpec).toContain('code: "UNAUTHENTICATED"');
    expect(visualSpec).toContain("status: 401");
    expect(visualSpec).not.toContain("body: JSON.stringify({}),");
    expect(visualSpec).toContain("isExpectedAnonymousRefreshConsoleError");
  });

  it("filters only the exact console error from the mocked anonymous refresh", () => {
    const createMessage = ({
      text = "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
      type = "error",
      url = "http://api.shario.localhost:4001/auth/refresh",
    } = {}) => ({
      location: () => ({ url }),
      text: () => text,
      type: () => type,
    });

    expect(isExpectedAnonymousRefreshConsoleError(createMessage())).toBe(true);
    expect(
      isExpectedAnonymousRefreshConsoleError(
        createMessage({ url: "http://api.shario.localhost:4001/bookings" }),
      ),
    ).toBe(false);
    expect(
      isExpectedAnonymousRefreshConsoleError(
        createMessage({
          text: "Failed to load resource: 403 Forbidden",
        }),
      ),
    ).toBe(false);
    expect(
      isExpectedAnonymousRefreshConsoleError(
        createMessage({ type: "warning" }),
      ),
    ).toBe(false);
  });
});
