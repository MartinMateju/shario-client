import { describe, expect, it } from "vitest";
import {
  getLaunchSetupProgress,
  getLaunchCenterNavigationStatus,
  getLaunchCenterSections,
  getLaunchReadinessItems,
  getPrimaryAction,
  getNextBestSetupStep,
  getOverviewSetupPresentation,
  getPaymentSetupProgress,
  getPracticeBookingBlockingSteps,
  getRequiredSetupProgress,
  getSetupActionHref,
  getSetupStepEstimatedMinutes,
  getSetupStepGroups,
  getVisibleSetupSteps,
  prioritizeSetupSteps,
  isLaunchJourneyComplete,
  isLaunchReadyToPublish,
  isPaymentSetupReady,
} from "@/components/setup-center/setupCenter.utils";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";
const outcomeCopyByLocale = [
  {
    label: "English",
    catalog: messagesEn,
    workflowIntent: "A Launch Center that fits the way your studio works",
    steps: {
      studio: "Your workspace essentials are ready",
      location: "Your first studio location is ready",
      payments: "You’re ready to accept payments",
      bookable_offer: "Customers can now make bookings",
      public_site: "Your public website is customized",
      membership: "Customers can join your studio",
      practice_booking: "Your customer booking journey is tested",
      inventory: "Your team can track materials",
      communications: "Customers receive the right messages",
      team: "Your team can help run the studio",
      publish: "Your studio is ready to welcome customers",
    },
    recommendations: {
      membership: "Customers can become studio members",
      reminders: "Customers are reminded before every booking",
      customers: "Your existing customers are ready in Shario",
    },
  },
  {
    label: "Czech",
    catalog: messagesCs,
    workflowIntent: "Centrum spuštění podle fungování vašeho studia",
    steps: {
      studio: "Základní údaje pracovního prostoru jsou připravené",
      location: "První provozovna studia je připravená",
      payments: "Můžete přijímat platby",
      bookable_offer: "Zákazníci mohou vytvářet rezervace",
      public_site: "Veřejný web je přizpůsobený vašemu studiu",
      membership: "Zákazníci se mohou stát členy studia",
      practice_booking: "Cesta zákaznické rezervace je otestovaná",
      inventory: "Tým může sledovat materiály",
      communications: "Zákazníci dostávají správné zprávy",
      team: "Tým vám může pomáhat s provozem studia",
      publish: "Studio je připravené přivítat zákazníky",
    },
    recommendations: {
      membership: "Zákazníci se mohou stát členy studia",
      reminders: "Zákazníci dostanou připomínku před každou rezervací",
      customers: "Vaši stávající zákazníci jsou připraveni ve Shario",
    },
  },
];
describe("Launch Center requirement model", () => {
  it.each([
    ["English", messagesEn],
    ["Czech", messagesCs],
  ])(
    "retains v9 communication copy for staggered rollout compatibility in %s",
    (_label, catalog) => {
      expect(catalog.SetupCenter.checks.sender_verified).toEqual(
        expect.any(String),
      );
      for (const key of [
        "booking_confirmation",
        "incoming_mailbox",
        "whatsapp",
        "instagram",
        "business_hours",
      ]) {
        expect(catalog.SetupCenter.checks[key]).toEqual(expect.any(String));
      }
      for (const key of ["connect_instagram", "configure_check_in"]) {
        expect(catalog.SetupCenter.actions[key]).toEqual(expect.any(String));
      }
      for (const key of [
        "booking_confirmation_not_configured",
        "incoming_mailbox_not_connected",
        "whatsapp_not_connected",
        "instagram_not_connected",
        "business_hours_not_configured",
      ]) {
        expect(catalog.SetupCenter.reasons[key]).toEqual(expect.any(String));
      }
      expect(
        catalog.SetupCenter.readiness.items.emails.descriptions
          .confirmation_required,
      ).toEqual(expect.any(String));
      expect(catalog.SetupCenter.learning.items.instagram).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.learning.items.check_in).toEqual(
        expect.any(String),
      );
    },
  );
  it.each([
    ["English", messagesEn],
    ["Czech", messagesCs],
  ])("provides every dynamic sidebar status in %s", (_label, catalog) => {
    expect(catalog.Dashboard.launchCenterLiveBadge).toEqual(expect.any(String));
    expect(catalog.Dashboard.launchCenterReadyBadge).toEqual(
      expect.any(String),
    );
    expect(catalog.Dashboard.launchCenterIssueBadge).toContain("{count");
    expect(catalog.Dashboard.launchCenterLiveStatus).toEqual(
      expect.any(String),
    );
    expect(catalog.Dashboard.launchCenterReadyStatus).toEqual(
      expect.any(String),
    );
    expect(catalog.Dashboard.launchCenterAttentionStatus).toContain("{count");
    expect(catalog.Dashboard.launchCenterCompleteBadge).toBeUndefined();
  });
  it("keeps Launch Center visible after the essentials are ready", () => {
    expect(messagesEn.SetupCenter.hero.learningTitle).toBe(
      "Your studio essentials are ready",
    );
    expect(messagesCs.SetupCenter.hero.learningTitle).toBe(
      "Základní části studia jsou připravené",
    );
    expect(messagesEn.Dashboard.routeTitles.setup).toBe("Launch Center");
    expect(messagesCs.Dashboard.routeTitles.setup).toBe("Centrum spuštění");
    expect(messagesEn.SetupCenter.hero.learningTitle).not.toContain("live");
    expect(messagesCs.SetupCenter.hero.learningTitle).not.toContain("spuštěné");
  });
  it("labels payment readiness and the launch checklist without conflating them", () => {
    expect(messagesEn.SetupCenter.sections.required.title).toBe(
      "Requirements to accept payments",
    );
    expect(messagesEn.SetupCenter.sections.recommended.title).toBe(
      "Checklist before you launch",
    );
    expect(messagesEn.SetupCenter.completion.paymentsTitle).toBe(
      "Your studio can now accept payments",
    );
    expect(messagesEn.SetupCenter.completion.paymentsDescription).toContain(
      "payouts",
    );
    expect(messagesEn.SetupCenter.completion.paymentsDescription).toContain(
      "bank account",
    );
    expect(messagesCs.SetupCenter.sections.required.title).toBe(
      "Požadavky pro přijímání plateb",
    );
    expect(messagesCs.SetupCenter.sections.recommended.title).toBe(
      "Kontrolní seznam před spuštěním",
    );
  });
  const steps = [
    {
      id: "practice_booking",
      requirement: "recommended",
      applicable: true,
      status: "incomplete",
    },
    {
      id: "payments",
      requirement: "required",
      applicable: false,
      status: "not_applicable",
    },
    {
      id: "location",
      requirement: "required",
      applicable: true,
      status: "incomplete",
    },
    {
      id: "inventory",
      requirement: "recommended",
      applicable: true,
      status: "complete",
    },
  ];
  it("removes non-applicable steps and prioritizes required work", () => {
    const visible = getVisibleSetupSteps({
      steps,
    });
    expect(visible.map((step) => step.id)).not.toContain("payments");
    expect(prioritizeSetupSteps(visible).map((step) => step.id)).toEqual([
      "location",
      "inventory",
      "practice_booking",
    ]);
  });
  it("uses only required applicable steps for fallback progress", () => {
    expect(
      getRequiredSetupProgress({
        steps,
        progress: {},
      }),
    ).toEqual({
      completed: 0,
      total: 1,
      percentage: 0,
    });
  });
  it("prefers server-provided required progress", () => {
    expect(
      getRequiredSetupProgress({
        steps,
        progress: {
          required: {
            completed: 2,
            total: 3,
            percentage: 67,
          },
        },
      }),
    ).toEqual({
      completed: 2,
      total: 3,
      percentage: 67,
    });
  });
  it("keeps payment readiness separate from launch checklist progress", () => {
    const setup = {
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      progress: {
        payment: {
          completed: 2,
          total: 2,
          percentage: 100,
        },
        launch: {
          completed: 1,
          total: 4,
          percentage: 25,
        },
        required: {
          completed: 2,
          total: 2,
          percentage: 100,
        },
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: false,
        publicSite: {
          applicable: true,
          published: false,
        },
        testBooking: {
          applicable: true,
          complete: false,
        },
      },
    };
    expect(getPaymentSetupProgress(setup)).toEqual({
      completed: 2,
      total: 2,
      percentage: 100,
    });
    expect(getLaunchSetupProgress(setup)).toEqual({
      completed: 1,
      total: 4,
      percentage: 25,
    });
    expect(isPaymentSetupReady(setup)).toBe(true);
    expect(isLaunchReadyToPublish(setup)).toBe(false);
    expect(isLaunchJourneyComplete(setup)).toBe(false);
    expect(getOverviewSetupPresentation(setup)).toBe("guided");
  });
  it("compacts Overview guidance after the first setup outcomes", () => {
    const setup = {
      progress: {
        launch: {
          completed: 2,
          total: 7,
          percentage: 29,
        },
      },
      launchReview: {
        launchComplete: false,
        testBooking: {
          applicable: true,
          complete: false,
        },
      },
    };
    expect(isLaunchJourneyComplete(setup)).toBe(false);
    expect(getOverviewSetupPresentation(setup)).toBe("compact");
  });
  it("removes Overview guidance after the launch journey is complete", () => {
    const setup = {
      progress: {
        launch: {
          completed: 7,
          total: 7,
          percentage: 100,
        },
      },
      launchReview: {
        launchComplete: true,
        testBooking: {
          applicable: true,
          complete: true,
        },
      },
    };
    expect(isLaunchJourneyComplete(setup)).toBe(true);
    expect(getOverviewSetupPresentation(setup)).toBe("hidden");
  });
  it("does not call payments ready until charges and payouts are both enabled", () => {
    const paymentReadiness = {
      applicable: true,
      ready: true,
      chargesEnabled: true,
      payoutsEnabled: false,
      requirementsClear: true,
    };
    expect(
      isPaymentSetupReady({
        paymentReadiness,
      }),
    ).toBe(false);
    expect(
      isPaymentSetupReady({
        paymentReadiness: {
          ...paymentReadiness,
          payoutsEnabled: true,
        },
      }),
    ).toBe(true);
  });
  it("maps launch readiness from explicit customer-facing signals", () => {
    const setup = {
      publication: {
        status: "live",
        publishedAt: "2026-08-12T09:00:00.000Z",
      },
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      launchReview: {
        publicSite: {
          applicable: true,
          published: true,
          publishedAt: "2026-08-12T09:00:00.000Z",
        },
        testBooking: {
          applicable: true,
          complete: true,
        },
      },
      practice: {
        completedAt: "2026-08-12T09:15:00.000Z",
        retestRecommended: false,
      },
      steps: [
        {
          id: "bookable_offer",
          applicable: true,
          status: "complete",
        },
        {
          id: "payments",
          applicable: true,
          status: "complete",
          checks: [],
        },
        {
          id: "communications",
          applicable: true,
          status: "incomplete",
          checks: [
            {
              id: "sender_verified",
              complete: true,
            },
          ],
        },
      ],
    };
    expect(
      Object.fromEntries(
        getLaunchReadinessItems(setup).map((item) => [item.id, item.status]),
      ),
    ).toEqual({
      publicSite: "ready",
      bookings: "ready",
      payments: "ready",
      emails: "ready",
      customerJourney: "ready",
    });
  });
  it("uses current manual evidence for readiness and navigation while preserving stale simulation history", () => {
    const setup = {
      publication: {
        status: "live",
      },
      progress: {
        launch: {
          completed: 1,
          total: 1,
          percentage: 100,
        },
      },
      launchReview: {
        launchComplete: true,
        required: {
          complete: true,
        },
        publicSite: {
          applicable: true,
          published: true,
        },
        testBooking: {
          applicable: true,
          complete: true,
          retestRecommended: false,
          completedAt: "2026-11-03T12:00:00.000Z",
          completionSource: "manual",
        },
      },
      practice: {
        completedAt: "2026-08-12T09:15:00.000Z",
        retestRecommended: true,
        manualConfirmation: {
          confirmedAt: "2026-11-03T12:00:00.000Z",
          current: true,
        },
      },
      steps: [
        {
          id: "bookable_offer",
          applicable: true,
          status: "complete",
        },
      ],
    };
    const journey = () =>
      getLaunchReadinessItems(setup).find(({ id }) => id === "customerJourney");
    expect(journey()).toMatchObject({
      status: "ready",
      descriptionVariant: "manual",
      completedAt: "2026-11-03T12:00:00.000Z",
      retestRecommended: false,
    });
    expect(getLaunchCenterNavigationStatus(setup)).toMatchObject({
      status: "live",
      issueCount: 0,
    });
    setup.launchReview.testBooking = {
      ...setup.launchReview.testBooking,
      complete: false,
      retestRecommended: true,
      completedAt: null,
      completionSource: null,
    };
    setup.practice.manualConfirmation.current = false;
    expect(journey()).toMatchObject({
      status: "action_required",
      completedAt: null,
      retestRecommended: true,
    });
    expect(journey().descriptionVariant).not.toBe("manual");
    expect(getLaunchCenterNavigationStatus(setup)).toMatchObject({
      status: "attention",
      issueCount: 1,
    });
    setup.practice.manualConfirmation = null;
    setup.launchReview.testBooking = {
      ...setup.launchReview.testBooking,
      complete: true,
      retestRecommended: false,
      completedAt: "2026-11-03T13:00:00.000Z",
      completionSource: "practice",
    };
    expect(journey()).toMatchObject({
      status: "ready",
      completedAt: "2026-11-03T13:00:00.000Z",
    });
    expect(journey().descriptionVariant).not.toBe("manual");
  });
  it("marks submitted Stripe review as pending and stale practice as action required", () => {
    const setup = {
      publication: {
        status: "live",
      },
      paymentReadiness: {
        applicable: true,
        ready: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsClear: true,
      },
      launchReview: {
        publicSite: {
          applicable: true,
          published: true,
        },
        testBooking: {
          applicable: true,
          complete: true,
        },
      },
      practice: {
        completedAt: "2026-08-12T09:15:00.000Z",
        retestRecommended: true,
      },
      steps: [
        {
          id: "payments",
          applicable: true,
          status: "incomplete",
          reasonCode: "stripe_verification_pending",
          checks: [
            {
              id: "details_submitted",
              complete: true,
            },
            {
              id: "requirements_clear",
              complete: true,
            },
          ],
        },
        {
          id: "communications",
          applicable: true,
          status: "incomplete",
          checks: [
            {
              id: "sender_verified",
              complete: false,
            },
          ],
        },
      ],
    };
    const readiness = Object.fromEntries(
      getLaunchReadinessItems(setup).map((item) => [item.id, item]),
    );
    expect(readiness.payments.status).toBe("pending");
    expect(readiness.customerJourney).toMatchObject({
      status: "action_required",
      retestRecommended: true,
    });
    expect(readiness.bookings.status).toBe("not_needed");
    expect(readiness.emails).toMatchObject({
      status: "action_required",
      descriptionVariant: "sender_required",
    });
  });
  it("keeps test booking pending until its launch prerequisites are complete", () => {
    const readiness = getLaunchReadinessItems({
      publication: {
        status: "draft",
      },
      launchReview: {
        required: {
          complete: true,
        },
        publicSite: {
          applicable: true,
          published: false,
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: false,
        },
      },
      steps: [
        {
          id: "bookable_offer",
          applicable: true,
          status: "complete",
        },
      ],
    }).find((item) => item.id === "customerJourney");
    expect(readiness).toMatchObject({
      status: "pending",
      descriptionVariant: "waiting",
      retestRecommended: false,
    });
  });
  it("exposes recommended launch prerequisites as actionable test-booking blockers", () => {
    const communicationsStep = {
      id: "communications",
      applicable: true,
      requirement: "recommended",
      status: "incomplete",
    };
    const setup = {
      publication: {
        status: "live",
      },
      practice: {
        retestRecommended: true,
      },
      launchReview: {
        required: {
          complete: false,
          incompleteStepIds: [
            "communications",
            "communications",
            "studio",
            "membership",
            "unknown_step",
            "practice_booking",
          ],
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: false,
        },
      },
      steps: [
        communicationsStep,
        {
          id: "studio",
          applicable: true,
          status: "complete",
        },
        {
          id: "membership",
          applicable: false,
          status: "not_applicable",
        },
        {
          id: "unknown_step",
          applicable: true,
          status: "incomplete",
        },
        {
          id: "practice_booking",
          applicable: true,
          status: "blocked",
        },
      ],
    };
    expect(getPracticeBookingBlockingSteps(setup)).toEqual([
      communicationsStep,
    ]);
    expect(
      getLaunchReadinessItems(setup).find(
        (item) => item.id === "customerJourney",
      ),
    ).toMatchObject({
      status: "action_required",
      descriptionVariant: "blocked",
    });
    expect(
      getPracticeBookingBlockingSteps({
        ...setup,
        launchReview: {
          ...setup.launchReview,
          required: {
            ...setup.launchReview.required,
            complete: true,
          },
        },
      }),
    ).toEqual([]);
  });
  it("uses the managed sender as the only email-readiness check", () => {
    const getEmailReadiness = (checks) =>
      getLaunchReadinessItems({
        launchReview: {
          publicSite: {
            applicable: true,
            published: true,
          },
          testBooking: {
            applicable: true,
            complete: true,
          },
        },
        steps: [
          {
            id: "bookable_offer",
            applicable: true,
            status: "complete",
          },
          {
            id: "communications",
            applicable: true,
            status: "incomplete",
            checks,
          },
        ],
      }).find((item) => item.id === "emails");
    expect(
      getEmailReadiness([
        {
          id: "sender_verified",
          complete: true,
        },
      ]),
    ).toMatchObject({
      status: "ready",
    });
    expect(
      getEmailReadiness([
        {
          id: "sender_verified",
          complete: false,
        },
      ]),
    ).toMatchObject({
      status: "action_required",
      descriptionVariant: "sender_required",
    });
    expect(
      getEmailReadiness([
        {
          id: "booking_confirmation",
          complete: false,
        },
        {
          id: "sender_verified",
          complete: true,
        },
      ]),
    ).toMatchObject({
      status: "ready",
    });
  });
  it("keeps sidebar navigation on checklist progress before publication", () => {
    expect(
      getLaunchCenterNavigationStatus({
        progress: {
          launch: {
            completed: 5,
            total: 7,
            percentage: 71,
          },
        },
        publication: {
          status: "draft",
        },
        launchReview: {
          launchComplete: false,
          publicSite: {
            applicable: true,
            published: false,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
      }),
    ).toEqual({
      status: "progress",
      completed: 5,
      total: 7,
      issueCount: 0,
    });
  });
  it("marks a healthy published workspace as live in sidebar navigation", () => {
    expect(
      getLaunchCenterNavigationStatus({
        health: "healthy",
        progress: {
          launch: {
            completed: 7,
            total: 7,
            percentage: 100,
          },
        },
        publication: {
          status: "live",
        },
        launchReview: {
          launchComplete: true,
          publicSite: {
            applicable: true,
            published: true,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
      }),
    ).toEqual({
      status: "live",
      completed: 7,
      total: 7,
      issueCount: 0,
    });
  });
  it("shows live launch issues instead of a contradictory completed state", () => {
    const status = getLaunchCenterNavigationStatus({
      health: "healthy",
      progress: {
        launch: {
          completed: 7,
          total: 7,
          percentage: 100,
        },
      },
      publication: {
        status: "live",
      },
      launchReview: {
        launchComplete: false,
        publicSite: {
          applicable: true,
          published: true,
        },
        testBooking: {
          applicable: true,
          complete: true,
        },
      },
      practice: {
        retestRecommended: false,
      },
      steps: [
        {
          id: "bookable_offer",
          applicable: true,
          status: "complete",
        },
        {
          id: "communications",
          applicable: true,
          status: "incomplete",
          checks: [
            {
              id: "sender_verified",
              complete: false,
            },
          ],
        },
      ],
    });
    expect(status).toEqual({
      status: "attention",
      completed: 7,
      total: 7,
      issueCount: 1,
    });
  });
  it("uses a safe fallback count for health diagnostics outside readiness cards", () => {
    expect(
      getLaunchCenterNavigationStatus({
        health: "needs_attention",
        progress: {
          launch: {
            completed: 7,
            total: 7,
            percentage: 100,
          },
        },
        publication: {
          status: "live",
        },
        launchReview: {
          launchComplete: true,
          publicSite: {
            applicable: true,
            published: true,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
      }),
    ).toMatchObject({
      status: "attention",
      issueCount: 1,
    });
  });
  it("uses Ready for complete operational setups without a public site", () => {
    expect(
      getLaunchCenterNavigationStatus({
        health: "healthy",
        progress: {
          launch: {
            completed: 4,
            total: 4,
            percentage: 100,
          },
        },
        launchReview: {
          launchComplete: true,
          publicSite: {
            applicable: false,
            published: false,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
      }),
    ).toEqual({
      status: "operational",
      completed: 4,
      total: 4,
      issueCount: 0,
    });
  });
  it("keeps operational regressions visible after setup completion", () => {
    expect(
      getLaunchCenterNavigationStatus({
        health: "needs_attention",
        progress: {
          launch: {
            completed: 4,
            total: 4,
            percentage: 100,
          },
        },
        launchReview: {
          launchComplete: true,
          publicSite: {
            applicable: false,
            published: false,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
      }),
    ).toMatchObject({
      status: "attention",
      issueCount: 1,
    });
  });
  it("does not require a managed sender for a non-booking workflow", () => {
    const readiness = Object.fromEntries(
      getLaunchReadinessItems({
        launchReview: {
          publicSite: {
            applicable: false,
            published: false,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
        steps: [
          {
            id: "communications",
            applicable: true,
            status: "incomplete",
            checks: [
              {
                id: "sender_verified",
                complete: false,
              },
            ],
          },
        ],
      }).map((item) => [item.id, item.status]),
    );
    expect(readiness.bookings).toBe("not_needed");
    expect(readiness.emails).toBe("not_needed");
    expect(readiness.customerJourney).toBe("not_needed");
  });
  it("respects an explicit unpublished review over stale legacy publication state", () => {
    const readiness = Object.fromEntries(
      getLaunchReadinessItems({
        publication: {
          status: "live",
        },
        launchReview: {
          publicSite: {
            applicable: true,
            published: false,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
        steps: [],
      }).map((item) => [item.id, item.status]),
    );
    expect(readiness.publicSite).toBe("action_required");
  });
  it("never treats legacy ready or 100% required progress as launch complete", () => {
    const setup = {
      ready: true,
      progress: {
        percentage: 100,
        required: {
          completed: 2,
          total: 2,
          percentage: 100,
        },
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: false,
        publicSite: {
          applicable: true,
          published: false,
        },
        testBooking: {
          applicable: true,
          complete: false,
        },
      },
    };
    expect(isLaunchJourneyComplete(setup)).toBe(false);
    expect(getOverviewSetupPresentation(setup)).toBe("guided");
  });
  it("keeps website review, publication, and customer testing in final order", () => {
    const setup = {
      steps: [
        scenarioStep({
          id: "practice_booking",
          requirement: "recommended",
        }),
        scenarioStep({
          id: "publish",
          requirement: "recommended",
        }),
        scenarioStep({
          id: "bookable_offer",
          requirement: "recommended",
        }),
        scenarioStep({
          id: "public_site",
          requirement: "recommended",
        }),
      ],
    };
    expect(getVisibleSetupSteps(setup).map((step) => step.id)).toEqual([
      "bookable_offer",
      "public_site",
      "publish",
      "practice_booking",
    ]);
    expect(getNextBestSetupStep(setup)?.id).toBe("bookable_offer");
  });
  it("prefers the explicit launch checklist group over compatibility groups", () => {
    const setup = {
      steps: [
        scenarioStep({
          id: "practice_booking",
          requirement: "recommended",
        }),
        scenarioStep({
          id: "inventory",
          requirement: "recommended",
        }),
        scenarioStep({
          id: "publish",
          requirement: "recommended",
        }),
        scenarioStep({
          id: "public_site",
          requirement: "recommended",
        }),
      ],
      stepGroups: {
        launchChecklist: ["public_site", "publish", "practice_booking"],
        recommended: ["inventory"],
        availableLater: ["inventory"],
      },
    };
    const sections = getLaunchCenterSections(setup);
    expect(sections.recommended.map((step) => step.id)).toEqual([
      "public_site",
      "publish",
      "practice_booking",
    ]);
    expect(sections.availableLater.map((step) => step.id)).toEqual([
      "inventory",
    ]);
  });
  it("includes payment prerequisites in fallback launch progress", () => {
    const setup = {
      steps: [
        scenarioStep({
          id: "payments",
          requirement: "required",
          status: "incomplete",
        }),
        scenarioStep({
          id: "public_site",
          requirement: "recommended",
          status: "complete",
        }),
        scenarioStep({
          id: "publish",
          requirement: "recommended",
          status: "complete",
        }),
      ],
      stepGroups: {
        required: ["payments"],
        launchChecklist: ["public_site", "publish"],
      },
    };
    expect(getLaunchSetupProgress(setup)).toEqual({
      completed: 2,
      total: 3,
      percentage: 67,
    });
  });
  it("separates required outcomes from the recommended improvement list", () => {
    const groups = getSetupStepGroups({
      steps,
    });
    expect(groups.required.map((step) => step.id)).toEqual(["location"]);
    expect(groups.recommended.map((step) => step.id)).toEqual([
      "inventory",
      "practice_booking",
    ]);
  });
  it("chooses exactly one actionable next best step by requirement priority", () => {
    const setup = {
      steps: [
        {
          id: "payments",
          requirement: "required",
          applicable: true,
          status: "incomplete",
          actions: [
            {
              key: "connect_payments",
              href: "/payments",
              enabled: true,
            },
          ],
        },
        {
          id: "location",
          requirement: "recommended",
          applicable: true,
          status: "incomplete",
          actions: [
            {
              key: "configure_firing",
              href: "/firings",
              enabled: true,
            },
          ],
        },
      ],
    };
    expect(getNextBestSetupStep(setup)?.id).toBe("payments");
    expect(getSetupStepEstimatedMinutes(getNextBestSetupStep(setup))).toBe(5);
  });
  it("does not skip a blocked required outcome for an actionable recommendation", () => {
    const setup = {
      steps: [
        {
          id: "bookable_offer",
          requirement: "required",
          status: "blocked",
          actions: [
            {
              key: "create_offer",
              enabled: false,
              href: "/offers",
            },
          ],
        },
        {
          id: "communications",
          requirement: "recommended",
          status: "incomplete",
          actions: [
            {
              key: "configure_communications",
              enabled: true,
              href: "/communications",
            },
          ],
        },
      ],
    };
    expect(getNextBestSetupStep(setup)?.id).toBe("bookable_offer");
  });
  it("does not skip the first blocked outcome within the same requirement tier", () => {
    const setup = {
      steps: [
        {
          id: "location",
          requirement: "required",
          status: "blocked",
          actions: [
            {
              key: "review_location",
              enabled: false,
            },
          ],
        },
        {
          id: "bookable_offer",
          requirement: "required",
          status: "incomplete",
          actions: [
            {
              key: "create_offer",
              enabled: true,
              href: "/app/products?action=create",
            },
          ],
        },
      ],
    };
    expect(getNextBestSetupStep(setup)?.id).toBe("location");
  });
  it("adds durable Launch Center context to real application actions", () => {
    const step = {
      id: "membership",
    };
    expect(
      getSetupActionHref(step, {
        href: "/app/memberships?action=create",
        enabled: true,
      }),
    ).toBe("/app/memberships?action=create&setupStep=membership");
    expect(
      getSetupActionHref(step, {
        href: "/app/memberships?setupStep=old#plans",
        enabled: true,
      }),
    ).toBe("/app/memberships?setupStep=membership#plans");
    expect(
      getSetupActionHref(step, {
        href: "/app/setup?step=membership",
        enabled: true,
      }),
    ).toBe("/app/setup?step=membership");
  });
  it("uses a short compatibility estimate for new server-defined steps", () => {
    expect(
      getSetupStepEstimatedMinutes({
        id: "future_step",
      }),
    ).toBe(2);
  });
  const scenarioStep = ({
    id,
    requirement,
    status = "incomplete",
    applicable = true,
    action,
  }) => ({
    id,
    requirement,
    status,
    applicable,
    checks: [],
    actions: action ? [action] : [],
  });
  const notApplicable = (id, requirement = "recommended") =>
    scenarioStep({
      id,
      requirement,
      status: "not_applicable",
      applicable: false,
    });
  it.each([
    {
      label: "a booking studio",
      setup: {
        steps: [
          scenarioStep({
            id: "studio",
            requirement: "required",
            status: "complete",
          }),
          scenarioStep({
            id: "location",
            requirement: "required",
            status: "complete",
          }),
          scenarioStep({
            id: "bookable_offer",
            requirement: "required",
            action: {
              key: "create_offer",
              enabled: true,
              href: "/app/products?action=create&setupStep=bookable_offer",
            },
          }),
          scenarioStep({
            id: "payments",
            requirement: "recommended",
            action: {
              key: "connect_payments",
              enabled: true,
              href: "/app/settings/payments?setupStep=payments",
            },
          }),
          scenarioStep({
            id: "practice_booking",
            requirement: "required",
            status: "blocked",
            action: {
              key: "practice_booking",
              enabled: false,
              href: "/app/setup?step=practice_booking",
            },
          }),
          scenarioStep({
            id: "communications",
            requirement: "recommended",
            action: {
              key: "configure_communications",
              enabled: true,
              href: "/app/communications?section=setup&setupStep=communications",
            },
          }),
          scenarioStep({
            id: "publish",
            requirement: "recommended",
            status: "blocked",
            action: {
              key: "publish_studio",
              enabled: false,
              href: "/app/setup?step=publish",
            },
          }),
          notApplicable("firing"),
          notApplicable("kilns"),
          notApplicable("piece_pricing"),
          notApplicable("membership"),
        ],
      },
      visible: [
        "studio",
        "payments",
        "location",
        "bookable_offer",
        "communications",
        "publish",
        "practice_booking",
      ],
      required: ["studio", "location", "bookable_offer", "practice_booking"],
      recommended: ["payments", "communications", "publish"],
      next: {
        id: "bookable_offer",
        action: {
          key: "create_offer",
          href: "/app/products?action=create&setupStep=bookable_offer",
        },
      },
    },
    {
      label: "a membership-only studio",
      setup: {
        steps: [
          scenarioStep({
            id: "studio",
            requirement: "required",
            status: "complete",
          }),
          scenarioStep({
            id: "membership",
            requirement: "required",
            action: {
              key: "create_membership",
              enabled: true,
              href: "/app/memberships?action=create&setupStep=membership",
            },
          }),
          scenarioStep({
            id: "publish",
            requirement: "recommended",
            status: "blocked",
            action: {
              key: "publish_studio",
              enabled: false,
              href: "/app/setup?step=publish",
            },
          }),
          notApplicable("location", "required"),
          notApplicable("bookable_offer", "required"),
          notApplicable("payments"),
          notApplicable("practice_booking", "required"),
          notApplicable("firing"),
          notApplicable("kilns"),
          notApplicable("piece_pricing"),
          notApplicable("communications"),
        ],
      },
      visible: ["studio", "membership", "publish"],
      required: ["studio", "membership"],
      recommended: ["publish"],
      next: {
        id: "membership",
        action: {
          key: "create_membership",
          href: "/app/memberships?action=create&setupStep=membership",
        },
      },
    },
  ])(
    "adapts the outcome groups, Next Best Action, and deep link for $label",
    ({ setup, visible, required, recommended, next }) => {
      const visibleSteps = getVisibleSetupSteps(setup);
      const groups = getSetupStepGroups(setup);
      const nextBest = getNextBestSetupStep(setup);
      expect(visibleSteps.map(({ id }) => id)).toEqual(visible);
      expect(groups.required.map(({ id }) => id)).toEqual(required);
      expect(groups.recommended.map(({ id }) => id)).toEqual(recommended);
      expect(nextBest?.id).toBe(next.id);
      expect(getPrimaryAction(nextBest)).toMatchObject(next.action);
    },
  );
  it("omits firing outcomes from a booking-focused module response", () => {
    const bookingOnly = {
      steps: [
        {
          id: "studio",
          requirement: "required",
          status: "complete",
        },
        {
          id: "location",
          requirement: "required",
          status: "complete",
        },
        {
          id: "bookable_offer",
          requirement: "required",
          status: "incomplete",
        },
        {
          id: "payments",
          requirement: "recommended",
          status: "incomplete",
        },
        {
          id: "location",
          requirement: "recommended",
          applicable: false,
          status: "not_applicable",
        },
        {
          id: "kilns",
          requirement: "recommended",
          applicable: false,
          status: "not_applicable",
        },
      ],
    };
    expect(getVisibleSetupSteps(bookingOnly).map((step) => step.id)).toEqual([
      "studio",
      "payments",
      "location",
      "bookable_offer",
    ]);
    expect(getNextBestSetupStep(bookingOnly)?.id).toBe("bookable_offer");
  });
  it("adapts memberships and communication setup without adding launch questions", () => {
    const adaptiveSetup = {
      steps: [
        {
          id: "studio",
          requirement: "required",
          status: "complete",
        },
        {
          id: "communications",
          requirement: "required",
          status: "incomplete",
          actions: [
            {
              key: "configure_communications",
              enabled: true,
              href: "/app/communications?section=setup",
            },
          ],
        },
        {
          id: "membership",
          requirement: "recommended",
          status: "incomplete",
          actions: [
            {
              key: "create_membership",
              enabled: true,
              href: "/app/memberships?action=create",
            },
          ],
        },
      ],
    };
    expect(getNextBestSetupStep(adaptiveSetup)?.id).toBe("communications");
    expect(
      getSetupStepGroups(adaptiveSetup).recommended.map(({ id }) => id),
    ).toEqual(["membership"]);
  });
  it.each(outcomeCopyByLocale)(
    "keeps every Launch Center heading outcome-focused in $label",
    ({ catalog, workflowIntent, steps: expectedSteps, recommendations }) => {
      const setupCenter = catalog.SetupCenter;
      expect(setupCenter.workflowIntent.title).toBe(workflowIntent);
      expect(
        Object.fromEntries(
          Object.entries(setupCenter.steps).map(([id, step]) => [
            id,
            step.outcome,
          ]),
        ),
      ).toEqual(expectedSteps);
      expect(setupCenter.learning.items).toMatchObject(recommendations);
      for (const step of Object.values(setupCenter.steps)) {
        expect(step).not.toHaveProperty("title");
      }
    },
  );
});
