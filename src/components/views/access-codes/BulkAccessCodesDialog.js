"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form/FormField";

import { ModalFrame } from "./AccessCodeDialog";
import {
  ACCESS_CODE_STATUSES,
  ACCESS_CODE_TYPES,
  buildAccessCodePayload,
  parseAccessCodeCsv,
} from "./accessCodes.utils";

const MAX_BULK_CODES = 500;

const downloadTemplate = () => {
  const content = [
    "code,label,type,status,valid_from,valid_until,notes,programmed_and_tested",
    '001527,"Main entrance",single_booking,draft,,,"Keep code cells formatted as text",false',
    '009999,"Emergency reserve",emergency_reserve,available,,,,true',
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "shario-access-codes-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const normalizeCsvRow = (row, defaults) => {
  const type = ACCESS_CODE_TYPES.includes(row.type) ? row.type : defaults.type;
  const status = ACCESS_CODE_STATUSES.includes(row.status)
    ? row.status
    : row.programmedAndTested || defaults.programmedAndTested
      ? "available"
      : "draft";
  const programmedAndTested = Boolean(
    row.programmedAndTested || defaults.programmedAndTested,
  );

  return buildAccessCodePayload({
    ...defaults,
    ...row,
    type,
    status,
    programmedAndTested,
    neverExpires: row.validUntil ? false : defaults.neverExpires,
    validFrom: row.validFrom || defaults.validFrom,
    validUntil: row.validUntil || defaults.validUntil,
  });
};

const csvCell = (value) => {
  const source = String(value ?? "");
  return /[",;\r\n]/u.test(source)
    ? `"${source.replaceAll('"', '""')}"`
    : source;
};

const serializeCsvRows = (rows) =>
  [
    "code,label,type,status,valid_from,valid_until,notes,programmed_and_tested",
    ...rows.map((row) =>
      [
        row.code,
        row.label,
        row.type,
        row.status,
        row.validFrom,
        row.validUntil,
        row.notes,
        row.programmedAndTested ? "true" : "false",
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");

export default function BulkAccessCodesDialog({
  isSaving,
  onClose,
  onSave,
  poolId,
  requestError,
}) {
  const t = useTranslations("AccessCodes");
  const fileInputRef = useRef(null);
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [defaults, setDefaults] = useState({
    poolId,
    type: "single_booking",
    status: "draft",
    validFrom: "",
    validUntil: "",
    neverExpires: true,
    programmedAndTested: false,
  });
  const [localError, setLocalError] = useState("");
  const [partialResult, setPartialResult] = useState(null);
  const parsed = useMemo(() => parseAccessCodeCsv(source), [source]);
  const previewRows = parsed.rows.slice(0, 4);

  const readFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setLocalError(t("bulk.errors.fileType"));
      return;
    }

    setLocalError("");
    setPartialResult(null);
    setFileName(file.name);
    setSource(await file.text());
  };

  const submit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!parsed.rows.length) {
      setLocalError(t("bulk.errors.empty"));
      return;
    }
    if (parsed.rows.length > MAX_BULK_CODES) {
      setLocalError(t("bulk.errors.limit", { count: MAX_BULK_CODES }));
      return;
    }
    if (parsed.errors.length) {
      setLocalError(t("bulk.errors.rows", { count: parsed.errors.length }));
      return;
    }

    const response = await onSave({
      poolId,
      codes: parsed.rows.map((row) => normalizeCsvRow(row, defaults)),
    });
    const failed = Number(response?.failed ?? response?.summary?.failed ?? 0);
    if (failed > 0) {
      const failures = Array.isArray(response?.results)
        ? response.results.filter((result) => result?.status === "failed")
        : [];
      const failedRows = failures
        .map((result) => parsed.rows[Number(result.index)])
        .filter(Boolean);

      if (failedRows.length === failed) {
        setFileName("");
        setSource(serializeCsvRows(failedRows));
      }
      setPartialResult({
        created: Number(response?.created ?? response?.summary?.created ?? 0),
        failed,
        errors: failures.slice(0, 3).map((result) => ({
          row: Number(result.index) + 1,
          message: String(
            result?.error?.message || result?.error?.code || "Import failed",
          ),
        })),
      });
    }
  };

  return (
    <ModalFrame
      title={t("bulk.title")}
      description={t("bulk.description")}
      onClose={isSaving ? () => {} : onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-20 items-center gap-3 rounded-[16px] border border-dashed border-cobalt-300 bg-cobalt-50/60 px-4 text-left transition hover:border-cobalt-400 hover:bg-cobalt-50"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-cobalt-600 shadow-xs">
                <DocumentArrowUpIcon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t("bulk.upload")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                  {fileName || t("bulk.csvOnly")}
                </span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => readFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex min-h-20 items-center gap-3 rounded-[16px] border border-line bg-white px-4 text-left transition hover:border-cobalt-200 hover:bg-surface-muted"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-ink-muted">
                <ArrowDownTrayIcon aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">
                  {t("bulk.template")}
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-muted">
                  {t("bulk.templateHint")}
                </span>
              </span>
            </button>
          </div>

          <FormField
            name="bulkCodes"
            label={t("bulk.pasteLabel")}
            hint={t("bulk.pasteHint")}
          >
            <Textarea
              value={source}
              onChange={(event) => {
                setFileName("");
                setPartialResult(null);
                setSource(event.target.value);
              }}
              className="min-h-40 font-mono text-[13px] leading-6"
              placeholder={"001527\n001528\n001529"}
              spellCheck="false"
            />
          </FormField>

          <div className="rounded-[16px] border border-line bg-surface-muted p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
              {t("bulk.defaults")}
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <FormField name="bulkType" label={t("codeForm.type")}>
                <Select
                  value={defaults.type}
                  onChange={(event) =>
                    setDefaults((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                >
                  {ACCESS_CODE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}.label`)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                name="bulkValidUntil"
                label={t("codeForm.validUntil")}
                optional={defaults.neverExpires}
              >
                <Input
                  type="datetime-local"
                  value={defaults.validUntil}
                  disabled={defaults.neverExpires}
                  onChange={(event) =>
                    setDefaults((current) => ({
                      ...current,
                      validUntil: event.target.value,
                    }))
                  }
                />
              </FormField>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={defaults.neverExpires}
                  onChange={(event) =>
                    setDefaults((current) => ({
                      ...current,
                      neverExpires: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 rounded border-line text-cobalt-500"
                />
                <span>{t("codeForm.neverExpires")}</span>
              </label>
              <label className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={defaults.programmedAndTested}
                  onChange={(event) =>
                    setDefaults((current) => ({
                      ...current,
                      programmedAndTested: event.target.checked,
                    }))
                  }
                  className="mt-0.5 size-4 rounded border-line text-cobalt-500"
                />
                <span>{t("bulk.confirmAll")}</span>
              </label>
            </div>
          </div>

          {source ? (
            <div className="rounded-[16px] border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-ink">
                  {t("bulk.preview")}
                </p>
                <span className="rounded-full bg-cobalt-50 px-2.5 py-1 text-[10px] font-semibold text-cobalt-700">
                  {t("bulk.codeCount", { count: parsed.rows.length })}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {previewRows.map((row, index) => (
                  <div
                    key={`${row.code}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-3 py-2"
                  >
                    <code className="font-mono text-xs font-semibold tracking-[0.12em] text-ink">
                      {row.code}
                    </code>
                    <span className="truncate text-[11px] text-ink-muted">
                      {row.label ||
                        t(
                          `types.${
                            ACCESS_CODE_TYPES.includes(row.type)
                              ? row.type
                              : defaults.type
                          }.label`,
                        )}
                    </span>
                  </div>
                ))}
              </div>
              {parsed.rows.length > previewRows.length ? (
                <p className="mt-2 text-[11px] text-ink-muted">
                  {t("bulk.more", {
                    count: parsed.rows.length - previewRows.length,
                  })}
                </p>
              ) : null}
              {parsed.errors.length ? (
                <p className="mt-3 text-xs text-danger" role="alert">
                  {t("bulk.errors.rows", { count: parsed.errors.length })}
                </p>
              ) : null}
            </div>
          ) : null}

          {partialResult ? (
            <div
              role="status"
              className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"
            >
              {t("bulk.partial", partialResult)}
              <span className="mt-1 block">{t("bulk.partialHint")}</span>
              {partialResult.errors?.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {partialResult.errors.map((error) => (
                    <li key={`${error.row}-${error.message}`}>
                      {t("bulk.failedRow", { row: error.row })}: {error.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {localError || requestError ? (
            <p
              role="alert"
              className="rounded-[14px] border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger"
            >
              {localError || requestError}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-ink-muted"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving || !parsed.rows.length || Boolean(partialResult)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <ArrowPathIcon
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : null}
            {t("bulk.import", { count: parsed.rows.length })}
          </button>
        </footer>
      </form>
    </ModalFrame>
  );
}
