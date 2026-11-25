"use client";

import { useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { WorkspaceDialogBackdrop } from "@/components/dashboard/WorkspaceDialogSurface";
import {
  useResetDoorAccessEmailTemplateMutation,
  useUpdateDoorAccessEmailTemplateMutation,
} from "@/lib/features/emailTemplates/emailTemplatesApiSlice";
import { normalizeContentVariants } from "./emailContent";
import {
  buildDoorAccessTemplatePayload,
  DOOR_ACCESS_EMAIL_VARIABLES,
  DOOR_ACCESS_PREVIEW_VALUES,
  validateDoorAccessTemplate,
} from "./doorAccessEmailContent";
import LocalizedEmailEditor from "./LocalizedEmailEditor";

const errorMessage = (error, fallback) => error?.data?.message || fallback;

export default function DoorAccessEmailTemplateModal({
  location,
  canManage,
  onClose,
  onSaved,
}) {
  const t = useTranslations("EmailAutomations.doorTemplates");
  const [form, setForm] = useState(() =>
    normalizeContentVariants(location.template),
  );
  const [initialSnapshot] = useState(() => JSON.stringify(form));
  const [confirmation, setConfirmation] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const helpId = useId();
  const [feedback, setFeedback] = useState("");
  const [save, { isLoading: saving }] =
    useUpdateDoorAccessEmailTemplateMutation();
  const [reset, { isLoading: resetting }] =
    useResetDoorAccessEmailTemplateMutation();
  const busy = saving || resetting;
  const readOnly = !canManage;
  const dirty = JSON.stringify(form) !== initialSnapshot;
  const issues = useMemo(() => validateDoorAccessTemplate(form), [form]);
  const invalidLocales = Object.keys(issues);
  const variableGroups = [
    {
      id: "doorAccess",
      labelText: t("variablesTitle"),
      variables: DOOR_ACCESS_EMAIL_VARIABLES.map((name) => ({
        token: `{{${name}}}`,
        labelText: t(`variables.${name}`),
        bodyOnly: name === "entryCode",
      })),
    },
  ];
  const previewValues = {
    ...DOOR_ACCESS_PREVIEW_VALUES,
    studioName: location.locationName,
  };

  function requestClose() {
    if (busy) return;
    if (dirty && !readOnly) setConfirmation("discard");
    else onClose();
  }

  async function submit(event) {
    event.preventDefault();
    if (readOnly || busy || invalidLocales.length) return;
    setFeedback("");
    try {
      await save({
        locationId: location.locationId,
        ...buildDoorAccessTemplatePayload(form),
      }).unwrap();
      onSaved("save");
    } catch (error) {
      setFeedback(errorMessage(error, t("saveError")));
    }
  }

  async function resetToDefault() {
    if (readOnly || busy) return;
    setFeedback("");
    try {
      await reset(location.locationId).unwrap();
      onSaved("reset");
    } catch (error) {
      setFeedback(errorMessage(error, t("resetError")));
      setConfirmation(null);
    }
  }

  return (
    <Dialog open onClose={requestClose} className="relative z-[110]">
      <WorkspaceDialogBackdrop />
      <div className="fixed inset-0 flex min-h-0 items-stretch">
        <DialogPanel
          data-door-email-editor
          className="flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-canvas text-ink"
        >
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-3 pb-2 pt-[max(.5rem,env(safe-area-inset-top))] sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cobalt-700">
                  {t("eyebrow")}
                </p>
                <DialogTitle
                  title={location.locationName}
                  className="truncate text-lg font-semibold tracking-tight text-ink"
                >
                  {location.locationName}
                </DialogTitle>
                <p className="mt-0.5 text-[11px] leading-4 text-ink-muted">
                  {t("codeReminder", { code: "{{entryCode}}" })}
                </p>
                <DialogDescription className="sr-only">
                  {t("editorDescription")}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowHelp((visible) => !visible)}
                  aria-label={t("help")}
                  title={t("help")}
                  aria-expanded={showHelp}
                  aria-controls={helpId}
                  className="grid size-11 place-items-center rounded-full text-ink-muted transition hover:bg-sand-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30"
                >
                  <QuestionMarkCircleIcon
                    className="size-5"
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={busy}
                  aria-label={t("close")}
                  className="grid size-11 place-items-center rounded-full border border-line text-ink-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-50"
                >
                  <XMarkIcon className="size-5" aria-hidden="true" />
                </button>
              </div>
            </header>
            {showHelp ? (
              <div
                id={helpId}
                className="max-h-[25dvh] shrink-0 space-y-1 overflow-y-auto border-b border-line bg-cobalt-50 px-4 py-3 text-xs leading-5 text-cobalt-800 sm:px-5"
              >
                <p>{t("editorDescription")}</p>
                <p>
                  {t("placeholderHint")}{" "}
                  <code className="font-mono">{"{{entryCode}}"}</code>
                </p>
                <p>{t("previewHint")}</p>
              </div>
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3 lg:overflow-hidden">
              {feedback ? (
                <p
                  role="alert"
                  className="shrink-0 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger"
                >
                  {feedback}
                </p>
              ) : null}
              {invalidLocales.length ? (
                <div
                  role="alert"
                  className="shrink-0 rounded-xl bg-warning-soft px-4 py-2 text-sm text-warning"
                >
                  {invalidLocales.map((locale) => (
                    <p key={locale}>
                      {t(`languages.${locale}`)}:{" "}
                      {t(`errors.${issues[locale]}`)}
                    </p>
                  ))}
                </div>
              ) : null}
              <LocalizedEmailEditor
                value={form}
                onChange={setForm}
                disabled={readOnly || busy}
                invalidLocales={invalidLocales}
                variableGroups={variableGroups}
                previewValues={previewValues}
                subjectMaxLength={200}
                variablesHint={t("variablesHint")}
                workspaceLayout
                visualEditing
              />
            </div>
            <footer
              data-door-email-actions
              className="shrink-0 border-t border-line bg-white px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-5"
            >
              {confirmation ? (
                <div
                  role="alert"
                  className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning"
                >
                  <span className="basis-full sm:basis-auto">
                    {t(
                      confirmation === "reset"
                        ? "resetConfirm"
                        : "discardConfirm",
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmation(null)}
                    disabled={busy}
                    className="min-h-11 font-semibold underline"
                  >
                    {t("keepEditing")}
                  </button>
                  <button
                    type="button"
                    onClick={
                      confirmation === "reset" ? resetToDefault : onClose
                    }
                    disabled={busy}
                    className="min-h-11 font-semibold underline"
                  >
                    {t(confirmation === "reset" ? "confirmReset" : "discard")}
                  </button>
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                {!confirmation && !readOnly && location.isCustomized ? (
                  <button
                    type="button"
                    onClick={() => setConfirmation("reset")}
                    disabled={busy}
                    aria-label={t("reset")}
                    title={t("reset")}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-2 text-xs font-semibold text-ink-muted underline-offset-4 hover:bg-sand-50 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-50"
                  >
                    <ArrowPathIcon className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{t("reset")}</span>
                  </button>
                ) : (
                  <span className="mr-auto" />
                )}
                <div
                  className={`ml-auto grid min-w-0 flex-1 gap-2 sm:flex sm:flex-none ${readOnly ? "grid-cols-1" : "grid-cols-2"}`}
                >
                  <button
                    type="button"
                    onClick={requestClose}
                    disabled={busy}
                    className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:opacity-50"
                  >
                    {t(readOnly ? "close" : "cancel")}
                  </button>
                  {!readOnly ? (
                    <button
                      type="submit"
                      disabled={
                        busy ||
                        invalidLocales.length > 0 ||
                        Boolean(confirmation)
                      }
                      className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-full bg-cobalt-500 px-4 text-[13px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t(saving ? "saving" : resetting ? "resetting" : "save")}
                    </button>
                  ) : null}
                </div>
              </div>
            </footer>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
