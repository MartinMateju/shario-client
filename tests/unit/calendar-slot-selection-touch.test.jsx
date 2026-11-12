import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CalendarSlotSelection from "@/components/calendar/CalendarSlotSelection";
import useCalendarSlotSelection from "@/components/calendar/useCalendarSlotSelection";

const day = new Date("2026-08-05T00:00:00.000Z");
const openingWindow = {
  isOpen: true,
  openMinutes: 8 * 60,
  closeMinutes: 20 * 60,
};

const installPointerCapture = (element) => {
  let capturedPointer = null;
  element.setPointerCapture = vi.fn((pointerId) => {
    capturedPointer = pointerId;
  });
  element.hasPointerCapture = vi.fn(
    (pointerId) => capturedPointer === pointerId,
  );
  element.releasePointerCapture = vi.fn((pointerId) => {
    if (capturedPointer === pointerId) capturedPointer = null;
  });
};

function SelectionHookHarness() {
  const slotSelection = useCalendarSlotSelection({
    enabled: true,
    scopeKey: "studio:week",
    startMinute: 8 * 60,
    pixelsPerMinute: 2,
    stepMinutes: 30,
    minimumMinutes: 60,
    maximumMinutes: 180,
  });

  return (
    <>
      <button
        type="button"
        onClick={() =>
          slotSelection.selectRange({
            day,
            openingWindow,
            selectionKey: "2026-08-05",
            anchorMinute: 9 * 60,
          })
        }
      >
        Select
      </button>
      <div data-testid="calendar-scroll" style={{ overflowY: "auto" }}>
        <div
          data-testid="create-target"
          onPointerDown={(event) =>
            slotSelection.beginSelection(event, {
              day,
              openingWindow,
              selectionKey: "2026-08-05",
            })
          }
          onPointerMove={slotSelection.updateSelection}
          onPointerUp={slotSelection.finishSelection}
          onPointerCancel={slotSelection.cancelSelection}
        />
        <div
          data-testid="move-target"
          onPointerDown={slotSelection.beginMove}
          onPointerMove={slotSelection.updateMove}
          onPointerUp={slotSelection.finishMove}
          onPointerCancel={slotSelection.cancelMove}
        />
        <button
          type="button"
          data-testid="resize-target"
          onPointerDown={(event) => slotSelection.beginResize(event, "end")}
          onPointerMove={slotSelection.updateResize}
          onPointerUp={slotSelection.finishResize}
          onPointerCancel={slotSelection.cancelResize}
        >
          Resize
        </button>
      </div>
      <output data-testid="selection-state">
        {slotSelection.selection
          ? JSON.stringify({
              startMinute: slotSelection.selection.startMinute,
              endMinute: slotSelection.selection.endMinute,
              phase: slotSelection.selection.phase,
            })
          : "none"}
      </output>
    </>
  );
}

const readSelection = () =>
  JSON.parse(screen.getByTestId("selection-state").textContent);

// Drag auto-scroll starts once the pointer has rested near an edge this long.
const AUTO_SCROLL_DELAY_MS = 200;
const runFrames = (frames, count, from = 0) => {
  act(() => {
    for (let index = 0; index < count; index += 1) {
      frames.shift()?.(from + index * 16);
    }
  });
};

describe("calendar draft touch interaction", () => {
  it("keeps ordinary grid touch native while preserving desktop drag-create", () => {
    render(<SelectionHookHarness />);
    const grid = screen.getByTestId("create-target");
    installPointerCapture(grid);
    vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 1440,
      left: 0,
      right: 160,
      width: 160,
      height: 1440,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(grid, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientY: 120,
    });
    fireEvent.pointerMove(grid, {
      pointerId: 2,
      pointerType: "touch",
      buttons: 1,
      clientY: 360,
    });
    fireEvent.pointerUp(grid, {
      pointerId: 2,
      pointerType: "touch",
      clientY: 360,
    });
    expect(screen.getByTestId("selection-state")).toHaveTextContent("none");
    expect(grid.setPointerCapture).not.toHaveBeenCalled();

    fireEvent.pointerDown(grid, {
      pointerId: 3,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientY: 120,
    });
    fireEvent.pointerMove(grid, {
      pointerId: 3,
      pointerType: "mouse",
      buttons: 1,
      clientY: 360,
    });
    fireEvent.pointerUp(grid, {
      pointerId: 3,
      pointerType: "mouse",
      clientY: 360,
    });
    expect(readSelection()).toEqual({
      startMinute: 540,
      endMinute: 660,
      phase: "ready",
    });
  });

  it("resizes a draft with a captured touch pointer", () => {
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const handle = screen.getByTestId("resize-target");
    installPointerCapture(handle);
    fireEvent.pointerDown(handle, {
      pointerId: 4,
      pointerType: "touch",
      button: 0,
      clientY: 100,
    });
    expect(readSelection()).toEqual({
      startMinute: 540,
      endMinute: 600,
      phase: "resizing",
    });

    fireEvent.pointerMove(handle, {
      pointerId: 4,
      pointerType: "touch",
      buttons: 0,
      clientY: 160,
    });
    expect(readSelection()).toEqual({
      startMinute: 540,
      endMinute: 630,
      phase: "resizing",
    });

    fireEvent.pointerUp(handle, {
      pointerId: 4,
      pointerType: "touch",
      clientY: 160,
    });
    expect(readSelection()).toEqual({
      startMinute: 540,
      endMinute: 630,
      phase: "ready",
    });
    expect(handle.setPointerCapture).toHaveBeenCalledWith(4);
    expect(handle.releasePointerCapture).toHaveBeenCalledWith(4);
  });

  it("moves only the active draft and restores it when the gesture cancels", () => {
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const draft = screen.getByTestId("move-target");
    installPointerCapture(draft);
    fireEvent.pointerDown(draft, {
      pointerId: 8,
      pointerType: "touch",
      button: 0,
      clientY: 100,
    });
    fireEvent.pointerMove(draft, {
      pointerId: 8,
      pointerType: "touch",
      buttons: 0,
      clientY: 160,
    });
    expect(readSelection()).toEqual({
      startMinute: 570,
      endMinute: 630,
      phase: "moving",
    });

    fireEvent.pointerCancel(draft, {
      pointerId: 8,
      pointerType: "touch",
    });
    expect(readSelection()).toEqual({
      startMinute: 540,
      endMinute: 600,
      phase: "ready",
    });
  });

  it("auto-scrolls the nearest calendar body and includes scrolling in the draft move", () => {
    const frames = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const scroller = screen.getByTestId("calendar-scroll");
    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 200 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, value: 100, writable: true },
    });
    vi.spyOn(scroller, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 200,
      left: 0,
      right: 320,
      width: 320,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const draft = screen.getByTestId("move-target");
    installPointerCapture(draft);
    fireEvent.pointerDown(draft, {
      pointerId: 14,
      pointerType: "touch",
      button: 0,
      clientY: 100,
    });
    fireEvent.pointerMove(draft, {
      pointerId: 14,
      pointerType: "touch",
      buttons: 0,
      clientY: 160,
    });
    expect(readSelection().startMinute).toBe(570);

    // Resting near the edge does not scroll straight away.
    runFrames(frames, 12);
    expect(scroller.scrollTop).toBe(100);
    runFrames(frames, 5, AUTO_SCROLL_DELAY_MS);

    expect(scroller.scrollTop).toBeGreaterThan(100);
    expect(readSelection()).toEqual({
      startMinute: 600,
      endMinute: 660,
      phase: "moving",
    });

    fireEvent.pointerUp(draft, {
      pointerId: 14,
      pointerType: "touch",
      clientY: 160,
    });
    expect(readSelection().phase).toBe("ready");
  });

  it("auto-scrolls the page when the calendar body delegates vertical scrolling", () => {
    const frames = [];
    let pageScrollTop = 100;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => pageScrollTop);
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(({ top, behavior }) => {
        // The page uses scroll-behavior: smooth, so any other behavior would
        // only start an animation and leave the position unchanged for now.
        if (behavior === "instant") pageScrollTop += Number(top || 0);
      });
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const draft = screen.getByTestId("move-target");
    installPointerCapture(draft);
    fireEvent.pointerDown(draft, {
      pointerId: 16,
      pointerType: "touch",
      button: 0,
      clientY: window.innerHeight - 100,
    });
    fireEvent.pointerMove(draft, {
      pointerId: 16,
      pointerType: "touch",
      buttons: 0,
      clientY: window.innerHeight - 24,
    });

    runFrames(frames, 12);
    expect(scrollBy).not.toHaveBeenCalled();
    runFrames(frames, 5, AUTO_SCROLL_DELAY_MS);

    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
    expect(scrollBy.mock.calls.length).toBeGreaterThan(1);
    expect(pageScrollTop).toBeGreaterThan(100);
    expect(readSelection().startMinute).toBeGreaterThan(570);

    fireEvent.pointerUp(draft, {
      pointerId: 16,
      pointerType: "touch",
      clientY: window.innerHeight - 24,
    });
    expect(readSelection().phase).toBe("ready");
  });

  it("starts upward page auto-scroll below calendar chrome stuck over the page", () => {
    const frames = [];
    let pageScrollTop = 600;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => pageScrollTop);
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(({ top, behavior }) => {
        if (behavior === "instant") pageScrollTop += Number(top || 0);
      });
    const rect = (top, bottom) => ({
      top,
      bottom,
      left: 0,
      right: 390,
      width: 390,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    });
    render(
      <section data-calendar-shell="true">
        <div data-calendar-command-bar="true" style={{ position: "sticky" }} />
        <div data-calendar-grid-header="true" style={{ position: "sticky" }} />
        <SelectionHookHarness />
      </section>,
    );
    vi.spyOn(
      document.querySelector("[data-calendar-command-bar]"),
      "getBoundingClientRect",
    ).mockReturnValue(rect(0, 120));
    vi.spyOn(
      document.querySelector("[data-calendar-grid-header]"),
      "getBoundingClientRect",
    ).mockReturnValue(rect(120, 164));
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const draft = screen.getByTestId("move-target");
    installPointerCapture(draft);
    // The 09:00 draft keeps room to move up while the finger rests just below
    // the stuck toolbar and day header, past the old 64px zone at the top.
    fireEvent.pointerDown(draft, {
      pointerId: 17,
      pointerType: "touch",
      button: 0,
      clientY: 220,
    });
    fireEvent.pointerMove(draft, {
      pointerId: 17,
      pointerType: "touch",
      buttons: 0,
      clientY: 180,
    });

    runFrames(frames, 12);
    expect(scrollBy).not.toHaveBeenCalled();
    runFrames(frames, 5, AUTO_SCROLL_DELAY_MS);

    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
    expect(scrollBy.mock.calls[0][0].top).toBeLessThan(0);
    expect(pageScrollTop).toBeLessThan(600);

    fireEvent.pointerUp(draft, {
      pointerId: 17,
      pointerType: "touch",
      clientY: 180,
    });
    expect(readSelection().phase).toBe("ready");
  });

  it("waits for a drag to rest near the edge before scrolling", () => {
    const frames = [];
    let pageScrollTop = 100;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => pageScrollTop);
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(({ top, behavior }) => {
        if (behavior === "instant") pageScrollTop += Number(top || 0);
      });
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const handle = screen.getByTestId("resize-target");
    installPointerCapture(handle);
    fireEvent.pointerDown(handle, {
      pointerId: 22,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientY: window.innerHeight - 100,
    });
    // A slow drag spends longer than the wait inside the edge zone, but it
    // is still moving, so nothing scrolls under it.
    let time = 0;
    for (const offset of [60, 45, 30]) {
      fireEvent.pointerMove(handle, {
        pointerId: 22,
        pointerType: "mouse",
        buttons: 1,
        clientY: window.innerHeight - offset,
      });
      runFrames(frames, 10, time);
      time += 160;
    }
    expect(scrollBy).not.toHaveBeenCalled();

    // Resting there starts the scroll.
    runFrames(frames, 10, time);
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "instant" }),
    );
    fireEvent.pointerUp(handle, {
      pointerId: 22,
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      clientY: window.innerHeight - 30,
    });
  });

  it("lands a short drag that ends near the edge where it was released", () => {
    const frames = [];
    let pageScrollTop = 100;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => pageScrollTop);
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(({ top, behavior }) => {
        if (behavior === "instant") pageScrollTop += Number(top || 0);
      });
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const handle = screen.getByTestId("resize-target");
    installPointerCapture(handle);
    // A mouse extends the 09:00-10:00 draft by one step and lets go 40px
    // above the bottom of the window, inside the auto-scroll zone.
    fireEvent.pointerDown(handle, {
      pointerId: 21,
      pointerType: "mouse",
      button: 0,
      buttons: 1,
      clientY: window.innerHeight - 100,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 21,
      pointerType: "mouse",
      buttons: 1,
      clientY: window.innerHeight - 40,
    });
    runFrames(frames, 6);
    fireEvent.pointerUp(handle, {
      pointerId: 21,
      pointerType: "mouse",
      button: 0,
      buttons: 0,
      clientY: window.innerHeight - 40,
    });
    runFrames(frames, 20, 100);

    expect(scrollBy).not.toHaveBeenCalled();
    expect(pageScrollTop).toBe(100);
    expect(readSelection()).toEqual({
      startMinute: 540,
      endMinute: 630,
      phase: "ready",
    });
  });

  it("stops auto-scrolling once the dragged selection reaches the closing time", () => {
    const frames = [];
    let pageScrollTop = 100;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => pageScrollTop);
    vi.spyOn(window, "scrollBy").mockImplementation(({ top, behavior }) => {
      if (behavior === "instant") pageScrollTop += Number(top || 0);
    });
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const draft = screen.getByTestId("move-target");
    installPointerCapture(draft);
    fireEvent.pointerDown(draft, {
      pointerId: 19,
      pointerType: "touch",
      button: 0,
      clientY: window.innerHeight - 70,
    });
    fireEvent.pointerMove(draft, {
      pointerId: 19,
      pointerType: "touch",
      buttons: 0,
      clientY: window.innerHeight - 8,
    });

    // Hold the finger at the bottom edge far longer than the board needs.
    act(() => {
      for (let index = 0; index < 400 && frames.length; index += 1) {
        frames.shift()(index * 16);
      }
    });

    const scrolledTo = pageScrollTop;
    expect(readSelection()).toEqual({
      startMinute: 19 * 60,
      endMinute: 20 * 60,
      phase: "moving",
    });
    // The page stopped where the draft clamped instead of carrying it away.
    expect(frames).toHaveLength(0);
    expect(scrolledTo).toBeLessThan(100 + 2 * 12 * 60);

    fireEvent.pointerMove(draft, {
      pointerId: 19,
      pointerType: "touch",
      buttons: 0,
      clientY: window.innerHeight - 6,
    });
    act(() => {
      while (frames.length) frames.shift()(0);
    });
    expect(pageScrollTop).toBe(scrolledTo);

    fireEvent.pointerUp(draft, {
      pointerId: 19,
      pointerType: "touch",
      clientY: window.innerHeight - 6,
    });
    expect(readSelection().phase).toBe("ready");
  });

  it("continues the draft gesture when pointer capture is unavailable", () => {
    render(<SelectionHookHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));

    const draft = screen.getByTestId("move-target");
    draft.setPointerCapture = vi.fn(() => {
      throw new Error("capture unavailable");
    });
    fireEvent.pointerDown(draft, {
      pointerId: 18,
      pointerType: "touch",
      button: 0,
      clientY: 100,
    });
    expect(readSelection().phase).toBe("moving");

    fireEvent.pointerMove(window, {
      pointerId: 18,
      pointerType: "touch",
      buttons: 0,
      clientY: 160,
    });
    fireEvent.pointerUp(window, {
      pointerId: 18,
      pointerType: "touch",
      clientY: 160,
    });
    expect(readSelection()).toEqual({
      startMinute: 570,
      endMinute: 630,
      phase: "ready",
    });
  });

  it("keeps mobile resize handles and inline confirm visible without stealing focus", () => {
    const onMoveBegin = vi.fn();
    const onMoveByStep = vi.fn();
    const onCancel = vi.fn();
    const t = (key, values = {}) =>
      values.time ? `${key} ${values.time}` : key;
    const { container } = render(
      <CalendarSlotSelection
        selection={{
          day,
          openingWindow,
          selectionKey: "2026-08-05",
          startMinute: 9 * 60,
          endMinute: 10 * 60,
          phase: "ready",
        }}
        calendarStartMinute={8 * 60}
        calendarEndMinute={20 * 60}
        pixelsPerMinute={2}
        studio={{ timeZone: "UTC", slotStepMinutes: 30 }}
        locale="en-GB"
        onConfirm={vi.fn()}
        onCancel={onCancel}
        onResizeBegin={vi.fn()}
        onResizeMove={vi.fn()}
        onResizeEnd={vi.fn()}
        onResizeCancel={vi.fn()}
        onResizeByStep={vi.fn()}
        onMoveBegin={onMoveBegin}
        onMoveMove={vi.fn()}
        onMoveEnd={vi.fn()}
        onMoveCancel={vi.fn()}
        onMoveByStep={onMoveByStep}
        audience="customer"
        mobileDeferred
        t={t}
      />,
    );

    const preview = container.querySelector(
      '[data-calendar-slot-preview="true"]',
    );
    const handles = container.querySelectorAll("[data-calendar-slot-resize]");
    const confirm = container.querySelector("[data-calendar-slot-confirm]");

    expect(preview).toHaveClass(
      "pointer-events-auto",
      "cursor-grab",
      "touch-none",
    );
    expect(preview).toHaveAttribute("tabindex", "0");
    expect(handles).toHaveLength(2);
    for (const handle of handles) {
      expect(handle).toHaveClass("inline-flex", "h-11", "w-11", "touch-none");
      expect(handle).not.toHaveClass("hidden");
    }
    expect(confirm).toHaveClass("inline-flex");
    expect(confirm).not.toHaveClass("hidden", "lg:inline-flex");
    // The visible 28px button gains a 44px finger target on touch screens,
    // where it is the only confirmation control at desktop widths.
    expect(confirm).toHaveClass(
      "h-7",
      "w-7",
      "pointer-coarse:before:absolute",
      "pointer-coarse:before:-inset-2",
    );
    expect(confirm).not.toHaveFocus();

    fireEvent.pointerDown(preview, {
      pointerId: 12,
      pointerType: "touch",
      button: 0,
      clientY: 100,
    });
    expect(onMoveBegin).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(preview, { key: "ArrowDown" });
    expect(onMoveByStep).toHaveBeenCalledWith(30);

    fireEvent.keyDown(handles[0], { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("brings a new selection clear of the sticky rail and the Continue bar, but not after a drop", () => {
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const t = (key, values = {}) =>
      values.time ? `${key} ${values.time}` : key;
    const handlers = Object.fromEntries(
      [
        "onConfirm",
        "onCancel",
        "onResizeBegin",
        "onResizeMove",
        "onResizeEnd",
        "onResizeCancel",
        "onResizeByStep",
        "onMoveBegin",
        "onMoveMove",
        "onMoveEnd",
        "onMoveCancel",
        "onMoveByStep",
      ].map((name) => [name, vi.fn()]),
    );
    const renderPreview = (phase, startMinute = 9 * 60) => (
      <section data-calendar-shell="true">
        <div data-calendar-week-scroll="true">
          <div data-calendar-time-rail="true" />
          <CalendarSlotSelection
            selection={{
              day,
              openingWindow,
              selectionKey: "2026-08-05",
              startMinute,
              endMinute: startMinute + 60,
              phase,
            }}
            calendarStartMinute={8 * 60}
            calendarEndMinute={20 * 60}
            pixelsPerMinute={2}
            studio={{ timeZone: "UTC", slotStepMinutes: 30 }}
            locale="en-GB"
            audience="customer"
            mobileDeferred
            t={t}
            {...handlers}
          />
        </div>
        <div data-calendar-mobile-selection-summary="true" />
      </section>
    );
    const { container, rerender } = render(renderPreview("dragging"));
    const summary = container.querySelector(
      "[data-calendar-mobile-selection-summary]",
    );
    summary.getClientRects = () => [{}];
    summary.getBoundingClientRect = () => ({ top: window.innerHeight - 90 });
    container.querySelector("[data-calendar-time-rail]").getBoundingClientRect =
      () => ({ width: 48 });

    try {
      expect(scrollIntoView).not.toHaveBeenCalled();

      rerender(renderPreview("ready"));
      const preview = container.querySelector("[data-calendar-slot-preview]");
      expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
        block: "nearest",
        inline: "nearest",
      });
      expect(preview.style.scrollMarginBottom).toBe("98px");
      expect(preview.style.scrollMarginLeft).toBe("48px");

      // Dropping a moved selection leaves it where the finger put it.
      rerender(renderPreview("moving", 10 * 60));
      rerender(renderPreview("ready", 10 * 60));
      expect(scrollIntoView).toHaveBeenCalledTimes(1);

      // Keyboard steps keep revealing it.
      rerender(renderPreview("ready", 10 * 60 + 30));
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
      vi.restoreAllMocks();
    }
  });
});
