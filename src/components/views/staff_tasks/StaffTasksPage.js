"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useAiAccess } from "@/components/auth/AiFeatureBoundary";
import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getPrimaryLocation,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import {
  useGenerateStaffPlanningBriefingMutation,
  useGenerateStaffPlanningDailyDraftMutation,
  useGetStaffPlanningOverviewQuery,
  useSaveStaffDailyUpdateMutation,
  useSaveStaffMonthlyPrioritiesMutation,
  useSaveStaffWeeklyPlanMutation,
  useUpdateStaffPlanningAttentionMutation,
  useUpdateStaffPlanningMemberScheduleMutation,
  useUpdateStaffPlanningSettingsMutation,
} from "@/lib/features/staffPlanning/staffPlanningApiSlice";
import {
  useCreateStaffTaskMutation,
  useDeleteStaffTaskMutation,
  useGetStaffTasksQuery,
  useUpdateStaffTaskMutation,
} from "@/lib/features/staffTasks/staffTasksApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import {
  formatPlanningDate,
  getEntityId,
  getMutationError,
  getPlanningDateKey,
  normalizeAiPlanningResult,
  normalizeStaffPlanningOverview,
  normalizeStaffTasks,
} from "./staffPlanning.utils";

const STATUS_COLUMNS = ["todo", "in-progress", "waiting", "done"];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const MAX_WEEKLY_OUTCOMES = 3;
const MAX_MONTHLY_PRIORITIES = 5;
const STAFF_PLANNING_TABS_ID = "staff-planning-sections";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const normalizeLocationAccess = (access) => {
  const source = access?.locationAccess ?? access?.membership?.locationAccess;
  const mode = String(source?.mode || "").toLowerCase();
  const ids = Array.isArray(source?.locationIds)
    ? source.locationIds.map(String)
    : [];

  return { mode, ids: new Set(ids) };
};

const toTaskOption = (task) => ({
  id: getEntityId(task),
  title: String(task?.title || ""),
  locationId: getEntityId(task?.locationId ?? task?.location),
  appliesToAllLocations: task?.appliesToAllLocations === true,
});

const tasksForPlanningLocation = (tasks, locationId) =>
  tasks.filter(
    (task) =>
      task.appliesToAllLocations ||
      !task.locationId ||
      (locationId && String(task.locationId) === String(locationId)),
  );

function LoadingState({ label }) {
  return (
    <div
      className="flex min-h-64 items-center justify-center rounded-[24px] border border-line bg-white"
      role="status"
    >
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ErrorState({ title, description, retry, retryLabel }) {
  return (
    <section className="rounded-[24px] border border-danger/20 bg-danger-soft p-6 text-center">
      <ExclamationTriangleIcon
        className="mx-auto h-7 w-7 text-danger"
        aria-hidden="true"
      />
      <h2 className="mt-3 text-sm font-semibold text-danger">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-danger/80">{description}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 min-h-10 rounded-full bg-danger px-4 text-xs font-semibold text-white"
      >
        {retryLabel}
      </button>
    </section>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-[18px] border border-dashed border-line-strong bg-sand-50/60 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-ink-muted">{description}</p>
    </div>
  );
}

function SectionCard({ title, description, action, children, className = "" }) {
  return (
    <section
      className={cx(
        "rounded-[24px] border border-line bg-white p-5 shadow-card sm:p-6",
        className,
      )}
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.025em] text-ink">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Feedback({ value }) {
  if (!value?.text) return null;

  return (
    <p
      className={cx(
        "mt-3 rounded-[14px] px-4 py-3 text-xs",
        value.tone === "success"
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger",
      )}
      role={value.tone === "success" ? "status" : "alert"}
    >
      {value.text}
    </p>
  );
}

function TaskPicker({ tasks, selected, onChange, label, emptyLabel }) {
  const available = tasks.filter((task) => task.id && task.title);

  if (!available.length) {
    return <p className="text-xs text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <fieldset>
      <legend className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {available.map((task) => {
          const checked = selected.includes(task.id);
          return (
            <label
              key={task.id}
              className={cx(
                "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[12px] transition",
                checked
                  ? "border-cobalt-300 bg-cobalt-50 text-cobalt-700"
                  : "border-line bg-white text-ink-muted hover:border-line-strong",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  onChange(
                    checked
                      ? selected.filter((id) => id !== task.id)
                      : [...selected, task.id],
                  )
                }
                className="h-3.5 w-3.5 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500"
              />
              <span className="max-w-52 truncate">{task.title}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AiResult({ result, t }) {
  if (!result) return null;

  const groups = [
    ["highlights", t("ai.highlights")],
    ["attention", t("ai.attention")],
    ["recommendations", t("ai.recommendations")],
    ["dataLimitations", t("ai.limitations")],
  ];

  return (
    <div className="mt-4 rounded-[18px] border border-cobalt-100 bg-cobalt-50/45 p-4">
      {result.headline ? (
        <h3 className="text-sm font-semibold text-ink">{result.headline}</h3>
      ) : null}
      {result.summary ? (
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          {result.summary}
        </p>
      ) : null}
      {groups.map(([key, label]) =>
        result[key]?.length ? (
          <div key={key} className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cobalt-700">
              {label}
            </p>
            <ul className="mt-2 space-y-2">
              {result[key].map((item, index) => (
                <li
                  key={`${key}-${index}`}
                  className="flex gap-2 text-xs leading-5 text-ink"
                >
                  <ChevronRightIcon
                    className="mt-0.5 h-4 w-4 shrink-0 text-cobalt-500"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

function AiBriefingCard({
  cadence,
  date,
  locationId,
  locale,
  access,
  filterKey,
  result,
  setResult,
  t,
}) {
  const [generate, state] = useGenerateStaffPlanningBriefingMutation();

  const submit = async () => {
    setResult({ filterKey, data: null, error: "" });
    try {
      const response = await generate({
        cadence,
        date,
        ...(locationId ? { locationId } : {}),
        locale,
      }).unwrap();
      setResult({
        filterKey,
        data: normalizeAiPlanningResult(response),
        error: "",
      });
    } catch (error) {
      setResult({
        filterKey,
        data: null,
        error: getMutationError(error, t("ai.error")),
      });
    }
  };

  return (
    <SectionCard
      title={t(`ai.${cadence}.title`)}
      description={t(`ai.${cadence}.description`)}
      action={
        access.available ? (
          <button
            type="button"
            onClick={submit}
            disabled={state.isLoading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-4 text-xs font-semibold text-cobalt-700 transition hover:border-cobalt-300 disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            {state.isLoading ? t("ai.generating") : t("ai.generate")}
          </button>
        ) : null
      }
    >
      {access.isLoading ? (
        <p className="text-xs text-ink-muted">{t("ai.checking")}</p>
      ) : !access.available ? (
        <div className="flex items-start gap-3 rounded-[16px] bg-sand-50 p-4">
          <SparklesIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted"
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold text-ink">{t("ai.optional")}</p>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              {t("ai.unavailable")}
            </p>
          </div>
        </div>
      ) : (
        <>
          {!result?.data && !result?.error ? (
            <p className="text-xs leading-5 text-ink-muted">{t("ai.ready")}</p>
          ) : null}
          {result?.error ? (
            <p
              className="rounded-[14px] bg-danger-soft p-4 text-xs text-danger"
              role="alert"
            >
              {result.error}
            </p>
          ) : null}
          <AiResult result={result?.data} t={t} />
        </>
      )}
    </SectionCard>
  );
}

function DailyUpdateForm({
  date,
  update,
  canSubmit,
  canLinkTasks,
  tasks,
  aiAccess,
  allowAiDraft,
  locationId,
  locations,
  locale,
  t,
}) {
  const emptyForm = {
    focusToday: "",
    completedSinceLast: "",
    blockers: "",
    notWorkingToday: false,
    needsOwnerAttention: false,
    linkedTaskIds: [],
    submissionLocationId: locationId || locations[0]?.id || "",
  };
  const [form, setForm] = useState(() =>
    update
      ? {
          focusToday: update.focusToday,
          completedSinceLast: update.completedSinceLast,
          blockers: update.blockers,
          notWorkingToday: update.notWorkingToday,
          needsOwnerAttention: update.needsOwnerAttention,
          linkedTaskIds: update.linkedTaskIds,
          submissionLocationId:
            update.locationId || locationId || locations[0]?.id || "",
        }
      : emptyForm,
  );
  const [feedback, setFeedback] = useState(null);
  const [save, saveState] = useSaveStaffDailyUpdateMutation();
  const [draft, draftState] = useGenerateStaffPlanningDailyDraftMutation();
  const compatibleTasks = tasksForPlanningLocation(
    tasks,
    form.submissionLocationId,
  );

  if (!canSubmit) {
    return (
      <EmptyState
        title={t("today.noSubmit.title")}
        description={t("today.noSubmit.description")}
      />
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);

    if (!form.notWorkingToday && !form.focusToday.trim()) {
      setFeedback({ tone: "error", text: t("today.form.focusRequired") });
      return;
    }

    if (
      !form.notWorkingToday &&
      form.needsOwnerAttention &&
      !form.blockers.trim()
    ) {
      setFeedback({
        tone: "error",
        text: t("today.form.attentionNeedsBlocker"),
      });
      return;
    }

    try {
      await save({
        date,
        focusToday: form.notWorkingToday ? "" : form.focusToday.trim(),
        completedSinceLast: form.notWorkingToday
          ? ""
          : form.completedSinceLast.trim(),
        blockers: form.notWorkingToday ? "" : form.blockers.trim(),
        notWorkingToday: form.notWorkingToday,
        needsOwnerAttention: form.notWorkingToday
          ? false
          : form.needsOwnerAttention,
        ...(canLinkTasks
          ? {
              linkedTaskIds: form.notWorkingToday ? [] : form.linkedTaskIds,
            }
          : {}),
        locationId: form.submissionLocationId || null,
      }).unwrap();
      setFeedback({ tone: "success", text: t("today.form.saved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("today.form.saveError")),
      });
    }
  };

  const createDraft = async () => {
    setFeedback(null);
    try {
      const response = await draft({
        date,
        locationId: form.submissionLocationId || null,
        locale,
      }).unwrap();
      const value = response?.draft ?? response?.dailyUpdate ?? response;
      const visibleTaskIds = new Set(compatibleTasks.map((task) => task.id));
      const suggestedTaskIds = [
        ...(Array.isArray(value?.linkedTaskIds) ? value.linkedTaskIds : []),
        ...(Array.isArray(value?.focusTaskIds) ? value.focusTaskIds : []),
        ...(Array.isArray(value?.completedTaskIds)
          ? value.completedTaskIds
          : []),
        ...(Array.isArray(value?.blockerTaskIds) ? value.blockerTaskIds : []),
      ]
        .map(String)
        .filter((id) => visibleTaskIds.has(id));
      setForm((current) => ({
        ...current,
        focusToday: String(value?.focusToday ?? value?.focus ?? ""),
        completedSinceLast: String(
          value?.completedSinceLast ?? value?.completed ?? "",
        ),
        blockers: String(value?.blockers ?? ""),
        needsOwnerAttention: value?.needsOwnerAttention === true,
        linkedTaskIds: suggestedTaskIds.length
          ? [...new Set(suggestedTaskIds)]
          : current.linkedTaskIds,
      }));
      setFeedback({ tone: "success", text: t("today.form.draftReady") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("today.form.draftError")),
      });
    }
  };

  const fieldClass =
    "mt-2 w-full rounded-[16px] border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-cobalt-400 focus:ring-2 focus:ring-cobalt-100 disabled:bg-sand-50";

  return (
    <form onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {update ? t("today.form.editing") : t("today.form.new")}
        </p>
        {aiAccess.available && allowAiDraft ? (
          <button
            type="button"
            onClick={createDraft}
            disabled={draftState.isLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cobalt-200 px-3 text-[12px] font-semibold text-cobalt-700 disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
            {draftState.isLoading
              ? t("today.form.drafting")
              : t("today.form.aiDraft")}
          </button>
        ) : null}
      </div>

      <label className="mt-5 block text-xs font-semibold text-ink">
        {t("today.form.focus")}
        <span className="ml-1 text-coral-600" aria-hidden="true">
          *
        </span>
        <textarea
          value={form.focusToday}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              focusToday: event.target.value,
            }))
          }
          disabled={form.notWorkingToday}
          required={!form.notWorkingToday}
          maxLength={2000}
          rows={3}
          placeholder={t("today.form.focusPlaceholder")}
          className={fieldClass}
        />
      </label>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block text-xs font-semibold text-ink">
          {t("today.form.completed")}
          <textarea
            value={form.completedSinceLast}
            disabled={form.notWorkingToday}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                completedSinceLast: event.target.value,
              }))
            }
            maxLength={2000}
            rows={3}
            placeholder={t("today.form.completedPlaceholder")}
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-semibold text-ink">
          {t("today.form.blockers")}
          <textarea
            value={form.blockers}
            disabled={form.notWorkingToday}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                blockers: event.target.value,
              }))
            }
            maxLength={2000}
            rows={3}
            placeholder={t("today.form.blockersPlaceholder")}
            className={fieldClass}
          />
        </label>
      </div>

      {canLinkTasks && !form.notWorkingToday ? (
        <div className="mt-4">
          <TaskPicker
            tasks={compatibleTasks}
            selected={form.linkedTaskIds}
            onChange={(linkedTaskIds) =>
              setForm((current) => ({ ...current, linkedTaskIds }))
            }
            label={t("common.linkedTasks")}
            emptyLabel={t("common.noTasksToLink")}
          />
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={form.notWorkingToday}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                notWorkingToday: event.target.checked,
                ...(event.target.checked ? { needsOwnerAttention: false } : {}),
              }))
            }
            className="h-4 w-4 rounded border-line-strong text-cobalt-500 focus:ring-cobalt-500"
          />
          {t("today.form.notWorking")}
        </label>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={form.needsOwnerAttention}
            disabled={form.notWorkingToday}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                needsOwnerAttention: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-line-strong text-coral-600 focus:ring-coral-500"
          />
          {t("today.form.needsAttention")}
        </label>
      </div>

      {!locationId && locations.length > 1 ? (
        <label className="mt-4 block max-w-sm text-xs font-semibold text-ink">
          {t("today.form.updateLocation")}
          <select
            required
            value={form.submissionLocationId}
            onChange={(event) => {
              const nextLocationId = event.target.value;
              const compatibleTaskIds = new Set(
                tasksForPlanningLocation(tasks, nextLocationId).map(
                  (task) => task.id,
                ),
              );
              setForm((current) => ({
                ...current,
                submissionLocationId: nextLocationId,
                linkedTaskIds: current.linkedTaskIds.filter((taskId) =>
                  compatibleTaskIds.has(taskId),
                ),
              }));
            }}
            className="mt-2 min-h-11 w-full rounded-[14px] border border-line bg-white px-3 text-xs"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <Feedback value={feedback} />

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saveState.isLoading}
          className="min-h-11 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:opacity-50"
        >
          {saveState.isLoading
            ? t("common.saving")
            : update
              ? t("today.form.update")
              : t("today.form.submit")}
        </button>
      </div>
    </form>
  );
}

function StaffDailyOverview({ staff, canManage, t }) {
  const [updateAttention, attentionState] =
    useUpdateStaffPlanningAttentionMutation();
  const [feedback, setFeedback] = useState(null);

  const stateClass = {
    submitted: "bg-success-soft text-success",
    missing: "bg-danger-soft text-danger",
    waiting: "bg-cobalt-50 text-cobalt-700",
    blocked: "bg-warning-soft text-warning",
    attention: "bg-warning-soft text-warning",
    "needs-attention": "bg-warning-soft text-warning",
    "not-working": "bg-sand-100 text-ink-muted",
    "not-expected": "bg-sand-100 text-ink-muted",
    "not-linked": "bg-sand-100 text-ink-muted",
  };

  const handleAttention = async (updateId, status) => {
    setFeedback(null);
    try {
      await updateAttention({ updateId, status }).unwrap();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("today.team.attentionError")),
      });
    }
  };

  if (!staff.length) {
    return (
      <EmptyState
        title={t("today.team.emptyTitle")}
        description={t("today.team.emptyDescription")}
      />
    );
  }

  return (
    <>
      <Feedback value={feedback} />
      <div className="grid gap-3 md:grid-cols-2">
        {staff.map((member) => {
          const update = member.update;
          const attentionActive =
            update?.needsOwnerAttention &&
            update.attentionStatus !== "resolved";
          const attentionAcknowledged =
            update?.attentionStatus === "acknowledged";
          return (
            <article
              key={member.id}
              className="rounded-[18px] border border-line bg-sand-50/45 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-[12px] text-ink-muted">
                    {member.isExpectedToday
                      ? t("today.team.expected")
                      : t("today.team.notExpected")}
                  </p>
                </div>
                <span
                  className={cx(
                    "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    stateClass[member.state] ?? "bg-sand-100 text-ink-muted",
                  )}
                >
                  {t(`today.states.${member.state}`)}
                </span>
              </div>

              {update?.focusToday ? (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                    {t("today.team.focus")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink">
                    {update.focusToday}
                  </p>
                </div>
              ) : null}
              {update?.blockers ? (
                <div className="mt-3 rounded-[14px] bg-warning-soft p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-warning">
                    {t("today.team.blockers")}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink">
                    {update.blockers}
                  </p>
                </div>
              ) : null}
              {attentionActive && canManage && update.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!attentionAcknowledged ? (
                    <button
                      type="button"
                      disabled={attentionState.isLoading}
                      onClick={() => handleAttention(update.id, "acknowledged")}
                      className="min-h-10 rounded-full border border-warning/30 px-3 text-[12px] font-semibold text-warning disabled:opacity-50"
                    >
                      {t("today.team.acknowledge")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={attentionState.isLoading}
                    onClick={() => handleAttention(update.id, "resolved")}
                    className="min-h-10 rounded-full bg-success px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {t("today.team.resolve")}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </>
  );
}

function TodayView({
  planning,
  date,
  tasks,
  aiAccess,
  todayKey,
  canUseTaskAi,
  canLinkTasks,
  locationId,
  locations,
  locale,
  aiResult,
  setAiResult,
  filterKey,
  t,
}) {
  const counts = planning.today.counts;
  const metrics = [
    ["submitted", counts.submitted],
    ["waiting", counts.waiting],
    ["missing", counts.missing],
    ["blocked", counts.blocked],
    ["attention", counts.attention],
    ["notWorking", counts.notWorking],
  ];

  return (
    <div className="space-y-5">
      {planning.permissions.canViewTeam ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {metrics.map(([key, value]) => (
            <article
              key={key}
              className="rounded-[20px] border border-line bg-white p-4 shadow-card"
            >
              <p className="text-2xl font-semibold tracking-[-0.04em] text-ink">
                {value}
              </p>
              <p className="mt-1 text-[12px] font-medium text-ink-muted">
                {t(`today.counts.${key}`)}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <SectionCard
          title={t("today.myUpdate.title")}
          description={t("today.myUpdate.description", {
            date: formatPlanningDate(date, locale),
          })}
        >
          <DailyUpdateForm
            key={`${date}:${locationId || "all"}:${
              planning.today.myUpdate?.updatedAt ||
              planning.today.myUpdate?.id ||
              "new"
            }`}
            date={date}
            update={planning.today.myUpdate}
            canSubmit={planning.permissions.canSubmit}
            canLinkTasks={canLinkTasks}
            tasks={tasks}
            aiAccess={aiAccess}
            allowAiDraft={date === todayKey && canUseTaskAi}
            locationId={locationId}
            locations={locations}
            locale={locale}
            t={t}
          />
        </SectionCard>

        {planning.permissions.canViewTeam ? (
          <SectionCard
            title={t("today.team.title")}
            description={t("today.team.description")}
          >
            <StaffDailyOverview
              staff={planning.today.staff}
              canManage={planning.permissions.canManage}
              t={t}
            />
          </SectionCard>
        ) : (
          <SectionCard
            title={t("today.personal.title")}
            description={t("today.personal.description")}
          >
            <div className="flex items-start gap-3 rounded-[16px] bg-sand-50 p-4">
              <UserGroupIcon
                className="mt-0.5 h-5 w-5 text-ink-muted"
                aria-hidden="true"
              />
              <p className="text-xs leading-5 text-ink-muted">
                {t("today.personal.notice")}
              </p>
            </div>
          </SectionCard>
        )}
      </div>

      {planning.permissions.canViewTeam ? (
        <AiBriefingCard
          cadence="day"
          date={date}
          locationId={locationId}
          locale={locale}
          access={aiAccess}
          filterKey={filterKey}
          result={aiResult?.filterKey === filterKey ? aiResult : null}
          setResult={setAiResult}
          t={t}
        />
      ) : null}
    </div>
  );
}

const newOutcome = () => ({
  title: "",
  completed: false,
  linkedTaskIds: [],
});

function WeeklyPlanForm({
  weekStart,
  plan,
  tasks,
  canSubmit,
  canLinkTasks,
  locationId,
  locations,
  t,
}) {
  const [outcomes, setOutcomes] = useState(() => {
    const source = Array.isArray(plan?.outcomes) ? plan.outcomes : [];
    return source.length
      ? source.slice(0, MAX_WEEKLY_OUTCOMES).map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          title: item.title || "",
          completed: item.completed === true,
          linkedTaskIds: Array.isArray(item.linkedTaskIds)
            ? item.linkedTaskIds.map(String)
            : [],
        }))
      : [newOutcome()];
  });
  const [submissionLocationId, setSubmissionLocationId] = useState(
    plan?.locationId || locationId || locations[0]?.id || "",
  );
  const [feedback, setFeedback] = useState(null);
  const [save, state] = useSaveStaffWeeklyPlanMutation();
  const compatibleTasks = tasksForPlanningLocation(tasks, submissionLocationId);

  if (!canSubmit) {
    return (
      <EmptyState
        title={t("week.noSubmit.title")}
        description={t("week.noSubmit.description")}
      />
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const normalized = outcomes
      .map(({ linkedTaskIds, ...outcome }) => ({
        ...outcome,
        title: outcome.title.trim(),
        ...(canLinkTasks ? { linkedTaskIds } : {}),
      }))
      .filter((outcome) => outcome.title);

    setFeedback(null);
    try {
      await save({
        weekStart,
        locationId: submissionLocationId || null,
        outcomes: normalized,
      }).unwrap();
      setFeedback({ tone: "success", text: t("week.form.saved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("week.form.saveError")),
      });
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="space-y-4">
        {outcomes.map((outcome, index) => (
          <div
            key={index}
            className="rounded-[18px] border border-line bg-sand-50/45 p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cobalt-50 text-[10px] font-semibold text-cobalt-700">
                {index + 1}
              </span>
              <input
                value={outcome.title}
                onChange={(event) =>
                  setOutcomes((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  )
                }
                maxLength={240}
                placeholder={t("week.form.outcomePlaceholder")}
                aria-label={t("week.form.outcomeLabel", {
                  number: index + 1,
                })}
                className="min-h-11 min-w-0 flex-1 rounded-[14px] border border-line bg-white px-4 text-sm text-ink outline-none focus:border-cobalt-400"
              />
              <button
                type="button"
                onClick={() =>
                  setOutcomes((current) =>
                    current.length === 1
                      ? [newOutcome()]
                      : current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="rounded-full p-2 text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                aria-label={t("week.form.removeOutcome", {
                  number: index + 1,
                })}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-ink-muted">
              <input
                type="checkbox"
                checked={outcome.completed}
                onChange={(event) =>
                  setOutcomes((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, completed: event.target.checked }
                        : item,
                    ),
                  )
                }
                className="h-4 w-4 rounded border-line-strong text-success focus:ring-success"
              />
              {t("week.form.completed")}
            </label>
            {canLinkTasks ? (
              <div className="mt-3">
                <TaskPicker
                  tasks={compatibleTasks}
                  selected={outcome.linkedTaskIds}
                  onChange={(linkedTaskIds) =>
                    setOutcomes((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, linkedTaskIds } : item,
                      ),
                    )
                  }
                  label={t("common.linkedTasks")}
                  emptyLabel={t("common.noTasksToLink")}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!locationId && locations.length > 1 ? (
        <label className="mt-4 block max-w-sm text-xs font-semibold text-ink">
          {t("week.form.planLocation")}
          <select
            required
            value={submissionLocationId}
            onChange={(event) => {
              const nextLocationId = event.target.value;
              const compatibleTaskIds = new Set(
                tasksForPlanningLocation(tasks, nextLocationId).map(
                  (task) => task.id,
                ),
              );
              setSubmissionLocationId(nextLocationId);
              setOutcomes((current) =>
                current.map((outcome) => ({
                  ...outcome,
                  linkedTaskIds: outcome.linkedTaskIds.filter((taskId) =>
                    compatibleTaskIds.has(taskId),
                  ),
                })),
              );
            }}
            className="mt-2 min-h-11 w-full rounded-[14px] border border-line bg-white px-3 text-xs"
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={outcomes.length >= MAX_WEEKLY_OUTCOMES}
          onClick={() => setOutcomes((current) => [...current, newOutcome()])}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-ink transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t("week.form.add", { maximum: MAX_WEEKLY_OUTCOMES })}
        </button>
        <button
          type="submit"
          disabled={state.isLoading}
          className="min-h-11 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt disabled:opacity-50"
        >
          {state.isLoading ? t("common.saving") : t("week.form.save")}
        </button>
      </div>
      <Feedback value={feedback} />
    </form>
  );
}

function WeeklyTeamOverview({ plans, t }) {
  if (!plans.length) {
    return (
      <EmptyState
        title={t("week.team.emptyTitle")}
        description={t("week.team.emptyDescription")}
      />
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {plans.map((plan) => (
        <article
          key={plan.id}
          className="rounded-[18px] border border-line bg-sand-50/45 p-4"
        >
          <h3 className="text-sm font-semibold text-ink">{plan.name}</h3>
          {plan.outcomes.length ? (
            <ul className="mt-3 space-y-2">
              {plan.outcomes.map((outcome) => (
                <li
                  key={outcome.id}
                  className="flex items-start gap-2 text-xs leading-5 text-ink"
                >
                  <CheckCircleIcon
                    className={cx(
                      "mt-0.5 h-4 w-4 shrink-0",
                      outcome.completed ? "text-success" : "text-ink-faint",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      outcome.completed ? "text-ink-muted line-through" : ""
                    }
                  >
                    {outcome.title}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-ink-muted">
              {t("week.team.noOutcomes")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function WeekView({
  planning,
  date,
  tasks,
  canLinkTasks,
  aiAccess,
  locationId,
  locations,
  locale,
  aiResult,
  setAiResult,
  filterKey,
  t,
}) {
  const weekStart =
    planning.metadata.week?.from ??
    planning.metadata.week?.start ??
    planning.week?.weekStart ??
    date;
  const weekEnd =
    planning.metadata.week?.to ??
    planning.metadata.week?.end ??
    planning.week?.weekEnd ??
    weekStart;

  return (
    <div className="space-y-5">
      <SectionCard
        title={t("week.myPlan.title")}
        description={t("week.myPlan.description", {
          from: formatPlanningDate(weekStart, locale, {
            day: "numeric",
            month: "short",
          }),
          to: formatPlanningDate(weekEnd, locale, {
            day: "numeric",
            month: "short",
          }),
        })}
      >
        <WeeklyPlanForm
          key={`${weekStart}:${locationId || "all"}:${
            planning.week.myPlan?.updatedAt || planning.week.myPlan?.id || "new"
          }`}
          weekStart={weekStart}
          plan={planning.week.myPlan}
          tasks={tasks}
          canSubmit={planning.permissions.canSubmit}
          canLinkTasks={canLinkTasks}
          locationId={locationId}
          locations={locations}
          t={t}
        />
      </SectionCard>

      {planning.permissions.canViewTeam ? (
        <SectionCard
          title={t("week.team.title")}
          description={t("week.team.description")}
        >
          <WeeklyTeamOverview plans={planning.week.plans} t={t} />
        </SectionCard>
      ) : null}

      {planning.permissions.canViewTeam ? (
        <AiBriefingCard
          cadence="week"
          date={date}
          locationId={locationId}
          locale={locale}
          access={aiAccess}
          filterKey={filterKey}
          result={aiResult?.filterKey === filterKey ? aiResult : null}
          setResult={setAiResult}
          t={t}
        />
      ) : null}
    </div>
  );
}

const newPriority = () => ({
  title: "",
  ownerUserId: "",
  completed: false,
  linkedTaskIds: [],
});

function MonthlyPrioritiesForm({
  monthKey,
  locationId,
  prioritySet,
  staff,
  tasks,
  canManage,
  canLinkTasks,
  t,
}) {
  const [priorities, setPriorities] = useState(() => {
    const source = Array.isArray(prioritySet?.priorities)
      ? prioritySet.priorities
      : [];
    return source.length
      ? source.slice(0, MAX_MONTHLY_PRIORITIES).map((item) => ({
          ...(item.id ? { id: item.id } : {}),
          title: item.title || "",
          ownerUserId: item.ownerUserId || "",
          completed: item.completed === true,
          linkedTaskIds: Array.isArray(item.linkedTaskIds)
            ? item.linkedTaskIds.map(String)
            : [],
        }))
      : [newPriority()];
  });
  const [feedback, setFeedback] = useState(null);
  const [save, state] = useSaveStaffMonthlyPrioritiesMutation();

  if (!canManage) {
    const visible = prioritySet?.priorities ?? [];
    return visible.length ? (
      <ul className="space-y-3">
        {visible.map((priority) => (
          <li
            key={priority.id}
            className="flex items-start gap-3 rounded-[16px] border border-line bg-sand-50/45 p-4 text-xs leading-5 text-ink"
          >
            <CheckCircleIcon
              className={cx(
                "mt-0.5 h-4 w-4 shrink-0",
                priority.completed ? "text-success" : "text-ink-faint",
              )}
            />
            <span
              className={priority.completed ? "line-through opacity-60" : ""}
            >
              {priority.title}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <EmptyState
        title={t("month.emptyTitle")}
        description={t("month.emptyDescription")}
      />
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    const normalized = priorities
      .map(({ linkedTaskIds, ...priority }) => ({
        ...priority,
        title: priority.title.trim(),
        ownerUserId: priority.ownerUserId || null,
        ...(canLinkTasks ? { linkedTaskIds } : {}),
      }))
      .filter((priority) => priority.title);
    setFeedback(null);

    try {
      await save({
        month: monthKey,
        locationId: locationId || null,
        priorities: normalized,
      }).unwrap();
      setFeedback({ tone: "success", text: t("month.form.saved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("month.form.saveError")),
      });
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="space-y-4">
        {priorities.map((priority, index) => (
          <div
            key={index}
            className="rounded-[18px] border border-line bg-sand-50/45 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
              <input
                value={priority.title}
                onChange={(event) =>
                  setPriorities((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  )
                }
                maxLength={240}
                placeholder={t("month.form.priorityPlaceholder")}
                aria-label={t("month.form.priorityLabel", {
                  number: index + 1,
                })}
                className="min-h-11 rounded-[14px] border border-line bg-white px-4 text-sm outline-none focus:border-cobalt-400"
              />
              <select
                value={priority.ownerUserId}
                onChange={(event) =>
                  setPriorities((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, ownerUserId: event.target.value }
                        : item,
                    ),
                  )
                }
                aria-label={t("month.form.ownerLabel", {
                  number: index + 1,
                })}
                className="min-h-11 rounded-[14px] border border-line bg-white px-3 text-xs outline-none focus:border-cobalt-400"
              >
                <option value="">{t("month.form.noOwner")}</option>
                {staff
                  .filter((member) => member.userId)
                  .map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setPriorities((current) =>
                    current.length === 1
                      ? [newPriority()]
                      : current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                className="justify-self-end rounded-full p-2 text-ink-muted hover:bg-danger-soft hover:text-danger"
                aria-label={t("month.form.removePriority", {
                  number: index + 1,
                })}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-3 inline-flex items-center gap-2 text-[12px] font-medium text-ink-muted">
              <input
                type="checkbox"
                checked={priority.completed}
                onChange={(event) =>
                  setPriorities((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, completed: event.target.checked }
                        : item,
                    ),
                  )
                }
                className="h-4 w-4 rounded border-line-strong text-success focus:ring-success"
              />
              {t("month.form.completed")}
            </label>
            {canLinkTasks ? (
              <div className="mt-3">
                <TaskPicker
                  tasks={
                    locationId
                      ? tasksForPlanningLocation(tasks, locationId)
                      : tasks
                  }
                  selected={priority.linkedTaskIds}
                  onChange={(linkedTaskIds) =>
                    setPriorities((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, linkedTaskIds } : item,
                      ),
                    )
                  }
                  label={t("common.linkedTasks")}
                  emptyLabel={t("common.noTasksToLink")}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={priorities.length >= MAX_MONTHLY_PRIORITIES}
          onClick={() =>
            setPriorities((current) => [...current, newPriority()])
          }
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-ink disabled:opacity-40"
        >
          <PlusIcon className="h-4 w-4" />
          {t("month.form.add", { maximum: MAX_MONTHLY_PRIORITIES })}
        </button>
        <button
          type="submit"
          disabled={state.isLoading}
          className="min-h-11 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt disabled:opacity-50"
        >
          {state.isLoading ? t("common.saving") : t("month.form.save")}
        </button>
      </div>
      <Feedback value={feedback} />
    </form>
  );
}

function PriorityList({ priorities, t }) {
  if (!priorities?.length) {
    return (
      <p className="text-xs text-ink-muted">{t("month.noGlobalPriorities")}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {priorities.map((priority) => (
        <li
          key={priority.id}
          className="flex items-start gap-3 rounded-[14px] border border-line bg-white p-3 text-xs leading-5 text-ink"
        >
          <CheckCircleIcon
            className={cx(
              "mt-0.5 h-4 w-4 shrink-0",
              priority.completed ? "text-success" : "text-ink-faint",
            )}
            aria-hidden="true"
          />
          <span className={priority.completed ? "line-through opacity-60" : ""}>
            {priority.title}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MonthView({
  planning,
  date,
  tasks,
  canLinkTasks,
  aiAccess,
  locationId,
  locationName,
  locale,
  aiResult,
  setAiResult,
  filterKey,
  t,
}) {
  const monthKey =
    planning.metadata.month?.key ??
    planning.month?.key ??
    String(date).slice(0, 7);
  const prioritySet = planning.month.prioritySets.find(
    (set) => String(set.locationId || "") === String(locationId || ""),
  );
  const globalPrioritySet = locationId
    ? planning.month.prioritySets.find(
        (set) => String(set.locationId || "") === "",
      )
    : null;

  return (
    <div className="space-y-5">
      <SectionCard
        title={t("month.title")}
        description={t("month.description", {
          month: formatPlanningDate(`${monthKey}-01`, locale, {
            month: "long",
            year: "numeric",
          }),
          location: locationName,
        })}
      >
        {globalPrioritySet ? (
          <div className="mb-5 rounded-[18px] bg-sand-50 p-4">
            <h3 className="text-xs font-semibold text-ink">
              {t("month.globalTitle")}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-ink-muted">
              {t("month.globalDescription")}
            </p>
            <div className="mt-3">
              <PriorityList priorities={globalPrioritySet.priorities} t={t} />
            </div>
          </div>
        ) : null}
        <MonthlyPrioritiesForm
          key={`${monthKey}:${locationId || "all"}:${
            prioritySet?.updatedAt || prioritySet?.id || "new"
          }`}
          monthKey={monthKey}
          locationId={locationId}
          prioritySet={prioritySet}
          staff={planning.today.staff}
          tasks={tasks}
          canManage={planning.permissions.canManage}
          canLinkTasks={canLinkTasks}
          t={t}
        />
      </SectionCard>

      {planning.permissions.canViewTeam ? (
        <AiBriefingCard
          cadence="month"
          date={date}
          locationId={locationId}
          locale={locale}
          access={aiAccess}
          filterKey={filterKey}
          result={aiResult?.filterKey === filterKey ? aiResult : null}
          setResult={setAiResult}
          t={t}
        />
      ) : null}
    </div>
  );
}

const emptyTaskForm = (locationId = "") => ({
  title: "",
  description: "",
  dueDate: "",
  priority: "normal",
  assignedTo: "",
  locationId,
  appliesToAllLocations: false,
});

function TaskBoard({
  locationId,
  locations,
  canUseAllLocations,
  staff,
  canManage,
  locale,
  t,
}) {
  const [page, setPage] = useState(1);
  const query = useGetStaffTasksQuery({
    ...(locationId ? { locationId } : {}),
    page,
    limit: 100,
  });
  const tasks = useMemo(() => normalizeStaffTasks(query.data), [query.data]);
  const total = Number(query.data?.total ?? tasks.length);
  const totalPages = Math.max(
    Number(query.data?.pages ?? Math.ceil(total / 100)),
    1,
  );
  const [create, createState] = useCreateStaffTaskMutation();
  const [update, updateState] = useUpdateStaffTaskMutation();
  const [remove, removeState] = useDeleteStaffTaskMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState(() => emptyTaskForm(locationId));
  const [editingTaskId, setEditingTaskId] = useState("");
  const [editForm, setEditForm] = useState(() => emptyTaskForm());
  const [feedback, setFeedback] = useState(null);

  const grouped = Object.fromEntries(
    STATUS_COLUMNS.map((status) => [
      status,
      tasks.filter((task) => task.column === status),
    ]),
  );

  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await create({
        title: form.title.trim(),
        ...(showAdvanced && form.description.trim()
          ? { description: form.description.trim() }
          : {}),
        ...(showAdvanced && form.dueDate ? { dueDate: form.dueDate } : {}),
        ...(showAdvanced && form.priority !== "normal"
          ? { priority: form.priority }
          : {}),
        ...(showAdvanced && form.assignedTo
          ? { assignedTo: form.assignedTo }
          : {}),
        ...(showAdvanced && form.appliesToAllLocations
          ? { appliesToAllLocations: true }
          : showAdvanced && form.locationId
            ? { locationId: form.locationId }
            : locationId
              ? { locationId }
              : {}),
      }).unwrap();
      setForm(emptyTaskForm(locationId));
      setShowAdvanced(false);
      setShowCreate(false);
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("board.form.saveError")),
      });
    }
  };

  const changeStatus = async (task, status) => {
    setFeedback(null);
    try {
      await update({
        id: task.id,
        status,
      }).unwrap();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("board.statusError")),
      });
    }
  };

  const startEdit = (task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : "",
      priority: task.priority || "normal",
      assignedTo: task.assignedToId || "",
      locationId: task.locationId || (!canUseAllLocations ? locationId : ""),
      appliesToAllLocations: task.appliesToAllLocations === true,
    });
  };

  const saveEdit = async (event, task) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await update({
        id: task.id,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        dueDate: editForm.dueDate || null,
        priority: editForm.priority,
        assignedTo: editForm.assignedTo || null,
        appliesToAllLocations: editForm.appliesToAllLocations,
        locationId: editForm.appliesToAllLocations
          ? null
          : editForm.locationId || null,
      }).unwrap();
      setEditingTaskId("");
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("board.form.updateError")),
      });
    }
  };

  const deleteTask = async (task) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(t("board.confirmDelete", { title: task.title }))
    ) {
      return;
    }
    setFeedback(null);
    try {
      await remove(task.id).unwrap();
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("board.deleteError")),
      });
    }
  };

  if (query.isLoading) return <LoadingState label={t("board.loading")} />;
  if (query.isError) {
    return (
      <ErrorState
        title={t("board.loadError.title")}
        description={t("board.loadError.description")}
        retry={query.refetch}
        retryLabel={t("common.retry")}
      />
    );
  }

  return (
    <div className="space-y-5">
      {canManage ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreate((current) => !current)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt"
          >
            {showCreate ? (
              <XMarkIcon className="h-4 w-4" />
            ) : (
              <PlusIcon className="h-4 w-4" />
            )}
            {showCreate ? t("board.form.close") : t("board.form.add")}
          </button>
        </div>
      ) : null}

      {showCreate ? (
        <form
          onSubmit={submit}
          className="rounded-[24px] border border-line bg-white p-5 shadow-card"
        >
          <label className="text-xs font-semibold text-ink">
            {t("board.form.title")}
            <input
              autoFocus
              required
              maxLength={180}
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder={t("board.form.titlePlaceholder")}
              className="mt-2 min-h-12 w-full rounded-[16px] border border-line px-4 text-sm outline-none focus:border-cobalt-400"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-cobalt-700"
            aria-expanded={showAdvanced}
          >
            <Cog6ToothIcon className="h-4 w-4" />
            {showAdvanced
              ? t("board.form.hideDetails")
              : t("board.form.showDetails")}
          </button>

          {showAdvanced ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-xs font-semibold text-ink">
                {t("board.form.description")}
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  maxLength={3000}
                  className="mt-2 w-full rounded-[16px] border border-line px-4 py-3 text-sm outline-none focus:border-cobalt-400"
                />
              </label>
              <div className="grid content-start gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-ink">
                  {t("board.form.dueDate")}
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-11 w-full rounded-[14px] border border-line px-3 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  {t("board.form.priority")}
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-11 w-full rounded-[14px] border border-line px-3 text-xs"
                  >
                    {["low", "normal", "high", "urgent"].map((priority) => (
                      <option key={priority} value={priority}>
                        {t(`board.priorities.${priority}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink">
                  {t("board.form.assignee")}
                  <select
                    value={form.assignedTo}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assignedTo: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-11 w-full rounded-[14px] border border-line px-3 text-xs"
                  >
                    <option value="">{t("board.form.unassigned")}</option>
                    {staff
                      .filter((member) => member.userId)
                      .map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink">
                  {t("board.form.location")}
                  <select
                    value={form.appliesToAllLocations ? "all" : form.locationId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        appliesToAllLocations: event.target.value === "all",
                        locationId:
                          event.target.value === "all"
                            ? ""
                            : event.target.value,
                      }))
                    }
                    className="mt-2 min-h-11 w-full rounded-[14px] border border-line px-3 text-xs"
                  >
                    {canUseAllLocations ? (
                      <option value="">{t("board.form.noLocation")}</option>
                    ) : null}
                    {canUseAllLocations ? (
                      <option value="all">{t("filters.allLocations")}</option>
                    ) : null}
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          <Feedback value={feedback} />
          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={createState.isLoading || !form.title.trim()}
              className="min-h-11 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {createState.isLoading
                ? t("common.saving")
                : t("board.form.save")}
            </button>
          </div>
        </form>
      ) : (
        <Feedback value={feedback} />
      )}

      <div
        className="grid gap-4 xl:grid-cols-4"
        aria-label={t("board.columnsLabel")}
      >
        {STATUS_COLUMNS.map((status) => (
          <section
            key={status}
            className="min-w-0 rounded-[22px] border border-line bg-sand-50/70 p-3"
          >
            <header className="flex items-center justify-between px-2 py-2">
              <h2 className="text-xs font-semibold text-ink">
                {t(`board.statuses.${status}`)}
              </h2>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-ink-muted">
                {grouped[status].length}
              </span>
            </header>
            <div className="mt-2 space-y-3">
              {!grouped[status].length ? (
                <p className="rounded-[16px] border border-dashed border-line px-3 py-5 text-center text-[12px] text-ink-muted">
                  {t("board.emptyColumn")}
                </p>
              ) : null}
              {grouped[status].map((task) => {
                const assignee = staff.find(
                  (member) => member.userId === task.assignedToId,
                );
                if (editingTaskId === task.id) {
                  return (
                    <form
                      key={task.id}
                      onSubmit={(event) => saveEdit(event, task)}
                      className="rounded-[18px] border border-cobalt-200 bg-white p-4 shadow-sm"
                    >
                      <label className="text-[10px] font-semibold text-ink">
                        {t("board.form.title")}
                        <input
                          required
                          maxLength={180}
                          value={editForm.title}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          className="mt-1.5 min-h-10 w-full rounded-[12px] border border-line px-3 text-xs"
                        />
                      </label>
                      <label className="mt-3 block text-[10px] font-semibold text-ink">
                        {t("board.form.description")}
                        <textarea
                          rows={3}
                          maxLength={3000}
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full rounded-[12px] border border-line px-3 py-2 text-xs"
                        />
                      </label>
                      <div className="mt-3 grid gap-2">
                        <label className="text-[10px] font-semibold text-ink">
                          {t("board.form.dueDate")}
                          <input
                            type="date"
                            value={editForm.dueDate}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                dueDate: event.target.value,
                              }))
                            }
                            className="mt-1.5 min-h-10 w-full rounded-[12px] border border-line px-3 text-xs"
                          />
                        </label>
                        <label className="text-[10px] font-semibold text-ink">
                          {t("board.form.priority")}
                          <select
                            value={editForm.priority}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                priority: event.target.value,
                              }))
                            }
                            className="mt-1.5 min-h-10 w-full rounded-[12px] border border-line px-3 text-xs"
                          >
                            {["low", "normal", "high", "urgent"].map(
                              (priority) => (
                                <option key={priority} value={priority}>
                                  {t(`board.priorities.${priority}`)}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label className="text-[10px] font-semibold text-ink">
                          {t("board.form.assignee")}
                          <select
                            value={editForm.assignedTo}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                assignedTo: event.target.value,
                              }))
                            }
                            className="mt-1.5 min-h-10 w-full rounded-[12px] border border-line px-3 text-xs"
                          >
                            <option value="">
                              {t("board.form.unassigned")}
                            </option>
                            {staff
                              .filter((member) => member.userId)
                              .map((member) => (
                                <option
                                  key={member.userId}
                                  value={member.userId}
                                >
                                  {member.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="text-[10px] font-semibold text-ink">
                          {t("board.form.location")}
                          <select
                            value={
                              editForm.appliesToAllLocations
                                ? "all"
                                : editForm.locationId
                            }
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                appliesToAllLocations:
                                  event.target.value === "all",
                                locationId:
                                  event.target.value === "all"
                                    ? ""
                                    : event.target.value,
                              }))
                            }
                            className="mt-1.5 min-h-10 w-full rounded-[12px] border border-line px-3 text-xs"
                          >
                            {canUseAllLocations ? (
                              <option value="">
                                {t("board.form.noLocation")}
                              </option>
                            ) : null}
                            {canUseAllLocations ? (
                              <option value="all">
                                {t("filters.allLocations")}
                              </option>
                            ) : null}
                            {locations.map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="submit"
                          disabled={
                            updateState.isLoading || !editForm.title.trim()
                          }
                          className="min-h-10 flex-1 rounded-full bg-cobalt-500 px-3 text-[12px] font-semibold text-white disabled:opacity-50"
                        >
                          {updateState.isLoading
                            ? t("common.saving")
                            : t("board.form.update")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId("")}
                          className="min-h-10 rounded-full border border-line px-3 text-[12px] font-semibold text-ink"
                        >
                          {t("board.form.cancel")}
                        </button>
                      </div>
                    </form>
                  );
                }
                return (
                  <article
                    key={task.id}
                    className="rounded-[18px] border border-line bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 text-sm font-semibold leading-5 text-ink">
                        {task.title}
                      </h3>
                      {canManage ? (
                        <div className="flex shrink-0">
                          <button
                            type="button"
                            onClick={() => startEdit(task)}
                            className="rounded-full p-1 text-ink-faint hover:bg-cobalt-50 hover:text-cobalt-700"
                            aria-label={t("board.editTask", {
                              title: task.title,
                            })}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTask(task)}
                            disabled={removeState.isLoading}
                            className="rounded-full p-1 text-ink-faint hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                            aria-label={t("board.deleteTask", {
                              title: task.title,
                            })}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {task.description ? (
                      <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-ink-muted">
                        {task.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-sand-100 px-2 py-1 text-[10px] font-medium text-ink-muted">
                        {t(`board.priorities.${task.priority || "normal"}`)}
                      </span>
                      <span className="rounded-full bg-sand-100 px-2 py-1 text-[10px] font-medium text-ink-muted">
                        {task.dueDate
                          ? formatPlanningDate(task.dueDate, locale, {
                              day: "numeric",
                              month: "short",
                            })
                          : t("board.noDueDate")}
                      </span>
                      {assignee ? (
                        <span className="rounded-full bg-cobalt-50 px-2 py-1 text-[10px] font-medium text-cobalt-700">
                          {assignee.name}
                        </span>
                      ) : null}
                    </div>
                    {["blocked", "waiting"].includes(task.status) &&
                    task.blockerReason ? (
                      <p className="mt-3 rounded-[12px] bg-warning-soft p-2.5 text-[12px] leading-5 text-warning">
                        {task.blockerReason}
                      </p>
                    ) : null}
                    {task.links.length ? (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <LinkIcon className="h-3.5 w-3.5" />
                        {t("board.linkedCount", { count: task.links.length })}
                      </div>
                    ) : null}
                    {canManage ? (
                      <label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                        {t("board.moveTo")}
                        <select
                          value={
                            task.status === "blocked" ? "waiting" : task.status
                          }
                          onChange={(event) =>
                            changeStatus(task, event.target.value)
                          }
                          disabled={updateState.isLoading}
                          aria-label={t("board.changeStatus", {
                            title: task.title,
                          })}
                          className="mt-1.5 min-h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[12px] font-medium normal-case tracking-normal text-ink"
                        >
                          {STATUS_COLUMNS.map((targetStatus) => (
                            <option key={targetStatus} value={targetStatus}>
                              {t(`board.statuses.${targetStatus}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {total > tasks.length || totalPages > 1 ? (
        <nav
          className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          aria-label={t("board.pagination.label")}
        >
          <p className="text-xs text-ink-muted">
            {t("board.pagination.showing", {
              from: (page - 1) * 100 + (tasks.length ? 1 : 0),
              to: (page - 1) * 100 + tasks.length,
              total,
            })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="min-h-10 rounded-full border border-line px-3 text-[12px] font-semibold text-ink disabled:opacity-40"
            >
              {t("board.pagination.previous")}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(current + 1, totalPages))
              }
              className="min-h-10 rounded-full border border-line px-3 text-[12px] font-semibold text-ink disabled:opacity-40"
            >
              {t("board.pagination.next")}
            </button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function PlanningSettings({
  settings,
  staff,
  canManageGlobalSettings,
  onClose,
  t,
}) {
  const [expectedUpdateTime, setExpectedUpdateTime] = useState(
    settings.expectedUpdateTime || "09:00",
  );
  const [schedules, setSchedules] = useState(() =>
    Object.fromEntries(
      staff.map((member) => [member.id, member.expectedWeekdays]),
    ),
  );
  const [feedback, setFeedback] = useState(null);
  const [saveSettings, settingsState] =
    useUpdateStaffPlanningSettingsMutation();
  const [saveSchedule, scheduleState] =
    useUpdateStaffPlanningMemberScheduleMutation();

  const saveReminder = async () => {
    setFeedback(null);
    try {
      await saveSettings({ expectedUpdateTime }).unwrap();
      setFeedback({ tone: "success", text: t("settings.saved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("settings.saveError")),
      });
    }
  };

  const toggleDay = (memberId, day) => {
    setSchedules((current) => {
      const days = current[memberId] ?? [];
      return {
        ...current,
        [memberId]: days.includes(day)
          ? days.filter((value) => value !== day)
          : [...days, day].sort(),
      };
    });
  };

  const saveMember = async (memberId) => {
    setFeedback(null);
    try {
      await saveSchedule({
        memberId,
        expectedWeekdays: schedules[memberId] ?? [],
      }).unwrap();
      setFeedback({ tone: "success", text: t("settings.scheduleSaved") });
    } catch (error) {
      setFeedback({
        tone: "error",
        text: getMutationError(error, t("settings.scheduleError")),
      });
    }
  };

  return (
    <section
      className="rounded-[24px] border border-cobalt-100 bg-white p-5 shadow-card sm:p-6"
      aria-labelledby="planning-settings-title"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="planning-settings-title"
            className="text-base font-semibold text-ink"
          >
            {t("settings.title")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            {t("settings.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-ink-muted hover:bg-sand-50"
          aria-label={t("settings.close")}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </header>

      {canManageGlobalSettings ? (
        <div className="mt-5 flex flex-col gap-3 rounded-[18px] bg-sand-50 p-4 sm:flex-row sm:items-end">
          <label className="text-xs font-semibold text-ink">
            {t("settings.expectedUpdateTime")}
            <input
              type="time"
              value={expectedUpdateTime}
              onChange={(event) => setExpectedUpdateTime(event.target.value)}
              className="mt-2 min-h-11 rounded-[14px] border border-line bg-white px-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={saveReminder}
            disabled={settingsState.isLoading}
            className="min-h-11 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {settingsState.isLoading
              ? t("common.saving")
              : t("settings.saveExpectedTime")}
          </button>
        </div>
      ) : (
        <p className="mt-5 rounded-[18px] bg-sand-50 p-4 text-xs leading-5 text-ink-muted">
          {t("settings.globalSettingsOutsideScope")}
        </p>
      )}

      <div className="mt-5">
        <h3 className="text-xs font-semibold text-ink">
          {t("settings.expectedDays")}
        </h3>
        <p className="mt-1 text-xs leading-5 text-ink-muted">
          {t("settings.expectedDaysDescription")}
        </p>
        <div className="mt-3 space-y-3">
          {staff.map((member) => (
            <article
              key={member.id}
              className="rounded-[18px] border border-line p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">
                    {member.name}
                  </p>
                  {!member.isLinked ? (
                    <p className="mt-1 text-[12px] text-warning">
                      {t("settings.notLinked")}
                    </p>
                  ) : null}
                </div>
                {member.isLinked && member.canManageSchedule ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {WEEKDAYS.map((day) => {
                      const selected = (schedules[member.id] ?? []).includes(
                        day,
                      );
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleDay(member.id, day)}
                          className={cx(
                            "flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold transition",
                            selected
                              ? "bg-cobalt-500 text-white"
                              : "border border-line bg-white text-ink-muted",
                          )}
                          aria-label={t("settings.toggleDay", {
                            day: t(`weekdays.${day}`),
                            member: member.name,
                          })}
                        >
                          {t(`weekdaysShort.${day}`)}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => saveMember(member.id)}
                      disabled={scheduleState.isLoading}
                      className="min-h-10 rounded-full border border-cobalt-200 px-3 text-[12px] font-semibold text-cobalt-700 disabled:opacity-50"
                    >
                      {t("settings.saveDays")}
                    </button>
                  </div>
                ) : member.isLinked ? (
                  <p className="text-[12px] leading-5 text-ink-muted">
                    {t("settings.scheduleOutsideScope")}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
      <Feedback value={feedback} />
    </section>
  );
}

export default function StaffTasksPage({ showPageHeader = false }) {
  const t = useTranslations("StaffPlanning");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const currentUser = useSelector(selectCurrentUser);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const activeStudioId = useSelector(selectActiveStudioId);
  const timeZone = tenant?.settings?.timezone;
  const moduleEnabled = tenant?.modules?.staff_tasks === true;
  const hasPlanningAccess = hasAnyPermission(workspaceAccess, [
    PERMISSIONS.PLANNING_SUBMIT,
    PERMISSIONS.PLANNING_TEAM_VIEW,
    PERMISSIONS.PLANNING_MANAGE,
  ]);
  const canViewBoard = hasPermission(workspaceAccess, PERMISSIONS.TASKS_VIEW);
  const locationAccess = useMemo(
    () => normalizeLocationAccess(workspaceAccess),
    [workspaceAccess],
  );
  const locationsQuery = useGetLocationsQuery(
    { isActive: true, limit: 100 },
    { skip: !moduleEnabled },
  );
  const locations = useMemo(() => {
    const normalized = normalizeLocationsResponse(locationsQuery.data).filter(
      (location) => location.isActive !== false,
    );
    if (locationAccess.mode !== "selected") return normalized;
    return normalized.filter((location) => locationAccess.ids.has(location.id));
  }, [locationAccess.ids, locationAccess.mode, locationsQuery.data]);
  const defaultLocationId = locations.some(
    (location) => location.id === activeStudioId,
  )
    ? activeStudioId
    : locationAccess.mode === "selected"
      ? getPrimaryLocation(locations)?.id || ""
      : "";
  const [date, setDate] = useState(() =>
    getPlanningDateKey(new Date(), timeZone),
  );
  const [requestedLocationId, setRequestedLocationId] =
    useState(defaultLocationId);
  const locationId =
    requestedLocationId &&
    locations.some((location) => location.id === requestedLocationId)
      ? requestedLocationId
      : locationAccess.mode === "selected"
        ? defaultLocationId
        : "";
  const [activeTab, setActiveTab] = useState(
    hasPlanningAccess ? "today" : "board",
  );
  const [showSettings, setShowSettings] = useState(false);
  const [aiResults, setAiResults] = useState({});
  const aiAccess = useAiAccess({ feature: "staffPlanning" });

  const overviewQuery = useGetStaffPlanningOverviewQuery(
    {
      date,
      ...(locationId ? { locationId } : {}),
    },
    { skip: !moduleEnabled || !hasPlanningAccess },
  );
  const planning = useMemo(
    () =>
      normalizeStaffPlanningOverview(
        overviewQuery.data,
        getEntityId(currentUser),
      ),
    [currentUser, overviewQuery.data],
  );
  const taskOptions = useMemo(
    () => (canViewBoard ? planning.board.tasks.map(toTaskOption) : []),
    [canViewBoard, planning.board.tasks],
  );
  const canManageBoard = hasPermission(
    workspaceAccess,
    PERMISSIONS.TASKS_MANAGE,
  );
  const visibleTabs = [
    ...(hasPlanningAccess ? ["today", "week", "month"] : []),
    ...(canViewBoard ? ["board"] : []),
  ];
  const effectiveTab = visibleTabs.includes(activeTab)
    ? activeTab
    : visibleTabs[0];
  const selectedLocationName =
    locations.find((location) => location.id === locationId)?.name ??
    t("filters.allLocations");
  const filterKey = `${date}:${locationId || "all"}:${
    planning.metadata.generatedAt || "initial"
  }`;
  const todayKey = getPlanningDateKey(new Date(), timeZone);
  const setCadenceResult = (cadence) => (value) =>
    setAiResults((current) => ({ ...current, [cadence]: value }));

  if (!moduleEnabled) {
    return (
      <section className="min-w-0">
        <EmptyState
          title={t("unavailable.title")}
          description={t("unavailable.description")}
        />
      </section>
    );
  }

  if (
    locationsQuery.isLoading ||
    (hasPlanningAccess && overviewQuery.isLoading)
  ) {
    return (
      <section className="min-w-0">
        <LoadingState label={t("common.loading")} />
      </section>
    );
  }

  if (hasPlanningAccess && overviewQuery.isError) {
    return (
      <section className="min-w-0">
        <ErrorState
          title={t("loadError.title")}
          description={t("loadError.description")}
          retry={overviewQuery.refetch}
          retryLabel={t("common.retry")}
        />
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <div className="mx-auto min-w-0 max-w-[1540px]">
        <h1
          className={
            showPageHeader ? "text-2xl font-semibold text-ink" : "sr-only"
          }
        >
          {t("title")}
        </h1>

        <header
          className={cx(
            "mb-5 flex flex-col gap-3 rounded-[22px] border border-line bg-white/85 p-3 shadow-card",
            showPageHeader ? "mt-4" : "",
            "lg:flex-row lg:items-center lg:justify-between",
          )}
        >
          <WorkspaceTabs
            id={STAFF_PLANNING_TABS_ID}
            className="min-w-0 lg:flex-1"
            tabs={visibleTabs.map((tab) => ({
              id: tab,
              label: t(`tabs.${tab}`),
            }))}
            value={effectiveTab}
            onChange={setActiveTab}
            ariaLabel={t("tabs.label")}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hasPlanningAccess ? (
              <label className="relative">
                <span className="sr-only">{t("filters.date")}</span>
                <CalendarDaysIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="min-h-11 w-full rounded-full border border-line bg-white pl-9 pr-3 text-xs text-ink sm:w-auto"
                />
              </label>
            ) : null}
            <label className="relative">
              <span className="sr-only">{t("filters.location")}</span>
              <MapPinIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <select
                value={locationId}
                onChange={(event) => setRequestedLocationId(event.target.value)}
                className="min-h-11 w-full rounded-full border border-line bg-white pl-9 pr-8 text-xs text-ink sm:w-auto"
              >
                {locationAccess.mode !== "selected" ? (
                  <option value="">{t("filters.allLocations")}</option>
                ) : null}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
            {hasPlanningAccess ? (
              <button
                type="button"
                onClick={() => overviewQuery.refetch()}
                disabled={overviewQuery.isFetching}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-ink disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={cx(
                    "h-4 w-4",
                    overviewQuery.isFetching ? "animate-spin" : "",
                  )}
                  aria-hidden="true"
                />
                {t("actions.refresh")}
              </button>
            ) : null}
            {planning.permissions.canManage ? (
              <button
                type="button"
                onClick={() => setShowSettings((current) => !current)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line px-4 text-xs font-semibold text-ink"
                aria-expanded={showSettings}
              >
                <Cog6ToothIcon className="h-4 w-4" aria-hidden="true" />
                {t("actions.settings")}
              </button>
            ) : null}
          </div>
        </header>

        {showSettings && planning.permissions.canManage ? (
          <div className="mb-5">
            <PlanningSettings
              settings={planning.settings}
              staff={planning.today.staff}
              canManageGlobalSettings={
                planning.permissions.canManageGlobalSettings
              }
              onClose={() => setShowSettings(false)}
              t={t}
            />
          </div>
        ) : null}

        <WorkspaceTabPanel tabsId={STAFF_PLANNING_TABS_ID} tabId={effectiveTab}>
          {effectiveTab === "today" ? (
            <TodayView
              planning={planning}
              date={date}
              tasks={taskOptions}
              aiAccess={aiAccess}
              todayKey={todayKey}
              canUseTaskAi={canViewBoard}
              canLinkTasks={canViewBoard}
              locationId={locationId}
              locations={locations}
              locale={locale}
              aiResult={aiResults.day}
              setAiResult={setCadenceResult("day")}
              filterKey={`${filterKey}:day`}
              t={t}
            />
          ) : null}
          {effectiveTab === "week" ? (
            <WeekView
              planning={planning}
              date={date}
              tasks={taskOptions}
              canLinkTasks={canViewBoard}
              aiAccess={aiAccess}
              locationId={locationId}
              locations={locations}
              locale={locale}
              aiResult={aiResults.week}
              setAiResult={setCadenceResult("week")}
              filterKey={`${filterKey}:week`}
              t={t}
            />
          ) : null}
          {effectiveTab === "month" ? (
            <MonthView
              planning={planning}
              date={date}
              tasks={taskOptions}
              canLinkTasks={canViewBoard}
              aiAccess={aiAccess}
              locationId={locationId}
              locationName={selectedLocationName}
              locale={locale}
              aiResult={aiResults.month}
              setAiResult={setCadenceResult("month")}
              filterKey={`${filterKey}:month`}
              t={t}
            />
          ) : null}
          {effectiveTab === "board" ? (
            <TaskBoard
              key={locationId || "all-locations"}
              locationId={locationId}
              locations={locations}
              canUseAllLocations={locationAccess.mode !== "selected"}
              staff={planning.today.staff}
              canManage={canManageBoard}
              locale={locale}
              t={t}
            />
          ) : null}
        </WorkspaceTabPanel>
      </div>
    </section>
  );
}
