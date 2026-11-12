import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  bookingLaunchSnapshot,
  mockLaunchCenter,
} from "../helpers/launch-center.js";
import {
  VISUAL_FIXED_TIME,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
  visualWorkspaceAccess,
} from "./admin-fixtures.js";

const enabledProjects = new Set(["desktop-1280", "mobile-320", "mobile-390"]);
const stepTitles = [
  "Your booking calendar",
  "Start a booking",
  "Choose the right context",
  "Review the result",
];

const mobileGuideCases = [
  {
    id: "first_booking",
    path: "/en/app/calendar?guide=first_booking",
    steps: [
      ["calendar", ['[data-calendar-shell="true"]']],
      [
        "create_action",
        ['[data-contextual-guide-target="first-booking-create"]'],
      ],
      ["booking_details", ['[data-calendar-command-bar="true"]']],
      ["confirmation", ['[data-calendar-viewport="true"]']],
    ],
  },
  {
    id: "first_offer",
    path: "/en/app/products?category=openStudio&guide=first_offer",
    steps: [
      [
        "offer_types",
        [
          "#product-catalog-sections-tab-openStudio",
          "#product-catalog-sections-tab-classes",
        ],
      ],
      ["create_offer", ['[data-contextual-guide-target="first-offer-create"]']],
      [
        "price_capacity",
        [
          '[data-contextual-guide-target="first-offer-catalog"]',
          "#product-catalog-sections-panel-openStudio",
        ],
      ],
      [
        "publish",
        [
          '[data-contextual-guide-target="first-offer-catalog"]',
          "#product-catalog-sections-panel-openStudio",
        ],
      ],
    ],
  },
  {
    id: "website_builder",
    path: "/en/app/settings/public-site?guide=website_builder",
    steps: [
      ["editor_sections", ["#public-site-editor-pane"]],
      [
        "live_preview",
        ['[data-contextual-guide-target="website-preview-toggle"]'],
      ],
      ["branding", ["#public-site-editor-sections-tab-branding"]],
      ["publish", ['[data-contextual-guide-target="website-preview-toggle"]']],
    ],
  },
  {
    id: "test_customer_journey",
    path: "/en/app/settings/public-site?guide=test_customer_journey",
    steps: [
      [
        "public_site",
        ['[data-contextual-guide-target="website-preview-toggle"]'],
      ],
      [
        "test_booking",
        [
          '[data-contextual-guide-target="customer-journey-open-site"]',
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
      ],
      [
        "confirmation_email",
        [
          '[data-contextual-guide-target="customer-journey-open-site"]',
          '[data-contextual-guide-target="website-preview-toggle"]',
        ],
      ],
      [
        "customer_portal",
        ['[data-contextual-guide-target="website-preview-toggle"]'],
      ],
    ],
  },
  {
    id: "studio_flow",
    path: "/en/app/firings?guide=studio_flow",
    steps: [
      ["register_piece", ["#studio-flow-sections-tab-items"]],
      ["bisque_firing", ["#studio-flow-sections-tab-operations"]],
      ["glazing", ["#studio-flow-sections-tab-items"]],
      ["final_firing", ["#studio-flow-sections-tab-operations"]],
      ["customer_notification", ["#studio-flow-sections-tab-operations"]],
    ],
  },
  {
    id: "memberships",
    path: "/en/app/products?category=memberships&guide=memberships",
    steps: [
      ["plans", ["#membership-sections-tab-plans"]],
      ["customers", ["#membership-sections-tab-customers"]],
      [
        "credits",
        [
          "#membership-sections-tab-customers",
          "#product-catalog-sections-panel-memberships",
        ],
      ],
      ["vouchers", ["#product-catalog-sections-tab-vouchers"]],
    ],
  },
  {
    id: "payments_setup",
    path: "/en/app/settings/payments?guide=payments_setup",
    steps: [
      [
        "connection_status",
        ['[data-contextual-guide-target="payments-status"]'],
      ],
      [
        "stripe_onboarding",
        [
          '[data-contextual-guide-target="payments-onboarding"]',
          '[data-contextual-guide-target="payments-checklist"]',
        ],
      ],
      [
        "payment_capabilities",
        ['[data-contextual-guide-target="payments-capabilities"]'],
      ],
      [
        "verify_payment",
        ['[data-contextual-guide-target="payments-checklist"]'],
      ],
    ],
  },
  {
    id: "data_import",
    path: "/en/app/settings/migration?guide=data_import",
    steps: [
      [
        "choose_importer",
        ['[data-contextual-guide-target="data-import-types"]'],
      ],
      [
        "template_upload",
        ['[data-contextual-guide-target="data-import-wizard"]'],
      ],
      [
        "validation",
        [
          '[data-contextual-guide-target="data-import-progress"]',
          '[data-contextual-guide-target="data-import-wizard"]',
        ],
      ],
      [
        "history_rollback",
        ['[data-contextual-guide-target="data-import-history"]'],
      ],
    ],
  },
  {
    id: "customer_communications",
    path: "/en/app/communications?section=setup&guide=customer_communications",
    steps: [
      ["templates", ["#email-workspace-sections-tab-templates"]],
      ["reminders", ["#email-workspace-sections-tab-automations"]],
      [
        "test_email",
        ["[data-email-setup-view]", "#email-workspace-sections-tab-setup"],
      ],
      ["delivery_history", ["#email-workspace-sections-tab-history"]],
    ],
  },
  {
    id: "ai_reports",
    path: "/en/app/operations?section=statistics&guide=ai_reports",
    steps: [
      ["assistant", ['[data-product-tour-target="ai-assistant"]']],
      ["advisor", ["#report-sections-tab-overview"]],
      ["report_filters", ['[data-contextual-guide-target="report-filters"]']],
      [
        "report_insights",
        [
          '[data-contextual-guide-target="report-content"]',
          "#report-sections-panel-overview",
        ],
      ],
    ],
  },
  {
    id: "team_management",
    path: "/en/app/settings/team?guide=team_management",
    steps: [
      ["members", ['[data-contextual-guide-target="team-members"]']],
      ["invite", ['[data-contextual-guide-target="team-invite"]']],
      [
        "roles",
        [
          '[data-contextual-guide-target="team-list"]',
          '[data-contextual-guide-target="team-members"]',
        ],
      ],
      [
        "location_access",
        [
          '[data-contextual-guide-target="team-list"]',
          '[data-contextual-guide-target="team-members"]',
        ],
      ],
    ],
  },
];

const expectMobilePanelToFit = async (page, panel) => {
  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(panelBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.y).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const controls = panel.locator("button:visible, a:visible");
  for (let index = 0; index < (await controls.count()); index += 1) {
    const box = await controls.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(43);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }
};

const expectSpotlightToMatchTarget = async (page, selectors) => {
  await expect
    .poll(() =>
      page.evaluate((candidateSelectors) => {
        const target = candidateSelectors
          .flatMap((selector) =>
            Array.from(document.querySelectorAll(selector)),
          )
          .find((element) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden"
            );
          });
        const spotlight = document.querySelector(
          "[data-contextual-guide-spotlight]",
        );
        if (!target || !spotlight) return { aligned: false };

        const targetRect = target.getBoundingClientRect();
        const spotlightRect = spotlight.getBoundingClientRect();
        const viewport = window.visualViewport;
        const offsetLeft = viewport?.offsetLeft || 0;
        const offsetTop = viewport?.offsetTop || 0;
        const width = viewport?.width || window.innerWidth;
        const height = viewport?.height || window.innerHeight;
        const expected = {
          left: Math.max(offsetLeft + 8, targetRect.left - 8),
          top: Math.max(offsetTop + 8, targetRect.top - 8),
          right: Math.min(offsetLeft + width - 8, targetRect.right + 8),
          bottom: Math.min(offsetTop + height - 8, targetRect.bottom + 8),
        };
        const differences = {
          left: Math.abs(spotlightRect.left - expected.left),
          top: Math.abs(spotlightRect.top - expected.top),
          right: Math.abs(spotlightRect.right - expected.right),
          bottom: Math.abs(spotlightRect.bottom - expected.bottom),
        };

        return {
          aligned: Object.values(differences).every((value) => value <= 2),
          differences,
        };
      }, selectors),
    )
    .toMatchObject({ aligned: true });
};

test("contextual guide prompts, persists and replays accessibly", async ({
  page,
}, testInfo) => {
  test.skip(
    !enabledProjects.has(testInfo.project.name),
    "Covered at one desktop and one mobile viewport.",
  );

  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const { first_booking: _firstBooking, ...acknowledgedGuides } =
    visualWorkspaceAccess.preferences.contextualGuides;
  const pendingWorkspaceAccess = {
    ...visualWorkspaceAccess,
    preferences: {
      ...visualWorkspaceAccess.preferences,
      contextualGuides: acknowledgedGuides,
    },
  };
  const fixture = await installAdminApiMocks(page, {
    workspaceAccess: pendingWorkspaceAccess,
  });
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app/calendar`, {
    waitUntil: "domcontentloaded",
  });

  const prompt = page.locator('[data-contextual-guide-prompt="first_booking"]');
  await expect(prompt).toBeVisible();
  const promptAccessibility = await new AxeBuilder({ page })
    .include('[data-contextual-guide-prompt="first_booking"]')
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    promptAccessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);

  await prompt.getByRole("button", { name: "Start guide" }).click();

  const dialog = page.locator('[data-contextual-guide="first_booking"]');
  const panel = page.locator("[data-contextual-guide-panel]");
  await expect(dialog).toHaveAttribute(
    "data-contextual-guide-step",
    "calendar",
  );
  await expect(panel.getByText("1 of 4", { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      ),
    )
    .toBe(true);

  await expectMobilePanelToFit(page, panel);

  const accessibility = await new AxeBuilder({ page })
    .include('[data-contextual-guide="first_booking"]')
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);

  for (let index = 0; index < stepTitles.length; index += 1) {
    await expect(
      panel.getByRole("heading", { name: stepTitles[index] }),
    ).toBeVisible();
    await expect(
      panel.getByText(`${index + 1} of 4`, { exact: true }),
    ).toBeVisible();
    await expectMobilePanelToFit(page, panel);
    const spotlight = page.locator("[data-contextual-guide-spotlight]");
    await expect(spotlight).toBeVisible();
    const spotlightBox = await spotlight.boundingBox();
    expect(spotlightBox.width).toBeGreaterThan(0);
    expect(spotlightBox.height).toBeGreaterThan(0);
    await panel.getByRole("button", { name: "Next" }).click();
  }

  await expect(dialog).toHaveAttribute(
    "data-contextual-guide-step",
    "complete",
  );
  await expect(
    panel.getByRole("heading", { name: "You’re ready" }),
  ).toBeVisible();
  await expect
    .poll(
      () =>
        fixture.preferencePatches.filter(
          ({ contextualGuides }) =>
            contextualGuides?.first_booking?.status === "completed",
        ).length,
    )
    .toBe(1);

  let finalSessionId = null;
  const expectedEvents = [
    "contextual_guide_started",
    "contextual_guide_first_booking_calendar_viewed",
    "contextual_guide_first_booking_create_action_viewed",
    "contextual_guide_first_booking_booking_details_viewed",
    "contextual_guide_first_booking_confirmation_viewed",
    "contextual_guide_completed",
  ];
  await expect
    .poll(() => {
      finalSessionId = [...fixture.setupEventBodies]
        .reverse()
        .find(({ event }) => event === "contextual_guide_started")?.sessionId;
      return finalSessionId;
    })
    .not.toBeNull();
  await expect
    .poll(() =>
      fixture.setupEventBodies
        .filter(({ sessionId }) => sessionId === finalSessionId)
        .map(({ event }) => event),
    )
    .toEqual(expect.arrayContaining(expectedEvents));

  await panel.getByRole("button", { name: "Finish guide" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Help" }).click();
  await page.getByRole("link", { name: /Create your first booking/ }).click();
  await expect(dialog).toHaveAttribute(
    "data-contextual-guide-step",
    "calendar",
  );
  await expect(page).toHaveURL(/\/en\/app\/calendar$/);
  await expect.poll(() => [...fixture.unexpectedRequests]).toEqual([]);
});

test("outcome guides hand off to safe Launch Center flows", async ({
  page,
}, testInfo) => {
  test.skip(
    !enabledProjects.has(testInfo.project.name),
    "Covered at one desktop and one mobile viewport.",
  );

  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const fixture = await installAdminApiMocks(page);
  const launch = await mockLaunchCenter(page, bookingLaunchSnapshot());
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);

  const cases = [
    {
      id: "first_offer",
      firstStep: "offer_types",
      path: "/en/app/products?guide=first_offer",
      steps: [
        "Choose what customers can book",
        "Start from the catalog",
        "Set the booking essentials",
        "Review before it goes live",
      ],
      cta: "Open Launch Center",
      destination: /\/en\/app\/setup\?step=bookable_offer$/,
      destinationHeading: "Can customers book one of your offers?",
      setup: bookingLaunchSnapshot({
        offerComplete: false,
        published: false,
      }),
    },
    {
      id: "test_customer_journey",
      firstStep: "public_site",
      path: "/en/app/settings/public-site?guide=test_customer_journey",
      steps: [
        "Start from the customer view",
        "Try a safe booking",
        "Preview the confirmation",
        "Preview customer access",
      ],
      cta: "Open Practice Mode",
      destination: /\/en\/app\/setup\?step=practice_booking$/,
      destinationHeading: "Have you tested the customer booking journey?",
      setup: bookingLaunchSnapshot({ practiceComplete: false }),
    },
  ];

  for (const guideCase of cases) {
    // A completed step is deliberately removed from the Launch Center URL.
    // Keep the destination unfinished so this checks a stable handoff, not
    // the transient URL before completed-step cleanup runs.
    launch.setSnapshot(guideCase.setup);
    await page.goto(`${VISUAL_TENANT_ORIGIN}${guideCase.path}`, {
      waitUntil: "domcontentloaded",
    });

    const dialog = page.locator(`[data-contextual-guide="${guideCase.id}"]`);
    const panel = dialog.locator("[data-contextual-guide-panel]");
    await expect(dialog).toHaveAttribute(
      "data-contextual-guide-step",
      guideCase.firstStep,
    );
    await expect(panel).toBeVisible();

    const accessibility = await new AxeBuilder({ page })
      .include(`[data-contextual-guide="${guideCase.id}"]`)
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      accessibility.violations.filter(({ impact }) =>
        ["serious", "critical"].includes(impact),
      ),
    ).toEqual([]);

    for (let index = 0; index < guideCase.steps.length; index += 1) {
      await expect(
        panel.getByRole("heading", { name: guideCase.steps[index] }),
      ).toBeVisible();
      await expect(
        panel.getByText(`${index + 1} of ${guideCase.steps.length}`, {
          exact: true,
        }),
      ).toBeVisible();
      await expectMobilePanelToFit(page, panel);
      const spotlight = page.locator("[data-contextual-guide-spotlight]");
      await expect(spotlight).toBeVisible();
      const spotlightBox = await spotlight.boundingBox();
      expect(spotlightBox.width).toBeGreaterThan(0);
      expect(spotlightBox.height).toBeGreaterThan(0);
      await panel.getByRole("button", { name: "Next" }).click();
    }

    await expect(dialog).toHaveAttribute(
      "data-contextual-guide-step",
      "complete",
    );
    await panel.getByRole("button", { name: guideCase.cta }).click();
    await expect(page).toHaveURL(guideCase.destination);
    await expect(
      page.locator("#launch-center-step-detail").getByRole("heading", {
        name: guideCase.destinationHeading,
        exact: true,
      }),
    ).toBeVisible();
  }

  await expect.poll(() => [...fixture.unexpectedRequests]).toEqual([]);
});

for (const guideCase of mobileGuideCases) {
  test(`mobile guide matrix: ${guideCase.id}`, async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-320",
      "The complete guide matrix uses the narrowest supported viewport.",
    );

    await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
    const fixture = await installAdminApiMocks(page);
    await page.context().addCookies([
      {
        name: "shario_language",
        value: "EN",
        url: VISUAL_TENANT_ORIGIN,
        sameSite: "Lax",
      },
    ]);

    await page.goto(`${VISUAL_TENANT_ORIGIN}${guideCase.path}`, {
      waitUntil: "domcontentloaded",
    });

    const dialog = page.locator(`[data-contextual-guide="${guideCase.id}"]`);
    const panel = dialog.locator("[data-contextual-guide-panel]");

    for (const [step, selectors] of guideCase.steps) {
      await expect(dialog).toHaveAttribute("data-contextual-guide-step", step);
      await expect(panel).toBeVisible();
      await expectMobilePanelToFit(page, panel);
      await expectSpotlightToMatchTarget(page, selectors);
      await panel.getByRole("button", { name: "Next" }).click();
    }

    await expect(dialog).toHaveAttribute(
      "data-contextual-guide-step",
      "complete",
    );
    await expectMobilePanelToFit(page, panel);
    await expect
      .poll(
        () =>
          fixture.preferencePatches.filter(
            ({ contextualGuides }) =>
              contextualGuides?.[guideCase.id]?.status === "completed",
          ).length,
      )
      .toBe(1);
  });
}
