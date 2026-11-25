import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/account/page";
import PreferencesPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/preferences/page";
import CommunicationsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/communications/page";
import CommunicationsSettingsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/settings/communications/page";

const { redirect } = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({ redirect }));
vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: () => null,
}));
vi.mock("@/components/communications/CommunicationsWorkspace", () => ({
  default: () => null,
}));

describe("unified settings routes", () => {
  beforeEach(() => redirect.mockClear());

  it.each([
    [AccountPage, "/app/settings/profile"],
    [PreferencesPage, "/app/settings/preferences"],
  ])(
    "preserves locale and query context from personal bookmarks",
    async (Page, target) => {
      await Page({
        params: Promise.resolve({ locale: "cs", tenantSlug: "studio" }),
        searchParams: Promise.resolve({
          from: "legacy",
          location: ["one", "two"],
          ignored: undefined,
        }),
      });
      expect(redirect).toHaveBeenCalledWith({
        href: `${target}?from=legacy&location=one&location=two`,
        locale: "cs",
      });
    },
  );

  it("does not append an empty query to a personal redirect", async () => {
    await AccountPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({}),
    });
    expect(redirect).toHaveBeenCalledWith({
      href: "/app/settings/profile",
      locale: "en",
    });
  });

  it.each([
    { section: "setup" },
    { section: "settings" },
    { section: "automations", tab: "senders" },
    { setupStep: "communications" },
  ])(
    "moves legacy communication setup to its canonical route: %j",
    async (query) => {
      await CommunicationsPage({
        params: Promise.resolve({ locale: "nl" }),
        searchParams: Promise.resolve({
          ...query,
          guide: "customer_communications",
          source: "launch",
        }),
      });
      const call = redirect.mock.calls[0][0];
      expect(call.locale).toBe("nl");
      const href = new URL(call.href, "http://studio.test");
      expect(href.pathname).toBe("/app/settings/communications");
      expect(href.searchParams.get("guide")).toBe("customer_communications");
      expect(href.searchParams.get("source")).toBe("launch");
      expect(href.searchParams.has("section")).toBe(false);
      expect(href.searchParams.has("tab")).toBe(false);
      if (query.setupStep)
        expect(href.searchParams.get("setupStep")).toBe(query.setupStep);
    },
  );

  it("keeps history under its original viewing permission gate", async () => {
    const page = await CommunicationsPage({
      params: Promise.resolve({ locale: "en" }),
      searchParams: Promise.resolve({ section: "history" }),
    });
    expect(redirect).not.toHaveBeenCalled();
    expect(page.props.anyOf).toEqual([
      "communications.view",
      "communications.manage",
    ]);
  });

  it("keeps the email settings management gate on its canonical route", () => {
    const page = CommunicationsSettingsPage();
    expect(page.props.anyOf).toEqual([
      "communications.settings.manage",
      "communications.manage",
    ]);
    expect(page.props.children.props.settingsOnly).toBe(true);
  });
});
