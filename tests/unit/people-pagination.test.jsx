import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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

  it("navigates a large customer list by pointer and keyboard, including the last page", async () => {
    const user = userEvent.setup();
    function PaginatedCustomers() {
      const [page, setPage] = useState(1);
      return (
        <PeoplePagination
          activeTab="customers"
          currentPage={page}
          pageSize={10}
          totalCount={120}
          totalPages={12}
          t={t}
          onPageChange={setPage}
          onPageSizeChange={vi.fn()}
        />
      );
    }
    render(<PaginatedCustomers />);
    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });
    expect(previous).toBeDisabled();

    next.focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "2", current: "page" }),
    ).toBeVisible();
    await user.click(previous);
    expect(
      screen.getByRole("button", { name: "1", current: "page" }),
    ).toBeVisible();

    screen.getByRole("button", { name: "12" }).focus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", { name: "12", current: "page" }),
    ).toBeVisible();
    expect(next).toBeDisabled();
    expect(previous).toBeEnabled();

    previous.focus();
    await user.keyboard(" ");
    expect(
      screen.getByRole("button", { name: "11", current: "page" }),
    ).toBeVisible();
    expect(next).toBeEnabled();
  });
});
