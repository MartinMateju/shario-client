import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PeoplePagination from "@/components/tables/people/PeoplePagination";

const labels = {
  "pagination.entities.customers": "customers",
  "pagination.label": "Pagination",
  "pagination.next": "Next page",
  "pagination.previous": "Previous page",
  "pagination.rowsPerPage": "Rows per page",
  "pagination.showing": "Showing customers",
};

const t = (key) => labels[key] || key;

describe("PeoplePagination", () => {
  it("renders a compact rows-per-page selector and updates the page size", async () => {
    const user = userEvent.setup();
    const onPageSizeChange = vi.fn();

    render(
      <PeoplePagination
        activeTab="customers"
        currentPage={1}
        pageSize={10}
        totalCount={50}
        totalPages={5}
        t={t}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    const selector = screen.getByRole("combobox", {
      name: "Rows per page",
    });

    expect(selector).toHaveClass("h-9", "w-16", "rounded-[10px]");

    await user.selectOptions(selector, "20");

    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
