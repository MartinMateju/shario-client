import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CustomerSlotSurfaces from "@/components/calendar/CustomerSlotSurfaces";

const translate = (key) =>
  ({
    "availability.available": "Available",
    "availability.limited": "Few places left",
    "availability.select": "Select this time",
  })[key] || key;

const model = (minute, state = "available", remaining = 4) => ({
  slot: { minute },
  availability: {
    state,
    remaining,
    isBookable: ["available", "limited"].includes(state),
  },
  availabilityLabel:
    state === "available" || state === "limited"
      ? `${remaining} places available`
      : "Studio unavailable",
  range: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")} – 12:00`,
});

const renderSlots = (props = {}) => {
  const onSelect = vi.fn();
  return {
    onSelect,
    ...render(
      <CustomerSlotSurfaces
        slotModels={[model(480)]}
        calendarStartMinute={480}
        stepMinutes={30}
        pixelsPerMinute={1.4}
        onSelect={onSelect}
        t={translate}
        {...props}
      />,
    ),
  };
};

describe("customer availability slot surfaces", () => {
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

  it("labels a continuous available period every two hours rather than every half hour", () => {
    const { container } = renderSlots({
      slotModels: [480, 510, 540, 570, 600, 630, 660].map((minute) =>
        model(minute),
      ),
    });

    expect(
      container.querySelectorAll("[data-calendar-slot-state]"),
    ).toHaveLength(7);
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /^08:00/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^10:00/ })).toBeInTheDocument();
  });

  it("keeps every availability state unshaded while preserving capacity labels and blocked periods", () => {
    const { container, onSelect } = renderSlots({
      slotModels: [
        model(480),
        model(510, "limited", 1),
        model(540, "full", 0),
        model(570, "closed", 0),
        model(600, "blocked", 0),
        model(630, "past", 0),
        model(660),
      ],
    });

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: /08:30.*1 places available/ }),
    ).toBeInTheDocument();
    for (const slot of container.querySelectorAll(
      "[data-calendar-slot-state]",
    )) {
      const style = getComputedStyle(slot);
      expect(["", "none"]).toContain(style.backgroundImage);
      expect(["", "transparent", "rgba(0, 0, 0, 0)"]).toContain(
        style.backgroundColor,
      );
    }
    for (const state of ["full", "closed", "blocked", "past"]) {
      const blocked = container.querySelector(
        `[data-calendar-slot-state="${state}"]`,
      );
      expect(blocked).toHaveAttribute("data-calendar-slot-bookable", "false");
      expect(blocked.querySelector("button")).toBeNull();
      fireEvent.click(blocked);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("selects the exact label time without starting a drag or bubbling its click", () => {
    const onSelect = vi.fn();
    const onDrag = vi.fn();
    const onParentClick = vi.fn();
    const selectedModel = model(540, "limited", 1);
    render(
      <div onPointerDown={onDrag} onClick={onParentClick}>
        <CustomerSlotSurfaces
          slotModels={[selectedModel]}
          calendarStartMinute={480}
          stepMinutes={30}
          pixelsPerMinute={1.4}
          onSelect={onSelect}
          t={translate}
        />
      </div>,
    );
    const button = screen.getByRole("button");

    fireEvent.pointerDown(button, { pointerType: "mouse" });
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(
      selectedModel.slot,
      button,
    );
    expect(onDrag).not.toHaveBeenCalled();
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("allows grid dragging outside the label while cancelling a pending tooltip", () => {
    const onDrag = vi.fn();
    const { container } = render(
      <div onPointerDown={onDrag}>
        <CustomerSlotSurfaces
          slotModels={[model(480)]}
          calendarStartMinute={480}
          stepMinutes={30}
          pixelsPerMinute={1.4}
          onSelect={vi.fn()}
          t={translate}
        />
      </div>,
    );
    const surface = container.querySelector("[data-calendar-slot-state]");

    fireEvent.pointerEnter(surface, { pointerType: "mouse" });
    fireEvent.pointerDown(surface, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));

    expect(onDrag).toHaveBeenCalledOnce();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("uses one tooltip for a focused availability label and dismisses it before selection", () => {
    const { onSelect } = renderSlots();
    const button = screen.getByRole("button");
    vi.spyOn(button, "matches").mockImplementation(
      (selector) => selector === ":focus-visible",
    );

    act(() => button.focus());
    act(() => vi.advanceTimersByTime(200));

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Available");
    expect(tooltip).toHaveTextContent("4 places available");
    expect(tooltip).toHaveTextContent("Select this time");
    expect(button).toHaveAttribute("aria-describedby", tooltip.id);

    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps the slot tooltip open when moving between its label and surrounding surface", () => {
    const { container } = renderSlots();
    const surface = container.querySelector("[data-calendar-slot-state]");
    const button = screen.getByRole("button");

    fireEvent.pointerEnter(surface, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(200));
    const tooltip = screen.getByRole("tooltip");

    fireEvent.pointerOver(button, {
      pointerType: "mouse",
      relatedTarget: surface,
    });
    fireEvent.pointerOut(button, {
      pointerType: "mouse",
      relatedTarget: surface,
    });
    expect(screen.getByRole("tooltip")).toBe(tooltip);

    fireEvent.pointerOut(surface, {
      pointerType: "mouse",
      relatedTarget: document.body,
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("leaves read-only availability labels disabled", () => {
    renderSlots({ onSelect: undefined });
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
