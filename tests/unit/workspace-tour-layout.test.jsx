import { act, renderHook } from "@testing-library/react";
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

    expect(target.scrollIntoView).toHaveBeenCalledTimes(2);
    expect(target.scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "instant",
      block: "center",
      inline: "nearest",
    });
    expect(result.current.targetRect.top).toBe(92);
  });

  it("does not keep scrolling offscreen targets after initial reveal", () => {
    renderLayout();
    flushFrame();
    top = 900;
    now = 1000;
    flushFrame();
    expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it.each(["wheel", "touchmove", "pointerdown", "keydown"])(
    "respects deliberate %s input during initial reveal",
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
      now = 100;
      flushFrame();
      expect(target.scrollIntoView).toHaveBeenCalledTimes(1);
    },
  );

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
