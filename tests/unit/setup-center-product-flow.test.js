import { describe, expect, it } from "vitest";

import {
  BOOKABLE_OFFER_SETUP_STEP,
  MEMBERSHIP_SETUP_STEP,
  getProductFormCloseHref,
  isGuidedProductSetupStep,
} from "@/components/products/products.navigation";
import {
  getPrimaryAction,
  hasCoreBookableOffer,
} from "@/components/setup-center/setupCenter.utils";

const offerStep = ({
  status = "incomplete",
  checks = [],
  actions = [],
} = {}) => ({
  id: BOOKABLE_OFFER_SETUP_STEP,
  status,
  checks,
  actions,
});

describe("guided bookable-offer product flow", () => {
  it("returns guided product saves and cancellations to the active setup step", () => {
    expect(getProductFormCloseHref(BOOKABLE_OFFER_SETUP_STEP)).toBe(
      "/app/setup?step=bookable_offer",
    );
    expect(getProductFormCloseHref("")).toBe("/app/products");
    expect(getProductFormCloseHref("studio")).toBe("/app/products");
  });

  it("keeps draft membership creation in the guided real-app flow", () => {
    expect(getProductFormCloseHref(MEMBERSHIP_SETUP_STEP, "memberships")).toBe(
      "/app/memberships?setupStep=membership",
    );
    expect(isGuidedProductSetupStep(MEMBERSHIP_SETUP_STEP)).toBe(true);
    expect(isGuidedProductSetupStep(BOOKABLE_OFFER_SETUP_STEP)).toBe(true);
    expect(isGuidedProductSetupStep("studio")).toBe(false);
  });

  it("recognizes core product readiness independently from course scheduling", () => {
    expect(
      hasCoreBookableOffer(
        offerStep({
          checks: [
            { id: "activity", complete: true },
            { id: "capacity", complete: true },
            { id: "price", complete: true },
            { id: "availability", complete: false },
            { id: "location", complete: true },
          ],
        }),
      ),
    ).toBe(true);

    expect(
      hasCoreBookableOffer(
        offerStep({
          checks: [
            { id: "activity", complete: true },
            { id: "capacity", complete: false },
            { id: "price", complete: true },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("selects scheduling as the primary course remediation when creation is disabled", () => {
    const create = {
      key: "create_offer",
      enabled: false,
      href: "/app/products?action=create&setupStep=bookable_offer",
    };
    const schedule = {
      key: "schedule_offer",
      enabled: true,
      href:
        "/app/bookings/new?setupStep=bookable_offer" +
        "&productId=product-1&locationId=location-1&isRoot=true",
    };

    expect(
      getPrimaryAction(offerStep({ actions: [create, schedule] })),
    ).toEqual(schedule);
  });
});
