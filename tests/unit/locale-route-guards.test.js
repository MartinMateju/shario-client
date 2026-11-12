import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getRolloutEligibleLocaleFromPathname,
  stripRolloutEligibleLocalePrefix,
} from "@/i18n/locales";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("localized authentication and billing route guards", () => {
  it.each([
    ["/fr/login", "fr", "/login"],
    ["/es_ES/logout/", "es", "/logout/"],
    ["/it-IT/app", "it", "/app"],
    ["/pt_PT/app/settings", "pt-PT", "/app/settings"],
    ["/sv/app", "sv", "/app"],
    ["/no-NO/portal", "nb", "/portal"],
    ["/fi-FI/login", "fi", "/login"],
    ["/hu/app", "hu", "/app"],
    ["/el-GR/portal", "el", "/portal"],
    ["/tr_TR/login", "tr", "/login"],
    ["/nl-NL/app", "nl", "/app"],
    ["/ro_RO/portal", "ro", "/portal"],
    ["/ja/app", null, "/ja/app"],
    ["/pt-BR/app", null, "/pt-BR/app"],
  ])("parses %s as %s", (pathname, locale, stripped) => {
    expect(getRolloutEligibleLocaleFromPathname(pathname)).toBe(locale);
    expect(stripRolloutEligibleLocalePrefix(pathname)).toBe(stripped);
  });

  it("enforces tenant-owned language policy across workspace and customer surfaces", () => {
    const workspaceBoundary = read(
      "src",
      "components",
      "auth",
      "TenantSurfaceBoundary.js",
    );
    const preferences = read(
      "src",
      "components",
      "views",
      "settings",
      "WorkspacePreferencesPage.js",
    );
    const customerLayouts = [
      ["(public-foundation)", "layout.js"],
      ["(tenant-auth)", "layout.js"],
      ["portal", "layout.js"],
      ["(customer-transactions)", "layout.js"],
    ];

    expect(workspaceBoundary).toContain("resolveWorkspaceRouteLocale");
    expect(workspaceBoundary).toContain("workspaceLocaleMismatch");
    expect(workspaceBoundary).toMatch(
      /const workspaceLocaleMismatch =\s+isWorkspaceSurface &&/,
    );
    expect(workspaceBoundary).toContain("window.location.hash");
    expect(workspaceBoundary).toContain("locale: workspaceRouteLocale");
    expect(preferences).not.toContain("preferences.language");
    expect(preferences).not.toContain("language: form.language");

    for (const segments of customerLayouts) {
      const source = read(
        "src",
        "app",
        "[locale]",
        "tenants",
        "[tenantSlug]",
        ...segments,
      );

      expect(source).toContain("enforcePublicTenantRouteLocale");
    }
  });

  it("uses the central parser for token handoffs and billing redirects", () => {
    const refreshHook = read("src", "hooks", "useTokenRefresh.js");
    const apiSlice = read("src", "lib", "features", "api", "apiSlice.js");

    expect(refreshHook).toContain("stripRolloutEligibleLocalePrefix");
    expect(refreshHook).not.toMatch(/\(\?:en\|cs\)/);
    expect(apiSlice).toContain("getRolloutEligibleLocaleFromPathname");
    expect(apiSlice).not.toMatch(/\^\\\/\(en\|cs\)/);
  });
});
