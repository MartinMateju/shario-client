const SETUP_CENTER_PATH = "/tenants/current/setup-center";
const SETUP_EVENT_PATH = `${SETUP_CENTER_PATH}/events`;
const LAUNCH_API_ORIGIN = "http://api.shario.localhost:4311";

export const LAUNCH_TENANT_ORIGIN = "http://studio-alpha.shario.localhost:4310";

const IDS = Object.freeze({
  tenant: "64a000000000000000000001",
  owner: "64a000000000000000000002",
  location: "64b000000000000000000001",
});

const COMPLETE = "complete";
const INCOMPLETE = "incomplete";
const BLOCKED = "blocked";
const NOT_APPLICABLE = "not_applicable";

const encodeJwtPart = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const launchAccessToken = [
  encodeJwtPart({ alg: "none", typ: "JWT" }),
  encodeJwtPart({
    iat: 1785394800,
    exp: 1816930800,
    UserInfo: {
      id: IDS.owner,
      authContext: "workspace",
      tenant: IDS.tenant,
      tenantRole: "OWNER",
      isOwner: true,
    },
  }),
  "launch-e2e-signature",
].join(".");

const launchModules = Object.freeze({
  bookings: true,
  payments: true,
  customers: true,
  courses: true,
  memberships: true,
  credits: true,
  vouchers: true,
  automations: true,
  newsletter: true,
  firing: true,
  inventory: true,
  staff_tasks: true,
  communications: true,
  ai: true,
});

export const LAUNCH_MODULE_SCENARIOS = Object.freeze({
  booking: Object.freeze({
    ...launchModules,
    memberships: false,
    firing: false,
    inventory: false,
  }),
  firingOnly: Object.freeze({
    ...launchModules,
    bookings: false,
    payments: false,
    courses: false,
    memberships: false,
    credits: false,
    vouchers: false,
    firing: true,
    inventory: false,
  }),
  inventoryOnly: Object.freeze({
    ...launchModules,
    bookings: false,
    payments: false,
    courses: false,
    memberships: false,
    credits: false,
    vouchers: false,
    firing: false,
    inventory: true,
  }),
});

const launchTenant = Object.freeze({
  _id: IDS.tenant,
  id: IDS.tenant,
  name: "Studio Alpha",
  slug: "studio-alpha",
  status: "active",
  plan: "professional",
  modules: launchModules,
  settings: {
    defaultLanguage: "EN",
    currency: "CZK",
    timezone: "Europe/Prague",
  },
  onboarding: {
    completed: true,
    businessType: "pottery",
  },
});

const launchOwner = Object.freeze({
  _id: IDS.owner,
  id: IDS.owner,
  firstname: "Launch",
  lastname: "Owner",
  email: "owner@studio-alpha.test",
  tenant: IDS.tenant,
  tenantId: IDS.tenant,
  tenantName: launchTenant.name,
  tenantPlan: launchTenant.plan,
  tenantRole: "OWNER",
  platformRole: "none",
  isOwner: true,
});

const launchWorkspaceAccess = Object.freeze({
  role: "owner",
  roleKey: "owner",
  status: "active",
  permissions: ["*"],
  effectivePermissions: ["*"],
  preferences: {
    defaultLocation: IDS.location,
    defaultLocationId: IDS.location,
    productTour: {
      version: 1,
      status: "completed",
      lastStep: "settings",
      updatedAt: "2026-08-11T10:00:00.000Z",
    },
    firstBookingCelebrationSeen: true,
    contextualGuides: {
      first_booking: {
        version: 1,
        status: "completed",
        lastStep: "confirmation",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      first_offer: {
        version: 1,
        status: "completed",
        lastStep: "publish",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      website_builder: {
        version: 1,
        status: "completed",
        lastStep: "publish",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      test_customer_journey: {
        version: 1,
        status: "completed",
        lastStep: "customer_portal",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      studio_flow: {
        version: 2,
        status: "completed",
        lastStep: "customer_notification",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      memberships: {
        version: 2,
        status: "completed",
        lastStep: "vouchers",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      payments_setup: {
        version: 1,
        status: "completed",
        lastStep: "verify_payment",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      data_import: {
        version: 1,
        status: "completed",
        lastStep: "history_rollback",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      customer_communications: {
        version: 1,
        status: "completed",
        lastStep: "delivery_history",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      ai_reports: {
        version: 1,
        status: "completed",
        lastStep: "report_insights",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
      team_management: {
        version: 1,
        status: "completed",
        lastStep: "location_access",
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
    },
  },
});

const launchLocation = Object.freeze({
  _id: IDS.location,
  id: IDS.location,
  tenant: IDS.tenant,
  name: "Studio Alpha",
  slug: "studio-alpha-main",
  isPrimary: true,
  isActive: true,
  booking: {
    enabled: true,
    timezone: "Europe/Prague",
    slotStepMinutes: 30,
    minBookingMinutes: 60,
    maxBookingMinutes: 360,
    allowPublicSoloOverlap: false,
    maxPublicSoloOverlaps: 1,
    globalCapacity: 12,
    privateSessionBlocksAll: true,
    groupBookingBlocksAll: true,
    activitySelectionMode: "HIDDEN",
    activityCapacities: [],
  },
  address: {
    line1: "Václavská 237/6",
    city: "Brno",
    postalCode: "603 00",
    country: "CZ",
  },
  openingHours: [],
});

const launchPublicSiteEditor = Object.freeze({
  tenant: {
    id: IDS.tenant,
    name: launchTenant.name,
    slug: launchTenant.slug,
    publicCapabilities: {
      bookStudio: true,
      courses: true,
      memberships: false,
      vouchers: false,
      help: true,
      registration: true,
    },
  },
  draft: {},
  editor: {
    draftRevision: 0,
    publishedRevision: 0,
    hasUnpublishedChanges: false,
    draftUpdatedAt: null,
    publishedAt: null,
    publicationStatus: "not_published",
  },
});

const ACTIONS = Object.freeze({
  studio: ["edit_studio", "/app/settings?setupStep=studio"],
  location: ["review_location", "/app/settings/locations?setupStep=location"],
  bookable_offer: [
    "create_offer",
    "/app/products?action=create&setupStep=bookable_offer",
  ],
  payments: ["connect_payments", "/app/settings/payments?setupStep=payments"],
  public_site: [
    "customize_public_site",
    "/app/settings/public-site?setupStep=public_site",
  ],
  practice_booking: ["practice_booking", "/app/setup?step=practice_booking"],
  firing: [
    "configure_firing",
    "/app/firings?section=profiles&profile=firing&action=create&setupStep=firing",
  ],
  kilns: [
    "configure_kilns",
    "/app/firings?section=kilns&action=create&setupStep=kilns",
  ],
  inventory: [
    "configure_inventory",
    "/app/operations?section=inventory&action=create&setupStep=inventory",
  ],
  communications: [
    "configure_communications",
    "/app/communications?section=setup&setupStep=communications",
  ],
  team: ["invite_team", "/app/settings/team?action=add&setupStep=team"],
  publish: ["publish_studio", "/app/setup?step=publish"],
  membership: [
    "create_membership",
    "/app/memberships?action=create&setupStep=membership",
  ],
  piece_pricing: [
    "configure_piece_pricing",
    "/app/firings?section=profiles&profile=piece_pricing&action=create&setupStep=piece_pricing",
  ],
});

const reasonFor = (id) =>
  ({
    studio: "studio_profile_incomplete",
    location: "location_incomplete",
    bookable_offer: "bookable_offer_incomplete",
    payments: "payments_not_ready",
    public_site: "public_site_review_required",
    practice_booking: "practice_booking_incomplete",
    firing: "firing_profile_missing",
    kilns: "kiln_missing",
    inventory: "inventory_item_missing",
    communications: "communications_incomplete",
    team: "team_member_missing",
    publish: "not_published",
    membership: "membership_missing",
    piece_pricing: "piece_pricing_profile_missing",
  })[id] || "setup_incomplete";

const checkIdFor = (id) =>
  ({
    studio: "name",
    location: "active_location",
    bookable_offer: "activity",
    payments: "charges_enabled",
    public_site: "public_site_reviewed",
    practice_booking: "practice_run",
    firing: "active_firing_profile",
    kilns: "active_kiln",
    inventory: "active_inventory_item",
    communications: "sender_verified",
    team: "team_member",
    publish: "published",
    membership: "published_membership",
    piece_pricing: "active_piece_pricing_profile",
  })[id] || id;

const setupStep = ({
  id,
  requirement,
  status = COMPLETE,
  applicable = status !== NOT_APPLICABLE,
  actionEnabled = status !== COMPLETE && status !== NOT_APPLICABLE,
  reasonCode,
}) => {
  const complete = status === COMPLETE || status === NOT_APPLICABLE;
  const action = ACTIONS[id];

  return {
    id,
    status,
    complete,
    applicable,
    requirement,
    optional: requirement !== "required" || !applicable,
    reasonCode:
      reasonCode ||
      (status === COMPLETE
        ? "complete"
        : status === BLOCKED
          ? "location_required"
          : reasonFor(id)),
    checks: (id === "communications"
      ? ["sender_verified"]
      : [checkIdFor(id)]
    ).map((checkId) => ({
      id: checkId,
      complete,
      optional: requirement !== "required",
      reasonCode: complete ? "complete" : reasonFor(id),
    })),
    actions: action
      ? [{ key: action[0], href: action[1], enabled: actionEnabled }]
      : [],
  };
};

const disabledStep = (id, reasonCode) =>
  setupStep({
    id,
    requirement: "optional",
    status: NOT_APPLICABLE,
    applicable: false,
    actionEnabled: false,
    reasonCode,
  });

const launchMetrics = () => ({
  firstSeenAt: "2026-08-05T08:00:00.000Z",
  lastActivityAt: "2026-08-05T08:04:00.000Z",
  firstPublishedOfferAt: null,
  firstOfferReadyAt: null,
  firstPublishedAt: null,
  completedAt: null,
  timeToFirstPublishedOfferMs: null,
  eventCounts: {
    launchCenterViewed: 0,
    studioReady: 0,
    publicSiteOpened: 0,
    testBookingOpened: 0,
  },
  steps: {},
});

const buildSnapshot = ({
  paymentPrerequisites,
  launchChecklist,
  availableLater,
  publicSiteApplicable,
  published,
  bookingApplicable,
  bookingComplete = false,
}) => {
  const steps = [
    ...paymentPrerequisites,
    ...launchChecklist,
    ...availableLater,
  ];
  const paymentCompleted = paymentPrerequisites.filter(
    (step) => step.status === COMPLETE,
  ).length;
  const checklistCompleted = launchChecklist.filter(
    (step) => step.status === COMPLETE,
  ).length;
  const launchPrerequisiteSteps = [
    ...paymentPrerequisites,
    ...launchChecklist.filter(
      ({ id }) => id !== "publish" && id !== "practice_booking",
    ),
  ];
  const launchPrerequisiteCompleted = launchPrerequisiteSteps.filter(
    (step) => step.status === COMPLETE,
  ).length;
  const ready = launchPrerequisiteCompleted === launchPrerequisiteSteps.length;
  const allLaunchSteps = [...paymentPrerequisites, ...launchChecklist];
  const launchCompleted = allLaunchSteps.filter(
    (step) => step.status === COMPLETE,
  ).length;
  const paymentStep = paymentPrerequisites.find(({ id }) => id === "payments");
  const paymentsApplicable = Boolean(
    paymentStep && paymentStep.applicable !== false,
  );
  const paymentsComplete = paymentStep?.status === COMPLETE;
  const publicSiteStep = launchChecklist.find(({ id }) => id === "public_site");
  const publicSiteReviewed = publicSiteStep?.status === COMPLETE;
  const offerStep = launchChecklist.find(({ id }) => id === "bookable_offer");
  const canStartPractice =
    ready &&
    bookingApplicable &&
    offerStep?.status === COMPLETE &&
    published === true;
  const launchComplete =
    ready &&
    (!publicSiteApplicable || published === true) &&
    (!bookingApplicable || bookingComplete);
  const readyToPublish = ready && publicSiteApplicable && published !== true;
  const nextStep = [
    ...paymentPrerequisites,
    ...launchChecklist,
    ...availableLater,
  ].find(
    (step) =>
      step.status !== COMPLETE &&
      step.applicable !== false &&
      step.actions.some(({ enabled }) => enabled === true),
  );
  const stepGroups = {
    required: paymentPrerequisites.map(({ id }) => id),
    recommended: launchChecklist.map(({ id }) => id),
    launchChecklist: launchChecklist.map(({ id }) => id),
    availableLater: availableLater.map(({ id }) => id),
  };
  const groupedStepIds = [
    ...stepGroups.required,
    ...stepGroups.launchChecklist,
    ...stepGroups.availableLater,
  ];
  const recommendations = [];
  const recommendationStepIds = recommendations
    .map((recommendation) => recommendation.stepId ?? recommendation.id)
    .filter(Boolean);

  if (
    new Set(groupedStepIds).size !== groupedStepIds.length ||
    new Set(steps.map(({ id }) => id)).size !== steps.length ||
    recommendationStepIds.some((id) => groupedStepIds.includes(id))
  ) {
    throw new Error(
      "Launch fixture steps, groups, and recommendations must be exclusive.",
    );
  }

  return {
    definitionVersion: 9,
    phase: launchComplete ? "learning" : "launch",
    ready,
    health: published && !ready ? "needs_attention" : "healthy",
    progress: {
      completed: paymentCompleted,
      total: paymentPrerequisites.length,
      percentage: paymentPrerequisites.length
        ? Math.round((paymentCompleted / paymentPrerequisites.length) * 100)
        : 100,
      required: {
        completed: paymentCompleted,
        total: paymentPrerequisites.length,
        percentage: paymentPrerequisites.length
          ? Math.round((paymentCompleted / paymentPrerequisites.length) * 100)
          : 100,
      },
      payment: {
        completed: paymentCompleted,
        total: paymentPrerequisites.length,
        percentage: paymentPrerequisites.length
          ? Math.round((paymentCompleted / paymentPrerequisites.length) * 100)
          : 100,
      },
      launch: {
        completed: launchCompleted,
        total: allLaunchSteps.length,
        percentage: allLaunchSteps.length
          ? Math.round((launchCompleted / allLaunchSteps.length) * 100)
          : 100,
        remaining: allLaunchSteps.length - launchCompleted,
      },
      recommended: {
        completed: checklistCompleted,
        total: launchChecklist.length,
        remaining: launchChecklist.length - checklistCompleted,
      },
    },
    publication: {
      status: published ? "live" : "draft",
      publishedAt: published ? "2026-08-05T08:03:00.000Z" : null,
    },
    paymentReadiness: {
      applicable: paymentsApplicable,
      ready: paymentsApplicable && paymentsComplete,
      chargesEnabled: paymentsApplicable && paymentsComplete,
      payoutsEnabled: paymentsApplicable && paymentsComplete,
      requirementsClear: paymentsComplete || !paymentsApplicable,
    },
    practice: {
      status: bookingComplete ? "complete" : "not_started",
      runId: null,
      completedActions: [],
      artifacts: [],
      startedAt: null,
      completedAt: bookingComplete ? "2026-08-05T08:02:00.000Z" : null,
      expiresAt: null,
      retestRecommended: false,
    },
    steps,
    stepGroups,
    nextAction:
      nextStep?.actions.find(({ enabled }) => enabled === true) || null,
    recommendations,
    launchReview: {
      status: launchComplete
        ? "launched"
        : readyToPublish
          ? "ready_to_publish"
          : "in_progress",
      readyToPublish,
      launchComplete,
      required: {
        complete: ready,
        completed: launchPrerequisiteCompleted,
        total: launchPrerequisiteSteps.length,
        incompleteStepIds: launchPrerequisiteSteps
          .filter((step) => step.status !== COMPLETE)
          .map(({ id }) => id),
      },
      publicSite: {
        applicable: publicSiteApplicable,
        reviewed: publicSiteReviewed,
        published: Boolean(published),
        tenantSlug: "studio-alpha",
        publishedAt: published ? "2026-08-05T08:03:00.000Z" : null,
        draftRevision: publicSiteReviewed ? 1 : 0,
        publishedRevision: published ? 1 : 0,
        hasUnpublishedChanges: publicSiteReviewed && !published,
        canPublish: readyToPublish,
        publicPath: publicSiteApplicable ? "/" : null,
      },
      testBooking: {
        applicable: bookingApplicable,
        complete: bookingComplete,
        canStart: canStartPractice,
        action: bookingApplicable
          ? {
              key: "practice_booking",
              href: "/app/setup?step=practice_booking",
              enabled: canStartPractice,
            }
          : null,
      },
    },
    launchMetrics: launchMetrics(),
    diagnostics: {},
  };
};

export const bookingLaunchSnapshot = ({
  locationComplete = true,
  offerComplete = true,
  paymentsComplete = true,
  published = true,
  publicSiteReviewed = published,
  practiceComplete = false,
} = {}) => {
  const locationStatus = locationComplete ? COMPLETE : INCOMPLETE;
  const offerStatus = !locationComplete
    ? BLOCKED
    : offerComplete
      ? COMPLETE
      : INCOMPLETE;
  const launchPrerequisitesComplete =
    locationComplete && offerComplete && paymentsComplete && publicSiteReviewed;

  return buildSnapshot({
    paymentPrerequisites: [
      setupStep({ id: "studio", requirement: "required" }),
      setupStep({
        id: "payments",
        requirement: "required",
        status: paymentsComplete ? COMPLETE : INCOMPLETE,
      }),
    ],
    launchChecklist: [
      setupStep({
        id: "location",
        requirement: "recommended",
        status: locationStatus,
      }),
      setupStep({
        id: "bookable_offer",
        requirement: "recommended",
        status: offerStatus,
        actionEnabled: locationComplete && !offerComplete,
      }),
      setupStep({
        id: "public_site",
        requirement: "recommended",
        status: publicSiteReviewed ? COMPLETE : INCOMPLETE,
      }),
      setupStep({
        id: "publish",
        requirement: "recommended",
        status: published
          ? COMPLETE
          : launchPrerequisitesComplete
            ? INCOMPLETE
            : BLOCKED,
        actionEnabled: launchPrerequisitesComplete && !published,
        reasonCode: launchPrerequisitesComplete
          ? "ready_to_publish"
          : "required_setup_incomplete",
      }),
      setupStep({
        id: "practice_booking",
        requirement: "recommended",
        status: practiceComplete
          ? COMPLETE
          : published && launchPrerequisitesComplete
            ? INCOMPLETE
            : BLOCKED,
        actionEnabled:
          published && launchPrerequisitesComplete && !practiceComplete,
        reasonCode: !published
          ? "public_site_publication_required"
          : launchPrerequisitesComplete
            ? "practice_booking_incomplete"
            : "required_setup_incomplete",
      }),
    ],
    availableLater: [
      disabledStep("firing", "firing_module_disabled"),
      disabledStep("kilns", "firing_module_disabled"),
      disabledStep("inventory", "inventory_module_disabled"),
      disabledStep("membership", "memberships_module_disabled"),
      disabledStep("piece_pricing", "piece_pricing_not_required"),
      setupStep({
        id: "communications",
        requirement: "recommended",
        status: INCOMPLETE,
      }),
      setupStep({
        id: "team",
        requirement: "recommended",
        status: INCOMPLETE,
      }),
    ],
    publicSiteApplicable: true,
    published,
    bookingApplicable: true,
    bookingComplete: practiceComplete,
  });
};

export const firingOnlyLaunchSnapshot = ({ kilnsComplete = true } = {}) => {
  const kilnsStatus = kilnsComplete ? COMPLETE : INCOMPLETE;

  return buildSnapshot({
    paymentPrerequisites: [
      setupStep({ id: "studio", requirement: "required" }),
    ],
    launchChecklist: [
      setupStep({ id: "location", requirement: "recommended" }),
      setupStep({
        id: "kilns",
        requirement: "recommended",
        status: kilnsStatus,
        actionEnabled: !kilnsComplete,
      }),
    ],
    availableLater: [
      setupStep({
        id: "communications",
        requirement: "recommended",
        status: INCOMPLETE,
      }),
      disabledStep("bookable_offer", "booking_workflow_disabled"),
      disabledStep("payments", "payments_not_applicable"),
      disabledStep("practice_booking", "booking_workflow_disabled"),
      disabledStep("firing", "piece_pricing_not_required"),
      disabledStep("membership", "memberships_module_disabled"),
      disabledStep("piece_pricing", "piece_pricing_not_required"),
      disabledStep("public_site", "public_site_not_applicable"),
      disabledStep("publish", "public_site_not_applicable"),
      disabledStep("inventory", "inventory_module_disabled"),
      setupStep({
        id: "team",
        requirement: "optional",
        status: INCOMPLETE,
      }),
    ],
    publicSiteApplicable: false,
    published: false,
    bookingApplicable: false,
  });
};

export const inventoryOnlyLaunchSnapshot = ({
  inventoryComplete = true,
} = {}) =>
  buildSnapshot({
    paymentPrerequisites: [
      setupStep({ id: "studio", requirement: "required" }),
    ],
    launchChecklist: [
      setupStep({ id: "location", requirement: "recommended" }),
      setupStep({
        id: "inventory",
        requirement: "recommended",
        status: inventoryComplete ? COMPLETE : INCOMPLETE,
      }),
    ],
    availableLater: [
      setupStep({
        id: "communications",
        requirement: "recommended",
        status: INCOMPLETE,
      }),
      disabledStep("bookable_offer", "booking_workflow_disabled"),
      disabledStep("payments", "payments_not_applicable"),
      disabledStep("practice_booking", "booking_workflow_disabled"),
      disabledStep("firing", "firing_module_disabled"),
      disabledStep("kilns", "firing_module_disabled"),
      disabledStep("membership", "memberships_module_disabled"),
      disabledStep("piece_pricing", "piece_pricing_not_required"),
      disabledStep("public_site", "public_site_not_applicable"),
      disabledStep("publish", "public_site_not_applicable"),
      setupStep({
        id: "team",
        requirement: "optional",
        status: INCOMPLETE,
      }),
    ],
    publicSiteApplicable: false,
    published: false,
    bookingApplicable: false,
  });

const matchesPath = (route, pathname, method) => {
  const request = route.request();
  const url = new URL(request.url());

  return url.pathname === pathname && request.method() === method.toUpperCase();
};

const emptyPage = (key) => ({
  [key]: [],
  total: 0,
  totalCount: 0,
  totalPages: 1,
  page: 1,
  limit: 100,
});

const responseForLaunchAppRequest = ({ method, modules, tenant, url }) => {
  const pathname =
    url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

  if (method === "POST" && pathname === "/auth/refresh") {
    return {
      accessToken: launchAccessToken,
      authContext: "workspace",
      user: launchOwner,
      tenant,
      workspaceAccess: launchWorkspaceAccess,
    };
  }

  if (method === "POST" && pathname === "/auth/customer/refresh") {
    return { code: "UNAUTHENTICATED" };
  }

  if (
    method === "GET" &&
    pathname === `/public/tenants/${tenant.slug}/ai/concierge/config`
  ) {
    return { config: { enabled: false } };
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/notifications/summary"
  ) {
    return {
      unreadCount: 0,
      byCategory: {
        bookings: 0,
        payments: 0,
        waitlist: 0,
        studio_flow: 0,
        tasks: 0,
        inventory: 0,
        migration: 0,
        communications: 0,
        account: 0,
      },
    };
  }

  if (method === "GET" && pathname === "/tenants/current/onboarding") {
    return {
      tenant,
      onboarding: tenant.onboarding,
    };
  }

  if (method === "GET" && pathname === "/locations") {
    return { ...emptyPage("locations"), locations: [launchLocation], total: 1 };
  }

  if (method === "GET" && pathname === `/locations/${IDS.location}`) {
    return launchLocation;
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/settings/workspace-configuration"
  ) {
    return {
      definitionVersion: 1,
      intent: {
        configured: true,
        definitionVersion: 1,
        modules,
      },
      modules: Object.fromEntries(
        Object.entries(modules).map(([key, enabled]) => [
          key,
          { entitled: true, selected: enabled, enabled },
        ]),
      ),
      effectiveModules: modules,
      navigation: { hiddenGroups: [], hiddenItems: [] },
    };
  }

  if (method === "GET" && pathname === "/tenants/current/settings") {
    return {
      settings: {
        id: IDS.tenant,
        name: launchTenant.name,
        slug: launchTenant.slug,
        status: launchTenant.status,
        plan: launchTenant.plan,
        planVersion: "2026",
        defaultLanguage: launchTenant.settings.defaultLanguage,
        currency: launchTenant.settings.currency,
        timezone: launchTenant.settings.timezone,
      },
    };
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/settings/public-site"
  ) {
    return launchPublicSiteEditor;
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/settings/public-site/versions"
  ) {
    return { versions: [] };
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/settings/public-site/preview"
  ) {
    return {
      ...launchPublicSiteEditor,
      preview: {
        publicationStatus: "draft",
        publiclyAvailable: false,
        hasExplicitPublicationState: true,
      },
    };
  }

  if (method === "GET" && pathname === "/products") {
    return emptyPage("products");
  }

  if (method === "GET" && pathname === "/kilns") {
    return emptyPage("kilns");
  }

  if (
    method === "GET" &&
    [
      "/piece-pricing-profiles",
      "/piece-pricing-profiles/available",
      "/firing-profiles",
      "/firing-profiles/available",
    ].includes(pathname)
  ) {
    return emptyPage("profiles");
  }

  const inventoryPages = {
    "/inventory/items": "items",
    "/inventory/movements": "movements",
    "/inventory/audits": "audits",
    "/inventory/reorders": "requests",
    "/suppliers": "suppliers",
    "/supply-orders/suppliers": "suppliers",
  };
  if (method === "GET" && inventoryPages[pathname]) {
    return emptyPage(inventoryPages[pathname]);
  }

  if (method === "GET" && pathname === "/ai/capabilities") {
    return {
      enabled: false,
      available: false,
      features: {},
      usage: { exhausted: false },
    };
  }

  if (method === "GET" && pathname === "/tenant-payments/connect") {
    return {
      status: "active",
      connected: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    };
  }

  if (method === "GET" && pathname === "/communications/overview") {
    return {
      overview: {
        counts: {
          open: 0,
          unread: 0,
          needsReview: 0,
          failedDeliveries: 0,
        },
        staff: [],
        assignees: [],
      },
    };
  }

  return null;
};

export async function installLaunchAppMocks(
  page,
  { modules = launchModules } = {},
) {
  const handledRequests = new Set();
  const unexpectedRequests = new Set();
  const scenarioModules = Object.freeze({ ...launchModules, ...modules });
  const scenarioTenant = Object.freeze({
    ...launchTenant,
    modules: scenarioModules,
  });

  await page.route(`${LAUNCH_API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const requestOrigin = request.headers().origin || LAUNCH_TENANT_ORIGIN;
    const headers = {
      "access-control-allow-origin": requestOrigin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "cache-control": "no-store",
    };

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }

    const response = responseForLaunchAppRequest({
      method,
      modules: scenarioModules,
      tenant: scenarioTenant,
      url,
    });
    const requestKey = `${method} ${url.pathname}`;

    if (response === null) {
      unexpectedRequests.add(`${requestKey}${url.search}`);
      await route.fulfill({
        status: 501,
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          code: "UNEXPECTED_LAUNCH_E2E_REQUEST",
          message: `No launch E2E fixture is registered for ${requestKey}.`,
        }),
      });
      return;
    }

    handledRequests.add(requestKey);
    await route.fulfill({
      status:
        method === "POST" && url.pathname === "/auth/customer/refresh"
          ? 401
          : 200,
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify(response),
    });
  });

  return {
    handledRequests,
    modules: scenarioModules,
    tenant: scenarioTenant,
    unexpectedRequests,
  };
}

export async function mockSuccessfulWrite(
  page,
  { method = "POST", pathname, response, onSuccess },
) {
  await page.route(`${LAUNCH_API_ORIGIN}${pathname}`, async (route) => {
    if (!matchesPath(route, pathname, method)) {
      await route.fallback();
      return;
    }

    await onSuccess?.(route.request());
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": LAUNCH_TENANT_ORIGIN,
        "access-control-allow-credentials": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify(response ?? { data: { accepted: true } }),
    });
  });
}

export async function mockLaunchCenter(page, initialSnapshot) {
  let snapshot = initialSnapshot;
  const events = [];

  await page.route("**/tenants/current/setup-center**", async (route) => {
    if (matchesPath(route, SETUP_CENTER_PATH, "GET")) {
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": LAUNCH_TENANT_ORIGIN,
          "access-control-allow-credentials": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({ data: snapshot }),
      });
      return;
    }

    if (matchesPath(route, SETUP_EVENT_PATH, "POST")) {
      const event = route.request().postDataJSON();
      events.push(event);
      await route.fulfill({
        status: 202,
        headers: {
          "access-control-allow-origin": LAUNCH_TENANT_ORIGIN,
          "access-control-allow-credentials": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          data: {
            accepted: true,
            eventId: event.eventId,
            deduplicated: false,
          },
        }),
      });
      return;
    }

    await route.fallback();
  });

  return {
    events,
    getSnapshot: () => snapshot,
    setSnapshot: (nextSnapshot) => {
      snapshot = nextSnapshot;
    },
  };
}
