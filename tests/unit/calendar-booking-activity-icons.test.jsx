import { fireEvent, render, screen, within } from "@testing-library/react";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import CalendarLegend from "@/components/calendar/CalendarLegend";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import StudioCalendar from "@/components/calendar/StudioCalendar";
import { getCalendarBookingActivity } from "@/components/calendar/calendar.activity";
import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";

const catalogs = { cs: csMessages, en: enMessages };
const translate = (locale) =>
  createTranslator({
    locale,
    messages: catalogs[locale],
    namespace: "Calendar",
  });
const studio = {
  id: "studio-1",
  name: "Václavská",
  timeZone: "UTC",
  availabilityMode: "capacity",
  calendarHours: { start: 8, end: 20 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  booking: {
    timezone: "UTC",
    activitySelectionMode: "REQUIRED",
    activityCapacities: [
      { activity: "SHARED_TABLE", capacity: 10 },
      { activity: "WORKSTATION", capacity: 6 },
    ],
  },
};
const booking = {
  id: "booking-1",
  locationId: studio.id,
  kind: "sharedOpenStudio",
  title: "Studio visit",
  activityId: "SHARED_TABLE",
  start: "2026-08-12T10:00:00.000Z",
  end: "2026-08-12T11:00:00.000Z",
  guests: 1,
};
const activityIds = ["SHARED_TABLE", "WORKSTATION"];
const studioWithMode = (mode) => ({
  ...studio,
  booking: { ...studio.booking, activitySelectionMode: mode },
});
const renderCard = (overrides = {}) => {
  const props = {
    event: booking,
    studio,
    locale: "en",
    audience: "customer",
    t: translate("en"),
    ...overrides,
  };
  return { ...render(<CalendarEventCard {...props} />), props };
};

describe("booking activity symbols", () => {
  it.each(activityIds)(
    "shows the selected %s activity on even a short card and in its accessible name",
    (activityId) => {
      const { container } = renderCard({
        event: { ...booking, activityId },
        compact: true,
        style: { height: 30, width: 75 },
      });
      const card = screen.getByRole("article");
      const symbol = container.querySelector(
        `[data-calendar-activity-icon="${activityId}"]`,
      );
      expect(symbol).toBeInTheDocument();
      expect(symbol).toHaveAttribute("aria-hidden", "true");
      expect(card).toHaveAccessibleName(
        expect.stringContaining(enMessages.Calendar.activities[activityId]),
      );
      expect(card).toHaveTextContent("Studio visit");
      expect(card).toHaveTextContent("10:00");
    },
  );

  it.each(["tenant", "customer", "public"])(
    "keeps the activity visible for the %s calendar audience",
    (audience) => {
      const { container } = renderCard({ audience });
      expect(
        container.querySelector('[data-calendar-activity-icon="SHARED_TABLE"]'),
      ).toBeInTheDocument();
    },
  );

  it.each(["OPTIONAL", "HIDDEN", undefined])(
    "omits activity symbols when the studio's activity mode is %s",
    (mode) => {
      const { container } = renderCard({ studio: studioWithMode(mode) });
      expect(
        container.querySelector("[data-calendar-activity-icon]"),
      ).toBeNull();
      expect(screen.getByRole("article")).not.toHaveAccessibleName(
        expect.stringContaining(enMessages.Calendar.activities.SHARED_TABLE),
      );
    },
  );

  it.each([
    { activityId: undefined },
    { activityId: "UNDEFINED" },
    { activityId: "GENERAL" },
    { activityId: "CUSTOM_ACTIVITY" },
    { kind: "class" },
    { kind: "course" },
    { tag: "CLASS" },
    { tag: "COURSE" },
    { kind: "privateStudio" },
    { tag: "PRIVATE-SESSION" },
    { isClosure: true },
    { isSuggested: true },
  ])("does not infer an activity symbol for %j", (overrides) => {
    const { container } = renderCard({ event: { ...booking, ...overrides } });
    expect(container.querySelector("[data-calendar-activity-icon]")).toBeNull();
  });

  it("supports the API's plannedActivity field without requiring an adapter first", () => {
    const { container } = renderCard({
      event: {
        ...booking,
        activityId: undefined,
        plannedActivity: "WORKSTATION",
      },
    });
    expect(
      container.querySelector('[data-calendar-activity-icon="WORKSTATION"]'),
    ).toBeInTheDocument();
  });

  it("keeps the selected activity on exclusive Open Studio customer bookings", () => {
    const { container } = renderCard({
      event: {
        ...booking,
        kind: "exclusiveOpenStudio",
        bookingMode: "private",
      },
    });
    expect(
      container.querySelector('[data-calendar-activity-icon="SHARED_TABLE"]'),
    ).toBeInTheDocument();
  });

  it("updates the accessible activity label when the language changes", () => {
    const { props, rerender } = renderCard();
    expect(screen.getByRole("article")).toHaveAccessibleName(
      expect.stringContaining(enMessages.Calendar.activities.SHARED_TABLE),
    );
    rerender(<CalendarEventCard {...props} locale="cs" t={translate("cs")} />);
    expect(screen.getByRole("article")).toHaveAccessibleName(
      expect.stringContaining(csMessages.Calendar.activities.SHARED_TABLE),
    );
    expect(screen.getByRole("article")).not.toHaveAccessibleName(
      expect.stringContaining(enMessages.Calendar.activities.SHARED_TABLE),
    );
  });

  it("preserves a studio-authored activity label", () => {
    const namedStudio = {
      ...studio,
      resources: [{ id: "SHARED_TABLE", name: "Hand-building tables" }],
    };
    expect(
      getCalendarBookingActivity(booking, namedStudio, translate("cs")),
    ).toEqual({ id: "SHARED_TABLE", label: "Hand-building tables" });
  });

  it("keeps booking selection working when clicking the activity icon", () => {
    const onClick = vi.fn();
    const { container } = renderCard({ audience: "tenant", onClick });
    fireEvent.click(container.querySelector("[data-calendar-activity-icon]"));
    expect(onClick).toHaveBeenCalledExactlyOnceWith(booking);
  });
});

describe("calendar activity legend", () => {
  it.each(["en", "cs"])(
    "explains both activity symbols with %s labels",
    (locale) => {
      const { container } = render(
        <CalendarLegend
          audience="customer"
          studio={studio}
          t={translate(locale)}
        />,
      );
      for (const activityId of activityIds) {
        const item = container.querySelector(
          `[data-calendar-activity-legend="${activityId}"]`,
        );
        expect(item).toHaveAttribute("role", "listitem");
        expect(item).toHaveTextContent(
          catalogs[locale].Calendar.activities[activityId],
        );
        expect(
          item.querySelector(`[data-calendar-activity-icon="${activityId}"]`),
        ).toBeInTheDocument();
      }
    },
  );

  it.each(["OPTIONAL", "HIDDEN", undefined])(
    "does not advertise required-activity symbols for %s studios",
    (mode) => {
      const { container } = render(
        <CalendarLegend
          audience="tenant"
          studio={studioWithMode(mode)}
          t={translate("en")}
        />,
      );
      expect(
        container.querySelector("[data-calendar-activity-legend]"),
      ).toBeNull();
      expect(
        container.querySelector('[data-calendar-mode-legend="public"]'),
      ).toBeInTheDocument();
    },
  );

  it("uses the selected studio's policy when the real calendar switches locations", () => {
    const calendar = (location) => (
      <NextIntlClientProvider locale="cs" messages={csMessages} timeZone="UTC">
        <StudioCalendar
          audience="customer"
          location={location}
          bookings={[]}
          date={new Date("2026-08-12T12:00:00.000Z")}
          view="month"
        />
      </NextIntlClientProvider>
    );
    const { container, rerender } = render(calendar(studio));
    expect(
      container.querySelectorAll("[data-calendar-activity-legend]"),
    ).toHaveLength(2);
    rerender(calendar({ ...studioWithMode("HIDDEN"), id: "other-studio" }));
    expect(
      container.querySelector("[data-calendar-activity-legend]"),
    ).toBeNull();
  });
});

describe("month agenda activity symbols", () => {
  it("shows activities on the compact agenda while courses remain unlabelled", () => {
    const onBookingClick = vi.fn();
    const course = {
      ...booking,
      id: "course-1",
      kind: "class",
      title: "Wheel course",
    };
    const { container } = render(
      <MonthCalendar
        date={new Date("2026-08-12T12:00:00.000Z")}
        bookings={[booking, course]}
        studio={studio}
        audience="customer"
        locale="cs"
        t={translate("cs")}
        onBookingClick={onBookingClick}
      />,
    );
    const agenda = container.querySelector(
      '[data-calendar-month-agenda="2026-08-12"]',
    );
    const session = within(agenda).getByRole("button", {
      name: /Studio visit/,
    });
    expect(
      session.querySelector('[data-calendar-activity-icon="SHARED_TABLE"]'),
    ).toBeInTheDocument();
    expect(session).toHaveAccessibleName(
      expect.stringContaining(csMessages.Calendar.activities.SHARED_TABLE),
    );
    expect(
      within(agenda)
        .getByRole("button", { name: /Wheel course/ })
        .querySelector("[data-calendar-activity-icon]"),
    ).toBeNull();
    fireEvent.click(session);
    expect(onBookingClick).toHaveBeenCalledExactlyOnceWith(booking);
  });
});
