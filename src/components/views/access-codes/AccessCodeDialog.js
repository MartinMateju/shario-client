"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { ChoiceCard } from "@/components/ui/cards/ChoiceCard";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form/FormField";

import {
  ACCESS_CODE_STATUSES,
  ACCESS_CODE_TYPES,
  buildAccessCodePayload,
} from "./accessCodes.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

function ModalFrame({ children, description, onClose, title }) {
  const commonT = useTranslations("Common");
  return (
    <Dialog open onClose={onClose} className="relative z-[110]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/35 backdrop-blur-[2px] transition data-closed:opacity-0"
      />
      <div className="fixed inset-0 p-0 sm:p-6">
        <div className="flex h-full items-end justify-center sm:items-center">
          <DialogPanel
            transition
            className="flex max-h-dvh w-full max-w-[680px] flex-col overflow-hidden bg-surface-raised pt-[env(safe-area-inset-top)] shadow-floating transition data-closed:translate-y-3 data-closed:opacity-0 sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border sm:border-line sm:pt-0"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line bg-surface-muted px-5 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0">
                <DialogTitle className="text-[22px] font-semibold tracking-[-0.045em] text-ink">
                  {title}
                </DialogTitle>
                {description ? (
                  <p className="mt-1 max-w-xl text-xs leading-5 text-ink-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={commonT("close")}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-muted transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30"
              >
                <XMarkIcon aria-hidden="true" className="size-5" />
              </button>
            </header>
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export function AccessCodeDialog({
  code,
  isSaving,
  onClose,
  onSave,
  poolId,
  requestError,
}) {
  const t = useTranslations("AccessCodes");
  const isEditing = Boolean(code?.id || code?._id);
  const alreadyVerified = Boolean(code?.verifiedAt);
  const [form, setForm] = useState(() => ({
    poolId,
    code: "",
    label: code?.label || "",
    notes: code?.notes || "",
    type: ACCESS_CODE_TYPES.includes(code?.type) ? code.type : "single_booking",
    status: ACCESS_CODE_STATUSES.includes(code?.status) ? code.status : "draft",
    validFrom: toDateTimeInput(code?.validFrom),
    validUntil: toDateTimeInput(code?.validUntil),
    neverExpires: !code?.validUntil,
    programmedAndTested:
      alreadyVerified || code?.status === "available" || false,
  }));
  const [error, setError] = useState("");

  const expiryError = useMemo(() => {
    if (form.neverExpires || !form.validUntil) return "";
    if (!form.validFrom) return "";

    return new Date(form.validUntil) <= new Date(form.validFrom)
      ? t("codeForm.errors.expiryOrder")
      : "";
  }, [form.neverExpires, form.validFrom, form.validUntil, t]);

  const update = (field, value) => {
    setError("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!isEditing && !form.code.trim()) {
      setError(t("codeForm.errors.codeRequired"));
      return;
    }
    if (!form.neverExpires && !form.validUntil) {
      setError(t("codeForm.errors.expiryRequired"));
      return;
    }
    if (expiryError) {
      setError(expiryError);
      return;
    }
    if (isEditing && form.status === "available" && !form.programmedAndTested) {
      setError(t("codeForm.errors.verificationRequired"));
      return;
    }

    const payload = buildAccessCodePayload({
      ...form,
      status: isEditing
        ? form.status
        : form.programmedAndTested
          ? "available"
          : "draft",
    });
    if (isEditing) {
      delete payload.code;
      delete payload.poolId;
    }
    await onSave(payload);
  };

  return (
    <ModalFrame
      title={t(isEditing ? "codeForm.editTitle" : "codeForm.createTitle")}
      description={t(
        isEditing ? "codeForm.editDescription" : "codeForm.createDescription",
      )}
      onClose={isSaving ? () => {} : onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {!isEditing ? (
            <FormField
              name="accessCode"
              label={`${t("codeForm.code")} *`}
              hint={t("codeForm.codeHint")}
              error={error === t("codeForm.errors.codeRequired") ? error : ""}
            >
              <Input
                value={form.code}
                onChange={(event) => update("code", event.target.value)}
                autoComplete="off"
                spellCheck="false"
                inputMode="text"
                maxLength={64}
                required
              />
            </FormField>
          ) : (
            <div className="rounded-[16px] border border-line bg-surface-muted px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                {t("codeForm.code")}
              </p>
              <p className="mt-1 font-mono text-base font-semibold tracking-[0.16em] text-ink">
                {code?.maskedCode || code?.maskedValue || "••••"}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                {t("codeForm.secretImmutable")}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField name="codeLabel" label={t("codeForm.label")} optional>
              <Input
                value={form.label}
                onChange={(event) => update("label", event.target.value)}
                maxLength={120}
              />
            </FormField>
            {isEditing ? (
              <FormField name="codeStatus" label={t("codeForm.status")}>
                <Select
                  value={form.status}
                  onChange={(event) => update("status", event.target.value)}
                >
                  {ACCESS_CODE_STATUSES.filter(
                    (status) => status !== "retired",
                  ).map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}`)}
                    </option>
                  ))}
                </Select>
              </FormField>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ink">
              {t("codeForm.type")}
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {ACCESS_CODE_TYPES.map((type) => (
                <ChoiceCard
                  key={type}
                  label={t(`types.${type}.label`)}
                  description={t(`types.${type}.description`)}
                  selected={form.type === type}
                  onClick={() => update("type", type)}
                />
              ))}
            </div>
          </fieldset>

          {form.type === "emergency_reserve" ? (
            <div className="flex gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
              <ExclamationTriangleIcon
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0"
              />
              <p className="text-xs leading-5">
                {t("codeForm.emergencyExplanation")}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              name="validFrom"
              label={t("codeForm.validFrom")}
              optional
            >
              <Input
                type="datetime-local"
                value={form.validFrom}
                onChange={(event) => update("validFrom", event.target.value)}
              />
            </FormField>
            <FormField
              name="validUntil"
              label={t("codeForm.validUntil")}
              error={expiryError}
              optional={form.neverExpires}
            >
              <Input
                type="datetime-local"
                value={form.validUntil}
                disabled={form.neverExpires}
                onChange={(event) => update("validUntil", event.target.value)}
              />
            </FormField>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-line bg-surface-muted px-4 py-3.5">
            <input
              type="checkbox"
              checked={form.neverExpires}
              onChange={(event) => update("neverExpires", event.target.checked)}
              className="mt-0.5 size-5 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                {t("codeForm.neverExpires")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-5 text-ink-muted">
                {t("codeForm.validityDisclaimer")}
              </span>
            </span>
          </label>

          <label
            className={cx(
              "flex items-start gap-3 rounded-[16px] border px-4 py-3.5",
              form.programmedAndTested
                ? "border-success/25 bg-success-soft"
                : "border-line bg-white",
              alreadyVerified ? "cursor-default" : "cursor-pointer",
            )}
          >
            <input
              type="checkbox"
              checked={form.programmedAndTested}
              disabled={alreadyVerified}
              onChange={(event) =>
                update("programmedAndTested", event.target.checked)
              }
              className="mt-0.5 size-5 rounded border-line text-cobalt-500 focus:ring-cobalt-500 disabled:opacity-70"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <CheckCircleIcon aria-hidden="true" className="size-4" />
                {t("codeForm.programmedAndTested")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-5 text-ink-muted">
                {t("codeForm.programmedAndTestedHint")}
              </span>
            </span>
          </label>

          <FormField name="codeNotes" label={t("codeForm.notes")} optional>
            <Textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              maxLength={500}
              className="min-h-24"
            />
          </FormField>

          {error && error !== expiryError ? (
            <p
              role="alert"
              className="rounded-[14px] border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger"
            >
              {error}
            </p>
          ) : null}
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
            disabled={isSaving}
            className="h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-ink-muted transition hover:border-line-strong disabled:opacity-50"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? (
              <ArrowPathIcon
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : null}
            {t(isEditing ? "actions.save" : "actions.createCode")}
          </button>
        </footer>
      </form>
    </ModalFrame>
  );
}

export function AccessCodePoolDialog({
  isSaving,
  locations,
  onClose,
  onSave,
  pool,
  requestError,
  selectedLocationId,
}) {
  const t = useTranslations("AccessCodes");
  const isEditing = Boolean(pool?.id || pool?._id);
  const [form, setForm] = useState(() => ({
    locationId:
      pool?.locationId || pool?.location?.id || selectedLocationId || "",
    name: pool?.name || "",
    lowStockThreshold: Number(pool?.lowStockThreshold ?? 5),
  }));

  const submit = async (event) => {
    event.preventDefault();
    await onSave({
      ...(isEditing ? {} : { locationId: form.locationId }),
      name: form.name.trim(),
      lowStockThreshold: Math.max(Number(form.lowStockThreshold || 0), 0),
    });
  };

  return (
    <ModalFrame
      title={t(isEditing ? "poolForm.editTitle" : "poolForm.createTitle")}
      description={t("poolForm.description")}
      onClose={isSaving ? () => {} : onClose}
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <FormField name="poolLocation" label={`${t("poolForm.location")} *`}>
            <Select
              value={form.locationId}
              disabled={isEditing}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locationId: event.target.value,
                }))
              }
              required
            >
              <option value="">{t("poolForm.chooseLocation")}</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            name="poolName"
            label={`${t("poolForm.name")} *`}
            hint={t("poolForm.nameHint")}
          >
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              maxLength={120}
              required
            />
          </FormField>
          <div>
            <FormField
              name="lowStockThreshold"
              label={t("poolForm.lowStockThreshold")}
              hint={t("poolForm.lowStockHint")}
            >
              <Input
                type="number"
                min="0"
                max="500"
                step="1"
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lowStockThreshold: event.target.value,
                  }))
                }
              />
            </FormField>
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
            disabled={isSaving}
            className="h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-ink-muted"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt disabled:opacity-60"
          >
            {isSaving ? (
              <ArrowPathIcon
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : null}
            {t(isEditing ? "actions.save" : "actions.createPool")}
          </button>
        </footer>
      </form>
    </ModalFrame>
  );
}

export { ModalFrame };
