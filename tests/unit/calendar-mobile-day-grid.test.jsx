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

import DayCalendar from "@/components/calendar/DayCalendar";

const capacityStudio = {
  id: "studio-1",
  timeZone: "UTC",
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  availabilityMode: "capacity",
  resources: [{ id: "WORKSTATION", name: "Pottery wheel", capacity: 2 }],
  openingHours: {
    tuesday: { isOpen: true, openTime: "08:00", closeTime: "20:00" },
  },
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
  if (key === "events.closed") return "Closed";
  if (key === "events.unavailable") return "Unavailable";
  if (key === "day.overlapInfo") return "Bookings can overlap.";
  if (key === "day.max") return `Maximum ${values.count}`;
  if (key === "day.places") return `${values.count} places`;
  if (key === "day.capacity") return "Capacity";
  if (key === "day.publicLane") return `Place ${values.number}`;
  if (key === "selection.adjustStart") return "Adjust start";
  if (key === "selection.adjustEnd") return "Adjust end";
  if (key === "selection.resizeHint") return "Drag to resize";
  return key;
};

const renderDay = ({
  audience = "customer",
  studio = capacityStudio,
  onSlotSelect = audience === "customer" ? vi.fn() : undefined,
  pageScroll = true,
} = {}) => {
  const result = render(
    <DayCalendar
      date={new Date("2026-08-04T12:00:00.000Z")}
      bookings={[]}
      studio={studio}
      locale="en-GB"
      audience={audience}
      selectedActivityId="WORKSTATION"
      onBookingClick={vi.fn()}
      onSlotSelect={onSlotSelect}
      pageScroll={pageScroll}
      t={t}
    />,
  );

  return { ...result, onSlotSelect };
};

const mockGridBounds = (column) => {
  vi.spyOn(column, "getBoundingClientRect").mockReturnValue({
    top: 0,
    bottom: 1248,
    left: 64,
    right: 320,
    width: 256,
    height: 1248,
    x: 64,
    y: 0,
    toJSON: () => ({}),
  });
};

const getScrollers = (container) => {
  const body = container.querySelector('[data-calendar-day-scroll="true"]');
  const header = container.querySelector(
    '[data-calendar-day-header-scroll="true"]',
  );
  for (const element of [body, header]) {
    Object.defineProperties(element, {
      clientWidth: { configurable: true, value: 320 },
      scrollWidth: { configurable: true, value: 900 },
    });
  }
  return { body, header };
};

const beginScrollInput = (element) =>
  fireEvent.pointerDown(element, {
    pointerId: 21,
    pointerType: "touch",
    clientX: 200,
    clientY: 208,
  });

describe("DayCalendar mobile time grid", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-03T10:15:00.000Z"));
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
    "renders the real single-day time grid for %s mobile visitors",
    (audience) => {
      const { container } = renderDay({ audience });

      expect(
        container.querySelector('[data-calendar-mobile-agenda="true"]'),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-calendar-mobile-day-grid="true"]'),
      ).toBeInTheDocument();

      const scroller = container.querySelector(
        '[data-calendar-day-scroll="true"]',
      );
      expect(scroller).toHaveClass(
        "overflow-x-auto",
        "overflow-y-clip",
        "overscroll-x-contain",
      );
      expect(
        container.querySelector('[data-calendar-time-rail="true"]'),
      ).toHaveClass("sticky", "left-0");
      expect(
        container.querySelector('[data-calendar-day-canvas="true"]'),
      ).toHaveClass(
        "w-full",
        "[min-width:var(--calendar-day-mobile-min-width)]",
      );
      const gridTrack = container.querySelector(
        '[data-calendar-day-canvas="true"] .calendar-day-responsive-grid',
      );
      expect(gridTrack.style.gridTemplateColumns).toBe(
        "var(--calendar-day-columns, 64px minmax(280px, 1fr))",
      );
      expect(
        gridTrack.style.getPropertyValue("--calendar-day-desktop-columns"),
      ).toBe("64px minmax(280px, 1fr)");
      expect(
        gridTrack.style.getPropertyValue("--calendar-day-mobile-columns"),
      ).toBe("64px minmax(180px, 1fr)");
      expect(
        container.querySelectorAll('[data-calendar-day-column="true"]'),
      ).toHaveLength(1);
      expect(
        container.querySelector("[data-calendar-capacity-rail]"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Capacity")).not.toBeInTheDocument();
      expect(scroller).toHaveTextContent("08:00");
    },
  );

  it.each([
    ["capacity", capacityStudio],
    ["fixed-lane", laneStudio],
  ])(
    "keeps the %s header sticky and synchronized with the page-scroll body",
    (_, studio) => {
      const { container } = renderDay({ studio });
      const headerScroller = container.querySelector(
        '[data-calendar-day-header-scroll="true"]',
      );
      const bodyScroller = container.querySelector(
        '[data-calendar-day-scroll="true"]',
      );

      expect(headerScroller).toHaveClass(
        "sticky",
        "overflow-x-auto",
        "overscroll-x-contain",
      );
      expect(headerScroller).toHaveStyle({
        top: "calc(var(--calendar-command-toolbar-sticky-top, var(--header-height, 4.875rem)) + var(--calendar-command-toolbar-sticky-height, 0px))",
      });
      expect(
        bodyScroller.querySelector('[data-calendar-grid-header="true"]'),
      ).not.toBeInTheDocument();
      expect(
        headerScroller.querySelector('[data-calendar-grid-header="true"]'),
      ).toBeInTheDocument();

      Object.defineProperties(headerScroller, {
        clientWidth: { configurable: true, value: 320 },
        scrollWidth: { configurable: true, value: 720 },
      });
      Object.defineProperties(bodyScroller, {
        clientWidth: { configurable: true, value: 320 },
        scrollWidth: { configurable: true, value: 720 },
      });

      beginScrollInput(bodyScroller);
      bodyScroller.scrollLeft = 146;
      fireEvent.scroll(bodyScroller);
      expect(headerScroller.scrollLeft).toBe(146);

      beginScrollInput(headerScroller);
      headerScroller.scrollLeft = 88;
      fireEvent.scroll(headerScroller);
      expect(bodyScroller.scrollLeft).toBe(88);
    },
  );

  describe.each([
    ["capacity", capacityStudio],
    ["fixed-lane", laneStudio],
  ])("%s scroll ownership", (_, studio) => {
    it.each(["body", "header"])(
      "ignores a delayed follower echo during a %s swipe",
      (sourceName) => {
        const { container } = renderDay({ studio });
        const scrollers = getScrollers(container);
        const source = scrollers[sourceName];
        const follower = scrollers[sourceName === "body" ? "header" : "body"];
        beginScrollInput(source);
        source.scrollLeft = 100;
        fireEvent.scroll(source);
        expect(follower.scrollLeft).toBe(100);

        source.scrollLeft = 140;
        fireEvent.scroll(follower);
        expect(source.scrollLeft).toBe(140);
        fireEvent.scroll(source);
        expect(follower.scrollLeft).toBe(140);
      },
    );

    it("retains native momentum after pointercancel and coalesced follower echoes", () => {
      const { container, onSlotSelect } = renderDay({ studio });
      const { body, header } = getScrollers(container);
      const column = body.querySelector(
        '[data-calendar-day-column="true"][tabindex="0"]',
      );
      beginScrollInput(column);
      fireEvent.pointerCancel(column, { pointerId: 21, pointerType: "touch" });
      for (const position of [80, 120, 170]) {
        body.scrollLeft = position;
        fireEvent.scroll(body);
      }
      expect(header.scrollLeft).toBe(170);
      body.scrollLeft = 210;
      for (let event = 0; event < 3; event += 1) fireEvent.scroll(header);
      expect(body.scrollLeft).toBe(210);
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(210);
      expect(onSlotSelect).not.toHaveBeenCalled();
      expect(
        container.querySelector("[data-calendar-slot-preview]"),
      ).not.toBeInTheDocument();
    });

    it.each(["body", "header"])(
      "does not overwrite the %s with a smaller follower scroll range",
      (sourceName) => {
        const { container } = renderDay({ studio });
        const scrollers = getScrollers(container);
        const source = scrollers[sourceName];
        const follower = scrollers[sourceName === "body" ? "header" : "body"];
        Object.defineProperty(follower, "scrollWidth", {
          configurable: true,
          value: 720,
        });
        beginScrollInput(source);
        source.scrollLeft = 500;
        fireEvent.scroll(source);
        expect(follower.scrollLeft).toBe(400);
        fireEvent.scroll(follower);
        expect(source.scrollLeft).toBe(500);

        beginScrollInput(follower);
        follower.scrollLeft = 250;
        fireEvent.scroll(follower);
        expect(source.scrollLeft).toBe(250);
      },
    );

    it("switches for header input and captures body input even on a slot button", () => {
      const { container } = renderDay({ studio });
      const { body, header } = getScrollers(container);
      beginScrollInput(body);
      body.scrollLeft = 80;
      fireEvent.scroll(body);
      beginScrollInput(header);
      header.scrollLeft = 140;
      fireEvent.scroll(header);
      expect(body.scrollLeft).toBe(140);
      header.scrollLeft = 180;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(180);
      fireEvent.scroll(header);

      const slotButton = body.querySelector(
        '[data-calendar-slot-control="true"]',
      );
      expect(slotButton).not.toBeNull();
      beginScrollInput(slotButton);
      body.scrollLeft = 230;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(230);
      body.scrollLeft = 270;
      fireEvent.scroll(header);
      expect(body.scrollLeft).toBe(270);
    });

    it("follows native focus scrolling into an offscreen body control after a header swipe", () => {
      const { container, onSlotSelect } = renderDay({ studio });
      const { body, header } = getScrollers(container);
      beginScrollInput(header);
      header.scrollLeft = 100;
      fireEvent.scroll(header);
      const controls = body.querySelectorAll(
        '[data-calendar-slot-control="true"]',
      );
      const lastControl = controls[controls.length - 1];
      expect(lastControl).not.toBeUndefined();
      fireEvent.focusIn(lastControl);
      body.scrollLeft = 300;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(300);
      body.scrollLeft = 340;
      fireEvent.scroll(header);
      expect(body.scrollLeft).toBe(340);
      expect(onSlotSelect).not.toHaveBeenCalled();
      expect(
        container.querySelector("[data-calendar-slot-preview]"),
      ).not.toBeInTheDocument();
    });

    it("follows navigation keys on either surface without cancelling native scrolling", () => {
      const { container } = renderDay({ studio });
      const { body, header } = getScrollers(container);
      beginScrollInput(body);
      body.scrollLeft = 100;
      fireEvent.scroll(body);
      expect(fireEvent.keyDown(header, { key: "ArrowRight" })).toBe(true);
      header.scrollLeft = 180;
      fireEvent.scroll(header);
      expect(body.scrollLeft).toBe(180);
      header.scrollLeft = 220;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(220);

      const column = body.querySelector('[data-calendar-day-column="true"]');
      expect(fireEvent.keyDown(column, { key: "ArrowLeft" })).toBe(true);
      body.scrollLeft = 140;
      fireEvent.scroll(body);
      expect(header.scrollLeft).toBe(140);
    });

    it("leaves vertical page gestures uncancelled without selecting a time", () => {
      const { container, onSlotSelect } = renderDay({ studio });
      const { body, header } = getScrollers(container);
      beginScrollInput(body);
      body.scrollLeft = 180;
      fireEvent.scroll(body);
      const column = body.querySelector(
        '[data-calendar-day-column="true"][tabindex="0"]',
      );
      expect(
        fireEvent.pointerDown(column, {
          pointerId: 22,
          pointerType: "touch",
          clientX: 200,
          clientY: 208,
        }),
      ).toBe(true);
      expect(
        fireEvent.pointerMove(column, {
          pointerId: 22,
          pointerType: "touch",
          clientX: 200,
          clientY: 308,
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
  });

  it("keeps the tenant mobile agenda and desktop-only Day grid", () => {
    const { container } = renderDay({ audience: "tenant" });

    expect(
      container.querySelector('[data-calendar-mobile-agenda="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-calendar-mobile-day-grid="true"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-calendar-desktop-grid="true"]'),
    ).toHaveClass("hidden", "lg:flex");
  });

  it("keeps tenant Day on its original nested desktop scroller", () => {
    const { container } = renderDay({ audience: "tenant", pageScroll: false });
    const scroller = container.querySelector(
      '[data-calendar-day-scroll="true"]',
    );
    const inlineHeader = scroller.querySelector(
      '[data-calendar-grid-header="true"]',
    );

    expect(
      container.querySelector('[data-calendar-day-header-scroll="true"]'),
    ).not.toBeInTheDocument();
    expect(scroller).toHaveClass("flex-1", "overflow-auto");
    expect(inlineHeader.parentElement).toHaveClass("sticky", "top-0", "z-30");
  });

  it("still scrolls the nested Day to now when an effect re-run cancels the first frame", () => {
    vi.setSystemTime(new Date("2026-08-04T10:15:00.000Z"));
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
      date: new Date("2026-08-04T12:00:00.000Z"),
      studio: capacityStudio,
      locale: "en-GB",
      audience: "tenant",
      selectedActivityId: "WORKSTATION",
      onBookingClick: vi.fn(),
      pageScroll: false,
      t,
    };

    // StrictMode runs the effect, cleans it up and runs it again on mount.
    const { container } = render(
      <StrictMode>
        <DayCalendar {...props} bookings={[]} />
      </StrictMode>,
    );
    const scroller = container.querySelector(
      '[data-calendar-day-scroll="true"]',
    );
    act(() => {
      [...animationFrames.values()].forEach((callback) => callback(0));
      animationFrames.clear();
    });

    // 10:15 now, less the 90 minute lead, starts the view at 08:45.
    expect(scroller.scrollTop).toBeGreaterThan(0);
  });

  it("preserves the fixed-lane Day model on narrow customer screens", () => {
    const { container } = renderDay({ studio: laneStudio });

    expect(
      container.querySelectorAll('[data-calendar-day-column="true"]'),
    ).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Place 1" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Place 2" })).toBeEnabled();
  });

  it.each([
    ["customer", "capacity", capacityStudio, "touch"],
    ["public", "capacity", capacityStudio, "Enter"],
    ["customer", "fixed-lane", laneStudio, "Space"],
    ["public", "fixed-lane", laneStudio, "touch"],
  ])(
    "confirms the current %s %s Day selection with the visible inline plus",
    async (audience, _mode, studio, activation) => {
      const user = userEvent.setup();
      const onSlotSelect = vi.fn();
      const { container } = renderDay({ audience, studio, onSlotSelect });
      const column = container.querySelector(
        '[data-calendar-day-column="true"][tabindex="0"]',
      );
      mockGridBounds(column);

      const touch = {
        pointerId: 7,
        pointerType: "touch",
        clientX: 160,
        clientY: 208,
      };
      fireEvent.pointerDown(column, touch);
      fireEvent.pointerUp(column, touch);
      fireEvent.click(column, touch);

      const preview = container.querySelector(
        '[data-calendar-slot-preview="true"]',
      );
      const confirm = preview.querySelector(
        '[data-calendar-slot-confirm="true"]',
      );
      expect(preview).toHaveAttribute("data-calendar-slot-phase", "ready");
      expect(
        preview.querySelectorAll("[data-calendar-slot-resize]"),
      ).toHaveLength(2);
      expect(confirm).toBeVisible();
      expect(confirm).toHaveClass("inline-flex");
      expect(confirm).not.toHaveClass("hidden");
      expect(confirm).toBeEnabled();
      expect(confirm).toHaveAccessibleName(/New booking.*10:00.*11:00/);
      expect(
        screen.getByRole("region", { name: "Selected time" }),
      ).toHaveTextContent(/10:00.*11:00/i);
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
        expect(confirm).toHaveAccessibleName(/New booking.*10:00.*11:30/);
        act(() => confirm.focus());
        await user.keyboard(activation === "Enter" ? "{Enter}" : " ");
      }

      expect(onSlotSelect).toHaveBeenCalledExactlyOnceWith({
        studio,
        activityId: "WORKSTATION",
        ...(studio === laneStudio ? { laneIndex: 0 } : {}),
        start: new Date("2026-08-04T10:00:00.000Z"),
        end: new Date(
          activation === "touch"
            ? "2026-08-04T11:00:00.000Z"
            : "2026-08-04T11:30:00.000Z",
        ),
      });
      expect(preview).not.toBeInTheDocument();
    },
  );

  it("moves the selected Day draft with a thumb drag before continuing", () => {
    const { container } = renderDay();
    const column = container.querySelector(
      '[data-calendar-day-column="true"][tabindex="0"]',
    );
    mockGridBounds(column);

    fireEvent.pointerDown(column, {
      pointerId: 11,
      pointerType: "touch",
      clientX: 160,
      clientY: 208,
    });
    fireEvent.pointerUp(column, {
      pointerId: 11,
      pointerType: "touch",
      clientX: 160,
      clientY: 208,
    });
    fireEvent.click(column, { clientX: 160, clientY: 208 });

    const preview = container.querySelector(
      '[data-calendar-slot-preview="true"]',
    );
    preview.setPointerCapture = vi.fn();
    preview.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(preview, {
      button: 0,
      pointerId: 12,
      pointerType: "touch",
      clientX: 160,
      clientY: 208,
    });
    expect(
      container.querySelector('[data-calendar-slot-phase="moving"]'),
    ).toBeInTheDocument();

    fireEvent.pointerMove(
      container.querySelector('[data-calendar-slot-preview="true"]'),
      {
        pointerId: 12,
        pointerType: "touch",
        clientX: 160,
        clientY: 260,
      },
    );
    fireEvent.pointerUp(
      container.querySelector('[data-calendar-slot-preview="true"]'),
      {
        pointerId: 12,
        pointerType: "touch",
        clientX: 160,
        clientY: 260,
      },
    );

    expect(
      screen.getByRole("region", { name: "Selected time" }),
    ).toHaveTextContent(/10:30.*11:30/i);
  });

  it("leaves horizontal and vertical thumb swipes available for navigation", () => {
    const { container } = renderDay();
    const column = container.querySelector(
      '[data-calendar-day-column="true"][tabindex="0"]',
    );
    mockGridBounds(column);

    fireEvent.pointerDown(column, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 120,
      clientY: 208,
    });
    fireEvent.pointerMove(column, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 170,
      clientY: 240,
    });
    fireEvent.pointerUp(column, {
      pointerId: 9,
      pointerType: "touch",
      clientX: 170,
      clientY: 240,
    });
    fireEvent.click(column, { clientX: 170, clientY: 240 });

    expect(
      container.querySelector('[data-calendar-slot-preview="true"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-calendar-mobile-selection-summary]"),
    ).not.toBeInTheDocument();
  });
});
