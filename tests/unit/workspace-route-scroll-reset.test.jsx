import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/app/products",
  search: "",
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

import WorkspaceRouteScrollReset from "@/components/dashboard/WorkspaceRouteScrollReset";

describe("WorkspaceRouteScrollReset", () => {
  let animationFrames;
  let nextAnimationFrameId;

  const flushAnimationFrames = () => {
    while (animationFrames.size > 0) {
      const frames = Array.from(animationFrames.entries());
      animationFrames.clear();

      frames.forEach(([, callback]) => callback(0));
    }
  };

  beforeEach(() => {
    navigation.pathname = "/app/products";
    navigation.search = "";
    document.documentElement.style.scrollBehavior = "smooth";
    document.body.style.scrollBehavior = "";
    animationFrames = new Map();
    nextAnimationFrameId = 0;
    window.requestAnimationFrame = vi.fn((callback) => {
      nextAnimationFrameId += 1;
      animationFrames.set(nextAnimationFrameId, callback);

      return nextAnimationFrameId;
    });
    window.cancelAnimationFrame = vi.fn((frameId) => {
      animationFrames.delete(frameId);
    });
    window.scrollTo = vi.fn(() => {
      expect(document.documentElement.style.scrollBehavior).toBe("auto");
      expect(document.body.style.scrollBehavior).toBe("auto");
    });
  });

  it("resets document scroll immediately and after pathname changes settle", () => {
    const { rerender } = render(<WorkspaceRouteScrollReset />);

    expect(window.scrollTo).toHaveBeenCalledOnce();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");

    flushAnimationFrames();
    expect(window.scrollTo).toHaveBeenCalledTimes(3);

    window.scrollTo.mockClear();
    navigation.pathname = "/app/bookings";
    rerender(<WorkspaceRouteScrollReset />);

    expect(window.scrollTo).toHaveBeenCalledOnce();
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");

    flushAnimationFrames();
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
  });

  it("resets when a query-backed workspace section changes", () => {
    navigation.pathname = "/app/operations";
    navigation.search = "section=inventory";
    const { rerender } = render(<WorkspaceRouteScrollReset />);

    flushAnimationFrames();
    window.scrollTo.mockClear();

    navigation.search = "section=statistics";
    rerender(<WorkspaceRouteScrollReset />);

    expect(window.scrollTo).toHaveBeenCalledOnce();

    flushAnimationFrames();
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
  });

  it("does not reset again when only non-navigation page state changes", () => {
    navigation.search = "action=create";
    const { rerender } = render(<WorkspaceRouteScrollReset />);

    flushAnimationFrames();
    window.scrollTo.mockClear();

    navigation.search = "action=edit&id=piece-1";
    rerender(<WorkspaceRouteScrollReset />);

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
