"use client";

import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  BoltIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import {
  useCreateCommunicationRoutingRuleMutation,
  useDeleteCommunicationRoutingRuleMutation,
  useGetCommunicationRoutingRulesQuery,
  useUpdateCommunicationRoutingRuleMutation,
} from "@/lib/features/communications/communicationsApiSlice";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  StatusBanner,
  Toggle,
} from "./CommunicationsPrimitives";
import {
  extractMutationMessage,
  getResourceId,
  humanize,
  unwrapCollection,
} from "./communications.utils";
const categories = [
  "any",
  "booking_enquiry",
  "booking_change",
  "cancellation",
  "course_enquiry",
  "payment_problem",
  "invoice_request",
  "membership_credits",
  "access_problem",
  "complaint",
  "general",
  "spam",
  "other",
];
const blankRule = {
  name: "",
  category: "any",
  channel: "any",
  language: "any",
  priority: "any",
  locationId: "any",
  targetType: "user",
  targetId: "",
  notifyOwner: false,
  enabled: true,
};
const getPersonName = (person) =>
  person?.name ||
  [person?.firstname ?? person?.firstName, person?.lastname ?? person?.lastName]
    .filter(Boolean)
    .join(" ") ||
  person?.email ||
  "";
function RuleDialog({ open, onClose, rule, people, teams, locations, t }) {
  const [form, setForm] = useState(() => {
    const conditions = rule?.conditions ?? {};
    const action = rule?.action ?? {};
    return {
      ...blankRule,
      ...(rule ?? {}),
      category: conditions.categories?.[0] ?? "any",
      channel: conditions.channels?.[0] ?? "any",
      language: conditions.languages?.[0] ?? "any",
      priority: conditions.priorities?.[0] ?? "any",
      locationId: conditions.locationIds?.[0] ?? "any",
      targetType: action.assignTo
        ? "user"
        : action.assignTeam
          ? "team"
          : "queue",
      targetId:
        action.assignTo ??
        action.assignTeam ??
        action.addTags?.[0] ??
        "general",
      notifyOwner: action.notifyOwner ?? false,
      enabled: rule?.enabled ?? true,
    };
  });
  const [feedback, setFeedback] = useState(null);
  const [createRule, { isLoading: isCreating }] =
    useCreateCommunicationRoutingRuleMutation();
  const [updateRule, { isLoading: isUpdating }] =
    useUpdateCommunicationRoutingRuleMutation();
  const set = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  const targets = form.targetType === "team" ? teams : people;
  const submit = async (event) => {
    event.preventDefault();
    setFeedback(null);
    const payload = {
      name: form.name.trim(),
      description: rule?.description ?? "",
      enabled: form.enabled,
      order: rule?.order ?? 0,
      matchOperator: rule?.matchOperator ?? "all",
      conditions: {
        categories: form.category === "any" ? [] : [form.category],
        channels: form.channel === "any" ? [] : [form.channel],
        languages: form.language === "any" ? [] : [form.language],
        priorities: form.priority === "any" ? [] : [form.priority],
        locationIds: form.locationId === "any" ? [] : [form.locationId],
        keywords: rule?.conditions?.keywords ?? [],
        unmatchedOnly: rule?.conditions?.unmatchedOnly ?? false,
        outsideBusinessHours: rule?.conditions?.outsideBusinessHours ?? false,
      },
      action: {
        assignTo: form.targetType === "user" ? form.targetId : null,
        assignTeam: form.targetType === "team" ? form.targetId : "",
        locationId: rule?.action?.locationId ?? null,
        priority:
          form.targetType === "queue" && form.targetId === "urgent"
            ? "urgent"
            : (rule?.action?.priority ?? null),
        addTags:
          form.targetType === "queue" && form.targetId !== "general"
            ? [form.targetId]
            : (rule?.action?.addTags ?? []),
        notifyOwner: form.notifyOwner,
      },
    };
    try {
      const id = getResourceId(rule);
      if (id)
        await updateRule({
          id,
          ...payload,
        }).unwrap();
      else await createRule(payload).unwrap();
      onClose();
    } catch (error) {
      setFeedback(extractMutationMessage(error, t("feedback.routingError")));
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={rule ? t("routing.editTitle") : t("routing.createTitle")}
      description={t("routing.dialogDescription")}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-5 p-6">
        {feedback ? <StatusBanner tone="error">{feedback}</StatusBanner> : null}
        <label className="block text-xs font-medium text-ink-muted">
          {t("routing.fields.name")}
          <input
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            required
            placeholder={t("routing.namePlaceholder")}
            className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
          />
        </label>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("routing.when")}
          </legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs font-medium text-ink-muted">
              {t("routing.fields.category")}
              <select
                value={form.category}
                onChange={(event) => set("category", event.target.value)}
                className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "any"
                      ? t("routing.any")
                      : t(`categories.${category}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-muted">
              {t("routing.fields.channel")}
              <select
                value={form.channel}
                onChange={(event) => set("channel", event.target.value)}
                className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
              >
                <option value="any">{t("routing.any")}</option>
                <option value="email">{t("channels.email")}</option>
                <option value="whatsapp">{t("channels.whatsapp")}</option>
                <option value="instagram">{t("channels.instagram")}</option>
                <option value="in_app">{t("channels.portal")}</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-muted">
              {t("routing.fields.language")}
              <select
                value={form.language}
                onChange={(event) => set("language", event.target.value)}
                className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
              >
                <option value="any">{t("routing.any")}</option>
                <option value="cs">Čeština</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-muted">
              {t("routing.fields.priority")}
              <select
                value={form.priority}
                onChange={(event) => set("priority", event.target.value)}
                className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
              >
                <option value="any">{t("routing.any")}</option>
                {["low", "normal", "high", "urgent"].map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`priorities.${priority}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-muted sm:col-span-2">
              {t("routing.fields.location")}
              <select
                value={form.locationId}
                onChange={(event) => set("locationId", event.target.value)}
                className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
              >
                <option value="any">{t("routing.anyLocation")}</option>
                {locations.map((location) => (
                  <option
                    key={getResourceId(location)}
                    value={getResourceId(location)}
                  >
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-[18px] border border-line bg-sand-50 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("routing.then")}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-ink-muted">
              {t("routing.fields.targetType")}
              <select
                value={form.targetType}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    targetType: event.target.value,
                    targetId: "",
                  }));
                }}
                className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
              >
                <option value="user">{t("routing.staffMember")}</option>
                <option value="team">{t("routing.team")}</option>
                <option value="queue">{t("routing.sharedQueue")}</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-ink-muted">
              {t("routing.fields.target")}
              {form.targetType === "queue" ? (
                <select
                  value={form.targetId}
                  onChange={(event) => set("targetId", event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                >
                  <option value="">{t("routing.chooseTarget")}</option>
                  <option value="general">{t("routing.queues.general")}</option>
                  <option value="needs_review">
                    {t("routing.queues.needs_review")}
                  </option>
                  <option value="urgent">{t("routing.queues.urgent")}</option>
                </select>
              ) : form.targetType === "team" && !teams.length ? (
                <input
                  value={form.targetId}
                  onChange={(event) => set("targetId", event.target.value)}
                  required
                  placeholder={t("routing.teamName")}
                  className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                />
              ) : (
                <select
                  value={form.targetId}
                  onChange={(event) => set("targetId", event.target.value)}
                  required
                  className="mt-1.5 w-full rounded-[14px] border-line bg-white text-sm focus:border-cobalt-300 focus:ring-cobalt-200"
                >
                  <option value="">{t("routing.chooseTarget")}</option>
                  {targets.map((target) => (
                    <option
                      key={getResourceId(target) || target.name}
                      value={
                        form.targetType === "team"
                          ? target.name
                          : getResourceId(target)
                      }
                    >
                      {form.targetType === "team"
                        ? target.name
                        : getPersonName(target)}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>
          <div className="mt-4">
            <Toggle
              checked={form.notifyOwner}
              onChange={(checked) => set("notifyOwner", checked)}
              label={t("routing.notifyOwner")}
              description={t("routing.notifyOwnerHint")}
            />
          </div>
        </fieldset>

        <Toggle
          checked={form.enabled}
          onChange={(checked) => set("enabled", checked)}
          label={t("routing.active")}
          description={t("routing.activeHint")}
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-xs font-semibold text-ink"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="rounded-full bg-cobalt-500 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {isCreating || isUpdating ? t("actions.saving") : t("actions.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function RoutingRulesView({ canManage, overview }) {
  const t = useTranslations("Communications");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { data, isLoading, isError, refetch } =
    useGetCommunicationRoutingRulesQuery();
  const [updateRule] = useUpdateCommunicationRoutingRuleMutation();
  const [deleteRule] = useDeleteCommunicationRoutingRuleMutation();
  const rules = unwrapCollection(data, "routingRules").length
    ? unwrapCollection(data, "routingRules")
    : unwrapCollection(data, "rules");
  const source =
    overview?.overview ??
    overview?.data?.overview ??
    overview?.data ??
    overview ??
    {};
  const people = unwrapCollection(source, "staff").length
    ? unwrapCollection(source, "staff")
    : unwrapCollection(source, "assignees");
  const teams = unwrapCollection(source, "teams");
  const locations = unwrapCollection(source, "locations");
  const orderedRules = useMemo(
    () =>
      [...rules].sort(
        (a, b) =>
          Number(a.order ?? a.priorityOrder ?? 0) -
          Number(b.order ?? b.priorityOrder ?? 0),
      ),
    [rules],
  );
  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (rule) => {
    setEditing(rule);
    setDialogOpen(true);
  };
  const remove = async (rule) => {
    if (
      !window.confirm(
        t("routing.deleteConfirm", {
          name: rule.name,
        }),
      )
    )
      return;
    await deleteRule(getResourceId(rule));
  };
  return (
    <section className="rounded-[26px] border border-line bg-white shadow-card">
      <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-cobalt-600" />
            <h2 className="text-base font-semibold text-ink">
              {t("routing.title")}
            </h2>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">
            {t("routing.description")}
          </p>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cobalt-500 px-4 py-2.5 text-xs font-semibold text-white shadow-cobalt"
          >
            <PlusIcon className="h-4 w-4" />
            {t("routing.add")}
          </button>
        ) : null}
      </header>

      <div className="border-b border-cobalt-200 bg-cobalt-50 px-5 py-4 text-xs leading-5 text-cobalt-800 sm:px-6">
        <strong>{t("routing.ownerVisibilityTitle")}</strong>{" "}
        {t("routing.ownerVisibilityDescription")}
      </div>

      {isLoading ? <LoadingState label={t("loading.routing")} /> : null}
      {isError ? (
        <ErrorState
          title={t("errors.routingTitle")}
          description={t("errors.routingDescription")}
          actionLabel={t("actions.retry")}
          onRetry={refetch}
        />
      ) : null}
      {!isLoading && !isError && !orderedRules.length ? (
        <EmptyState
          icon={BoltIcon}
          title={t("empty.routingTitle")}
          description={t("empty.routingDescription")}
          action={
            canManage ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-full bg-cobalt-500 px-4 py-2 text-xs font-semibold text-white"
              >
                {t("routing.add")}
              </button>
            ) : null
          }
        />
      ) : null}

      {!isLoading && !isError && orderedRules.length ? (
        <div className="divide-y divide-line">
          {orderedRules.map((rule, index) => {
            const conditions = rule.conditions ?? {};
            const action = rule.action ?? {};
            const conditionParts = [
              conditions.categories?.[0]
                ? t(`categories.${conditions.categories[0]}`)
                : null,
              conditions.channels?.[0]
                ? humanize(conditions.channels[0])
                : null,
              conditions.languages?.[0]
                ? String(conditions.languages[0]).toUpperCase()
                : null,
              conditions.priorities?.[0]
                ? t(`priorities.${conditions.priorities[0]}`)
                : null,
            ].filter(Boolean);
            const targetLabel = action.assignTo
              ? getPersonName(
                  people.find(
                    (person) =>
                      getResourceId(person) === String(action.assignTo),
                  ),
                ) || t("routing.staffMember")
              : action.assignTeam
                ? teams.find((team) => team.name === action.assignTeam)?.name ||
                  action.assignTeam
                : action.addTags?.[0]
                  ? t(`routing.queues.${action.addTags[0]}`)
                  : t("routing.queues.general");
            return (
              <article
                key={getResourceId(rule)}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-semibold text-sand-800">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      {rule.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${rule.enabled !== false ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted"}`}
                    >
                      {rule.enabled !== false
                        ? t("routing.enabled")
                        : t("routing.disabled")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="rounded-full bg-sand-50 px-2.5 py-1">
                      {conditionParts.join(" · ") || t("routing.anyMessage")}
                    </span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cobalt-50 px-2.5 py-1 text-cobalt-700">
                      <UserGroupIcon className="h-3.5 w-3.5" />
                      {targetLabel}
                    </span>
                  </div>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={rule.enabled !== false}
                      onChange={(checked) =>
                        updateRule({
                          id: getResourceId(rule),
                          enabled: checked,
                        })
                      }
                      label=""
                    />
                    <button
                      type="button"
                      onClick={() => openEdit(rule)}
                      className="rounded-full border border-line px-3 py-2 text-xs font-semibold text-ink hover:border-cobalt-200 hover:text-cobalt-700"
                    >
                      {t("actions.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(rule)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-danger-soft hover:text-danger"
                      aria-label={t("actions.delete")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {dialogOpen ? (
        <RuleDialog
          key={getResourceId(editing) || "new"}
          open
          onClose={() => setDialogOpen(false)}
          rule={editing}
          people={people}
          teams={teams}
          locations={locations}
          t={t}
        />
      ) : null}
    </section>
  );
}
