"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import TableLoadingState from "@/components/loaders/TableLoadingState";
import PeoplePagination from "@/components/tables/people/PeoplePagination";
import {
  useGetReportCustomersQuery,
  useExportReportCustomersCsvMutation,
} from "@/lib/features/reports/reportsApiSlice";
import { getStripeMinorUnitDigits } from "@/utils/money";
import { DataTable, ReportSection, ReportError } from "./ReportsPrimitives";
import {
  formatReportDate,
  formatReportMoney,
  formatReportNumber,
  getReportErrorMessage,
} from "./reports.utils";
import useReportDownload from "./useReportDownload";

const keys = [
  "spendMin",
  "spendMax",
  "spendFrom",
  "spendTo",
  "creditMin",
  "creditMax",
  "cancelledMin",
  "cancelledMax",
  "cancellationFrom",
  "cancellationTo",
  "cancellationActor",
  "inactiveDays",
];
const parameter = (key) => `customer${key[0].toUpperCase()}${key.slice(1)}`;
const readFilters = (params) =>
  Object.fromEntries(
    keys.map((key) => [
      key,
      params.get(parameter(key)) || (key === "cancellationActor" ? "all" : ""),
    ]),
  );
const inputClass =
  "h-10 w-full min-w-0 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-100 disabled:bg-sand-50 disabled:opacity-50";
const buttonClass =
  "min-h-10 rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink focus-visible:ring-2 focus-visible:ring-cobalt-500 disabled:opacity-40";

export const cancellationCountLabel = (row, locale, unavailable) => {
  if (
    typeof row.cancelledBookings === "number" &&
    Number.isFinite(row.cancelledBookings)
  )
    return formatReportNumber(row.cancelledBookings, locale, unavailable);
  return typeof row.recordedCancelledBookings === "number" &&
    row.recordedCancelledBookings > 0
    ? `${formatReportNumber(row.recordedCancelledBookings, locale)}+`
    : unavailable;
};

export const validCustomerReportFilters = (filters, report) => {
  for (const [low, high] of [
    ["spendMin", "spendMax"],
    ["creditMin", "creditMax"],
    ["cancelledMin", "cancelledMax"],
  ]) {
    if (
      [low, high].some(
        (key) =>
          filters[key] !== "" &&
          (!Number.isFinite(Number(filters[key])) || Number(filters[key]) < 0),
      )
    )
      return false;
    if (
      filters[low] !== "" &&
      filters[high] !== "" &&
      Number(filters[low]) > Number(filters[high])
    )
      return false;
  }
  if (
    ["cancelledMin", "cancelledMax", "inactiveDays"].some(
      (key) =>
        filters[key] !== "" &&
        (!Number.isInteger(Number(filters[key])) ||
          Number(filters[key]) < (key === "inactiveDays" ? 1 : 0)),
    )
  )
    return false;
  return (
    (filters.spendFrom || report.from) <= (filters.spendTo || report.to) &&
    (filters.cancellationFrom || report.from) <=
      (filters.cancellationTo || report.to)
  );
};

export default function ReportCustomers({
  reportFilters,
  currency,
  locale,
  canExport,
  enabled,
  refreshVersion = 0,
  searchParams: params,
  updateSearchParams,
  t,
}) {
  const people = useTranslations("People");
  const urlFilters = JSON.stringify(readFilters(params));
  const lastUrl = useRef(urlFilters);
  const [filters, setFilters] = useState(() => readFilters(params));
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [validationError, setValidationError] = useState(false);
  useEffect(() => {
    if (urlFilters === lastUrl.current) return;
    lastUrl.current = urlFilters;
    const next = JSON.parse(urlFilters);
    setDraft(next);
    setFilters(next);
    setPage(1);
    setValidationError(false);
  }, [urlFilters]);
  // Changing the global report period starts the same segment at its first page.
  useEffect(() => {
    setPage(1);
  }, [reportFilters.from, reportFilters.to]);
  const query = useMemo(
    () => ({
      ...reportFilters,
      ...filters,
      spendFrom: filters.spendFrom || reportFilters.from,
      spendTo: filters.spendTo || reportFilters.to,
      cancellationFrom: filters.cancellationFrom || reportFilters.from,
      cancellationTo: filters.cancellationTo || reportFilters.to,
      page,
      limit,
    }),
    [reportFilters, filters, page, limit],
  );
  const valid = validCustomerReportFilters(filters, reportFilters);
  const result = useGetReportCustomersQuery(query, {
    skip: !enabled || !valid,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const refreshCustomers = result.refetch;
  const refreshedVersion = useRef(refreshVersion);
  useEffect(() => {
    if (refreshedVersion.current === refreshVersion) return;
    refreshedVersion.current = refreshVersion;
    if (enabled && valid) refreshCustomers();
  }, [refreshVersion, enabled, valid, refreshCustomers]);
  const response =
    [401, 403].includes(result.error?.status) || !valid || !enabled
      ? undefined
      : result.currentData;
  const lastPage = Math.max(1, response?.totalPages || 1);
  const outsidePage = Boolean(response && page > lastPage);
  useEffect(() => {
    if (outsidePage) setPage(lastPage);
  }, [outsidePage, lastPage]);
  const data = outsidePage ? undefined : response;
  const metadata = data?.metadata;
  const rowCurrency = metadata?.currency || currency;
  const [exportCsv, exportState] = useExportReportCustomersCsvMutation();
  const { download, notice } = useReportDownload(
    exportCsv,
    JSON.stringify(query),
    t,
  );
  const apply = (next) => {
    if (!validCustomerReportFilters(next, reportFilters)) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    setFilters(next);
    setDraft(next);
    setPage(1);
    updateSearchParams((search) => {
      for (const key of keys) {
        if (next[key] && !(key === "cancellationActor" && next[key] === "all"))
          search.set(parameter(key), next[key]);
        else search.delete(parameter(key));
      }
    });
  };
  const update = (key, value) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const field = (key, label, type = "number", disabled = false) => (
    <label
      key={key}
      className={`block min-w-0 text-xs font-medium text-ink-muted ${type === "date" ? "col-span-2 2xl:col-span-1" : ""}`}
    >
      <span className="mb-1 block">{label}</span>
      <input
        data-testid={`report-customer-${key}`}
        className={inputClass}
        type={type}
        value={draft[key]}
        disabled={disabled}
        min={type === "number" ? (key === "inactiveDays" ? 1 : 0) : undefined}
        step={
          type === "number"
            ? key.startsWith("cancelled") || key === "inactiveDays"
              ? 1
              : 1 / 10 ** getStripeMinorUnitDigits(rowCurrency)
            : undefined
        }
        onChange={(event) => update(key, event.target.value)}
      />
    </label>
  );
  const unavailable = t("common.unavailable");

  return (
    <ReportSection
      title={t("analytics.customerTable")}
      description={t("analytics.customerHelp")}
    >
      <div className="space-y-4 border-b border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand-50 p-4">
          <p className="text-sm text-ink">
            {t("analytics.inactiveCredit")}{" "}
            <strong>
              {formatReportNumber(
                data?.suggested?.inactive90DaysWithCredits,
                locale,
                unavailable,
              )}
            </strong>
          </p>
          <button
            className={buttonClass}
            type="button"
            disabled={
              metadata?.creditsAvailable === false ||
              metadata?.activityAvailable === false
            }
            onClick={() =>
              apply({
                ...readFilters(new URLSearchParams()),
                inactiveDays: "90",
                creditMin: String(
                  1 / 10 ** getStripeMinorUnitDigits(rowCurrency),
                ),
              })
            }
          >
            {t("analytics.showCustomers")}
          </button>
        </div>
        {metadata?.spendingScope === "location" || reportFilters.locationId ? (
          <p className="text-xs leading-5 text-ink-muted" role="note">
            {t("analytics.locationScope")}
          </p>
        ) : null}
        {Array.isArray(metadata?.limitations) && metadata.limitations.length ? (
          <p className="text-xs leading-5 text-ink-muted" role="note">
            {t("analytics.incompleteData")}
          </p>
        ) : null}
        <form
          data-testid="reports-customer-filters"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft);
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              [
                "spending",
                "spendMin",
                "spendMax",
                "spendFrom",
                "spendTo",
                metadata?.spendingAvailable === false,
              ],
              [
                "credits",
                "creditMin",
                "creditMax",
                null,
                null,
                metadata?.creditsAvailable === false,
              ],
              [
                "cancellations",
                "cancelledMin",
                "cancelledMax",
                "cancellationFrom",
                "cancellationTo",
                metadata?.cancellationsAvailable === false,
              ],
            ].map(([group, low, high, from, to, disabled]) => (
              <fieldset
                key={group}
                className="min-w-0 rounded-2xl border border-line p-3"
              >
                <legend className="px-1 text-sm font-semibold text-ink">
                  {t(`analytics.${group}`)}
                  {group !== "cancellations" ? ` (${rowCurrency})` : ""}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                  {field(low, t("analytics.minimum"), "number", disabled)}
                  {field(high, t("analytics.maximum"), "number", disabled)}
                  {from
                    ? field(from, t("filters.from"), "date", disabled)
                    : null}
                  {to ? field(to, t("filters.to"), "date", disabled) : null}
                </div>
                {group === "cancellations" ? (
                  <label className="mt-2 block text-xs text-ink-muted">
                    <span className="mb-1 block">{t("analytics.actor")}</span>
                    <select
                      className={inputClass}
                      disabled={disabled}
                      value={draft.cancellationActor}
                      onChange={(event) =>
                        update("cancellationActor", event.target.value)
                      }
                    >
                      {["all", "customer", "staff"].map((actor) => (
                        <option key={actor} value={actor}>
                          {t(`analytics.actor_${actor}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {group === "spending" ? (
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    {t("analytics.moneyBasis")}
                  </p>
                ) : null}
                {group === "credits" ? (
                  <div className="mt-2">
                    {field(
                      "inactiveDays",
                      t("analytics.inactiveDays"),
                      "number",
                      metadata?.activityAvailable === false,
                    )}
                  </div>
                ) : null}
                {disabled ? (
                  <p className="mt-2 text-xs text-ink-muted">{unavailable}</p>
                ) : null}
              </fieldset>
            ))}
          </div>
          <p className="text-xs text-ink-muted">
            {t("analytics.dateDefaults")}
          </p>
          {metadata?.cancellationCoverage?.complete === false ? (
            <p
              role="note"
              className="rounded-xl bg-sand-50 p-3 text-xs leading-5 text-ink-muted"
            >
              {t("analytics.cancellationCoverage")}
              {metadata.cancellationCoverage.since
                ? ` ${t("analytics.asOf")}: ${formatReportDate(metadata.cancellationCoverage.since, locale)}`
                : ""}
            </p>
          ) : null}
          {validationError || !valid ? (
            <p role="alert" className="text-sm text-danger">
              {t("analytics.invalidBounds")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              className={`${buttonClass} bg-cobalt-500 text-white`}
              type="submit"
            >
              {t("analytics.apply")}
            </button>
            <button
              className={buttonClass}
              type="button"
              onClick={() => apply(readFilters(new URLSearchParams()))}
            >
              {t("analytics.clear")}
            </button>
            {canExport ? (
              <button
                className={buttonClass}
                type="button"
                disabled={!data || !valid || exportState.isLoading}
                onClick={() => download(query)}
              >
                {t("analytics.exportCustomers")}
              </button>
            ) : null}
          </div>
        </form>
        {notice ? (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className="text-sm"
          >
            {notice.message}
          </p>
        ) : null}
      </div>
      {result.isFetching && data ? (
        <TableLoadingState label={t("common.loading")} refreshing />
      ) : null}
      {result.isError ? (
        <ReportError
          title={t("error.title")}
          description={getReportErrorMessage(
            result.error,
            t("error.description"),
          )}
          retryLabel={t("actions.retry")}
          onRetry={result.refetch}
        />
      ) : null}
      {!data && result.isFetching ? (
        <TableLoadingState label={t("common.loading")} />
      ) : data ? (
        <>
          <DataTable
            caption={t("analytics.customerTable")}
            rows={data.data}
            getRowKey={(row) => row.id}
            emptyLabel={t("analytics.noCustomers")}
            columns={[
              {
                key: "customer",
                label: t("analytics.customer"),
                render: (row) => (
                  <div>
                    <span className="font-semibold">
                      {row.name || row.email || t("common.unnamed")}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {row.email}
                      {row.memberNumber ? ` · #${row.memberNumber}` : ""}
                    </span>
                  </div>
                ),
              },
              {
                key: "spend",
                label: t("analytics.spending"),
                align: "right",
                render: (row) =>
                  formatReportMoney(
                    row.paidSpendMinor,
                    rowCurrency,
                    locale,
                    unavailable,
                  ),
              },
              {
                key: "credit",
                label: t("analytics.credits"),
                align: "right",
                render: (row) =>
                  formatReportMoney(
                    row.currentCreditMinor,
                    rowCurrency,
                    locale,
                    unavailable,
                  ),
              },
              {
                key: "cancelled",
                label: t("analytics.cancellations"),
                align: "right",
                render: (row) =>
                  cancellationCountLabel(row, locale, unavailable),
              },
              {
                key: "last",
                label: t("analytics.lastActivity"),
                render: (row) => formatReportDate(row.lastActivityAt, locale),
              },
            ]}
          />
          <PeoplePagination
            activeTab="customers"
            currentPage={page}
            pageSize={limit}
            totalCount={data.totalCount}
            totalPages={Math.max(1, data.totalPages)}
            t={people}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setLimit(next);
              setPage(1);
            }}
          />
        </>
      ) : null}
    </ReportSection>
  );
}
