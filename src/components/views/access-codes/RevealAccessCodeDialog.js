"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { ModalFrame } from "./AccessCodeDialog";

export default function RevealAccessCodeDialog({
  code,
  isRevealing,
  onClose,
  onReveal,
  requestError,
}) {
  const t = useTranslations("AccessCodes");
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);

  const reveal = async () => {
    const response = await onReveal();
    const value = String(
      response?.code ??
        response?.entryCode ??
        response?.accessCode ??
        response?.data?.code ??
        response?.data?.entryCode ??
        "",
    );
    if (value) setSecret(value);
  };

  const copy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <ModalFrame
      title={t("reveal.title")}
      description={t("reveal.description")}
      onClose={isRevealing ? () => {} : onClose}
    >
      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex gap-3">
            <EyeIcon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-amber-700"
            />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {t("reveal.auditTitle")}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-900/80">
                {t("reveal.auditDescription")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-line bg-surface-muted px-5 py-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            {code?.label || t("reveal.codeLabel")}
          </p>
          <p className="mt-3 break-all font-mono text-2xl font-semibold tracking-[0.18em] text-ink">
            {secret || code?.maskedCode || code?.maskedValue || "••••"}
          </p>
          {secret ? (
            <button
              type="button"
              onClick={copy}
              className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[11px] font-semibold text-cobalt-700 transition hover:border-cobalt-200"
            >
              {copied ? (
                <CheckIcon aria-hidden="true" className="size-4" />
              ) : (
                <ClipboardDocumentIcon aria-hidden="true" className="size-4" />
              )}
              {t(copied ? "reveal.copied" : "reveal.copy")}
            </button>
          ) : null}
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
          disabled={isRevealing}
          className="h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-ink-muted"
        >
          {t(secret ? "actions.close" : "actions.cancel")}
        </button>
        {!secret ? (
          <button
            type="button"
            onClick={reveal}
            disabled={isRevealing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt disabled:opacity-60"
          >
            {isRevealing ? (
              <ArrowPathIcon
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <EyeSlashIcon aria-hidden="true" className="size-4" />
            )}
            {t("reveal.confirm")}
          </button>
        ) : null}
      </footer>
    </ModalFrame>
  );
}
