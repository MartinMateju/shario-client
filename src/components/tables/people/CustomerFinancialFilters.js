import { useId } from "react";

import { cx } from "./people-table.utils";

export default function CustomerFinancialFilters({
  financialFilters = {},
  onFinancialFilterChange,
  onApplyFinancialFilters,
  financialFiltersDirty = false,
  financialFilterErrors = {},
  spendingAvailable = true,
  currency = "CZK",
  financialFiltersLoading = false,
  t,
}) {
  const id = useId();
  const hasErrors = Object.values(financialFilterErrors).some(Boolean);

  const field = (key, { type = "text", disabled = false, range } = {}) => {
    const error = financialFilterErrors[key];
    const rangeError = financialFilterErrors[range];
    const describedBy =
      [error && `${id}-${key}-error`, rangeError && `${id}-${range}-error`]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="min-w-0">
        <label
          htmlFor={`${id}-${key}`}
          className="mb-1.5 block text-[13px] font-medium text-ink-soft"
        >
          {t(`filters.${key}`)}
        </label>
        <input
          id={`${id}-${key}`}
          type={type}
          inputMode={type === "text" ? "decimal" : undefined}
          value={financialFilters[key] ?? ""}
          onChange={(event) =>
            onFinancialFilterChange?.(key, event.target.value)
          }
          disabled={disabled || financialFiltersLoading}
          aria-invalid={Boolean(error || rangeError) || undefined}
          aria-describedby={describedBy}
          className={cx(
            "h-11 min-w-0 w-full rounded-[12px] border bg-white px-3.5 text-[16px] text-ink outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted sm:text-[14px]",
            error || rangeError
              ? "border-danger"
              : "border-line hover:border-line-strong",
          )}
        />
        {error ? (
          <span
            id={`${id}-${key}-error`}
            className="mt-1.5 block text-[13px] text-danger"
          >
            {error}
          </span>
        ) : null}
      </div>
    );
  };

  const rangeError = (key) =>
    financialFilterErrors[key] ? (
      <p id={`${id}-${key}-error`} className="text-[13px] text-danger">
        {financialFilterErrors[key]}
      </p>
    ) : null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-6">
        <fieldset className="min-w-0" aria-describedby={`${id}-spending-hint`}>
          <legend className="text-[14px] font-semibold text-ink">
            {t("filters.spending", { currency })}
          </legend>
          <p
            id={`${id}-spending-hint`}
            className="mt-1 text-[13px] leading-5 text-ink-muted"
          >
            {t("filters.spendingHint")}
          </p>
          {!spendingAvailable ? (
            <p className="mt-2 text-[13px] leading-5 text-ink-muted">
              {t("filters.spendingUnavailable")}
            </p>
          ) : null}
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {field("spendMin", {
              disabled: !spendingAvailable,
              range: "spendingRange",
            })}
            {field("spendMax", {
              disabled: !spendingAvailable,
              range: "spendingRange",
            })}
          </div>
          <div className="mt-2">{rangeError("spendingRange")}</div>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {field("spendFrom", {
              type: "date",
              disabled: !spendingAvailable,
              range: "dateRange",
            })}
            {field("spendTo", {
              type: "date",
              disabled: !spendingAvailable,
              range: "dateRange",
            })}
          </div>
          <div className="mt-2">{rangeError("dateRange")}</div>
          <p className="mt-2 text-[13px] leading-5 text-ink-muted">
            {t("filters.spendingDatesHint")}
          </p>
        </fieldset>

        <fieldset
          className="min-w-0 border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          aria-describedby={`${id}-credits-hint`}
        >
          <legend className="float-left w-full text-[14px] font-semibold text-ink">
            {t("filters.credits", { currency })}
          </legend>
          <p
            id={`${id}-credits-hint`}
            className="clear-both pt-1 text-[13px] leading-5 text-ink-muted"
          >
            {t("filters.creditsHint")}
          </p>
          <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
            {field("creditMin", { range: "creditRange" })}
            {field("creditMax", { range: "creditRange" })}
          </div>
          <div className="mt-2">{rangeError("creditRange")}</div>
        </fieldset>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
        {financialFiltersDirty ? (
          <p className="text-[13px] leading-5 text-ink-muted" role="status">
            {t("filters.financialDraftHint")}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onApplyFinancialFilters}
          disabled={
            !financialFiltersDirty || hasErrors || financialFiltersLoading
          }
          className="inline-flex min-h-11 items-center justify-center rounded-[12px] bg-brand-primary px-4 py-2.5 text-[13px] font-semibold text-white outline-none transition hover:bg-cobalt-700 focus-visible:ring-2 focus-visible:ring-cobalt-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t("filters.applyFinancial")}
        </button>
      </div>
    </div>
  );
}
