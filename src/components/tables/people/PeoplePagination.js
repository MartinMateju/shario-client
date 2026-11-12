import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import { PAGE_SIZE_OPTIONS } from "./people-table.constants";
import { cx } from "./people-table.utils";

const buildPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) return [1, 2, 3, 4, 5, "end-gap", totalPages];
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "start-gap",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "start-gap",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-gap",
    totalPages,
  ];
};

export default function PeoplePagination({
  activeTab,
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  t,
  onPageChange,
  onPageSizeChange,
}) {
  const firstVisible = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastVisible = Math.min(currentPage * pageSize, totalCount);
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  return (
    <footer className="flex flex-col gap-3 border-t border-line bg-surface-muted/75 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-[12px] text-ink-muted">
        {t("pagination.showing", {
          from: firstVisible,
          to: lastVisible,
          total: totalCount,
          entity: t(`pagination.entities.${activeTab}`),
        })}
      </p>

      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:justify-end">
        <label className="flex shrink-0 items-center gap-2.5 text-[12px] font-medium text-ink-muted">
          <span className="whitespace-nowrap">
            {t("pagination.rowsPerPage")}
          </span>
          <span className="relative inline-flex">
            <select
              data-select-custom-arrow="true"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              aria-label={t("pagination.rowsPerPage")}
              className="h-9 w-16 cursor-pointer appearance-none rounded-[10px] border border-line bg-white bg-none pl-3 pr-7 text-left text-[12px] font-semibold leading-none tabular-nums text-ink shadow-[0_1px_2px_rgba(17,17,15,0.04)] outline-none transition-colors hover:border-line-strong focus-visible:border-cobalt-500 focus-visible:ring-2 focus-visible:ring-cobalt-500/15"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
          </span>
        </label>

        <nav
          className="flex items-center gap-1"
          aria-label={t("pagination.label")}
        >
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[#E3E0D9] bg-white text-[#6F6E68] transition hover:border-[#CBC7BE] hover:text-[#11110F] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={t("pagination.previous")}
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          {paginationItems.map((item) => {
            if (typeof item === "string") {
              return (
                <span
                  key={item}
                  className="flex h-10 min-w-7 items-center justify-center text-[12px] text-ink-muted"
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
                  "flex h-10 min-w-10 items-center justify-center rounded-[11px] px-2 text-[12px] font-semibold transition",
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
            disabled={currentPage >= totalPages || totalPages === 0}
            className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-[#E3E0D9] bg-white text-[#6F6E68] transition hover:border-[#CBC7BE] hover:text-[#11110F] disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={t("pagination.next")}
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </footer>
  );
}
