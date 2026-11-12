"use client";

import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { PRODUCT_KIND } from "@/lib/features/products/products.contract.mjs";
import { normalizeBookingProductKind } from "@/utils/productBookingLabels";

import {
  BOOKING_STATUS_OPTIONS,
  BOOKING_VIEWS,
  PAYMENT_STATUS_OPTIONS,
} from "./booking-table.constants";
import { cx } from "./booking-table.utils";

const controlClass =
  "h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[12px] font-medium text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

function SelectControl({ value, onChange, ariaLabel, children, className }) {
  return (
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className={cx(controlClass, className)}
    >
      {children}
    </select>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function BookingsToolbar({
  activeView,
  summary,
  filters,
  activeFilterCount,
  showFilters,
  locations,
  products,
  lecturers,
  t,
  onViewChange,
  onFilterChange,
  onFutureOnlyChange,
  onToggleFilters,
  onApplyFilters,
  onClearFilters,
  onExport,
}) {
  const tabCounts = {
    all: summary.total,
    today: summary.today,
    awaitingPayment: summary.awaitingPayment,
    cancelled: summary.cancelled,
  };
  const activityProducts = products.filter(
    (product) => normalizeBookingProductKind(product) !== PRODUCT_KIND.VOUCHER,
  );

  return (
    <>
      <div className="overflow-x-auto border-b border-line px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5 lg:px-6">
        <div
          className="flex min-w-max gap-1"
          role="group"
          aria-label={t("title")}
        >
          {BOOKING_VIEWS.map((view) => {
            const active = activeView === view;
            const count = tabCounts[view];

            return (
              <button
                key={view}
                type="button"
                aria-pressed={active}
                onClick={() => onViewChange(view)}
                className={cx(
                  "relative inline-flex min-h-12 shrink-0 items-center px-4 text-[12px] font-medium transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt-500/25",
                  active ? "text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {t(`views.${view}`)}
                {count !== null && count !== undefined && (
                  <span
                    className={cx(
                      "ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      view === "awaitingPayment"
                        ? "bg-[#FFE3DA] text-[#D64C30]"
                        : "bg-surface-muted text-ink-muted",
                    )}
                  >
                    {count}
                  </span>
                )}
                {active && (
                  <span
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cobalt-500"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onApplyFilters();
        }}
        className="border-b border-line px-4 py-3.5 sm:px-5 lg:px-6"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row">
            <label className="relative min-w-0 flex-1 xl:max-w-[340px]">
              <span className="sr-only">{t("filters.searchLabel")}</span>
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  onFilterChange("search", event.target.value)
                }
                placeholder={t("filters.searchPlaceholder")}
                className="h-11 w-full rounded-[12px] border border-line bg-white py-2 pl-10 pr-4 text-[12px] text-ink outline-none transition placeholder:text-ink-subtle hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
              />
            </label>

            <SelectControl
              value={filters.locationId}
              onChange={(event) =>
                onFilterChange("locationId", event.target.value)
              }
              ariaLabel={t("filters.location")}
              className="sm:min-w-[190px] sm:flex-1 xl:max-w-[240px]"
            >
              <option value="">{t("filters.allLocations")}</option>
              {locations.map((location) => {
                const locationId = String(location?._id || location?.id || "");

                if (!locationId) return null;

                return (
                  <option key={locationId} value={locationId}>
                    {location.name || "—"}
                  </option>
                );
              })}
            </SelectControl>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center xl:ml-auto">
            <button
              type="button"
              onClick={onToggleFilters}
              aria-expanded={showFilters}
              aria-controls="bookings-advanced-filters"
              className={cx(
                "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] border px-3.5",
                "text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25",
                showFilters
                  ? "border-cobalt-200 bg-cobalt-50 text-cobalt-600"
                  : "border-line bg-white text-ink-soft hover:border-line-strong hover:bg-canvas",
              )}
            >
              <AdjustmentsHorizontalIcon
                className="h-4 w-4 stroke-[1.7]"
                aria-hidden="true"
              />
              {t("filters.button")}
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-semibold text-cobalt-600 ring-1 ring-cobalt-100">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {!showFilters && (
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand-primary px-5 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgb(var(--skab-blue-rgb)/0.16)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                {t("filters.apply")}
              </button>
            )}

            <button
              type="button"
              onClick={onExport}
              className={cx(
                "inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-line bg-white px-4",
                "text-[12px] font-medium text-ink-soft transition hover:border-line-strong hover:bg-canvas",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25",
                !showFilters && "col-span-2 sm:col-span-1",
              )}
            >
              <ArrowDownTrayIcon
                className="h-4 w-4 stroke-[1.7]"
                aria-hidden="true"
              />
              {t("export")}
            </button>
          </div>
        </div>

        <label className="mt-3 flex min-h-11 w-fit cursor-pointer items-center gap-2.5 text-[12px] font-medium text-ink-soft">
          <input
            type="checkbox"
            checked={filters.futureOnly}
            onChange={(event) => onFutureOnlyChange(event.target.checked)}
            className="h-4 w-4 rounded border-line-strong text-brand-primary focus:ring-brand-primary/30"
          />
          {t("filters.futureOnly")}
        </label>

        {showFilters && (
          <div
            id="bookings-advanced-filters"
            role="region"
            aria-label={t("filters.button")}
            className="mt-3 rounded-[17px] border border-line bg-[#F9F8F5] p-4"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField label={t("filters.dateFrom")}>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) =>
                    onFilterChange("dateFrom", event.target.value)
                  }
                  className={controlClass}
                />
              </FilterField>

              <FilterField label={t("filters.dateTo")}>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) =>
                    onFilterChange("dateTo", event.target.value)
                  }
                  className={controlClass}
                />
              </FilterField>

              <FilterField label={t("filters.lecturer")}>
                <SelectControl
                  value={filters.lecturerId}
                  onChange={(event) =>
                    onFilterChange("lecturerId", event.target.value)
                  }
                  ariaLabel={t("filters.lecturer")}
                >
                  <option value="">{t("filters.allLecturers")}</option>
                  {lecturers.map((lecturer) => (
                    <option key={lecturer._id} value={lecturer._id}>
                      {lecturer.firstname} {lecturer.lastname}
                    </option>
                  ))}
                </SelectControl>
              </FilterField>

              <FilterField label={t("filters.activity")}>
                <SelectControl
                  value={filters.productId}
                  onChange={(event) =>
                    onFilterChange("productId", event.target.value)
                  }
                  ariaLabel={t("filters.activity")}
                >
                  <option value="">{t("filters.allActivities")}</option>
                  {activityProducts.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </SelectControl>
              </FilterField>

              <FilterField label={t("filters.customerId")}>
                <input
                  type="text"
                  value={filters.authorId}
                  onChange={(event) =>
                    onFilterChange("authorId", event.target.value)
                  }
                  placeholder={t("filters.customerIdPlaceholder")}
                  className={controlClass}
                />
              </FilterField>

              <FilterField label={t("filters.paymentStatus")}>
                <SelectControl
                  value={filters.paymentStatus}
                  onChange={(event) =>
                    onFilterChange("paymentStatus", event.target.value)
                  }
                  ariaLabel={t("filters.paymentStatus")}
                >
                  <option value="">{t("filters.allPaymentStatuses")}</option>
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </SelectControl>
              </FilterField>

              <FilterField label={t("filters.bookingStatus")}>
                <SelectControl
                  value={filters.status}
                  onChange={(event) =>
                    onFilterChange("status", event.target.value)
                  }
                  ariaLabel={t("filters.bookingStatus")}
                >
                  <option value="">{t("filters.allBookingStatuses")}</option>
                  {BOOKING_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </SelectControl>
              </FilterField>
            </div>

            <div className="mt-4 flex flex-col-reverse gap-2 border-t border-line/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[12px] font-medium text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                {t("filters.clear")}
              </button>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-brand-primary px-5 text-[12px] font-semibold text-white shadow-[0_8px_20px_rgb(var(--skab-blue-rgb)/0.16)] transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                {t("filters.apply")}
              </button>
            </div>
          </div>
        )}
      </form>
    </>
  );
}
