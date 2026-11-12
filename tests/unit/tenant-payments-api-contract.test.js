import { describe, expect, it } from "vitest";

import {
  TENANT_PAYMENT_SETUP_STEP,
  buildTenantPaymentOnboardingBody,
} from "@/lib/features/tenant-payments/tenantPaymentOnboarding";

describe("tenant payment onboarding request contract", () => {
  it("forwards only the allowlisted Launch Center context", () => {
    expect(
      buildTenantPaymentOnboardingBody({
        locale: "en",
        setupStep: TENANT_PAYMENT_SETUP_STEP,
      }),
    ).toEqual({ locale: "en", setupStep: "payments" });

    expect(
      buildTenantPaymentOnboardingBody({
        locale: "cs",
        setupStep: "studio",
      }),
    ).toEqual({ locale: "cs" });
  });
});
