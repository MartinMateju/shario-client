"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  InformationCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { normalizeLocationsResponse } from "@/lib/features/locations/location.utils";
import {
  useExportReportsCsvMutation,
  useGenerateReportsBriefingMutation,
  useGetReportsOverviewQuery,
} from "@/lib/features/reports/reportsApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import {
  BookingHeatmap,
  CompactMetric,
  CoverageBadge,
  cx,
  DataTable,
  InsightList,
  LoadingReport,
  MetricCard,
  RankedList,
  ReportError,
  ReportSection,
  TrendChart,
  UnavailableState,
} from "./ReportsPrimitives";
import {
  downloadCsvFile,
  formatReportDate,
  formatReportDateTime,
  formatReportMoney,
  formatReportNumber,
  formatReportPercent,
  getMetricDelta,
  getMetricPrevious,
  getMetricValue,
  getOperationSections,
  getReportDateRange,
  getReportErrorMessage,
  isCsvDownloadPayload,
  isFiniteReportNumber,
  normalizeReportInsights,
  normalizeReportOverview,
  REPORT_DATE_PRESETS,
  REPORT_GRANULARITIES,
  REPORT_TABS,
} from "./reports.utils";

const controlClass =
  "h-11 w-full rounded-[13px] border border-line bg-white px-3.5 text-[12px] text-ink outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10";

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-4 text-[12px] font-semibold text-ink transition hover:border-cobalt-300 hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300 disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[12px] font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

const REPORT_TABS_ID = "report-sections";
const REPORT_TAB_ICONS = {
  overview: ChartBarSquareIcon,
  sales: BanknotesIcon,
  bookings: CalendarDaysIcon,
  customers: UsersIcon,
  operations: CubeIcon,
};

const SUMMARY_METRICS = [
  {
    key: "netSales",
    icon: BanknotesIcon,
    format: "money",
  },
  {
    key: "bookings",
    icon: CalendarDaysIcon,
    format: "number",
  },
  {
    key: "utilizationPercent",
    icon: ChartBarSquareIcon,
    format: "percent",
  },
  {
    key: "returningCustomerPercent",
    icon: UsersIcon,
    format: "percent",
  },
];

const WEEKDAY_KEYS = {
  0: "mon",
  1: "tue",
  2: "wed",
  3: "thu",
  4: "fri",
  5: "sat",
  6: "sun",
  7: "sun",
  sunday: "sun",
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
};

const COVERAGE_SOURCE_KEYS = {
  sales: "sales",
  bookings: "bookings",
  customers: "customers",
  inventory: "inventory",
  staffTasks: "staffTasks",
};

const COVERAGE_REASON_KEYS = {
  module_disabled: "moduleDisabled",
  permission_required: "permissionRequired",
  sales_source_required: "salesSourceRequired",
};

const humanize = (value) =>
  String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeLocationAccess = (access) => {
  const source = access?.locationAccess ?? access?.membership?.locationAccess;
  const mode = String(source?.mode || "").toLowerCase();
  const ids = Array.isArray(source?.locationIds)
    ? source.locationIds.map(String)
    : [];

  return { mode, ids: new Set(ids) };
};

const explicitAiCapabilityEnabled = (capabilities) => {
  const features = capabilities?.features ?? capabilities?.capabilities;
  const capability = features?.reportInsights;

  return (
    capability !== undefined &&
    capability !== false &&
    capability?.enabled !== false &&
    capability?.available !== false
  );
};

const formatMetric = ({ format, value, currency, locale, unavailable }) => {
  if (format === "money") {
    return formatReportMoney(value, currency, locale, unavailable);
  }
  if (format === "percent") {
    return formatReportPercent(value, locale, unavailable);
  }
  return formatReportNumber(value, locale, unavailable);
};

function Limitations({ items, title, empty = false }) {
  if (!Array.isArray(items) || items.length === 0) {
    return empty ? null : null;
  }

  return (
    <div className="border-t border-line bg-warning-soft/55 px-5 py-4 sm:px-6">
      <div className="flex items-start gap-2.5">
        <InformationCircleIcon
          className="mt-0.5 h-4 w-4 shrink-0 text-warning"
          aria-hidden="true"
        />
        <div>
          <p className="text-[12px] font-semibold text-warning">{title}</p>
          <ul className="mt-1.5 space-y-1 text-[12px] leading-5 text-sand-800">
            {items.map((item, index) => (
              <li key={`${item}-${index}`}>{String(item)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children, className = "" }) {
  return (
    <label className={cx("block min-w-0", className)}>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function OverviewTab({
  report,
  locale,
  currency,
  compare,
  t,
  aiAccess,
  briefing,
  briefingError,
  briefingLoading,
  onGenerateBriefing,
}) {
  const [chartMetric, setChartMetric] = useState("netSales");
  const chartFormatter =
    chartMetric === "netSales"
      ? (value) => formatReportMoney(value, currency, locale)
      : (value) => formatReportNumber(value, locale);
  const deterministicInsights = report.insights;
  const sales = report.sales;
  const bookings = report.bookings;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_METRICS.map((definition) => {
          const metric = report.summary?.[definition.key];
          const value = getMetricValue(metric);
          const previous = getMetricPrevious(metric);

          return (
            <MetricCard
              key={definition.key}
              label={t(`metrics.${definition.key}`)}
              value={value}
              formattedValue={formatMetric({
                format: definition.format,
                value,
                currency,
                locale,
                unavailable: t("common.unavailable"),
              })}
              previous={previous}
              delta={getMetricDelta(metric)}
              compareEnabled={compare}
              previousLabel={
                isFiniteReportNumber(previous) && previous !== 0
                  ? t("comparison.previous")
                  : t("comparison.noBaseline")
              }
              unavailableLabel={t("common.unavailable")}
              locale={locale}
              icon={definition.icon}
            />
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <ReportSection
          title={t("overview.trendTitle")}
          description={t("overview.trendDescription")}
          action={
            <div
              className="inline-flex rounded-full border border-line bg-sand-50 p-1"
              role="group"
              aria-label={t("overview.chartMetric")}
            >
              {["netSales", "bookings"].map((metric) => (
                <button
                  key={metric}
                  type="button"
                  onClick={() => setChartMetric(metric)}
                  aria-pressed={chartMetric === metric}
                  className={cx(
                    "min-h-9 rounded-full px-3 text-[12px] font-semibold transition",
                    chartMetric === metric
                      ? "bg-white text-cobalt-700 shadow-xs"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {t(`overview.chartMetrics.${metric}`)}
                </button>
              ))}
            </div>
          }
        >
          <div className="p-4 sm:p-6">
            <TrendChart
              series={report.timeSeries}
              metric={chartMetric}
              title={t(`overview.chartMetrics.${chartMetric}`)}
              description={t("overview.chartAccessibleDescription", {
                metric: t(`overview.chartMetrics.${chartMetric}`),
              })}
              emptyLabel={t("common.noTrendData")}
              unavailableLabel={t("common.unavailable")}
              dateLabel={t("common.date")}
              valueFormatter={chartFormatter}
              locale={locale}
            />
          </div>
        </ReportSection>

        <AiBriefingPanel
          t={t}
          aiAccess={aiAccess}
          briefing={briefing}
          error={briefingError}
          isLoading={briefingLoading}
          onGenerate={onGenerateBriefing}
          deterministicInsights={deterministicInsights}
          locale={locale}
          timeZone={report.metadata.timezone}
        />
      </div>

      {deterministicInsights.length > 0 ? (
        <ReportSection
          title={t("insights.title")}
          description={t("insights.description")}
        >
          <InsightList
            insights={deterministicInsights}
            emptyLabel={t("insights.empty")}
          />
        </ReportSection>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {sales && Array.isArray(sales.topProducts) ? (
          <ReportSection
            title={t("overview.topProducts")}
            description={t("overview.topProductsDescription")}
          >
            <RankedList
              items={sales.topProducts}
              getKey={(item, index) =>
                item.productId || `${item.name}-${index}`
              }
              getLabel={(item) => item.name || t("common.unnamed")}
              getValue={(item) =>
                formatReportMoney(
                  item.netSalesMinor,
                  sales.currency || currency,
                  locale,
                  t("common.unavailable"),
                )
              }
              emptyLabel={t("overview.noProducts")}
            />
          </ReportSection>
        ) : null}

        {bookings && Array.isArray(bookings.courseFill) ? (
          <ReportSection
            title={t("overview.coursePerformance")}
            description={t("overview.coursePerformanceDescription")}
          >
            <RankedList
              items={bookings.courseFill}
              getKey={(item, index) =>
                item.productId || `${item.name}-${index}`
              }
              getLabel={(item) => item.name || t("common.unnamed")}
              getValue={(item) =>
                formatReportPercent(
                  item.fillPercent,
                  locale,
                  t("common.unavailable"),
                )
              }
              emptyLabel={t("overview.noCourses")}
            />
          </ReportSection>
        ) : null}
      </div>
    </div>
  );
}

function AiBriefingPanel({
  t,
  aiAccess,
  briefing,
  error,
  isLoading,
  onGenerate,
  deterministicInsights,
  locale,
  timeZone,
}) {
  const aiInsights = briefing
    ? normalizeReportInsights({
        highlights: briefing.highlights,
        attention: briefing.attention,
        recommendations: briefing.recommendations,
      })
    : [];

  return (
    <ReportSection
      className="overflow-hidden"
      title={t("ai.title")}
      description={t("ai.description")}
      action={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-700">
          <SparklesIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      }
    >
      <div className="p-5">
        {aiAccess.isLoading ? (
          <div
            className="flex min-h-32 items-center justify-center"
            role="status"
          >
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
            <span className="sr-only">{t("ai.checking")}</span>
          </div>
        ) : aiAccess.available ? (
          <>
            {briefing ? (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cobalt-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cobalt-700">
                    {briefing.usedFallback
                      ? t("ai.deterministicFallback")
                      : t("ai.generated")}
                  </span>
                  {briefing.generatedAt ? (
                    <span className="text-[10px] text-ink-subtle">
                      {formatReportDateTime(
                        briefing.generatedAt,
                        locale,
                        timeZone,
                      )}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-4 font-sans text-xl leading-7 text-ink">
                  {briefing.headline}
                </h3>
                <p className="mt-2 text-[12px] leading-5 text-ink-muted">
                  {briefing.summary}
                </p>
                <div className="-mx-5 mt-4 border-t border-line">
                  <InsightList
                    insights={aiInsights}
                    emptyLabel={t("ai.noInsights")}
                  />
                </div>
                <Limitations
                  items={briefing.dataLimitations}
                  title={t("coverage.limitations")}
                />
              </div>
            ) : (
              <div className="rounded-[18px] border border-line bg-sand-50 p-5">
                <p className="text-[12px] leading-5 text-ink-muted">
                  {t("ai.ready")}
                </p>
              </div>
            )}

            {error ? (
              <p
                className="mt-3 rounded-[12px] bg-danger-soft px-3 py-2 text-[12px] leading-5 text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={onGenerate}
              disabled={isLoading}
              className={cx(primaryButtonClass, "mt-4 w-full")}
            >
              <ArrowPathIcon
                className={cx("h-4 w-4", isLoading && "animate-spin")}
                aria-hidden="true"
              />
              {briefing ? t("ai.refresh") : t("ai.generate")}
            </button>
          </>
        ) : (
          <div>
            <div className="rounded-[18px] border border-line bg-sand-50 p-4">
              <p className="text-[12px] font-semibold text-ink">
                {aiAccess.moduleEnabled
                  ? t("ai.unavailableTitle")
                  : t("ai.optionalTitle")}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-ink-muted">
                {aiAccess.moduleEnabled
                  ? t("ai.unavailableDescription")
                  : t("ai.optionalDescription")}
              </p>
            </div>
            {deterministicInsights.length > 0 ? (
              <div className="-mx-5 mt-4 border-t border-line">
                <InsightList
                  insights={deterministicInsights.slice(0, 3)}
                  emptyLabel={t("insights.empty")}
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </ReportSection>
  );
}

function SalesTab({ sales, locale, currency, t }) {
  if (!sales) {
    return (
      <UnavailableState
        title={t("sales.unavailable")}
        description={t("sales.unavailableDescription")}
      />
    );
  }

  const reportCurrency = sales.currency || currency;
  const money = (value, rowCurrency = reportCurrency) =>
    formatReportMoney(value, rowCurrency, locale, t("common.unavailable"));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMetric
          label={t("sales.metrics.gross")}
          value={sales.grossSalesMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.net")}
          value={sales.netSalesMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.tax")}
          value={sales.taxMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.discounts")}
          value={sales.discountsMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.refunds")}
          value={sales.refundsMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.paymentFees")}
          value={sales.paymentFeesMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.orders")}
          value={sales.orders}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("sales.metrics.averageOrder")}
          value={sales.averageOrderValueMinor}
          formatter={(value) => money(value)}
          unavailableLabel={t("common.unavailable")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ReportSection title={t("sales.paymentMethods")}>
          <DataTable
            caption={t("sales.paymentMethods")}
            rows={sales.paymentMethods}
            getRowKey={(row, index) => `${row.method}-${index}`}
            emptyLabel={t("sales.noPaymentMethods")}
            columns={[
              {
                key: "method",
                label: t("sales.table.method"),
                render: (row) => humanize(row.method),
              },
              {
                key: "amount",
                label: t("sales.table.amount"),
                align: "right",
                render: (row) => money(row.amountMinor),
              },
            ]}
          />
        </ReportSection>

        <ReportSection title={t("sales.currencyTotals")}>
          <DataTable
            caption={t("sales.currencyTotals")}
            rows={sales.totalsByCurrency}
            getRowKey={(row, index) => `${row.currency}-${index}`}
            emptyLabel={t("sales.noCurrencyTotals")}
            columns={[
              {
                key: "currency",
                label: t("sales.table.currency"),
                render: (row) => row.currency,
              },
              {
                key: "net",
                label: t("sales.table.net"),
                align: "right",
                render: (row) => money(row.netSalesMinor, row.currency),
              },
              {
                key: "orders",
                label: t("sales.table.orders"),
                align: "right",
                render: (row) =>
                  formatReportNumber(
                    row.orders,
                    locale,
                    t("common.unavailable"),
                  ),
              },
            ]}
          />
        </ReportSection>
      </div>

      <ReportSection title={t("sales.topProducts")}>
        {Array.isArray(sales.topProducts) ? (
          <DataTable
            caption={t("sales.topProducts")}
            rows={sales.topProducts}
            getRowKey={(row, index) => row.productId || `${row.name}-${index}`}
            emptyLabel={t("overview.noProducts")}
            columns={[
              {
                key: "product",
                label: t("sales.table.product"),
                render: (row) => row.name || t("common.unnamed"),
              },
              {
                key: "quantity",
                label: t("sales.table.quantity"),
                align: "right",
                render: (row) =>
                  formatReportNumber(
                    row.quantity,
                    locale,
                    t("common.unavailable"),
                  ),
              },
              {
                key: "gross",
                label: t("sales.table.gross"),
                align: "right",
                render: (row) => money(row.grossSalesMinor),
              },
              {
                key: "net",
                label: t("sales.table.net"),
                align: "right",
                render: (row) => money(row.netSalesMinor),
              },
            ]}
          />
        ) : (
          <div className="p-5">
            <UnavailableState
              title={t("sales.topProductsUnavailable")}
              description={t("sales.topProductsUnavailableDescription")}
              compact
            />
          </div>
        )}
        <Limitations
          items={sales.limitations}
          title={t("coverage.limitations")}
        />
      </ReportSection>
    </div>
  );
}

function BookingsTab({ bookings, locale, t }) {
  if (!bookings) {
    return (
      <UnavailableState
        title={t("bookings.unavailable")}
        description={t("bookings.unavailableDescription")}
      />
    );
  }

  const weekdayLabel = (value) => {
    const normalized = String(value || "").toLowerCase();
    const key = WEEKDAY_KEYS[normalized] || WEEKDAY_KEYS[value];
    return key ? t(`weekdays.${key}`) : humanize(value);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMetric
          label={t("bookings.metrics.total")}
          value={bookings.total}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("bookings.metrics.participants")}
          value={bookings.participants}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("bookings.metrics.cancellations")}
          value={bookings.cancellations}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("bookings.metrics.noShows")}
          value={bookings.noShows}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("bookings.metrics.bookedHours")}
          value={bookings.bookedHours}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("bookings.metrics.utilization")}
          value={bookings.utilizationPercent}
          formatter={(value) => formatReportPercent(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <ReportSection
          title={t("bookings.heatmap")}
          description={t("bookings.heatmapDescription")}
        >
          <div className="p-4 sm:p-5">
            <BookingHeatmap
              rows={bookings.heatmap}
              title={t("bookings.heatmap")}
              timeLabel={t("common.time")}
              weekdayLabel={weekdayLabel}
              unavailableLabel={t("common.unavailable")}
              percentFormatter={(value) =>
                formatReportPercent(value, locale, t("common.unavailable"))
              }
            />
          </div>
        </ReportSection>

        <ReportSection title={t("bookings.typeBreakdown")}>
          <DataTable
            caption={t("bookings.typeBreakdown")}
            rows={bookings.bookingTypes}
            getRowKey={(row, index) => `${row.type}-${index}`}
            emptyLabel={t("bookings.noTypes")}
            columns={[
              {
                key: "type",
                label: t("bookings.table.type"),
                render: (row) => humanize(row.type),
              },
              {
                key: "bookings",
                label: t("bookings.table.bookings"),
                align: "right",
                render: (row) =>
                  formatReportNumber(
                    row.count,
                    locale,
                    t("common.unavailable"),
                  ),
              },
              {
                key: "participants",
                label: t("bookings.table.participants"),
                align: "right",
                render: (row) =>
                  formatReportNumber(
                    row.participants,
                    locale,
                    t("common.unavailable"),
                  ),
              },
            ]}
          />
        </ReportSection>
      </div>

      <ReportSection title={t("bookings.courseFill")}>
        {Array.isArray(bookings.courseFill) ? (
          <DataTable
            caption={t("bookings.courseFill")}
            rows={bookings.courseFill}
            getRowKey={(row, index) => row.productId || `${row.name}-${index}`}
            emptyLabel={t("overview.noCourses")}
            columns={[
              {
                key: "course",
                label: t("bookings.table.course"),
                render: (row) => row.name || t("common.unnamed"),
              },
              {
                key: "sessions",
                label: t("bookings.table.sessions"),
                align: "right",
                render: (row) =>
                  formatReportNumber(
                    row.sessions,
                    locale,
                    t("common.unavailable"),
                  ),
              },
              {
                key: "seats",
                label: t("bookings.table.seats"),
                align: "right",
                render: (row) =>
                  isFiniteReportNumber(row.bookedSeats) &&
                  isFiniteReportNumber(row.capacity)
                    ? `${formatReportNumber(row.bookedSeats, locale)} / ${formatReportNumber(
                        row.capacity,
                        locale,
                      )}`
                    : t("common.unavailable"),
              },
              {
                key: "fill",
                label: t("bookings.table.fill"),
                align: "right",
                render: (row) =>
                  formatReportPercent(
                    row.fillPercent,
                    locale,
                    t("common.unavailable"),
                  ),
              },
            ]}
          />
        ) : (
          <div className="p-5">
            <UnavailableState
              title={t("bookings.courseFillUnavailable")}
              description={t("bookings.courseFillUnavailableDescription")}
              compact
            />
          </div>
        )}
        <Limitations
          items={bookings.limitations}
          title={t("coverage.limitations")}
        />
      </ReportSection>
    </div>
  );
}

function CustomersTab({ customers, locale, currency, t }) {
  if (!customers) {
    return (
      <UnavailableState
        title={t("customers.unavailable")}
        description={t("customers.unavailableDescription")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CompactMetric
          label={t("customers.metrics.unique")}
          value={customers.active}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("customers.metrics.new")}
          value={customers.new}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("customers.metrics.returning")}
          value={customers.returning}
          formatter={(value) => formatReportNumber(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("customers.metrics.returningRate")}
          value={customers.returningRatePercent}
          formatter={(value) => formatReportPercent(value, locale)}
          unavailableLabel={t("common.unavailable")}
        />
        <CompactMetric
          label={t("customers.metrics.averageSpend")}
          value={customers.averageSpendMinor}
          formatter={(value) =>
            formatReportMoney(value, currency, locale, t("common.unavailable"))
          }
          unavailableLabel={t("common.unavailable")}
        />
      </div>

      <ReportSection
        title={t("customers.contextTitle")}
        description={t("customers.contextDescription")}
      >
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-[18px] border border-line bg-sand-50 p-5">
            <UserGroupIcon
              className="h-5 w-5 text-cobalt-600"
              aria-hidden="true"
            />
            <p className="mt-4 text-[12px] font-semibold text-ink">
              {t("customers.newVsReturning")}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-ink-muted">
              {t("customers.newVsReturningDescription")}
            </p>
          </div>
          <div className="rounded-[18px] border border-line bg-sand-50 p-5">
            <BanknotesIcon
              className="h-5 w-5 text-cobalt-600"
              aria-hidden="true"
            />
            <p className="mt-4 text-[12px] font-semibold text-ink">
              {t("customers.spendTitle")}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-ink-muted">
              {t("customers.spendDescription")}
            </p>
          </div>
        </div>
        <Limitations
          items={customers.limitations}
          title={t("coverage.limitations")}
        />
      </ReportSection>
    </div>
  );
}

function OperationCard({
  icon: Icon,
  title,
  children,
  limitations,
  limitationsTitle,
  snapshot,
}) {
  return (
    <ReportSection
      title={title}
      action={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sand-50 text-cobalt-600">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      }
    >
      {snapshot ? (
        <p className="border-b border-line bg-cobalt-50/55 px-5 py-2.5 text-[10px] font-medium text-cobalt-700">
          {snapshot}
        </p>
      ) : null}
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">{children}</div>
      <Limitations items={limitations} title={limitationsTitle} />
    </ReportSection>
  );
}

function UnitBreakdown({ title, rows, locale, emptyLabel, unavailableLabel }) {
  return (
    <div className="sm:col-span-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {title}
      </p>
      {Array.isArray(rows) ? (
        rows.length > 0 ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {rows.map((row, index) => (
              <div
                key={`${row.unit}-${index}`}
                className="flex items-center justify-between rounded-[13px] border border-line bg-sand-50/55 px-3 py-2.5"
              >
                <span className="text-[12px] font-medium text-ink">
                  {humanize(row.unit)}
                </span>
                <span className="text-[12px] font-semibold text-ink">
                  {formatReportNumber(row.quantity, locale, unavailableLabel)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[12px] text-ink-muted">{emptyLabel}</p>
        )
      ) : (
        <p className="mt-2 text-[12px] text-ink-subtle">{unavailableLabel}</p>
      )}
    </div>
  );
}

function OperationsTab({ operations, locale, currency, timeZone, t }) {
  const sections = getOperationSections(operations);
  const snapshot = (asOf) =>
    t("operations.snapshot", {
      time: formatReportDateTime(asOf, locale, timeZone),
    });

  if (sections.length === 0) {
    return (
      <UnavailableState
        title={t("operations.unavailable")}
        description={t("operations.unavailableDescription")}
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {operations.inventory ? (
        <OperationCard
          icon={CubeIcon}
          title={t("operations.inventory.title")}
          limitations={operations.inventory.limitations}
          limitationsTitle={t("coverage.limitations")}
          snapshot={snapshot(operations.inventory.asOf)}
        >
          {[
            ["openReorders", operations.inventory.openReorders],
            ["lowStockItems", operations.inventory.lowStockItems],
          ].map(([key, value]) => (
            <CompactMetric
              key={key}
              label={t(`operations.inventory.${key}`)}
              value={value}
              formatter={(metricValue) =>
                formatReportNumber(metricValue, locale)
              }
              unavailableLabel={t("common.unavailable")}
            />
          ))}
          <CompactMetric
            label={t("operations.inventory.purchaseCostWithoutVat")}
            value={operations.inventory.purchaseCostWithoutVatMinor}
            formatter={(value) =>
              formatReportMoney(
                value,
                currency,
                locale,
                t("common.unavailable"),
              )
            }
            unavailableLabel={t("common.unavailable")}
          />
          <UnitBreakdown
            title={t("operations.inventory.consumptionByUnit")}
            rows={operations.inventory.consumptionByUnit}
            locale={locale}
            emptyLabel={t("operations.inventory.noConsumption")}
            unavailableLabel={t("common.unavailable")}
          />
          <UnitBreakdown
            title={t("operations.inventory.purchasesByUnit")}
            rows={operations.inventory.purchasesByUnit}
            locale={locale}
            emptyLabel={t("operations.inventory.noPurchases")}
            unavailableLabel={t("common.unavailable")}
          />
          <UnitBreakdown
            title={t("operations.inventory.stocktakeDifferenceByUnit")}
            rows={operations.inventory.stocktakeDifferenceByUnit}
            locale={locale}
            emptyLabel={t("operations.inventory.noStocktakeDifferences")}
            unavailableLabel={t("common.unavailable")}
          />
        </OperationCard>
      ) : null}

      {operations.staffTasks ? (
        <OperationCard
          icon={ClipboardDocumentCheckIcon}
          title={t("operations.staff.title")}
          limitations={operations.staffTasks.limitations}
          limitationsTitle={t("coverage.limitations")}
          snapshot={snapshot(operations.staffTasks.asOf)}
        >
          {[
            ["completed", operations.staffTasks.completed, "number"],
            ["open", operations.staffTasks.open, "number"],
            ["overdue", operations.staffTasks.overdue, "number"],
            [
              "completionRatePercent",
              operations.staffTasks.completionRatePercent,
              "percent",
            ],
          ].map(([key, value, format]) => (
            <CompactMetric
              key={key}
              label={t(`operations.staff.${key}`)}
              value={value}
              formatter={(metricValue) =>
                format === "percent"
                  ? formatReportPercent(metricValue, locale)
                  : formatReportNumber(metricValue, locale)
              }
              unavailableLabel={t("common.unavailable")}
            />
          ))}
        </OperationCard>
      ) : null}
    </div>
  );
}

function CoveragePanel({ coverage, metadata, locale, t }) {
  const unavailable = coverage.unavailable;
  const sourceLabel = (source) => {
    const key = COVERAGE_SOURCE_KEYS[source];
    return key ? t(`coverage.sources.${key}`) : humanize(source);
  };
  const reasonLabel = (reason) => {
    const key = COVERAGE_REASON_KEYS[reason];
    return key ? t(`coverage.reasons.${key}`) : humanize(reason);
  };

  return (
    <ReportSection
      title={t("coverage.title")}
      description={t("coverage.description")}
      action={
        <CoverageBadge
          complete={coverage.complete}
          completeLabel={t("coverage.complete")}
          limitedLabel={t("coverage.limited")}
        />
      }
    >
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
            {t("coverage.available")}
          </p>
          {coverage.available.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {coverage.available.map((source) => (
                <span
                  key={source}
                  className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1.5 text-[10px] font-semibold text-success"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {sourceLabel(source)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-ink-muted">
              {t("coverage.noneAvailable")}
            </p>
          )}

          {unavailable.length > 0 ? (
            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
                {t("coverage.unavailable")}
              </p>
              <ul className="mt-2 space-y-2">
                {unavailable.map((item, index) => (
                  <li
                    key={`${item.source}-${index}`}
                    className="rounded-[12px] border border-line bg-sand-50 px-3 py-2 text-[12px] leading-5 text-ink-muted"
                  >
                    <span className="font-semibold text-ink">
                      {sourceLabel(item.source)}
                    </span>
                    {item.reason ? ` — ${reasonLabel(item.reason)}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <dl className="rounded-[18px] border border-line bg-sand-50 p-4">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {t("coverage.period")}
            </dt>
            <dd className="mt-1 text-[12px] font-medium text-ink">
              {`${formatReportDate(metadata.period?.from, locale)} – ${formatReportDate(
                metadata.period?.to,
                locale,
              )}`}
            </dd>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {t("coverage.timezone")}
            </dt>
            <dd className="mt-1 text-[12px] font-medium text-ink">
              {metadata.timezone || t("common.unavailable")}
            </dd>
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {t("coverage.generated")}
            </dt>
            <dd className="mt-1 text-[12px] font-medium text-ink">
              {formatReportDateTime(
                metadata.generatedAt,
                locale,
                metadata.timezone,
              )}
            </dd>
          </div>
        </dl>
      </div>
      <Limitations
        items={coverage.limitations}
        title={t("coverage.limitations")}
      />
    </ReportSection>
  );
}

export default function StatisticsPage({ showPageHeader = false }) {
  const t = useTranslations("Reports");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const activeStudioId = useSelector(selectActiveStudioId);
  const canExport = hasPermission(workspaceAccess, PERMISSIONS.REPORTS_EXPORT);
  const baseAiAccess = useAiAccess({ feature: "reportInsights" });
  const aiAccess = {
    ...baseAiAccess,
    available:
      baseAiAccess.available &&
      explicitAiCapabilityEnabled(baseAiAccess.capabilities),
  };
  const locationsQuery = useGetLocationsQuery({ isActive: true, limit: 100 });
  const locationAccess = useMemo(
    () => normalizeLocationAccess(workspaceAccess),
    [workspaceAccess],
  );
  const locations = useMemo(() => {
    const normalized = normalizeLocationsResponse(locationsQuery.data).filter(
      (location) => location.isActive !== false,
    );

    if (locationAccess.mode !== "selected") return normalized;

    return normalized.filter((location) => locationAccess.ids.has(location.id));
  }, [locationAccess.ids, locationAccess.mode, locationsQuery.data]);

  const defaultPreset = REPORT_DATE_PRESETS.includes(searchParams.get("period"))
    ? searchParams.get("period")
    : "thisMonth";
  const reportingTimeZone = currentTenant?.settings?.timezone;
  const defaultRange = getReportDateRange(
    defaultPreset,
    new Date(),
    reportingTimeZone,
  );
  const requestedLocationId = searchParams.get("locationId") || "";
  const activeLocationIsAllowed =
    locationAccess.mode !== "selected" ||
    locationAccess.ids.has(String(activeStudioId || ""));
  const requestedLocationIsAllowed =
    locationAccess.mode !== "selected" ||
    locationAccess.ids.has(requestedLocationId);
  const initialLocationId =
    requestedLocationId && requestedLocationIsAllowed
      ? requestedLocationId
      : activeLocationIsAllowed
        ? activeStudioId || ""
        : "";
  const capabilityKey = `${currentTenant?.id || currentTenant?._id || ""}:${currentTenant?.plan || ""}:${currentTenant?.planVersion || ""}`;
  const [consolidatedAccess, setConsolidatedAccess] = useState({
    key: "",
    allowed: false,
  });
  const canConsolidate =
    consolidatedAccess.key === capabilityKey && consolidatedAccess.allowed;
  const [filters, setFilters] = useState(() => ({
    preset: defaultPreset,
    from: searchParams.get("from") || defaultRange.from,
    to: searchParams.get("to") || defaultRange.to,
    locationId: initialLocationId,
    scope:
      searchParams.get("locationScope") === "all" ||
      requestedLocationId === "all"
        ? "all"
        : "location",
    compare: searchParams.get("compare") !== "false",
    granularity: REPORT_GRANULARITIES.includes(searchParams.get("granularity"))
      ? searchParams.get("granularity")
      : "auto",
  }));
  const [requestedTab, setRequestedTab] = useState(() => {
    const value = searchParams.get("reportTab");
    return REPORT_TABS.includes(value) ? value : "overview";
  });
  const [chartNotice, setChartNotice] = useState(null);
  const [briefingResult, setBriefingResult] = useState({
    filterKey: "",
    data: null,
    error: "",
  });

  const invalidDates =
    !filters.from || !filters.to || filters.from > filters.to;
  const locationsResolved =
    !locationsQuery.isLoading && !locationsQuery.isError;
  const fallbackLocationId = locations.some(
    (location) => location.id === activeStudioId,
  )
    ? activeStudioId
    : locations[0]?.id || "";
  const selectedReportLocationId = locations.some(
    (location) => location.id === filters.locationId,
  )
    ? filters.locationId
    : fallbackLocationId;
  const allLocationsSelected = filters.scope === "all" && canConsolidate;
  const effectiveLocationId = allLocationsSelected
    ? ""
    : selectedReportLocationId;
  const canRequestReport =
    locationsResolved && Boolean(selectedReportLocationId) && !invalidDates;
  const queryFilters = {
    from: filters.from,
    to: filters.to,
    ...(effectiveLocationId ? { locationId: effectiveLocationId } : {}),
    compare: filters.compare,
    granularity: filters.granularity,
    locale,
  };
  const reportFilterKey = JSON.stringify(queryFilters);
  const reportQuery = useGetReportsOverviewQuery(queryFilters, {
    skip: !canRequestReport,
  });
  const reportResponse =
    canRequestReport && !reportQuery.isError
      ? (reportQuery.currentData ??
        (!reportQuery.isFetching ? reportQuery.data : undefined))
      : undefined;
  const report = useMemo(
    () => normalizeReportOverview(reportResponse),
    [reportResponse],
  );
  const scopeDenied =
    (reportQuery.error?.data?.code || reportQuery.error?.data?.error?.code) ===
    "CONSOLIDATED_REPORTING_NOT_ENTITLED";
  useEffect(() => {
    const allowed = report.metadata.consolidatedLocations;
    if (scopeDenied || typeof allowed === "boolean") {
      setConsolidatedAccess((previous) => {
        const denied =
          scopeDenied ||
          (previous.key === capabilityKey && previous.denied === true);
        const nextAllowed = !denied && allowed === true;
        return previous.key === capabilityKey &&
          previous.allowed === nextAllowed &&
          previous.denied === denied
          ? previous
          : { key: capabilityKey, allowed: nextAllowed, denied };
      });
    }
  }, [capabilityKey, report.metadata.consolidatedLocations, scopeDenied]);

  // A saved URL must never silently broaden an unavailable location into a
  // consolidated query. Normalize it only after authorized locations resolve.
  useEffect(() => {
    if (!locationsResolved || !selectedReportLocationId) return;
    const invalidLocation =
      requestedLocationId &&
      !locations.some((location) => location.id === requestedLocationId);
    const requestsAll =
      filters.scope === "all" ||
      searchParams.get("locationScope") === "all" ||
      requestedLocationId === "all";
    const deniedAll =
      requestsAll &&
      (scopeDenied ||
        (consolidatedAccess.key === capabilityKey &&
          !consolidatedAccess.allowed));
    if (!invalidLocation && !deniedAll) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("locationId", selectedReportLocationId);
    if (deniedAll || requestedLocationId === "all")
      params.delete("locationScope");
    router.replace(`?${params.toString()}`, { scroll: false });
    if (deniedAll)
      setFilters((previous) =>
        previous.scope === "all"
          ? { ...previous, scope: "location" }
          : previous,
      );
  }, [
    locationsResolved,
    selectedReportLocationId,
    requestedLocationId,
    locations,
    filters.scope,
    scopeDenied,
    consolidatedAccess.key,
    consolidatedAccess.allowed,
    capabilityKey,
    router,
    searchParams,
  ]);

  const [exportReportsCsv, exportState] = useExportReportsCsvMutation();
  const [generateBriefing, briefingState] =
    useGenerateReportsBriefingMutation();
  const currency =
    report.metadata.currency ||
    currentTenant?.settings?.currency ||
    DEFAULT_STUDIO_COMMERCE_CURRENCY;
  const operationSections = getOperationSections(report.operations);
  const visibleTabs = [
    "overview",
    ...(report.sales ? ["sales"] : []),
    ...(report.bookings ? ["bookings"] : []),
    ...(report.customers ? ["customers"] : []),
    ...(operationSections.length > 0 ? ["operations"] : []),
  ];
  const activeTab = visibleTabs.includes(requestedTab)
    ? requestedTab
    : "overview";
  const briefingReportKey = `${reportFilterKey}:${report.metadata.generatedAt || ""}`;
  const briefing =
    briefingResult.filterKey === briefingReportKey ? briefingResult.data : null;
  const briefingError =
    briefingResult.filterKey === briefingReportKey ? briefingResult.error : "";

  const syncUrl = (nextFilters, nextTab = requestedTab) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextAll = nextFilters.scope === "all" && canConsolidate;
    const nextLocationId = nextAll
      ? ""
      : locations.some((location) => location.id === nextFilters.locationId)
        ? nextFilters.locationId
        : fallbackLocationId;
    if (nextAll) params.set("locationScope", "all");
    else params.delete("locationScope");
    params.set("period", nextFilters.preset);
    params.set("from", nextFilters.from);
    params.set("to", nextFilters.to);
    params.set("compare", String(nextFilters.compare));
    params.set("granularity", nextFilters.granularity);
    params.set("reportTab", nextTab);
    if (nextLocationId) {
      params.set("locationId", nextLocationId);
    } else {
      params.delete("locationId");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const updateFilters = (update) => {
    const next = { ...filters, ...update };
    setFilters(next);
    setChartNotice(null);
    syncUrl(next);
  };

  const changePreset = (preset) => {
    if (preset === "custom") {
      updateFilters({ preset });
      return;
    }

    updateFilters({
      preset,
      ...getReportDateRange(preset, new Date(), reportingTimeZone),
    });
  };

  const changeTab = (tab) => {
    setRequestedTab(tab);
    syncUrl(filters, tab);
  };

  const handleExport = async () => {
    if (!canRequestReport) return;
    setChartNotice(null);

    try {
      const payload = await exportReportsCsv(queryFilters).unwrap();
      if (!isCsvDownloadPayload(payload)) {
        throw new Error(t("export.invalidResponse"));
      }
      downloadCsvFile(payload);
      setChartNotice({ tone: "success", message: t("export.success") });
    } catch (error) {
      setChartNotice({
        tone: "error",
        message: getReportErrorMessage(error, t("export.error")),
      });
    }
  };

  const handleGenerateBriefing = async () => {
    if (!canRequestReport) return;
    setBriefingResult({
      filterKey: briefingReportKey,
      data: null,
      error: "",
    });

    try {
      const result = await generateBriefing({
        ...queryFilters,
        locale,
      }).unwrap();
      setBriefingResult({
        filterKey: briefingReportKey,
        data: result,
        error: "",
      });
    } catch (error) {
      setBriefingResult({
        filterKey: briefingReportKey,
        data: null,
        error: getReportErrorMessage(error, t("ai.error")),
      });
    }
  };

  const showInitialLoading =
    !invalidDates &&
    (locationsQuery.isLoading ||
      reportQuery.isLoading ||
      (reportQuery.isFetching && reportResponse === undefined));

  return (
    <section className="min-h-screen bg-canvas px-4 py-6 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <header className="rounded-[26px] border border-line bg-white p-4 shadow-card sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              {showPageHeader ? (
                <h1 className="font-sans text-2xl tracking-[-0.025em] text-ink sm:text-[29px]">
                  {t("title")}
                </h1>
              ) : null}
              {report.metadata.period ? (
                <p
                  className={cx(
                    "text-[10px] text-ink-muted",
                    showPageHeader && "mt-1.5",
                  )}
                >
                  {`${formatReportDate(
                    report.metadata.period.from,
                    locale,
                  )} – ${formatReportDate(report.metadata.period.to, locale)}`}
                  {report.metadata.timezone
                    ? ` · ${report.metadata.timezone}`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBriefingResult({
                    filterKey: "",
                    data: null,
                    error: "",
                  });
                  reportQuery.refetch();
                }}
                disabled={!canRequestReport || reportQuery.isFetching}
                className={secondaryButtonClass}
                aria-label={t("actions.refresh")}
              >
                <ArrowPathIcon
                  className={cx(
                    "h-4 w-4",
                    reportQuery.isFetching && "animate-spin",
                  )}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{t("actions.refresh")}</span>
              </button>
              {canExport ? (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!canRequestReport || exportState.isLoading}
                  className={primaryButtonClass}
                >
                  {exportState.isLoading ? (
                    <ArrowPathIcon
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  {t("actions.export")}
                </button>
              ) : null}
            </div>
          </div>

          <div
            data-contextual-guide-target="report-filters"
            className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1fr_1.35fr_1fr_0.9fr_auto]"
          >
            <FilterField label={t("filters.period")}>
              <select
                value={filters.preset}
                onChange={(event) => changePreset(event.target.value)}
                className={controlClass}
              >
                {REPORT_DATE_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {t(`filters.presets.${preset}`)}
                  </option>
                ))}
              </select>
            </FilterField>

            <div className="grid grid-cols-2 gap-2">
              <FilterField label={t("filters.from")}>
                <input
                  type="date"
                  value={filters.from}
                  max={filters.to || undefined}
                  onChange={(event) =>
                    updateFilters({
                      from: event.target.value,
                      preset: "custom",
                    })
                  }
                  className={controlClass}
                />
              </FilterField>
              <FilterField label={t("filters.to")}>
                <input
                  type="date"
                  value={filters.to}
                  min={filters.from || undefined}
                  onChange={(event) =>
                    updateFilters({
                      to: event.target.value,
                      preset: "custom",
                    })
                  }
                  className={controlClass}
                />
              </FilterField>
            </div>

            <FilterField label={t("filters.location")}>
              <select
                value={effectiveLocationId}
                onChange={(event) =>
                  updateFilters({
                    locationId: event.target.value,
                    scope: event.target.value ? "location" : "all",
                  })
                }
                disabled={!locationsResolved || !locations.length}
                className={controlClass}
              >
                {canConsolidate ? (
                  <option value="">
                    {t("filters.allAccessibleLocations")}
                  </option>
                ) : !selectedReportLocationId ? (
                  <option value="">{t("filters.chooseLocation")}</option>
                ) : null}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                    {location.id === activeStudioId
                      ? ` · ${t("filters.active")}`
                      : ""}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label={t("filters.granularity")}>
              <select
                value={filters.granularity}
                onChange={(event) =>
                  updateFilters({ granularity: event.target.value })
                }
                className={controlClass}
              >
                {REPORT_GRANULARITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`filters.granularities.${value}`)}
                  </option>
                ))}
              </select>
            </FilterField>

            <div>
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
                {t("filters.comparison")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={filters.compare}
                onClick={() => updateFilters({ compare: !filters.compare })}
                className={cx(
                  "flex h-11 w-full min-w-[126px] items-center justify-between gap-3 rounded-[13px] border px-3.5 text-[12px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300",
                  filters.compare
                    ? "border-cobalt-200 bg-cobalt-50 text-cobalt-700"
                    : "border-line bg-white text-ink-muted",
                )}
              >
                {filters.compare ? t("common.on") : t("common.off")}
                <span
                  className={cx(
                    "relative h-5 w-9 rounded-full transition",
                    filters.compare ? "bg-cobalt-500" : "bg-line-strong",
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cx(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition",
                      filters.compare ? "left-[18px]" : "left-0.5",
                    )}
                  />
                </span>
              </button>
            </div>
          </div>

          {consolidatedAccess.key === capabilityKey &&
          !canConsolidate &&
          locations.length > 1 ? (
            <p className="mt-3 text-xs text-ink-muted">
              {t("filters.singleLocationOnly")}
            </p>
          ) : null}

          {invalidDates ? (
            <p
              className="mt-3 rounded-[12px] bg-danger-soft px-3 py-2 text-[12px] text-danger"
              role="alert"
            >
              {t("filters.invalidDates")}
            </p>
          ) : null}

          {chartNotice ? (
            <p
              className={cx(
                "mt-3 rounded-[12px] px-3 py-2 text-[12px]",
                chartNotice.tone === "success"
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger",
              )}
              role={chartNotice.tone === "error" ? "alert" : "status"}
            >
              {chartNotice.message}
            </p>
          ) : null}
        </header>

        {showInitialLoading ? (
          <div className="mt-5">
            <LoadingReport label={t("common.loading")} />
          </div>
        ) : locationsQuery.isError ? (
          <div className="mt-5">
            <ReportError
              title={t("error.title")}
              description={t("filters.locationRequired")}
              retryLabel={t("actions.retry")}
              onRetry={() => locationsQuery.refetch()}
            />
          </div>
        ) : !selectedReportLocationId ? (
          <p className="mt-5 text-sm text-ink-muted" role="status">
            {t("filters.locationRequired")}
          </p>
        ) : reportQuery.isError && !scopeDenied ? (
          <div className="mt-5">
            <ReportError
              title={t("error.title")}
              description={getReportErrorMessage(
                reportQuery.error,
                t("error.description"),
              )}
              retryLabel={t("actions.retry")}
              onRetry={() => reportQuery.refetch()}
            />
          </div>
        ) : invalidDates ? null : (
          <>
            <WorkspaceTabs
              id={REPORT_TABS_ID}
              className="mt-5"
              tabs={visibleTabs.map((tab) => ({
                id: tab,
                label: t(`tabs.${tab}`),
                icon: REPORT_TAB_ICONS[tab],
              }))}
              value={activeTab}
              onChange={changeTab}
              ariaLabel={t("tabs.label")}
            />

            <WorkspaceTabPanel
              data-contextual-guide-target="report-content"
              tabsId={REPORT_TABS_ID}
              tabId={activeTab}
              className={cx(
                "mt-5 transition-opacity",
                reportQuery.isFetching && "opacity-55",
              )}
              aria-busy={reportQuery.isFetching}
            >
              {activeTab === "overview" ? (
                <OverviewTab
                  report={report}
                  locale={locale}
                  currency={currency}
                  compare={filters.compare}
                  t={t}
                  aiAccess={aiAccess}
                  briefing={briefing}
                  briefingError={briefingError}
                  briefingLoading={briefingState.isLoading}
                  onGenerateBriefing={handleGenerateBriefing}
                />
              ) : null}
              {activeTab === "sales" ? (
                <SalesTab
                  sales={report.sales}
                  locale={locale}
                  currency={currency}
                  t={t}
                />
              ) : null}
              {activeTab === "bookings" ? (
                <BookingsTab bookings={report.bookings} locale={locale} t={t} />
              ) : null}
              {activeTab === "customers" ? (
                <CustomersTab
                  customers={report.customers}
                  locale={locale}
                  currency={currency}
                  t={t}
                />
              ) : null}
              {activeTab === "operations" ? (
                <OperationsTab
                  operations={report.operations}
                  locale={locale}
                  currency={currency}
                  timeZone={report.metadata.timezone}
                  t={t}
                />
              ) : null}
            </WorkspaceTabPanel>

            <div className="mt-5">
              <CoveragePanel
                coverage={report.coverage}
                metadata={report.metadata}
                locale={locale}
                t={t}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
