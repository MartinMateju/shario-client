"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import {
  formatManagementDate,
  formatManagementPeriod,
} from "@/components/dashboard/overview/management.utils";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import {
  useDownloadStudioReportPdfMutation,
  useGenerateStudioReportMutation,
} from "@/lib/features/dashboard/managementApiSlice";

const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-cobalt-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-50";

function ReportFlow({
  date,
  locationId,
  locale,
  canExport,
  onViewChange,
  onBack,
}) {
  const t = useTranslations("AI.guided.report");
  const reportT = useTranslations("StudioManagement");
  const [generate] = useGenerateStudioReportMutation();
  const [download] = useDownloadStudioReportPdfMutation();
  const [report, setReport] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [exportError, setExportError] = useState(false);
  const active = useRef(false);
  const generationRequest = useRef(null);
  const downloadRequest = useRef(null);
  const offerButton = useRef(null);
  const backButton = useRef(null);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      generationRequest.current?.abort?.();
      downloadRequest.current?.abort?.();
    };
  }, []);

  useEffect(() => {
    if (!report) return;
    (reportOpen ? backButton : offerButton).current?.focus();
  }, [report, reportOpen]);

  const openReport = () => {
    setReportOpen(true);
    onViewChange?.(true);
  };

  const handleGenerate = async () => {
    // The ref also blocks repeated clicks before React commits loading state.
    if (generationRequest.current) return;
    if (report) {
      openReport();
      return;
    }
    setGenerationError(false);
    setGenerating(true);
    try {
      const request = generate({
        date,
        ...(locationId ? { locationId } : {}),
        locale,
      });
      generationRequest.current = request;
      const result = await request.unwrap();
      if (!active.current) return;
      if (!result?.id || !result?.snapshot) {
        throw new Error("Missing generated report.");
      }
      setReport(result);
      openReport();
    } catch {
      if (active.current) setGenerationError(true);
    } finally {
      generationRequest.current = null;
      if (active.current) setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!canExport || !report?.id || downloadRequest.current) return;
    setExportError(false);
    setDownloading(true);
    let objectUrl;
    try {
      const request = download(report.id);
      downloadRequest.current = request;
      const result = await request.unwrap();
      objectUrl = result?.downloadUrl;
      if (!objectUrl || !objectUrl.startsWith("blob:")) {
        throw new Error("Missing PDF download.");
      }
      if (!active.current) return;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = result.filename || "studio-report.pdf";
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      if (active.current) setExportError(true);
    } finally {
      downloadRequest.current = null;
      if (active.current) setDownloading(false);
      if (objectUrl?.startsWith("blob:")) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      }
    }
  };

  if (!reportOpen || !report) {
    return (
      <section
        className="mt-6 border-t border-line pt-5"
        aria-label={t("title")}
      >
        <h3 className="text-sm font-semibold text-ink">{t("title")}</h3>
        <p className="mt-1.5 text-xs leading-5 text-ink-muted">
          {t("description", { date: formatManagementDate(date, locale) })}
        </p>
        <button
          ref={offerButton}
          type="button"
          className={`${buttonClass} mt-4 w-full`}
          disabled={generating}
          onClick={handleGenerate}
        >
          {generating ? (
            <ArrowPathIcon
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
          ) : (
            <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {generating ? reportT("generating") : t(report ? "open" : "generate")}
        </button>
        {generating ? (
          <p className="sr-only" role="status">
            {reportT("generating")}
          </p>
        ) : null}
        {generationError ? (
          <p
            role="alert"
            className="mt-3 rounded-[12px] bg-danger-soft p-3 text-xs leading-5 text-danger"
          >
            {reportT("reportError")}
          </p>
        ) : null}
      </section>
    );
  }

  const narrative = report.narrative || {};
  return (
    <section data-guided-studio-report className="min-w-0 space-y-5">
      <button
        ref={backButton}
        type="button"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted transition hover:text-cobalt-700"
        onClick={() => {
          setReportOpen(false);
          onViewChange?.(false);
          onBack?.();
        }}
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </button>
      <header>
        <p
          role="status"
          className="flex items-center gap-1.5 text-xs font-medium text-success"
        >
          <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
          {t("ready")}
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
          {narrative.headline || reportT("reportTitle")}
        </h2>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          {report.locationLabel} ·{" "}
          {formatManagementPeriod(report.snapshot?.metadata?.period, locale)}
        </p>
        {report.snapshot?.metadata?.comparisonPeriod ? (
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            {reportT("comparison", {
              period: formatManagementPeriod(
                report.snapshot.metadata.comparisonPeriod,
                locale,
              ),
            })}
          </p>
        ) : null}
      </header>
      {narrative.summary ? (
        <p className="text-sm leading-6 text-ink">{narrative.summary}</p>
      ) : null}
      {narrative.mode !== "ai" ? (
        <p className="rounded-[12px] bg-sand-50 p-3 text-xs leading-5 text-ink-muted">
          {reportT("deterministicNote")}
        </p>
      ) : null}
      {["highlights", "attention", "recommendations"].map((key) =>
        Array.isArray(narrative[key]) && narrative[key].length ? (
          <section key={key}>
            <h3 className="text-sm font-semibold text-ink">
              {reportT(`report${key[0].toUpperCase()}${key.slice(1)}`)}
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-ink-muted">
              {narrative[key].map((entry, index) => (
                <li key={index}>{entry}</li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      {(Array.isArray(report.sections) ? report.sections : []).map(
        (section, index) => (
          <section key={section.key || index}>
            <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
            <div
              className="mt-2 overflow-x-auto"
              role="region"
              aria-label={section.title}
              tabIndex={0}
            >
              <table className="w-full text-xs leading-5">
                <thead>
                  <tr className="border-b border-line text-left text-ink-muted">
                    {(section.columns || []).map((column, columnIndex) => (
                      <th
                        key={columnIndex}
                        scope="col"
                        className="px-2 py-2 font-medium first:pl-0"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(section.rows || []).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-line/70 text-ink"
                    >
                      <th
                        scope="row"
                        className="py-2 pr-2 text-left font-medium"
                      >
                        {row.label}
                      </th>
                      <td className="px-2 py-2 tabular-nums">{row.value}</td>
                      <td className="px-2 py-2 tabular-nums">
                        {row.previous ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(section.notes || []).map((note, noteIndex) => (
              <p
                key={noteIndex}
                className="mt-2 text-xs leading-5 text-ink-muted"
              >
                {note}
              </p>
            ))}
          </section>
        ),
      )}
      {narrative.dataLimitations?.length ? (
        <section>
          <h3 className="text-sm font-semibold text-ink">
            {reportT("coverageTitle")}
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-5 text-ink-muted">
            {narrative.dataLimitations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {canExport ? (
        <button
          type="button"
          className={`${buttonClass} w-full`}
          disabled={downloading}
          onClick={handleDownload}
        >
          <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
          {reportT(downloading ? "exporting" : "exportPdf")}
        </button>
      ) : null}
      {exportError ? (
        <p
          role="alert"
          className="rounded-[12px] bg-danger-soft p-3 text-xs leading-5 text-danger"
        >
          {reportT("exportError")}
        </p>
      ) : null}
    </section>
  );
}

export default function StudioAssistantReport(props) {
  const { onViewChange } = props;
  const access = useAiAccess({ feature: "reportInsights" });
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canGenerate =
    access.available &&
    hasPermission(workspaceAccess, PERMISSIONS.WORKSPACE_VIEW) &&
    hasPermission(workspaceAccess, PERMISSIONS.REPORTS_VIEW);
  const scope = `${access.cacheScope}|${props.date}|${props.locationId || "all"}|${props.locale}`;

  // Changing the scope discards both saved reports and in-flight operations.
  // The parent also keys the question flow by the active workspace scope.
  useEffect(() => {
    onViewChange?.(false);
  }, [scope, canGenerate, onViewChange]);

  if (!canGenerate) return null;
  return (
    <ReportFlow
      key={scope}
      {...props}
      canExport={hasPermission(workspaceAccess, PERMISSIONS.REPORTS_EXPORT)}
    />
  );
}
