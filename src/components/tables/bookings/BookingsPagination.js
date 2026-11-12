"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { PAGE_SIZE_OPTIONS } from "./booking-table.constants";
import { cx, getPaginationItems } from "./booking-table.utils";

export default function BookingsPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  currentCount,
  t,
  onPageChange,
  onPageSizeChange,
}) {
  const paginationItems = getPaginationItems(currentPage, totalPages);
  const firstVisible = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastVisible = Math.min(
    firstVisible + Math.max(currentCount - 1, 0),
    totalCount,
  );

  return (
    <footer className="flex flex-col gap-3 border-t border-line bg-surface-muted/60 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:px-6">
      <p className="text-[12px] text-ink-muted">
        {t("pagination.showing", {
          from: firstVisible,
          to: lastVisible,
          total: totalCount,
        })}
      </p>

      <div className="flex flex-1 flex-wrap items-center justify-between gap-3 lg:justify-end">
        <label className="flex items-center gap-2 text-[12px] text-ink-muted">
          {t("pagination.rowsPerPage")}
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 min-w-[4.5rem] rounded-[10px] border border-line bg-white pl-3 pr-9 text-[12px] font-medium text-ink outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <nav
          className="flex items-center gap-1"
          aria-label={t("pagination.label")}
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E3E0D9] bg-white text-[#6F6E68] transition hover:border-[#CBC7BE] hover:text-[#11110F] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={t("pagination.previous")}
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          {paginationItems.map((item) => {
            if (typeof item === "string") {
              return (
                <span
                  key={item}
                  className="flex h-9 min-w-7 items-center justify-center text-[12px] text-ink-muted"
                >
                  …
                </span>
              );
            }

            return (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cx(
                  "flex h-9 min-w-9 items-center justify-center rounded-[10px] px-2 text-[12px] font-semibold transition",
                  currentPage === item
                    ? "bg-brand-primary text-white shadow-[0_6px_16px_rgb(var(--skab-blue-rgb)/0.18)]"
                    : "text-[#454540] hover:bg-[#F0EFEC]",
                )}
                aria-current={currentPage === item ? "page" : undefined}
              >
                {item}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E3E0D9] bg-white text-[#6F6E68] transition hover:border-[#CBC7BE] hover:text-[#11110F] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={t("pagination.next")}
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </footer>
  );
}
