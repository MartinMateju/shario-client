import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useWorkspaceTourLayout from "@/components/tours/useWorkspaceTourLayout";

describe("workspace tour target tracking", () => {
  let target;
  let top;
  let now;
  let frames;
  let nextFrame;

  const flushFrame = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    act(() => callbacks.forEach((callback) => callback(now)));
  };

  const renderLayout = () =>
    renderHook(
      ({ active, selector = "[data-layout-target]" }) =>
        useWorkspaceTourLayout({
          active,
          selectors: [selector],
        }),
      { initialProps: { active: true } },
    );

  beforeEach(() => {
    top = 100;
    now = 0;
    frames = new Map();
    nextFrame = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 700,
    });
    target = document.createElement("div");
    target.dataset.layoutTarget = "true";
    target.getBoundingClientRect = vi.fn(() => ({
      bottom: top + 100,
      height: 100,
      left: 20,
      right: 300,
      top,
      width: 280,
    }));
    target.scrollIntoView = vi.fn(() => {
      top = 100;
    });
    document.body.append(target);
  });

  afterEach(() => {
    target.remove();
  });

  it("follows a position-only layout shift without a target resize or scroll event", () => {
    const { result } = renderLayout();
    flushFrame();
    expect(result.current.targetRect.top).toBe(92);

    top = 108;
    now = 1000;
    flushFrame();
    expect(result.current.targetRect.top).toBe(100);
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("finishes initial reveal when route layout moves the target outside the viewport", () => {
    const { result } = renderLayout();
    flushFrame();

    top = 702;
    now = 100;
    flushFrame();
    flushFrame();

    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(target.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "instant",
      block: "center",
      inline: "nearest",
    });
    expect(result.current.targetRect.top).toBe(92);
  });

  it("reveals the same target after a late hydration shift without user input", () => {
    const { result } = renderLayout();
    flushFrame();
    top = 900;
    now = 1000;
    flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(result.current.targetRect.top).toBe(92);
  });

  it("recovers when layout restores the original offscreen position before the next frame", () => {
    top = 900;
    const { result } = renderLayout();
    flushFrame();
    expect(result.current.targetRect.top).toBe(92);

    // The reveal succeeded synchronously, but route/modal layout restored the
    // exact pre-scroll position before tracking could sample the visible state.
    top = 900;
    now = 1000;
    flushFrame();
    flushFrame();

    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(result.current.targetRect.top).toBe(92);
  });

  it("does not repeat a partially effective reveal at unchanged unreachable geometry", () => {
    top = 900;
    target.scrollIntoView.mockImplementation(() => {
      top = 800;
    });
    renderLayout();
    for (let index = 0; index < 10; index += 1) flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("waits for moving layout to settle before revealing the target again", () => {
    renderLayout();
    flushFrame();
    now = 1000;
    for (const position of [900, 920, 940, 960]) {
      top = position;
      flushFrame();
      expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    }
    flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("does not repeatedly scroll unreachable geometry, but retries changed layout", () => {
    target.scrollIntoView.mockImplementation(() => {});
    top = 900;
    renderLayout();
    for (let index = 0; index < 10; index += 1) flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);

    now = 1000;
    top = 950;
    for (let index = 0; index < 10; index += 1) flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it.each(["wheel", "touchmove", "pointerdown", "keydown"])(
    "respects deliberate %s input instead of correcting a later offscreen target",
    (eventName) => {
      renderLayout();
      flushFrame();
      act(() =>
        window.dispatchEvent(
          eventName === "keydown"
            ? new KeyboardEvent("keydown", { key: "PageDown" })
            : new Event(eventName),
        ),
      );
      top = 900;
      now = 1000;
      flushFrame();
      flushFrame();
      expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    },
  );

  it("preserves user scrolling when the guide panel changes height", () => {
    let resizePanel;
    let panelHeight = 250;
    vi.spyOn(globalThis, "ResizeObserver").mockImplementation(
      function (callback) {
        resizePanel = callback;
        return { observe: vi.fn(), disconnect: vi.fn() };
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ height: panelHeight, width: 296 }),
    );
    function Layout() {
      const { panelRef } = useWorkspaceTourLayout({
        active: true,
        selectors: ["[data-layout-target]"],
      });
      return <div ref={panelRef} />;
    }
    render(<Layout />);
    flushFrame();
    act(() => window.dispatchEvent(new Event("wheel")));

    panelHeight = 400;
    act(() => resizePanel());
    top = 900;
    flushFrame();
    flushFrame();

    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("replaces the previous frame when a step selects a new target", () => {
    const { rerender } = renderLayout();
    flushFrame();
    const previousFrame = [...frames.keys()][0];
    target.dataset.nextLayoutTarget = "true";

    rerender({ active: true, selector: "[data-next-layout-target]" });
    expect(frames.has(previousFrame)).toBe(false);
    expect(frames.size).toBe(1);
    flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("retains unchanged geometry and cancels pending tracking on close and unmount", () => {
    const { result, rerender, unmount } = renderLayout();
    flushFrame();
    const rectangle = result.current.targetRect;
    flushFrame();
    expect(result.current.targetRect).toBe(rectangle);
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(1);

    rerender({ active: false });
    expect(frames.size).toBe(0);
    expect(result.current.targetRect).toBeNull();
    rerender({ active: true });
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });
});
