import {
  DATA_IMPORT_PERMISSIONS,
  PERMISSIONS,
  hasPermission,
} from "@/config/permissions";
import {
  createProductTourId,
  getProductTourViewport,
} from "@/components/product-tour/productTour.config";
export const CONTEXTUAL_GUIDE_PARAM = "guide";
export const CONTEXTUAL_GUIDE_ENTRY_POINT = Object.freeze({
  CONTEXTUAL_PROMPT: "contextual_prompt",
  HELP_REPLAY: "help_replay",
});
export const CONTEXTUAL_GUIDES = Object.freeze([
  {
    id: "studio_location_setup",
    version: 1,
    proactivePrompt: true,
    href: "/app/settings/locations/new",
    route: "/app/settings/locations/new",
    requiredPermissions: [
      PERMISSIONS.LOCATIONS_VIEW,
      PERMISSIONS.LOCATIONS_MANAGE,
    ],
    modulesAny: ["bookings", "courses"],
    ctaHref: "/app/settings/locations/new",
    steps: [
      {
        key: "identity",
        selectors: ['[data-contextual-guide-target="location-identity"]'],
      },
      {
        key: "address",
        selectors: ['[data-contextual-guide-target="location-address"]'],
      },
      {
        key: "contact",
        selectors: ['[data-contextual-guide-target="location-contact"]'],
      },
      {
        key: "activity_choice",
        selectors: [
          '[data-contextual-guide-target="location-activity-choice"]',
        ],
      },
      {
        key: "activity_capacity",
        selectors: [
          '[data-contextual-guide-target="location-activity-capacity"]',
        ],
      },
      {
        key: "overall_capacity",
        selectors: ['[data-contextual-guide-target="location-capacity"]'],
      },
      {
        key: "timing",
        selectors: ['[data-contextual-guide-target="location-timing"]'],
      },
      {
        key: "review",
        selectors: ['[data-contextual-guide-target="location-review"]'],
      },
    ],
  },
  {
    id: "first_booking",
    version: 1,
    proactivePrompt: true,
    href: "/app/calendar",
    route: "/app/calendar",
    requiredPermissions: [
      PERMISSIONS.BOOKINGS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
    ],
    modules: ["bookings"],
    ctaHref: "/app/calendar",
    steps: [
      {
        key: "calendar",
        selectors: ['[data-calendar-shell="true"]'],
      },
      {
        key: "create_action",
        selectors: ['[data-contextual-guide-target="first-booking-create"]'],
      },
      {
        key: "booking_details",
        selectors: ['[data-calendar-command-bar="true"]'],
      },
      {
        key: "confirmation",
        selectors: ['[data-calendar-viewport="true"]'],
      },
    ],
  },
  {
    id: "first_offer",
    version: 1,
    proactivePrompt: true,
    href: "/app/products?category=openStudio",
    route: "/app/products",
    requiredPermissions: [
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.PRODUCTS_MANAGE,
    ],
    modulesAny: ["bookings", "courses"],
    ctaHref: "/app/setup?step=bookable_offer",
    ctaLabelKey: "items.first_offer.cta",
    steps: [
      {
        key: "offer_types",
        selectors: [
          "#product-catalog-sections-tab-openStudio",
          "#product-catalog-sections-tab-classes",
        ],
      },
      {
        key: "create_offer",
        selectors: ['[data-contextual-guide-target="first-offer-create"]'],
      },
      {
        key: "price_capacity",
        selectors: [
          '[data-contextual-guide-target="first-offer-catalog"]',
          "#product-catalog-sections-panel-openStudio",
          "#product-catalog-sections-panel-classes",
        ],
      },
      {
        key: "publish",
        selectors: [
          '[data-contextual-guide-target="first-offer-catalog"]',
          "#product-catalog-sections-panel-openStudio",
          "#product-catalog-sections-panel-classes",
        ],
      },
    ],
  },
  {
    id: "website_builder",
    version: 1,
    href: "/app/settings/public-site",
    route: "/app/settings/public-site",
    requiredPermissions: [PERMISSIONS.WORKSPACE_UPDATE],
    ctaHref: "/app/settings/public-site",
    steps: [
      {
        key: "editor_sections",
        selectors: ["#public-site-editor-pane"],
      },
      {
        key: "live_preview",
        selectors: [
          '[data-contextual-guide-target="website-preview-toggle"]',
          "#public-site-preview-pane",
          '[data-testid="public-site-live-preview"]',
        ],
      },
      {
        key: "branding",
        selectors: ["#public-site-editor-sections-tab-branding"],
      },
      {
        key: "publish",
        mobileSelectors: [
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
        selectors: ['[data-contextual-guide-target="website-actions"]'],
      },
    ],
  },
  {
    id: "test_customer_journey",
    version: 1,
    proactivePrompt: true,
    href: "/app/settings/public-site",
    route: "/app/settings/public-site",
    requiredPermissions: [
      PERMISSIONS.WORKSPACE_UPDATE,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.BOOKINGS_CREATE,
    ],
    modulesAny: ["bookings", "courses"],
    ctaHref: "/app/setup?step=practice_booking",
    ctaLabelKey: "items.test_customer_journey.cta",
    steps: [
      {
        key: "public_site",
        mobileSelectors: [
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
        selectors: ['[data-contextual-guide-target="website-actions"]'],
      },
      {
        key: "test_booking",
        mobileSelectors: [
          '[data-contextual-guide-target="customer-journey-open-site"]',
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
        selectors: [
          '[data-contextual-guide-target="customer-journey-open-site"]',
          '[data-contextual-guide-target="website-actions"]',
        ],
      },
      {
        key: "confirmation_email",
        mobileSelectors: [
          '[data-contextual-guide-target="customer-journey-open-site"]',
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
        selectors: [
          '[data-contextual-guide-target="customer-journey-open-site"]',
          '[data-contextual-guide-target="website-actions"]',
        ],
      },
      {
        key: "customer_portal",
        mobileSelectors: [
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
        selectors: [
          '[data-contextual-guide-target="customer-journey-preview-page"]',
          "#public-site-preview-pane",
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
      },
    ],
  },
  {
    id: "memberships",
    version: 2,
    href: "/app/products?category=memberships",
    route: "/app/products",
    requiredPermissions: [
      PERMISSIONS.MEMBERSHIPS_VIEW,
      PERMISSIONS.PRODUCTS_VIEW,
      PERMISSIONS.CREDITS_VIEW,
    ],
    modules: ["memberships", "credits", "vouchers"],
    ctaHref: "/app/products?category=memberships",
    steps: [
      {
        key: "plans",
        selectors: ["#membership-sections-tab-plans"],
      },
      {
        key: "customers",
        selectors: ["#membership-sections-tab-customers"],
      },
      {
        key: "credits",
        selectors: [
          "#membership-sections-tab-customers",
          "#product-catalog-sections-panel-memberships",
        ],
      },
      {
        key: "vouchers",
        selectors: ["#product-catalog-sections-tab-vouchers"],
      },
    ],
  },
  {
    id: "payments_setup",
    version: 1,
    href: "/app/settings/payments",
    route: "/app/settings/payments",
    requiredPermissions: [PERMISSIONS.PAYMENTS_CONNECT_MANAGE],
    modules: ["payments"],
    ctaHref: "/app/settings/payments?setupStep=payments",
    ctaLabelKey: "items.payments_setup.cta",
    steps: [
      {
        key: "connection_status",
        selectors: ['[data-contextual-guide-target="payments-status"]'],
      },
      {
        key: "stripe_onboarding",
        selectors: [
          '[data-contextual-guide-target="payments-onboarding"]',
          '[data-contextual-guide-target="payments-checklist"]',
        ],
      },
      {
        key: "payment_capabilities",
        selectors: ['[data-contextual-guide-target="payments-capabilities"]'],
      },
      {
        key: "verify_payment",
        selectors: ['[data-contextual-guide-target="payments-checklist"]'],
      },
    ],
  },
  {
    id: "data_import",
    version: 1,
    href: "/app/settings/migration",
    route: "/app/settings/migration",
    requiredPermissions: [],
    anyPermissions: DATA_IMPORT_PERMISSIONS,
    ctaHref: "/app/settings/migration",
    ctaLabelKey: "items.data_import.cta",
    steps: [
      {
        key: "choose_importer",
        selectors: ['[data-contextual-guide-target="data-import-types"]'],
      },
      {
        key: "template_upload",
        selectors: ['[data-contextual-guide-target="data-import-wizard"]'],
      },
      {
        key: "validation",
        selectors: [
          '[data-contextual-guide-target="data-import-progress"]',
          '[data-contextual-guide-target="data-import-wizard"]',
        ],
      },
      {
        key: "history_rollback",
        selectors: ['[data-contextual-guide-target="data-import-history"]'],
      },
    ],
  },
  {
    id: "customer_communications",
    version: 1,
    href: "/app/communications?section=setup",
    route: "/app/communications",
    requiredPermissions: [PERMISSIONS.COMMUNICATIONS_MANAGE],
    modules: ["communications", "automations"],
    ctaHref: "/app/communications?section=setup&setupStep=communications",
    ctaLabelKey: "items.customer_communications.cta",
    steps: [
      {
        key: "templates",
        selectors: ["#email-workspace-sections-tab-templates"],
      },
      {
        key: "reminders",
        selectors: ["#email-workspace-sections-tab-automations"],
      },
      {
        key: "test_email",
        selectors: [
          "[data-email-setup-view]",
          "#email-workspace-sections-tab-setup",
        ],
      },
      {
        key: "delivery_history",
        selectors: ["#email-workspace-sections-tab-history"],
      },
    ],
  },
  {
    id: "ai_reports",
    version: 1,
    href: "/app/operations?section=statistics",
    route: "/app/operations",
    requiredPermissions: [PERMISSIONS.AI_USE, PERMISSIONS.REPORTS_VIEW],
    requiresAiAvailable: true,
    ctaHref: "/app/operations?section=statistics",
    steps: [
      {
        key: "assistant",
        selectors: ['[data-product-tour-target="ai-assistant"]'],
      },
      {
        key: "advisor",
        selectors: ["#report-sections-tab-overview"],
      },
      {
        key: "report_filters",
        selectors: ['[data-contextual-guide-target="report-filters"]'],
      },
      {
        key: "report_insights",
        selectors: [
          '[data-contextual-guide-target="report-content"]',
          "#report-sections-panel-overview",
        ],
      },
    ],
  },
  {
    id: "team_management",
    version: 1,
    href: "/app/settings/team",
    route: "/app/settings/team",
    requiredPermissions: [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TEAM_MANAGE],
    ctaHref: "/app/settings/team",
    steps: [
      {
        key: "members",
        selectors: ['[data-contextual-guide-target="team-members"]'],
      },
      {
        key: "invite",
        selectors: ['[data-contextual-guide-target="team-invite"]'],
      },
      {
        key: "roles",
        selectors: [
          '[data-contextual-guide-target="team-list"]',
          '[data-contextual-guide-target="team-members"]',
        ],
      },
      {
        key: "location_access",
        selectors: [
          '[data-contextual-guide-target="team-list"]',
          '[data-contextual-guide-target="team-members"]',
        ],
      },
    ],
  },
  {
    id: "door_access_codes",
    version: 1,
    href: "/app/settings/access-codes",
    route: "/app/settings/access-codes",
    requiredPermissions: [PERMISSIONS.ACCESS_CODES_VIEW],
    modulesAny: ["bookings", "courses"],
    ctaHref: "/app/settings/access-codes",
    steps: [
      {
        key: "scope",
        selectors: [
          '[data-contextual-guide-target="access-codes-scope"]',
          '[data-contextual-guide-target="access-codes-page"]',
        ],
      },
      {
        key: "entrances",
        selectors: [
          '[data-contextual-guide-target="access-codes-pools"]',
          '[data-contextual-guide-target="access-codes-page"]',
        ],
      },
      {
        key: "stock",
        selectors: [
          '[data-contextual-guide-target="access-codes-stock"]',
          '[data-contextual-guide-target="access-codes-pools"]',
          '[data-contextual-guide-target="access-codes-page"]',
        ],
      },
      {
        key: "add_codes",
        selectors: [
          '[data-contextual-guide-target="access-codes-add"]',
          '[data-contextual-guide-target="access-codes-pools"]',
          '[data-contextual-guide-target="access-codes-page"]',
        ],
      },
      {
        key: "lifecycle",
        selectors: [
          '[data-contextual-guide-target="access-codes-inventory"]',
          '[data-contextual-guide-target="access-codes-pools"]',
          '[data-contextual-guide-target="access-codes-page"]',
        ],
      },
      {
        key: "audit",
        selectors: [
          '[data-contextual-guide-target="access-codes-audit"]',
          '[data-contextual-guide-target="access-codes-pools"]',
          '[data-contextual-guide-target="access-codes-page"]',
        ],
      },
    ],
  },
]);
export const CONTEXTUAL_GUIDE_BY_ID = Object.freeze(
  Object.fromEntries(CONTEXTUAL_GUIDES.map((guide) => [guide.id, guide])),
);
export const CONTEXTUAL_GUIDE_ID_BY_SETUP_STEP = Object.freeze({
  location: "studio_location_setup",
  bookable_offer: "first_offer",
  public_site: "website_builder",
  practice_booking: "test_customer_journey",
  membership: "memberships",
  payments: "payments_setup",
  communications: "customer_communications",
  team: "team_management",
});
const normalizePath = (value = "") => {
  const path = String(value || "").split("?")[0] || "/";
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
};
const moduleEnabled = (tenant, module) => tenant?.modules?.[module] !== false;
const hasAnyRequiredPermission = (guide, workspaceAccess) =>
  !guide.anyPermissions?.length ||
  guide.anyPermissions.some((permission) =>
    hasPermission(workspaceAccess, permission),
  );
const hasAnyRequiredModule = (guide, tenant) =>
  !guide.modulesAny?.length ||
  guide.modulesAny.some((module) => moduleEnabled(tenant, module));
export const isContextualGuideEligible = (
  guide,
  { aiAvailable = false, tenant, workspaceAccess } = {},
) =>
  Boolean(
    guide &&
    guide.requiredPermissions.every((permission) =>
      hasPermission(workspaceAccess, permission),
    ) &&
    hasAnyRequiredPermission(guide, workspaceAccess) &&
    (guide.modules || []).every((module) => moduleEnabled(tenant, module)) &&
    hasAnyRequiredModule(guide, tenant) &&
    (!guide.requiresAiAvailable || aiAvailable),
  );
export const getEligibleContextualGuideForSetupStep = (stepId, context) => {
  if (
    stepId === "bookable_offer" &&
    context?.tenant?.modules?.bookings === false
  ) {
    return null;
  }
  const guideId = CONTEXTUAL_GUIDE_ID_BY_SETUP_STEP[stepId];
  const guide = guideId ? CONTEXTUAL_GUIDE_BY_ID[guideId] : null;
  return isContextualGuideEligible(guide, context) ? guide : null;
};
export const getEligibleContextualGuides = (context) =>
  CONTEXTUAL_GUIDES.filter((guide) =>
    isContextualGuideEligible(guide, context),
  );
export const getContextualGuideForRoute = (pathname, context) => {
  const route = normalizePath(pathname);
  return (
    getEligibleContextualGuides(context).find(
      (guide) => normalizePath(guide.route) === route,
    ) || null
  );
};
export const isContextualGuideAcknowledged = (guide, saved) =>
  Boolean(
    guide &&
    Number(saved?.version) >= guide.version &&
    (saved?.status === "completed" || saved?.status === "skipped"),
  );
export const getContextualPromptGuideForRoute = (
  pathname,
  context,
  savedGuides = {},
) => {
  const route = normalizePath(pathname);
  return (
    getEligibleContextualGuides(context).find(
      (guide) =>
        guide.proactivePrompt === true &&
        normalizePath(guide.route) === route &&
        !isContextualGuideAcknowledged(guide, savedGuides[guide.id]),
    ) || null
  );
};
const buildContextualGuideDestination = (
  destination,
  { pathname: currentPathname, search: currentSearch = "" } = {},
) => {
  const [pathname, search = ""] = destination.split("?");
  const sameRoute = normalizePath(currentPathname) === normalizePath(pathname);
  const params = new URLSearchParams(sameRoute ? currentSearch : "");
  for (const [key, value] of new URLSearchParams(search)) {
    params.set(key, value);
  }
  return {
    params,
    pathname,
  };
};
export const buildContextualGuideHref = (guide, location = {}) => {
  const { params, pathname } = buildContextualGuideDestination(
    guide.href,
    location,
  );
  params.delete("setupStep");
  params.delete("action");
  params.set(CONTEXTUAL_GUIDE_PARAM, guide.id);
  return `${pathname}?${params.toString()}`;
};
export const buildContextualGuideCtaHref = (guide, location = {}) => {
  const { params, pathname } = buildContextualGuideDestination(
    guide.ctaHref,
    location,
  );
  params.delete(CONTEXTUAL_GUIDE_PARAM);
  const suffix = params.toString();
  return `${pathname}${suffix ? `?${suffix}` : ""}`;
};
export const createContextualGuideEvent = ({
  entryPoint,
  event,
  guide,
  position,
  sessionId,
  step,
}) => {
  const width = typeof window === "undefined" ? 1024 : window.innerWidth;
  return {
    eventId: createProductTourId("event"),
    sessionId,
    event,
    source: "contextual_guide",
    metadata: {
      guideId: guide.id,
      guideVersion: guide.version,
      ...(step
        ? {
            guideStep: step.key,
          }
        : {}),
      guideEntryPoint: entryPoint,
      ...(position
        ? {
            position,
          }
        : {}),
      total: guide.steps.length,
      viewport: getProductTourViewport(width),
    },
  };
};
export const getContextualGuideStepEvent = (guide, step) =>
  `contextual_guide_${guide.id}_${step.key}_viewed`;
export const createContextualGuideSessionId = () =>
  createProductTourId("guide");
