import { useState } from "react";
import { fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import StudioCalendar from "@/components/calendar/StudioCalendar";
import messages from "@/messages/en.json";

const day = new Date("2026-12-24T12:00:00Z");
const location = {
  id: "vaclavska",
  name: "Václavská",
  booking: {
    enabled: true,
    timezone: "UTC",
    allowPublicOverlap: true,
    maxConcurrentOpenStudioBookings: 6,
    globalCapacity: 6,
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    activityCapacities: [{ activity: "WORKSTATION", capacity: 6 }],
  },
  openingHours: Object.fromEntries(
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((weekday) => [
      weekday,
      { isOpen: true, openTime: "06:00", closeTime: "12:00" },
    ]),
  ),
};
const booking = {
  id: "existing-booking",
  locationId: location.id,
  productId: "open-studio-product",
  productName: "Studio session",
  kind: "sharedOpenStudio",
  bookingMode: "public",
  activityId: "WORKSTATION",
  start: "2026-12-24T08:00:00Z",
  end: "2026-12-24T10:00:00Z",
  guests: 1,
};
const course = {
  ...booking,
  id: "course-session-1",
  productId: "course-product",
  kind: "class",
  capacity: 6,
  guests: 4,
  remainingCapacity: 2,
  available: true,
};

function renderCalendar(overrides = {}) {
  const onSlotSelect = vi.fn();
  const onBookingClick = vi.fn();
  const onViewChange = vi.fn();
  const onDateChange = vi.fn();
  const {
    view: initialView = "week",
    date: initialDate = day,
    ...calendarProps
  } = overrides;
  function CalendarHarness({ updates = {} }) {
    const [view, setView] = useState(initialView);
    const [date, setDate] = useState(initialDate);
    return (
      <NextIntlClientProvider locale="en-GB" timeZone="UTC" messages={messages}>
        <StudioCalendar
          audience="customer"
          location={location}
          bookings={[booking]}
          pageScroll
          onSlotSelect={onSlotSelect}
          onBookingClick={onBookingClick}
          {...calendarProps}
          {...updates}
          date={date}
          view={view}
          onViewChange={(value) => {
            onViewChange(value);
            setView(value);
          }}
          onDateChange={(value) => {
            onDateChange(value);
            setDate(value);
          }}
        />
      </NextIntlClientProvider>
    );
  }
  const result = render(<CalendarHarness />);
  const card = result.container.querySelector("[data-calendar-event-card]");
  expect(card).toBeInTheDocument();
  return {
    ...result,
    card,
    onSlotSelect,
    onBookingClick,
    onViewChange,
    onDateChange,
    rerenderCalendar: (updates) =>
      result.rerender(<CalendarHarness updates={updates} />),
  };
}

function expectPreview(calendar, bookable = true) {
  expect(calendar.onSlotSelect).not.toHaveBeenCalled();
  expect(calendar.onBookingClick).not.toHaveBeenCalled();
  const preview = calendar.container.querySelector(
    "[data-calendar-slot-preview]",
  );
  expect(preview).toBeInTheDocument();
  expect(preview).toHaveAttribute("data-calendar-slot-phase", "ready");
  expect(preview).toHaveAttribute(
    "data-calendar-slot-bookable",
    String(bookable),
  );
  expect(preview.querySelectorAll("[data-calendar-slot-resize]")).toHaveLength(
    2,
  );
  const confirm = preview.querySelector("[data-calendar-slot-confirm]");
  if (bookable) expect(confirm).toBeEnabled();
  else expect(confirm).toBeDisabled();
  return { preview, confirm };
}

function expectCreation(
  { onSlotSelect, onBookingClick },
  start = "2026-12-24T08:00:00Z",
  end = "2026-12-24T09:00:00Z",
) {
  expect(onSlotSelect).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      studio: expect.objectContaining({ id: "vaclavska" }),
      activityId: "WORKSTATION",
      start: new Date(start),
      end: new Date(end),
    }),
  );
  const selection = onSlotSelect.mock.lastCall[0];
  expect(selection).not.toHaveProperty("bookingId");
  expect(selection).not.toHaveProperty("id");
  expect(selection).not.toHaveProperty("courseSessionId");
  expect(selection).not.toHaveProperty("productId");
  expect(onBookingClick).not.toHaveBeenCalled();
}

describe("customer calendar creation from occupied cards", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["day", "week", "month"])(
    "%s previews a minimum-duration booking and waits for confirmation",
    (view) => {
      const calendar = renderCalendar({ view });
      fireEvent.click(calendar.card);
      const { preview, confirm } = expectPreview(calendar);
      expect(preview).toHaveAccessibleName(/08:00.*09:00/);
      if (view === "month") {
        expect(calendar.onViewChange).toHaveBeenCalledExactlyOnceWith("day");
        expect(calendar.onDateChange).toHaveBeenCalledExactlyOnceWith(
          new Date(2026, 11, 24, 12),
        );
      }
      fireEvent.click(confirm);
      expectCreation(calendar);
    },
  );

  it("creates from the customer's own booking without opening its details", () => {
    const calendar = renderCalendar({
      bookings: [{ ...booking, isMine: true }],
    });
    expect(calendar.card).toHaveAttribute("data-calendar-my-booking", "true");
    fireEvent.click(calendar.card);
    fireEvent.click(expectPreview(calendar).confirm);
    expectCreation(calendar);
  });

  it.each(["day", "week", "month"])(
    "%s keeps occupied-card creation usable on a phone",
    async (view) => {
      window.matchMedia.mockImplementation((query) => ({
        matches: query === "(max-width: 639px)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));
      const user = userEvent.setup();
      const calendar = renderCalendar({ view });
      let clientY = 0;
      if (view !== "month") {
        const pixelsPerMinute = (view === "day" ? 52 : 42) / 30;
        const column = calendar.card.closest(
          "[data-calendar-day-column], [data-calendar-week-day-column]",
        );
        vi.spyOn(column, "getBoundingClientRect").mockReturnValue({
          top: 100,
          bottom: 100 + 360 * pixelsPerMinute,
          left: 0,
          right: 200,
          width: 200,
          height: 360 * pixelsPerMinute,
        });
        clientY = 100 + 121 * pixelsPerMinute;
      }
      await user.pointer([
        {
          keys: "[TouchA>]",
          target: calendar.card,
          coords: { clientX: 50, clientY },
        },
        {
          keys: "[/TouchA]",
          target: calendar.card,
          coords: { clientX: 50, clientY },
        },
      ]);
      expectPreview(calendar);
      const continueButton = calendar.container.querySelector(
        "[data-calendar-mobile-continue]",
      );
      expect(continueButton).toBeEnabled();
      await user.click(continueButton);
      expectCreation(calendar);
    },
  );

  it.each([
    ["day", 52 / 30],
    ["week", 42 / 30],
  ])(
    "%s selects the clicked future time in an ongoing booking on a scrolled grid",
    (view, pixelsPerMinute) => {
      vi.setSystemTime(new Date("2026-12-24T08:15:00Z"));
      const calendar = renderCalendar({ view });
      const column = calendar.card.closest(
        "[data-calendar-day-column], [data-calendar-week-day-column]",
      );
      vi.spyOn(column, "getBoundingClientRect").mockReturnValue({
        top: -100,
        bottom: -100 + 360 * pixelsPerMinute,
        left: 0,
        right: 200,
        width: 200,
        height: 360 * pixelsPerMinute,
      });
      fireEvent.click(calendar.card, {
        detail: 1,
        clientY: -100 + 151 * pixelsPerMinute,
      });
      const { preview, confirm } = expectPreview(calendar);
      expect(preview).toHaveAccessibleName(/08:30.*09:30/);
      fireEvent.click(confirm);
      expectCreation(calendar, "2026-12-24T08:30:00Z", "2026-12-24T09:30:00Z");
    },
  );

  it.each(["day", "week"])(
    "%s disables confirmation when live capacity fills after selecting a preview",
    (view) => {
      const calendar = renderCalendar({ view });
      fireEvent.click(calendar.card);
      expectPreview(calendar);

      calendar.rerenderCalendar({ bookings: [{ ...booking, guests: 6 }] });

      const { preview, confirm } = expectPreview(calendar, false);
      expect(preview).toHaveAccessibleName(/08:00.*09:00/);
      fireEvent.click(confirm);
      expect(calendar.onSlotSelect).not.toHaveBeenCalled();
      expect(calendar.onBookingClick).not.toHaveBeenCalled();
    },
  );

  it("places the day preview in a free lane without moving the existing booking", () => {
    const calendar = renderCalendar({
      view: "day",
      location: {
        ...location,
        availabilityMode: "lanes",
        booking: { ...location.booking, maxConcurrentOpenStudioBookings: 2 },
      },
      bookings: [{ ...booking, laneIndex: 0 }],
    });
    const occupiedColumn = calendar.card.closest("[data-calendar-day-column]");
    fireEvent.click(calendar.card);
    const { preview, confirm } = expectPreview(calendar);
    expect(preview.closest("[data-calendar-day-column]")).not.toBe(
      occupiedColumn,
    );
    expect(occupiedColumn.querySelector("[data-calendar-event-card]")).toBe(
      calendar.card,
    );
    fireEvent.click(confirm);
    expectCreation(calendar);
    expect(calendar.onSlotSelect.mock.lastCall[0].laneIndex).toBe(1);
  });

  it("previews with Enter on the month agenda before confirmation", async () => {
    const user = userEvent.setup();
    const calendar = renderCalendar({
      view: "month",
    });
    calendar.card.focus();
    await user.keyboard("{Enter}");
    const { confirm } = expectPreview(calendar);
    confirm.focus();
    await user.keyboard("{Enter}");
    expectCreation(calendar);
  });

  it.each(["day", "week", "month"])(
    "%s confirms the exact course session when its preview is unchanged",
    (view) => {
      const calendar = renderCalendar({ view, bookings: [course] });
      fireEvent.click(calendar.card);
      const { preview, confirm } = expectPreview(calendar);
      expect(preview).toHaveAccessibleName(/08:00.*10:00/);
      fireEvent.click(confirm);
      expect(calendar.onSlotSelect).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          studio: expect.objectContaining({ id: "vaclavska" }),
          productId: "course-product",
          courseSessionId: "course-session-1",
          start: new Date(course.start),
          end: new Date(course.end),
          quantity: 1,
        }),
      );
      expect(calendar.onBookingClick).not.toHaveBeenCalled();
    },
  );

  it.each(["day", "week"])(
    "%s drops course identity when its preview moves to another time",
    (view) => {
      const calendar = renderCalendar({ view, bookings: [course] });
      fireEvent.click(calendar.card);
      const { preview } = expectPreview(calendar);
      fireEvent.keyDown(preview, { key: "ArrowDown" });
      expectPreview(calendar, false);
      for (let step = 0; step < 3; step += 1) {
        fireEvent.keyDown(preview, { key: "ArrowDown" });
      }
      fireEvent.click(expectPreview(calendar).confirm);
      expectCreation(calendar, "2026-12-24T10:00:00Z", "2026-12-24T12:00:00Z");
    },
  );

  it.each(["day", "week"])(
    "%s drops course identity when its preview duration is resized",
    (view) => {
      const calendar = renderCalendar({ view, bookings: [course] });
      fireEvent.click(calendar.card);
      const { preview } = expectPreview(calendar);
      fireEvent.keyDown(
        preview.querySelector('[data-calendar-slot-resize="end"]'),
        { key: "ArrowUp" },
      );
      expectPreview(calendar, false);
      for (let step = 0; step < 4; step += 1) {
        fireEvent.keyDown(preview, { key: "ArrowDown" });
      }
      fireEvent.click(expectPreview(calendar).confirm);
      expectCreation(calendar, "2026-12-24T10:00:00Z", "2026-12-24T11:30:00Z");
    },
  );

  it("does not offer a course whose last places are held by another checkout", () => {
    const calendar = renderCalendar({
      bookings: [
        {
          ...booking,
          id: "course-with-holds",
          kind: "class",
          capacity: 6,
          guests: 4,
          remainingCapacity: 0,
          available: false,
        },
      ],
    });
    fireEvent.click(calendar.card);
    const { confirm } = expectPreview(calendar, false);
    fireEvent.click(confirm);
    expect(calendar.onSlotSelect).not.toHaveBeenCalled();
  });

  it.each(
    [
      ["full", { guests: 6 }],
      ["private", { kind: "exclusiveOpenStudio", bookingMode: "private" }],
      ["closed", { isClosure: true }],
      ["past", { start: "2026-10-24T08:00:00Z", end: "2026-10-24T10:00:00Z" }],
    ].flatMap(([state, changes]) =>
      ["day", "week", "month"].map((view) => [view, state, changes]),
    ),
  )(
    "%s previews a %s session with confirmation disabled",
    (view, _, changes) => {
      const event = { ...booking, ...changes };
      const calendar = renderCalendar({
        view,
        bookings: [event],
        date: new Date(event.start),
      });
      fireEvent.click(calendar.card);
      const { confirm } = expectPreview(calendar, false);
      fireEvent.click(confirm);
      expect(calendar.onSlotSelect).not.toHaveBeenCalled();
    },
  );

  it.each(["day", "week", "month"])(
    "%s lets an unavailable private preview move to free time before confirming",
    (view) => {
      const calendar = renderCalendar({
        view,
        bookings: [
          { ...booking, kind: "exclusiveOpenStudio", bookingMode: "private" },
        ],
      });
      fireEvent.click(calendar.card);
      const { preview, confirm } = expectPreview(calendar, false);
      fireEvent.click(confirm);
      expect(calendar.onSlotSelect).not.toHaveBeenCalled();
      for (let step = 0; step < 4; step += 1) {
        fireEvent.keyDown(preview, { key: "ArrowDown" });
      }
      const available = expectPreview(calendar);
      expect(available.preview).toHaveAccessibleName(/10:00.*11:00/);
      fireEvent.click(available.confirm);
      expectCreation(calendar, "2026-12-24T10:00:00Z", "2026-12-24T11:00:00Z");
    },
  );

  it("honours a private booking beginning partway through the requested duration", () => {
    const calendar = renderCalendar({
      bookings: [
        booking,
        {
          ...booking,
          id: "private-later",
          kind: "exclusiveOpenStudio",
          bookingMode: "private",
          start: "2026-12-24T08:30:00Z",
          end: "2026-12-24T09:30:00Z",
        },
      ],
    });
    fireEvent.click(calendar.card);
    expectPreview(calendar, false);
  });

  it.each([
    ["read-only", { readOnly: true }],
    ["without a creation handler", { onSlotSelect: undefined }],
    [
      "disabled studio booking",
      {
        location: {
          ...location,
          booking: { ...location.booking, enabled: false },
        },
      },
    ],
  ])("never falls back to customer details when %s", (_, overrides) => {
    const { card, onSlotSelect, onBookingClick } = renderCalendar(overrides);
    fireEvent.click(card);
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(onBookingClick).not.toHaveBeenCalled();
  });

  it("keeps the public read-only calendar non-interactive", () => {
    const calendar = renderCalendar({
      audience: "public",
      readOnly: true,
      bookings: [{ ...booking, privacySafe: true }],
    });
    fireEvent.click(calendar.card);
    expect(calendar.onSlotSelect).not.toHaveBeenCalled();
    expect(calendar.onBookingClick).not.toHaveBeenCalled();
    expect(
      calendar.container.querySelector("[data-calendar-slot-preview]"),
    ).not.toBeInTheDocument();
  });

  it("preserves staff booking management", () => {
    const { container, card, onSlotSelect, onBookingClick } = renderCalendar({
      audience: "tenant",
    });
    fireEvent.click(card);
    expect(onBookingClick).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: booking.id }),
    );
    expect(onSlotSelect).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-calendar-slot-preview]"),
    ).not.toBeInTheDocument();
  });
});
