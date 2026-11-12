import { render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import CompactMonthCalendar from "@/components/calendar/CompactMonthCalendar";
import DayCalendar from "@/components/calendar/DayCalendar";
import { normalizeLocationToCalendarStudio } from "@/components/calendar/calendar.adapters";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";

const t = createTranslator({
  locale: "cs",
  messages: cs,
  namespace: "Calendar",
});
const studio = normalizeLocationToCalendarStudio({
  id: "grohova",
  name: "Grohova",
  booking: {
    timezone: "Europe/Prague",
    activityCapacities: [
      { activity: "WORKSTATION", capacity: 2 },
      { activity: "SHARED_TABLE", capacity: 6 },
    ],
  },
  calendarHours: { start: 6, end: 10 },
});
const props = {
  date: new Date(2026, 9, 31, 12),
  bookings: [],
  studio,
  locale: "cs",
  audience: "customer",
  onBookingClick: vi.fn(),
  onDateSelect: vi.fn(),
  t,
};

describe("Czech calendar wording", () => {
  it.each([
    [0, "0 míst"],
    [1, "1 místo"],
    [2, "2 místa"],
    [4, "4 místa"],
    [5, "5 míst"],
  ])("uses the correct capacity form for %i", (count, expected) => {
    expect(t("day.places", { count })).toBe(expected);
  });

  it("localizes generated resource headers and updates them after a language switch", () => {
    const { container, rerender } = render(<DayCalendar {...props} />);
    const header = container.querySelector("[data-calendar-grid-header]");
    expect(header).toHaveTextContent("Pracovní místa2 místa");
    expect(header).toHaveTextContent("Sdílené stoly6 míst");
    expect(
      screen.getByRole("group", { name: "Pracovní místa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Sdílené stoly" }),
    ).toBeInTheDocument();
    expect(container).not.toHaveTextContent("Workstations");
    expect(container).not.toHaveTextContent("Shared tables");

    rerender(
      <DayCalendar
        {...props}
        locale="en"
        t={createTranslator({
          locale: "en",
          messages: en,
          namespace: "Calendar",
        })}
      />,
    );
    expect(header).toHaveTextContent(en.Calendar.activities.WORKSTATION);
    expect(header).toHaveTextContent(en.Calendar.activities.SHARED_TABLE);
  });

  it("preserves studio-authored resource labels", () => {
    const customStudio = {
      ...studio,
      resources: [{ ...studio.resources[0], name: "Kruh u okna" }],
    };
    const { container } = render(
      <DayCalendar {...props} studio={customStudio} />,
    );
    expect(
      container.querySelector("[data-calendar-grid-header]"),
    ).toHaveTextContent("Kruh u okna2 místa");
    expect(
      screen.getByRole("group", { name: "Kruh u okna" }),
    ).toBeInTheDocument();
  });

  it("uses Czech date and booking mode labels in the agenda", () => {
    const bookings = ["public", "private"].map((bookingMode) => ({
      id: bookingMode,
      locationId: studio.id,
      kind: "sharedOpenStudio",
      title: "Rezervace ateliéru",
      bookingMode,
      start: "2026-10-31T07:00:00.000Z",
      end: "2026-10-31T08:00:00.000Z",
    }));
    const { container } = render(
      <CompactMonthCalendar {...props} bookings={bookings} />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Rezervace — sobota 31. října 2026",
      }),
    ).toBeInTheDocument();
    for (const [mode, label] of [
      ["public", "Veřejná"],
      ["private", "Soukromá"],
    ]) {
      const card = container.querySelector(
        `[data-calendar-booking-id="${mode}"]`,
      );
      expect(card).toHaveAccessibleName(new RegExp(label));
      expect(
        card.querySelector("[data-calendar-mode-badge]"),
      ).toHaveTextContent(label);
      expect(
        card.querySelector(`[data-calendar-privacy-icon="${mode}"]`),
      ).toBeInTheDocument();
    }
  });
});
