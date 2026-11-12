import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";
import WeekCalendar from "@/components/calendar/WeekCalendar";
import {
  TOUCH_TAP_SLOP,
  cancelTouchTap,
  moveTouchTap,
  releaseTouchTap,
  startTouchTap,
  takeTouchTap,
} from "@/components/calendar/calendar.touchTap";

const openingHours = Object.fromEntries(
  [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].map((day) => [
    day,
    { isOpen: true, openTime: "08:00", closeTime: "20:00" },
  ]),
);

const capacityStudio = {
  id: "studio-1",
  timeZone: "UTC",
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  availabilityMode: "capacity",
  resources: [{ id: "WORKSTATION", name: "Pottery wheel", capacity: 2 }],
  openingHours,
};

const laneStudio = {
  ...capacityStudio,
  id: "studio-2",
  availabilityMode: "lanes",
  publicLaneCount: 2,
};

const t = (key, values = {}) => {
  if (key === "toolbar.newBooking") return "New booking";
  if (key === "events.availability") {
    return values.remaining === 0
      ? "Full"
      : `${values.remaining} places available`;
  }
  if (key === "day.publicLane") return `Place ${values.number}`;
  return key;
};

const VIEWS = [
  {
    name: "Week",
    // 42px half-hour rows: a finger at y=360 rests in the 12:00 slot.
    tappedRange: /12:00.*13:00/,
    column: '[data-calendar-week-day-column="true"][tabindex="0"]',
    render: (onSlotSelect) =>
      render(
        <WeekCalendar
          date={new Date("2026-08-05T12:00:00.000Z")}
          bookings={[]}
          studio={capacityStudio}
          locale="en-GB"
          audience="customer"
          selectedActivityId="WORKSTATION"
          onDateChange={vi.fn()}
          onSlotSelect={onSlotSelect}
          t={t}
          pageScroll
        />,
      ),
  },
  ...[
    ["capacity Day", capacityStudio],
    ["fixed-lane Day", laneStudio],
  ].map(([name, studio]) => ({
    name,
    // 52px half-hour rows: a finger at y=360 rests in the 11:00 slot.
    tappedRange: /11:00.*12:00/,
    column: '[data-calendar-day-column="true"][tabindex="0"]',
    render: (onSlotSelect) =>
      render(
        <DayCalendar
          date={new Date("2026-08-05T12:00:00.000Z")}
          bookings={[]}
          studio={studio}
          locale="en-GB"
          audience="customer"
          selectedActivityId="WORKSTATION"
          onBookingClick={vi.fn()}
          onSlotSelect={onSlotSelect}
          pageScroll
          t={t}
        />,
      ),
  })),
];

const mockColumnBounds = (column) =>
  vi.spyOn(column, "getBoundingClientRect").mockReturnValue({
    top: 0,
    bottom: 1248,
    left: 0,
    right: 160,
    width: 160,
    height: 1248,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

const fingerAt = (pointerId, clientX = 140, clientY = 360) => ({
  pointerId,
  pointerType: "touch",
  button: 0,
  clientX,
  clientY,
});

const preview = (container) =>
  container.querySelector('[data-calendar-slot-preview="true"]');

describe("calendar finger taps", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-05T06:00:00.000Z"));
    globalThis.requestAnimationFrame = vi.fn((callback) => {
      callback(0);
      return 1;
    });
    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe.each(VIEWS)("$name view", (view) => {
    const setup = () => {
      const onSlotSelect = vi.fn();
      const result = view.render(onSlotSelect);
      const columns = result.container.querySelectorAll(view.column);
      columns.forEach(mockColumnBounds);
      return { ...result, columns, onSlotSelect };
    };

    it("leaves the grid unchanged until the browser confirms the tap with a click", () => {
      const { container, columns, onSlotSelect } = setup();
      const [column] = columns;
      const finger = fingerAt(31);

      fireEvent.pointerDown(column, finger);
      fireEvent.pointerUp(column, finger);

      // Nothing may render under the finger before the browser hit-tests the
      // synthesized click, or that click activates the new confirm button.
      expect(preview(container)).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-calendar-slot-confirm="true"]'),
      ).not.toBeInTheDocument();

      fireEvent.click(column, finger);

      expect(preview(container)).toHaveAttribute(
        "data-calendar-slot-phase",
        "ready",
      );
      expect(preview(container)).toHaveAccessibleName(view.tappedRange);
      expect(onSlotSelect).not.toHaveBeenCalled();
      // Touch screens get the fixed summary with Continue at every width, so
      // an iPad in landscape sees the day and a labelled action; desktop
      // pointers keep the inline confirm. Short landscape screens hide the
      // bar, where it would cover most of the grid, and keep the inline one.
      const summary = container.querySelector(
        "[data-calendar-mobile-selection-summary]",
      );
      expect(summary).toHaveClass(
        "lg:pointer-fine:hidden",
        "[@media(max-height:500px)]:hidden",
      );
      // The bar truncates its one-line label on phones; the time leads so it
      // is never the part that is cut off.
      expect(summary.querySelectorAll("p")[1]).toHaveTextContent(
        new RegExp(`^${view.tappedRange.source} · `),
      );
    });

    it("does not select time when the browser suppresses the click of a touch", () => {
      const { container, columns } = setup();
      const [column] = columns;
      const finger = fingerAt(32);

      // A touch that only stops a momentum scroll, or a long press, ends with
      // pointerup but no click.
      fireEvent.pointerDown(column, finger);
      fireEvent.pointerUp(column, finger);
      expect(preview(container)).not.toBeInTheDocument();

      // A later click without its own finger press must not revive that touch.
      fireEvent.pointerDown(column, {
        ...finger,
        pointerId: 1,
        pointerType: "mouse",
        buttons: 1,
      });
      fireEvent.pointerUp(column, {
        ...finger,
        pointerId: 1,
        pointerType: "mouse",
      });
      fireEvent.click(column, finger);
      expect(preview(container)).toHaveAttribute(
        "data-calendar-slot-phase",
        "ready",
      );
      // The mouse press created the selection through drag-create; the click
      // did not create a second one elsewhere.
      expect(
        container.querySelectorAll('[data-calendar-slot-preview="true"]'),
      ).toHaveLength(1);
    });

    it("ignores a click when the touch moved, was cancelled or a second finger landed", () => {
      const { container, columns } = setup();
      const [column] = columns;

      const swipe = fingerAt(33);
      fireEvent.pointerDown(column, swipe);
      fireEvent.pointerMove(column, {
        ...swipe,
        clientY: swipe.clientY + TOUCH_TAP_SLOP + 1,
      });
      fireEvent.pointerUp(column, swipe);
      fireEvent.click(column, swipe);
      expect(preview(container)).not.toBeInTheDocument();

      const panned = fingerAt(34);
      fireEvent.pointerDown(column, panned);
      fireEvent.pointerCancel(column, panned);
      fireEvent.click(column, panned);
      expect(preview(container)).not.toBeInTheDocument();

      const first = fingerAt(35);
      fireEvent.pointerDown(column, first);
      fireEvent.pointerDown(column, fingerAt(36, 150, 420));
      fireEvent.pointerUp(column, first);
      fireEvent.click(column, first);
      expect(preview(container)).not.toBeInTheDocument();
    });

    it("selects the slot where the finger lifted when the browser adjusts the click", () => {
      const { container, columns } = setup();
      const [column] = columns;
      const finger = fingerAt(38);

      fireEvent.pointerDown(column, finger);
      fireEvent.pointerUp(column, finger);
      // Touch adjustment can move the synthesized click towards a control in
      // the neighbouring slot.
      fireEvent.click(column, { ...finger, clientY: finger.clientY + 20 });

      expect(preview(container)).toHaveAccessibleName(view.tappedRange);
    });

    it("selects the slot a pen tapped, like a finger", () => {
      const { container, columns } = setup();
      const [column] = columns;
      // Apple Pencil and S Pen taps end with a synthesized click too. Taking
      // the mouse's drag-create path instead drew the draft under the pen on
      // pointerdown and rounded a tap low in a slot to the next half hour.
      const pen = { ...fingerAt(39), pointerType: "pen" };

      fireEvent.pointerDown(column, pen);
      fireEvent.pointerUp(column, pen);
      expect(preview(container)).not.toBeInTheDocument();

      fireEvent.click(column, pen);
      expect(preview(container)).toHaveAccessibleName(view.tappedRange);
    });

    it("selects only in the column that received the tap", () => {
      const { container, columns } = setup();
      if (columns.length < 2) return;
      const [tapped, other] = columns;
      const finger = fingerAt(37);

      fireEvent.pointerDown(tapped, finger);
      fireEvent.pointerUp(tapped, finger);
      fireEvent.click(other, finger);

      expect(preview(container)).not.toBeInTheDocument();
    });

    it("keeps double-tap zoom and the tap highlight off the grid", () => {
      const { columns } = setup();

      for (const column of columns) {
        expect(column).toHaveClass(
          "touch-manipulation",
          "[-webkit-tap-highlight-color:transparent]",
        );
      }
    });
  });
});

describe("touch tap tracking", () => {
  const element = {};
  const otherElement = {};
  const finger = (overrides = {}) => ({
    pointerId: 4,
    pointerType: "touch",
    clientX: 20,
    clientY: 40,
    currentTarget: element,
    ...overrides,
  });

  afterEach(() => vi.restoreAllMocks());

  it("tracks finger and pen taps but leaves the mouse to drag-create", () => {
    const ref = { current: { stale: true } };

    startTouchTap(ref, finger({ pointerType: "mouse" }));
    expect(ref.current).toBeNull();
    expect(moveTouchTap(ref, finger({ pointerType: "mouse" }))).toBe(false);
    expect(releaseTouchTap(ref, finger({ pointerType: "mouse" }))).toBe(false);
    expect(cancelTouchTap(ref, finger({ pointerType: "mouse" }))).toBe(false);

    startTouchTap(ref, finger({ pointerType: "pen" }));
    expect(moveTouchTap(ref, finger({ pointerType: "pen" }))).toBe(true);
    expect(releaseTouchTap(ref, finger({ pointerType: "pen" }))).toBe(true);
    expect(takeTouchTap(ref, finger({ pointerType: "pen" }))).toMatchObject({
      pointerId: 4,
    });
  });

  it("consumes a released tap once, on the element that was pressed", () => {
    const ref = { current: null };

    startTouchTap(ref, finger());
    expect(moveTouchTap(ref, finger({ clientX: 20 + TOUCH_TAP_SLOP }))).toBe(
      true,
    );
    expect(takeTouchTap(ref, finger())).toBeNull();

    startTouchTap(ref, finger());
    expect(releaseTouchTap(ref, finger())).toBe(true);
    expect(takeTouchTap(ref, finger({ currentTarget: otherElement }))).toBe(
      null,
    );

    startTouchTap(ref, finger());
    releaseTouchTap(ref, finger());
    expect(takeTouchTap(ref, finger())).toMatchObject({
      pointerId: 4,
      clientX: 20,
      clientY: 40,
      element,
    });
    expect(takeTouchTap(ref, finger())).toBeNull();
  });

  it("forgets a tap whose click never arrived", () => {
    const ref = { current: null };
    const now = vi.spyOn(performance, "now").mockReturnValue(1_000);

    startTouchTap(ref, finger());
    releaseTouchTap(ref, finger());
    now.mockReturnValue(2_500);

    expect(takeTouchTap(ref, finger())).toBeNull();
  });

  it("drops a tap that moved beyond the slop or released another pointer", () => {
    const ref = { current: null };

    startTouchTap(ref, finger());
    moveTouchTap(ref, finger({ clientY: 40 + TOUCH_TAP_SLOP + 1 }));
    expect(ref.current).toBeNull();

    startTouchTap(ref, finger());
    releaseTouchTap(ref, finger({ pointerId: 9 }));
    expect(ref.current).toBeNull();
  });
});
