import { fireEvent, render, within } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DayCalendar from "@/components/calendar/DayCalendar";
import StudioCalendar from "@/components/calendar/StudioCalendar";
import { deepMergeMessages } from "@/i18n/catalogs";
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

function AdminView({ view, studio: location, selectedActivityId, ...props }) {
  const t = useTranslations("Calendar");
  if (view === "week") {
    return (
      <StudioCalendar
        audience="tenant"
        date={date}
        studios={[location]}
        bookings={bookings}
        view="week"
        onDateChange={noop}
        {...props}
      />
    );
  }
  return (
    <DayCalendar
      audience="tenant"
      date={date}
      bookings={bookings}
      studio={location}
      selectedActivityId={selectedActivityId}
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

function expectMobileActivity(
  container,
  label,
  view,
  { activityId, locale, selectActivity = true },
) {
  if (view === "week") {
    // The weekly grid shares its activity selector with the customer layout.
    // Check the real filter and creation action instead of the removed agenda.
    if (!container.querySelector("[data-calendar-filter-panel]")) {
      fireEvent.click(
        container.querySelector("[data-calendar-filter-trigger]"),
      );
    }
    const filter = within(container).getByRole("combobox", {
      name: rawCatalogs[locale].Calendar.filters.activity,
    });
    const option = within(filter).getByRole("option", {
      name: label,
      exact: true,
    });
    expect(option).toHaveValue(activityId);
    if (selectActivity) {
      fireEvent.change(filter, { target: { value: activityId } });
    }
    expect(filter).toHaveValue(activityId);

    const grid = container.querySelector("[data-calendar-mobile-week-grid]");
    expect(grid).toBeInTheDocument();
    expect(
      container.querySelector("[data-calendar-mobile-agenda]"),
    ).not.toBeInTheDocument();
    const days = grid.querySelectorAll("[data-calendar-week-day-column]");
    expect(days).toHaveLength(7);
    const selectedDay = days[1];
    expect(selectedDay).toHaveAccessibleName(
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(date),
    );
    fireEvent.keyDown(selectedDay, { key: "Enter" });
    const confirm = grid.querySelector("[data-calendar-slot-confirm]");
    expect(confirm).toBeEnabled();
    expect(confirm).toHaveAccessibleName(
      expect.stringContaining(rawCatalogs[locale].Calendar.toolbar.newBooking),
    );
    return confirm;
  }
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
    "uses the %s catalog for activity controls and accessible labels",
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
        fireEvent.click(
          expectMobileActivity(container, label, view, {
            activityId: resource.id,
            locale,
          }),
        );
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

  it("updates the existing calendar across every locale without changing the selected activity ID", () => {
    const activityId = "SHARED_TABLE";
    const onSlotSelect = vi.fn();
    const props = { view, selectedActivityId: activityId, onSlotSelect };
    const { container, rerender } = render(
      <CalendarWithLocale locale="en" {...props} />,
    );

    fireEvent.click(
      expectMobileActivity(
        container,
        rawCatalogs.en.Calendar.activities[activityId],
        view,
        { activityId, locale: "en" },
      ),
    );

    for (const locale of ALL_LOCALE_CODES) {
      rerender(<CalendarWithLocale locale={locale} {...props} />);
      const label = rawCatalogs[locale].Calendar.activities[activityId];
      fireEvent.click(
        expectMobileActivity(container, label, view, {
          activityId,
          locale,
          selectActivity: false,
        }),
      );
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
        fireEvent.click(
          expectMobileActivity(container, resource.name, view, {
            activityId: resource.id,
            locale,
          }),
        );
        expect(onSlotSelect).toHaveBeenLastCalledWith(
          expect.objectContaining({ activityId: resource.id }),
        );
      }
    }
    expect(customStudio).toEqual(before);
  });
});
