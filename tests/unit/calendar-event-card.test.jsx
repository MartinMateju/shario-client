import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";

const event = {
  id: "booking-1",
  kind: "sharedOpenStudio",
  title: "Unavailable",
  subtitle: "Studio occupancy",
  start: "2026-08-08T08:00:00.000Z",
  end: "2026-08-08T09:00:00.000Z",
};

const commonProps = {
  event,
  studio: { timeZone: "UTC" },
  locale: "en",
  audience: "customer",
};

describe("CalendarEventCard", () => {
  it("renders an inert semantic event when no click action is supplied", () => {
    render(<CalendarEventCard {...commonProps} />);

    const article = screen.getByRole("article", { name: /Unavailable/ });
    expect(article).toHaveAttribute("data-calendar-event-interactive", "false");
    expect(article).not.toHaveAttribute("tabindex");
    expect(
      screen.queryByRole("button", { name: /Unavailable/ }),
    ).not.toBeInTheDocument();
  });

  it("preserves button behavior for tenant booking actions", () => {
    const onClick = vi.fn();
    render(
      <CalendarEventCard
        {...commonProps}
        audience="tenant"
        onClick={onClick}
      />,
    );

    const button = screen.getByRole("button", { name: /Unavailable/ });
    expect(button).toHaveAttribute("data-calendar-event-interactive", "true");

    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledWith(event);
  });

  it("activates another customer's booking without exposing private details", () => {
    const onClick = vi.fn();
    render(<CalendarEventCard {...commonProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: /Unavailable/ }));

    expect(onClick).toHaveBeenCalledWith(event);
    expect(screen.queryByText("My booking")).not.toBeInTheDocument();
  });

  it("forwards pointer position so the preview can start at the clicked time", () => {
    const onClick = vi.fn();
    render(<CalendarEventCard {...commonProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Unavailable/ }), {
      detail: 1,
      clientY: 240,
    });
    expect(onClick).toHaveBeenCalledWith(
      event,
      expect.objectContaining({ detail: 1, clientY: 240 }),
    );
  });

  it("allows a customer closure click to request a disabled preview", () => {
    const closure = { ...event, isClosure: true };
    const onClick = vi.fn();
    render(
      <CalendarEventCard {...commonProps} event={closure} onClick={onClick} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledExactlyOnceWith(closure);
  });

  it.each([
    { audience: "public" },
    { audience: "public", event: { ...event, isClosure: true } },
  ])("keeps public read-only occupancy inert: %j", (props) => {
    const onClick = vi.fn();
    render(<CalendarEventCard {...commonProps} {...props} onClick={onClick} />);

    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });
});
