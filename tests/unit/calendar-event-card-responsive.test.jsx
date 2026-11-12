import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";

const event = (overrides = {}) => ({
  id: "booking-1",
  kind: "class",
  title: "Wheel throwing basics",
  customerName: "Anna Nováková",
  teamMemberName: "Martin Matějů",
  start: "2026-07-31T08:00:00.000Z",
  end: "2026-07-31T09:00:00.000Z",
  capacity: 16,
  used: 2,
  tone: "cobalt",
  ...overrides,
});

const renderCard = (props = {}) =>
  render(
    <CalendarEventCard
      event={event()}
      studio={{ timeZone: "Europe/Prague" }}
      locale="en-GB"
      fullLabel="Fully booked"
      {...props}
    />,
  );

describe("CalendarEventCard responsive containment", () => {
  it("contains long booking content inside narrow calendar columns", () => {
    renderCard({
      event: event({
        title:
          "A deliberately long workshop title that must stay inside its calendar column",
        customerName:
          "A deliberately long customer name that must remain contained",
        teamMemberName: "A deliberately long team member name",
      }),
    });

    const card = screen.getByRole("article");
    expect(card).toHaveClass("min-w-0", "max-w-full", "overflow-hidden");
    expect(screen.getByText(/deliberately long workshop title/i)).toHaveClass(
      "truncate",
    );
    expect(screen.getByText("2 people")).toHaveClass("max-w-full", "truncate");
  });

  it("places the booking time before the activity title", () => {
    renderCard();

    const title = screen.getByText("Wheel throwing basics");
    const time = screen.getByText("10:00 – 11:00");

    expect(
      time.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses the localized full-capacity label supplied by the caller", () => {
    renderCard({
      event: event({ used: 16 }),
      fullLabel: "Plně obsazeno",
    });

    expect(screen.getByText("Plně obsazeno")).toBeInTheDocument();
    expect(screen.queryByText(/\bFull\b/)).not.toBeInTheDocument();
  });

  it("renders a decorative booking-mode accent", () => {
    const { container } = renderCard();
    const accent = container.querySelector(
      '[data-calendar-event-accent="true"]',
    );

    expect(accent).toBeInTheDocument();
    expect(accent).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the public booking accent when an event has no explicit tone", () => {
    const { container } = renderCard({
      event: event({ kind: "firing", tone: undefined }),
    });

    expect(
      container.querySelector('[data-calendar-event-accent="true"]'),
    ).toHaveStyle({ backgroundColor: "#4F8177" });
  });

  it("opens the event without also selecting its underlying time slot", () => {
    const onEventClick = vi.fn();
    const onSlotClick = vi.fn();

    render(
      <div onClick={onSlotClick}>
        <CalendarEventCard
          event={event()}
          studio={{ timeZone: "Europe/Prague" }}
          locale="en-GB"
          fullLabel="Fully booked"
          onClick={onEventClick}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole("button"));

    expect(onEventClick).toHaveBeenCalledOnce();
    expect(onEventClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "booking-1" }),
    );
    expect(onSlotClick).not.toHaveBeenCalled();
  });

  it("keeps compact events contained while preserving title and time", () => {
    renderCard({
      compact: true,
      event: event({
        title:
          "A deliberately long compact event title that must remain contained",
      }),
    });

    const card = screen.getByRole("article");
    const cardContent = within(card);

    expect(card).toHaveClass("min-w-0", "max-w-full", "overflow-hidden");
    expect(
      cardContent.getByText(/deliberately long compact event title/i),
    ).toHaveClass("truncate");
    expect(cardContent.getByText("10:00 – 11:00")).toBeInTheDocument();
    expect(cardContent.queryByText(/Anna Nováková/)).not.toBeInTheDocument();
  });
});
