import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import StudioCalendar from "@/components/calendar/StudioCalendar";
import { localizeCalendarResource } from "@/components/calendar/calendar.resources";
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
const catalogs = Object.fromEntries(
  Object.entries(rawCatalogs).map(([locale, messages]) => [
    locale,
    deepMergeMessages(rawCatalogs.en, messages),
  ]),
);
const activityIds = ["WORKSTATION", "SHARED_TABLE", "GENERAL"];
const location = {
  id: "grohova",
  name: "Grohova",
  booking: {
    timezone: "Europe/Prague",
    activityCapacities: activityIds.map((activity) => ({
      activity,
      capacity: 2,
    })),
  },
};

// Keep the production toolbar, filter and adapter; the grid does not affect
// option text or the activity ID passed to the selected calendar view.
vi.mock("@/components/calendar/WeekCalendar", () => ({
  default: ({ selectedActivityId }) => (
    <div data-testid="calendar-grid" data-activity={selectedActivityId} />
  ),
}));
vi.mock("@/components/calendar/DayCalendar", () => ({ default: () => null }));
vi.mock("@/components/calendar/MonthCalendar", () => ({
  default: () => null,
}));

function CalendarWithLocale({ locale, studio = location }) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={catalogs[locale]}
      timeZone="Europe/Prague"
    >
      <StudioCalendar
        audience="customer"
        location={studio}
        bookings={[]}
        date={new Date("2026-10-31T12:00:00Z")}
        view="week"
      />
    </NextIntlClientProvider>
  );
}

function openActivityFilter(locale) {
  const copy = catalogs[locale].Calendar.filters;
  // Desktop customers start with the legend open. Exercise its disclosure
  // before checking the same real select used on desktop and mobile.
  const trigger = screen.getAllByRole("button", {
    name: copy.closeLegend,
  })[0];
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: copy.openLegend }));
  return screen.getByRole("combobox", { name: copy.activity });
}

describe("calendar activity filter translations", () => {
  it.each(ALL_LOCALE_CODES)(
    "renders all built-in activity labels from the %s catalog while preserving filter IDs",
    (locale) => {
      render(<CalendarWithLocale locale={locale} />);
      const filter = openActivityFilter(locale);
      const messages = rawCatalogs[locale].Calendar;

      for (const key of ["activity", "allActivities"]) {
        const label = messages.filters[key];
        expect(typeof label).toBe("string");
        expect(label.trim()).not.toBe("");
        if (locale !== "en") {
          expect(label).not.toBe(rawCatalogs.en.Calendar.filters[key]);
        }
      }
      expect(filter).toHaveAccessibleName(messages.filters.activity);

      expect(
        within(filter).getByRole("option", {
          name: messages.filters.allActivities,
        }),
      ).toHaveValue("all");

      for (const activityId of activityIds) {
        // Check the locale's own catalog, so English fallback cannot mask a
        // missing activity translation in an otherwise partial catalog.
        const label = rawCatalogs[locale].Calendar.activities[activityId];
        expect(typeof label).toBe("string");
        expect(label.trim()).not.toBe("");
        if (locale !== "en") {
          expect(label).not.toBe(catalogs.en.Calendar.activities[activityId]);
        }
        expect(
          within(filter).getByRole("option", { name: label, exact: true }),
        ).toHaveValue(activityId);
        fireEvent.change(filter, { target: { value: activityId } });
        expect(filter).toHaveValue(activityId);
        expect(screen.getByTestId("calendar-grid")).toHaveAttribute(
          "data-activity",
          activityId,
        );
      }
    },
  );

  it("updates labels through every locale switch without resetting the selected activity", () => {
    const { rerender } = render(<CalendarWithLocale locale="en" />);
    fireEvent.change(openActivityFilter("en"), {
      target: { value: "SHARED_TABLE" },
    });

    for (const locale of ALL_LOCALE_CODES) {
      rerender(<CalendarWithLocale locale={locale} />);
      const messages = catalogs[locale].Calendar;
      const filter = screen.getByRole("combobox", {
        name: messages.filters.activity,
      });
      expect(filter).toHaveValue("SHARED_TABLE");
      expect(filter.selectedOptions[0]).toHaveTextContent(
        messages.activities.SHARED_TABLE,
      );
      expect(screen.getByTestId("calendar-grid")).toHaveAttribute(
        "data-activity",
        "SHARED_TABLE",
      );
    }
  });

  it("preserves studio-authored names and unknown activity IDs in the filter", () => {
    const customLocation = {
      ...location,
      resources: [
        { id: "WORKSTATION", name: "Kruh u okna", capacity: 2 },
        { id: "CUSTOM_ACTIVITY", name: "Pottery wheels", capacity: 3 },
      ],
    };
    render(<CalendarWithLocale locale="cs" studio={customLocation} />);
    const filter = openActivityFilter("cs");

    for (const resource of customLocation.resources) {
      expect(
        within(filter).getByRole("option", { name: resource.name }),
      ).toHaveValue(resource.id);
      fireEvent.change(filter, { target: { value: resource.id } });
      expect(screen.getByTestId("calendar-grid")).toHaveAttribute(
        "data-activity",
        resource.id,
      );
    }
  });
});

describe("calendar resource localization fallback", () => {
  it("keeps the readable generated name when a translator returns its key", () => {
    const resource = {
      id: "WORKSTATION",
      name: "Pottery wheels",
      capacity: 2,
    };
    expect(localizeCalendarResource(resource, (key) => key)).toEqual(resource);
  });

  it.each([
    { id: "WORKSTATION", name: "Kruh u okna", capacity: 2 },
    { id: "CUSTOM_ACTIVITY", name: "Pottery wheels", capacity: 3 },
  ])("does not translate studio-authored resource $id", (resource) => {
    const translate = vi.fn(() => "Hrnčířské kruhy");
    expect(localizeCalendarResource(resource, translate)).toEqual(resource);
    expect(translate).not.toHaveBeenCalled();
  });
});
