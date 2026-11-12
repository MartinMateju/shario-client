import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  FOUNDING_OFFER_ID,
  SUBSCRIPTION_PLAN_ORDER,
} from "@/config/subscriptionPlans";
import {
  getNewSaleBillingCurrencies,
  getPlanFeatureDescriptors,
  getPlanPricePresentation,
  isTrialCheckoutSelectionBlocked,
  isCurrentPlanSelection,
  resolveNewSaleBillingCurrency,
  resolveSafeExternalUrl,
  resolveTrustedBillingUrl,
  sortSubscriptionPlans,
} from "@/lib/features/billing/billingCatalog";

const v2Plan = (overrides = {}) => ({
  id: "professional",
  version: 2,
  selfServe: true,
  commercial: {
    offerId: FOUNDING_OFFER_ID,
    founding: true,
    recommended: true,
    saleMode: "self_serve",
    newSaleCurrencies: ["CZK", "EUR"],
    annualSavingsMonths: 2,
    recurring: {
      monthly: {
        type: "fixed",
        amounts: { CZK: 199_000, EUR: 7_900 },
      },
      yearly: {
        type: "fixed",
        amounts: { CZK: 1_990_000, EUR: 79_000 },
      },
    },
  },
  capabilities: {
    scale: {
      locations: { kind: "fixed", value: 3 },
      teamAccounts: { kind: "fixed", value: 15 },
      customers: { kind: "unlimited" },
      bookings: { kind: "unlimited" },
    },
    communications: {
      customAutomations: { kind: "fixed", value: 25 },
      includedEmailsPerMonth: { kind: "fixed", value: 5_000 },
    },
    ai: { allowancePerMonth: 2_000 },
  },
  limits: {},
  prices: {},
  ...overrides,
});

describe("production subscription plan contract", () => {
  it("distinguishes a legacy paid plan from the same tier in the current catalog", () => {
    const selection = {
      plan: { id: "professional", version: 3 },
      interval: "monthly",
      currentPlan: "professional",
      currentInterval: "monthly",
    };
    expect(isCurrentPlanSelection({ ...selection, currentVersion: 2 })).toBe(
      false,
    );
    expect(isCurrentPlanSelection({ ...selection, currentVersion: 3 })).toBe(
      true,
    );
    expect(isCurrentPlanSelection({ ...selection, currentVersion: null })).toBe(
      false,
    );
    expect(
      isCurrentPlanSelection({
        ...selection,
        currentVersion: 3,
        currentInterval: "yearly",
      }),
    ).toBe(false);
  });

  it("keeps the explicit Studio Plus advanced automation allowance", () => {
    expect(
      getPlanFeatureDescriptors({
        capabilities: {
          communications: { customAutomations: { kind: "advanced" } },
        },
      }),
    ).toEqual([{ key: "automations", kind: "advanced" }]);
  });
  it("keeps canonical plan identity independent of backend prices", () => {
    expect(SUBSCRIPTION_PLAN_ORDER).toEqual([
      "starter",
      "professional",
      "studio_plus",
      "enterprise",
    ]);
  });

  it("sorts an arbitrary server response into the canonical order", () => {
    const sorted = sortSubscriptionPlans([
      { id: "enterprise" },
      { id: "professional" },
      { id: "starter" },
      { id: "studio_plus" },
    ]);

    expect(sorted.map(({ id }) => id)).toEqual(SUBSCRIPTION_PLAN_ORDER);
  });

  it("uses the runtime Stripe price when configured and commercial price for display fallback", () => {
    const plan = v2Plan({
      prices: {
        monthly: {
          currencyOptions: {
            EUR: { configured: true, currency: "EUR", unitAmount: 8_100 },
          },
        },
      },
    });

    expect(getPlanPricePresentation(plan, "monthly", "EUR")).toEqual({
      checkoutConfigured: true,
      currency: "EUR",
      custom: false,
      from: false,
      unitAmount: 8_100,
    });

    expect(getPlanPricePresentation(plan, "yearly", "CZK")).toEqual({
      checkoutConfigured: false,
      currency: "CZK",
      custom: false,
      from: false,
      unitAmount: 1_990_000,
    });

    expect(
      getPlanPricePresentation(
        v2Plan({
          id: "enterprise",
          selfServe: false,
          commercial: {
            offerId: FOUNDING_OFFER_ID,
            saleMode: "sales_assisted",
            recurring: {
              monthly: {
                type: "from",
                amounts: { CZK: 799_000, EUR: 31_900 },
              },
              yearly: { type: "custom", amounts: null },
            },
          },
        }),
        "yearly",
        "EUR",
      ),
    ).toEqual({
      checkoutConfigured: false,
      currency: "EUR",
      custom: true,
      from: false,
      unitAmount: null,
    });

    expect(
      getPlanPricePresentation(
        v2Plan({
          commercial: {
            offerId: "future_offer_v1",
            recurring: {},
          },
        }),
        "monthly",
        "EUR",
      ).unitAmount,
    ).toBeNull();
  });

  it("does not silently label a legacy null limit unlimited or custom", () => {
    const legacyPlan = {
      id: "enterprise",
      limits: { locations: null, staffMembers: null },
    };

    expect(getPlanFeatureDescriptors(legacyPlan)).toEqual([]);

    expect(
      getPlanFeatureDescriptors({
        id: "enterprise",
        capabilities: {
          scale: {
            locations: { kind: "custom" },
            teamAccounts: { kind: "custom" },
            customers: { kind: "unlimited" },
            bookings: { kind: "unlimited" },
          },
          communications: {
            customAutomations: { kind: "unlimited" },
            includedEmailsPerMonth: { kind: "custom" },
          },
          ai: { allowancePerMonth: { kind: "custom" } },
        },
        limits: { locations: null, staffMembers: null },
      }),
    ).toEqual([
      { key: "locations", kind: "custom" },
      { key: "teamAccounts", kind: "custom" },
      { key: "customersAndBookings", kind: "unlimited" },
      { key: "automations", kind: "unlimited" },
      { key: "ai", kind: "custom" },
    ]);
  });

  it("renders only explicit server scale semantics and falls back to safe legacy counts", () => {
    expect(getPlanFeatureDescriptors(v2Plan())).toEqual([
      { key: "locations", kind: "fixed", value: 3 },
      { key: "teamAccounts", kind: "fixed", value: 15 },
      { key: "customersAndBookings", kind: "unlimited" },
      { key: "automations", kind: "fixed", value: 25 },
      { key: "ai", kind: "fixed", value: 2_000 },
    ]);

    expect(
      getPlanFeatureDescriptors({
        id: "starter",
        limits: {
          locations: 1,
          staffMembers: 3,
          monthlyEmails: 1_000,
          aiCredits: 200,
        },
      }),
    ).toEqual([
      { key: "locations", kind: "fixed", value: 1 },
      { key: "teamAccounts", kind: "fixed", value: 3 },
      { key: "ai", kind: "fixed", value: 200 },
    ]);
  });

  it("limits new subscriptions to currencies supplied by the server offer", () => {
    expect(getNewSaleBillingCurrencies({}, [v2Plan()])).toEqual(["CZK", "EUR"]);
    expect(
      getNewSaleBillingCurrencies(
        { billingCurrencies: ["eur", "CZK", "INVALID"] },
        [],
      ),
    ).toEqual(["EUR", "CZK"]);
    expect(
      getNewSaleBillingCurrencies(
        {
          billingCurrencies: ["CZK", "EUR", "USD", "GBP", "AUD", "CAD"],
        },
        [v2Plan()],
      ),
    ).toEqual(["CZK", "EUR"]);
    expect(
      getNewSaleBillingCurrencies(
        { offer: { billingCurrencies: ["USD", "GBP"] } },
        [v2Plan()],
      ),
    ).toEqual(["CZK", "EUR"]);
    expect(
      getNewSaleBillingCurrencies({ newSaleCurrencies: ["EUR"] }, [v2Plan()]),
    ).toEqual(["EUR"]);
    expect(
      getNewSaleBillingCurrencies({}, [
        v2Plan(),
        v2Plan({
          id: "starter",
          commercial: {
            ...v2Plan().commercial,
            newSaleCurrencies: ["CZK"],
          },
        }),
      ]),
    ).toEqual(["CZK"]);
  });

  it("preserves saved and explicitly chosen currencies even without configured prices", () => {
    expect(
      resolveNewSaleBillingCurrency({
        selectedCurrency: null,
        tenantCurrency: "USD",
        offeredCurrencies: ["CZK", "EUR"],
      }),
    ).toBe("USD");
    expect(
      resolveNewSaleBillingCurrency({
        selectedCurrency: "CZK",
        tenantCurrency: "USD",
        offeredCurrencies: ["CZK", "EUR"],
      }),
    ).toBe("CZK");
    expect(
      resolveNewSaleBillingCurrency({
        selectedCurrency: null,
        tenantCurrency: "PLN",
        offeredCurrencies: ["CZK"],
      }),
    ).toBe("PLN");
    expect(
      resolveNewSaleBillingCurrency({
        storedBillingCurrency: "CHF",
        tenantCurrency: "EUR",
      }),
    ).toBe("CHF");
    expect(
      resolveNewSaleBillingCurrency({
        selectedCurrency: "DKK",
        storedBillingCurrency: "CHF",
        tenantCurrency: "EUR",
      }),
    ).toBe("DKK");
    expect(resolveNewSaleBillingCurrency({ tenantCurrency: "JPY" })).toBe(
      "USD",
    );
  });

  it("blocks no-card trial checkout only during Stripe's final 48-hour window", () => {
    const now = Date.parse("2026-08-10T10:00:00.000Z");
    const trial = {
      status: "trialing",
      hasStripeSubscription: false,
    };

    expect(
      isTrialCheckoutSelectionBlocked(
        { ...trial, trialEndsAt: "2026-08-12T10:00:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isTrialCheckoutSelectionBlocked(
        { ...trial, trialEndsAt: "2026-08-12T10:00:00.001Z" },
        now,
      ),
    ).toBe(false);
    expect(
      isTrialCheckoutSelectionBlocked(
        { ...trial, trialEndsAt: "2026-08-12T09:59:59.999Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isTrialCheckoutSelectionBlocked(
        {
          ...trial,
          hasStripeSubscription: true,
          trialEndsAt: "2026-08-11T10:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
    expect(isTrialCheckoutSelectionBlocked(trial, now)).toBe(true);
  });

  it.each([
    [1, true],
    [0, false],
    [-1, false],
    [-86400000, false],
  ])(
    "allows paid checkout after expiry while retaining the final trial window (%sms)",
    (remaining, blocked) => {
      const now = Date.parse("2026-10-21T12:00:00Z");
      expect(
        isTrialCheckoutSelectionBlocked(
          {
            status: "trialing",
            hasStripeSubscription: false,
            trialEndsAt: new Date(now + remaining).toISOString(),
          },
          now,
        ),
      ).toBe(blocked);
    },
  );

  it.each([undefined, null, "", "invalid"])(
    "blocks an invalid trial expiration instead of treating it as expired (%s)",
    (trialEndsAt) => {
      expect(
        isTrialCheckoutSelectionBlocked({
          status: "trialing",
          hasStripeSubscription: false,
          trialEndsAt,
        }),
      ).toBe(true);
    },
  );

  it("accepts only same-origin or known Stripe billing redirects", () => {
    const origin = "https://app.shario.io";

    expect(resolveTrustedBillingUrl("/billing/success", origin)).toBe(
      "https://app.shario.io/billing/success",
    );
    expect(
      resolveTrustedBillingUrl(
        "https://checkout.stripe.com/c/pay/test",
        origin,
      ),
    ).toBe("https://checkout.stripe.com/c/pay/test");
    expect(
      resolveTrustedBillingUrl(
        "https://billing.stripe.com/p/session/test",
        origin,
      ),
    ).toBe("https://billing.stripe.com/p/session/test");
    expect(resolveTrustedBillingUrl("https://evil.example/phish", origin)).toBe(
      "",
    );
    expect(resolveTrustedBillingUrl("javascript:alert(1)", origin)).toBe("");
  });

  it("allows HTTPS invoice documents without allowing unsafe schemes", () => {
    expect(
      resolveSafeExternalUrl(
        "https://files.stripe.com/invoice.pdf",
        "https://app.shario.io",
      ),
    ).toBe("https://files.stripe.com/invoice.pdf");
    expect(
      resolveSafeExternalUrl("javascript:alert(1)", "https://app.shario.io"),
    ).toBe("");
  });

  it("initializes the plan picker from an existing subscriber interval", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/views/billing/BillingSettingsPage.js",
      ),
      "utf8",
    );

    expect(source).toContain(
      'selectedInterval || data?.subscription?.billingInterval || "monthly"',
    );
    expect(source).not.toContain('useState("monthly")');
    expect(source).toContain("getNewSaleBillingCurrencies(");
    expect(source).toContain("resolveTrustedBillingUrl(");
    expect(source).toContain("const planActionLocked =");
    expect(source).toContain("checkoutLoading || previewLoading");
    expect(source).toContain("checkoutBlocked={trialCheckoutBlocked}");
    expect(source).toContain('closeLabel={t("closeDialog")}');
    expect(source).toContain(
      "const paymentRecoveryUrl = resolveTrustedBillingUrl(",
    );
    expect(source).not.toContain("href={subscription.paymentRecoveryUrl}");
  });

  it("advertises the enforced V3 included-email allowances", () => {
    const english = fs.readFileSync(
      path.join(process.cwd(), "src/messages/en.json"),
      "utf8",
    );
    const czech = fs.readFileSync(
      path.join(process.cwd(), "src/messages/cs.json"),
      "utf8",
    );

    for (const allowance of [
      "500 included emails per month",
      "2,500 emails per month",
      "5,000 emails per month",
    ]) {
      expect(english).toContain(allowance);
    }
    for (const allowance of [
      "500 zahrnutých e-mailů měsíčně",
      "2 500 e-mailů měsíčně",
      "5 000 e-mailů měsíčně",
    ]) {
      expect(czech).toContain(allowance);
    }
  });
});
