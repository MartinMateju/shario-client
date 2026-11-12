import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DataTable,
  TrendChart,
} from "@/components/views/statistics/ReportsPrimitives";

const renderChart = (series) =>
  render(
    <TrendChart
      series={series}
      metric="bookings"
      title="Bookings"
      description="Bookings over time"
      dateLabel="Date"
      emptyLabel="No trend data"
      unavailableLabel="Unavailable"
      valueFormatter={(value) => String(value)}
      locale="en-GB"
    />,
  );

describe("report trend chart", () => {
  it("splits the line at unavailable buckets and keeps them in its table", () => {
    const { container } = renderChart([
      { periodStart: "2026-07-01", bookings: 2 },
      { periodStart: "2026-07-02", bookings: null },
      { periodStart: "2026-07-03", bookings: 4 },
    ]);

    expect(container.querySelectorAll("polyline")).toHaveLength(2);
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(container.querySelectorAll("tbody tr")[1]).toHaveTextContent(
      "Unavailable",
    );
  });

  it("places an all-zero series on the bottom baseline", () => {
    const { container } = renderChart([
      { periodStart: "2026-07-01", bookings: 0 },
      { periodStart: "2026-07-02", bookings: 0 },
    ]);

    const points = [...container.querySelectorAll("svg circle")];
    expect(points).toHaveLength(2);
    expect(points.every((point) => point.getAttribute("cy") === "222")).toBe(
      true,
    );
  });

  it("exposes wide report tables as keyboard-scrollable labelled regions", () => {
    render(
      <DataTable
        caption="Course performance"
        columns={[
          {
            key: "name",
            label: "Course",
            render: (row) => row.name,
          },
        ]}
        rows={[{ id: "course-1", name: "Wheel throwing" }]}
        getRowKey={(row) => row.id}
        emptyLabel="No courses"
      />,
    );

    const region = screen.getByRole("region", {
      name: "Course performance",
    });

    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("overflow-x-auto", "overscroll-x-contain");
    expect(screen.getByRole("cell", { name: "Wheel throwing" })).toHaveClass(
      "text-[12px]",
    );
  });
});
