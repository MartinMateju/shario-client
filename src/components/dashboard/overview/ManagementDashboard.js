"use client";

import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Link } from "@/i18n/navigation";
import useWorkspaceBannerDismissal from "@/hooks/useWorkspaceBannerDismissal";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  useGetDashboardManagementQuery,
  useGenerateStudioReportMutation,
  useDownloadStudioReportPdfMutation,
} from "@/lib/features/dashboard/managementApiSlice";

import OverviewDateNavigation from "./OverviewDateNavigation";
import StudioSignals from "./StudioSignals";
import TodayRhythm from "./TodayRhythm";
import ManagementPerformance from "./ManagementPerformance";
import { formatOverviewDate, formatOverviewTime } from "./overview.utils";
import {
  formatManagementPeriod,
  getManagementIssues,
  managementHref,
} from "./management.utils";
import styles from "./management.module.css";

const KNOWN_ISSUES = new Set([
  "overdueTasks",
  "lowStock",
  "failedEmails",
  "overduePayments",
  "overdueOrders",
  "failed_emails",
  "overdue_invoices",
  "overdue_custom_orders",
]);

function ManagementAttention({ issues, workspaceAccess }) {
  const t = useTranslations("StudioManagement");
  const common = useTranslations("Common");
  const { dismissed, setDismissed, isSaving, saveError } =
    useWorkspaceBannerDismissal(workspaceAccess, "overviewAttentionDismissed");
  return (
    <section
      className={dismissed ? styles.attentionDismissed : styles.attention}
      aria-label={t("attentionTitle")}
    >
      <div className={styles.attentionHeader}>
        {!dismissed ? (
          <h3>
            <ExclamationCircleIcon aria-hidden="true" />
            {t("attentionTitle")}
          </h3>
        ) : null}
        <button
          type="button"
          className={dismissed ? styles.textLink : styles.dismissButton}
          aria-label={t(dismissed ? "showAttention" : "dismissAttention", {
            count: issues.length,
          })}
          aria-expanded={!dismissed}
          aria-controls="management-attention-content"
          onClick={() => {
            if (!isSaving) void setDismissed(!dismissed);
          }}
          aria-disabled={isSaving}
          aria-busy={isSaving}
        >
          {dismissed ? (
            <>
              <ExclamationCircleIcon aria-hidden="true" />
              {t("showAttention", { count: issues.length })}
            </>
          ) : (
            <XMarkIcon aria-hidden="true" />
          )}
        </button>
      </div>
      {saveError ? (
        <p role="alert">{common("bannerPreferenceSaveError")}</p>
      ) : null}
      <ul
        id="management-attention-content"
        className={styles.issues}
        hidden={dismissed}
      >
        {issues.map((issue) => (
          <li key={issue.key}>
            <Link href={managementHref(issue.href)} className={styles.issue}>
              <strong>
                {t(
                  KNOWN_ISSUES.has(issue.key)
                    ? `issues.${issue.key}`
                    : "issues.other",
                  { count: issue.count },
                )}
              </strong>
              <span className={styles.issueAction}>
                {t("review")}
                <ArrowUpRightIcon aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ManagementReport({
  report,
  canExport,
  onBack,
  onDownload,
  isDownloading,
  exportError,
}) {
  const t = useTranslations("StudioManagement");
  const locale = useLocale();
  const narrative = report.narrative || {};
  const period = report.snapshot?.metadata?.period;
  const comparisonPeriod = report.snapshot?.metadata?.comparisonPeriod;
  return (
    <div className={styles.report} data-studio-report>
      <button type="button" onClick={onBack} className={styles.textLink}>
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </button>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{report.locationLabel}</p>
          <h2>{t("reportTitle")}</h2>
          <p className={styles.caption}>
            {formatManagementPeriod(period, locale)} ·{" "}
            {t("comparison", {
              period: formatManagementPeriod(comparisonPeriod, locale),
            })}
          </p>
        </div>
        {canExport ? (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading}
            className={styles.secondaryButton}
          >
            <ArrowDownTrayIcon aria-hidden="true" />
            {t(isDownloading ? "exporting" : "exportPdf")}
          </button>
        ) : null}
      </div>
      {exportError ? (
        <p role="alert" className={styles.error}>
          {t("exportError")}
        </p>
      ) : null}
      <article className={styles.reportPaper}>
        <div className={styles.reportCover}>
          <span className={styles.reportMode}>
            <SparklesIcon aria-hidden="true" />
            {t(narrative.mode === "ai" ? "aiReport" : "verifiedReport")}
          </span>
          <h3>{narrative.headline || t("reportTitle")}</h3>
          {narrative.summary ? <p>{narrative.summary}</p> : null}
          {narrative.mode !== "ai" ? (
            <p className={styles.caption}>{t("deterministicNote")}</p>
          ) : null}
        </div>
        <div className={styles.reportBody}>
          {["highlights", "attention", "recommendations"].map((key) =>
            Array.isArray(narrative[key]) && narrative[key].length > 0 ? (
              <section className={styles.reportSection} key={key}>
                <h3>{t(`report${key[0].toUpperCase()}${key.slice(1)}`)}</h3>
                <ul>
                  {narrative[key].map((entry, index) => (
                    <li key={index}>{entry}</li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
          {(report.sections || []).map((section) => (
            <section className={styles.reportSection} key={section.key}>
              <h3>{section.title}</h3>
              <div
                className={styles.tableScroll}
                role="region"
                aria-label={section.title}
                tabIndex={0}
              >
                <table className={styles.reportTable}>
                  <thead>
                    <tr>
                      {section.columns.map((column, index) => (
                        <th scope="col" key={index}>
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, index) => (
                      <tr key={index}>
                        <th scope="row">{row.label}</th>
                        <td>{row.value}</td>
                        <td>{row.previous ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {section.notes?.map((note, index) => (
                <p className={styles.caption} key={index}>
                  {note}
                </p>
              ))}
            </section>
          ))}
          {narrative.dataLimitations?.length ? (
            <section className={styles.reportSection}>
              <h3>{t("coverageTitle")}</h3>
              <ul className={styles.muted}>
                {narrative.dataLimitations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <footer className={styles.reportFooter}>
            <span>shario.io · {report.locationLabel}</span>
            <span>
              {t("generatedAt", {
                date: report.generatedAt
                  ? new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: report.snapshot?.metadata?.timezone || "UTC",
                    }).format(new Date(report.generatedAt))
                  : "—",
              })}
            </span>
          </footer>
        </div>
      </article>
    </div>
  );
}

export default function ManagementDashboard({
  overview,
  date,
  todayDate,
  now,
  locationId,
  modules,
  workspaceAccess,
  onDateChange,
  isLoading,
  isError,
  isRefreshing,
  isStale,
  onRetry,
  children,
}) {
  const t = useTranslations("StudioManagement");
  const locale = useLocale();
  const scope = { date, ...(locationId ? { locationId } : {}) };
  const query = useGetDashboardManagementQuery(scope, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: true,
    pollingInterval: date === todayDate ? 60_000 : 0,
    skipPollingIfUnfocused: true,
  });
  const management = query.currentData ?? null;
  const [generate, generation] = useGenerateStudioReportMutation();
  const [download, downloadState] = useDownloadStudioReportPdfMutation();
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState(false);
  const [exportError, setExportError] = useState(false);
  const active = useRef(true);
  const pendingRequest = useRef(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      pendingRequest.current?.abort?.();
    };
  }, []);
  const canGenerate =
    modules?.ai !== false && hasPermission(workspaceAccess, PERMISSIONS.AI_USE);
  const canExport = hasPermission(workspaceAccess, PERMISSIONS.REPORTS_EXPORT);
  const handleGenerate = async () => {
    if (!canGenerate || generation.isLoading) return;
    setReportError(false);
    try {
      const request = generate({ ...scope, locale });
      pendingRequest.current = request;
      const result = await request.unwrap();
      if (active.current) setReport(result);
    } catch {
      if (active.current) setReportError(true);
    }
  };
  const handleDownload = async () => {
    if (!canExport || !report?.id || downloadState.isLoading) return;
    setExportError(false);
    let url;
    try {
      const request = download(report.id);
      pendingRequest.current = request;
      const result = await request.unwrap();
      url = result?.downloadUrl;
      if (!url) throw new Error("Missing PDF download.");
      if (!active.current) return;
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename || "studio-report.pdf";
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      if (active.current) setExportError(true);
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    }
  };
  if (report)
    return (
      <ManagementReport
        report={report}
        canExport={canExport}
        onBack={() => setReport(null)}
        onDownload={handleDownload}
        isDownloading={downloadState.isLoading}
        exportError={exportError}
      />
    );
  const bookingsEnabled =
    modules?.bookings !== false || modules?.courses !== false;
  const flow = new Map(
    (overview?.flow || []).map((stage) => [stage.key, stage]),
  );
  const value = (key) =>
    !isLoading && !isError && flow.get(key)?.available
      ? flow.get(key).value
      : "—";
  const issues = getManagementIssues(
    management,
    isLoading || isError ? null : overview,
  );
  const schedule =
    !isLoading && !isError && overview.today?.available
      ? overview.today.schedule || []
      : [];
  const currentTime = now ?? Date.parse(overview.metadata?.generatedAt);
  // The full-day next booking can be beyond the bounded schedule preview.
  // Preserve the fallback for older responses, but respect an explicit null.
  const nextBookingCandidates =
    isLoading || isError || !overview.today?.available
      ? []
      : Object.hasOwn(overview.today, "nextBooking")
        ? [overview.today.nextBooking].filter(Boolean)
        : schedule;
  const nextSession = [...nextBookingCandidates]
    .filter((item) => new Date(item.start).valueOf() >= currentTime)
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  return (
    <div className={styles.management} data-owner-manager-dashboard>
      <header className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{t("todayEyebrow")}</p>
          <h2>{formatOverviewDate(date, locale)}</h2>
        </div>
        <div className={styles.headerActions}>
          <OverviewDateNavigation
            dateValue={date}
            todayValue={todayDate}
            onDateChange={onDateChange}
          />
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!canGenerate || generation.isLoading || !management}
            onClick={handleGenerate}
          >
            <SparklesIcon aria-hidden="true" />
            {t(generation.isLoading ? "generating" : "generateReport")}
          </button>
        </div>
      </header>
      {!canGenerate ? (
        <p className={styles.caption}>{t("reportPermission")}</p>
      ) : null}
      {isStale || (query.isError && management) ? (
        <p role="status" className={`${styles.error} ${styles.stale}`}>
          {t("staleData")}
        </p>
      ) : isRefreshing || (query.isFetching && management) ? (
        <p role="status" className={styles.caption}>
          {t("refreshingData")}
        </p>
      ) : null}
      {reportError ? (
        <p className={styles.error} role="alert">
          {t("reportError")}
        </p>
      ) : null}
      {isError ? (
        <div role="alert" className={styles.error}>
          {t("operationsError")}{" "}
          <button type="button" className={styles.textLink} onClick={onRetry}>
            {t("retry")}
          </button>
        </div>
      ) : null}
      {bookingsEnabled ? (
        <section
          className={styles.kpiGrid}
          aria-label={t("todayNumbers")}
          aria-busy={isLoading || undefined}
        >
          {[
            {
              key: "booked",
              icon: CalendarDaysIcon,
              label: "todayBookings",
              detail: "selectedDate",
            },
            {
              key: "arriving",
              icon: UserGroupIcon,
              label: "expectedVisitors",
              detail: "bookedParticipants",
            },
            {
              key: "inStudio",
              icon: UserGroupIcon,
              label: "expectedNow",
              detail: "expectedNowBasis",
            },
          ].map(({ key, icon: Icon, label, detail }) => (
            <Link
              href={managementHref(flow.get(key)?.href, "/app/bookings")}
              className={`${styles.kpi} ${styles.dailyKpi}`}
              key={key}
            >
              <span className={styles.dailyKpiHeading}>
                <span className={styles.metricIcon}>
                  <Icon aria-hidden="true" />
                </span>
                <span className={styles.kpiLabel}>{t(label)}</span>
              </span>
              <strong className={styles.kpiValue}>{value(key)}</strong>
              <small className={styles.muted}>{t(detail)}</small>
            </Link>
          ))}
          <Link
            href={
              nextSession?.id
                ? `/app/bookings?bookingId=${encodeURIComponent(nextSession.id)}`
                : "/app/calendar"
            }
            className={`${styles.kpi} ${styles.dailyKpi}`}
          >
            <span className={styles.dailyKpiHeading}>
              <span className={styles.metricIcon}>
                <ClockIcon aria-hidden="true" />
              </span>
              <span className={styles.kpiLabel}>{t("nextSession")}</span>
            </span>
            <strong className={styles.kpiValue}>
              {nextSession
                ? formatOverviewTime(
                    nextSession.start,
                    locale,
                    overview.metadata?.timezone,
                  )
                : "—"}
            </strong>
            <small className={styles.muted}>
              {nextSession?.title || t("noUpcomingSession")}
            </small>
          </Link>
        </section>
      ) : null}
      {issues.length ? (
        <ManagementAttention
          issues={issues}
          workspaceAccess={workspaceAccess}
        />
      ) : null}
      {children}
      {!isLoading && !isError ? (
        <StudioSignals
          signals={overview.signals}
          timezone={overview.metadata.timezone}
          modules={modules}
        />
      ) : null}
      {bookingsEnabled && !isLoading && !isError ? (
        <TodayRhythm
          today={overview.today}
          dateValue={date}
          isToday={date === todayDate}
          timezone={overview.metadata.timezone}
        />
      ) : null}
      {query.isError && !management ? (
        <div className={styles.error} role="alert">
          {t("managementError")}{" "}
          <button
            type="button"
            className={styles.textLink}
            onClick={query.refetch}
          >
            {t("retry")}
          </button>
        </div>
      ) : management ? (
        <ManagementPerformance management={management} modules={modules} />
      ) : (
        <div className={styles.loading} role="status">
          {t("loadingPerformance")}
        </div>
      )}
    </div>
  );
}
