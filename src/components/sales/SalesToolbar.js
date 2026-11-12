import {
  AdjustmentsHorizontalIcon,
  Bars3BottomLeftIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { WorkspaceToolbar } from "@/components/dashboard/WorkspaceDataSurface";

import { cx, ORDER_TABS, PRODUCT_TYPE_OPTIONS } from "./sales.utils";

function FilterField({ label, children }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
      {label}
      {children}
    </label>
  );
}

const fieldClass =
  "mt-2 h-11 w-full rounded-[12px] border border-line bg-white px-3 text-[12px] normal-case tracking-normal text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

export default function SalesToolbar({
  activeStatus,
  counts,
  onStatusChange,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  showFilters,
  onToggleFilters,
  density,
  onDensityChange,
  selectedCount,
  t,
}) {
  return (
    <WorkspaceToolbar>
      <div className="overflow-x-auto border-b border-line">
        <div
          className="flex min-w-max gap-1"
          role="group"
          aria-label={t("toolbar.statusFiltersLabel")}
        >
          {ORDER_TABS.map((status) => {
            const isActive = activeStatus === status;

            return (
              <button
                key={status}
                type="button"
                aria-pressed={isActive}
                onClick={() => onStatusChange(status)}
                className={cx(
                  "relative min-h-12 px-4 text-[12px] font-medium transition",
                  isActive
                    ? "text-[#171717]"
                    : "text-[#777773] hover:text-[#171717]",
                )}
              >
                {t(`tabs.${status}`)}
                <span className="ml-2 text-[10px] text-ink-muted">
                  {counts ? counts[status] || 0 : "—"}
                </span>
                {isActive && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cobalt-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row">
          <label className="relative min-w-0 flex-1 xl:max-w-[310px]">
            <span className="sr-only">{t("toolbar.searchLabel")}</span>
            <MagnifyingGlassIcon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777773]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("toolbar.searchPlaceholder")}
              className="h-11 w-full rounded-[13px] border border-line bg-white pl-10 pr-4 text-[12px] text-ink outline-none transition placeholder:text-ink-subtle hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
            />
          </label>

          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={showFilters}
            className={cx(
              "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[13px] border px-3.5 text-[12px] font-medium transition",
              showFilters
                ? "border-cobalt-200 bg-cobalt-50 text-cobalt-600"
                : "border-line bg-white text-[#4F4F4F] hover:border-line-strong",
            )}
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
            {t("toolbar.filters")}
          </button>

          {selectedCount > 0 && (
            <span className="inline-flex h-11 items-center rounded-[13px] bg-cobalt-50 px-3.5 text-[10px] font-semibold text-cobalt-600">
              {t("toolbar.selected", { count: selectedCount })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeStatus}
            onChange={(event) => onStatusChange(event.target.value)}
            className="hidden h-11 min-w-[150px] rounded-[13px] border border-line bg-white px-3.5 text-[12px] text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500 md:block"
            aria-label={t("toolbar.statusLabel")}
          >
            {ORDER_TABS.map((status) => (
              <option key={status} value={status}>
                {t(`tabs.${status}`)}
              </option>
            ))}
          </select>

          <div
            className="hidden rounded-[13px] border border-line bg-white p-1 sm:flex"
            aria-label={t("toolbar.densityLabel")}
          >
            <button
              type="button"
              onClick={() => onDensityChange("comfortable")}
              aria-label={t("toolbar.comfortable")}
              aria-pressed={density === "comfortable"}
              className={cx(
                "flex h-9 w-10 items-center justify-center rounded-[9px] transition",
                density === "comfortable"
                  ? "bg-cobalt-50 text-cobalt-600 ring-1 ring-cobalt-500"
                  : "text-[#777773] hover:bg-[#F7F5F1]",
              )}
            >
              <TableCellsIcon
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => onDensityChange("compact")}
              aria-label={t("toolbar.compact")}
              aria-pressed={density === "compact"}
              className={cx(
                "flex h-9 w-10 items-center justify-center rounded-[9px] transition",
                density === "compact"
                  ? "bg-cobalt-50 text-cobalt-600 ring-1 ring-cobalt-500"
                  : "text-[#777773] hover:bg-[#F7F5F1]",
              )}
            >
              <Bars3BottomLeftIcon
                className="h-[18px] w-[18px]"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-[17px] border border-line bg-[#F9F8F5] p-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FilterField label={t("filters.customerId")}>
              <input
                type="text"
                value={filters.userCustomId}
                onChange={(event) =>
                  onFilterChange("userCustomId", event.target.value)
                }
                placeholder={t("filters.customerIdPlaceholder")}
                className={fieldClass}
              />
            </FilterField>

            <FilterField label={t("filters.customerEmail")}>
              <input
                type="email"
                value={filters.userEmail}
                onChange={(event) =>
                  onFilterChange("userEmail", event.target.value)
                }
                placeholder="email@example.com"
                className={fieldClass}
              />
            </FilterField>

            <FilterField label={t("filters.productType")}>
              <select
                value={filters.productType}
                onChange={(event) =>
                  onFilterChange("productType", event.target.value)
                }
                className={fieldClass}
              >
                <option value="">{t("productTypes.all")}</option>
                {PRODUCT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {t(`productTypes.${type}`)}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[12px] font-medium text-ink-soft transition hover:border-line-strong hover:text-ink"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              {t("filters.clear")}
            </button>
          </div>
        </div>
      )}
    </WorkspaceToolbar>
  );
}
