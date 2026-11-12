"use client";

import { Dialog, DialogTitle } from "@headlessui/react";
import { useMemo, useRef, useState } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
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
  persistCommunicationAutomation,
  resolveCommunicationAutomationSaveState,
} from "@/components/communications/email/automationPersistence";
import {
  BOOKING_CONNECTED_PRODUCT_TYPES,
  BOOKING_EMAIL_SCHEDULE_TYPES,
  EMAIL_LOCALES,
  LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES,
  OFFSET_EMAIL_SCHEDULE_TYPES,
  UNSUPPORTED_EMAIL_SCHEDULE_TYPES,
  UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES,
  buildAutomationPayload,
  getInvalidEmailContentLocales,
  getResourceId,
  normalizeAutomationContent,
  normalizeAutomationForm,
  normalizeConnectedProductType,
  normalizeContentVariants,
  validateAutomationForm,
} from "@/components/communications/email/emailContent";
import {
  isEmailSetupReady,
  normalizeEmailSetup,
} from "@/components/communications/email/emailSetup";
import {
  useCreateCommunicationAutomationMutation,
  useLazyLookupCommunicationRecipientQuery,
  useUpdateCommunicationAutomationMutation,
} from "@/lib/features/communicationAutomations/communicationAutomationsApiSlice";
import { isWorkspaceOwner } from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getPrimaryLocation,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
const SCHEDULE_GROUPS = [
  {
    id: "bookings",
    types: ["afterBookingCreated", "beforeBooking", "afterBooking"],
  },
  {
    id: "customers",
    types: ["afterRegistration"],
  },
  {
    id: "scheduled",
    types: ["oneTimeEmail", "daily", "weekly", "monthly"],
  },
];
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const BULK_SCHEDULES = new Set(["oneTimeEmail", "daily", "weekly", "monthly"]);
const OFFSET_MINUTE_OPTIONS = [0, 2, 5, 10, 15, 30, 60, 90];
const getErrorMessage = (error, fallback) =>
  error?.data?.message ??
  error?.data?.error ??
  error?.error ??
  error?.message ??
  fallback;
export default function AutomatedEmailModal({
  automation = null,
  senderEmailId = "",
  emailSetup,
  emailTemplates = [],
  mode = "create",
  onClose,
}) {
  const t = useTranslations("EmailAutomations.automationEditor");
  const emailT = useTranslations("CommunicationsEmail");
  const managedSetup = normalizeEmailSetup(emailSetup);
  const managedReady = isEmailSetupReady(managedSetup);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const activeStudioId = useSelector(selectActiveStudioId);
  const locationAccess =
    workspaceAccess?.locationAccess ??
    workspaceAccess?.membership?.locationAccess ??
    null;
  const canAccessAllLocations =
    isWorkspaceOwner(workspaceAccess) ||
    workspaceAccess?.isPlatformBypass === true ||
    !locationAccess ||
    locationAccess.mode !== "selected";
  const assignedLocationIds = useMemo(
    () =>
      new Set(
        Array.isArray(locationAccess?.locationIds)
          ? locationAccess.locationIds.map(String)
          : [],
      ),
    [locationAccess],
  );
  const {
    data: locationsResponse,
    isLoading: isLoadingLocations,
    isError: isLocationsError,
    refetch: refetchLocations,
  } = useGetLocationsQuery({
    limit: 100,
  });
  const locations = useMemo(() => {
    const available = normalizeLocationsResponse(locationsResponse);
    return canAccessAllLocations || assignedLocationIds.size === 0
      ? available
      : available.filter((location) =>
          assignedLocationIds.has(String(location.id)),
        );
  }, [assignedLocationIds, canAccessAllLocations, locationsResponse]);
  const defaultLocationId = useMemo(() => {
    const activeId = String(activeStudioId || "");
    if (
      activeId &&
      (canAccessAllLocations ||
        assignedLocationIds.size === 0 ||
        assignedLocationIds.has(activeId))
    ) {
      return activeId;
    }
    return (
      getResourceId(getPrimaryLocation(locations)) ||
      [...assignedLocationIds][0] ||
      ""
    );
  }, [activeStudioId, assignedLocationIds, canAccessAllLocations, locations]);
  const initialPersistedId = getResourceId(automation);
  const persistedIdRef = useRef(initialPersistedId);
  const [persistedId, setPersistedId] = useState(initialPersistedId);
  const editing = Boolean(persistedId);
  const [form, setForm] = useState(() => {
    const normalized = {
      ...normalizeAutomationForm(automation),
      senderEmail:
        senderEmailId || normalizeAutomationForm(automation).senderEmail,
    };
    return canAccessAllLocations
      ? normalized
      : {
          ...normalized,
          appliesToAllLocations: false,
          location: normalized.location || defaultLocationId,
        };
  });
  const [initialSnapshot] = useState(() => JSON.stringify(form));
  const [offsetOptions] = useState(() =>
    // Keep saved custom timings available, including after choosing a preset.
    [...new Set([...OFFSET_MINUTE_OPTIONS, form.minutesOffset])].sort(
      (a, b) => a - b,
    ),
  );
  const [feedback, setFeedback] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientLocale, setRecipientLocale] = useState("cs");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [submitIntent, setSubmitIntent] = useState(null);
  const [createAutomation, { isLoading: isCreating }] =
    useCreateCommunicationAutomationMutation();
  const [updateAutomation, { isLoading: isUpdating }] =
    useUpdateCommunicationAutomationMutation();
  const [lookupRecipient, { isFetching: isLookingUpRecipient }] =
    useLazyLookupCommunicationRecipientQuery();
  const isSaving = isCreating || isUpdating;
  const effectiveForm = useMemo(() => {
    const scopedForm = canAccessAllLocations
      ? form
      : {
          ...form,
          appliesToAllLocations: false,
          location:
            form.location &&
            (assignedLocationIds.size === 0 ||
              assignedLocationIds.has(String(form.location)))
              ? form.location
              : defaultLocationId,
        };
    return {
      ...scopedForm,
      // Transitional backend compatibility: resolve the managed singleton
      // server-side identity without exposing a sender selector to users.
      senderEmail: senderEmailId || scopedForm.senderEmail,
    };
  }, [
    assignedLocationIds,
    canAccessAllLocations,
    defaultLocationId,
    form,
    senderEmailId,
  ]);
  const templates = useMemo(
    () =>
      emailTemplates.filter(
        (template) =>
          template?.isActive !== false ||
          getResourceId(template) === form.templateId,
      ),
    [emailTemplates, form.templateId],
  );
  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => getResourceId(template) === form.templateId),
    [form.templateId, templates],
  );
  const editorContent = useMemo(
    () => normalizeAutomationContent(form, selectedTemplate),
    [form, selectedTemplate],
  );
  const validationForm = useMemo(
    () => ({
      ...effectiveForm,
      ...editorContent,
      // Validate the resolved template content, while saving untouched inline
      // content below so a timing-only edit retains its template reference.
      ...(selectedTemplate
        ? {
            templateId: null,
          }
        : {}),
    }),
    [effectiveForm, editorContent, selectedTemplate],
  );
  const invalidContentLocales = getInvalidEmailContentLocales(validationForm);
  const hasLocationScopedUnsupportedTrigger =
    !effectiveForm.appliesToAllLocations &&
    !LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES.includes(effectiveForm.scheduleType);
  const validation = useMemo(() => {
    const errors = validateAutomationForm(validationForm);
    if (hasLocationScopedUnsupportedTrigger) {
      errors.scheduleType = "locationScope";
    }
    return errors;
  }, [validationForm, hasLocationScopedUnsupportedTrigger]);
  const availableScheduleGroups = useMemo(
    () =>
      effectiveForm.appliesToAllLocations
        ? SCHEDULE_GROUPS
        : SCHEDULE_GROUPS.map((group) => ({
            ...group,
            types: group.types.filter((type) =>
              LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES.includes(type),
            ),
          })).filter((group) => group.types.length > 0),
    [effectiveForm.appliesToAllLocations],
  );
  const canSubmit = Object.keys(validation).length === 0;
  const isDirty = JSON.stringify(form) !== initialSnapshot;
  const requiresAudience = BULK_SCHEDULES.has(form.scheduleType);
  const requiresOffset = OFFSET_EMAIL_SCHEDULE_TYPES.includes(
    form.scheduleType,
  );
  const isBookingTrigger = BOOKING_EMAIL_SCHEDULE_TYPES.includes(
    form.scheduleType,
  );
  const hasUnsupportedTrigger = UNSUPPORTED_EMAIL_SCHEDULE_TYPES.includes(
    form.scheduleType,
  );
  const hasUnsupportedPurpose = UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES.includes(
    form.purpose,
  );
  const update = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  const requestClose = () => {
    if (!isDirty || isSaving) {
      if (!isSaving) onClose?.();
      return;
    }
    setShowDiscardConfirm(true);
  };
  const chooseTemplate = (templateId) => {
    if (!templateId) {
      update("templateId", "");
      return;
    }
    const template = templates.find(
      (item) => getResourceId(item) === templateId,
    );
    if (!template) return;
    const content = normalizeContentVariants(template);
    setForm((current) => ({
      ...current,
      templateId,
      defaultLocale: content.defaultLocale,
      variants: content.variants,
    }));
  };
  const addRecipient = async () => {
    const search = recipientInput.trim();
    if (!search) return;
    setFeedback("");
    try {
      const response = await lookupRecipient(search).unwrap();
      const user = response?.user ?? response?.data ?? response;
      if (!user?._id || !user?.email)
        throw new Error(t("errors.recipientNotFound"));
      const duplicate = form.recipients.some(
        (recipient) =>
          getResourceId(recipient.user) === user._id ||
          String(recipient.email).toLowerCase() ===
            String(user.email).toLowerCase(),
      );
      if (duplicate) {
        setFeedback(t("errors.recipientDuplicate"));
        return;
      }
      update("recipients", [
        ...form.recipients,
        {
          user: user._id,
          email: user.email,
          customId: user.customId || "",
          name: `${user.firstName || user.firstname || ""} ${user.lastName || user.lastname || ""}`.trim(),
          locale: recipientLocale,
        },
      ]);
      setRecipientInput("");
    } catch (error) {
      setFeedback(getErrorMessage(error, t("errors.recipientNotFound")));
    }
  };
  const save = async ({ activate = false } = {}) => {
    if (!canSubmit || isSaving) return;
    const saveState = resolveCommunicationAutomationSaveState({
      activate,
      managedReady,
      currentlyActive: form.isActive,
      currentStatus: form.automationStatus,
    });
    if (!saveState.allowed) {
      setFeedback(emailT("automation.setupRequired"));
      return;
    }
    setSubmitIntent(activate ? "activate" : "save");
    setFeedback("");
    try {
      const payload = buildAutomationPayload({
        ...effectiveForm,
        isActive: saveState.isActive,
        automationStatus: saveState.automationStatus,
      });
      await persistCommunicationAutomation({
        persistedId: persistedIdRef.current,
        payload,
        activate,
        createAutomation: (body) => createAutomation(body).unwrap(),
        updateAutomation: (body) => updateAutomation(body).unwrap(),
        onPersisted: (id) => {
          persistedIdRef.current = id;
          setPersistedId(id);
        },
        missingIdMessage: t("errors.activationMissingId"),
      });
      onClose?.();
    } catch (error) {
      setFeedback(
        getErrorMessage(
          error,
          activate ? t("errors.activate") : t("errors.save"),
        ),
      );
    } finally {
      setSubmitIntent(null);
    }
  };
  return (
    <Dialog open onClose={requestClose} className="relative z-[110]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport>
        <WorkspaceDialogPanel size="xlarge">
          <header className="shrink-0 border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt-700">
                  {t("eyebrow")}
                </p>
                <DialogTitle className="mt-0.5 truncate text-xl font-semibold tracking-[-0.025em] text-[#1f1a17] sm:text-2xl">
                  {editing ? t("titles.edit") : t("titles.create")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={requestClose}
                disabled={isSaving}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black/50 transition hover:border-black/20 hover:text-black disabled:opacity-50"
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <Field
                    label={t("fields.name")}
                    error={validation.name ? t("errors.name") : ""}
                  >
                    <input
                      value={form.name}
                      onChange={(event) => update("name", event.target.value)}
                      maxLength={160}
                      placeholder={t("fields.namePlaceholder")}
                      className={workspaceInputClass}
                    />
                  </Field>

                  <div className="rounded-[14px] border border-line bg-sand-50 px-3.5 py-3 text-[12px]">
                    <p className="font-semibold text-ink-muted">
                      {emailT("identity.from")}
                    </p>
                    <p className="mt-1 break-all text-ink">
                      {managedSetup.senderName ||
                        emailT("identity.defaultName")}{" "}
                      {"<"}
                      {managedSetup.fromAddress || "—"}
                      {">"}
                    </p>
                    <p className="mt-1 break-all text-ink-muted">
                      {emailT("identity.replyTo")}:{" "}
                      {managedSetup.replyToEmail || "—"}
                    </p>
                    {validation.senderEmail ? (
                      <p role="alert" className="mt-2 text-red-700">
                        {t("errors.sender")}
                      </p>
                    ) : null}
                  </div>

                  <Field
                    label={t("fields.trigger")}
                    error={
                      validation.scheduleType
                        ? t(
                            hasLocationScopedUnsupportedTrigger
                              ? "errors.locationScopedTrigger"
                              : "errors.unsupportedTrigger",
                          )
                        : ""
                    }
                  >
                    <select
                      value={form.scheduleType}
                      onChange={(event) => {
                        const scheduleType = event.target.value;
                        setForm((current) => ({
                          ...current,
                          scheduleType,
                          connectedProductType: normalizeConnectedProductType(
                            scheduleType,
                            current.connectedProductType,
                          ),
                        }));
                      }}
                      className={workspaceInputClass}
                    >
                      {hasUnsupportedTrigger ||
                      hasLocationScopedUnsupportedTrigger ? (
                        <option value={form.scheduleType} disabled>
                          {t(`triggers.${form.scheduleType}`)} —{" "}
                          {t(
                            hasLocationScopedUnsupportedTrigger
                              ? "errors.locationScopedTrigger"
                              : "errors.unsupportedTrigger",
                          )}
                        </option>
                      ) : null}
                      {availableScheduleGroups.map((group) => (
                        <optgroup
                          key={group.id}
                          label={t(`triggerGroups.${group.id}`)}
                        >
                          {group.types.map((type) => (
                            <option key={type} value={type}>
                              {t(`triggers.${type}`)}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </Field>

                  <Field label={t("fields.template")}>
                    <select
                      value={form.templateId}
                      onChange={(event) => chooseTemplate(event.target.value)}
                      className={workspaceInputClass}
                    >
                      <option value="">{t("fields.noTemplate")}</option>
                      {templates.map((template) => (
                        <option
                          key={getResourceId(template)}
                          value={getResourceId(template)}
                        >
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label={t("fields.purpose")}
                    error={
                      validation.purpose ? t("errors.unsupportedPurpose") : ""
                    }
                  >
                    <select
                      value={form.purpose}
                      onChange={(event) =>
                        update("purpose", event.target.value)
                      }
                      className={workspaceInputClass}
                    >
                      <option value="transactional">
                        {t("purposes.transactional")}
                      </option>
                      {hasUnsupportedPurpose ? (
                        <option value="marketing" disabled>
                          {t("purposes.marketing")} —{" "}
                          {t("errors.unsupportedPurpose")}
                        </option>
                      ) : null}
                    </select>
                    <span className="mt-1 block text-xs normal-case tracking-normal text-black/45">
                      {t(`purposes.${form.purpose}Hint`)}
                    </span>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {canAccessAllLocations ? (
                    <Toggle
                      label={t("fields.allLocations")}
                      description={t("fields.allLocationsHint")}
                      checked={effectiveForm.appliesToAllLocations}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          appliesToAllLocations: value,
                          location: value
                            ? ""
                            : current.location || defaultLocationId,
                        }))
                      }
                    />
                  ) : (
                    <div className="rounded-2xl border border-cobalt-200 bg-cobalt-50 px-4 py-3 text-sm text-cobalt-800">
                      {t("fields.assignedLocationHint")}
                    </div>
                  )}

                  {!effectiveForm.appliesToAllLocations ? (
                    <Field
                      label={t("fields.location")}
                      error={validation.location ? t("errors.location") : ""}
                    >
                      <select
                        value={effectiveForm.location}
                        onChange={(event) =>
                          update("location", event.target.value)
                        }
                        disabled={isLoadingLocations && !defaultLocationId}
                        className={workspaceInputClass}
                      >
                        <option value="">
                          {isLoadingLocations
                            ? t("fields.locationsLoading")
                            : t("fields.locationPlaceholder")}
                        </option>
                        {defaultLocationId &&
                        !locations.some(
                          (location) =>
                            String(location.id) === defaultLocationId,
                        ) ? (
                          <option value={defaultLocationId}>
                            {t("fields.activeLocation")}
                          </option>
                        ) : null}
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name || t("fields.unnamedLocation")}
                          </option>
                        ))}
                      </select>
                      {isLocationsError ? (
                        <button
                          type="button"
                          onClick={refetchLocations}
                          className="mt-2 text-xs normal-case tracking-normal text-red-700 underline"
                        >
                          {t("fields.locationsRetry")}
                        </button>
                      ) : null}
                    </Field>
                  ) : null}
                </div>

                {requiresOffset ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {isBookingTrigger ? (
                      <Field label={t("fields.productType")}>
                        <select
                          value={form.connectedProductType}
                          onChange={(event) =>
                            update("connectedProductType", event.target.value)
                          }
                          className={workspaceInputClass}
                        >
                          {BOOKING_CONNECTED_PRODUCT_TYPES.filter(
                            // Preserve existing filters without offering the
                            // retired Open Studio option for new automations.
                            (type) =>
                              type !== "workshop" ||
                              form.connectedProductType === "workshop",
                          ).map((type) => (
                            <option key={type} value={type}>
                              {t(`productTypes.${type}`)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                    <Field
                      label={t("fields.offset")}
                      error={validation.minutesOffset ? t("errors.offset") : ""}
                    >
                      <select
                        value={form.minutesOffset}
                        onChange={(event) =>
                          update("minutesOffset", Number(event.target.value))
                        }
                        className={workspaceInputClass}
                      >
                        {offsetOptions.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes === 0
                              ? t("fields.offsetImmediately")
                              : t("fields.offsetMinutes", {
                                  minutes,
                                })}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs normal-case tracking-normal text-black/45">
                        {t(
                          isBookingTrigger
                            ? `fields.offsetHints.${form.scheduleType}`
                            : "fields.offsetHint",
                        )}
                      </span>
                    </Field>
                  </div>
                ) : null}

                <ScheduleFields
                  form={form}
                  update={update}
                  error={validation.oneTimeSendAt ? t("errors.sendAt") : ""}
                  t={t}
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Toggle
                    label={t("fields.respectQuietHours")}
                    description={t("fields.respectQuietHoursHint")}
                    checked={form.respectQuietHours}
                    onChange={(value) => update("respectQuietHours", value)}
                  />
                  <Toggle
                    label={t("fields.cancelOnReschedule")}
                    description={t("fields.cancelOnRescheduleHint")}
                    checked={form.cancelOnReschedule}
                    onChange={(value) => update("cancelOnReschedule", value)}
                  />
                </div>
              </WorkspaceFormSection>

              {requiresAudience ? (
                <AudienceEditor
                  form={form}
                  update={update}
                  input={recipientInput}
                  setInput={setRecipientInput}
                  locale={recipientLocale}
                  setLocale={setRecipientLocale}
                  addRecipient={addRecipient}
                  isLookingUp={isLookingUpRecipient}
                  error={validation.recipients ? t("errors.recipients") : ""}
                  t={t}
                />
              ) : null}

              {selectedTemplate ? (
                <div className="rounded-2xl border border-cobalt-200 bg-cobalt-50 px-4 py-3 text-sm text-cobalt-800">
                  {t("templateApplied", {
                    name: selectedTemplate.name,
                  })}
                </div>
              ) : null}

              {validation.content ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  {t("errors.content")}
                </div>
              ) : null}

              <LocalizedEmailEditor
                value={editorContent}
                invalidLocales={invalidContentLocales}
                onChange={(content) =>
                  setForm((current) => ({
                    ...current,
                    ...content,
                  }))
                }
                previewLayout={selectedTemplate}
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
              disabled={isSaving}
              className={workspaceSecondaryButtonClass}
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() =>
                save({
                  activate: false,
                })
              }
              disabled={isSaving || !canSubmit}
              className={workspaceSecondaryButtonClass}
            >
              {isSaving && submitIntent === "save"
                ? t("actions.saving")
                : editing
                  ? t("actions.save")
                  : t("actions.saveDraft")}
            </button>
            {!form.isActive || mode === "activate" ? (
              <button
                type="button"
                onClick={() =>
                  save({
                    activate: true,
                  })
                }
                disabled={isSaving || !canSubmit || !managedReady}
                title={
                  managedReady ? undefined : emailT("automation.setupRequired")
                }
                className={workspacePrimaryButtonClass}
              >
                {isSaving && submitIntent === "activate"
                  ? t("actions.activating")
                  : t("actions.activate")}
              </button>
            ) : null}
          </WorkspaceFormActions>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
function ScheduleFields({ form, update, error, t }) {
  const recurring = ["daily", "weekly", "monthly"].includes(form.scheduleType);
  if (
    !["oneTimeEmail", "daily", "weekly", "monthly"].includes(form.scheduleType)
  )
    return null;
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-3">
      {form.scheduleType === "oneTimeEmail" ? (
        <Field label={t("fields.sendAt")} error={error}>
          <input
            type="datetime-local"
            value={form.oneTimeSendAt}
            onChange={(event) => update("oneTimeSendAt", event.target.value)}
            className={workspaceInputClass}
          />
        </Field>
      ) : null}
      {recurring ? (
        <Field label={t("fields.sendTime")}>
          <input
            type="time"
            value={form.sendTime}
            onChange={(event) => update("sendTime", event.target.value)}
            className={workspaceInputClass}
          />
        </Field>
      ) : null}
      {form.scheduleType === "weekly" ? (
        <Field label={t("fields.dayOfWeek")}>
          <select
            value={form.dayOfWeek}
            onChange={(event) => update("dayOfWeek", event.target.value)}
            className={workspaceInputClass}
          >
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {t(`days.${day}`)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {form.scheduleType === "monthly" ? (
        <Field label={t("fields.dayOfMonth")}>
          <input
            type="number"
            min="1"
            max="31"
            value={form.dayOfMonth}
            onChange={(event) =>
              update("dayOfMonth", Number(event.target.value))
            }
            className={workspaceInputClass}
          />
        </Field>
      ) : null}
    </div>
  );
}
function AudienceEditor({
  form,
  update,
  input,
  setInput,
  locale,
  setLocale,
  addRecipient,
  isLookingUp,
  error,
  t,
}) {
  return (
    <WorkspaceFormSection>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-[#1f1a17]">
            {t("audience.title")}
          </h3>
          <p className="mt-1 text-sm text-[#7f756d]">
            {t("audience.description")}
          </p>
        </div>
        <Toggle
          label={t("audience.all")}
          description={t("audience.allHint")}
          checked={form.sendToAllRecipients}
          onChange={(value) => update("sendToAllRecipients", value)}
          compact
        />
      </div>

      {!form.sendToAllRecipients ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addRecipient();
                }
              }}
              placeholder={t("audience.searchPlaceholder")}
              className={workspaceInputClass}
            />
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              aria-label={t("audience.language")}
              className={workspaceInputClass}
            >
              {EMAIL_LOCALES.map((item) => (
                <option key={item} value={item}>
                  {t(`languages.${item}`)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRecipient}
              disabled={isLookingUp || !input.trim()}
              className={workspacePrimaryButtonClass}
            >
              <PlusIcon className="h-4 w-4" />
              {isLookingUp ? t("audience.searching") : t("audience.add")}
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-4 grid gap-2 lg:grid-cols-2">
            {form.recipients.map((recipient, index) => (
              <div
                key={`${recipient.email}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#fbfaf8] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1f1a17]">
                    {recipient.name || recipient.email}
                  </p>
                  <p className="truncate text-xs text-[#7f756d]">
                    {recipient.email} ·{" "}
                    {t(`languages.${recipient.locale || "cs"}`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "recipients",
                      form.recipients.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  aria-label={t("audience.remove")}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-danger transition hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("audience.broadcastWarning")}
        </div>
      )}
    </WorkspaceFormSection>
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
function Toggle({ label, description, checked, onChange, compact = false }) {
  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-[16px] border border-line bg-sand-50 px-4 py-3 ${compact ? "sm:max-w-md" : ""}`}
    >
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
        className="h-5 w-5 shrink-0 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500"
      />
    </label>
  );
}
