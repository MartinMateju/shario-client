"use client";

import { useId } from "react";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

import {
  formatDelta,
  formatReportDate,
  formatReportNumber,
  isFiniteReportNumber,
} from "./reports.utils";
import {
  WorkspaceTable,
  WorkspaceTableScroller,
} from "@/components/dashboard/WorkspaceDataSurface";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export function ReportSection({
  title,
  description,
  action,
  children,
  className = "",
}) {
  return (
    <section
      className={cx(
        "min-w-0 max-w-full overflow-hidden rounded-[24px] border border-line bg-white shadow-card",
        className,
      )}
    >
      {title || action ? (
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            {title ? (
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  formattedValue,
  previous,
  delta,
  compareEnabled = true,
  unavailableLabel,
  previousLabel,
  locale,
  icon: Icon,
  positiveDirection = "up",
}) {
  const available = isFiniteReportNumber(value);
  const deltaValue =
    available && isFiniteReportNumber(previous) && previous !== 0
      ? delta
      : null;
  const formattedDelta = formatDelta(deltaValue, locale);
  const DeltaIcon =
    deltaValue > 0
      ? ArrowUpRightIcon
      : deltaValue < 0
        ? ArrowDownRightIcon
        : MinusIcon;
  const isPositive =
    deltaValue !== null &&
    deltaValue !== 0 &&
    (positiveDirection === "down" ? deltaValue < 0 : deltaValue > 0);
  const isNegative =
    deltaValue !== null &&
    deltaValue !== 0 &&
    (positiveDirection === "down" ? deltaValue > 0 : deltaValue < 0);

  return (
    <article className="min-h-40 rounded-[22px] border border-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
          {label}
        </p>
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-50 text-cobalt-600">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p
        className={cx(
          "relative mt-5 font-normal text-[31px] leading-none tracking-[-0.035em]",
          available ? "text-ink" : "text-ink-subtle",
        )}
      >
        {available ? formattedValue : unavailableLabel}
      </p>
      {compareEnabled && available ? (
        <div className="relative mt-4 flex min-h-5 items-center gap-1.5 text-[10px]">
          {formattedDelta ? (
            <>
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold",
                  isPositive
                    ? "bg-success-soft text-success"
                    : isNegative
                      ? "bg-danger-soft text-danger"
                      : "bg-surface-muted text-ink-muted",
                )}
              >
                <DeltaIcon className="h-3 w-3" aria-hidden="true" />
                {formattedDelta}
              </span>
              <span className="text-ink-muted">{previousLabel}</span>
            </>
          ) : (
            <span className="text-ink-subtle">{previousLabel}</span>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function UnavailableState({ title, description, compact = false }) {
  return (
    <div
      className={cx(
        "flex items-start gap-3 rounded-[18px] border border-dashed border-line-strong bg-sand-50",
        compact ? "p-4" : "min-h-44 justify-center p-6 sm:items-center",
      )}
      role="status"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-muted shadow-xs">
        <InformationCircleIcon
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        />
      </span>
      <div className={compact ? "" : "max-w-sm"}>
        <h3 className="text-[12px] font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="mt-1 text-[12px] leading-5 text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function LoadingReport({ label }) {
  return (
    <div
      className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-line bg-white"
      role="status"
    >
      <div className="text-center">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
        <p className="mt-3 text-[12px] text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export function ReportError({ title, description, retryLabel, onRetry }) {
  return (
    <div className="flex min-h-[340px] items-center justify-center rounded-[24px] border border-danger/15 bg-white p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-ink-muted">{description}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-10 rounded-full border border-line-strong bg-white px-4 text-[12px] font-semibold text-ink transition hover:border-cobalt-300 hover:text-cobalt-700"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

const getChartValue = (item, metric) => {
  const fields = {
    netSales: "netSalesMinor",
    participants: "participants",
    bookings: "bookings",
  };
  const field = fields[metric];
  if (!field) return null;

  const value = item?.[field];

  return isFiniteReportNumber(value) ? value : null;
};

function TrendDataTable({
  data,
  title,
  description,
  dateLabel,
  valueFormatter,
  unavailableLabel,
  locale,
}) {
  return (
    <table data-ui-unstyled="true" className="sr-only">
      <caption>{description}</caption>
      <thead>
        <tr>
          <th scope="col">{dateLabel}</th>
          <th scope="col">{title}</th>
        </tr>
      </thead>
      <tbody>
        {data.map(({ item, value, index }) => (
          <tr key={`${item?.periodStart || index}-accessible`}>
            <td>{formatReportDate(item?.periodStart, locale)}</td>
            <td>{value === null ? unavailableLabel : valueFormatter(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TrendChart({
  series,
  metric,
  title,
  description,
  emptyLabel,
  unavailableLabel = emptyLabel,
  dateLabel,
  valueFormatter = (value) => String(value),
  locale,
}) {
  const chartId = useId().replaceAll(":", "");
  const data = (Array.isArray(series) ? series : []).map((item, index) => ({
    item,
    index,
    value: getChartValue(item, metric),
  }));

  if (data.length === 0) {
    return <UnavailableState title={emptyLabel} />;
  }

  const availableData = data.filter(({ value }) => value !== null);
  if (availableData.length === 0) {
    return (
      <div>
        <UnavailableState title={emptyLabel} />
        <TrendDataTable
          data={data}
          title={title}
          description={description}
          dateLabel={dateLabel}
          valueFormatter={valueFormatter}
          unavailableLabel={unavailableLabel}
          locale={locale}
        />
      </div>
    );
  }

  const width = 720;
  const height = 260;
  const inset = { top: 22, right: 18, bottom: 38, left: 52 };
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const values = availableData.map(({ value }) => value);
  const minValue = Math.min(0, ...values);
  let maxValue = Math.max(0, ...values);
  if (minValue === 0 && maxValue === 0) maxValue = 1;
  const range = maxValue - minValue || 1;
  const pointX = (index) =>
    inset.left +
    (data.length === 1
      ? plotWidth / 2
      : (index / (data.length - 1)) * plotWidth);
  const pointY = (value) =>
    inset.top + ((maxValue - value) / range) * plotHeight;
  const segments = data.reduce((result, point) => {
    if (point.value === null) return result;

    const previousPoint = data[point.index - 1];
    if (!previousPoint || previousPoint.value === null) {
      result.push([]);
    }
    result[result.length - 1].push(point);
    return result;
  }, []);
  const baselineY = pointY(0);
  const labelIndexes = data.length === 1 ? [0] : [0, data.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-labelledby={`${chartId}-title ${chartId}-description`}
      >
        <title id={`${chartId}-title`}>{title}</title>
        <desc id={`${chartId}-description`}>{description}</desc>
        <defs>
          <linearGradient id={`${chartId}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-brand-primary)"
              stopOpacity="0.22"
            />
            <stop
              offset="100%"
              stopColor="var(--color-brand-primary)"
              stopOpacity="0.015"
            />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((position) => {
          const y = inset.top + position * plotHeight;
          const value = maxValue - position * range;
          return (
            <g key={position}>
              <line
                x1={inset.left}
                x2={inset.left + plotWidth}
                y1={y}
                y2={y}
                stroke="#E7E4DE"
                strokeDasharray="4 6"
              />
              <text
                x={inset.left - 9}
                y={y + 4}
                textAnchor="end"
                fill="#7D7D7D"
                fontSize="10"
              >
                {valueFormatter(value)}
              </text>
            </g>
          );
        })}
        <line
          x1={inset.left}
          x2={inset.left + plotWidth}
          y1={baselineY}
          y2={baselineY}
          stroke="#D8D3CA"
        />
        {segments.map((segment, segmentIndex) => {
          const points = segment
            .map(({ index, value }) => `${pointX(index)},${pointY(value)}`)
            .join(" ");
          const firstX = pointX(segment[0].index);
          const lastX = pointX(segment[segment.length - 1].index);

          return (
            <g key={`segment-${segmentIndex}`}>
              <polygon
                points={`${firstX},${baselineY} ${points} ${lastX},${baselineY}`}
                fill={`url(#${chartId}-area)`}
              />
              <polyline
                points={points}
                fill="none"
                stroke="var(--color-brand-primary)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </g>
          );
        })}
        {availableData.map(({ item, value, index }) => (
          <circle
            key={`${item?.periodStart || index}-${value}`}
            cx={pointX(index)}
            cy={pointY(value)}
            r="4.5"
            fill="white"
            stroke="var(--color-brand-primary)"
            strokeWidth="2.5"
          >
            <title>
              {`${formatReportDate(item?.periodStart, locale)}: ${valueFormatter(
                value,
              )}`}
            </title>
          </circle>
        ))}
        {labelIndexes.map((index) => {
          const item = data[index]?.item;

          return (
            <text
              key={`${item?.periodStart || index}-label`}
              x={pointX(index)}
              y={height - 10}
              textAnchor={index === 0 ? "start" : "end"}
              fill="#7D7D7D"
              fontSize="10"
            >
              {formatReportDate(item?.periodStart, locale, {
                day: "numeric",
                month: "short",
              })}
            </text>
          );
        })}
      </svg>
      <TrendDataTable
        data={data}
        title={title}
        description={description}
        dateLabel={dateLabel}
        valueFormatter={valueFormatter}
        unavailableLabel={unavailableLabel}
        locale={locale}
      />
    </div>
  );
}

export function RankedList({ items, getKey, getLabel, getValue, emptyLabel }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="p-6 text-[12px] text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <ol className="divide-y divide-line">
      {items.map((item, index) => (
        <li
          key={getKey(item, index)}
          className="flex items-center gap-3 px-5 py-3.5 sm:px-6"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand-50 font-sans tabular-nums text-[10px] text-sand-700">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
            {getLabel(item)}
          </span>
          <span className="shrink-0 text-[12px] font-semibold text-ink">
            {getValue(item)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function DataTable({ caption, columns, rows, emptyLabel, getRowKey }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <p className="p-6 text-[12px] text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <WorkspaceTableScroller ariaLabel={caption}>
      <WorkspaceTable className="min-w-full">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-sand-50/70">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cx(
                  "px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted sm:px-6",
                  column.align === "right" ? "text-right" : "text-left",
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, rowIndex) => (
            <tr key={getRowKey(row, rowIndex)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cx(
                    "whitespace-nowrap px-5 py-3.5 text-[12px] text-ink sm:px-6",
                    column.align === "right" ? "text-right font-medium" : "",
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </WorkspaceTable>
    </WorkspaceTableScroller>
  );
}

const heatTone = (value) => {
  if (!isFiniteReportNumber(value)) return "bg-surface-muted text-ink-subtle";
  if (value >= 80) return "bg-cobalt-600 text-white";
  if (value >= 60) return "bg-cobalt-400 text-white";
  if (value >= 40) return "bg-cobalt-200 text-cobalt-900";
  if (value > 0) return "bg-cobalt-50 text-cobalt-700";
  return "bg-sand-50 text-ink-subtle";
};

export function BookingHeatmap({
  rows,
  title,
  timeLabel,
  weekdayLabel,
  unavailableLabel,
  percentFormatter,
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <UnavailableState title={unavailableLabel} compact />;
  }

  const weekdays = [...new Set(rows.map((item) => item.weekday))];
  const hours = [...new Set(rows.map((item) => item.hour))].sort(
    (left, right) => Number(left) - Number(right),
  );
  const byCell = new Map(
    rows.map((item) => [`${item.weekday}:${item.hour}`, item]),
  );

  return (
    <WorkspaceTableScroller ariaLabel={title}>
      <table
        data-ui-unstyled="true"
        className="w-full min-w-[620px] border-separate border-spacing-1.5"
      >
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            <th className="w-14" scope="col">
              <span className="sr-only">{timeLabel}</span>
            </th>
            {weekdays.map((weekday) => (
              <th
                key={weekday}
                scope="col"
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
              >
                {weekdayLabel(weekday)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <th
                scope="row"
                className="pr-2 text-right font-sans tabular-nums text-[10px] font-medium text-ink-muted"
              >
                {`${String(hour).padStart(2, "0")}:00`}
              </th>
              {weekdays.map((weekday) => {
                const item = byCell.get(`${weekday}:${hour}`);
                const value = item?.utilizationPercent;
                const valueLabel = isFiniteReportNumber(value)
                  ? percentFormatter(value)
                  : unavailableLabel;

                return (
                  <td key={`${weekday}-${hour}`}>
                    <div
                      className={cx(
                        "flex h-9 min-w-14 items-center justify-center rounded-[9px] text-[10px] font-semibold",
                        heatTone(value),
                      )}
                      title={`${weekdayLabel(weekday)}, ${hour}:00 — ${valueLabel}`}
                    >
                      {valueLabel}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </WorkspaceTableScroller>
  );
}

const insightStyle = {
  positive: {
    icon: CheckCircleIcon,
    className: "bg-success-soft text-success",
  },
  success: {
    icon: CheckCircleIcon,
    className: "bg-success-soft text-success",
  },
  warning: {
    icon: ExclamationTriangleIcon,
    className: "bg-warning-soft text-warning",
  },
  attention: {
    icon: ExclamationTriangleIcon,
    className: "bg-warning-soft text-warning",
  },
  recommendation: {
    icon: ArrowUpRightIcon,
    className: "bg-cobalt-50 text-cobalt-700",
  },
  info: {
    icon: InformationCircleIcon,
    className: "bg-sand-100 text-sand-800",
  },
};

export function InsightList({ insights, emptyLabel }) {
  if (!Array.isArray(insights) || insights.length === 0) {
    return <p className="p-6 text-[12px] text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="grid gap-3 p-4 sm:p-5">
      {insights.map((insight, index) => {
        const style =
          insightStyle[String(insight.tone || "").toLowerCase()] ||
          insightStyle.info;
        const Icon = style.icon;

        return (
          <li
            key={`${insight.title}-${index}`}
            className="flex gap-3 rounded-[16px] border border-line bg-sand-50/65 p-4"
          >
            <span
              className={cx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                style.className,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[12px] font-semibold leading-5 text-ink">
                {insight.title}
              </p>
              {insight.detail !== "" && insight.detail !== null ? (
                <p className="mt-0.5 text-[12px] leading-5 text-ink-muted">
                  {String(insight.detail)}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CoverageBadge({ complete, completeLabel, limitedLabel }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
        complete
          ? "bg-success-soft text-success"
          : "bg-warning-soft text-warning",
      )}
    >
      {complete ? (
        <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {complete ? completeLabel : limitedLabel}
    </span>
  );
}

export function CompactMetric({
  label,
  value,
  formatter = formatReportNumber,
  locale,
  unavailableLabel,
}) {
  const available = isFiniteReportNumber(value);

  return (
    <div className="rounded-[16px] border border-line bg-sand-50/55 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </p>
      <p
        className={cx(
          "mt-2 text-xl font-semibold tracking-[-0.02em]",
          available ? "text-ink" : "text-ink-subtle",
        )}
      >
        {available ? formatter(value, locale) : unavailableLabel}
      </p>
    </div>
  );
}
