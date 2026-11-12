import styles from "./overview.module.css";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      ({
        "flow.title": "Studio operations",
        "flow.description": "Selected-day planning and live studio status.",
        "flow.emptyTitle": "No studio activity is scheduled yet",
        "flow.emptyDescriptionAll": `Across all studios, there are no bookings or pieces to process on ${values.date}.`,
        "flow.emptyDescriptionSelected": `For the selected studio, there are no bookings or pieces to process on ${values.date}.`,
        "flow.openCalendar": "Open calendar",
        "flow.dateUnavailable": "Selected date",
        "flow.allLocations": "All studios",
        "flow.selectedLocation": "Selected studio",
        "flow.groups.visits.title": "Bookings & attendance",
        "flow.groups.visits.description": "Selected-day plan and live presence",
        "flow.groups.pieces.title": "Pieces",
        "flow.groups.pieces.description":
          "From firing preparation to collection",
        "snapshot.bookings": "Bookings",
        "snapshot.expectedVisitors": "Expected visitors",
        "snapshot.date": "Selected date",
        "snapshot.currentState": "Current",
        "snapshot.live": "Live",
        "flow.stageCount": `${values.stage}: ${values.count}`,
        "flow.stageUnavailable": `${values.stage}: data unavailable`,
        "flow.stages.booked": "Bookings",
        "flow.stages.arriving": "Arriving",
        "flow.stages.inStudio": "In studio",
        "flow.stages.inKiln": "In kiln",
        "flow.stages.readyToFire": "Ready to fire",
        "flow.stages.readyForPickup": "Ready for pickup",
      })[key] ?? key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import StudioFlowRail from "./StudioFlowRail";

const stage = (
  key,
  value,
  href = `/app/${key}`,
  unit = ["readyToFire", "inKiln", "readyForPickup"].includes(key)
    ? "pieces"
    : key === "booked"
      ? "bookings"
      : "people",
) => ({
  key,
  value,
  available: true,
  href,
  unit,
});

describe("StudioFlowRail", () => {
  it("summarizes zero activity in a compact actionable state", () => {
    const { container } = render(
      <StudioFlowRail stages={[stage("booked", 0), stage("readyToFire", 0)]} />,
    );
    const rail = container.querySelector("[data-studio-flow-rail]");
    const brush = rail.querySelector(
      '[data-workspace-brush-field="overviewHero"]',
    );

    expect(rail).toHaveAttribute("data-flow-state", "empty");
    expect(rail).toHaveAttribute("data-flow-density", "compact");
    expect(rail).toHaveClass(styles.card, styles.flow);
    expect(brush).toHaveAttribute("aria-hidden", "true");
    expect(brush).toHaveClass("pointer-events-none", "z-0", styles.flowBrushes);
    expect(
      rail.querySelector("[data-studio-flow-readability-scrim]"),
    ).toHaveClass(styles.flowScrim);
    expect(rail.querySelector("[data-studio-flow-header]")).toHaveClass(
      styles.sectionHeader,
    );
    expect(container.querySelector("[data-flow-empty-state]")).toHaveClass(
      styles.emptyFlow,
    );
    expect(
      within(rail).getByRole("heading", {
        level: 2,
        name: "Studio operations",
      }),
    ).toBeVisible();
    expect(container.querySelector("[data-flow-empty-state]")).toBeVisible();
    expect(container.querySelector("[data-flow-context]")).toBeNull();
    expect(screen.queryByText("Selected studio")).toBeNull();
    expect(screen.queryByText("11/08/2026")).toBeNull();
    expect(
      screen.getByText("No studio activity is scheduled yet"),
    ).toBeVisible();
    expect(within(rail).getAllByText("0")).toHaveLength(1);
    for (const value of within(rail).getAllByText("0")) {
      expect(value).not.toHaveClass("sr-only");
      expect(value).toBeVisible();
    }
    expect(screen.getByRole("link", { name: "Open calendar" })).toHaveAttribute(
      "href",
      "/app/calendar",
    );
  });

  it("preserves attendance navigation and discards removed pottery stages", () => {
    const { container } = render(
      <StudioFlowRail
        stages={[
          stage("booked", 18, "/app/bookings"),
          stage("arriving", 9, "/app/calendar"),
          stage("inStudio", 5, "/app/calendar"),
          stage("readyToFire", 12, "/app/firings?section=items"),
          stage("inKiln", 18, "/app/firings"),
          stage("readyForPickup", 7, "/app/firings?section=items"),
        ]}
      />,
    );
    const piecesGroup = container.querySelector('[data-flow-group="pieces"]');

    expect(container.querySelector('[data-flow-group="visits"]')).toBeVisible();
    expect(piecesGroup).toBeNull();
    expect(
      screen.getByRole("list", { name: "Bookings & attendance" }),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "Pieces · Live" })).toBeNull();

    expect(
      screen.getByRole("link", {
        name: "Bookings: 18 · Selected date",
      }),
    ).toHaveAttribute("href", "/app/bookings");
    expect(
      screen.getByRole("link", {
        name: "Expected visitors: 9 · Selected date",
      }),
    ).toHaveAttribute("href", "/app/calendar");
    expect(
      screen.getByRole("link", { name: "In studio: 5 · Current" }),
    ).toHaveAttribute("href", "/app/calendar");
    expect(screen.queryByRole("link", { name: "In kiln: 18" })).toBeNull();
    expect(
      screen.queryByText("No studio activity is scheduled yet"),
    ).toBeNull();
  });

  it("keeps people-based planning and live presence visible for another date", () => {
    const { container } = render(
      <StudioFlowRail
        isToday={false}
        stages={[
          stage("booked", 18, "/app/bookings"),
          stage("arriving", 9, "/app/calendar"),
          stage("inStudio", 5, "/app/calendar"),
          stage("readyToFire", 12, "/app/firings?section=items"),
        ]}
      />,
    );

    expect(container.querySelector('[data-flow-stage="booked"]')).toBeVisible();
    expect(
      container.querySelector('[data-flow-stage="arriving"]'),
    ).toBeVisible();
    expect(
      container.querySelector('[data-flow-stage="inStudio"]'),
    ).toBeVisible();
    expect(screen.getByText("Expected visitors")).toBeVisible();
    expect(screen.queryByRole("list", { name: "Pieces · Live" })).toBeNull();
  });

  it("keeps legacy booking-count stages today-only and honestly labelled", () => {
    const legacyStages = [
      stage("booked", 18, "/app/bookings"),
      stage("arriving", 3, "/app/calendar", "bookings"),
      stage("inStudio", 2, "/app/calendar", "bookings"),
    ];
    const { container, rerender } = render(
      <StudioFlowRail stages={legacyStages} />,
    );

    expect(screen.getByText("Arriving")).toBeVisible();
    expect(screen.queryByText("Expected visitors")).toBeNull();

    rerender(<StudioFlowRail isToday={false} stages={legacyStages} />);

    expect(container.querySelector('[data-flow-stage="booked"]')).toBeVisible();
    expect(
      container.querySelector('[data-flow-stage="arriving"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-flow-stage="inStudio"]'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Expected visitors")).toBeNull();
  });

  it("renders unknown values as a dash without calling the rail empty", () => {
    const { container } = render(
      <StudioFlowRail
        stages={[
          {
            key: "booked",
            value: null,
            available: true,
            href: "/app/bookings",
          },
        ]}
      />,
    );
    const rail = container.querySelector("[data-studio-flow-rail]");

    expect(rail).toHaveAttribute("data-flow-state", "partial");
    expect(rail).toHaveAttribute("data-flow-density", "standard");
    expect(within(rail).getByText("—")).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Bookings: data unavailable · Selected date",
      }),
    ).toBeVisible();
  });

  it("derives the empty state after module-disabled stages are removed", () => {
    const { container } = render(
      <StudioFlowRail
        modules={{ bookings: true, firing: false }}
        stages={[stage("booked", 0), stage("inKiln", 5)]}
      />,
    );
    const rail = container.querySelector("[data-studio-flow-rail]");

    expect(rail).toHaveAttribute("data-flow-state", "empty");
    expect(within(rail).queryByText("In kiln")).toBeNull();
    expect(within(rail).queryByText("Bookings")).toBeNull();
    expect(within(rail).getByText("Bookings & attendance")).toBeVisible();
    expect(container.querySelector('[data-flow-group="pieces"]')).toBeNull();
  });
});
