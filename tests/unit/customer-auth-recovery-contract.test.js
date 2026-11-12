import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getRefreshEndpointForAuthContext } from "@/lib/features/auth/authContext";

const read = (...segments) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("customer verification and recovery contracts", () => {
  it("uses POST refresh for explicit and automatic session restoration", () => {
    const authApi = read("src", "lib", "features", "auth", "authApiSlice.js");
    const baseApi = read("src", "lib", "features", "api", "apiSlice.js");

    expect(authApi).toMatch(/url: "\/auth\/refresh",\s+method: "POST"/);
    expect(getRefreshEndpointForAuthContext("workspace")).toBe("/auth/refresh");
    expect(getRefreshEndpointForAuthContext("customer")).toBe(
      "/auth/customer/refresh",
    );
    expect(baseApi).toContain("getRefreshEndpointForAuthContext(authContext)");
    expect(baseApi).toContain('method: "POST"');
  });

  it("implements tenant-scoped six-digit password recovery", () => {
    const passApi = read("src", "lib", "features", "pass", "passApiSlice.js");
    const otp = read("src", "components", "otp", "InputOtp.js");
    const otpModal = read("src", "components", "modals", "OTPModal.js");
    const constants = read("src", "config", "constants.js");

    expect(passApi).toContain('url: "/password-reset/request"');
    expect(passApi).toContain('url: "/password-reset/verify-otp"');
    expect(passApi).toContain('url: "/password-reset/reset"');
    expect(passApi).toContain("body: { tenantSlug, email, locale }");
    expect(passApi).toContain("body: { tenantSlug, email, otp }");
    expect(passApi).toContain("body: { tenantSlug, resetToken, password }");
    expect(otp).toContain("length = 6");
    expect(otp).toContain("--tenant-auth-field-secondary");
    expect(otp).not.toContain("focus:border-[var(--tenant-page-label-color)]");
    expect(constants).toContain("const PASSWORD_RESET_OTP_LENGTH = 6");
    expect(otpModal).toContain("key={resetKey}");
    expect(otpModal).toContain('data-ui-unstyled="true"');
    expect(otpModal).toContain('"--dialog-surface"');
  });

  it("uses the current tenant auth design and preserves the caller context", () => {
    const requestPage = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "(tenant-auth)",
      "password",
      "page.js",
    );
    const resetPage = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "(tenant-auth)",
      "password",
      "reset",
      "page.js",
    );
    const successPage = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "(tenant-auth)",
      "password",
      "success",
      "page.js",
    );
    const platformLogin = read("src", "app", "[locale]", "login", "page.js");

    for (const source of [requestPage, resetPage, successPage]) {
      expect(source).toContain("CustomerPasswordRecoveryShell");
      expect(source).toContain("useLocale");
      expect(source).not.toContain(
        'import Loader from "@/components/loaders/Loader"',
      );
    }

    expect(requestPage).toContain("<CustomerAuthField");
    expect(resetPage).toContain("<CustomerAuthPasswordField");
    expect(resetPage).toContain("maxLength={PASSWORD_MAX_LENGTH}");
    expect(platformLogin).toContain('pathname: "/password?source=platform"');
    expect(successPage).toContain("buildPlatformUrl");
  });

  it("preserves the booking destination through registration and verification", () => {
    const registerPage = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "(tenant-auth)",
      "register",
      "page.js",
    );
    const verifyPage = read(
      "src",
      "app",
      "[locale]",
      "tenants",
      "[tenantSlug]",
      "(tenant-auth)",
      "verify-email",
      "page.js",
    );

    expect(registerPage).toContain("next: safeNextPath");
    expect(registerPage).toContain("locale: verificationLocale");
    expect(registerPage).toContain("/verify-email?email=");
    expect(verifyPage).toContain("getSafeTenantNextPath");
    expect(verifyPage).toContain("const locale = useLocale()");
    expect(verifyPage).toContain("locale: verificationLocale");
    expect(verifyPage).toContain("useVerifyCustomerEmailMutation");
    expect(verifyPage).toContain("useResendCustomerEmailVerificationMutation");
    expect(verifyPage).toContain("data-auth-form-panel");
    expect(verifyPage).toContain('data-tenant-surface="panel"');
    expect(verifyPage.match(/data-tenant-button="primary"/g)).toHaveLength(2);
    expect(verifyPage).toContain('data-tenant-button="secondary"');
    expect(verifyPage).toContain("--tenant-auth-form-secondary");
    for (const hardCodedColour of [
      "#F7F5F2",
      "#DED8D0",
      "#925136",
      "#1F1B18",
      "#68605A",
      "#CFC5BB",
    ]) {
      expect(verifyPage).not.toContain(hardCodedColour);
    }
  });
});
