"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  CreditCardIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  MegaphoneIcon,
  RectangleGroupIcon,
  Squares2X2Icon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import {
  dashboardNavigation,
  dashboardNavigationGroups,
} from "@/components/dashboard/dashboard.data";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import {
  useGetWorkspaceConfigurationQuery,
  useUpdateWorkspaceConfigurationMutation,
} from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import LaunchWorkflowHeader from "./LaunchWorkflowHeader";
import {
  WORKSPACE_WORKFLOW_PRESETS,
  buildWorkflowPresetState,
  getMatchingWorkflowPresetId,
  isWorkflowPresetAvailable,
} from "./workspaceWorkflowPresets";
import {
  WORKSPACE_WORKFLOW_QUESTIONS,
  buildWorkspaceWorkflowIntent,
  isWorkflowAnswerComplete,
  getWorkflowQuestionProgress,
  getWorkspaceWorkflowAnswers,
  hasStoredWorkspaceWorkflowAnswers,
  isWorkflowQuestionAvailable,
} from "./workspaceWorkflowQuestions";
const MODULE_GROUPS = [
  {
    key: "customerExperience",
    icon: RectangleGroupIcon,
    modules: ["bookings", "customers", "courses", "communications"],
  },
  {
    key: "commerce",
    icon: CreditCardIcon,
    modules: ["payments", "memberships", "credits", "vouchers"],
  },
  {
    key: "studioOperations",
    icon: WrenchScrewdriverIcon,
    modules: ["inventory", "staff_tasks", "access_codes"],
  },
  {
    key: "growth",
    icon: MegaphoneIcon,
    modules: ["automations", "newsletter", "ai"],
  },
];
export const WORKSPACE_MODULE_KEYS = MODULE_GROUPS.flatMap(
  (group) => group.modules,
);
const cx = (...classes) => classes.filter(Boolean).join(" ");
const PROTECTED_ITEM_KEYS = new Set(["overview", "settings"]);
const itemByKey = new Map(dashboardNavigation.map((item) => [item.key, item]));
export const CUSTOMIZABLE_NAVIGATION = dashboardNavigationGroups
  .filter((entry) => entry.key !== "overview")
  .map((entry) => ({
    ...entry,
    items:
      entry.type === "group"
        ? entry.itemKeys
            .map((key) => itemByKey.get(key))
            .filter(
              (item) =>
                item &&
                !item.sidebarHidden &&
                !PROTECTED_ITEM_KEYS.has(item.key),
            )
        : [itemByKey.get(entry.itemKey)].filter(
            (item) =>
              item && !item.sidebarHidden && !PROTECTED_ITEM_KEYS.has(item.key),
          ),
  }))
  .filter((entry) => entry.items.length);
const sortedUnique = (value) =>
  [...new Set(Array.isArray(value) ? value.map(String) : [])].sort();
const normalizeNavigation = (navigation) => ({
  hiddenGroups: sortedUnique(navigation?.hiddenGroups),
  hiddenItems: sortedUnique(navigation?.hiddenItems),
});
const configurationState = (configuration) => ({
  intentConfigured: configuration?.intent?.configured === true,
  modules: Object.fromEntries(
    WORKSPACE_MODULE_KEYS.map((key) => {
      const moduleConfig = configuration?.modules?.[key];
      return [
        key,
        Boolean(
          moduleConfig?.selected ??
          moduleConfig?.enabled ??
          configuration?.effectiveModules?.[key],
        ),
      ];
    }),
  ),
  navigation: normalizeNavigation(configuration?.navigation),
});
const sameArray = (left, right) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);
const getRequestError = (error, t) => {
  const code = error?.data?.code ?? error?.data?.error?.code;
  if (code === "TENANT_MODULE_NOT_ENTITLED") {
    return t("errors.notEntitled");
  }
  return (
    error?.data?.message ??
    error?.data?.error?.message ??
    error?.error ??
    t("errors.save")
  );
};
function Toggle({ checked, disabled = false, label, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-cobalt-500 p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
          : "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-[#D9D7D1] p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45"
      }
    >
      <span
        className={
          checked
            ? "h-5 w-5 translate-x-5 rounded-full bg-white shadow-sm transition"
            : "h-5 w-5 translate-x-0 rounded-full bg-white shadow-sm transition"
        }
        aria-hidden="true"
      />
    </button>
  );
}
function LoadingState({ t }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-line bg-white shadow-card">
      <span className="inline-flex items-center gap-2 text-[12px] text-ink-muted">
        <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t("loading")}
      </span>
    </div>
  );
}
function LaunchWorkflowSaved({ progress, t }) {
  return (
    <div className="mx-auto max-w-[780px] space-y-5 pb-12">
      <LaunchWorkflowHeader
        completed={progress.total}
        total={progress.total}
        t={t}
      />

      <section
        role="status"
        aria-live="polite"
        className="rounded-[22px] border border-success/20 bg-success-soft p-5 shadow-card sm:p-7"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-success shadow-sm">
          <CheckIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.04em] text-ink">
          {t("saved")}
        </h2>
        <p className="mt-2 text-[11px] leading-5 text-ink-muted">
          {t("upToDate")}
        </p>
        <Link
          href="/app/setup"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cobalt-500 px-5 text-[11px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 sm:w-auto"
        >
          {t("returnToLaunchCenter")}
        </Link>
      </section>
    </div>
  );
}
function LaunchWorkflowQuestions({
  answers,
  changeSummary,
  editing,
  editingQuestionId,
  error,
  feedback,
  modules,
  onAnswer,
  onEdit,
  onSave,
  progress,
  saved,
  saving,
  t,
}) {
  if (saved) {
    return <LaunchWorkflowSaved progress={progress} t={t} />;
  }
  const activeQuestion =
    WORKSPACE_WORKFLOW_QUESTIONS.find(
      (question) => question.id === editingQuestionId,
    ) ?? progress.next;
  return (
    <div className="mx-auto max-w-[780px] space-y-5 pb-12">
      <LaunchWorkflowHeader
        completed={progress.completed}
        total={progress.total}
        t={t}
      />

      <section
        aria-label={t("workflowQuestions.summaryLabel")}
        className="space-y-2"
      >
        {WORKSPACE_WORKFLOW_QUESTIONS.map((question) => {
          const available = isWorkflowQuestionAvailable(question, modules);
          const answer = answers[question.id];
          const active = question.id === activeQuestion?.id;
          if (!available) {
            return (
              <div
                key={question.id}
                className="flex min-h-[62px] items-center gap-3 rounded-[16px] border border-line bg-surface/35 px-4"
              >
                <LockClosedIcon
                  className="h-4 w-4 shrink-0 text-ink-subtle"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 text-[11px] font-semibold text-ink-muted">
                  {t(`workflowQuestions.items.${question.id}.question`)}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                  {t("workflowQuestions.states.notIncluded")}
                </span>
              </div>
            );
          }
          if (active) {
            return (
              <div
                key={question.id}
                className="rounded-[20px] border border-cobalt-200 bg-white p-5 shadow-card sm:p-6"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cobalt-600">
                  {t("workflowQuestions.current")}
                </p>
                <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-ink">
                  {t(`workflowQuestions.items.${question.id}.question`)}
                </h2>
                <p className="mt-2 text-[11px] leading-5 text-ink-muted">
                  {t(`workflowQuestions.items.${question.id}.description`)}
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {(question.options ?? [true, false]).map((option) => (
                    <button
                      key={String(option)}
                      type="button"
                      aria-pressed={answer === option}
                      onClick={() => onAnswer(question.id, option)}
                      className={cx(
                        "min-h-11 rounded-full px-5 text-[11px] font-semibold transition",
                        answer === option
                          ? "bg-cobalt-500 text-white shadow-cobalt"
                          : "border border-line bg-white text-ink-muted hover:bg-surface",
                      )}
                    >
                      {t(
                        question.options
                          ? `workflowQuestions.pricingModes.${option}`
                          : option
                            ? "workflowQuestions.yes"
                            : "workflowQuestions.notNow",
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          }
          if (!isWorkflowAnswerComplete(question, answer)) return null;
          return (
            <div
              key={question.id}
              className="flex min-h-[68px] items-center gap-3 rounded-[16px] border border-line bg-white px-4 shadow-sm"
            >
              <CheckIcon
                className={cx(
                  "h-5 w-5 shrink-0",
                  answer ? "text-success" : "text-ink-subtle",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold text-ink">
                  {t(`workflowQuestions.items.${question.id}.question`)}
                </span>
                <span
                  className={cx(
                    "mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.08em]",
                    answer ? "text-success" : "text-ink-subtle",
                  )}
                >
                  {question.options
                    ? t(`workflowQuestions.pricingModes.${answer}`)
                    : answer
                      ? t("workflowQuestions.states.included")
                      : t("workflowQuestions.states.notEnabled")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onEdit(question.id)}
                className="shrink-0 rounded-full px-3 py-2 text-[10px] font-semibold text-cobalt-600 transition hover:bg-cobalt-50"
              >
                {t("workflowQuestions.edit")}
              </button>
            </div>
          );
        })}
      </section>

      {progress.complete ? (
        <section className="rounded-[20px] border border-success/20 bg-success-soft p-5">
          <h2 className="text-[16px] font-semibold text-ink">
            {t("workflowQuestions.reviewTitle")}
          </h2>
          <p className="mt-1 text-[10px] leading-5 text-ink-muted">
            {t(
              editing
                ? "workflowQuestions.editReviewDescription"
                : "workflowQuestions.reviewDescription",
            )}
          </p>
          {editing ? (
            <div
              data-workflow-change-preview="true"
              className="mt-4 rounded-[15px] border border-success/20 bg-white/70 p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-success">
                {t("workflowQuestions.changePreview.title")}
              </p>
              {changeSummary.hasChanges ? (
                <ul className="mt-2 grid gap-1.5 text-[10px] leading-5 text-ink-muted sm:grid-cols-2">
                  {changeSummary.moduleChanges.map((change) => (
                    <li key={`module-${change.key}`}>
                      {t(
                        change.enabled
                          ? "workflowQuestions.changePreview.moduleEnabled"
                          : "workflowQuestions.changePreview.moduleDisabled",
                        {
                          name: change.label,
                        },
                      )}
                    </li>
                  ))}
                  {changeSummary.navigationChanges.map((change) => (
                    <li key={`navigation-${change.kind}-${change.key}`}>
                      {t(
                        change.visible
                          ? "workflowQuestions.changePreview.navigationShown"
                          : "workflowQuestions.changePreview.navigationHidden",
                        {
                          name: change.label,
                        },
                      )}
                    </li>
                  ))}
                  {changeSummary.answerChanges.map((change) => (
                    <li key={`answer-${change.key}`}>
                      {change.key === "pricingMode"
                        ? t("workflowQuestions.changePreview.pricing", {
                            mode: t(
                              `workflowQuestions.pricingModes.${change.answer}`,
                            ),
                          })
                        : t(
                            change.answer
                              ? "workflowQuestions.changePreview.answerYes"
                              : "workflowQuestions.changePreview.answerNo",
                            {
                              name: change.label,
                            },
                          )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[10px] leading-5 text-ink-muted">
                  {t("workflowQuestions.changePreview.noChanges")}
                </p>
              )}
            </div>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={saving || (editing && !changeSummary.hasChanges)}
              onClick={onSave}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[11px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:opacity-50 sm:w-auto"
            >
              {saving ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {t(
                editing
                  ? "workflowQuestions.applyChanges"
                  : "workflowQuestions.save",
              )}
            </button>
            {editing ? (
              <Link
                href="/app/setup"
                aria-disabled={saving || undefined}
                className={cx(
                  "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-ink-muted transition hover:bg-surface sm:w-auto",
                  saving && "pointer-events-none opacity-50",
                )}
              >
                {t("workflowQuestions.cancel")}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-[10px] font-medium text-danger">
          {error}
        </p>
      ) : feedback ? (
        <p role="status" className="text-[10px] font-medium text-success">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}
export default function WorkspaceModulesPage({ showPageHeader = true }) {
  const t = useTranslations("WorkspaceModules");
  const dashboardT = useTranslations("Dashboard");
  const searchParams = useSearchParams();
  const fromLaunchCenter = searchParams.get("from") === "launch-center";
  const editWorkflowQuestions =
    fromLaunchCenter && searchParams.get("workflow") === "edit";
  const access = useSelector(selectCurrentWorkspaceAccess);
  const allowed = hasPermission(
    access,
    PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
  );
  const query = useGetWorkspaceConfigurationQuery(undefined, {
    skip: !allowed,
  });
  const [updateConfiguration, updateState] =
    useUpdateWorkspaceConfigurationMutation();
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const [workflowAnswers, setWorkflowAnswers] = useState({});
  const [initialWorkflowAnswers, setInitialWorkflowAnswers] = useState({});
  const [editingWorkflowQuestionId, setEditingWorkflowQuestionId] =
    useState("");
  const [workflowQuestionSaved, setWorkflowQuestionSaved] = useState(false);

  /* The editable draft intentionally follows each authoritative query result. */
  useEffect(() => {
    if (!query.data) return;
    const nextState = configurationState(query.data);
    if (
      fromLaunchCenter &&
      (nextState.intentConfigured === false || editWorkflowQuestions)
    ) {
      const answers = nextState.intentConfigured
        ? getWorkspaceWorkflowAnswers(query.data)
        : {};
      setWorkflowAnswers(answers);
      setInitialWorkflowAnswers(answers);
      setEditingWorkflowQuestionId("");
      setDraft(nextState);
    } else {
      setDraft(nextState);
      setWorkflowAnswers({});
      setInitialWorkflowAnswers({});
    }
    setBaseline(nextState);
    setTemplatesExpanded(nextState.intentConfigured === false);
  }, [editWorkflowQuestions, fromLaunchCenter, query.data]);
  useEffect(() => {
    if (!showSavedConfirmation) return undefined;
    const timeoutId = window.setTimeout(
      () => setShowSavedConfirmation(false),
      4000,
    );
    return () => window.clearTimeout(timeoutId);
  }, [showSavedConfirmation]);
  const moduleChanges = useMemo(() => {
    if (!draft || !baseline) return {};
    return Object.fromEntries(
      WORKSPACE_MODULE_KEYS.filter(
        (key) => draft.modules[key] !== baseline.modules[key],
      ).map((key) => [key, draft.modules[key]]),
    );
  }, [baseline, draft]);
  const navigationChanged = useMemo(() => {
    if (!draft || !baseline) return false;
    return (
      !sameArray(
        draft.navigation.hiddenGroups,
        baseline.navigation.hiddenGroups,
      ) ||
      !sameArray(draft.navigation.hiddenItems, baseline.navigation.hiddenItems)
    );
  }, [baseline, draft]);
  const intentNeedsConfirmation = baseline?.intentConfigured === false;
  const dirty =
    intentNeedsConfirmation ||
    Object.keys(moduleChanges).length > 0 ||
    navigationChanged;
  const showActionBar =
    dirty ||
    updateState.isLoading ||
    Boolean(error) ||
    Boolean(feedback && fromLaunchCenter);
  const activePresetId = useMemo(
    () =>
      draft
        ? getMatchingWorkflowPresetId({
            moduleKeys: WORKSPACE_MODULE_KEYS,
            modules: query.data?.modules,
            draft,
          })
        : null,
    [draft, query.data?.modules],
  );
  const workflowQuestionProgress = useMemo(
    () =>
      getWorkflowQuestionProgress(workflowAnswers, query.data?.modules ?? {}),
    [query.data?.modules, workflowAnswers],
  );
  const workflowAnswersWereStored = hasStoredWorkspaceWorkflowAnswers(
    query.data,
  );
  const workflowAnswersChanged = useMemo(
    () =>
      JSON.stringify(workflowAnswers) !==
        JSON.stringify(initialWorkflowAnswers) ||
      (editWorkflowQuestions && !workflowAnswersWereStored),
    [
      editWorkflowQuestions,
      initialWorkflowAnswers,
      workflowAnswers,
      workflowAnswersWereStored,
    ],
  );
  const workflowChangeSummary = useMemo(() => {
    const answerDetails = WORKSPACE_WORKFLOW_QUESTIONS.filter(
      (question) =>
        isWorkflowAnswerComplete(question, workflowAnswers[question.id]) &&
        (workflowAnswers[question.id] !== initialWorkflowAnswers[question.id] ||
          (editWorkflowQuestions && !workflowAnswersWereStored)),
    ).map(({ id }) => ({
      key: id,
      answer: workflowAnswers[id],
      label: t(`workflowQuestions.items.${id}.question`),
    }));
    return {
      moduleChanges: [],
      navigationChanges: [],
      answerChanges: answerDetails,
      hasChanges: answerDetails.length > 0 || workflowAnswersChanged,
    };
  }, [
    editWorkflowQuestions,
    initialWorkflowAnswers,
    t,
    workflowAnswers,
    workflowAnswersChanged,
    workflowAnswersWereStored,
  ]);
  if (!allowed) {
    return (
      <div className="rounded-[22px] border border-line bg-white p-6 shadow-card">
        <LockClosedIcon className="h-6 w-6 text-ink-muted" aria-hidden="true" />
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.04em] text-ink">
          {t("unauthorized.title")}
        </h1>
        <p className="mt-2 max-w-xl text-[12px] leading-6 text-ink-muted">
          {t("unauthorized.description")}
        </p>
      </div>
    );
  }
  if (query.isLoading && !draft) return <LoadingState t={t} />;
  if (query.isError && !draft) {
    return (
      <div className="rounded-[22px] border border-danger/20 bg-danger-soft p-6">
        <p className="text-[12px] text-danger">{t("errors.load")}</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="mt-4 rounded-full bg-white px-4 py-2 text-[10px] font-semibold text-danger shadow-sm"
        >
          {t("retry")}
        </button>
      </div>
    );
  }
  if (!draft) return null;
  const setModule = (key, selected) => {
    setFeedback("");
    setError("");
    setShowSavedConfirmation(false);
    setDraft((current) => ({
      ...current,
      modules: {
        ...current.modules,
        [key]: selected,
      },
    }));
  };
  const setNavigationVisibility = (kind, key, visible) => {
    const field = kind === "group" ? "hiddenGroups" : "hiddenItems";
    setFeedback("");
    setError("");
    setShowSavedConfirmation(false);
    setDraft((current) => {
      const values = new Set(current.navigation[field]);
      if (visible) values.delete(key);
      else values.add(key);
      return {
        ...current,
        navigation: {
          ...current.navigation,
          [field]: sortedUnique([...values]),
        },
      };
    });
  };
  const applyWorkflowPreset = (presetId) => {
    setShowSavedConfirmation(false);
    if (activePresetId === presetId) {
      setError("");
      setFeedback("");
      return;
    }
    const nextState = buildWorkflowPresetState({
      presetId,
      moduleKeys: WORKSPACE_MODULE_KEYS,
      modules: query.data?.modules ?? {},
      navigationEntries: CUSTOMIZABLE_NAVIGATION,
    });
    if (!nextState) return;
    setDraft((current) => ({
      ...nextState,
      intentConfigured: current.intentConfigured,
    }));
    setError("");
    setFeedback(
      t("presets.applied", {
        preset: t(`presets.options.${presetId}.title`),
      }),
    );
  };
  const answerWorkflowQuestion = (questionId, answer) => {
    const nextAnswers = {
      ...workflowAnswers,
      [questionId]: answer,
    };
    setWorkflowAnswers(nextAnswers);
    setEditingWorkflowQuestionId("");
    setShowSavedConfirmation(false);
    setError("");
    setFeedback("");
  };
  const save = async ({ includeWorkflowIntent = false } = {}) => {
    setError("");
    setFeedback("");
    setShowSavedConfirmation(false);
    const body = includeWorkflowIntent
      ? {
          intent: buildWorkspaceWorkflowIntent(
            workflowAnswers,
            query.data?.intent,
          ),
        }
      : {
          ...(intentNeedsConfirmation
            ? {
                intent: {
                  definitionVersion: 2,
                },
              }
            : {}),
          ...(Object.keys(moduleChanges).length
            ? {
                modules: moduleChanges,
              }
            : {}),
          ...(navigationChanged
            ? {
                navigation: draft.navigation,
              }
            : {}),
        };
    try {
      const response = await updateConfiguration(body).unwrap();
      const nextState = configurationState(response);
      setDraft(nextState);
      setBaseline(nextState);
      setTemplatesExpanded(false);
      setFeedback(t("saved"));
      setShowSavedConfirmation(true);
      return true;
    } catch (requestError) {
      setError(getRequestError(requestError, t));
      return false;
    }
  };
  const saveWorkflowQuestions = async () => {
    if (
      await save({
        includeWorkflowIntent: true,
      })
    ) {
      setWorkflowQuestionSaved(true);
    }
  };
  if (
    fromLaunchCenter &&
    (intentNeedsConfirmation || editWorkflowQuestions || workflowQuestionSaved)
  ) {
    return (
      <LaunchWorkflowQuestions
        answers={workflowAnswers}
        changeSummary={workflowChangeSummary}
        editing={editWorkflowQuestions}
        editingQuestionId={editingWorkflowQuestionId}
        error={error}
        feedback={feedback}
        modules={query.data?.modules ?? {}}
        onAnswer={answerWorkflowQuestion}
        onEdit={setEditingWorkflowQuestionId}
        onSave={saveWorkflowQuestions}
        progress={workflowQuestionProgress}
        saved={workflowQuestionSaved}
        saving={updateState.isLoading}
        t={t}
      />
    );
  }
  return (
    <div className="min-w-0 space-y-4 pb-10">
      {showPageHeader ? (
        <header>
          <h1 className="text-[28px] font-semibold tracking-[-0.05em] text-ink sm:text-[32px]">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-ink-muted">
            {t("description")}
          </p>
        </header>
      ) : null}

      <section className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
        <h2 className="sr-only">{t("features.title")}</h2>
        <div className="space-y-5 p-4 sm:p-6">
          <div className="overflow-hidden rounded-[18px] border border-cobalt-100 bg-cobalt-50/30">
            <button
              type="button"
              aria-expanded={templatesExpanded}
              aria-controls="workspace-template-options"
              onClick={() => setTemplatesExpanded((expanded) => !expanded)}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-cobalt-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt-500/30 sm:px-5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white text-cobalt-700 shadow-sm">
                <Squares2X2Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-cobalt-600">
                  {t("presets.eyebrow")}
                </span>
                <span className="mt-0.5 block text-[14px] font-semibold tracking-[-0.02em] text-ink">
                  {t("presets.title")}
                </span>
              </span>
              <ChevronDownIcon
                className={cx(
                  "h-4 w-4 shrink-0 text-cobalt-600 transition-transform",
                  templatesExpanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            {templatesExpanded ? (
              <div
                id="workspace-template-options"
                className="border-t border-cobalt-100 px-4 pb-4 pt-3 sm:px-5 sm:pb-5"
              >
                <p className="max-w-3xl text-[10px] leading-5 text-ink-muted">
                  {t("presets.description")}
                </p>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  {WORKSPACE_WORKFLOW_PRESETS.map((preset) => {
                    const available = isWorkflowPresetAvailable(
                      preset,
                      query.data?.modules,
                    );
                    const selected = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={!available}
                        onClick={() => applyWorkflowPreset(preset.id)}
                        className={cx(
                          "min-h-[112px] rounded-[16px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:cursor-not-allowed disabled:opacity-50",
                          selected
                            ? "border-cobalt-300 bg-white shadow-sm"
                            : "border-line bg-white/75 hover:border-cobalt-200 hover:bg-white",
                        )}
                      >
                        <span className="flex items-start gap-3">
                          <span
                            className={cx(
                              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                              selected
                                ? "border-cobalt-500 bg-cobalt-500 text-white"
                                : "border-line-strong bg-white text-transparent",
                            )}
                          >
                            <CheckIcon
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12px] font-semibold text-ink">
                              {t(`presets.options.${preset.id}.title`)}
                            </span>
                            <span className="mt-1 block text-[10px] leading-5 text-ink-muted">
                              {t(`presets.options.${preset.id}.description`)}
                            </span>
                            {!available ? (
                              <span className="mt-1.5 block text-[9px] font-semibold text-sand-700">
                                {t("presets.notAvailable")}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-[10px] leading-5 text-ink-muted">
                  {t("presets.note")}{" "}
                  <Link
                    href="/app/settings/billing"
                    className="font-semibold text-cobalt-600 hover:text-cobalt-700"
                  >
                    {t("reviewPlan")}
                  </Link>
                </p>
              </div>
            ) : null}
          </div>

          {MODULE_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.key}>
                <div className="mb-3 flex items-center gap-2 text-ink">
                  <GroupIcon
                    className="h-4 w-4 text-cobalt-600"
                    aria-hidden="true"
                  />
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.11em]">
                    {t(`groups.${group.key}`)}
                  </h3>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {group.modules.map((key) => {
                    const moduleConfig = query.data?.modules?.[key] ?? {};
                    const locked = moduleConfig.entitled === false;
                    const checked = locked ? false : draft.modules[key];
                    const dependencyBlocked =
                      key === "automations" &&
                      checked &&
                      !draft.modules.communications;
                    return (
                      <div
                        key={key}
                        className={
                          checked
                            ? "flex min-h-[112px] items-start gap-4 rounded-[17px] border border-cobalt-200 bg-cobalt-50/45 p-4"
                            : "flex min-h-[112px] items-start gap-4 rounded-[17px] border border-line bg-surface/30 p-4"
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-[12px] font-semibold text-ink">
                              {t(`modules.${key}.name`)}
                            </h4>
                            {locked ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-sand-700">
                                <LockClosedIcon
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                {t("notIncluded")}
                              </span>
                            ) : dependencyBlocked ? (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                                {t("requiresCommunications")}
                              </span>
                            ) : checked ? (
                              <span className="rounded-full bg-success-soft px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-success">
                                {t("active")}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-[10px] leading-5 text-ink-muted">
                            {t(`modules.${key}.description`)}
                          </p>
                          {locked ? (
                            <Link
                              href="/app/settings/billing"
                              className="mt-2 inline-flex text-[10px] font-semibold text-cobalt-600 hover:text-cobalt-700"
                            >
                              {t("reviewPlan")}
                            </Link>
                          ) : null}
                        </div>
                        <Toggle
                          checked={checked}
                          disabled={locked}
                          label={t("toggleModule", {
                            module: t(`modules.${key}.name`),
                          })}
                          onChange={(value) => setModule(key, value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex items-start gap-3 rounded-[16px] border border-coral-200 bg-coral-50/55 p-4">
            <CheckIcon
              className="mt-0.5 h-5 w-5 shrink-0 text-terracotta-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-terracotta-900">
                {t("defaults.title")}
              </p>
              <p className="mt-1 text-[10px] leading-5 text-terracotta-800/80">
                {t("defaults.description")}
              </p>
              <Link
                href="/app/products?category=openStudio"
                className="mt-2 inline-flex text-[10px] font-semibold text-terracotta-700 hover:text-terracotta-800"
              >
                {t("defaults.action")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-line bg-white shadow-card">
        <div className="flex items-start gap-3 border-b border-line px-5 py-5 sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-coral-100 text-terracotta-700">
            <EyeIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-ink">
              {t("navigation.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-5 text-ink-muted">
              {t("navigation.description")}
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-2 sm:p-6">
          {CUSTOMIZABLE_NAVIGATION.map((entry) => {
            const isGroup = entry.type === "group";
            const groupVisible =
              !isGroup || !draft.navigation.hiddenGroups.includes(entry.key);
            const EntryIcon = entry.icon ?? entry.items[0]?.icon;
            return (
              <div
                key={entry.key}
                className="overflow-hidden rounded-[18px] border border-line bg-surface/20"
              >
                <div className="flex min-h-[66px] items-center gap-3 bg-white px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-cobalt-50 text-cobalt-700">
                    {EntryIcon ? (
                      <EntryIcon
                        className="h-[17px] w-[17px]"
                        aria-hidden="true"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-ink">
                      {dashboardT(
                        `nav.${isGroup ? entry.labelKey : entry.items[0].labelKey}`,
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      {isGroup
                        ? t("navigation.sectionVisibility")
                        : t("navigation.itemVisibility")}
                    </p>
                  </div>
                  <Toggle
                    checked={
                      isGroup
                        ? groupVisible
                        : !draft.navigation.hiddenItems.includes(
                            entry.items[0].key,
                          )
                    }
                    label={t("toggleNavigation", {
                      item: dashboardT(
                        `nav.${isGroup ? entry.labelKey : entry.items[0].labelKey}`,
                      ),
                    })}
                    onChange={(visible) =>
                      setNavigationVisibility(
                        isGroup ? "group" : "item",
                        isGroup ? entry.key : entry.items[0].key,
                        visible,
                      )
                    }
                  />
                </div>

                {isGroup ? (
                  <div className="border-t border-line px-3 py-2">
                    {entry.items.map((item) => {
                      const visible = !draft.navigation.hiddenItems.includes(
                        item.key,
                      );
                      return (
                        <div
                          key={item.key}
                          className="flex min-h-[48px] items-center gap-3 rounded-[12px] px-2 transition hover:bg-white"
                        >
                          {visible ? (
                            <EyeIcon
                              className="h-4 w-4 shrink-0 text-cobalt-600"
                              aria-hidden="true"
                            />
                          ) : (
                            <EyeSlashIcon
                              className="h-4 w-4 shrink-0 text-ink-subtle"
                              aria-hidden="true"
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-ink">
                            {dashboardT(`nav.${item.labelKey}`)}
                          </span>
                          <Toggle
                            checked={visible}
                            label={t("toggleNavigation", {
                              item: dashboardT(`nav.${item.labelKey}`),
                            })}
                            onChange={(nextVisible) =>
                              setNavigationVisibility(
                                "item",
                                item.key,
                                nextVisible,
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-3 border-t border-line bg-cobalt-50/35 px-5 py-4 text-cobalt-900 sm:px-6">
          <CheckIcon
            className="mt-0.5 h-4 w-4 shrink-0 text-cobalt-600"
            aria-hidden="true"
          />
          <p className="text-[10px] leading-5">{t("navigation.protected")}</p>
        </div>
      </section>

      {showActionBar ? (
        <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-[18px] border border-line bg-white/95 p-3 shadow-[0_18px_50px_rgba(17,17,15,0.14)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {error ? (
              <p role="alert" className="text-[10px] font-medium text-danger">
                {error}
              </p>
            ) : feedback ? (
              <p role="status" className="text-[10px] font-medium text-success">
                {feedback}
              </p>
            ) : (
              <p className="text-[10px] leading-5 text-ink-muted">
                {intentNeedsConfirmation
                  ? t("intentUnconfirmed")
                  : t("unsaved")}
              </p>
            )}
          </div>
          {dirty || updateState.isLoading ? (
            <button
              type="button"
              disabled={!dirty || updateState.isLoading}
              onClick={save}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-[11px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {updateState.isLoading ? (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {t("save")}
            </button>
          ) : null}
          {feedback && fromLaunchCenter ? (
            <Link
              href="/app/setup"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-cobalt-200 bg-cobalt-50 px-5 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100"
            >
              {t("returnToLaunchCenter")}
            </Link>
          ) : null}
        </div>
      ) : null}

      {showSavedConfirmation && feedback && !dirty && !fromLaunchCenter ? (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-30 flex w-[min(90vw,420px)] -translate-x-1/2 items-center justify-center gap-2 rounded-full border border-success/20 bg-white/95 px-4 py-3 text-[10px] font-medium text-success shadow-[0_16px_42px_rgba(17,17,15,0.12)] backdrop-blur"
        >
          <CheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
