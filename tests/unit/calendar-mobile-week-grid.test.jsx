import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WeekCalendar from "@/components/calendar/WeekCalendar";

const studio = {
  id: "studio-1",
  timeZone: "UTC",
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  availabilityMode: "capacity",
  resources: [{ id: "WORKSTATION", name: "Pottery wheel", capacity: 2 }],
  openingHours: Object.fromEntries(
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
  ),
};

const t = (key, values = {}) => {
  if (key === "views.week") return "Week";
  if (key === "toolbar.newBooking") return "New booking";
  if (key === "events.availability") {
    return values.remaining === 0
      ? "Full"
      : `${values.remaining} places available`;
  }
  if (key === "events.closed") return "Closed";
  if (key === "events.unavailable") return "Unavailable";
  if (key === "week.privacyNote") return "Private bookings stay private.";
  return key;
};

const renderWeek = (
  audience,
  onSlotSelect = audience === "customer" ? vi.fn() : undefined,
  pageScroll = true,
) => {
  const result = render(
    <WeekCalendar
      date={new Date("2026-08-05T12:00:00.000Z")}
      bookings={[]}
      studio={studio}
      locale="en-GB"
      audience={audience}
      selectedActivityId="WORKSTATION"
      onDateChange={vi.fn()}
      onSlotSelect={onSlotSelect}
      t={t}
      pageScroll={pageScroll}
    />,
  );

  return { ...result, onSlotSelect };
};

function setGeometry(element, geometry) {
  Object.entries(geometry).forEach(([property, value]) => {
    Object.defineProperty(element, property, {
      configurable: true,
      value,
    });
  });
}

function getScrollers(container) {
  const body = container.querySelector('[data-calendar-week-scroll="true"]');
  const header = container.querySelector(
    '[data-calendar-header-scroll="true"]',
  );
  for (const element of [body, header]) {
    setGeometry(element, { scrollWidth: 1200, clientWidth: 320 });
  }
  return { body, header };
}

function beginScrollInput(element) {
  fireEvent.pointerDown(element, {
    pointerId: 21,
    pointerType: "touch",
    clientX: 200,
    clientY: 350,
  });
}

describe("WeekCalendar mobile weekly grid", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-05T10:15:00.000Z"));
    globalThis.requestAnimationFrame = vi.fn((callback) => {
      callback(0);
      return 1;
    });
    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(["customer", "public"])(
    "renders the real seven-day time grid for %s mobile visitors",
    (audience) => {
      const { container } = renderWeek(audience);

      expect(
        container.querySelector('[data-calendar-mobile-agenda="true"]'),
      ).not.toBeInTheDocument();

      const grid = container.querySelector(
        '[data-calendar-mobile-week-grid="true"]',
      );
      const horizontalScroller = container.querySelector(
        '[data-calendar-week-scroll="true"]',
      );
      const timeRail = container.querySelector(
        '[data-calendar-time-rail="true"]',
      );
      const dayColumns = container.querySelectorAll(
        '[data-calendar-week-day-column="true"]',
      );

      expect(grid).toBeInTheDocument();
      expect(
        container.querySelectorAll('[data-calendar-week-scroll="true"]'),
      ).toHaveLength(1);
      expect(horizontalScroller).toBeInTheDocument();
      expect(horizontalScroller).toHaveClass(
        "overflow-x-auto",
        "overflow-y-clip",
        "overscroll-x-contain",
      );
      expect(timeRail).toBeInTheDocument();
      expect(timeRail).toHaveClass("sticky", "left-0");
      expect(timeRail).toHaveStyle({ position: "sticky", left: "0px" });
      expect(timeRail).toHaveTextContent("08:00");
      expect(dayColumns).toHaveLength(7);

      const mobileHeader = container.querySelector(
        '[data-calendar-mobile-grid-header="true"]',
      );
      const headerTrack = mobileHeader.firstElementChild;
      const bodyCanvas = horizontalScroller.firstElementChild;
      const bodyTrack = timeRail.parentElement;

      expect(mobileHeader).toHaveClass("sticky", "overflow-x-auto");
      expect(headerTrack.style.minWidth).toContain("--calendar-day-width");
      expect(bodyCanvas.style.minWidth).toBe(headerTrack.style.minWidth);
      expect(bodyTrack.style.gridTemplateColumns).toContain("repeat(7");
      expect(headerTrack.style.gridTemplateColumns).toBe(
        bodyTrack.style.gridTemplateColumns,
      );
      expect(window.getComputedStyle(bodyTrack).display).toBe("grid");
    },
  );

  it("keeps the touch-scrollable weekday header and body aligned at mid and maximum scroll", () => {
    const { container } = renderWeek("customer");
    const headerScroller = container.querySelector(
      '[data-calendar-header-scroll="true"]',
    );
    const bodyScroller = container.querySelector(
      '[data-calendar-week-scroll="true"]',
    );

    setGeometry(headerScroller, { scrollWidth: 1200, clientWidth: 320 });
    setGeometry(bodyScroller, { scrollWidth: 1200, clientWidth: 320 });

    beginScrollInput(bodyScroller);
    bodyScroller.scrollLeft = 312;
    fireEvent.scroll(bodyScroller);
    expect(headerScroller.scrollLeft).toBe(312);

    beginScrollInput(headerScroller);
    headerScroller.scrollLeft = 640;
    fireEvent.scroll(headerScroller);
    expect(bodyScroller.scrollLeft).toBe(640);

    beginScrollInput(bodyScroller);
    bodyScroller.scrollLeft = 880;
    fireEvent.scroll(bodyScroller);
    expect(headerScroller.scrollLeft).toBe(880);

    fireEvent.scroll(headerScroller);
    expect(bodyScroller.scrollLeft).toBe(880);
  });

  it.each(["body", "header"])(
    "scroll ownership ignores a delayed follower echo during a %s swipe",
    (sourceName) => {
      const { container } = renderWeek("customer");
      const scrollers = getScrollers(container);
      const source = scrollers[sourceName];
      const follower = scrollers[sourceName === "body" ? "header" : "body"];
      beginScrollInput(source);
      source.scrollLeft = 100;
      fireEvent.scroll(source);
      expect(follower.scrollLeft).toBe(100);

      // Native scrolling can advance before the queued programmatic event fires.
      source.scrollLeft = 140;
      fireEvent.scroll(follower);
      expect(source.scrollLeft).toBe(140);
      fireEvent.scroll(source);
      expect(follower.scrollLeft).toBe(140);
    },
  );

  it("scroll ownership survives native pointer cancellation and coalesced follower echoes during momentum", () => {
    const { container, onSlotSelect } = renderWeek("customer");
    const { body, header } = getScrollers(container);
    const column = container.querySelector(
      '[data-calendar-week-day-column="true"][tabindex="0"]',
    );
    beginScrollInput(column);
    fireEvent.pointerCancel(column, { pointerId: 21, pointerType: "touch" });

    for (const position of [100, 150, 210]) {
      body.scrollLeft = position;
      fireEvent.scroll(body);
    }
    expect(header.scrollLeft).toBe(210);
    body.scrollLeft = 260;
    for (let event = 0; event < 3; event += 1) fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(260);
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(260);
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-calendar-mobile-selection-summary]"),
    ).not.toBeInTheDocument();
  });

  it.each(["body", "header"])(
    "scroll ownership does not send a clamped follower offset back to the %s",
    (sourceName) => {
      const { container } = renderWeek("customer");
      const scrollers = getScrollers(container);
      const source = scrollers[sourceName];
      const follower = scrollers[sourceName === "body" ? "header" : "body"];
      setGeometry(follower, { scrollWidth: 1000, clientWidth: 320 });
      beginScrollInput(source);
      source.scrollLeft = 800;
      fireEvent.scroll(source);
      expect(follower.scrollLeft).toBe(680);
      fireEvent.scroll(follower);
      expect(source.scrollLeft).toBe(800);

      beginScrollInput(follower);
      follower.scrollLeft = 500;
      fireEvent.scroll(follower);
      expect(source.scrollLeft).toBe(500);
    },
  );

  it("scroll ownership switches immediately for header input and body input on a slot button", () => {
    const { container } = renderWeek("customer");
    const { body, header } = getScrollers(container);
    beginScrollInput(body);
    body.scrollLeft = 100;
    fireEvent.scroll(body);

    fireEvent.wheel(header, { deltaX: 80, deltaY: 0 });
    header.scrollLeft = 180;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(180);
    header.scrollLeft = 220;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(220);
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(220);

    // The button stops bubbling pointerdown; the scroller must observe capture.
    const slotButton = body.querySelector(
      '[data-calendar-slot-control="true"]',
    );
    expect(slotButton).not.toBeNull();
    beginScrollInput(slotButton);
    body.scrollLeft = 300;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(300);
    body.scrollLeft = 340;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(340);
  });

  it("scroll ownership follows native focus scrolling into an offscreen body control after a header swipe", () => {
    const { container, onSlotSelect } = renderWeek("customer");
    const { body, header } = getScrollers(container);
    beginScrollInput(header);
    header.scrollLeft = 100;
    fireEvent.scroll(header);
    const controls = body.querySelectorAll(
      '[data-calendar-slot-control="true"]',
    );
    const lastControl = controls[controls.length - 1];
    expect(lastControl).not.toBeUndefined();

    // Tabbing in from a toolbar focuses the control before native scrollIntoView.
    // This control stops focus bubbling, so the scroller must observe capture.
    fireEvent.focusIn(lastControl);
    body.scrollLeft = 400;
    fireEvent.scroll(body);
    expect(header.scrollLeft).toBe(400);
    body.scrollLeft = 440;
    fireEvent.scroll(header);
    expect(body.scrollLeft).toBe(440);
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-calendar-slot-preview]"),
    ).not.toBeInTheDocument();
  });

  it.each(["customer", "public"])(
    "makes the %s weekday header keyboard reachable and preserves native synchronized scrolling",
    (audience) => {
      const { container } = renderWeek(audience);
      const { body, header } = getScrollers(container);
      beginScrollInput(body);
      body.scrollLeft = 100;
      fireEvent.scroll(body);
      expect(screen.getByRole("region", { name: "Week" })).toBe(header);
      expect(header.tabIndex).toBe(0);
      act(() => header.focus());
      expect(header).toHaveFocus();
      expect(fireEvent.keyDown(header, { key: "ArrowRight" })).toBe(true);
      header.scrollLeft = 180;
      fireEvent.scroll(header);
      expect(body.scrollLeft).toBe(180);
      header.scrollLeft = 220;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(220);

      const column = body.querySelector(
        '[data-calendar-week-day-column="true"]',
      );
      expect(fireEvent.keyDown(column, { key: "ArrowLeft" })).toBe(true);
      body.scrollLeft = 140;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(140);
    },
  );

  it("scroll ownership leaves a vertical page gesture uncancelled and does not select a time", () => {
    const { container, onSlotSelect } = renderWeek("customer");
    const { body, header } = getScrollers(container);
    beginScrollInput(body);
    body.scrollLeft = 180;
    fireEvent.scroll(body);
    const column = container.querySelector(
      '[data-calendar-week-day-column="true"][tabindex="0"]',
    );
    expect(
      fireEvent.pointerDown(column, {
        pointerId: 22,
        pointerType: "touch",
        clientX: 200,
        clientY: 350,
      }),
    ).toBe(true);
    expect(
      fireEvent.pointerMove(column, {
        pointerId: 22,
        pointerType: "touch",
        clientX: 200,
        clientY: 250,
      }),
    ).toBe(true);
    fireEvent.pointerCancel(column, { pointerId: 22, pointerType: "touch" });
    fireEvent.scroll(window);
    fireEvent.scroll(body);

    expect(body.scrollLeft).toBe(180);
    expect(header.scrollLeft).toBe(180);
    expect(body.scrollTop).toBe(0);
    expect(body).toHaveClass(
      "touch-auto",
      "overscroll-y-auto",
      "overflow-y-clip",
    );
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-calendar-slot-preview]"),
    ).not.toBeInTheDocument();
  });

  it("centres today inside the readable area to the right of the sticky time rail", () => {
    const animationFrames = [];
    globalThis.requestAnimationFrame = vi.fn((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    const { container } = renderWeek("customer");
    const headerScroller = container.querySelector(
      '[data-calendar-header-scroll="true"]',
    );
    const bodyScroller = container.querySelector(
      '[data-calendar-week-scroll="true"]',
    );
    const timeRail = container.querySelector(
      '[data-calendar-time-rail="true"]',
    );
    const dayColumns = container.querySelectorAll(
      '[data-calendar-week-day-column="true"]',
    );

    setGeometry(headerScroller, { scrollWidth: 1000, clientWidth: 320 });
    setGeometry(bodyScroller, { scrollWidth: 1000, clientWidth: 320 });
    vi.spyOn(timeRail, "getBoundingClientRect").mockReturnValue({
      top: 0,
      right: 48,
      bottom: 1008,
      left: 0,
      width: 48,
      height: 1008,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    dayColumns.forEach((column, index) => {
      setGeometry(column, {
        offsetLeft: 48 + index * 136,
        offsetWidth: 136,
      });
    });

    act(() => {
      animationFrames.splice(0).forEach((callback) => callback(0));
    });

    // Wednesday is the focused/today column: 388px centre - 184px visible
    // content centre (48px rail + half of the remaining 272px viewport).
    expect(bodyScroller.scrollLeft).toBe(204);
    expect(headerScroller.scrollLeft).toBe(204);
  });

  it("still centres today when an effect re-run cancels the first frame", () => {
    const animationFrames = new Map();
    let lastFrame = 0;
    globalThis.requestAnimationFrame = vi.fn((callback) => {
      lastFrame += 1;
      animationFrames.set(lastFrame, callback);
      return lastFrame;
    });
    globalThis.cancelAnimationFrame = vi.fn((frame) =>
      animationFrames.delete(frame),
    );
    const props = {
      date: new Date("2026-08-05T12:00:00.000Z"),
      studio,
      locale: "en-GB",
      audience: "customer",
      selectedActivityId: "WORKSTATION",
      onDateChange: vi.fn(),
      onSlotSelect: vi.fn(),
      t,
      pageScroll: true,
    };

    // StrictMode runs the effect, cleans it up and runs it again on mount,
    // as the app does in development, before any frame has fired.
    const { container } = render(
      <StrictMode>
        <WeekCalendar {...props} bookings={[]} />
      </StrictMode>,
    );
    const headerScroller = container.querySelector(
      '[data-calendar-header-scroll="true"]',
    );
    const bodyScroller = container.querySelector(
      '[data-calendar-week-scroll="true"]',
    );
    setGeometry(headerScroller, { scrollWidth: 1000, clientWidth: 320 });
    setGeometry(bodyScroller, { scrollWidth: 1000, clientWidth: 320 });
    vi.spyOn(
      container.querySelector('[data-calendar-time-rail="true"]'),
      "getBoundingClientRect",
    ).mockReturnValue({
      top: 0,
      right: 48,
      bottom: 1008,
      left: 0,
      width: 48,
      height: 1008,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    container
      .querySelectorAll('[data-calendar-week-day-column="true"]')
      .forEach((column, index) => {
        setGeometry(column, {
          offsetLeft: 48 + index * 136,
          offsetWidth: 136,
        });
      });

    act(() => {
      [...animationFrames.values()].forEach((callback) => callback(0));
      animationFrames.clear();
    });

    expect(bodyScroller.scrollLeft).toBe(204);
    expect(headerScroller.scrollLeft).toBe(204);
  });

  it.each(["customer", "public"])(
    "inherits the measured header and command-bar offsets for %s page scrolling",
    (audience) => {
      const { container } = renderWeek(audience);
      const mobileHeader = container.querySelector(
        '[data-calendar-mobile-grid-header="true"]',
      );

      expect(mobileHeader.style.top).toBe(
        "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))",
      );
    },
  );

  it("keeps the public weekday header at the calendar edge for internal scrolling", () => {
    const { container } = renderWeek("public", undefined, false);

    expect(
      container.querySelector('[data-calendar-mobile-grid-header="true"]').style
        .top,
    ).toBe("0px");
  });

  it("keeps the existing mobile agenda and desktop-only grid for tenant users", () => {
    const { container } = renderWeek("tenant");

    expect(
      container.querySelector('[data-calendar-mobile-agenda="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-calendar-mobile-week-grid="true"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-calendar-desktop-week="true"]'),
    ).toHaveClass("hidden", "lg:block");
  });

  it.each([
    ["customer", "touch"],
    ["public", "touch"],
    ["customer", "Enter"],
    ["public", "Space"],
  ])(
    "confirms the current %s Week selection with the visible inline plus using %s",
    async (audience, activation) => {
      const user = userEvent.setup();
      const onSlotSelect = vi.fn();
      const { container } = renderWeek(audience, onSlotSelect);
      const selectableDay = container.querySelector(
        '[data-calendar-week-day-column="true"][tabindex="0"]',
      );
      vi.spyOn(selectableDay, "getBoundingClientRect").mockReturnValue({
        top: 0,
        bottom: 1000,
        left: 0,
        right: 140,
        width: 140,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const touch = {
        pointerId: 7,
        pointerType: "touch",
        clientX: 30,
        clientY: 350,
      };
      fireEvent.pointerDown(selectableDay, touch);
      fireEvent.pointerUp(selectableDay, touch);
      fireEvent.click(selectableDay, touch);

      const preview = container.querySelector(
        '[data-calendar-slot-preview="true"]',
      );
      const confirm = preview.querySelector(
        '[data-calendar-slot-confirm="true"]',
      );
      expect(preview).toHaveAttribute("data-calendar-slot-phase", "ready");
      expect(confirm).toBeVisible();
      expect(confirm).toHaveClass("inline-flex");
      expect(confirm).not.toHaveClass("hidden");
      expect(confirm).toBeEnabled();
      expect(confirm).toHaveAccessibleName(/New booking.*12:00.*13:00/);
      expect(
        screen.getByRole("region", { name: "Selected time" }),
      ).toHaveTextContent(/12:00.*13:00/);
      expect(onSlotSelect).not.toHaveBeenCalled();

      if (activation === "touch") {
        fireEvent.pointerDown(confirm, { ...touch, pointerId: 8, button: 0 });
        expect(preview).toHaveAttribute("data-calendar-slot-phase", "ready");
        fireEvent.pointerUp(confirm, { ...touch, pointerId: 8, button: 0 });
        fireEvent.click(confirm);
      } else {
        fireEvent.keyDown(
          preview.querySelector('[data-calendar-slot-resize="end"]'),
          { key: "ArrowDown" },
        );
        expect(confirm).toHaveAccessibleName(/New booking.*12:00.*13:30/);
        act(() => confirm.focus());
        await user.keyboard(activation === "Enter" ? "{Enter}" : " ");
      }

      expect(onSlotSelect).toHaveBeenCalledExactlyOnceWith({
        studio,
        activityId: "WORKSTATION",
        start: new Date("2026-08-05T12:00:00.000Z"),
        end: new Date(
          activation === "touch"
            ? "2026-08-05T13:00:00.000Z"
            : "2026-08-05T13:30:00.000Z",
        ),
      });
      expect(preview).not.toBeInTheDocument();
    },
  );

  it("does not select a time when a touch gesture becomes a swipe", () => {
    const { container } = renderWeek("customer");
    const selectableDay = container.querySelector(
      '[data-calendar-week-day-column="true"][tabindex="0"]',
    );

    fireEvent.pointerDown(selectableDay, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 24,
      clientY: 350,
    });
    fireEvent.pointerMove(selectableDay, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 64,
      clientY: 350,
    });
    fireEvent.pointerUp(selectableDay, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 64,
      clientY: 350,
    });
    fireEvent.click(selectableDay, { clientX: 64, clientY: 350 });

    expect(
      container.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-calendar-mobile-selection-summary]"),
    ).not.toBeInTheDocument();
  });

  it("revalidates the tapped grid time before continuing", () => {
    const onSlotSelect = vi.fn();
    const { container } = renderWeek("customer", onSlotSelect);
    const selectableDay = container.querySelector(
      '[data-calendar-week-day-column="true"][tabindex="0"]',
    );
    vi.spyOn(selectableDay, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 1000,
      left: 0,
      right: 140,
      width: 140,
      height: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(selectableDay, {
      pointerId: 11,
      pointerType: "touch",
      clientX: 30,
      clientY: 350,
    });
    fireEvent.pointerUp(selectableDay, {
      pointerId: 11,
      pointerType: "touch",
      clientX: 30,
      clientY: 350,
    });
    fireEvent.click(selectableDay, { clientX: 30, clientY: 350 });
    expect(
      container.querySelector("[data-calendar-mobile-selection-summary]"),
    ).toBeInTheDocument();

    vi.setSystemTime(new Date("2026-08-05T12:30:00.000Z"));
    fireEvent.click(
      container.querySelector('[data-calendar-mobile-continue="true"]'),
    );

    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-calendar-mobile-selection-summary]"),
    ).not.toBeInTheDocument();
  });
});
