"use client";

import { useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CheckCircleIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PencilSquareIcon,
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
  getVisualEmailCompatibility,
  visualEmailToPlainText,
} from "./visualEmailHtml";
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
const VisualEmailEditor = dynamic(() => import("./VisualEmailEditor"), {
  ssr: false,
  loading: VisualEditorLoading,
});

function VisualEditorLoading() {
  const t = useTranslations("EmailAutomations.visualEditor");
  return (
    <p role="status" className="min-h-64 p-4 text-sm text-ink-muted">
      {t("loading")}
    </p>
  );
}

export default function LocalizedEmailEditor({
  value,
  onChange,
  disabled = false,
  previewLayout,
  invalidLocales = [],
  variableGroups = EMAIL_VARIABLE_GROUPS,
  previewValues,
  subjectMaxLength = 240,
  variablesHint,
  sideBySidePreview = false,
  workspaceLayout = false,
  visualEditing = false,
}) {
  const t = useTranslations("EmailAutomations.editor");
  const visual = useTranslations("EmailAutomations.visualEditor");
  const EditorSection = workspaceLayout ? "section" : WorkspaceFormSection;
  const VariablesSection = workspaceLayout ? "details" : "div";
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
  const visualEditorRef = useRef(null);
  const variableKey = variableGroups
    .flatMap((group) => group.variables)
    .map(
      (variable) =>
        /^{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}$/.exec(variable.token)?.[1],
    )
    .filter(Boolean)
    .join("|");
  const visualVariableNames = useMemo(
    () => variableKey.split("|").filter(Boolean),
    [variableKey],
  );
  const [htmlModes, setHtmlModes] = useState({});
  const variants = value?.variants ?? EMPTY_VARIANTS;
  const variant = variants[activeLocale] ?? createEmptyEmailVariant();
  const invalidContent = invalidLocales.includes(activeLocale);
  const visualSupported = useMemo(
    () =>
      !visualEditing ||
      variant.format !== EMAIL_CONTENT_FORMAT.HTML ||
      getVisualEmailCompatibility(variant.bodyHtml).supported,
    [visualEditing, variant.format, variant.bodyHtml],
  );
  const showVisualEditor =
    visualEditing &&
    variant.format === EMAIL_CONTENT_FORMAT.HTML &&
    visualSupported &&
    htmlModes[activeLocale] !== "source";
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
            bodyText:
              (visualEditing
                ? visualEmailToPlainText(variant.bodyHtml)
                : null) ?? htmlToPlainText(variant.bodyHtml),
          },
    );
  };

  const insertVariable = (token) => {
    if (disabled) return;
    if (activeField === "body" && showVisualEditor) {
      visualEditorRef.current?.insertText(token);
      return;
    }
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
    <div
      className={cx(
        "grid min-w-0",
        workspaceLayout
          ? "shrink-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-2"
          : sideBySidePreview
            ? "gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]"
            : "gap-5 2xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)]",
      )}
    >
      <EditorSection
        className={cx(
          "min-w-0 overflow-hidden",
          workspaceLayout
            ? "flex flex-col rounded-2xl border border-line bg-white shadow-xs lg:min-h-0"
            : "p-0 sm:p-0",
        )}
      >
        <div
          className={cx(
            "shrink-0 border-b border-line bg-sand-50/80",
            workspaceLayout ? "px-3 py-2 sm:px-4" : "px-4 py-4 sm:px-5",
          )}
        >
          <div
            className={
              workspaceLayout
                ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            }
          >
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
          className={
            workspaceLayout
              ? "flex flex-col gap-3 p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
              : "space-y-5 p-4 sm:p-5"
          }
        >
          <label
            className={cx(
              "shrink-0",
              visualEditing && workspaceLayout
                ? "flex items-center gap-3"
                : "block",
            )}
          >
            <span
              className={cx(
                workspaceLabelClass,
                visualEditing && workspaceLayout && "shrink-0",
              )}
            >
              {t("subject")}
            </span>
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
              maxLength={subjectMaxLength}
              placeholder={t("subjectPlaceholder")}
              className={cx(
                workspaceInputClass,
                visualEditing && workspaceLayout && "min-w-0 flex-1",
              )}
            />
          </label>

          <div
            className={
              workspaceLayout
                ? "flex shrink-0 flex-wrap items-center gap-3"
                : undefined
            }
          >
            <span
              className={
                visualEditing && workspaceLayout
                  ? "sr-only"
                  : workspaceLabelClass
              }
            >
              {visualEditing ? visual("mode") : t("format")}
            </span>
            <div
              className={cx("flex flex-wrap gap-2", !workspaceLayout && "mt-2")}
            >
              <FormatButton
                active={variant.format === EMAIL_CONTENT_FORMAT.PLAIN}
                disabled={disabled}
                onClick={() => changeFormat(EMAIL_CONTENT_FORMAT.PLAIN)}
                icon={<DocumentTextIcon className="h-4 w-4" />}
              >
                {t("plain")}
              </FormatButton>
              {visualEditing ? (
                <FormatButton
                  active={showVisualEditor}
                  disabled={disabled || !visualSupported}
                  onClick={() => {
                    setHtmlModes((modes) => ({
                      ...modes,
                      [activeLocale]: "visual",
                    }));
                    changeFormat(EMAIL_CONTENT_FORMAT.HTML);
                  }}
                  icon={<PencilSquareIcon className="h-4 w-4" />}
                >
                  {visual("visual")}
                </FormatButton>
              ) : null}
              <FormatButton
                active={
                  variant.format === EMAIL_CONTENT_FORMAT.HTML &&
                  !showVisualEditor
                }
                disabled={disabled}
                onClick={() => {
                  if (visualEditing)
                    setHtmlModes((modes) => ({
                      ...modes,
                      [activeLocale]: "source",
                    }));
                  changeFormat(EMAIL_CONTENT_FORMAT.HTML);
                }}
                icon={<CodeBracketIcon className="h-4 w-4" />}
              >
                {visualEditing ? visual("htmlSource") : t("html")}
              </FormatButton>
            </div>
          </div>

          {visualEditing && !visualSupported ? (
            <p
              role="status"
              className="rounded-xl bg-sand-50 px-3 py-2 text-xs leading-5 text-ink-muted"
            >
              {visual("unsupported")}
            </p>
          ) : null}

          <div
            className={
              workspaceLayout
                ? "flex min-h-[280px] flex-1 flex-col lg:min-h-[180px]"
                : "block"
            }
          >
            {showVisualEditor ? (
              <>
                <span className="sr-only">{t("body")}</span>
                <VisualEmailEditor
                  key={activeLocale}
                  value={variant.bodyHtml}
                  onChange={(bodyHtml) => updateVariant({ bodyHtml })}
                  disabled={disabled}
                  ariaLabel={t("body")}
                  onFocus={() => setActiveField("body")}
                  editorRef={visualEditorRef}
                  variableNames={visualVariableNames}
                  invalid={invalidContent && !variant.bodyHtml.trim()}
                />
              </>
            ) : (
              <>
                <label
                  htmlFor={`${editorId}-body-${activeLocale}`}
                  className={workspaceLabelClass}
                >
                  {t("body")}
                </label>
                <textarea
                  id={`${editorId}-body-${activeLocale}`}
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
                  rows={workspaceLayout ? 12 : 18}
                  placeholder={
                    variant.format === EMAIL_CONTENT_FORMAT.HTML
                      ? t("htmlPlaceholder")
                      : t("plainPlaceholder")
                  }
                  className={cx(
                    "w-full rounded-[16px] border border-line outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:opacity-70",
                    workspaceLayout
                      ? "mt-1 min-h-0 flex-1 resize-none p-3 sm:p-4"
                      : "mt-2 min-h-[420px] resize-y p-5",
                    variant.format === EMAIL_CONTENT_FORMAT.HTML
                      ? "bg-[#1f1a17] font-mono text-xs leading-6 text-stone-100"
                      : "bg-sand-50 text-[13px] leading-7 text-ink",
                  )}
                />
              </>
            )}
          </div>

          <VariablesSection
            className={
              workspaceLayout
                ? "shrink-0 rounded-xl border border-line bg-sand-50 px-3"
                : "rounded-[16px] border border-line bg-sand-50 p-4"
            }
          >
            {workspaceLayout ? (
              <summary className="cursor-pointer py-3 text-[12px] font-semibold text-ink-soft">
                {t("variables")}
              </summary>
            ) : (
              <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
                {t("variables")}
              </p>
            )}
            <p className="mt-1 text-[12px] leading-5 text-ink-muted">
              {variablesHint ?? t("variablesHint")}
            </p>
            <div className={cx("mt-4 space-y-4", workspaceLayout && "pb-3")}>
              {variableGroups.map((group) => (
                <div key={group.id}>
                  <p className="mb-2 text-[12px] font-medium text-ink-muted">
                    {group.labelText ?? t(`variableGroups.${group.id}`)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.variables.map((variable) => (
                      <button
                        key={variable.token}
                        type="button"
                        disabled={
                          disabled ||
                          (variable.bodyOnly && activeField === "subject")
                        }
                        onClick={() => insertVariable(variable.token)}
                        title={
                          variable.labelText ??
                          t(`variableLabels.${variable.token.slice(2, -2)}`)
                        }
                        className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3 font-mono text-[11px] text-ink-soft transition hover:border-cobalt-300 hover:text-cobalt-700 disabled:opacity-50"
                      >
                        {variable.token}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </VariablesSection>
        </div>
      </EditorSection>

      <aside
        className={cx(
          "min-w-0",
          workspaceLayout
            ? "flex min-h-0 flex-col"
            : sideBySidePreview
              ? "self-start xl:sticky xl:top-4"
              : "self-start 2xl:sticky 2xl:top-4",
        )}
      >
        <WorkspaceCard
          className={
            workspaceLayout
              ? "flex min-h-0 flex-1 flex-col p-3 sm:p-4"
              : "p-4 sm:p-5"
          }
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("preview")}
          </p>
          <SandboxedEmailPreview
            variant={variant}
            fillAvailableSpace={workspaceLayout}
            previewValues={
              typeof previewValues === "function"
                ? previewValues(activeLocale)
                : previewValues
            }
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
