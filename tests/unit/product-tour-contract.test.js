import { describe, expect, it, vi } from "vitest";

import {
  PRODUCT_TOUR_STEPS,
  buildProductTourEvent,
  findProductTourTarget,
  getProductTourStepSelectors,
  getProductTourViewport,
} from "@/components/product-tour/productTour.config";

describe("product tour contract", () => {
  it("uses six distinct server-safe step event names", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(6);
    expect(PRODUCT_TOUR_STEPS.map(({ key }) => key)).toEqual([
      "overview",
      "launch_center",
      "studio_switcher",
      "navigation",
      "ai_assistant",
      "settings",
    ]);
    expect(new Set(PRODUCT_TOUR_STEPS.map(({ event }) => event)).size).toBe(6);
  });

  it("builds bounded telemetry without account or studio identifiers", () => {
    const event = buildProductTourEvent({
      entryPoint: "automatic",
      event: "product_tour_navigation_viewed",
      position: 4,
      sessionId: "tour_session_01",
      step: "navigation",
      studioCount: 2,
    });

    expect(event).toMatchObject({
      sessionId: "tour_session_01",
      event: "product_tour_navigation_viewed",
      source: "product_tour",
      metadata: {
        tourVersion: 1,
        tourStep: "navigation",
        tourEntryPoint: "automatic",
        position: 4,
        total: 6,
        studioCount: 2,
      },
    });
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(JSON.stringify(event)).not.toMatch(
      /email|tenantId|userId|studioId|name/i,
    );
  });

  it("selects the first visible target and classifies viewports", () => {
    const hidden = document.createElement("div");
    hidden.dataset.productTourTarget = "test";
    const visible = document.createElement("div");
    visible.dataset.productTourTarget = "test";
    hidden.getBoundingClientRect = vi.fn(() => ({
      width: 0,
      height: 0,
    }));
    visible.getBoundingClientRect = vi.fn(() => ({
      width: 120,
      height: 44,
    }));
    document.body.append(hidden, visible);

    expect(findProductTourTarget(['[data-product-tour-target="test"]'])).toBe(
      visible,
    );
    expect(getProductTourViewport(390)).toBe("mobile");
    expect(getProductTourViewport(800)).toBe("tablet");
    expect(getProductTourViewport(1440)).toBe("desktop");
  });

  it("uses the visible mobile navigation trigger for sidebar-only steps", () => {
    for (const key of [
      "launch_center",
      "studio_switcher",
      "navigation",
      "settings",
    ]) {
      const step = PRODUCT_TOUR_STEPS.find((item) => item.key === key);
      expect(getProductTourStepSelectors(step, 390)).toEqual([
        "[data-mobile-navigation-trigger]",
      ]);
      expect(getProductTourStepSelectors(step, 1280)).toEqual(step.selectors);
    }
  });
});
