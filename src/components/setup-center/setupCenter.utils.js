import { NATIVE_INVOICES_ENABLED } from "@/config/features";

export const SETUP_STEP_ORDER = [
  "studio",
  "payments",
  "location",
  "bookable_offer",
  "membership",
  "inventory",
  "communications",
  "team",
  "public_site",
  "publish",
  "practice_booking",
];

const SETUP_STEP_ORDER_INDEX = new Map(
  SETUP_STEP_ORDER.map((stepId, index) => [stepId, index]),
);
const TERMINAL_LAUNCH_STEP_INDEX = SETUP_STEP_ORDER.indexOf("public_site");

const SETUP_STEP_ESTIMATED_MINUTES = Object.freeze({
  studio: 2,
  location: 3,
  membership: 3,
  payments: 5,
  bookable_offer: 3,
  public_site: 5,
  practice_booking: 4,
  inventory: 2,
  communications: 4,
  team: 2,
  publish: 1,
});

export const PRACTICE_ACTION_ORDER = [
  "create_booking",
  "preview_invoice",
  "preview_confirmation",
  "preview_membership",
  "check_in",
  "cancel_booking",
].filter((action) => NATIVE_INVOICES_ENABLED || action !== "preview_invoice");

export const getSetupErrorMessage = (error, fallback) =>
  error?.data?.message ??
  error?.data?.error?.message ??
  error?.error ??
  error?.message ??
  fallback;

export const getStep = (setup, stepId) =>
  setup?.steps?.find((item) => item.id === stepId) ?? null;

export const orderSetupSteps = (steps) =>
  [...(steps ?? [])]
    .filter((step) => !["piece_pricing", "firing", "kilns"].includes(step?.id))
    .sort((left, right) => {
      const leftOrder =
        SETUP_STEP_ORDER_INDEX.get(left?.id) ??
        TERMINAL_LAUNCH_STEP_INDEX - 0.5;
      const rightOrder =
        SETUP_STEP_ORDER_INDEX.get(right?.id) ??
        TERMINAL_LAUNCH_STEP_INDEX - 0.5;

      return leftOrder - rightOrder;
    });

const SETUP_REQUIREMENTS = new Set(["required", "recommended", "optional"]);

export const getStepRequirement = (step) =>
  SETUP_REQUIREMENTS.has(step?.requirement) ? step.requirement : "required";

export const isStepApplicable = (step) =>
  Boolean(
    step && step.applicable !== false && step.status !== "not_applicable",
  );

export const getVisibleSetupSteps = (setup) =>
  orderSetupSteps((setup?.steps ?? []).filter(isStepApplicable));

const REQUIREMENT_PRIORITY = {
  required: 0,
  recommended: 1,
  optional: 2,
};

export const prioritizeSetupSteps = (steps) =>
  [...(steps ?? [])].sort(
    (left, right) =>
      REQUIREMENT_PRIORITY[getStepRequirement(left)] -
        REQUIREMENT_PRIORITY[getStepRequirement(right)] ||
      (SETUP_STEP_ORDER_INDEX.get(left?.id) ??
        TERMINAL_LAUNCH_STEP_INDEX - 0.5) -
        (SETUP_STEP_ORDER_INDEX.get(right?.id) ??
          TERMINAL_LAUNCH_STEP_INDEX - 0.5),
  );

export const getSetupStepGroups = (setup) => {
  const steps = orderSetupSteps(setup?.steps ?? []);
  const visibleSteps = steps.filter(isStepApplicable);
  const required = visibleSteps.filter(
    (step) => getStepRequirement(step) === "required",
  );
  const recommended = visibleSteps.filter(
    (step) => getStepRequirement(step) === "recommended",
  );
  const assignedIds = new Set(
    [...required, ...recommended].map((step) => step.id),
  );

  return {
    required,
    recommended,
    availableLater: steps.filter(
      (step) =>
        !assignedIds.has(step.id) &&
        (getStepRequirement(step) === "optional" || !isStepApplicable(step)),
    ),
  };
};

export const getSetupDisplayState = (step) => {
  if (step?.status === "complete") return "ready";

  if (step?.status === "not_applicable" || step?.applicable === false) {
    const reasonCode = String(step?.reasonCode ?? "");
    const explicitlyDisabled =
      reasonCode === "booking_workflow_disabled" ||
      reasonCode.endsWith("_module_disabled");

    return explicitlyDisabled ? "not_enabled" : "not_needed";
  }

  if (step?.status === "blocked") return "waiting";
  if (getStepRequirement(step) !== "required") return "recommended";

  return "setup_needed";
};

export const getLaunchCenterSections = (setup) => {
  const steps = orderSetupSteps(setup?.steps ?? []);
  const applicable = steps.filter(isStepApplicable);

  const resolveProvidedGroup = (group) =>
    (group ?? [])
      .map((item) => (typeof item === "string" ? getStep(setup, item) : item))
      .filter(Boolean);
  const providedGroups = setup?.stepGroups;
  const providedLaunchChecklist =
    providedGroups?.launchChecklist ?? providedGroups?.recommended;
  const assignedIds = new Set();
  const takeUnassigned = (items) =>
    orderSetupSteps(items).filter((step) => {
      if (!step?.id || assignedIds.has(step.id)) return false;
      assignedIds.add(step.id);
      return true;
    });
  const required = takeUnassigned(
    providedGroups?.required
      ? resolveProvidedGroup(providedGroups.required)
      : applicable.filter((step) => getStepRequirement(step) === "required"),
  );
  const recommended = takeUnassigned(
    providedLaunchChecklist
      ? resolveProvidedGroup(providedLaunchChecklist)
      : applicable.filter((step) => getStepRequirement(step) === "recommended"),
  );
  const availableLater = takeUnassigned(
    providedGroups?.availableLater
      ? resolveProvidedGroup(providedGroups.availableLater)
      : steps.filter(
          (step) =>
            getStepRequirement(step) === "optional" ||
            getSetupDisplayState(step) === "not_enabled" ||
            getSetupDisplayState(step) === "not_needed",
        ),
  );

  return {
    required,
    recommended,
    availableLater,
    // Keep the previous outcome buckets during the API rollout. Widgets and
    // older clients can continue to consume them while Launch Center uses the
    // clearer requirement groups above.
    finish: applicable.filter(
      (step) =>
        getStepRequirement(step) === "required" &&
        step.status !== "blocked" &&
        !isStepDone(step),
    ),
    waiting: applicable.filter((step) => step.status === "blocked"),
    ready: steps.filter(
      (step) =>
        step.status === "complete" ||
        getSetupDisplayState(step) === "not_enabled",
    ),
    improve: applicable.filter(
      (step) =>
        getStepRequirement(step) !== "required" &&
        step.status !== "blocked" &&
        !isStepDone(step),
    ),
  };
};

export const getNextRequiredSetupStep = (setup) => {
  return (
    getVisibleSetupSteps(setup).find(
      (step) => getStepRequirement(step) === "required" && !isStepDone(step),
    ) ?? null
  );
};

export const getNextBestSetupStep = (setup) => {
  const incompleteSteps = getVisibleSetupSteps(setup).filter(
    (step) => !isStepDone(step),
  );

  const requiredCandidate = incompleteSteps.find(
    (step) => getStepRequirement(step) === "required",
  );
  if (requiredCandidate) return requiredCandidate;

  for (const requirement of ["recommended", "optional"]) {
    const candidates = incompleteSteps.filter(
      (step) => getStepRequirement(step) === requirement,
    );
    if (!candidates.length) continue;

    return candidates[0];
  }

  return null;
};

export const getSetupStepEstimatedMinutes = (step) =>
  SETUP_STEP_ESTIMATED_MINUTES[step?.id] ?? 2;

const normalizeProgress = (provided) => {
  if (!provided || typeof provided !== "object") return null;

  const completed = Math.max(0, Number(provided.completed) || 0);
  const total = Math.max(0, Number(provided.total) || 0);
  const percentage = Math.min(
    100,
    Math.max(
      0,
      provided.percentage === undefined
        ? total
          ? Math.round((completed / total) * 100)
          : 100
        : Number(provided.percentage) || 0,
    ),
  );

  return { completed, total, percentage };
};

const progressFromSteps = (steps) => {
  const applicableSteps = (steps ?? []).filter(isStepApplicable);
  const completed = applicableSteps.filter(isStepDone).length;
  const total = applicableSteps.length;

  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 100,
  };
};

export const getPaymentSetupProgress = (setup) => {
  const provided =
    setup?.progress?.payment ??
    setup?.paymentReadiness?.progress ??
    setup?.progress?.required;

  const normalized = normalizeProgress(provided);
  if (normalized) return normalized;

  const hasRequirementMetadata = (setup?.steps ?? []).some(
    (step) => step?.requirement !== undefined || step?.applicable !== undefined,
  );

  if (hasRequirementMetadata) {
    const paymentRequirementSteps = getVisibleSetupSteps(setup).filter(
      (step) => getStepRequirement(step) === "required",
    );
    return progressFromSteps(paymentRequirementSteps);
  }

  return normalizeProgress({
    completed: Number(setup?.progress?.completed) || 0,
    total: Number(setup?.progress?.total) || 0,
    percentage: Number(setup?.progress?.percentage) || 0,
  });
};

// Compatibility export for existing consumers. Required Launch Center steps
// now describe payment prerequisites, not the full launch journey.
export const getRequiredSetupProgress = getPaymentSetupProgress;

const FALLBACK_LAUNCH_STEP_IDS = new Set([
  "studio",
  "payments",
  "location",
  "bookable_offer",
  "public_site",
  "publish",
  "practice_booking",
]);

export const getLaunchSetupProgress = (setup) => {
  const normalized = normalizeProgress(setup?.progress?.launch);
  if (normalized) return normalized;

  const paymentGroup = setup?.stepGroups?.required;
  const launchGroup =
    setup?.stepGroups?.launchChecklist ?? setup?.stepGroups?.recommended;
  if (Array.isArray(paymentGroup) || Array.isArray(launchGroup)) {
    const seen = new Set();
    const groupedSteps = [...(paymentGroup ?? []), ...(launchGroup ?? [])]
      .map((item) => (typeof item === "string" ? getStep(setup, item) : item))
      .filter((step) => {
        if (!step?.id || seen.has(step.id)) return false;
        seen.add(step.id);
        return true;
      });

    return progressFromSteps(groupedSteps);
  }

  const fallbackSteps = getVisibleSetupSteps(setup).filter((step) =>
    FALLBACK_LAUNCH_STEP_IDS.has(step.id),
  );
  const publicSiteApplicable =
    setup?.launchReview?.publicSite?.applicable !== false;
  const hasPublicSiteStep = fallbackSteps.some(
    (step) => step.id === "public_site",
  );

  return progressFromSteps([
    ...fallbackSteps,
    ...(publicSiteApplicable && !hasPublicSiteStep
      ? [
          {
            id: "public_site",
            applicable: true,
            status: "incomplete",
          },
        ]
      : []),
  ]);
};

export const isPaymentSetupReady = (setup) => {
  const readiness = setup?.paymentReadiness;
  if (readiness) {
    return (
      readiness.applicable === true &&
      readiness.ready === true &&
      readiness.chargesEnabled === true &&
      readiness.payoutsEnabled === true &&
      readiness.requirementsClear === true
    );
  }

  const paymentStep = getStep(setup, "payments");
  return isStepApplicable(paymentStep) && paymentStep.status === "complete";
};

export const isLaunchReadyToPublish = (setup) =>
  setup?.launchReview?.readyToPublish === true;

export const isTestBookingRetestRecommended = (setup) =>
  (setup?.launchReview?.testBooking?.retestRecommended ??
    setup?.practice?.retestRecommended) === true;

export const isLaunchJourneyComplete = (setup) => {
  if (setup?.launchReview?.launchComplete !== true) return false;

  const testBooking = setup.launchReview.testBooking;
  return testBooking?.applicable === true
    ? testBooking.complete === true
    : true;
};

const getCheck = (step, checkId) =>
  step?.checks?.find((check) => check?.id === checkId) ?? null;

const getReadinessStatus = ({ applicable, complete, pending = false }) => {
  if (!applicable) return "not_needed";
  if (complete) return "ready";
  if (pending) return "pending";
  return "action_required";
};

// Launch prerequisites can include steps grouped as recommended in the checklist.
export const getPracticeBookingBlockingSteps = (setup) => {
  const required = setup?.launchReview?.required;
  if (required?.complete === true) return [];

  const incompleteIds = Array.isArray(required?.incompleteStepIds)
    ? required.incompleteStepIds
    : [];

  return [...new Set(incompleteIds)]
    .filter((id) => id !== "practice_booking" && SETUP_STEP_ORDER.includes(id))
    .map((id) => getStep(setup, id))
    .filter((step) => isStepApplicable(step) && !isStepDone(step));
};

/**
 * Translate the setup-center contract into the five customer-facing readiness
 * outcomes shown after the first meaningful setup milestone. Keeping this
 * mapping pure prevents the page copy from claiming more than the API has
 * actually verified.
 */
export const getLaunchReadinessItems = (setup) => {
  const publicSite = setup?.launchReview?.publicSite ?? {};
  const publicSiteApplicable = publicSite.applicable !== false;
  const publicSitePublished = Boolean(
    publicSite.published ?? setup?.publication?.status === "live",
  );

  const bookingStep = getStep(setup, "bookable_offer");
  const bookingApplicable = isStepApplicable(bookingStep);
  const bookingReady = bookingApplicable && isStepDone(bookingStep);
  const testBooking = setup?.launchReview?.testBooking;
  const bookingWorkflowApplicable =
    bookingApplicable || testBooking?.applicable === true;

  const paymentStep = getStep(setup, "payments");
  const paymentReadiness = setup?.paymentReadiness;
  const paymentApplicable = paymentReadiness
    ? paymentReadiness.applicable === true
    : isStepApplicable(paymentStep);
  const paymentReady = isPaymentSetupReady(setup);
  const paymentDetailsSubmitted =
    getCheck(paymentStep, "details_submitted")?.complete === true;
  const paymentRequirementsClear =
    paymentReadiness?.requirementsClear === true ||
    getCheck(paymentStep, "requirements_clear")?.complete === true;
  const paymentPending =
    paymentApplicable &&
    !paymentReady &&
    paymentDetailsSubmitted &&
    paymentRequirementsClear &&
    paymentStep?.reasonCode !== "stripe_requirements_due";

  const communicationsStep = getStep(setup, "communications");
  const communicationsApplicable =
    bookingWorkflowApplicable && isStepApplicable(communicationsStep);
  const senderCheck = getCheck(communicationsStep, "sender_verified");
  const hasSenderCheck = Boolean(senderCheck);
  const emailReady =
    communicationsApplicable &&
    (hasSenderCheck
      ? senderCheck.complete === true
      : isStepDone(communicationsStep));
  const emailDescriptionVariant =
    hasSenderCheck && senderCheck.complete !== true
      ? "sender_required"
      : "action_required";

  const journeyApplicable =
    testBooking?.applicable === true ||
    (testBooking?.applicable == null && bookingApplicable);
  const journeyChecked =
    journeyApplicable &&
    testBooking?.complete === true &&
    !isTestBookingRetestRecommended(setup);
  const journeyRetestRecommended = isTestBookingRetestRecommended(setup);
  const journeyCanStart =
    setup?.launchReview?.required?.complete === true &&
    publicSitePublished &&
    testBooking?.canStart !== false &&
    testBooking?.action?.enabled !== false;
  const journeyWaitingForPrerequisite =
    journeyApplicable &&
    !journeyChecked &&
    !journeyRetestRecommended &&
    !journeyCanStart;
  const journeyHasKnownBlockers =
    journeyApplicable &&
    !journeyChecked &&
    !journeyCanStart &&
    getPracticeBookingBlockingSteps(setup).length > 0;

  return [
    {
      id: "publicSite",
      status: getReadinessStatus({
        applicable: publicSiteApplicable,
        complete: publicSitePublished,
      }),
      hasUnpublishedChanges: publicSite.hasUnpublishedChanges === true,
      completedAt: publicSite.publishedAt ?? setup?.publication?.publishedAt,
    },
    {
      id: "bookings",
      status: getReadinessStatus({
        applicable: bookingApplicable,
        complete: bookingReady,
      }),
    },
    {
      id: "payments",
      status: getReadinessStatus({
        applicable: paymentApplicable,
        complete: paymentReady,
        pending: paymentPending,
      }),
      chargesEnabled: paymentReadiness?.chargesEnabled === true,
      payoutsEnabled: paymentReadiness?.payoutsEnabled === true,
    },
    {
      id: "emails",
      status: getReadinessStatus({
        applicable: communicationsApplicable,
        complete: emailReady,
      }),
      descriptionVariant:
        communicationsApplicable && !emailReady
          ? emailDescriptionVariant
          : undefined,
    },
    {
      id: "customerJourney",
      status: getReadinessStatus({
        applicable: journeyApplicable,
        complete: journeyChecked,
        pending: journeyWaitingForPrerequisite && !journeyHasKnownBlockers,
      }),
      descriptionVariant:
        journeyChecked && testBooking?.completionSource === "manual"
          ? "manual"
          : journeyHasKnownBlockers
            ? "blocked"
            : journeyWaitingForPrerequisite
              ? "waiting"
              : undefined,
      completedAt:
        testBooking && Object.hasOwn(testBooking, "completedAt")
          ? testBooking.completedAt
          : setup?.practice?.completedAt,
      retestRecommended: journeyRetestRecommended,
    },
  ];
};

/**
 * Resolve the small, workspace-wide Launch Center state used by persistent
 * navigation. This deliberately combines checklist progress with the same
 * explicit readiness signals used by the Launch Center so a completed
 * checklist can never hide an issue on an already-published site.
 */
export const getLaunchCenterNavigationStatus = (setup) => {
  if (!setup || typeof setup !== "object") return null;

  const progress = getLaunchSetupProgress(setup);
  const publicSite = setup?.launchReview?.publicSite ?? {};
  const publicSiteApplicable = publicSite.applicable !== false;
  const publicSiteLive = Boolean(
    publicSite.published ?? setup?.publication?.status === "live",
  );
  const readinessItems = getLaunchReadinessItems(setup);
  const issueCount = readinessItems.filter((item) =>
    ["action_required", "pending"].includes(item.status),
  ).length;
  const allApplicableChecksClear = readinessItems.every((item) =>
    ["ready", "not_needed"].includes(item.status),
  );
  const launchJourneyComplete = isLaunchJourneyComplete(setup);
  const baseStatus = {
    completed: progress.completed,
    total: progress.total,
  };
  const postLaunch = publicSiteLive || launchJourneyComplete;
  const needsAttention =
    setup.health === "needs_attention" ||
    isTestBookingRetestRecommended(setup) ||
    issueCount > 0;

  if (postLaunch && needsAttention) {
    return {
      ...baseStatus,
      status: "attention",
      // Health can flag a backend diagnostic that is not represented by a
      // readiness card. In that case we still show one actionable issue.
      issueCount: Math.max(1, issueCount),
    };
  }

  if (publicSiteLive) {
    if (allApplicableChecksClear) {
      return { ...baseStatus, status: "live", issueCount: 0 };
    }
  }

  const operationalComplete =
    !publicSiteApplicable && launchJourneyComplete && allApplicableChecksClear;

  if (operationalComplete) {
    return { ...baseStatus, status: "operational", issueCount: 0 };
  }

  return { ...baseStatus, status: "progress", issueCount: 0 };
};

const OVERVIEW_GUIDED_SETUP_COMPLETION_THRESHOLD = 2;
const OVERVIEW_GUIDED_SETUP_PERCENTAGE_THRESHOLD = 35;

export const getOverviewSetupPresentation = (setup) => {
  if (isLaunchJourneyComplete(setup)) return "hidden";

  const launchProgress = getLaunchSetupProgress(setup);
  const hasInitialSetupMomentum =
    launchProgress.completed >= OVERVIEW_GUIDED_SETUP_COMPLETION_THRESHOLD ||
    launchProgress.percentage >= OVERVIEW_GUIDED_SETUP_PERCENTAGE_THRESHOLD;

  return hasInitialSetupMomentum ? "compact" : "guided";
};

export const getPrimaryAction = (step) =>
  step?.actions?.find((item) => item.enabled) ?? step?.actions?.[0] ?? null;

export const getSetupActionHref = (step, action = getPrimaryAction(step)) => {
  const href = action?.href;

  if (
    !href ||
    !step?.id ||
    !href.startsWith("/app/") ||
    href.startsWith("/app/setup")
  ) {
    return href ?? null;
  }

  const [hrefWithoutHash, hash = ""] = href.split("#", 2);
  const [pathname, query = ""] = hrefWithoutHash.split("?", 2);
  const resolvedPathname =
    step.id === "studio" && pathname === "/app/settings"
      ? "/app/settings/general"
      : pathname;
  const searchParams = new URLSearchParams(query);
  if (
    step.id === "communications" &&
    resolvedPathname === "/app/communications"
  ) {
    searchParams.set("section", "setup");
  }
  searchParams.set("setupStep", step.id);

  const serializedQuery = searchParams.toString();
  return `${resolvedPathname}${serializedQuery ? `?${serializedQuery}` : ""}${
    hash ? `#${hash}` : ""
  }`;
};

export const isStepDone = (step) =>
  step?.status === "complete" || step?.status === "not_applicable";

export const hasIncompleteSetupStep = (setup, stepId) =>
  (setup?.steps ?? []).some(
    (step) =>
      step?.id === stepId && isStepApplicable(step) && !isStepDone(step),
  );

const CORE_BOOKABLE_OFFER_CHECKS = new Set(["activity", "capacity", "price"]);

export const hasCoreBookableOffer = (step) => {
  if (step?.id !== "bookable_offer") return false;

  const checks = Array.isArray(step.checks) ? step.checks : [];
  const coreChecks = checks.filter((item) =>
    CORE_BOOKABLE_OFFER_CHECKS.has(item?.id),
  );

  return (
    coreChecks.length === CORE_BOOKABLE_OFFER_CHECKS.size &&
    coreChecks.every((item) => item.complete === true)
  );
};

export const makePracticeIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `setup-${crypto.randomUUID()}`;
  }

  return `setup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
