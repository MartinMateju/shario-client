import {
  FunnelIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

import { WorkspaceToolbar } from "@/components/dashboard/WorkspaceDataSurface";

import { cx } from "./products.utils";

export default function ProductToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  status,
  onStatusChange,
  view,
  onViewChange,
  showFilters,
  onToggleFilters,
  t,
}) {
  return (
    <WorkspaceToolbar>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 gap-2.5">
          <label className="relative min-w-0 flex-1 md:max-w-[300px]">
            <span className="sr-only">{t("toolbar.searchLabel")}</span>
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777773]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder || t("toolbar.searchPlaceholder")}
              className="h-11 w-full rounded-[13px] border border-line bg-white pl-10 pr-4 text-[12px] text-ink outline-none transition placeholder:text-ink-subtle hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
            />
          </label>

          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={showFilters}
            className={cx(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-[13px] border px-3.5 text-[12px] font-medium transition md:hidden",
              showFilters
                ? "border-cobalt-200 bg-cobalt-50 text-cobalt-600"
                : "border-line bg-white text-[#4F4F4F] hover:border-line-strong",
            )}
          >
            <FunnelIcon className="h-4 w-4" aria-hidden="true" />
            {t("toolbar.filters")}
          </button>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-11 min-w-[150px] rounded-[13px] border border-line bg-white pl-3.5 pr-10 text-[12px] text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500"
            aria-label={t("toolbar.statusLabel")}
          >
            <option value="all">{t("statuses.all")}</option>
            <option value="active">{t("statuses.active")}</option>
            <option value="draft">{t("statuses.draft")}</option>
          </select>

          <div className="flex rounded-[13px] border border-line bg-white p-1">
            <button
              type="button"
              onClick={() => onViewChange("table")}
              aria-label={t("toolbar.tableView")}
              aria-pressed={view === "table"}
              className={cx(
                "flex h-9 w-10 items-center justify-center rounded-[9px] transition",
                view === "table"
                  ? "bg-cobalt-50 text-cobalt-600 ring-1 ring-cobalt-500"
                  : "text-[#777773] hover:bg-[#F7F5F1]",
              )}
            >
              <TableCellsIcon className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              aria-label={t("toolbar.gridView")}
              aria-pressed={view === "grid"}
              className={cx(
                "flex h-9 w-10 items-center justify-center rounded-[9px] transition",
                view === "grid"
                  ? "bg-cobalt-50 text-cobalt-600 ring-1 ring-cobalt-500"
                  : "text-[#777773] hover:bg-[#F7F5F1]",
              )}
            >
              <Squares2X2Icon className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-[15px] border border-line bg-[#F9F8F5] p-3 md:hidden">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {t("toolbar.statusLabel")}
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-[12px] border border-line bg-white pl-3 pr-10 text-[12px] normal-case tracking-normal text-ink-soft outline-none focus:border-cobalt-500"
            >
              <option value="all">{t("statuses.all")}</option>
              <option value="active">{t("statuses.active")}</option>
              <option value="draft">{t("statuses.draft")}</option>
            </select>
          </label>
        </div>
      )}
    </WorkspaceToolbar>
  );
}
