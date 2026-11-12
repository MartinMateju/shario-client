import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("tenant bootstrap flow contract", () => {
  const pageSource = readFileSync(
    resolve(
      process.cwd(),
      "src/app/[locale]/tenants/[tenantSlug]/app/onboarding/page.js",
    ),
    "utf8",
  );
  const studioSource = readFileSync(
    resolve(process.cwd(), "src/components/onboarding/steps/StudioStep.js"),
    "utf8",
  );
  const businessSource = readFileSync(
    resolve(process.cwd(), "src/components/onboarding/steps/BusinessStep.js"),
    "utf8",
  );
  const headerSource = readFileSync(
    resolve(process.cwd(), "src/components/onboarding/OnboardingHeader.js"),
    "utf8",
  );
  const sidebarSource = readFileSync(
    resolve(process.cwd(), "src/components/onboarding/OnboardingSidebar.js"),
    "utf8",
  );
  const navigationSource = readFileSync(
    resolve(process.cwd(), "src/components/onboarding/onboardingNavigation.js"),
    "utf8",
  );

  it("asks for the five launch essentials on one screen", () => {
    expect(pageSource).toContain("<StudioStep");
    expect(pageSource).toContain("<BusinessStep");
    expect(pageSource).not.toContain("TeamStep");
    expect(pageSource).not.toContain("OnboardingProgress");
    expect(studioSource).toContain('name="studioName"');
    expect(studioSource).toContain("businessType");
    expect(studioSource).not.toContain("teamSize");
    expect(businessSource).toContain('name="country"');
    expect(businessSource).toContain('name="currency"');
    expect(businessSource).toContain('name="timezone"');
    expect(businessSource).not.toContain('name="city"');
    expect(businessSource).not.toContain('name="address"');
    expect(businessSource).not.toContain('name="phone"');
    expect(pageSource).toContain("noValidate");
    expect(pageSource).toContain("data-onboarding-card");
    expect(pageSource).toContain('role="alert"');
  });

  it("persists compatibility steps, applies no booking questionnaire, and opens Launch Center", () => {
    expect(pageSource).toContain("step: 1");
    expect(pageSource).toContain("step: 2");
    expect(pageSource).toContain("businessType: form.businessType");
    expect(pageSource).toContain("country: form.country.trim()");
    expect(pageSource).toContain("currency: form.currency");
    expect(pageSource).toContain("timezone: form.timezone");
    expect(pageSource).not.toContain("bookingTypes:");
    expect(pageSource).not.toContain("teamSize:");
    expect(pageSource).toContain("const response = await complete().unwrap()");
    expect(pageSource).toContain("navigateToLaunchCenter({ locale })");
    expect(navigationSource).toContain("window.location.replace");
    expect(navigationSource).toContain("`/${locale}/app/setup`");
  });

  it("reuses the canonical auth chrome inside two uninterrupted panels", () => {
    expect(headerSource).toContain(
      'import Brand from "@/components/headers/Brand"',
    );
    expect(headerSource).toContain(
      'import LanguageSelector from "@/components/headers/LanguageSelector"',
    );
    expect(headerSource).toContain('<Brand href="/" />');
    expect(headerSource).toContain("<LanguageSelector");
    expect(headerSource).toContain("data-onboarding-brand");
    expect(headerSource).toContain("data-onboarding-actions");
    expect(headerSource).toContain("absolute inset-x-0 top-0");
    expect(headerSource).toContain("bg-transparent");
    expect(headerSource).not.toContain("GlobeAltIcon");
    expect(headerSource).not.toContain("SkabLogo");
    expect(pageSource).toContain("data-onboarding-grid");
    expect(pageSource).toContain("data-onboarding-left");
    expect(pageSource).toContain("-mt-[var(--header-height)]");
    expect(pageSource).toContain("xl:grid-cols-2");
    expect(pageSource).not.toContain("lg:grid-cols-");
    expect(sidebarSource).toContain("data-onboarding-right");
    expect(sidebarSource).toContain("data-platform-auth-full-height");
    expect(sidebarSource).toContain("PLATFORM_AUTH_VIEWPORT_HEIGHT");
    expect(sidebarSource).toContain("xl:block");
    expect(sidebarSource).not.toContain("lg:block");
  });
});
