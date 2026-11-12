import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ locale: "en" }));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) =>
    ({
      dateLabel: "Overview date",
      "dateNavigation.backToToday": "Back to today",
      "dateNavigation.chooseDate": "Choose date",
      "dateNavigation.nextDay": "Next day",
      "dateNavigation.previousDay": "Previous day",
      "dateNavigation.today": "Today",
      "flow.title": "Studio operations",
      "snapshot.date": "Selected date",
    })[key] ?? key,
}));

import OverviewDateNavigation from "./OverviewDateNavigation";

describe("OverviewDateNavigation", () => {
  beforeEach(() => {
    mocks.locale = "en";
  });

  it("keeps date navigation compact, accessible, and localized", () => {
    const onDateChange = vi.fn();
    render(
      <OverviewDateNavigation
        dateValue="2026-03-01"
        onDateChange={onDateChange}
        todayValue="2026-03-02"
      />,
    );

    const control = screen.getByRole("group", {
      name: "Studio operations: 3/1/2026",
    });
    expect(control).toHaveAttribute("data-overview-date-control");
    expect(control).toHaveClass("min-h-[54px]", "sm:w-[260px]");
    expect(screen.getByText("3/1/2026")).toHaveAttribute(
      "data-overview-date-label",
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(onDateChange).toHaveBeenLastCalledWith("2026-02-28");

    fireEvent.click(screen.getByRole("button", { name: "Next day" }));
    expect(onDateChange).toHaveBeenLastCalledWith("2026-03-02");
  });

  it("opens the native picker and returns focus after resetting to today", async () => {
    const onDateChange = vi.fn();
    render(
      <OverviewDateNavigation
        dateValue="2026-03-01"
        onDateChange={onDateChange}
        todayValue="2026-03-02"
      />,
    );

    const input = screen.getByLabelText("Overview date");
    const showPicker = vi.fn();
    input.showPicker = showPicker;
    const dateTrigger = screen.getByRole("button", { name: /^Choose date:/ });
    const resetButton = screen.getByRole("button", { name: "Back to today" });

    expect(dateTrigger).toHaveClass("focus-visible:ring-inset");
    expect(resetButton).toHaveClass("focus-visible:ring-inset");
    fireEvent.click(dateTrigger);
    expect(showPicker).toHaveBeenCalledTimes(1);

    fireEvent.click(resetButton);
    expect(onDateChange).toHaveBeenLastCalledWith("2026-03-02");
    await waitFor(() => expect(dateTrigger).toHaveFocus());
  });

  it("uses the hidden native date input without exposing a redundant reset today", async () => {
    const onDateChange = vi.fn();
    render(
      <OverviewDateNavigation
        dateValue="2026-03-02"
        onDateChange={onDateChange}
        todayValue="2026-03-02"
      />,
    );

    const input = screen.getByLabelText("Overview date");
    const dateTrigger = screen.getByRole("button", { name: /^Choose date:/ });
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveValue("2026-03-02");
    expect(
      screen.queryByRole("button", { name: "Back to today" }),
    ).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "2026-03-04" } });
    expect(onDateChange).toHaveBeenLastCalledWith("2026-03-04");
    await waitFor(() => expect(dateTrigger).toHaveFocus());
  });

  it("falls back to clicking the native input when showPicker is restricted", () => {
    render(
      <OverviewDateNavigation
        dateValue="2026-03-02"
        onDateChange={vi.fn()}
        todayValue="2026-03-02"
      />,
    );

    const input = screen.getByLabelText("Overview date");
    input.showPicker = vi.fn(() => {
      throw new DOMException("Picker blocked");
    });
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: /^Choose date:/ }));

    expect(input.showPicker).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("uses Czech date formatting without changing the native value", () => {
    mocks.locale = "cs";
    render(
      <OverviewDateNavigation
        dateValue="2026-07-30"
        onDateChange={vi.fn()}
        todayValue="2026-07-30"
      />,
    );

    expect(screen.getByText("30. 7. 2026")).toBeVisible();
    expect(screen.getByLabelText("Overview date")).toHaveValue("2026-07-30");
  });
});
