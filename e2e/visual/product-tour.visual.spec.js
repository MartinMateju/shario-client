import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  VISUAL_FIXED_TIME,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
  visualWorkspaceAccess,
} from "./admin-fixtures.js";

const enabledProjects = new Set(["desktop-1280", "mobile-320", "mobile-390"]);
const stepTitles = [
  "Welcome to your Overview",
  "Set up in Launch Center",
  "Your studio switcher",
  "Everything has a home",
  "Ask the AI Assistant",
  "Settings and customization",
];

const stepTargets = (mobile) => [
  ["[data-studio-briefing-hero]", '[data-product-tour-target="overview"]'],
  mobile
    ? ["[data-mobile-navigation-trigger]"]
    : [
        '[data-product-tour-target="launch-center"]',
        "[data-launch-center-shortcut]",
      ],
  mobile
    ? ["[data-mobile-navigation-trigger]"]
    : [
        '[data-product-tour-target="studio-switcher"]',
        "[data-studio-switcher-slot]",
      ],
  mobile
    ? ["[data-mobile-navigation-trigger]"]
    : [
        '[data-product-tour-target="navigation"]',
        "[data-workspace-sidebar-primary-list]",
      ],
  ['[data-product-tour-target="ai-assistant"]'],
  mobile
    ? ["[data-mobile-navigation-trigger]"]
    : ['[data-product-tour-target="settings"]'],
];

const expectMobilePanelToFit = async (page, panel) => {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  // Visibility can precede the welcome sheet's entrance transition finishing.
  // Re-measure the panel and its controls without changing the viewport bounds.
  await expect(async () => {
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
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
  }).toPass({ timeout: 5_000, intervals: [50, 100, 200] });
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
          "[data-product-tour-spotlight]",
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

test("product tour persists, replays and finishes accessibly", async ({
  page,
}, testInfo) => {
  test.skip(
    !enabledProjects.has(testInfo.project.name),
    "Covered at one desktop and one mobile viewport.",
  );

  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const pendingWorkspaceAccess = {
    ...visualWorkspaceAccess,
    preferences: {
      ...visualWorkspaceAccess.preferences,
      productTour: {
        version: 0,
        status: null,
        lastStep: null,
        updatedAt: null,
      },
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

  await page.goto(`${VISUAL_TENANT_ORIGIN}/en/app`, {
    waitUntil: "domcontentloaded",
  });

  const welcome = page.locator("[data-product-tour-welcome]");
  const welcomePanel = welcome.locator("[data-product-tour-welcome-panel]");
  await expect(
    welcome.getByRole("heading", { name: "First time here?" }),
  ).toBeVisible();
  await expect(
    welcome.getByText("About 60 seconds", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      welcome.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      ),
    )
    .toBe(true);

  const coarsePointer = await page.evaluate(
    () => window.matchMedia("(pointer: coarse)").matches,
  );
  if (!coarsePointer) {
    await expect(
      welcome.getByRole("button", { name: "Start tour" }),
    ).toBeFocused();
  }

  await expectMobilePanelToFit(page, welcomePanel);

  const accessibility = await new AxeBuilder({ page })
    .include("[data-product-tour-welcome]")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);

  await welcome.getByRole("button", { name: "No, thanks" }).click();
  await expect(welcome).toHaveCount(0);
  const dialog = page.locator("[data-product-tour]");
  const panel = page.locator("[data-product-tour-panel]");
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => fixture.preferencePatches.length).toBe(1);
  expect(fixture.preferencePatches[0]).toEqual({
    productTour: {
      lastStep: "overview",
      status: "skipped",
      version: 1,
    },
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: /Martin/ }),
  ).toBeVisible();
  await expect(welcome).toHaveCount(0);
  await expect(dialog).toHaveCount(0);

  const replay = async () => {
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page.getByRole("link", { name: /Product tour/ }).click();
    await expect(page.locator("[data-workspace-guide-center]")).toBeHidden();
    await expect(dialog).toHaveAttribute("data-product-tour-step", "overview");
    await expect(page).toHaveURL(/\/en\/app$/);
  };

  await replay();
  await panel.getByRole("button", { name: "Skip tour" }).last().click();
  await expect(dialog).toHaveCount(0);
  await replay();

  const targets = stepTargets(page.viewportSize().width < 1280);

  for (let index = 0; index < stepTitles.length; index += 1) {
    await expect(
      panel.getByRole("heading", { name: stepTitles[index] }),
    ).toBeVisible();
    await expect(
      panel.getByText(`${index + 1} of 6`, { exact: true }),
    ).toBeVisible();
    await expectMobilePanelToFit(page, panel);
    const spotlight = page.locator("[data-product-tour-spotlight]");
    await expect(spotlight).toBeVisible();
    const spotlightBox = await spotlight.boundingBox();
    expect(spotlightBox.width).toBeGreaterThan(0);
    expect(spotlightBox.height).toBeGreaterThan(0);
    await expectSpotlightToMatchTarget(page, targets[index]);
    await panel.getByRole("button", { name: "Next" }).click();
  }

  await expect(dialog).toHaveAttribute("data-product-tour-step", "complete");
  await expect(
    panel.getByRole("heading", { name: "You’re ready to start" }),
  ).toBeVisible();
  await expectMobilePanelToFit(page, panel);
  await expect
    .poll(
      () =>
        fixture.preferencePatches.filter(
          ({ productTour }) => productTour?.status === "completed",
        ).length,
    )
    .toBe(1);

  let finalSessionId = null;
  const expectedFinalEvents = [
    "product_tour_started",
    "product_tour_overview_viewed",
    "product_tour_launch_center_viewed",
    "product_tour_studio_switcher_viewed",
    "product_tour_navigation_viewed",
    "product_tour_ai_assistant_viewed",
    "product_tour_settings_viewed",
    "product_tour_completed",
  ];
  await expect
    .poll(() => {
      finalSessionId = [...fixture.setupEventBodies]
        .reverse()
        .find(({ event }) => event === "product_tour_started")?.sessionId;
      return finalSessionId;
    })
    .not.toBeNull();
  await expect
    .poll(() =>
      fixture.setupEventBodies
        .filter(({ sessionId }) => sessionId === finalSessionId)
        .map(({ event }) => event),
    )
    .toEqual(expect.arrayContaining(expectedFinalEvents));

  await panel.getByRole("button", { name: "Open Launch Center" }).click();
  await expect(page).toHaveURL(/\/en\/app\/setup$/);
  await expect(
    page.getByRole("heading", { name: "Launch Center" }).first(),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect
    .poll(() =>
      fixture.setupEventBodies.some(
        ({ event, sessionId }) =>
          sessionId === finalSessionId &&
          event === "product_tour_launch_center_opened",
      ),
    )
    .toBe(true);
  await expect.poll(() => [...fixture.unexpectedRequests]).toEqual([]);
});
