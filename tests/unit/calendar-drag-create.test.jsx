import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";
import WeekCalendar from "@/components/calendar/WeekCalendar";
import useCalendarSlotSelection from "@/components/calendar/useCalendarSlotSelection";

const studio = {
  id: "studio-1",
  timeZone: "UTC",
  availabilityMode: "lanes",
  publicLaneCount: 1,
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  openingHours: {
    tuesday: { isOpen: true, openTime: "08:00", closeTime: "20:00" },
  },
};

const CALENDAR_START_MINUTE = 8 * 60;
const TIMELINE_TOP = 137;
const WEEK_PIXELS_PER_MINUTE = 42 / 30;
const DAY_PIXELS_PER_MINUTE = 52 / 30;

const clientYForMinute = (minute, pixelsPerMinute) =>
  TIMELINE_TOP + (minute - CALENDAR_START_MINUTE) * pixelsPerMinute;

const weekClientY = (minute) =>
  clientYForMinute(minute, WEEK_PIXELS_PER_MINUTE);
const dayClientY = (minute) => clientYForMinute(minute, DAY_PIXELS_PER_MINUTE);

const t = (key, values = {}) => {
  if (key === "toolbar.newBooking") return "New booking";
  if (key === "selection.adjustStart") {
    return `Adjust booking start: ${values.time}`;
  }
  if (key === "selection.adjustEnd") {
    return `Adjust booking end: ${values.time}`;
  }
  if (key === "selection.resizeHint") {
    return "Drag or use the arrow keys to adjust the time";
  }
  if (key === "footer.bookingCount") return `${values.count} bookings`;
  if (key === "events.availability") return "Full";
  if (key === "events.closed") return "Closed";
  if (key === "events.unavailable") return "Studio unavailable";
  if (key === "day.publicLane") return `Public booking ${values.number}`;
  return key;
};

const mockTimelineRect = (element, height) => {
  const rectSpy = vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
    top: TIMELINE_TOP,
    bottom: TIMELINE_TOP + height,
    left: 0,
    right: 300,
    width: 300,
    height,
    x: 0,
    y: TIMELINE_TOP,
    toJSON: () => ({}),
  });
  element.setPointerCapture = vi.fn();
  element.releasePointerCapture = vi.fn();
  return rectSpy;
};

function SelectionPerformanceHarness({ onRender }) {
  const slotSelection = useCalendarSlotSelection({
    enabled: true,
    scopeKey: "performance-harness",
    startMinute: CALENDAR_START_MINUTE,
    pixelsPerMinute: WEEK_PIXELS_PER_MINUTE,
    stepMinutes: 30,
    minimumMinutes: 60,
  });
  const selection = slotSelection.selection;
  const selectionConfig = {
    day: new Date("2026-08-04T12:00:00.000Z"),
    openingWindow: {
      isOpen: true,
      openMinutes: CALENDAR_START_MINUTE,
      closeMinutes: 20 * 60,
    },
    selectionKey: "performance-day",
  };

  onRender(selection);

  return (
    <div
      data-testid="performance-timeline"
      onPointerDown={(event) =>
        slotSelection.beginSelection(event, selectionConfig)
      }
      onPointerMove={slotSelection.updateSelection}
      onPointerUp={slotSelection.finishSelection}
      onPointerCancel={slotSelection.cancelSelection}
    >
      <output data-testid="performance-range">
        {selection
          ? `${selection.phase}:${selection.startMinute}-${selection.endMinute}`
          : "empty"}
      </output>
      {selection?.phase === "ready" || selection?.phase === "resizing" ? (
        <button
          type="button"
          data-testid="performance-resize"
          onPointerDown={(event) => {
            event.stopPropagation();
            slotSelection.beginResize(event, "end");
          }}
          onPointerMove={slotSelection.updateResize}
          onPointerUp={slotSelection.finishResize}
          onPointerCancel={slotSelection.cancelResize}
        >
          Resize
        </button>
      ) : null}
    </div>
  );
}

const drag = (element, { fromY, toY }) => {
  fireEvent.pointerDown(element, {
    button: 0,
    buttons: 1,
    clientY: fromY,
    pointerId: 1,
    pointerType: "mouse",
  });
  fireEvent.pointerMove(element, {
    buttons: 1,
    clientY: toY,
    pointerId: 1,
    pointerType: "mouse",
  });
  fireEvent.pointerUp(element, {
    button: 0,
    clientY: toY,
    pointerId: 1,
    pointerType: "mouse",
  });
};

const resize = (
  handle,
  { fromY, toY, pointerId = 11, cancel = false, onMove },
) => {
  handle.setPointerCapture = vi.fn();
  handle.releasePointerCapture = vi.fn();

  fireEvent.pointerDown(handle, {
    button: 0,
    buttons: 1,
    clientY: fromY,
    pointerId,
    pointerType: "mouse",
  });
  fireEvent.pointerMove(handle, {
    buttons: 1,
    clientY: toY,
    pointerId,
    pointerType: "mouse",
  });
  onMove?.();

  fireEvent[cancel ? "pointerCancel" : "pointerUp"](handle, {
    button: 0,
    clientY: toY,
    pointerId,
    pointerType: "mouse",
  });

  return handle;
};

const getResizeHandle = (edge) =>
  screen.getByRole("button", {
    name: new RegExp(`^Adjust booking ${edge}`),
  });

const confirmSelection = (start, end) =>
  fireEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`New booking: ${start}.*${end}`),
    }),
  );

describe("desktop calendar drag-to-create", () => {
  it("skips redundant snapped drag updates and reads timeline geometry once", () => {
    const onRender = vi.fn();

    render(<SelectionPerformanceHarness onRender={onRender} />);

    const timeline = screen.getByTestId("performance-timeline");
    const rectSpy = mockTimelineRect(timeline, 1008);
    fireEvent.pointerDown(timeline, {
      button: 0,
      buttons: 1,
      clientY: weekClientY(9 * 60 + 1),
      pointerId: 41,
      pointerType: "mouse",
    });

    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "dragging:540-600",
    );
    const rendersAfterBegin = onRender.mock.calls.length;

    for (const minute of [9 * 60 + 2, 9 * 60 + 6, 9 * 60 + 12]) {
      fireEvent.pointerMove(timeline, {
        buttons: 1,
        clientY: weekClientY(minute),
        pointerId: 41,
        pointerType: "mouse",
      });
    }

    expect(onRender).toHaveBeenCalledTimes(rendersAfterBegin);
    expect(rectSpy).toHaveBeenCalledTimes(1);

    fireEvent.pointerMove(timeline, {
      buttons: 1,
      clientY: weekClientY(10 * 60 + 30),
      pointerId: 41,
      pointerType: "mouse",
    });
    expect(onRender).toHaveBeenCalledTimes(rendersAfterBegin + 1);
    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "dragging:540-630",
    );

    fireEvent.pointerUp(timeline, {
      button: 0,
      clientY: weekClientY(10 * 60 + 30),
      pointerId: 41,
      pointerType: "mouse",
    });
    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "ready:540-630",
    );
    expect(rectSpy).toHaveBeenCalledTimes(1);
  });

  it("skips redundant snapped resize updates", () => {
    const onRender = vi.fn();

    render(<SelectionPerformanceHarness onRender={onRender} />);

    const timeline = screen.getByTestId("performance-timeline");
    mockTimelineRect(timeline, 1008);
    drag(timeline, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(10 * 60),
    });

    const resizeHandle = screen.getByTestId("performance-resize");
    resizeHandle.setPointerCapture = vi.fn();
    resizeHandle.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(resizeHandle, {
      button: 0,
      buttons: 1,
      clientY: weekClientY(10 * 60),
      pointerId: 42,
      pointerType: "mouse",
    });
    const rendersAfterBegin = onRender.mock.calls.length;

    for (const minute of [10 * 60 + 2, 10 * 60 + 8, 10 * 60 + 12]) {
      fireEvent.pointerMove(resizeHandle, {
        buttons: 1,
        clientY: weekClientY(minute),
        pointerId: 42,
        pointerType: "mouse",
      });
    }

    expect(onRender).toHaveBeenCalledTimes(rendersAfterBegin);
    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "resizing:540-600",
    );

    fireEvent.pointerMove(resizeHandle, {
      buttons: 1,
      clientY: weekClientY(10 * 60 + 30),
      pointerId: 42,
      pointerType: "mouse",
    });
    expect(onRender).toHaveBeenCalledTimes(rendersAfterBegin + 1);
    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "resizing:540-630",
    );

    fireEvent.pointerUp(resizeHandle, {
      button: 0,
      clientY: weekClientY(10 * 60 + 30),
      pointerId: 42,
      pointerType: "mouse",
    });
    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "ready:540-630",
    );
  });

  it("refreshes timeline geometry only when scrolling during a drag", () => {
    render(<SelectionPerformanceHarness onRender={vi.fn()} />);

    const timeline = screen.getByTestId("performance-timeline");
    let timelineTop = TIMELINE_TOP;
    const rectSpy = vi
      .spyOn(timeline, "getBoundingClientRect")
      .mockImplementation(() => ({
        top: timelineTop,
        bottom: timelineTop + 1008,
        left: 0,
        right: 300,
        width: 300,
        height: 1008,
        x: 0,
        y: timelineTop,
        toJSON: () => ({}),
      }));
    timeline.setPointerCapture = vi.fn();
    timeline.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(timeline, {
      button: 0,
      buttons: 1,
      clientY: weekClientY(9 * 60),
      pointerId: 43,
      pointerType: "mouse",
    });

    timelineTop -= 30 * WEEK_PIXELS_PER_MINUTE;
    fireEvent.scroll(window);
    fireEvent.pointerMove(timeline, {
      buttons: 1,
      clientY: weekClientY(10 * 60),
      pointerId: 43,
      pointerType: "mouse",
    });

    expect(screen.getByTestId("performance-range")).toHaveTextContent(
      "dragging:540-630",
    );
    expect(rectSpy).toHaveBeenCalledTimes(2);

    fireEvent.pointerUp(timeline, {
      button: 0,
      clientY: weekClientY(10 * 60),
      pointerId: 43,
      pointerType: "mouse",
    });
    fireEvent.scroll(window);
    expect(rectSpy).toHaveBeenCalledTimes(2);
  });

  it("releases an interrupted pointer session before starting another", () => {
    render(<SelectionPerformanceHarness onRender={vi.fn()} />);

    const timeline = screen.getByTestId("performance-timeline");
    const rectSpy = mockTimelineRect(timeline, 1008);
    const begin = (pointerId, minute) =>
      fireEvent.pointerDown(timeline, {
        button: 0,
        buttons: 1,
        clientY: weekClientY(minute),
        pointerId,
        pointerType: "mouse",
      });

    begin(44, 9 * 60);
    begin(45, 10 * 60);

    expect(timeline.releasePointerCapture).toHaveBeenCalledWith(44);
    fireEvent.pointerCancel(timeline, {
      pointerId: 45,
      pointerType: "mouse",
    });
    fireEvent.scroll(window);
    expect(rectSpy).toHaveBeenCalledTimes(2);
  });

  it("keeps the hidden mobile agenda cached during a desktop drag", () => {
    const trackingT = vi.fn(t);

    render(
      <WeekCalendar
        date={new Date("2026-08-04T12:00:00.000Z")}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={vi.fn()}
        t={trackingT}
      />,
    );

    const mobileRenderCalls = () =>
      trackingT.mock.calls.filter(([key]) => key === "footer.bookingCount")
        .length;
    const initialMobileRenderCalls = mobileRenderCalls();
    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);

    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(11 * 60),
    });

    expect(initialMobileRenderCalls).toBeGreaterThan(0);
    expect(mobileRenderCalls()).toBe(initialMobileRenderCalls);
  });

  it("reuses static customer slot models while the draft range changes", () => {
    const trackingT = vi.fn(t);

    render(
      <WeekCalendar
        date={new Date("2099-08-04T12:00:00.000Z")}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="customer"
        onSlotSelect={vi.fn()}
        t={trackingT}
      />,
    );

    const availabilityLabelCalls = () =>
      trackingT.mock.calls.filter(([key]) => key === "events.availability")
        .length;
    const initialAvailabilityLabelCalls = availabilityLabelCalls();
    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);

    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(11 * 60),
    });

    expect(
      availabilityLabelCalls() - initialAvailabilityLabelCalls,
    ).toBeLessThanOrEqual(4);
  });

  it("creates the dragged 30-minute-snapped range in week view", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60 + 16),
      toY: weekClientY(10 * 60 + 44),
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(day.setPointerCapture).toHaveBeenCalledWith(1);
    expect(day.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(
      document.querySelector('[data-calendar-slot-phase="ready"]'),
    ).toBeInTheDocument();

    confirmSelection("09:30", "10:30");

    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "SHARED_TABLE",
      start: new Date("2026-08-04T09:30:00.000Z"),
      end: new Date("2026-08-04T10:30:00.000Z"),
    });
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
  });

  it("creates the dragged range in a desktop day lane", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <DayCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const lane = screen.getByRole("group", { name: "Public booking 1" });
    mockTimelineRect(lane, 1248);
    drag(lane, {
      fromY: dayClientY(9 * 60),
      toY: dayClientY(11 * 60 + 30),
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(lane.setPointerCapture).toHaveBeenCalledWith(1);
    expect(lane.releasePointerCapture).toHaveBeenCalledWith(1);

    confirmSelection("09:00", "11:30");

    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "SHARED_TABLE",
      laneIndex: 0,
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T11:30:00.000Z"),
    });
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
  });

  it("supports a backward week drag and waits for explicit confirmation", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(10 * 60 + 30),
      toY: weekClientY(9 * 60),
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    confirmSelection("09:00", "10:30");
    expect(onSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        start: new Date("2026-08-04T09:00:00.000Z"),
        end: new Date("2026-08-04T10:30:00.000Z"),
      }),
    );
  });

  it("turns a simple desktop pointer click into a minimum-duration selection", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60 + 30),
      toY: weekClientY(9 * 60 + 30),
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    confirmSelection("09:30", "10:30");
    expect(onSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        start: new Date("2026-08-04T09:30:00.000Z"),
        end: new Date("2026-08-04T10:30:00.000Z"),
      }),
    );
  });

  it("starts a customer's click on the slot under the pointer, as a tap does", () => {
    render(
      <WeekCalendar
        date={new Date("2099-08-04T12:00:00.000Z")}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="customer"
        onSlotSelect={vi.fn()}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    // Low in the 09:00 slot, where the nearest step would be 09:30. The
    // slot's availability check, tooltip and label all describe 09:00.
    drag(day, {
      fromY: weekClientY(9 * 60 + 20),
      toY: weekClientY(9 * 60 + 20),
    });

    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).toHaveAccessibleName(/^09:00\s*[–-]\s*10:00/);
  });

  it("keeps a compact 15-minute selection aligned to its true boundaries", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const compactStudio = {
      ...studio,
      slotStepMinutes: 15,
      minBookingMinutes: 15,
    };

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={compactStudio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(9 * 60 + 15),
    });

    const preview = document.querySelector(
      '[data-calendar-slot-preview="true"]',
    );
    expect(preview).toHaveStyle({ height: "21px" });
    expect(preview).toHaveAttribute("title", "09:00 – 09:15");
    expect(preview.querySelector("[aria-live='polite']")).toHaveClass(
      "sr-only",
    );
    expect(getResizeHandle("start")).toBeInTheDocument();
    expect(getResizeHandle("end")).toBeInTheDocument();
    expect(onSlotSelect).not.toHaveBeenCalled();
  });

  it("preserves the selected resource in capacity-mode day view", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const capacityStudio = {
      ...studio,
      availabilityMode: "capacity",
      resources: [{ id: "WORKSTATION", name: "Pottery wheels", capacity: 6 }],
    };

    render(
      <DayCalendar
        date={date}
        bookings={[]}
        studio={capacityStudio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const resource = screen.getByRole("group", { name: "Pottery wheels" });
    mockTimelineRect(resource, 1248);
    drag(resource, {
      fromY: dayClientY(9 * 60),
      toY: dayClientY(10 * 60 + 30),
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    confirmSelection("09:00", "10:30");
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio: capacityStudio,
      activityId: "WORKSTATION",
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T10:30:00.000Z"),
    });
  });

  it("cancels an interrupted drag without exposing the confirmation action", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    fireEvent.pointerDown(day, {
      button: 0,
      buttons: 1,
      clientY: weekClientY(9 * 60),
      pointerId: 7,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(day, {
      buttons: 1,
      clientY: weekClientY(10 * 60 + 30),
      pointerId: 7,
      pointerType: "mouse",
    });
    expect(
      document.querySelector('[data-calendar-slot-phase="dragging"]'),
    ).toBeInTheDocument();

    fireEvent.pointerCancel(day, {
      pointerId: 7,
      pointerType: "mouse",
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(day.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
  });

  it("does not select a range before opening hours", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const lateStudio = {
      ...studio,
      openingHours: {
        tuesday: { isOpen: true, openTime: "10:00", closeTime: "20:00" },
      },
    };

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={lateStudio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: TIMELINE_TOP + (9 * 60 - 10 * 60) * WEEK_PIXELS_PER_MINUTE,
      toY: TIMELINE_TOP + (9 * 60 - 10 * 60) * WEEK_PIXELS_PER_MINUTE,
    });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(day.setPointerCapture).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
  });

  it("keeps event-card pointer and keyboard input isolated from slot selection", () => {
    const onBookingClick = vi.fn();
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const booking = {
      id: "booking-1",
      locationId: "studio-1",
      kind: "class",
      title: "Wheel class",
      start: "2026-08-04T10:00:00.000Z",
      end: "2026-08-04T11:00:00.000Z",
    };
    const { container } = render(
      <WeekCalendar
        date={date}
        bookings={[booking]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onBookingClick={onBookingClick}
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    const desktop = container.querySelector(
      '[data-calendar-desktop-week="true"]',
    );
    const card = within(desktop).getByRole("button", {
      name: /Wheel class/i,
    });
    mockTimelineRect(day, 1008);

    fireEvent.pointerDown(card, {
      button: 0,
      buttons: 1,
      clientY: weekClientY(10 * 60),
      pointerId: 3,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(card, {
      buttons: 1,
      clientY: weekClientY(11 * 60 + 30),
      pointerId: 3,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(card, {
      button: 0,
      clientY: weekClientY(11 * 60 + 30),
      pointerId: 3,
      pointerType: "mouse",
    });
    fireEvent.keyDown(card, { key: "Enter" });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();

    fireEvent.click(card);
    expect(onBookingClick).toHaveBeenCalledOnce();
    expect(onBookingClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "booking-1" }),
    );
    expect(onSlotSelect).not.toHaveBeenCalled();
  });

  it("does not create a pointer or keyboard selection on a fully closed day", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const closedStudio = {
      ...studio,
      openingHours: {
        tuesday: { isOpen: false },
      },
    };

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={closedStudio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(10 * 60),
      toY: weekClientY(11 * 60 + 30),
    });
    fireEvent.keyDown(day, { key: "Enter" });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(day.setPointerCapture).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
  });

  it("clears a ready selection when the selected activity scope changes", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const { rerender } = render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(10 * 60 + 30),
    });
    expect(
      document.querySelector('[data-calendar-slot-phase="ready"]'),
    ).toBeInTheDocument();

    rerender(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
  });

  it("keeps the dragged range unchanged when Enter is pressed on confirmation", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60 + 16),
      toY: weekClientY(10 * 60 + 44),
    });

    const confirmation = screen.getByRole("button", {
      name: /New booking: 09:30.*10:30/,
    });
    fireEvent.keyDown(confirmation, { key: "Enter" });

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: /New booking: 09:30.*10:30/,
      }),
    ).toBeInTheDocument();

    confirmSelection("09:30", "10:30");
    expect(onSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        start: new Date("2026-08-04T09:30:00.000Z"),
        end: new Date("2026-08-04T10:30:00.000Z"),
      }),
    );
  });

  it("expands a ready week selection with the bottom resize handle", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(10 * 60),
    });

    const endHandle = getResizeHandle("end");
    expect(endHandle).toHaveAttribute("data-calendar-slot-resize", "end");
    resize(endHandle, {
      fromY: weekClientY(10 * 60),
      toY: weekClientY(11 * 60),
    });

    expect(endHandle.setPointerCapture).toHaveBeenCalledWith(11);
    expect(endHandle.releasePointerCapture).toHaveBeenCalledWith(11);
    expect(endHandle).toHaveFocus();
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: /New booking: 09:00.*11:00/,
      }),
    ).toBeInTheDocument();

    confirmSelection("09:00", "11:00");
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "SHARED_TABLE",
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T11:00:00.000Z"),
    });
  });

  it("shortens and then expands a week selection with the top resize handle", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(11 * 60),
    });

    resize(getResizeHandle("start"), {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(10 * 60),
    });
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: /New booking: 10:00.*11:00/,
      }),
    ).toBeInTheDocument();

    resize(getResizeHandle("start"), {
      fromY: weekClientY(10 * 60),
      toY: weekClientY(8 * 60 + 30),
      pointerId: 12,
    });
    expect(onSlotSelect).not.toHaveBeenCalled();

    confirmSelection("08:30", "11:00");
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "SHARED_TABLE",
      start: new Date("2026-08-04T08:30:00.000Z"),
      end: new Date("2026-08-04T11:00:00.000Z"),
    });
  });

  it("adjusts both resize handles by one step with the arrow keys", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="WORKSTATION"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(10 * 60),
    });

    fireEvent.keyDown(getResizeHandle("end"), { key: "ArrowDown" });
    expect(
      screen.getByRole("button", {
        name: /New booking: 09:00.*10:30/,
      }),
    ).toBeInTheDocument();
    fireEvent.keyDown(getResizeHandle("end"), { key: "ArrowUp" });

    fireEvent.keyDown(getResizeHandle("start"), { key: "ArrowUp" });
    expect(
      screen.getByRole("button", {
        name: /New booking: 08:30.*10:00/,
      }),
    ).toBeInTheDocument();
    fireEvent.keyDown(getResizeHandle("start"), { key: "ArrowDown" });

    expect(onSlotSelect).not.toHaveBeenCalled();
    confirmSelection("09:00", "10:00");
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "WORKSTATION",
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T10:00:00.000Z"),
    });
  });

  it("restores the original day-lane range when resizing is cancelled", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <DayCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        selectedActivityId="SHARED_TABLE"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const lane = screen.getByRole("group", { name: "Public booking 1" });
    mockTimelineRect(lane, 1248);
    drag(lane, {
      fromY: dayClientY(9 * 60),
      toY: dayClientY(11 * 60),
    });

    const endHandle = getResizeHandle("end");
    resize(endHandle, {
      fromY: dayClientY(11 * 60),
      toY: dayClientY(12 * 60 + 30),
      pointerId: 19,
      cancel: true,
      onMove: () => {
        const resizingPreview = document.querySelector(
          '[data-calendar-slot-phase="resizing"]',
        );
        expect(resizingPreview).toHaveTextContent(/09:00.*12:30/);
        expect(
          screen.getByRole("button", {
            name: /New booking: 09:00.*12:30/,
          }),
        ).toBeDisabled();
        expect(onSlotSelect).not.toHaveBeenCalled();
      },
    });

    expect(endHandle.setPointerCapture).toHaveBeenCalledWith(19);
    expect(endHandle.releasePointerCapture).toHaveBeenCalledWith(19);
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: /New booking: 09:00.*11:00/,
      }),
    ).toBeInTheDocument();

    confirmSelection("09:00", "11:00");
    expect(onSlotSelect).toHaveBeenCalledTimes(1);
    expect(onSlotSelect).toHaveBeenCalledWith({
      studio,
      activityId: "SHARED_TABLE",
      laneIndex: 0,
      start: new Date("2026-08-04T09:00:00.000Z"),
      end: new Date("2026-08-04T11:00:00.000Z"),
    });
  });

  it("horizontally staggers compact resize handles at calendar boundaries", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");
    const compactStudio = {
      ...studio,
      slotStepMinutes: 15,
      minBookingMinutes: 15,
    };

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={compactStudio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);

    const expectStaggeredHandles = () => {
      const startHandle = getResizeHandle("start");
      const endHandle = getResizeHandle("end");

      expect(startHandle).toHaveClass("left-[30%]", "h-11", "w-11");
      expect(startHandle).not.toHaveClass("left-1/2");
      expect(endHandle).toHaveClass("left-[60%]", "h-11", "w-11");
      expect(endHandle).not.toHaveClass("left-1/2");
    };

    drag(day, {
      fromY: weekClientY(8 * 60),
      toY: weekClientY(8 * 60 + 15),
    });

    expect(
      screen.getByRole("button", {
        name: /New booking: 08:00.*08:15/,
      }),
    ).toBeInTheDocument();
    expectStaggeredHandles();

    drag(day, {
      fromY: weekClientY(19 * 60 + 45),
      toY: weekClientY(20 * 60),
    });

    expect(
      screen.getByRole("button", {
        name: /New booking: 19:45.*20:00/,
      }),
    ).toBeInTheDocument();
    expectStaggeredHandles();
    expect(onSlotSelect).not.toHaveBeenCalled();
  });

  it("finishes resizing with the window fallback when pointer capture fails", () => {
    const onSlotSelect = vi.fn();
    const date = new Date("2026-08-04T12:00:00.000Z");

    render(
      <WeekCalendar
        date={date}
        bookings={[]}
        studio={studio}
        locale="en-GB"
        audience="tenant"
        onSlotSelect={onSlotSelect}
        t={t}
      />,
    );

    const day = screen.getByRole("group", {
      name: /Tuesday.*4 August/,
    });
    mockTimelineRect(day, 1008);
    drag(day, {
      fromY: weekClientY(9 * 60),
      toY: weekClientY(10 * 60),
    });

    const endHandle = getResizeHandle("end");
    endHandle.setPointerCapture = vi.fn(() => {
      throw new Error("capture unavailable");
    });
    endHandle.hasPointerCapture = vi.fn(() => false);
    endHandle.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(endHandle, {
      button: 0,
      buttons: 1,
      clientY: weekClientY(10 * 60),
      pointerId: 31,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(window, {
      buttons: 1,
      clientY: weekClientY(12 * 60),
      pointerId: 31,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(window, {
      button: 0,
      clientY: weekClientY(12 * 60),
      pointerId: 31,
      pointerType: "mouse",
    });

    expect(endHandle.setPointerCapture).toHaveBeenCalledWith(31);
    expect(endHandle.releasePointerCapture).not.toHaveBeenCalled();
    expect(onSlotSelect).not.toHaveBeenCalled();
    // The completed fallback must stop tracking subsequent pointer movement.
    fireEvent.pointerMove(window, {
      buttons: 1,
      clientY: weekClientY(14 * 60),
      pointerId: 31,
      pointerType: "mouse",
    });
    expect(
      screen.getByRole("button", {
        name: /New booking: 09:00.*12:00/,
      }),
    ).toBeEnabled();
    confirmSelection("09:00", "12:00");
    expect(onSlotSelect).toHaveBeenCalledOnce();
    expect(onSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        start: new Date("2026-08-04T09:00:00.000Z"),
        end: new Date("2026-08-04T12:00:00.000Z"),
      }),
    );
  });
});
