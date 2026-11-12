import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import CalendarTooltip, {
  useCalendarTooltip,
} from "@/components/calendar/CalendarTooltip";

function Harness({ onClick = () => {} }) {
  const { triggerProps, tooltipProps, close } = useCalendarTooltip();
  return (
    <>
      <button
        {...triggerProps}
        style={{ "--tenant-accent": "#123456" }}
        onClick={() => {
          close();
          onClick();
        }}
      >
        Calendar slot
      </button>
      <CalendarTooltip {...tooltipProps}>
        10:00 – 11:00 · 2 places
      </CalendarTooltip>
    </>
  );
}

const advance = () => act(() => vi.advanceTimersByTime(200));
const hover = (anchor, pointerType = "mouse") =>
  fireEvent.pointerEnter(anchor, { pointerType });

describe("calendar tooltips", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 50,
      right: 170,
      top: 50,
      bottom: 90,
      width: 120,
      height: 40,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays desktop hover, links its description and dismisses on Escape", () => {
    render(<Harness />);
    const anchor = screen.getByRole("button");

    hover(anchor);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    advance();

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("10:00 – 11:00 · 2 places");
    expect(anchor).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveClass("pointer-events-none");
    expect(tooltip.style.getPropertyValue("--tenant-accent")).toBe("#123456");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(anchor).not.toHaveAttribute("aria-describedby");
  });

  it("shows on keyboard focus and closes on blur", () => {
    render(<Harness />);
    const anchor = screen.getByRole("button");
    vi.spyOn(anchor, "matches").mockImplementation(
      (selector) => selector === ":focus-visible",
    );

    act(() => anchor.focus());
    advance();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(anchor);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("waits for focus scrolling to settle, then opens and dismisses on a later scroll", () => {
    render(<Harness />);
    const anchor = screen.getByRole("button");
    vi.spyOn(anchor, "matches").mockImplementation(
      (selector) => selector === ":focus-visible",
    );
    const bounds = vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({
      left: 50,
      right: 170,
      top: 1200,
      bottom: 1240,
      width: 120,
      height: 40,
    });

    act(() => anchor.focus());
    act(() => vi.advanceTimersByTime(100));
    bounds.mockReturnValue({
      left: 50,
      right: 170,
      top: 200,
      bottom: 240,
      width: 120,
      height: 40,
    });
    fireEvent.scroll(window);
    act(() => vi.advanceTimersByTime(199));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(anchor).toHaveFocus();

    fireEvent.scroll(window);
    advance();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not open after focus moves away while a tooltip is pending", () => {
    render(<Harness />);
    const anchor = screen.getByRole("button");
    vi.spyOn(anchor, "matches").mockImplementation(
      (selector) => selector === ":focus-visible",
    );

    act(() => anchor.focus());
    act(() => anchor.blur());
    advance();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not open for an anchor outside the viewport", () => {
    render(<Harness />);
    const anchor = screen.getByRole("button");
    vi.spyOn(anchor, "getBoundingClientRect").mockReturnValue({
      left: 50,
      right: 170,
      top: 1200,
      bottom: 1240,
      width: 120,
      height: 40,
    });

    hover(anchor);
    advance();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not open a hover tooltip for a touch pointer", () => {
    render(<Harness />);
    hover(screen.getByRole("button"), "touch");
    advance();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("cancels pending hover when scrolling and leaves booking clicks intact", () => {
    const onClick = vi.fn();
    render(<Harness onClick={onClick} />);
    const anchor = screen.getByRole("button");

    hover(anchor);
    fireEvent.scroll(window);
    advance();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    hover(anchor);
    advance();
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(anchor);
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps the tooltip inside the viewport when its anchor is at an edge", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function bounds() {
        return this.getAttribute("role") === "tooltip"
          ? { width: 180, height: 90 }
          : {
              left: 1000,
              right: 1020,
              top: 750,
              bottom: 765,
              width: 20,
              height: 15,
            };
      },
    );
    render(<Harness />);
    hover(screen.getByRole("button"));
    advance();

    const tooltip = screen.getByRole("tooltip");
    expect(Number.parseFloat(tooltip.style.left) + 180).toBeLessThanOrEqual(
      window.innerWidth - 12,
    );
    expect(Number.parseFloat(tooltip.style.top) + 90).toBeLessThanOrEqual(750);
  });

  it("shows complete compact-booking details without native tooltips or private requests", () => {
    render(
      <CalendarEventCard
        audience="customer"
        locale="en"
        studio={{ timeZone: "UTC" }}
        style={{ height: 30, width: 70 }}
        onClick={() => {}}
        event={{
          id: "booking-1",
          title: "Wheel session",
          isMine: true,
          bookingMode: "private",
          customerIds: ["0873"],
          guests: 2,
          start: "2026-08-08T08:00:00Z",
          end: "2026-08-08T09:00:00Z",
        }}
      />,
    );
    const card = screen.getByRole("button");
    expect(card).not.toHaveAttribute("title");
    hover(card);
    advance();

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Wheel session");
    expect(tooltip).toHaveTextContent("08:00 – 09:00");
    expect(tooltip).toHaveTextContent("Private");
    expect(tooltip).toHaveTextContent("2 people");
    expect(tooltip).toHaveTextContent("#0873");
    expect(tooltip).toHaveTextContent("My booking");
    expect(tooltip).not.toHaveTextContent("Customer");
  });

  it("cancels a delayed tooltip when its trigger unmounts", () => {
    const { unmount } = render(<Harness />);
    hover(screen.getByRole("button"));
    unmount();
    advance();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
