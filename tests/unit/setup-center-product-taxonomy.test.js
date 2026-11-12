import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getProductFormCloseHref,
  isGuidedProductSetupStep,
} from "@/components/products/products.navigation";

describe("Setup Center product taxonomy", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/setup-center/SetupCenterPage.js"),
    "utf8",
  );

  it("offers only product kinds that satisfy bookable-offer readiness", () => {
    const choicesSource = source.slice(
      source.indexOf("const BOOKABLE_OFFER_CHOICES"),
      source.indexOf("const getInactiveSetupHref"),
    );

    expect(choicesSource).toContain('"open-studio"');
    expect(choicesSource).toContain('["class", "classes", "class", "class"]');
    expect(choicesSource).not.toContain('"membership"');
    expect(choicesSource).not.toContain('"voucher"');
    expect(choicesSource).not.toContain('"private-studio"');

    expect(source).not.toContain('["course", "course", "course"]');
    expect(source).not.toContain('["workshop", "workshop", "workshop"]');
    expect(source).not.toContain('["privateSession", "service"');
  });

  it("ignores obsolete specialist setup steps", () => {
    expect(isGuidedProductSetupStep("piece_pricing")).toBe(false);
    expect(getProductFormCloseHref("piece_pricing", "openStudio")).toBe(
      "/app/products?category=openStudio",
    );
  });
});
