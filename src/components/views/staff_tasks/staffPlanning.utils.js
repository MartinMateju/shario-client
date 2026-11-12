const pad = (value) => String(value).padStart(2, "0");

export const getEntityId = (value) => {
  const candidate =
    value && typeof value === "object"
      ? (value._id ??
        value.id ??
        value.userId ??
        value.memberId ??
        value.membershipId ??
        value.staffMemberId)
      : value;

  return candidate === null || candidate === undefined ? "" : String(candidate);
};

export const getPlanningDateKey = (instant = new Date(), timeZone) => {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(instant);
      const values = Object.fromEntries(
        parts.map(({ type, value }) => [type, value]),
      );

      return `${values.year}-${values.month}-${values.day}`;
    } catch {
      // Invalid zones fall back to the browser calendar.
    }
  }

  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(
    instant.getDate(),
  )}`;
};

export const formatPlanningDate = (
  value,
  locale = "en",
  options = { day: "numeric", month: "short", year: "numeric" },
) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(locale, options).format(date);
};

export const getMemberName = (member, fallback = "") => {
  const user = member?.user ?? member?.account ?? {};
  const profile =
    member?.workspaceProfile ?? member?.profile ?? user?.profile ?? {};

  return (
    member?.displayName ||
    member?.name ||
    profile.displayName ||
    [user.firstname ?? user.firstName, user.lastname ?? user.lastName]
      .filter(Boolean)
      .join(" ") ||
    user.email ||
    member?.email ||
    fallback
  );
};

const toArray = (value) => (Array.isArray(value) ? value : []);

export const normalizeLinkedTaskIds = (value) =>
  toArray(value).map(getEntityId).filter(Boolean);

export const normalizeDailyUpdate = (value) => {
  if (!value || typeof value !== "object") return null;

  return {
    ...value,
    id: getEntityId(value),
    focusToday: String(value.focusToday ?? value.focus ?? ""),
    completedSinceLast: String(
      value.completedSinceLast ?? value.completed ?? "",
    ),
    blockers: String(value.blockers ?? value.blocker ?? ""),
    notWorkingToday: value.notWorkingToday === true,
    needsOwnerAttention: value.needsOwnerAttention === true,
    attentionStatus: String(
      value.attentionStatus ?? value.attention?.status ?? "",
    ),
    linkedTaskIds: normalizeLinkedTaskIds(
      value.linkedTaskIds ?? value.linkedTasks,
    ),
    submittedAt:
      value.submittedAt ?? value.updatedAt ?? value.createdAt ?? null,
  };
};

export const normalizePlanningStaff = (today = {}) => {
  const source =
    today.staff ?? today.members ?? today.people ?? today.submissions ?? [];

  return toArray(source).map((member, index) => {
    const update = normalizeDailyUpdate(
      member.update ?? member.dailyUpdate ?? member.submission,
    );
    const linked = member.isLinked !== false && member.state !== "not-linked";
    const expected = linked && member.isExpectedToday === true;
    const state = !linked
      ? "not-linked"
      : (member.state ??
        (update?.notWorkingToday
          ? "not-working"
          : update
            ? update.blockers || update.needsOwnerAttention
              ? "attention"
              : "submitted"
            : expected
              ? "missing"
              : "not-expected"));

    return {
      ...member,
      id:
        getEntityId(member.memberId ?? member.membershipId ?? member) ||
        `member-${index}`,
      userId: getEntityId(member.userId ?? member.user),
      name: getMemberName(member, `Staff member ${index + 1}`),
      update,
      state,
      isExpectedToday: expected,
      isLinked: linked,
      canManageSchedule: member.canManageSchedule === true,
      expectedWeekdays: toArray(
        member.expectedWeekdays ?? member.schedule?.expectedWeekdays,
      ).map(Number),
    };
  });
};

const normalizeOutcome = (value, index) => ({
  ...value,
  id: getEntityId(value) || `outcome-${index}`,
  title: String(value?.title ?? ""),
  completed: value?.completed === true,
  linkedTaskIds: normalizeLinkedTaskIds(
    value?.linkedTaskIds ?? value?.linkedTasks,
  ),
});

export const normalizeWeeklyPlans = (week = {}) => {
  const source = week.plans ?? week.members ?? week.staff ?? [];

  return toArray(source).map((plan, index) => ({
    ...plan,
    id: getEntityId(plan) || `plan-${index}`,
    userId: getEntityId(plan.userId ?? plan.user ?? plan.member),
    name: getMemberName(plan, `Staff member ${index + 1}`),
    isMine: plan.isMine === true,
    outcomes: toArray(plan.outcomes).map(normalizeOutcome),
  }));
};

const normalizePriority = (value, index) => ({
  ...value,
  id: getEntityId(value) || `priority-${index}`,
  title: String(value?.title ?? ""),
  ownerUserId: getEntityId(value?.ownerUserId ?? value?.owner),
  completed: value?.completed === true,
  linkedTaskIds: normalizeLinkedTaskIds(
    value?.linkedTaskIds ?? value?.linkedTasks,
  ),
});

export const normalizePrioritySets = (month = {}) => {
  const source =
    month.prioritySets ?? month.sets ?? month.prioritiesByLocation ?? [];

  if (Array.isArray(source)) {
    return source.map((set, index) => ({
      ...set,
      id: getEntityId(set) || `priority-set-${index}`,
      locationId: getEntityId(set.locationId ?? set.location),
      priorities: toArray(set.priorities).map(normalizePriority),
    }));
  }

  return Object.entries(source || {}).map(([locationId, priorities]) => ({
    id: locationId || "all",
    locationId: locationId === "all" ? "" : locationId,
    priorities: toArray(priorities).map(normalizePriority),
  }));
};

export const normalizeStaffTasks = (value) => {
  const source = Array.isArray(value)
    ? value
    : (value?.tasks ?? value?.items ?? value?.data ?? []);

  return toArray(source).map((task, index) => {
    const status = String(task?.status ?? "todo");

    return {
      ...task,
      id: getEntityId(task) || `task-${index}`,
      title: String(task?.title ?? ""),
      status,
      column: task?.column ?? (status === "blocked" ? "waiting" : status),
      assignedToId: getEntityId(task?.assignedTo),
      locationId: getEntityId(task?.locationId ?? task?.location),
      links: toArray(task?.links),
    };
  });
};

export const normalizeStaffPlanningOverview = (value, currentUserId = "") => {
  const source =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const metadata = source.metadata ?? source.meta ?? {};
  const today = source.today ?? {};
  const week = source.week ?? {};
  const month = source.month ?? {};
  const staff = normalizePlanningStaff(today);
  const staffByUserId = new Map(
    staff
      .filter((member) => member.userId)
      .map((member) => [member.userId, member]),
  );
  const plans = normalizeWeeklyPlans(week).map((plan) => ({
    ...plan,
    name: staffByUserId.get(plan.userId)?.name ?? plan.name,
    isMine:
      plan.isMine ||
      (Boolean(currentUserId) && plan.userId === String(currentUserId)),
  }));
  const counts = today.counts ?? {};

  return {
    metadata: {
      ...metadata,
      date: metadata.date ?? source.date ?? "",
      week: metadata.week ?? week.period ?? {},
      month: metadata.month ?? month.period ?? {},
    },
    permissions: {
      canSubmit: source.permissions?.canSubmit === true,
      canViewTeam: source.permissions?.canViewTeam === true,
      canManage: source.permissions?.canManage === true,
      canManageGlobalSettings:
        source.permissions?.canManageGlobalSettings === true,
    },
    settings: {
      expectedUpdateTime: String(
        source.settings?.expectedUpdateTime ??
          source.settings?.reminderTime ??
          source.settings?.dailyReminderTime ??
          "09:00",
      ),
    },
    today: {
      ...today,
      myUpdate: normalizeDailyUpdate(
        today.myUpdate ?? today.currentUserUpdate ?? today.mine,
      ),
      staff,
      counts: {
        submitted:
          Number(counts.submitted) ||
          staff.filter((member) => member.state === "submitted").length,
        missing:
          Number(counts.missing) ||
          staff.filter((member) => member.state === "missing").length,
        waiting:
          Number(counts.waiting) ||
          staff.filter((member) => member.state === "waiting").length,
        blocked:
          Number(counts.blocked) ||
          staff.filter((member) => member.state === "blocked").length,
        attention:
          Number(counts.needsOwnerAttention ?? counts.attention) ||
          staff.filter((member) =>
            ["attention", "needs-attention"].includes(member.state),
          ).length,
        notWorking:
          Number(counts.notWorking ?? counts.not_working) ||
          staff.filter((member) => member.state === "not-working").length,
      },
    },
    week: {
      ...week,
      plans,
      myPlan:
        plans.find((plan) => plan.isMine) ??
        (week.myPlan
          ? {
              ...week.myPlan,
              id: getEntityId(week.myPlan),
              outcomes: toArray(week.myPlan.outcomes).map(normalizeOutcome),
            }
          : null),
    },
    month: {
      ...month,
      prioritySets: normalizePrioritySets(month),
    },
    board: {
      ...(source.board ?? {}),
      tasks: normalizeStaffTasks(source.board?.tasks),
    },
  };
};

export const normalizeAiPlanningResult = (value) => {
  const source =
    value?.data && typeof value.data === "object" ? value.data : (value ?? {});
  const toTextList = (input) =>
    toArray(input)
      .map((item) =>
        typeof item === "string"
          ? item
          : String(item?.text ?? item?.title ?? item?.description ?? ""),
      )
      .filter(Boolean);

  return {
    ...source,
    headline: String(source.headline ?? source.title ?? ""),
    summary: String(source.summary ?? source.digest ?? source.text ?? ""),
    highlights: toTextList(source.highlights),
    attention: toTextList(source.attention ?? source.blockers),
    recommendations: toTextList(source.recommendations ?? source.suggestions),
    dataLimitations: toTextList(source.dataLimitations ?? source.limitations),
  };
};

export const getMutationError = (error, fallback) =>
  error?.data?.message || error?.data?.error || error?.error || fallback;

export const isDateOnly = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
