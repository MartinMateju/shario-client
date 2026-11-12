import { describe, expect, it } from "vitest";

import { getSafeCheckoutUrl } from "@/utils/checkoutUrl";

describe("checkout redirect allowlist", () => {
  it("allows the current origin and Stripe Checkout", () => {
    expect(
      getSafeCheckoutUrl(
        "/en/portal/success",
        "https://studio-olivka.shario.io",
      ),
    ).toBe("https://studio-olivka.shario.io/en/portal/success");
    expect(
      getSafeCheckoutUrl(
        "https://checkout.stripe.com/c/pay/cs_test",
        "https://studio-olivka.shario.io",
      ),
    ).toBe("https://checkout.stripe.com/c/pay/cs_test");
  });

  it("rejects credentials, scripts, and untrusted redirect hosts", () => {
    expect(
      getSafeCheckoutUrl(
        "https://evil.example/checkout",
        "https://studio-olivka.shario.io",
      ),
    ).toBe("");
    expect(
      getSafeCheckoutUrl(
        "javascript:alert(1)",
        "https://studio-olivka.shario.io",
      ),
    ).toBe("");
    expect(
      getSafeCheckoutUrl(
        "https://user:pass@checkout.stripe.com/c/pay/test",
        "https://studio-olivka.shario.io",
      ),
    ).toBe("");
  });
});
