import { fireEvent, render, within } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";
import WeekCalendar from "@/components/calendar/WeekCalendar";
import { ALL_LOCALE_CODES } from "@/i18n/locales";

const catalogModules = import.meta.glob("../../src/messages/*.json", {
  eager: true,
  import: "default",
});
const rawCatalogs = Object.fromEntries(
  Object.entries(catalogModules).map(([path, messages]) => [
    path.split("/").at(-1).replace(".json", ""),
    messages,
  ]),
);
const catalogs = rawCatalogs;
const resources = [
  { id: "WORKSTATION", name: "Workstations", capacity: 2 },
  { id: "SHARED_TABLE", name: "Shared tables", capacity: 3 },
  { id: "GENERAL", name: "General capacity", capacity: 4 },
];
const studio = {
  id: "mobile-admin-studio",
  timeZone: "UTC",
  calendarHours: { start: 8, end: 10 },
  slotStepMinutes: 30,
  minBookingMinutes: 60,
  availabilityMode: "capacity",
  resources,
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
      { isOpen: true, openTime: "08:00", closeTime: "10:00" },
    ]),
  ),
};
const date = new Date("2026-08-04T12:00:00Z");
const bookings = [];
const noop = () => {};

function AdminView({ view, ...props }) {
  const t = useTranslations("Calendar");
  const Calendar = view === "day" ? DayCalendar : WeekCalendar;
  return (
    <Calendar
      audience="tenant"
      date={date}
      bookings={bookings}
      onDateChange={noop}
      t={t}
      {...props}
    />
  );
}

function CalendarWithLocale({ locale, studio: location = studio, ...props }) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={catalogs[locale]}
      timeZone="UTC"
    >
      <AdminView locale={locale} studio={location} {...props} />
    </NextIntlClientProvider>
  );
}

function expectMobileActivity(container, label, view) {
  // JSDOM does not apply responsive CSS. Scope assertions to the real admin
  // mobile agenda so a translated desktop resource column cannot hide a bug.
  const agenda = container.querySelector("[data-calendar-mobile-agenda]");
  expect(agenda).toBeInTheDocument();
  const picker = agenda.querySelector("[data-calendar-mobile-slot-picker]");
  const slots = [...picker.querySelectorAll("[data-calendar-mobile-slot]")];
  expect(slots).toHaveLength(3);
  for (const slot of slots) {
    expect(within(slot).getByText(label, { exact: true })).toBeInTheDocument();
    expect(slot).toHaveAccessibleName(expect.stringContaining(label));
    expect(slot).toBeEnabled();
  }
  expect(picker.firstElementChild).toHaveTextContent(label);
  if (view === "week") {
    const days = agenda.querySelectorAll("[data-calendar-mobile-day]");
    expect(days).toHaveLength(7);
    for (const day of days) {
      expect(day).toHaveAccessibleName(expect.stringContaining(label));
    }
  }
  return slots[0];
}

describe.each(["day", "week"])("admin mobile %s activity labels", (view) => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T07:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(ALL_LOCALE_CODES)(
    "uses the %s catalog for every generated activity in slots and accessible labels",
    (locale) => {
      const onSlotSelect = vi.fn();
      const { container, rerender } = render(
        <CalendarWithLocale
          locale={locale}
          view={view}
          selectedActivityId={resources[0].id}
          onSlotSelect={onSlotSelect}
        />,
      );

      for (const resource of resources) {
        // Read the locale's own messages: merged English fallback must not
        // make a missing translation appear covered.
        const label = rawCatalogs[locale].Calendar.activities[resource.id];
        expect(typeof label).toBe("string");
        expect(label.trim()).not.toBe("");
        if (locale !== "en") expect(label).not.toBe(resource.name);

        rerender(
          <CalendarWithLocale
            locale={locale}
            view={view}
            selectedActivityId={resource.id}
            onSlotSelect={onSlotSelect}
          />,
        );
        fireEvent.click(expectMobileActivity(container, label, view));
        expect(onSlotSelect).toHaveBeenLastCalledWith(
          expect.objectContaining({
            activityId: resource.id,
            start: new Date("2026-08-04T08:00:00Z"),
            end: new Date("2026-08-04T09:00:00Z"),
          }),
        );
      }
    },
  );

  it("updates an existing agenda across every locale without changing the selected activity ID", () => {
    const activityId = "SHARED_TABLE";
    const onSlotSelect = vi.fn();
    const props = { view, selectedActivityId: activityId, onSlotSelect };
    const { container, rerender } = render(
      <CalendarWithLocale locale="en" {...props} />,
    );

    for (const locale of ALL_LOCALE_CODES) {
      rerender(<CalendarWithLocale locale={locale} {...props} />);
      const label = rawCatalogs[locale].Calendar.activities[activityId];
      fireEvent.click(expectMobileActivity(container, label, view));
      expect(onSlotSelect).toHaveBeenLastCalledWith(
        expect.objectContaining({ activityId }),
      );
    }
    expect(resources[1].name).toBe("Shared tables");
  });

  it("preserves studio-authored labels, unknown IDs and source data through locale changes", () => {
    const customResources = [
      { id: "WORKSTATION", name: "Kruh u okna", capacity: 2 },
      { id: "studio-printing", name: "Workstations", capacity: 3 },
    ];
    const customStudio = { ...studio, resources: customResources };
    const before = structuredClone(customStudio);
    const onSlotSelect = vi.fn();
    const { container, rerender } = render(
      <CalendarWithLocale
        locale="cs"
        view={view}
        studio={customStudio}
        selectedActivityId={customResources[0].id}
        onSlotSelect={onSlotSelect}
      />,
    );

    for (const locale of ["cs", "de", "en"]) {
      for (const resource of customResources) {
        rerender(
          <CalendarWithLocale
            locale={locale}
            view={view}
            studio={customStudio}
            selectedActivityId={resource.id}
            onSlotSelect={onSlotSelect}
          />,
        );
        fireEvent.click(expectMobileActivity(container, resource.name, view));
        expect(onSlotSelect).toHaveBeenLastCalledWith(
          expect.objectContaining({ activityId: resource.id }),
        );
      }
    }
    expect(customStudio).toEqual(before);
  });
});
