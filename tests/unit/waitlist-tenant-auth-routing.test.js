import { describe, expect, it } from "vitest";

import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";

describe("waitlist tenant authentication return path", () => {
  it("allows only the token-free offer resume fragment", () => {
    expect(getSafeTenantNextPath("/waitlists/offer#resume")).toBe(
      "/waitlists/offer#resume",
    );
    expect(buildTenantAuthHref("/login", "/waitlists/offer#resume")).toBe(
      "/login?next=%2Fwaitlists%2Foffer%23resume",
    );

    for (const unsafePath of [
      "/waitlists/manage#manage=secret-token",
      "/waitlists/offer#offer=secret-token",
      "/waitlists/offer?token=secret-token#resume",
      "/waitlists/other#resume",
      "//attacker.example/waitlists/offer#resume",
    ]) {
      expect(getSafeTenantNextPath(unsafePath, "/portal")).toBe("/portal");
    }
  });

  it("preserves the existing public and portal allowlist", () => {
    expect(getSafeTenantNextPath("/courses/course-1?date=2026-08-07")).toBe(
      "/courses/course-1?date=2026-08-07",
    );
    expect(getSafeTenantNextPath("/portal/waitlists")).toBe(
      "/portal/waitlists",
    );
  });
});
