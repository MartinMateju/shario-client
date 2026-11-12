"use client";

import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { ModalFrame } from "./AccessCodeDialog";
import { formatMaskedCode } from "./accessCodes.utils";

export default function RetireAccessCodeDialog({
  code,
  isRetiring,
  onClose,
  onConfirm,
  requestError,
}) {
  const t = useTranslations("AccessCodes");
  const maskedCode = formatMaskedCode(code);

  return (
    <ModalFrame
      title={t("retire.title")}
      description={t("retire.description")}
      onClose={isRetiring ? () => {} : onClose}
    >
      <div className="space-y-4 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface-muted px-4 py-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white text-ink-muted shadow-xs">
            <ArchiveBoxIcon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
              {t("retire.codeLabel")}
            </p>
            <p className="mt-1 truncate font-mono text-sm font-semibold tracking-[0.13em] text-ink">
              {maskedCode}
            </p>
            {code?.label ? (
              <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                {code.label}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex gap-3 rounded-[16px] border border-danger/20 bg-danger/5 px-4 py-4">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-danger"
          />
          <div>
            <p className="text-sm font-semibold text-ink">
              {t("retire.warningTitle")}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              {t("retire.warningDescription")}
            </p>
          </div>
        </div>

        {requestError ? (
          <p
            role="alert"
            className="rounded-[14px] border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger"
          >
            {requestError}
          </p>
        ) : null}
      </div>

      <footer className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted p-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          onClick={onClose}
          disabled={isRetiring}
          className="h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-ink-muted transition hover:border-line-strong hover:text-ink disabled:opacity-60"
        >
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isRetiring}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-danger px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-danger/90 disabled:cursor-wait disabled:opacity-60"
        >
          {isRetiring ? (
            <ArrowPathIcon aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ArchiveBoxIcon aria-hidden="true" className="size-4" />
          )}
          {t(isRetiring ? "actions.retiring" : "retire.confirm")}
        </button>
      </footer>
    </ModalFrame>
  );
}
