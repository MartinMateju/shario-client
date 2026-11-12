export const VISUAL_TENANT_ORIGIN = "http://studio-alpha.shario.localhost:4310";
export const VISUAL_API_ORIGIN = "http://api.shario.localhost:4311";
export const VISUAL_FIXED_TIME = "2026-07-30T10:30:00+02:00";

export const ADMIN_OVERVIEW_SCENARIOS = Object.freeze({
  ALL_CLEAR: "all-clear",
  COMPLETE_LEARNING: "complete-learning",
  DENSE_GUIDED: "dense-guided",
  DISMISSED: "dismissed",
  GUIDED_INCOMPLETE_PAYMENTS: "guided-incomplete-payments",
  LIVE_ATTENTION: "live-attention",
  RESTRICTED_PAYMENTS: "restricted-payments",
});

export const VISUAL_IDS = Object.freeze({
  tenant: "64a000000000000000000001",
  owner: "64a000000000000000000002",
  location: "64b000000000000000000001",

  conversation: "64f000000000000000000001",
});

const encodeJwtPart = (value) =>
  Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

export const visualAccessToken = [
  encodeJwtPart({ alg: "none", typ: "JWT" }),
  encodeJwtPart({
    iat: 1785394800,
    exp: 1816930800,
    UserInfo: {
      id: VISUAL_IDS.owner,
      authContext: "workspace",
      tenant: VISUAL_IDS.tenant,
      tenantRole: "OWNER",
      isOwner: true,
    },
  }),
  "visual-signature",
].join(".");

const visualTenant = {
  _id: VISUAL_IDS.tenant,
  id: VISUAL_IDS.tenant,
  name: "Studio Olivie",
  slug: "studio-alpha",
  status: "active",
  plan: "professional",
  modules: {
    bookings: true,
    payments: true,
    customers: true,
    courses: true,
    memberships: true,
    credits: true,
    vouchers: true,
    automations: true,
    newsletter: true,

    inventory: true,
    staff_tasks: true,
    communications: true,
    ai: true,
  },
  limits: {
    locations: 3,
    admins: 5,
    staffMembers: 15,
  },
  settings: {
    defaultLanguage: "EN",
    currency: "CZK",
    timezone: "Europe/Prague",
  },
  onboarding: {
    completed: true,
    businessType: "coworking_space",
  },
};

const visualWorkspaceConfiguration = {
  definitionVersion: 1,
  intent: {
    configured: true,
    definitionVersion: 1,
    modules: { ...visualTenant.modules },
  },
  modules: Object.fromEntries(
    Object.entries(visualTenant.modules).map(([key, enabled]) => [
      key,
      { entitled: true, selected: enabled, enabled },
    ]),
  ),
  effectiveModules: { ...visualTenant.modules },
  navigation: { hiddenGroups: [], hiddenItems: [] },
};

const visualPublicSite = {
  branding: {
    displayName: "Studio Olivie",
    stylePreset: "classic-editorial-v1",
    fontPreset: "shario-sans-v1",
    description: {
      en: "A calm ceramics studio for making, learning and meeting.",
      cs: "Klidné keramické studio pro tvorbu, učení a setkávání.",
    },
    accentColor: "#4056D6",
    secondaryColor: "#D9806E",
    backgroundColor: "#FCFBF8",
    textColor: "#292925",
    labelColor: "#4056D6",
  },
  pages: {
    home: {
      eyebrow: { en: "Welcome to", cs: "Vítejte v" },
      headline: { en: "studio olivie", cs: "studio olivie" },
      description: {
        en: "Explore open studio sessions, classes and memberships.",
        cs: "Objevte otevřené studio, kurzy a členství.",
      },
      labelColor: "",
    },
  },
  login: {
    eyebrow: { en: "Your creative place", cs: "Váš prostor pro tvoření" },
    headline: { en: "Welcome back.", cs: "Vítejte zpět." },
    supportingText: {
      en: "Your bookings and pieces in one calm place.",
      cs: "Rezervace a členství na jednom klidném místě.",
    },
    helpText: { en: "We are here if you need help.", cs: "Rádi vám pomůžeme." },
    labelColor: "",
    backgroundImageUrl: "",
  },
  register: {
    eyebrow: { en: "One studio account", cs: "Jeden účet studia" },
    headline: {
      en: "Everything you make, together.",
      cs: "Vše, co tvoříte, spolu.",
    },
    supportingText: {
      en: "Create an account for bookings, classes and pieces.",
      cs: "Vytvořte si účet pro rezervace, kurzy a členství.",
    },
    helpText: { en: "It only takes a minute.", cs: "Zabere to jen chvilku." },
    labelColor: "",
    backgroundImageUrl: "",
  },
  customerPortal: {
    dashboard: {
      eyebrow: { en: "Your studio", cs: "Vaše studio" },
      headline: { en: "Welcome back", cs: "Vítejte zpět" },
      description: {
        en: "Bookings, creative work and studio benefits in one place.",
        cs: "Rezervace, tvorba a výhody studia na jednom místě.",
      },
      labelColor: "",
    },
    appearance: {
      headerBackgroundColor: "#EDE7DC",
      primaryButtonColor: "#365BCB",
      calendarBackgroundColor: "#FFFDF8",
      profileMenuBackgroundColor: "#F6EDE2",
    },
  },
  header: {
    navOrder: ["book", "courses", "memberships", "help"],
    hiddenItems: [],
    primaryCta: "book",
    announcement: {
      text: {
        en: "Summer workshops are now open",
        cs: "Letní workshopy jsou otevřené",
      },
      url: "/courses",
    },
  },
  footer: {
    description: {
      en: "Space to slow down and make something by hand.",
      cs: "Místo, kde můžete zpomalit a tvořit rukama.",
    },
    email: "hello@studio-olivie.cz",
    phone: "+420 777 123 456",
    address: "Václavská 237/6, Brno",
  },
};

const visualOwner = {
  _id: VISUAL_IDS.owner,
  id: VISUAL_IDS.owner,
  firstname: "Martin",
  lastname: "Matějů",
  email: "owner@studio-alpha.test",
  tenant: VISUAL_IDS.tenant,
  tenantId: VISUAL_IDS.tenant,
  tenantName: visualTenant.name,
  tenantPlan: visualTenant.plan,
  tenantRole: "OWNER",
  platformRole: "none",
  isOwner: true,
};

const completedContextualGuides = Object.freeze({
  first_booking: {
    version: 1,
    status: "completed",
    lastStep: "confirmation",
    updatedAt: VISUAL_FIXED_TIME,
  },
  first_offer: {
    version: 1,
    status: "completed",
    lastStep: "publish",
    updatedAt: VISUAL_FIXED_TIME,
  },
  website_builder: {
    version: 1,
    status: "completed",
    lastStep: "publish",
    updatedAt: VISUAL_FIXED_TIME,
  },
  test_customer_journey: {
    version: 1,
    status: "completed",
    lastStep: "customer_portal",
    updatedAt: VISUAL_FIXED_TIME,
  },

  memberships: {
    version: 2,
    status: "completed",
    lastStep: "vouchers",
    updatedAt: VISUAL_FIXED_TIME,
  },
  payments_setup: {
    version: 1,
    status: "completed",
    lastStep: "verify_payment",
    updatedAt: VISUAL_FIXED_TIME,
  },
  data_import: {
    version: 1,
    status: "completed",
    lastStep: "history_rollback",
    updatedAt: VISUAL_FIXED_TIME,
  },
  customer_communications: {
    version: 1,
    status: "completed",
    lastStep: "delivery_history",
    updatedAt: VISUAL_FIXED_TIME,
  },
  ai_reports: {
    version: 1,
    status: "completed",
    lastStep: "report_insights",
    updatedAt: VISUAL_FIXED_TIME,
  },
  team_management: {
    version: 1,
    status: "completed",
    lastStep: "location_access",
    updatedAt: VISUAL_FIXED_TIME,
  },
});

export const visualWorkspaceAccess = {
  role: "owner",
  roleKey: "owner",
  status: "active",
  permissions: ["*"],
  effectivePermissions: ["*"],
  preferences: {
    defaultLocation: VISUAL_IDS.location,
    defaultLocationId: VISUAL_IDS.location,
    productTour: {
      version: 1,
      status: "completed",
      lastStep: "settings",
      updatedAt: "2026-08-11T10:00:00.000Z",
    },
    firstBookingCelebrationSeen: true,
    contextualGuides: completedContextualGuides,
  },
};

const visualLocation = {
  _id: VISUAL_IDS.location,
  id: VISUAL_IDS.location,
  tenant: VISUAL_IDS.tenant,
  name: "Studio Olivie",
  slug: "studio-olivie",
  isPrimary: true,
  isActive: true,
  bookingEnabled: true,
  address: {
    line1: "Václavská 237/6",
    city: "Brno",
    postalCode: "603 00",
    country: "CZ",
  },
};

const setupSteps = [
  {
    id: "studio",
    status: "complete",
    complete: true,
    applicable: true,
    requirement: "required",
    optional: false,
    reasonCode: "complete",
    checks: [
      { id: "bootstrap", complete: true },
      { id: "name", complete: true },
      { id: "address", complete: true },
      { id: "currency", complete: true },
      { id: "timezone", complete: true },
    ],
    actions: [],
  },
  {
    id: "payments",
    status: "complete",
    complete: true,
    applicable: true,
    requirement: "required",
    optional: false,
    reasonCode: "complete",
    checks: [
      { id: "account_connected", complete: true },
      { id: "details_submitted", complete: true },
      { id: "charges_enabled", complete: true },
      { id: "payouts_enabled", complete: true },
      { id: "requirements_clear", complete: true },
    ],
    actions: [],
  },
  {
    id: "location",
    status: "complete",
    complete: true,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "complete",
    checks: [
      { id: "active_location", complete: true },
      { id: "booking_enabled", complete: true },
    ],
    actions: [],
  },
  {
    id: "bookable_offer",
    status: "complete",
    complete: true,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "complete",
    checks: [
      { id: "activity", complete: true },
      { id: "capacity", complete: true },
      { id: "price", complete: true },
      { id: "availability", complete: true },
      { id: "location", complete: true },
    ],
    actions: [],
  },
  {
    id: "communications",
    status: "incomplete",
    complete: false,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "communications_incomplete",
    checks: [
      {
        id: "sender_verified",
        complete: false,
        reasonCode: "sender_email_not_verified",
      },
    ],
    actions: [
      {
        key: "configure_communications",
        href: "/app/communications?section=setup&setupStep=communications",
        enabled: true,
      },
    ],
  },
  {
    id: "team",
    status: "incomplete",
    complete: false,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "team_member_missing",
    checks: [
      {
        id: "team_member",
        complete: false,
        reasonCode: "team_member_missing",
      },
    ],
    actions: [
      {
        key: "invite_team",
        href: "/app/settings/team",
        enabled: true,
      },
    ],
  },
  {
    id: "public_site",
    status: "incomplete",
    complete: false,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "public_site_review_required",
    checks: [
      {
        id: "public_site_reviewed",
        complete: false,
        reasonCode: "public_site_review_required",
      },
    ],
    actions: [
      {
        key: "customize_public_site",
        href: "/app/settings/public-site?setupStep=public_site",
        enabled: true,
      },
    ],
  },
  {
    id: "publish",
    status: "blocked",
    complete: false,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "required_setup_incomplete",
    checks: [
      {
        id: "required_setup",
        complete: false,
        reasonCode: "required_setup_incomplete",
      },
      {
        id: "published",
        complete: false,
        reasonCode: "not_published",
      },
    ],
    actions: [
      {
        key: "publish_studio",
        href: "/app/setup?step=publish",
        enabled: false,
      },
    ],
  },
  {
    id: "practice_booking",
    status: "blocked",
    complete: false,
    applicable: true,
    requirement: "recommended",
    optional: true,
    reasonCode: "public_site_publication_required",
    checks: [
      {
        id: "public_site_published",
        complete: false,
        reasonCode: "public_site_publication_required",
      },
      {
        id: "practice_run",
        complete: false,
        reasonCode: "practice_run_incomplete",
      },
    ],
    actions: [
      {
        key: "practice_booking",
        href: "/app/setup?step=practice_booking",
        enabled: false,
      },
    ],
  },
];

const visualSetupCenter = {
  definitionVersion: 8,
  phase: "launch",
  ready: false,
  health: "healthy",
  progress: {
    completed: 2,
    total: 2,
    percentage: 100,
    required: { completed: 2, total: 2, percentage: 100 },
    payment: { completed: 2, total: 2, percentage: 100 },
    launch: { completed: 4, total: 7, percentage: 57, remaining: 3 },
    recommended: { completed: 2, total: 5, remaining: 3 },
  },
  steps: setupSteps,
  stepGroups: {
    required: ["studio", "payments"],
    recommended: [
      "location",
      "bookable_offer",
      "public_site",
      "publish",
      "practice_booking",
    ],
    launchChecklist: [
      "location",
      "bookable_offer",
      "public_site",
      "publish",
      "practice_booking",
    ],
    availableLater: ["communications", "team"],
  },
  paymentReadiness: {
    applicable: true,
    ready: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    requirementsClear: true,
  },
  practice: {
    status: "not_started",
    completedActions: [],
    artifacts: [],
    retestRecommended: false,
  },
  publication: {
    status: "draft",
    publishedAt: null,
  },
  nextAction: {
    key: "customize_public_site",
    href: "/app/settings/public-site?setupStep=public_site",
    enabled: true,
  },
  recommendations: [],
  launchReview: {
    status: "in_progress",
    readyToPublish: false,
    launchComplete: false,
    required: {
      complete: false,
      completed: 4,
      total: 5,
      incompleteStepIds: ["public_site"],
    },
    publicSite: {
      applicable: true,
      reviewed: false,
      published: false,
      tenantSlug: "studio-alpha",
      publishedAt: null,
      draftRevision: 0,
      publishedRevision: 0,
      hasUnpublishedChanges: false,
      canPublish: false,
      publicPath: "/",
    },
    testBooking: {
      applicable: true,
      complete: false,
      canStart: false,
      action: {
        key: "practice_booking",
        href: "/app/setup?step=practice_booking",
        enabled: false,
      },
    },
  },
};

const completedLaunchSteps = setupSteps.map((step) => {
  if (
    !["public_site", "publish", "practice_booking", "communications"].includes(
      step.id,
    )
  ) {
    return step;
  }

  return {
    ...step,
    status: "complete",
    complete: true,
    reasonCode: "complete",
    checks: step.checks.map((check) => ({
      ...check,
      complete: true,
      reasonCode: "complete",
    })),
    actions: step.actions.map((action) => ({ ...action, enabled: true })),
  };
});
const visualLearningSetupCenter = {
  ...visualSetupCenter,
  phase: "learning",
  ready: true,
  progress: {
    completed: 2,
    total: 2,
    percentage: 100,
    required: { completed: 2, total: 2, percentage: 100 },
    payment: { completed: 2, total: 2, percentage: 100 },
    launch: { completed: 7, total: 7, percentage: 100, remaining: 0 },
    recommended: { completed: 5, total: 5, remaining: 0 },
  },
  steps: completedLaunchSteps,
  practice: {
    ...visualSetupCenter.practice,
    status: "complete",
    completedAt: "2026-07-29T07:58:00.000Z",
    completedActions: [
      "create_booking",
      "preview_invoice",
      "preview_confirmation",
      "preview_membership",
      "check_in",
      "cancel_booking",
    ],
  },
  publication: {
    status: "live",
    publishedAt: "2026-07-29T08:00:00.000Z",
  },
  nextAction: setupSteps.find(({ id }) => id === "communications").actions[0],
  launchReview: {
    status: "launched",
    readyToPublish: false,
    launchComplete: true,
    required: {
      complete: true,
      completed: 5,
      total: 5,
      incompleteStepIds: [],
    },
    publicSite: {
      ...visualSetupCenter.launchReview.publicSite,
      reviewed: true,
      published: true,
      publishedAt: "2026-07-29T08:00:00.000Z",
      draftRevision: 1,
      publishedRevision: 1,
      hasUnpublishedChanges: false,
      canPublish: false,
    },
    testBooking: {
      applicable: true,
      complete: true,
      canStart: true,
      action: {
        key: "practice_booking",
        href: "/app/setup?step=practice_booking",
        enabled: true,
      },
    },
  },
};
const visualAttentionSetupCenter = {
  ...visualLearningSetupCenter,
  health: "needs_attention",
  steps: visualLearningSetupCenter.steps.map((step) =>
    step.id === "communications"
      ? {
          ...step,
          status: "incomplete",
          complete: false,
          reasonCode: "sender_email_not_verified",
          checks: step.checks.map((check) =>
            check.id === "sender_verified"
              ? {
                  ...check,
                  complete: false,
                  reasonCode: "sender_email_not_verified",
                }
              : check,
          ),
          actions: [
            {
              key: "verify_sender",
              href: "/app/communications?section=setup",
              enabled: true,
            },
          ],
        }
      : step,
  ),
  nextAction: {
    key: "verify_sender",
    href: "/app/communications?section=setup",
    enabled: true,
  },
};
const visualGuidedPaymentsSetupCenter = {
  ...visualSetupCenter,
  phase: "launch",
  progress: {
    completed: 1,
    total: 2,
    percentage: 50,
    required: { completed: 1, total: 2, percentage: 50 },
    payment: { completed: 1, total: 2, percentage: 50 },
    launch: { completed: 3, total: 7, percentage: 43, remaining: 4 },
    recommended: { completed: 2, total: 5, remaining: 3 },
  },
  paymentReadiness: {
    applicable: true,
    ready: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    requirementsClear: false,
  },
  steps: setupSteps.map((step) =>
    step.id === "payments"
      ? {
          ...step,
          status: "incomplete",
          complete: false,
          reasonCode: "payments_not_ready",
          checks: step.checks.map((check) => ({
            ...check,
            complete: false,
            reasonCode: "payments_not_ready",
          })),
          actions: [
            {
              key: "connect_payments",
              href: "/app/settings/payments?setupStep=payments",
              enabled: true,
            },
          ],
        }
      : step,
  ),
  nextAction: {
    key: "connect_payments",
    href: "/app/settings/payments?setupStep=payments",
    enabled: true,
  },
  launchReview: {
    ...visualSetupCenter.launchReview,
    required: {
      complete: false,
      completed: 3,
      total: 5,
      incompleteStepIds: ["payments", "public_site"],
    },
  },
};

const visualPaymentConnect = Object.freeze({
  active: {
    status: "active",
    connected: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    detailsSubmitted: true,
  },
  notStarted: {
    status: "not_started",
    connected: false,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
  },
  restricted: {
    status: "restricted",
    connected: true,
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: true,
  },
});

const overviewScenarioFixtures = Object.freeze({
  [ADMIN_OVERVIEW_SCENARIOS.ALL_CLEAR]: {
    setupCenter: visualLearningSetupCenter,
    paymentConnect: visualPaymentConnect.active,
  },
  [ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING]: {
    setupCenter: visualLearningSetupCenter,
    paymentConnect: visualPaymentConnect.active,
  },
  [ADMIN_OVERVIEW_SCENARIOS.DENSE_GUIDED]: {
    setupCenter: visualGuidedPaymentsSetupCenter,
    paymentConnect: visualPaymentConnect.notStarted,
  },
  [ADMIN_OVERVIEW_SCENARIOS.DISMISSED]: {
    workspaceAccess: {
      ...visualWorkspaceAccess,
      preferences: {
        ...visualWorkspaceAccess.preferences,
        overviewLaunchCenterDismissed: true,
      },
    },
    paymentConnect: visualPaymentConnect.notStarted,
  },
  [ADMIN_OVERVIEW_SCENARIOS.GUIDED_INCOMPLETE_PAYMENTS]: {
    setupCenter: visualGuidedPaymentsSetupCenter,
    paymentConnect: visualPaymentConnect.notStarted,
  },
  [ADMIN_OVERVIEW_SCENARIOS.LIVE_ATTENTION]: {
    setupCenter: visualAttentionSetupCenter,
    paymentConnect: visualPaymentConnect.active,
  },
  [ADMIN_OVERVIEW_SCENARIOS.RESTRICTED_PAYMENTS]: {
    setupCenter: visualGuidedPaymentsSetupCenter,
    paymentConnect: visualPaymentConnect.restricted,
  },
});

const visualCustomers = [
  {
    _id: "64e000000000000000000001",
    id: "64e000000000000000000001",
    firstname: "Anna",
    lastname: "Nováková",
    email: "anna.novakova@example.com",
    phone: "+420 777 123 456",
    customId: "SK-1024",
    activeMembership: {
      name: "Creative Club",
      slug: "creative-club",
    },
    moneyCredits: 1250,
    totalSpent: 12600,
    lastBookingAt: "2026-07-29T14:00:00.000Z",
    createdAt: "2026-07-05T09:00:00.000Z",
    status: "active",
  },
  {
    _id: "64e000000000000000000002",
    id: "64e000000000000000000002",
    firstname: "David",
    lastname: "Kříž",
    email: "david.kriz@example.com",
    phone: "+420 777 223 456",
    customId: "SK-1025",
    activeMembership: {
      name: "Studio Pass",
      slug: "studio-pass",
    },
    moneyCredits: 600,
    totalSpent: 8750,
    lastBookingAt: "2026-07-28T09:30:00.000Z",
    createdAt: "2026-05-11T11:00:00.000Z",
    status: "active",
  },
  {
    _id: "64e000000000000000000003",
    id: "64e000000000000000000003",
    firstname: "Klára",
    lastname: "Veselá",
    email: "klara.vesela@example.com",
    phone: "+420 777 323 456",
    customId: "SK-1026",
    moneyCredits: 0,
    totalSpent: 3100,
    lastBookingAt: "2026-07-22T15:00:00.000Z",
    createdAt: "2026-07-18T08:00:00.000Z",
    status: "invited",
    invitedAt: "2026-07-18T08:00:00.000Z",
  },
  {
    _id: "64e000000000000000000004",
    id: "64e000000000000000000004",
    firstname: "Sofia",
    lastname: "Andersson",
    email: "sofia.andersson@example.com",
    phone: "+46 70 123 45 67",
    customId: "SK-1027",
    activeMembership: {
      name: "10 hour pack",
      slug: "10-hour-pack",
    },
    moneyCredits: 2200,
    totalSpent: 18400,
    lastBookingAt: "2026-07-30T07:30:00.000Z",
    createdAt: "2026-03-12T13:00:00.000Z",
    status: "active",
  },
  {
    _id: "64e000000000000000000005",
    id: "64e000000000000000000005",
    firstname: "Tomáš",
    lastname: "Dvořák",
    email: "tomas.dvorak@example.com",
    phone: "+420 777 523 456",
    customId: "SK-1028",
    moneyCredits: 350,
    totalSpent: 5400,
    lastBookingAt: "2026-06-30T16:00:00.000Z",
    createdAt: "2026-01-20T10:00:00.000Z",
    status: "inactive",
  },
  {
    _id: "64e000000000000000000006",
    id: "64e000000000000000000006",
    firstname: "Emma",
    lastname: "Wilson",
    email: "emma.wilson@example.com",
    phone: "+44 7700 900123",
    customId: "SK-1029",
    activeMembership: {
      name: "Creative Club",
      slug: "creative-club",
    },
    moneyCredits: 900,
    totalSpent: 9200,
    lastBookingAt: "2026-07-27T12:00:00.000Z",
    createdAt: "2026-07-02T12:00:00.000Z",
    status: "active",
  },
];

const visualConversation = {
  _id: VISUAL_IDS.conversation,
  id: VISUAL_IDS.conversation,
  subject: "Booking question",
  status: "open",
  priority: "normal",
  channel: "email",
  channels: ["email"],
  unreadCount: 1,
  lastMessageAt: "2026-07-30T07:30:00.000Z",
  updatedAt: "2026-07-30T07:30:00.000Z",
  customer: {
    _id: visualCustomers[0]._id,
    id: visualCustomers[0].id,
    firstname: visualCustomers[0].firstname,
    lastname: visualCustomers[0].lastname,
    email: visualCustomers[0].email,
    phone: visualCustomers[0].phone,
    preferredLanguage: "cs",
  },
  lastMessage: {
    channel: "email",
    preview: "Can I book a room tomorrow?",
    createdAt: "2026-07-30T07:30:00.000Z",
  },
  analysis: {
    category: "pickup_request",
    summary: "Anna would like to confirm her next booking.",
    confidence: 0.96,
    suggestedActions: [],
  },
  relatedEntities: [],
};

const visualMessages = [
  {
    _id: "64f100000000000000000001",
    id: "64f100000000000000000001",
    conversationId: visualConversation.id,
    channel: "email",
    direction: "incoming",
    body: "Hello, can I book a room tomorrow afternoon?",
    createdAt: "2026-07-30T07:30:00.000Z",
    sender: visualConversation.customer,
  },
  {
    _id: "64f100000000000000000002",
    id: "64f100000000000000000002",
    conversationId: visualConversation.id,
    channel: "email",
    direction: "outgoing",
    body: "Yes—the room is available after 15:00.",
    createdAt: "2026-07-30T07:42:00.000Z",
    sender: visualOwner,
    delivery: {
      status: "delivered",
    },
  },
];

const buildDashboardOverview = (url, overviewScenario) => {
  const date = url.searchParams.get("date") || "2026-07-30";
  const locationId = url.searchParams.get("locationId");
  const denseOverview =
    overviewScenario === ADMIN_OVERVIEW_SCENARIOS.DENSE_GUIDED;
  const allClearOverview =
    overviewScenario === ADMIN_OVERVIEW_SCENARIOS.ALL_CLEAR;

  const overview = {
    metadata: {
      date,
      timezone: "Europe/Prague",
      generatedAt: "2026-07-30T08:25:00.000Z",
      locationId: locationId || null,
      locationIds: [VISUAL_IDS.location],
      currency: "CZK",
    },
    coverage: {
      available: [
        "bookings",
        "customers",
        "communications",
        "inventory",
        "reports",
        "staffTasks",
      ],
      unavailable: [],
      limitations: [],
      complete: true,
    },
    today: {
      available: true,
      schedule: [
        {
          id: "booking-1",
          title: "Open studio",
          productType: "workshop",
          start: "2026-07-30T07:00:00.000Z",
          end: "2026-07-30T09:00:00.000Z",
          locationName: visualLocation.name,
          participantCount: 5,
          capacity: 8,
        },
        {
          id: "booking-2",
          title: "Creative workshop basics",
          productType: "course",
          start: "2026-07-30T09:30:00.000Z",
          end: "2026-07-30T11:30:00.000Z",
          locationName: visualLocation.name,
          participantCount: 4,
          capacity: 6,
        },
        {
          id: "booking-3",
          title: "Creative workshop",
          productType: "workshop",
          start: "2026-07-30T12:00:00.000Z",
          end: "2026-07-30T14:00:00.000Z",
          locationName: visualLocation.name,
          participantCount: 8,
          capacity: 10,
        },
        {
          id: "booking-4",
          title: "Private creative session",
          productType: "private-session",
          start: "2026-07-30T14:30:00.000Z",
          end: "2026-07-30T16:00:00.000Z",
          locationName: visualLocation.name,
          participantCount: 2,
          capacity: 2,
        },
      ],
    },
    flow: [
      {
        key: "booked",
        value: 18,
        unit: "bookings",
        available: true,
        href: "/app/bookings",
      },
      {
        key: "arriving",
        value: 9,
        unit: "bookings",
        available: true,
        href: "/app/calendar",
      },
      {
        key: "inStudio",
        value: 5,
        unit: "bookings",
        available: true,
        href: "/app/calendar",
      },
    ],
    attention: [
      {
        key: "unpaidBookings",
        count: 3,
        available: true,
        severity: "warning",
        href: "/app/bookings",
      },
      {
        key: "overdueTasks",
        count: denseOverview ? 7 : 1,
        available: true,
        severity: "info",
        href: "/app/staff",
      },
      {
        key: "lowStock",
        count: 2,
        available: true,
        severity: "warning",
        href: "/app/operations?section=inventory",
      },
      ...(denseOverview ? [] : []),
    ],
    businessPulse: {
      occupancy: {
        available: true,
        value: 72,
        unit: "percent",
      },
      revenue: {
        available: true,
        valueMinor: 1840000,
        currency: "CZK",
      },
      bookings: {
        available: true,
        value: 14,
      },
      newCustomers: {
        available: true,
        value: 3,
      },
      series: {
        available: true,
        key: "utilization",
        points: [
          { label: "Mon", value: 40 },
          { label: "Tue", value: 65 },
          { label: "Wed", value: 58 },
          { label: "Thu", value: 72 },
          { label: "Fri", value: 66 },
          { label: "Sat", value: 84 },
          { label: "Sun", value: 62 },
        ],
      },
    },
    signals: {
      messages: {
        available: true,
        unreadCount: 2,
        items: [
          {
            id: "conversation-1",
            subject: "Booking question",
            contactName: "Anna",
            preview: "Can I book a room tomorrow?",
            lastMessageAt: "2026-07-30T07:30:00.000Z",
            unreadCount: 1,
          },
          {
            id: "conversation-2",
            subject: "Course availability",
            contactName: "David",
            preview: "Is there a place on Saturday?",
            lastMessageAt: "2026-07-30T06:45:00.000Z",
            unreadCount: 1,
          },
        ],
      },
      tasks: {
        available: true,
        openCount: 2,
        items: [
          {
            id: "task-1",
            title: "Prepare the meeting room",
            assigneeName: "Martin",
            priority: "urgent",
            dueDate: "2026-07-30T09:00:00.000Z",
          },
          {
            id: "task-2",
            title: "Prepare equipment for the evening class",
            assigneeName: "Emilie",
            priority: "normal",
            dueDate: "2026-07-30T14:00:00.000Z",
          },
        ],
      },
    },
    opportunity: {
      available: true,
      key: "lowOccupancy",
      value: 35,
      href: "/app/products?action=create",
      actionKey: "createOffer",
      source: "deterministic",
    },
  };

  if (allClearOverview) {
    overview.today.schedule = [];
    overview.flow = overview.flow.map((stage) => ({ ...stage, value: 0 }));
    overview.attention = [];
  }

  return overview;
};

const visualWorkspaceNotifications = [
  {
    id: "65c000000000000000000091",
    eventType: "booking.cancelled",
    category: "bookings",
    severity: "warning",
    title: {
      en: "Booking cancelled",
      cs: "Rezervace byla zrušena",
    },
    message: {
      en: "Anna Nováková cancelled her workstation booking for this afternoon.",
      cs: "Anna Nováková zrušila dnešní odpolední lekci na kruhu.",
    },
    actionUrl: "/app/bookings",
    locationId: visualLocation.id,
    location: {
      id: visualLocation.id,
      name: visualLocation.name,
    },
    readAt: null,
    isRead: false,
    occurrenceCount: 1,
    createdAt: "2026-07-30T07:55:00.000Z",
  },
  {
    id: "65c000000000000000000092",
    eventType: "inventory.low",
    category: "inventory",
    severity: "critical",
    title: {
      en: "Supplies need attention",
      cs: "Zásoby vyžadují pozornost",
    },
    message: {
      en: "Workshop supplies have fallen below their reorder threshold.",
      cs: "Zásoby pro workshopy klesly pod hranici pro doobjednání.",
    },
    actionUrl: "/app/operations?section=inventory",
    locationId: visualLocation.id,
    location: {
      id: visualLocation.id,
      name: visualLocation.name,
    },
    readAt: null,
    isRead: false,
    occurrenceCount: 1,
    createdAt: "2026-07-30T07:35:00.000Z",
  },
];

const visualReportsOverview = {
  metadata: {
    timezone: "Europe/Prague",
    currency: "CZK",
    period: { from: "2026-07-01", to: "2026-07-30" },
    comparisonPeriod: { from: "2026-06-01", to: "2026-06-30" },
    granularity: "day",
    generatedAt: "2026-07-30T08:25:00.000Z",
    locationId: VISUAL_IDS.location,
  },
  coverage: {
    available: ["sales", "bookings", "customers", "inventory"],
    unavailable: [],
    limitations: [],
    complete: true,
  },
  summary: {
    netSales: { value: 184500, previous: 162000, changePercent: 13.9 },
    bookings: { value: 34, previous: 30, changePercent: 13.3 },
    utilizationPercent: { value: 72, previous: 66, changePercent: 9.1 },
    returningCustomerPercent: {
      value: 58,
      previous: 53,
      changePercent: 9.4,
    },
  },
  timeSeries: [
    {
      periodStart: "2026-07-24",
      periodEnd: "2026-07-24",
      netSalesMinor: 79200,
      bookings: 15,
      participants: 22,
      utilizationPercent: 68,
    },
    {
      periodStart: "2026-07-30",
      periodEnd: "2026-07-30",
      netSalesMinor: 105300,
      bookings: 19,
      participants: 28,
      utilizationPercent: 76,
    },
  ],
  insights: {
    highlights: ["Bookings and studio utilization improved this month."],
    attention: [],
    recommendations: [
      "Review the busiest sessions before publishing August capacity.",
    ],
  },
};

export const responseForRequest = ({
  method,
  url,
  overviewScenario,
  workspaceAccess,
  workspaceLocale = "en",
  workspaceNotifications = visualWorkspaceNotifications.map((notification) => ({
    ...notification,
  })),
}) => {
  const pathname =
    url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  const scenarioFixture = overviewScenarioFixtures[overviewScenario] ?? null;
  const tenant = {
    ...visualTenant,
    settings: { ...visualTenant.settings, adminLanguage: workspaceLocale },
  };

  if (method === "POST" && pathname === "/auth/refresh") {
    return {
      accessToken: visualAccessToken,
      authContext: "workspace",
      user: visualOwner,
      tenant,
      workspaceAccess:
        workspaceAccess ??
        scenarioFixture?.workspaceAccess ??
        visualWorkspaceAccess,
    };
  }

  if (
    method === "GET" &&
    pathname === "/auth/customer/social/providers" &&
    url.searchParams.get("tenantSlug") === visualTenant.slug
  ) {
    return { providers: [] };
  }

  if (method === "POST" && pathname === "/auth/customer/refresh") {
    return { code: "UNAUTHENTICATED" };
  }

  if (
    method === "GET" &&
    pathname === `/public/tenants/${visualTenant.slug}/ai/concierge/config`
  ) {
    return { config: { enabled: false } };
  }

  if (method === "GET" && pathname === "/tenants/current/access/me") {
    return {
      workspaceAccess:
        workspaceAccess ??
        scenarioFixture?.workspaceAccess ??
        visualWorkspaceAccess,
    };
  }

  if (method === "GET" && pathname === "/tenants/current/access/invitations") {
    return { invitations: [] };
  }

  if (method === "GET" && pathname === "/tenants/current/onboarding") {
    return {
      tenant,
      onboarding: visualTenant.onboarding,
    };
  }

  if (method === "GET" && pathname === "/locations") {
    return {
      locations: [visualLocation],
      total: 1,
      page: 1,
      limit: 100,
    };
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/notifications/summary"
  ) {
    const unread = workspaceNotifications.filter(
      (notification) => !notification.isRead,
    );
    const byCategory = {
      bookings: 0,
      payments: 0,
      waitlist: 0,

      tasks: 0,
      inventory: 0,
      migration: 0,
      communications: 0,
      account: 0,
    };
    for (const notification of unread) {
      byCategory[notification.category] += 1;
    }

    return {
      unreadCount: unread.length,
      byCategory,
    };
  }

  if (method === "GET" && pathname === "/tenants/current/notifications") {
    const status = url.searchParams.get("status");
    const category = url.searchParams.get("category");
    const locationId = url.searchParams.get("locationId");
    const notifications = workspaceNotifications.filter(
      (notification) =>
        (!status ||
          (status === "unread" && !notification.isRead) ||
          (status === "read" && notification.isRead)) &&
        (!category || notification.category === category) &&
        (!locationId || notification.locationId === locationId),
    );

    return {
      notifications,
      pagination: {
        page: Number(url.searchParams.get("page")) || 1,
        limit: Number(url.searchParams.get("limit")) || 20,
        total: notifications.length,
        pages: 1,
      },
    };
  }

  if (
    method === "PATCH" &&
    /^\/tenants\/current\/notifications\/[^/]+\/read$/.test(pathname)
  ) {
    const notificationId = pathname.split("/").at(-2);
    const notification =
      workspaceNotifications.find(({ id }) => id === notificationId) ??
      workspaceNotifications[0];

    notification.isRead = true;
    notification.readAt = "2026-07-30T08:00:00.000Z";
    return { ...notification };
  }

  if (
    method === "POST" &&
    pathname === "/tenants/current/notifications/read-all"
  ) {
    let updatedCount = 0;
    for (const notification of workspaceNotifications) {
      if (notification.isRead) continue;
      notification.isRead = true;
      notification.readAt = "2026-07-30T08:00:00.000Z";
      updatedCount += 1;
    }
    return { updatedCount };
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/settings/workspace-configuration"
  ) {
    return visualWorkspaceConfiguration;
  }

  if (method === "GET" && pathname === "/tenants/current/setup-center") {
    return scenarioFixture?.setupCenter ?? visualSetupCenter;
  }

  if (
    method === "POST" &&
    pathname === "/tenants/current/setup-center/events"
  ) {
    return {
      data: {
        accepted: true,
        eventId: "00000000-0000-4000-8000-000000000001",
        deduplicated: false,
      },
    };
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
      tenant: {
        name: visualTenant.name,
        slug: visualTenant.slug,
        publicCapabilities: {
          bookStudio: true,
          courses: true,
          memberships: true,
          vouchers: true,
          help: true,
          registration: true,
        },
      },
      draft: visualPublicSite,
      editor: {
        draftRevision: 8,
        publishedRevision: 8,
        hasUnpublishedChanges: false,
        draftUpdatedAt: "2026-07-30T08:20:00.000Z",
        publishedAt: "2026-07-29T15:10:00.000Z",
      },
      preview: {
        publicationStatus: "live",
        publiclyAvailable: true,
        hasExplicitPublicationState: true,
        data: {
          locations: [
            {
              ...visualLocation,
              booking: {
                enabled: true,
                timezone: visualTenant.settings.timezone,
                minBookingMinutes: 60,
                maxBookingMinutes: 360,
                slotStepMinutes: 30,
                globalCapacity: 8,
                activityCapacities: [{ activity: "WORKSTATION", capacity: 8 }],
              },
              openingHours: Object.fromEntries(
                [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].map((day) => [
                  day,
                  { isOpen: true, openTime: "08:00", closeTime: "20:00" },
                ]),
              ),
            },
          ],
          products: [
            {
              _id: "64a000000000000000000003",
              id: "64a000000000000000000003",
              availability: "onRequest",
              bookingMode: "public",
              category: "openStudio",
              currency: visualTenant.settings.currency,
              isActive: true,
              kind: "open-studio",
              name: { en: "Open Studio", cs: "Otevřený ateliér" },
              price: 490,
              title: "Open Studio",
            },
          ],
          courses: [],
          vouchers: [],
          memberships: [],
          membershipLocations: [],
          courseLocations: [],
          help: [],
        },
      },
    };
  }

  if (
    method === "GET" &&
    pathname === "/tenants/current/settings/public-site"
  ) {
    return {
      tenant: {
        name: visualTenant.name,
        slug: visualTenant.slug,
      },
      draft: visualPublicSite,
      editor: {
        draftRevision: 8,
        publishedRevision: 8,
        hasUnpublishedChanges: false,
        draftUpdatedAt: "2026-07-30T08:20:00.000Z",
        publishedAt: "2026-07-29T15:10:00.000Z",
        publicationStatus: "live",
      },
    };
  }

  if (method === "GET" && pathname === "/tenants/current/settings") {
    return {
      settings: {
        id: VISUAL_IDS.tenant,
        name: visualTenant.name,
        slug: visualTenant.slug,
        status: visualTenant.status,
        plan: visualTenant.plan,
        planVersion: "2026",
        defaultLanguage: visualTenant.settings.defaultLanguage,
        adminLanguage: workspaceLocale,
        currency: visualTenant.settings.currency,
        timezone: visualTenant.settings.timezone,
        updatedAt: "2026-07-30T08:00:00.000Z",
      },
    };
  }

  if (method === "GET" && pathname === "/ai/capabilities") {
    return {
      enabled: true,
      available: true,
      features: {
        assistant: true,
        communicationsCopilot: true,
        dailyBriefing: true,
      },
      usage: {
        exhausted: false,
      },
      credits: {
        remaining: 1000,
      },
    };
  }

  if (method === "GET" && pathname === "/dashboard/overview") {
    return buildDashboardOverview(url, overviewScenario);
  }

  if (method === "GET" && pathname === "/reports/overview") {
    return visualReportsOverview;
  }

  if (method === "GET" && pathname === "/tenant-payments/connect") {
    return scenarioFixture?.paymentConnect ?? visualPaymentConnect.active;
  }

  if (method === "POST" && pathname === "/ai/briefings/generate") {
    return { briefing: null };
  }

  if (method === "GET" && pathname === "/ai/briefings/latest") {
    const locale = url.searchParams.get("locale") || "en";
    const czech = locale === "cs";
    const denseLaptopBriefing =
      overviewScenario === ADMIN_OVERVIEW_SCENARIOS.DENSE_GUIDED;

    if (overviewScenario === ADMIN_OVERVIEW_SCENARIOS.ALL_CLEAR) {
      return { briefing: null };
    }

    return {
      briefing: {
        id: "visual-briefing-2026-07-30",
        dateKey: "2026-07-30",
        locale,
        headline: czech
          ? "Denní přehled studia — 30. července 2026"
          : denseLaptopBriefing
            ? "Three verified priorities before the studio opens this morning"
            : "Daily Studio Briefing — 30 July 2026",
        summary: czech
          ? "Šest ověřených zdrojů je dostupných a pokrytí je úplné. Zkontrolujte rezervace, úkoly týmu a zásoby."
          : denseLaptopBriefing
            ? "Start with the customer conversation, review staff tasks, and restore supplies before the first booked session begins."
            : "Six verified sources are available and coverage is complete. Review bookings, staff tasks and supplies.",
        generatedAt: "2026-07-30T08:01:00.000Z",
        sourceCount: 6,
        freshness: {
          state: "fresh",
        },
        provenance: {
          snapshotHash: "visual-overview-2026-07-30",
        },
        priorities: czech
          ? ["Zkontrolujte úkoly týmu před začátkem rezervací."]
          : denseLaptopBriefing
            ? [
                "Review the urgent customer conversation before opening.",
                "Confirm staff tasks and customer notifications.",
                "Restore the low-stock materials needed for today's sessions.",
              ]
            : ["Review staff tasks before the next booked session."],
      },
    };
  }

  if (method === "GET" && pathname === "/products") {
    return {
      products: [],
      totalCount: 0,
      totalPages: 0,
    };
  }

  if (
    method === "GET" &&
    pathname === "/memberships/plans" &&
    url.searchParams.get("includeInactive") === "true" &&
    url.searchParams.get("page") === "1" &&
    url.searchParams.get("limit") === "100"
  ) {
    return {
      plans: [],
      total: 0,
      page: 1,
      pages: 0,
    };
  }

  if (method === "GET" && pathname === "/bookings/history") {
    return {
      bookings: [],
      totalCount: 0,
    };
  }

  if (method === "GET" && pathname === "/users") {
    return {
      users: visualCustomers,
      summary: {
        totalCustomers: 48,
        activeMemberships: 23,
        customerCredits: 18650,
        newThisMonth: 7,
        needsAttention: 2,
      },
      totalCount: 48,
    };
  }

  if (method === "GET" && pathname === "/registered-sender-emails") {
    return {
      registeredSenderEmails: [
        {
          _id: "visual-managed-sender",
          provider: "postmark_managed",
          mode: "managed",
          email: "studio@notify.shario.io",
          displayName: "Studio Olivie",
          replyToEmail: "hello@studio-olivie.cz",
          replyToVerifiedAt: "2026-07-29T08:00:00.000Z",
          readiness: "ready",
          isDefault: true,
          isActive: true,
        },
      ],
    };
  }

  if (method === "GET" && pathname === "/communication-email-logs") {
    return { logs: [], totalCount: 0 };
  }

  if (method === "GET" && pathname === "/communications/overview") {
    return {
      overview: {
        counts: {
          open: 3,
          unread: 1,
          needsReview: 0,
          failedDeliveries: 0,
        },
        staff: [visualOwner],
        assignees: [visualOwner],
      },
    };
  }

  if (method === "GET" && pathname === "/communications/conversations") {
    return {
      conversations: [visualConversation],
      total: 1,
    };
  }

  if (
    method === "GET" &&
    pathname === `/communications/conversations/${visualConversation.id}`
  ) {
    return {
      conversation: visualConversation,
    };
  }

  if (
    method === "GET" &&
    pathname ===
      `/communications/conversations/${visualConversation.id}/messages`
  ) {
    return {
      messages: visualMessages,
      total: visualMessages.length,
    };
  }

  if (
    method === "GET" &&
    pathname ===
      `/communications/customers/${visualConversation.customer.id}/timeline`
  ) {
    return {
      conversations: [],
      messages: [],
    };
  }

  if (
    method === "GET" &&
    pathname === `/communications/consents/${visualConversation.customer.id}`
  ) {
    return {
      consents: [],
    };
  }

  return null;
};

export const getVisualSidebarStorageKey = () =>
  `shario:workspace-sidebar:v1:${VISUAL_IDS.tenant}:${VISUAL_IDS.owner}`;

export async function installAdminApiMocks(
  page,
  { overviewScenario, workspaceAccess, workspaceLocale = "en" } = {},
) {
  const unexpectedRequests = new Set();
  const handledRequests = new Set();
  const preferencePatches = [];
  const setupEventBodies = [];
  const workspaceNotifications = visualWorkspaceNotifications.map(
    (notification) => ({
      ...notification,
      location: { ...notification.location },
      message: { ...notification.message },
      title: { ...notification.title },
    }),
  );
  let currentWorkspaceAccess = workspaceAccess
    ? {
        ...workspaceAccess,
        preferences: { ...(workspaceAccess.preferences ?? {}) },
      }
    : null;

  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/.*/,
    async (route) => {
      const request = route.request();
      const method = request.method().toUpperCase();
      const url = new URL(request.url());
      const requestOrigin = request.headers().origin || VISUAL_TENANT_ORIGIN;
      const corsHeaders = {
        "access-control-allow-origin": requestOrigin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
        "cache-control": "no-store",
        vary: "Origin",
      };

      if (method === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
        return;
      }

      const pathname =
        url.pathname.length > 1
          ? url.pathname.replace(/\/+$/, "")
          : url.pathname;
      let responseStatus = 200;
      let response;

      if (
        method === "PATCH" &&
        pathname === "/tenants/current/access/me/preferences"
      ) {
        const preferences = request.postDataJSON();
        preferencePatches.push(preferences);
        const baseline = currentWorkspaceAccess ?? visualWorkspaceAccess;
        currentWorkspaceAccess = {
          ...baseline,
          preferences: {
            ...(baseline.preferences ?? {}),
            ...preferences,
            ...(preferences.contextualGuides
              ? {
                  contextualGuides: {
                    ...(baseline.preferences?.contextualGuides ?? {}),
                    ...preferences.contextualGuides,
                  },
                }
              : {}),
          },
        };
        response = { workspaceAccess: currentWorkspaceAccess };
      } else {
        if (method === "POST" && pathname === "/auth/customer/refresh") {
          responseStatus = 401;
        }
        if (
          method === "POST" &&
          pathname === "/tenants/current/setup-center/events"
        ) {
          setupEventBodies.push(request.postDataJSON());
          responseStatus = 202;
        }

        response = responseForRequest({
          method,
          overviewScenario,
          url,
          workspaceAccess: currentWorkspaceAccess,
          workspaceLocale,
          workspaceNotifications,
        });
      }

      if (response === null) {
        const requestKey = `${method} ${url.pathname}${url.search}`;
        unexpectedRequests.add(requestKey);
        await route.fulfill({
          status: 501,
          headers: {
            ...corsHeaders,
            "content-type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            code: "UNEXPECTED_VISUAL_QA_REQUEST",
            message: `No visual QA fixture is registered for ${requestKey}.`,
          }),
        });
        return;
      }

      handledRequests.add(`${method} ${url.pathname}`);
      await route.fulfill({
        status: responseStatus,
        headers: {
          ...corsHeaders,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(response),
      });
    },
  );

  return {
    handledRequests,
    preferencePatches,
    setupEventBodies,
    unexpectedRequests,
  };
}
