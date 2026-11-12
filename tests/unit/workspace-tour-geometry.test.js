import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getWorkspaceTourPanelStyle,
  getWorkspaceTourResponsiveSelectors,
  isCompactWorkspaceTourViewport,
  workspaceTourPanelMaxHeight,
} from "@/components/tours/workspaceTourGeometry";

const setViewport = ({ coarse = false, height, width }) => {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  window.matchMedia = vi.fn((query) => ({
    matches: query === "(pointer: coarse)" ? coarse : false,
  }));
};

describe("workspace tour mobile geometry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps portrait phones inside safe-area-aware edges", () => {
    setViewport({ coarse: true, height: 700, width: 320 });

    expect(isCompactWorkspaceTourViewport()).toBe(true);
    expect(
      getWorkspaceTourPanelStyle({ panelHeight: 300, panelWidth: 388 }),
    ).toEqual({
      bottom: "max(12px, env(safe-area-inset-bottom))",
      left: "max(12px, env(safe-area-inset-left))",
      right: "max(12px, env(safe-area-inset-right))",
    });
    expect(workspaceTourPanelMaxHeight).toContain("safe-area-inset-bottom");
  });

  it("treats landscape phones as compact and places the panel above low targets", () => {
    setViewport({ coarse: true, height: 390, width: 844 });

    const style = getWorkspaceTourPanelStyle({
      panelHeight: 170,
      panelWidth: 388,
      target: {
        bottom: 370,
        height: 44,
        left: 24,
        right: 68,
        top: 326,
        width: 44,
      },
    });

    expect(isCompactWorkspaceTourViewport()).toBe(true);
    expect(style.top).toBe(144);
    expect(style).not.toHaveProperty("bottom");
  });

  it("keeps coarse-pointer tablets and touch laptops on measured panel geometry", () => {
    setViewport({ coarse: true, height: 768, width: 1024 });

    expect(isCompactWorkspaceTourViewport()).toBe(false);
    expect(
      getWorkspaceTourPanelStyle({ panelHeight: 300, panelWidth: 388 }),
    ).toMatchObject({ width: 388 });
  });

  it("switches to viewport-specific targets below the desktop sidebar breakpoint", () => {
    const step = {
      mobileSelectors: ["[data-mobile]"],
      selectors: ["[data-desktop]"],
    };

    setViewport({ height: 844, width: 390 });
    expect(getWorkspaceTourResponsiveSelectors(step)).toEqual([
      "[data-mobile]",
    ]);

    setViewport({ height: 900, width: 1280 });
    expect(getWorkspaceTourResponsiveSelectors(step)).toEqual([
      "[data-desktop]",
    ]);
  });
});
