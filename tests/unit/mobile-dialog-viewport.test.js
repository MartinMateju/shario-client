import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMobileDialogViewport } from "@/hooks/useMobileDialogViewport";

function mobileViewport() {
  const viewport = Object.assign(new EventTarget(), {
    height: 844,
    offsetTop: 0,
    scale: 1,
  });
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("visualViewport", viewport);
  return viewport;
}

afterEach(() => vi.unstubAllGlobals());

describe("mobile dialog visible viewport", () => {
  it("keeps actions above the keyboard and follows viewport panning", () => {
    const viewport = mobileViewport();
    const { result } = renderHook(() => useMobileDialogViewport(true));
    expect(result.current).toEqual({ height: 844, top: 0 });
    act(() => {
      viewport.height = 380;
      viewport.offsetTop = 20;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toEqual({ height: 380, top: 20 });
    act(() => {
      viewport.offsetTop = 40;
      viewport.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toEqual({ height: 380, top: 40 });
    act(() => {
      viewport.height = 844;
      viewport.offsetTop = 0;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toEqual({ height: 844, top: 0 });
  });

  it("preserves desktop sizing and does not fight pinch zoom", () => {
    const viewport = mobileViewport();
    const { result } = renderHook(() => useMobileDialogViewport(true));
    act(() => {
      vi.stubGlobal("innerWidth", 1280);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBeNull();
    act(() => {
      vi.stubGlobal("innerWidth", 390);
      viewport.scale = 2;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBeNull();
  });

  it("cleans up listeners when closed and measures afresh when reopened", () => {
    const viewport = mobileViewport();
    const remove = vi.spyOn(viewport, "removeEventListener");
    const { result, rerender, unmount } = renderHook(
      ({ open }) => useMobileDialogViewport(open),
      { initialProps: { open: true } },
    );
    rerender({ open: false });
    expect(result.current).toBeNull();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    viewport.height = 700;
    rerender({ open: true });
    expect(result.current).toEqual({ height: 700, top: 0 });
    unmount();
    expect(remove).toHaveBeenCalledTimes(4);
  });

  it("uses the existing CSS sizing when visualViewport is unavailable", () => {
    vi.stubGlobal("visualViewport", undefined);
    const { result } = renderHook(() => useMobileDialogViewport(true));
    expect(result.current).toBeNull();
  });
});
