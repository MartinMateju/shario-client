import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cartReducer, { addToCart } from "@/lib/features/cart/cartSlice";
import { selectCartCount } from "@/components/headers/header.utils";
import { isCustomerPortalHrefEnabled } from "@/components/customer-shell/customerPortalVisibility";
import {
  buildLocationForm,
  buildLocationPayload,
} from "@/components/views/locations/locationForm.utils";
import { buildWorkspaceWorkflowIntent } from "@/components/views/settings/workspaceWorkflowQuestions";

describe("Shario shared-space scope", () => {
  it.each([
    { type: "pottery-piece" },
    { potteryPieceId: "old-piece" },
    { kind: "pottery-piece" },
  ])("rejects legacy specialist cart rows %j", (row) => {
    const initial = {
      cart: [{ id: "booking", product: { id: "room" } }],
      isOpen: false,
    };
    expect(cartReducer(initial, addToCart({ cartItem: row }))).toEqual(initial);
    expect(selectCartCount({ cart: { cart: [...initial.cart, row] } })).toBe(1);
  });
  it.each(["/portal/work", "/portal/lost-found"])(
    "does not expose removed customer route %s",
    (href) => {
      expect(isCustomerPortalHrefEnabled({}, href)).toBe(false);
    },
  );
  it("retains generic bookings, memberships, credits and help", () => {
    for (const href of [
      "/portal/bookings",
      "/portal/membership",
      "/portal/credits",
      "/portal/knowledge",
    ])
      expect(isCustomerPortalHrefEnabled({}, href)).toBe(true);
  });
  it("writes generic location and workflow configuration", () => {
    const payload = buildLocationPayload(
      buildLocationForm({
        name: "Shared office",
        pricingMode: "piece",
        firingSettings: { collectionDeadlineDays: 12 },
      }),
    );
    expect(payload.pricingMode).toBe("time");
    expect(payload).not.toHaveProperty("firingSettings");
    const intent = buildWorkspaceWorkflowIntent({
      sharedStudio: true,
      memberships: true,
    });
    expect(intent).toMatchObject({
      pricingMode: "time",
      answers: { sharedStudio: true, memberships: true },
    });
    expect(intent.answers).not.toHaveProperty("firingServices");
  });
  it("has no specialist API slices or active routes", () => {
    for (const feature of [
      "firings",
      "kilns",
      "potteryPieces",
      "studioFlowProfiles",
      "lostFound",
    ])
      expect(existsSync(`src/lib/features/${feature}`)).toBe(false);
    for (const route of ["firings", "pieces", "lost-found"])
      expect(
        existsSync(
          `src/app/[locale]/tenants/[tenantSlug]/app/(workspace)/${route}`,
        ),
      ).toBe(false);
    expect(
      existsSync(
        "src/app/[locale]/tenants/[tenantSlug]/(studio-grohovka-public)",
      ),
    ).toBe(false);
  });
});
