import { describe, expect, it } from "vitest";

import { validateVercelEnvironment } from "../../scripts/validate-vercel-env.mjs";

const deployed = {
  VERCEL: "1",
  NEXT_PUBLIC_SITE_URL: "https://shario.io",
  NEXT_PUBLIC_API_URL: "https://api.shario.io",
  NEXT_PUBLIC_ROOT_DOMAIN: "shario.io",
  TENANT_ROOT_DOMAIN: "shario.io",
};

describe("Vercel build configuration validation", () => {
  it("accepts the production environment and a separate staging root", () => {
    expect(validateVercelEnvironment(deployed)).toEqual([]);
    expect(
      validateVercelEnvironment({
        ...deployed,
        NEXT_PUBLIC_SITE_URL: "https://staging.shario.io",
        NEXT_PUBLIC_API_URL: "https://api.staging.shario.io",
        NEXT_PUBLIC_ROOT_DOMAIN: "staging.shario.io",
        TENANT_ROOT_DOMAIN: "staging.shario.io",
      }),
    ).toEqual([]);
  });

  it("does not change local development or non-Vercel builds", () => {
    expect(validateVercelEnvironment({})).toEqual([]);
  });

  it("requires deployment settings instead of inheriting local defaults", () => {
    const errors = validateVercelEnvironment({ VERCEL: "1" });
    for (const key of Object.keys(deployed).filter((key) => key !== "VERCEL")) {
      expect(errors.some((error) => error.startsWith(key))).toBe(true);
    }
  });

  it.each([
    ["NEXT_PUBLIC_SITE_URL", "http://shario.io"],
    ["NEXT_PUBLIC_SITE_URL", "https://shario.localhost"],
    ["NEXT_PUBLIC_SITE_URL", "https://shario.io/en"],
    ["NEXT_PUBLIC_API_URL", "http://localhost:4311"],
    ["NEXT_PUBLIC_API_URL", "https://127.0.0.1"],
    ["NEXT_PUBLIC_API_URL", "https://user:private-value@api.example"],
    ["NEXT_PUBLIC_API_URL", "https://api.example?secret=private-value"],
    ["NEXT_PUBLIC_ROOT_DOMAIN", "project.vercel.app"],
    ["TENANT_ROOT_DOMAIN", "https://shario.io"],
    ["TENANT_ROOT_DOMAIN", "shario.io:443"],
    ["TENANT_ROOT_DOMAIN", "192.0.2.1"],
  ])("rejects invalid %s without echoing its value", (key, value) => {
    const errors = validateVercelEnvironment({ ...deployed, [key]: value });
    expect(errors.some((error) => error.startsWith(key))).toBe(true);
    expect(errors.join("\n")).not.toContain("private-value");
  });

  it("rejects roots that would send browser and server routes to different tenants", () => {
    expect(
      validateVercelEnvironment({
        ...deployed,
        TENANT_ROOT_DOMAIN: "other.example",
      }),
    ).toContain("NEXT_PUBLIC_ROOT_DOMAIN and TENANT_ROOT_DOMAIN must match.");
  });
});
