import { describe, expect, it } from "vitest";

import {
  buildTenantAuthHref,
  getSafeTenantNextPath,
} from "@/utils/tenantAuthRouting";

describe("tenant authentication return paths", () => {
  it.each([
    ["/book", "/book"],
    ["/courses/wheel-basics", "/courses/wheel-basics"],
    [
      "/memberships?planId=plan-1&currency=CZK#choose",
      "/memberships?planId=plan-1&currency=CZK#choose",
    ],
    ["/help/firing-guide", "/help/firing-guide"],
    [
      "/portal?tab=studio-calendar&productId=product-1",
      "/portal?tab=studio-calendar&productId=product-1",
    ],
    [
      "/portal?location=studio-olivka&tab=studio-calendar",
      "/portal?location=studio-olivka&tab=studio-calendar",
    ],
  ])("preserves the allowed customer destination %s", (input, expected) => {
    expect(getSafeTenantNextPath(input)).toBe(expected);
  });

  it.each([
    "",
    "https://attacker.example/portal",
    "//attacker.example/portal",
    "/\\attacker.example/portal",
    "/portal\\evil",
    "/portal\u0000",
    "/app",
    "/app/settings",
    "/internal-admin",
  ])("rejects the unsafe or workspace-only destination %j", (input) => {
    expect(getSafeTenantNextPath(input, "/portal")).toBe("/portal");
  });

  it("encodes an exact selected offering into the auth link", () => {
    expect(
      buildTenantAuthHref(
        "/login",
        "/courses/wheel-basics?productId=product-1#dates",
      ),
    ).toBe(
      "/login?next=%2Fcourses%2Fwheel-basics%3FproductId%3Dproduct-1%23dates",
    );
  });

  it("drops an unsafe next value instead of creating an open redirect", () => {
    expect(
      buildTenantAuthHref("/login", "//attacker.example/steal-session"),
    ).toBe("/login");
  });
});
