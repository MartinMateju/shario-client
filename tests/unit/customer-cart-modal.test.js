import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatCartCurrencyAmount,
  getCartCopy,
  getCartItemCountLabel,
  getCartItemHourlyPriceMajor,
  getCartItemTotalMajor,
  getCartProductName,
  isTimedStudioCartItem,
} from "@/components/modals/cartModal.utils";

const readSource = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("premium customer cart modal", () => {
  it("prices modern Open Studio products per 30-minute block and guest", () => {
    const publicBooking = {
      bookingMode: "public",
      numberOfGuests: 2,
      quantity: 3,
      product: {
        currency: "CZK",
        kind: "open-studio",
        price: 250,
      },
    };

    expect(isTimedStudioCartItem(publicBooking)).toBe(true);
    expect(getCartItemHourlyPriceMajor(publicBooking)).toBe(500);
    expect(getCartItemTotalMajor(publicBooking)).toBe(1500);
  });

  it("includes the exclusive-studio surcharge without multiplying it twice", () => {
    const privateBooking = {
      bookingMode: "private",
      numberOfGuests: 1,
      quantity: 2,
      product: {
        currency: "CZK",
        extraCharge: 100,
        kind: "open-studio",
        price: 250,
      },
    };

    expect(getCartItemHourlyPriceMajor(privateBooking)).toBe(700);
    expect(getCartItemTotalMajor(privateBooking)).toBe(700);
  });

  it("keeps class and standalone-service quantity pricing intact", () => {
    expect(
      getCartItemTotalMajor({
        quantity: 3,
        product: { currency: "CZK", kind: "class", price: 1200 },
      }),
    ).toBe(3600);
    expect(
      getCartItemTotalMajor({
        quantity: 4,
        product: { currency: "CZK", type: "service", price: 125 },
      }),
    ).toBe(500);
  });

  it("shows whole crowns while preserving decimal currencies", () => {
    expect(formatCartCurrencyAmount(2999.88, "CZK", "en-GB")).toMatch(
      /^CZK\s3,000$/,
    );
    expect(formatCartCurrencyAmount(400, "CZK", "en-GB")).toMatch(/^CZK\s400$/);
    expect(formatCartCurrencyAmount(12.5, "EUR", "en-GB")).toBe("€12.50");
  });

  it("prefers the active locale and translates canonical studio booking names", () => {
    const localizedProduct = {
      product: {
        name: { cs: "Glazovací dílna", en: "Glazing Lab" },
      },
    };

    expect(getCartProductName(localizedProduct, "EN")).toBe("Glazing Lab");
    expect(getCartProductName(localizedProduct, "CZ")).toBe("Glazovací dílna");
    expect(
      getCartProductName(
        { ...localizedProduct, title: "Customer-facing session" },
        "EN",
      ),
    ).toBe("Glazing Lab");
    expect(
      getCartProductName(
        {
          title: "Rezervace studia",
          product: { kind: "open-studio" },
        },
        "EN",
        { studioBooking: "Studio booking", openStudio: "Open Studio" },
      ),
    ).toBe("Studio booking");
    expect(
      getCartProductName(
        { title: "Open Studio", product: { kind: "open-studio" } },
        "CZ",
        { studioBooking: "Rezervace studia", openStudio: "Otevřený ateliér" },
      ),
    ).toBe("Otevřený ateliér");
  });

  it("uses the selected locale and localized defaults for cart product labels", () => {
    expect(
      getCartProductName(
        {
          product: {
            name: { el: "Μάθημα φωτογραφίας", en: "Photography class" },
          },
        },
        "el",
      ),
    ).toBe("Μάθημα φωτογραφίας");
    expect(
      getCartProductName(
        { product: { kind: "open-studio" }, title: "Studio booking" },
        "tr",
        { studioBooking: "Stüdyo rezervasyonu" },
      ),
    ).toBe("Stüdyo rezervasyonu");
    expect(
      getCartProductName({}, "tr", { studioBooking: "Stüdyo rezervasyonu" }),
    ).toBe("Stüdyo rezervasyonu");
  });

  it("provides natural English and Czech order copy", () => {
    expect(getCartCopy("EN")).toMatchObject({
      eyebrow: "Your order",
      title: "Review your booking",
      secureCheckout: "Secure checkout",
      continueToPayment: "Continue to payment",
      payWithCredits: "Pay with credits",
    });
    expect(getCartCopy("CZ")).toMatchObject({
      eyebrow: "Vaše objednávka",
      title: "Zkontrolujte rezervaci",
      secureCheckout: "Bezpečná platba",
      continueToPayment: "Pokračovat k platbě",
      payWithCredits: "Zaplatit kredity",
    });
    expect(getCartItemCountLabel(1, "EN")).toBe("1 item");
    expect(getCartItemCountLabel(3, "CZ")).toBe("3 položky");
    expect(getCartItemCountLabel(5, "CZ")).toBe("5 položek");
  });

  it("uses tenant styling, premium hierarchy and one responsive checkout action", () => {
    const source = readSource("src/components/modals/CartModal.js");

    expect(source).toContain("style={tenantTheme.style}");
    expect(source).toContain("font-serif");
    expect(source).toContain("data-cart-modal");
    expect(source).toContain("data-cart-items");
    expect(source).toContain("data-cart-summary");
    expect(source).toContain('data-cart-checkout="persistent"');
    expect(source.match(/data-cart-checkout=/g)).toHaveLength(1);
    expect(source).toContain("data-cart-checkout-footer");
    expect(source).toContain("lg:max-w-[330px]");
    expect(source).toContain("compact");
    expect(source).not.toContain("bg-wood-100");
  });

  it("protects mobile controls and processing feedback", () => {
    const source = readSource("src/components/modals/CartModal.js");

    expect(source).toContain("data-cart-scroll-region");
    expect(source).toContain("data-cart-checkout-footer");
    expect(source).toContain("env(safe-area-inset-bottom)");
    expect(source).toContain("data-cart-processing");
    expect(source).toContain('aria-live="assertive"');
    expect(source).toContain("motion-reduce:animate-none");
    expect(source).toContain("motion-reduce:transition-none");
  });

  it("presents card and credits as accessible tenant-themed choices", () => {
    const source = readSource(
      "src/components/credits/PaymentMethodSelector.js",
    );
    const creditSource = readSource(
      "src/components/credits/CartCreditSummary.js",
    );

    expect(source).toContain("data-payment-method-selector");
    expect(source).toContain('data-payment-method="card"');
    expect(source).toContain('data-payment-method="credits"');
    expect(source).toContain('aria-pressed={paymentMethod === "card"}');
    expect(source).toContain("var(--tenant-accent)");
    expect(source).toContain("data-credit-coverage");
    expect(source).toContain("disabled:opacity-80");
    expect(source).toContain("data-credit-shortfall");
    expect(source).not.toContain('available: "Available balance"');
    expect(source).not.toContain("bg-yellow-50");
    expect(creditSource).toContain("data-cart-credit-compact");
    expect(creditSource).toContain("maximumFractionDigits: 0");
  });
});
