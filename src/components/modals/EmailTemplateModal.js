"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { Dialog, DialogTitle } from "@headlessui/react";
import { useMemo, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import LocalizedEmailEditor from "@/components/communications/email/LocalizedEmailEditor";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  WorkspaceFormActions,
  WorkspaceFormSection,
  workspaceInputClass,
  workspaceLabelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import {
  buildTemplatePayload,
  getResourceId,
  normalizeTemplateForm,
  validateTemplateForm,
} from "@/components/communications/email/emailContent";
import {
  useCreateEmailTemplateMutation,
  useUpdateEmailTemplateMutation,
} from "@/lib/features/emailTemplates/emailTemplatesApiSlice";
const EMPTY_TEMPLATE = normalizeTemplateForm();
const TEMPLATE_CATEGORIES = [
  "booking",
  "membership",
  "registration",
  "password",
  "marketing",
  "general",
];
const getErrorMessage = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);
export default function EmailTemplateModal({
  open,
  mode = "create",
  template = null,
  onClose,
}) {
  const t = useTranslations("EmailAutomations.templates.editor");
  const readOnly = mode === "preview";
  const editing = mode === "edit";
  const [form, setForm] = useState(() =>
    normalizeTemplateForm(template ?? EMPTY_TEMPLATE),
  );
  const [initialSnapshot] = useState(() => JSON.stringify(form));
  const [feedback, setFeedback] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [createTemplate, { isLoading: isCreating }] =
    useCreateEmailTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] =
    useUpdateEmailTemplateMutation();
  const isSaving = isCreating || isUpdating;
  const isDirty = !readOnly && JSON.stringify(form) !== initialSnapshot;
  const validation = useMemo(() => validateTemplateForm(form), [form]);
  const canSubmit = Object.keys(validation).length === 0;
  const update = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  const requestClose = () => {
    if (!isDirty) {
      onClose?.();
      return;
    }
    setShowDiscardConfirm(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (readOnly || !canSubmit) return;
    setFeedback("");
    try {
      const payload = buildTemplatePayload(form);
      if (editing && getResourceId(template)) {
        await updateTemplate({
          id: getResourceId(template),
          ...payload,
        }).unwrap();
      } else {
        await createTemplate(payload).unwrap();
      }
      onClose?.();
    } catch (error) {
      setFeedback(getErrorMessage(error, t("errors.save")));
    }
  };
  const title = readOnly
    ? t("titles.preview")
    : editing
      ? t("titles.edit")
      : t("titles.create");
  return (
    <Dialog open={open} onClose={requestClose} className="relative z-[110]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport>
        <WorkspaceDialogPanel size="xlarge">
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <header className="shrink-0 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6">
              <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt-700">
                    {t("eyebrow")}
                  </p>
                  <DialogTitle className="mt-0.5 truncate text-xl font-semibold tracking-[-0.025em] text-[#1f1a17] sm:text-2xl">
                    {title}
                  </DialogTitle>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 transition hover:border-black/20 hover:text-black"
                  aria-label={t("actions.close")}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </header>

            {feedback ? (
              <div
                role="alert"
                className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6"
              >
                {feedback}
              </div>
            ) : null}

            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[1560px] space-y-5">
                <WorkspaceFormSection>
                  <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.5fr)_220px]">
                    <Field
                      label={t("fields.name")}
                      error={validation.name ? t("errors.name") : ""}
                    >
                      <input
                        value={form.name}
                        onChange={(event) => update("name", event.target.value)}
                        disabled={readOnly}
                        maxLength={120}
                        placeholder={t("fields.namePlaceholder")}
                        className={workspaceInputClass}
                      />
                    </Field>
                    <Field label={t("fields.description")}>
                      <input
                        value={form.description}
                        onChange={(event) =>
                          update("description", event.target.value)
                        }
                        disabled={readOnly}
                        maxLength={500}
                        placeholder={t("fields.descriptionPlaceholder")}
                        className={workspaceInputClass}
                      />
                    </Field>
                    <Field label={t("fields.category")}>
                      <select
                        value={form.category}
                        onChange={(event) =>
                          update("category", event.target.value)
                        }
                        disabled={readOnly}
                        className={workspaceInputClass}
                      >
                        {TEMPLATE_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {t(`categories.${category}`)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Toggle
                      label={t("fields.default")}
                      description={t("fields.defaultHint")}
                      checked={form.isDefault}
                      disabled={readOnly}
                      onChange={(value) => update("isDefault", value)}
                    />
                    <Toggle
                      label={t("fields.active")}
                      description={t("fields.activeHint")}
                      checked={form.isActive}
                      disabled={readOnly}
                      onChange={(value) => update("isActive", value)}
                    />
                  </div>
                </WorkspaceFormSection>

                {validation.content ? (
                  <div
                    role="alert"
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                  >
                    {t("errors.content")}
                  </div>
                ) : null}

                <LocalizedEmailEditor
                  value={{
                    defaultLocale: form.defaultLocale,
                    variants: form.variants,
                  }}
                  onChange={(content) =>
                    setForm((current) => ({
                      ...current,
                      ...content,
                    }))
                  }
                  disabled={readOnly}
                  previewLayout={form}
                />
              </div>
            </main>

            <WorkspaceFormActions>
              {showDiscardConfirm ? (
                <div
                  role="alert"
                  className="mr-auto flex flex-wrap items-center gap-3 text-sm text-amber-800"
                >
                  <span>{t("discard.message")}</span>
                  <button
                    type="button"
                    onClick={() => setShowDiscardConfirm(false)}
                    className="font-semibold underline"
                  >
                    {t("discard.keepEditing")}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="font-semibold underline"
                  >
                    {t("discard.discard")}
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={requestClose}
                className={workspaceSecondaryButtonClass}
              >
                {readOnly ? t("actions.close") : t("actions.cancel")}
              </button>
              {!readOnly ? (
                <button
                  type="submit"
                  disabled={isSaving || !canSubmit}
                  className={workspacePrimaryButtonClass}
                >
                  {isSaving
                    ? t("actions.saving")
                    : editing
                      ? t("actions.save")
                      : t("actions.create")}
                </button>
              ) : null}
            </WorkspaceFormActions>
          </form>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
function Field({ label, error, children }) {
  return (
    <label className={workspaceLabelClass}>
      {label}
      {children}
      {error ? (
        <span className="mt-1 block normal-case tracking-normal text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
function Toggle({ label, description, checked, disabled, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[16px] border border-line bg-sand-50 px-4 py-3">
      <span>
        <span className="block text-[13px] font-semibold text-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-5 text-ink-muted">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-5 w-5 shrink-0 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500 disabled:opacity-50"
      />
    </label>
  );
}
