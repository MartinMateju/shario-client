"use client";

import { useId, useState } from "react";

import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";

const DATE_RANGES = ["7", "30", "90", "month", "all", "custom"];
const fieldClass =
  "mt-1.5 h-11 w-full min-w-0 max-w-full rounded-[12px] border border-line bg-white px-3 text-[13px] font-normal text-ink outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

function localDateValue(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function createDraft(filters, dateFrom, dateTo) {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);

  return {
    filters,
    dateFrom,
    dateTo,
    range: filters.dateRange,
    from: dateFrom || localDateValue(monthAgo),
    to: dateTo || localDateValue(today),
    attempted: false,
  };
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() > 0 &&
    localDateValue(date) === value
  );
}

export default function SalesPeriodControls({
  filters,
  dateFrom,
  dateTo,
  periodLabel,
  onChange,
  t,
}) {
  const id = useId();
  const [draft, setDraft] = useState(() =>
    createDraft(filters, dateFrom, dateTo),
  );

  // A parent reset also discards any custom dates that have not been applied.
  if (
    draft.filters !== filters ||
    draft.dateFrom !== dateFrom ||
    draft.dateTo !== dateTo
  ) {
    setDraft(createDraft(filters, dateFrom, dateTo));
  }

  const isCustom = draft.range === "custom";
  const validationKey =
    !isValidDate(draft.from) || !isValidDate(draft.to)
      ? "period.invalidDates"
      : draft.from > draft.to
        ? "period.reversedDates"
        : null;
  const showError = draft.attempted && validationKey;

  const handleRangeChange = (event) => {
    const range = event.target.value;
    setDraft({ ...createDraft(filters, dateFrom, dateTo), range });

    if (range !== "custom") {
      onChange({ dateRange: range, dateFrom: "", dateTo: "" });
    }
  };

  const handleApply = (event) => {
    event.preventDefault();
    setDraft({ ...draft, attempted: true });
    if (validationKey) return;

    onChange({
      dateRange: "custom",
      dateFrom: draft.from,
      dateTo: draft.to,
    });
  };

  return (
    <WorkspaceCard
      as="section"
      aria-labelledby={`${id}-heading`}
      className="p-4 sm:p-5"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2
            id={`${id}-heading`}
            className="text-[14px] font-semibold leading-5 text-ink"
          >
            {t("period.title")}
          </h2>
          <p
            className="mt-1 break-words text-[16px] font-semibold leading-6 text-ink tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {t("period.appliedRange", { period: periodLabel })}
          </p>
          <p
            id={`${id}-description`}
            className="mt-1 text-[12px] leading-5 text-ink-muted"
          >
            {t("period.description")}
          </p>
        </div>

        <label className="block min-w-0 text-[12px] font-medium text-ink-soft sm:w-48 sm:shrink-0">
          {t("period.presetLabel")}
          <select
            value={draft.range}
            onChange={handleRangeChange}
            aria-describedby={`${id}-description`}
            className={fieldClass}
          >
            {DATE_RANGES.map((range) => (
              <option key={range} value={range}>
                {t(`dateRanges.${range}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isCustom && (
        <form
          onSubmit={handleApply}
          noValidate
          className="mt-4 border-t border-line pt-4"
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <label className="block min-w-0 text-[12px] font-medium text-ink-soft">
              {t("filters.dateFrom")}
              <input
                type="date"
                required
                value={draft.from}
                onChange={(event) =>
                  setDraft({ ...draft, from: event.target.value })
                }
                aria-invalid={showError ? true : undefined}
                aria-describedby={showError ? `${id}-error` : undefined}
                className={fieldClass}
              />
            </label>
            <label className="block min-w-0 text-[12px] font-medium text-ink-soft">
              {t("filters.dateTo")}
              <input
                type="date"
                required
                value={draft.to}
                onChange={(event) =>
                  setDraft({ ...draft, to: event.target.value })
                }
                aria-invalid={showError ? true : undefined}
                aria-describedby={showError ? `${id}-error` : undefined}
                className={fieldClass}
              />
            </label>
            <button
              type="submit"
              className="min-h-11 rounded-[12px] bg-cobalt-500 px-4 text-[13px] font-semibold text-white transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt-500/20 sm:col-span-2 lg:col-span-1"
            >
              {t("period.apply")}
            </button>
          </div>
          {showError && (
            <p
              id={`${id}-error`}
              role="alert"
              className="mt-2 text-[12px] leading-5 text-danger"
            >
              {t(validationKey)}
            </p>
          )}
        </form>
      )}
    </WorkspaceCard>
  );
}
