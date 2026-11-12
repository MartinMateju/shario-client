import { describe, expect, it } from "vitest";

import {
  CONTEXTUAL_GUIDES,
  CONTEXTUAL_GUIDE_ID_BY_SETUP_STEP,
  buildContextualGuideCtaHref,
  buildContextualGuideHref,
  createContextualGuideEvent,
  getContextualGuideStepEvent,
  getContextualPromptGuideForRoute,
  getEligibleContextualGuideForSetupStep,
  getEligibleContextualGuides,
} from "@/components/guides/contextualGuides.config";

const access = (...permissions) => ({ permissions });

const guideById = (id) => CONTEXTUAL_GUIDES.find((guide) => guide.id === id);

describe("contextual guide contract", () => {
  it("keeps twelve short, versioned, app-local guides", () => {
    expect(CONTEXTUAL_GUIDES.map(({ id }) => id)).toEqual([
      "studio_location_setup",
      "first_booking",
      "first_offer",
      "website_builder",
      "test_customer_journey",
      "memberships",
      "payments_setup",
      "data_import",
      "customer_communications",
      "ai_reports",
      "team_management",
      "door_access_codes",
    ]);

    expect(
      Object.fromEntries(
        CONTEXTUAL_GUIDES.map(({ id, version, steps }) => [
          id,
          { version, steps: steps.length },
        ]),
      ),
    ).toEqual({
      studio_location_setup: { version: 1, steps: 8 },
      first_booking: { version: 1, steps: 4 },
      first_offer: { version: 1, steps: 4 },
      website_builder: { version: 1, steps: 4 },
      test_customer_journey: { version: 1, steps: 4 },
      memberships: { version: 2, steps: 4 },
      payments_setup: { version: 1, steps: 4 },
      data_import: { version: 1, steps: 4 },
      customer_communications: { version: 1, steps: 4 },
      ai_reports: { version: 1, steps: 4 },
      team_management: { version: 1, steps: 4 },
      door_access_codes: { version: 1, steps: 6 },
    });
  });

  it("keeps the Door access guide available from Help with resilient targets", () => {
    const guide = guideById("door_access_codes");

    expect(guide).toMatchObject({
      href: "/app/settings/access-codes",
      route: "/app/settings/access-codes",
      requiredPermissions: ["access_codes.view"],
    });
    expect(guide.steps).toHaveLength(6);
    expect(
      getEligibleContextualGuides({
        tenant: { modules: { bookings: true } },
        workspaceAccess: access("access_codes.view"),
      }).map(({ id }) => id),
    ).toContain("door_access_codes");
    expect(
      getEligibleContextualGuides({
        tenant: { modules: { bookings: false, courses: false } },
        workspaceAccess: access("access_codes.view"),
      }).map(({ id }) => id),
    ).not.toContain("door_access_codes");
    for (const step of guide.steps) {
      expect(step.selectors).toContain(
        '[data-contextual-guide-target="access-codes-page"]',
      );
    }
  });

  it("uses unique step keys, safe destinations and distinct telemetry", () => {
    for (const guide of CONTEXTUAL_GUIDES) {
      expect(new Set(guide.steps.map(({ key }) => key)).size).toBe(
        guide.steps.length,
      );
      expect(guide.href).toMatch(/^\/app(?:[/?#]|$)/);
      expect(guide.ctaHref).toMatch(/^\/app(?:[/?#]|$)/);
      expect(buildContextualGuideHref(guide)).toContain(`guide=${guide.id}`);
      for (const step of guide.steps) {
        expect(step.selectors?.length).toBeGreaterThan(0);
        if (step.mobileSelectors) {
          expect(step.mobileSelectors.length).toBeGreaterThan(0);
        }
      }
      expect(
        new Set(
          guide.steps.map((step) => getContextualGuideStepEvent(guide, step)),
        ).size,
      ).toBe(guide.steps.length);
    }
  });

  it("uses mobile-safe targets for fixed website actions and hidden previews", () => {
    const builder = guideById("website_builder");
    expect(builder.steps.find(({ key }) => key === "publish")).toMatchObject({
      mobileSelectors: [
        '[data-contextual-guide-target="website-preview-toggle"]',
      ],
    });

    const journey = guideById("test_customer_journey");
    for (const key of [
      "public_site",
      "test_booking",
      "confirmation_email",
      "customer_portal",
    ]) {
      expect(
        journey.steps.find((step) => step.key === key).mobileSelectors,
      ).toContain('[data-contextual-guide-target="website-preview-toggle"]');
    }
  });

  it("keeps payment onboarding guidance visible for read-only API states", () => {
    const payments = guideById("payments_setup");

    expect(
      payments.steps.find(({ key }) => key === "stripe_onboarding").selectors,
    ).toEqual([
      '[data-contextual-guide-target="payments-onboarding"]',
      '[data-contextual-guide-target="payments-checklist"]',
    ]);
  });

  it("filters the catalog by permissions and tenant modules", () => {
    const tenant = {
      modules: {
        bookings: true,
        firing: false,
        memberships: true,
        credits: true,
        vouchers: true,
      },
    };
    const workspaceAccess = access(
      "bookings.view",
      "bookings.create",
      "workspace.update",
      "firings.view",
      "memberships.view",
      "products.view",
      "credits.view",
      "team.view",
      "team.manage",
    );

    expect(
      getEligibleContextualGuides({ tenant, workspaceAccess }).map(
        ({ id }) => id,
      ),
    ).toEqual([
      "first_booking",
      "website_builder",
      "test_customer_journey",
      "memberships",
      "team_management",
    ]);
  });

  it("supports any-permission imports and any-module offer workflows", () => {
    expect(
      getEligibleContextualGuides({
        tenant: { modules: { bookings: false, courses: true } },
        workspaceAccess: access("products.view", "products.manage"),
      }).map(({ id }) => id),
    ).toContain("first_offer");

    expect(
      getEligibleContextualGuides({
        tenant: {},
        workspaceAccess: access("credits.import"),
      }).map(({ id }) => id),
    ).toContain("data_import");

    expect(
      getEligibleContextualGuides({
        tenant: { modules: { bookings: false, courses: false } },
        workspaceAccess: access("products.view", "products.manage"),
      }).map(({ id }) => id),
    ).not.toContain("first_offer");
  });

  it("requires every Practice Mode permission for the customer journey", () => {
    const tenant = { modules: { bookings: true } };
    const eligibleIds = (...permissions) =>
      getEligibleContextualGuides({
        tenant,
        workspaceAccess: access(...permissions),
      }).map(({ id }) => id);

    expect(
      eligibleIds("workspace.update", "products.view", "bookings.create"),
    ).toContain("test_customer_journey");

    for (const permissions of [
      ["products.view", "bookings.create"],
      ["workspace.update", "bookings.create"],
      ["workspace.update", "products.view"],
    ]) {
      expect(eligibleIds(...permissions)).not.toContain(
        "test_customer_journey",
      );
    }
  });

  it("only proactively prompts the four outcome guides", () => {
    const productContext = {
      tenant: { modules: { bookings: true } },
      workspaceAccess: access("products.view", "products.manage"),
    };
    expect(
      getContextualPromptGuideForRoute("/app/products", productContext, {})?.id,
    ).toBe("first_offer");
    expect(
      getContextualPromptGuideForRoute("/app/products", productContext, {
        first_offer: { version: 1, status: "completed" },
      }),
    ).toBeNull();

    expect(
      getContextualPromptGuideForRoute(
        "/app/settings/public-site",
        {
          tenant: { modules: { courses: true } },
          workspaceAccess: access(
            "workspace.update",
            "products.view",
            "bookings.create",
          ),
        },
        {},
      )?.id,
    ).toBe("test_customer_journey");

    expect(
      getContextualPromptGuideForRoute(
        "/app/settings/payments",
        {
          tenant: { modules: { payments: true } },
          workspaceAccess: access("payments.connect.manage"),
        },
        {},
      ),
    ).toBeNull();

    expect(
      CONTEXTUAL_GUIDES.filter(({ proactivePrompt }) => proactivePrompt).map(
        ({ id }) => id,
      ),
    ).toEqual([
      "studio_location_setup",
      "first_booking",
      "first_offer",
      "test_customer_journey",
    ]);
  });

  it("maps only exact, eligible Launch Center steps to guided tours", () => {
    expect(CONTEXTUAL_GUIDE_ID_BY_SETUP_STEP).toEqual({
      location: "studio_location_setup",
      bookable_offer: "first_offer",
      public_site: "website_builder",
      practice_booking: "test_customer_journey",
      membership: "memberships",
      payments: "payments_setup",
      communications: "customer_communications",
      team: "team_management",
    });

    const context = {
      tenant: {
        modules: {
          automations: true,
          bookings: true,
          communications: true,
          courses: true,
          credits: true,
          memberships: true,
          payments: true,
          vouchers: true,
        },
      },
      workspaceAccess: access(
        "locations.view",
        "locations.manage",
        "products.view",
        "products.manage",
        "workspace.update",
        "bookings.create",
        "memberships.view",
        "credits.view",
        "payments.connect.manage",
        "communications.manage",
        "team.view",
        "team.manage",
      ),
    };

    for (const [stepId, guideId] of Object.entries(
      CONTEXTUAL_GUIDE_ID_BY_SETUP_STEP,
    )) {
      expect(getEligibleContextualGuideForSetupStep(stepId, context)?.id).toBe(
        guideId,
      );
    }

    expect(
      getEligibleContextualGuideForSetupStep("firing", context),
    ).toBeNull();
    expect(
      getEligibleContextualGuideForSetupStep("communications", {
        ...context,
        workspaceAccess: access("communications.view"),
      }),
    ).toBeNull();
    expect(
      getEligibleContextualGuideForSetupStep("bookable_offer", {
        ...context,
        tenant: {
          ...context.tenant,
          modules: {
            ...context.tenant.modules,
            bookings: false,
            courses: true,
          },
        },
      }),
    ).toBeNull();

    const communicationsGuide = getEligibleContextualGuideForSetupStep(
      "communications",
      context,
    );
    expect(buildContextualGuideHref(communicationsGuide)).toBe(
      "/app/communications?section=setup&guide=customer_communications",
    );
    expect(buildContextualGuideHref(communicationsGuide)).not.toContain(
      "setupStep",
    );
  });

  it("offers the location setup guide only to location managers", () => {
    const tenant = { modules: { bookings: true } };
    const managed = {
      tenant,
      workspaceAccess: access("locations.view", "locations.manage"),
    };

    expect(getEligibleContextualGuides(managed).map(({ id }) => id)).toContain(
      "studio_location_setup",
    );
    expect(
      getContextualPromptGuideForRoute(
        "/app/settings/locations/new",
        managed,
        {},
      )?.id,
    ).toBe("studio_location_setup");
    expect(
      getEligibleContextualGuides({
        tenant,
        workspaceAccess: access("locations.view"),
      }).map(({ id }) => id),
    ).not.toContain("studio_location_setup");
  });

  it("requires every membership surface before offering its combined guide", () => {
    const fullTenant = {
      modules: { memberships: true, credits: true, vouchers: true },
    };
    const fullAccess = access(
      "memberships.view",
      "products.view",
      "credits.view",
    );

    expect(
      getEligibleContextualGuides({
        tenant: fullTenant,
        workspaceAccess: fullAccess,
      }).map(({ id }) => id),
    ).toContain("memberships");

    expect(
      getEligibleContextualGuides({
        tenant: {
          modules: { memberships: true, credits: false, vouchers: true },
        },
        workspaceAccess: fullAccess,
      }).map(({ id }) => id),
    ).not.toContain("memberships");

    expect(
      getEligibleContextualGuides({
        tenant: fullTenant,
        workspaceAccess: access("memberships.view", "products.view"),
      }).map(({ id }) => id),
    ).not.toContain("memberships");
  });

  it("preserves same-page state and never leaks it into cross-route CTAs", () => {
    const calendarGuide = guideById("first_booking");
    expect(
      buildContextualGuideHref(calendarGuide, {
        pathname: "/app/calendar",
        search: "view=week&locationId=studio-1",
      }),
    ).toBe("/app/calendar?view=week&locationId=studio-1&guide=first_booking");
    expect(
      buildContextualGuideCtaHref(calendarGuide, {
        pathname: "/app/calendar",
        search: "view=week&guide=first_booking",
      }),
    ).toBe("/app/calendar?view=week");

    const offerGuide = guideById("first_offer");
    expect(
      buildContextualGuideCtaHref(offerGuide, {
        pathname: "/app/products",
        search: "category=classes&guide=first_offer&locationId=studio-1",
      }),
    ).toBe("/app/setup?step=bookable_offer");

    const journeyGuide = guideById("test_customer_journey");
    expect(
      buildContextualGuideCtaHref(journeyGuide, {
        pathname: "/app/settings/public-site",
        search: "preview=portal&guide=test_customer_journey",
      }),
    ).toBe("/app/setup?step=practice_booking");
  });

  it("requires live AI capability before offering the AI guide", () => {
    const workspaceAccess = access("ai.use", "reports.view");
    expect(
      getEligibleContextualGuides({
        aiAvailable: false,
        tenant: {},
        workspaceAccess,
      }).map(({ id }) => id),
    ).not.toContain("ai_reports");
    expect(
      getEligibleContextualGuides({
        aiAvailable: true,
        tenant: {},
        workspaceAccess,
      }).map(({ id }) => id),
    ).toContain("ai_reports");
  });

  it("builds bounded telemetry without workspace identifiers", () => {
    const guide = guideById("memberships");
    const step = guide.steps.at(-1);
    const event = createContextualGuideEvent({
      entryPoint: "help_replay",
      event: getContextualGuideStepEvent(guide, step),
      guide,
      position: 5,
      sessionId: "guide_session_01",
      step,
    });

    expect(event).toMatchObject({
      sessionId: "guide_session_01",
      event: `contextual_guide_memberships_${step.key}_viewed`,
      source: "contextual_guide",
      metadata: {
        guideId: "memberships",
        guideVersion: 2,
        guideStep: step.key,
        guideEntryPoint: "help_replay",
        position: 5,
        total: guide.steps.length,
      },
    });
    expect(event.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(JSON.stringify(event)).not.toMatch(
      /email|tenantId|userId|studioId|name/i,
    );
  });
});
