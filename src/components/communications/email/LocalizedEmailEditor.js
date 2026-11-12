"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  CheckCircleIcon,
  CodeBracketIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";
import {
  WorkspaceFormSection,
  workspaceInputClass,
  workspaceLabelClass,
} from "@/components/dashboard/WorkspaceFormSurface";

import SandboxedEmailPreview from "./SandboxedEmailPreview";
import {
  EMAIL_CONTENT_FORMAT,
  EMAIL_LOCALES,
  EMAIL_VARIABLE_GROUPS,
  createEmptyEmailVariant,
  getVariantCompletion,
  htmlToPlainText,
  plainTextToHtml,
} from "./emailContent";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const EMPTY_VARIANTS = {};

export default function LocalizedEmailEditor({
  value,
  onChange,
  disabled = false,
  previewLayout,
  invalidLocales = [],
}) {
  const t = useTranslations("EmailAutomations.editor");
  const editorId = useId().replaceAll(":", "");
  const defaultLocale = EMAIL_LOCALES.includes(value?.defaultLocale)
    ? value.defaultLocale
    : "cs";
  const [selectedLocale, setSelectedLocale] = useState(null);
  const activeLocale =
    selectedLocale?.defaultLocale === defaultLocale
      ? selectedLocale.locale
      : defaultLocale;
  const setActiveLocale = (locale) =>
    setSelectedLocale({ locale, defaultLocale });
  const [activeField, setActiveField] = useState("body");
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);
  const variants = value?.variants ?? EMPTY_VARIANTS;
  const variant = variants[activeLocale] ?? createEmptyEmailVariant();
  const invalidContent = invalidLocales.includes(activeLocale);
  const completion = useMemo(() => getVariantCompletion(variants), [variants]);

  const updateVariant = (patch) => {
    onChange?.({
      ...value,
      variants: {
        ...variants,
        [activeLocale]: {
          ...variant,
          ...patch,
        },
      },
    });
  };

  const changeFormat = (format) => {
    if (format === variant.format) return;
    updateVariant(
      format === EMAIL_CONTENT_FORMAT.HTML
        ? {
            format,
            bodyHtml: plainTextToHtml(variant.bodyText),
          }
        : {
            format,
            bodyText: htmlToPlainText(variant.bodyHtml),
          },
    );
  };

  const insertVariable = (token) => {
    if (disabled) return;
    const field =
      activeField === "subject"
        ? "subject"
        : variant.format === EMAIL_CONTENT_FORMAT.HTML
          ? "bodyHtml"
          : "bodyText";
    const target =
      activeField === "subject" ? subjectRef.current : bodyRef.current;
    const currentValue = String(variant[field] ?? "");
    const start = target?.selectionStart ?? currentValue.length;
    const end = target?.selectionEnd ?? start;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
    updateVariant({ [field]: nextValue });

    requestAnimationFrame(() => {
      target?.focus();
      target?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const selectLocaleFromKeyboard = (event, locale) => {
    const currentIndex = EMAIL_LOCALES.indexOf(locale);
    let nextIndex = currentIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % EMAIL_LOCALES.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + EMAIL_LOCALES.length) % EMAIL_LOCALES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = EMAIL_LOCALES.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextLocale = EMAIL_LOCALES[nextIndex];
    setActiveLocale(nextLocale);
    requestAnimationFrame(() => {
      document.getElementById(`${editorId}-tab-${nextLocale}`)?.focus();
    });
  };

  return (
    <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)]">
      <WorkspaceFormSection className="min-w-0 overflow-hidden p-0 sm:p-0">
        <div className="border-b border-line bg-sand-50/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label={t("languageLabel")}
            >
              {EMAIL_LOCALES.map((locale) => (
                <button
                  key={locale}
                  id={`${editorId}-tab-${locale}`}
                  type="button"
                  role="tab"
                  aria-selected={activeLocale === locale}
                  data-invalid={invalidLocales.includes(locale) || undefined}
                  title={
                    invalidLocales.includes(locale)
                      ? t("incompleteLanguage")
                      : undefined
                  }
                  aria-controls={`${editorId}-panel-${locale}`}
                  tabIndex={activeLocale === locale ? 0 : -1}
                  onClick={() => setActiveLocale(locale)}
                  onKeyDown={(event) => selectLocaleFromKeyboard(event, locale)}
                  className={cx(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition",
                    activeLocale === locale
                      ? "border-cobalt-500 bg-cobalt-500 text-white shadow-cobalt"
                      : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink",
                    invalidLocales.includes(locale) && "ring-2 ring-danger/40",
                  )}
                >
                  {t(`languages.${locale}`)}
                  {completion[locale] &&
                  !value?.fallbackLocales?.includes(locale) ? (
                    <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={disabled || value?.defaultLocale === activeLocale}
              aria-pressed={value?.defaultLocale === activeLocale}
              onClick={() =>
                onChange?.({ ...value, defaultLocale: activeLocale })
              }
              className="inline-flex min-h-11 items-center justify-center rounded-full px-3 text-[12px] font-semibold text-cobalt-700 underline-offset-4 hover:bg-cobalt-50 hover:underline disabled:cursor-default disabled:text-ink-muted disabled:no-underline"
            >
              {value?.defaultLocale === activeLocale
                ? t("defaultLanguage")
                : t("makeDefault")}
            </button>
          </div>
        </div>

        <div
          id={`${editorId}-panel-${activeLocale}`}
          role="tabpanel"
          aria-labelledby={`${editorId}-tab-${activeLocale}`}
          className="space-y-5 p-4 sm:p-5"
        >
          <label className="block">
            <span className={workspaceLabelClass}>{t("subject")}</span>
            <input
              ref={subjectRef}
              value={variant.subject}
              aria-invalid={
                invalidContent && !variant.subject.trim() ? true : undefined
              }
              onFocus={() => setActiveField("subject")}
              onChange={(event) =>
                updateVariant({ subject: event.target.value })
              }
              disabled={disabled}
              maxLength={240}
              placeholder={t("subjectPlaceholder")}
              className={workspaceInputClass}
            />
          </label>

          <div>
            <span className={workspaceLabelClass}>{t("format")}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              <FormatButton
                active={variant.format === EMAIL_CONTENT_FORMAT.PLAIN}
                disabled={disabled}
                onClick={() => changeFormat(EMAIL_CONTENT_FORMAT.PLAIN)}
                icon={<DocumentTextIcon className="h-4 w-4" />}
              >
                {t("plain")}
              </FormatButton>
              <FormatButton
                active={variant.format === EMAIL_CONTENT_FORMAT.HTML}
                disabled={disabled}
                onClick={() => changeFormat(EMAIL_CONTENT_FORMAT.HTML)}
                icon={<CodeBracketIcon className="h-4 w-4" />}
              >
                {t("html")}
              </FormatButton>
            </div>
          </div>

          <label className="block">
            <span className={workspaceLabelClass}>{t("body")}</span>
            <textarea
              ref={bodyRef}
              value={
                variant.format === EMAIL_CONTENT_FORMAT.HTML
                  ? variant.bodyHtml
                  : variant.bodyText
              }
              onFocus={() => setActiveField("body")}
              onChange={(event) =>
                updateVariant({
                  [variant.format === EMAIL_CONTENT_FORMAT.HTML
                    ? "bodyHtml"
                    : "bodyText"]: event.target.value,
                })
              }
              disabled={disabled}
              aria-invalid={
                invalidContent &&
                !(variant.format === EMAIL_CONTENT_FORMAT.HTML
                  ? variant.bodyHtml.trim()
                  : variant.bodyText.trim())
                  ? true
                  : undefined
              }
              spellCheck={variant.format !== EMAIL_CONTENT_FORMAT.HTML}
              rows={18}
              placeholder={
                variant.format === EMAIL_CONTENT_FORMAT.HTML
                  ? t("htmlPlaceholder")
                  : t("plainPlaceholder")
              }
              className={cx(
                "mt-2 min-h-[420px] w-full resize-y rounded-[16px] border border-line p-5 outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:opacity-70",
                variant.format === EMAIL_CONTENT_FORMAT.HTML
                  ? "bg-[#1f1a17] font-mono text-xs leading-6 text-stone-100"
                  : "bg-sand-50 text-[13px] leading-7 text-ink",
              )}
            />
          </label>

          <div className="rounded-[16px] border border-line bg-sand-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
              {t("variables")}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-ink-muted">
              {t("variablesHint")}
            </p>
            <div className="mt-4 space-y-4">
              {EMAIL_VARIABLE_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-[12px] font-medium text-ink-muted">
                    {t(`variableGroups.${group.id}`)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.variables.map((variable) => (
                      <button
                        key={variable.token}
                        type="button"
                        disabled={disabled}
                        onClick={() => insertVariable(variable.token)}
                        title={t(
                          `variableLabels.${variable.token.slice(2, -2)}`,
                        )}
                        className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3 font-mono text-[11px] text-ink-soft transition hover:border-cobalt-300 hover:text-cobalt-700 disabled:opacity-50"
                      >
                        {variable.token}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </WorkspaceFormSection>

      <aside className="min-w-0 self-start 2xl:sticky 2xl:top-4">
        <WorkspaceCard className="p-4 sm:p-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("preview")}
          </p>
          <SandboxedEmailPreview
            variant={variant}
            title={t("previewTitle", {
              language: t(`languages.${activeLocale}`),
            })}
            headerHtml={previewLayout?.headerHtml}
            footerHtml={previewLayout?.footerHtml}
            primaryColor={previewLayout?.primaryColor}
            subjectLabel={t("previewSubject")}
            emptyText={t("previewEmpty")}
          />
        </WorkspaceCard>
      </aside>
    </div>
  );
}

function FormatButton({ active, disabled, onClick, icon, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition disabled:opacity-50",
        active
          ? "border-cobalt-500 bg-cobalt-500 text-white"
          : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
