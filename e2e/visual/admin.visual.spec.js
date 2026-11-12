import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  ADMIN_OVERVIEW_SCENARIOS,
  VISUAL_FIXED_TIME,
  VISUAL_TENANT_ORIGIN,
  getVisualSidebarStorageKey,
  installAdminApiMocks,
} from "./admin-fixtures.js";

const overviewHeroSelector = "[data-studio-briefing-hero]";
const studioFlowSelector = "[data-studio-flow-rail]";
const stripeBannerSelector =
  'aside[aria-labelledby="stripe-connect-banner-title"]';

const expectNoSeriousAccessibilityViolations = async (page, selector) => {
  const accessibility = await new AxeBuilder({ page })
    .include(selector)
    .analyze();

  expect(
    accessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);
};

const scenarios = [
  {
    id: "overview",
    pathname: "/en/app",
    heading: /Good morning, Martin/,
    requiredApiRequests: [
      "GET /dashboard/overview",
      "GET /ai/briefings/latest",
    ],
    ready: (page) => [
      page.getByRole("heading", {
        level: 2,
        name: "Studio operations",
        exact: true,
      }),
    ],
  },
  {
    id: "customers",
    pathname: "/en/app/users",
    heading: "Customers",
    requiredApiRequests: ["GET /users"],
    ready: (page) => [
      page
        .getByText("Anna Nováková", { exact: true })
        .filter({ visible: true })
        .first(),
    ],
  },
  {
    id: "notifications",
    pathname: "/en/app/notifications",
    heading: "Notifications",
    requiredApiRequests: ["GET /tenants/current/notifications"],
    ready: (page) => [
      page.getByText("Your operational updates", { exact: true }),
      page.getByText("Booking cancelled", { exact: true }).first(),
      page.locator("[data-workspace-notification-badge]"),
    ],
  },

  {
    id: "settings",
    pathname: "/en/app/settings",
    heading: "Settings",
    requiredApiRequests: [],
    ready: (page) => {
      const workspaceMain = page.locator("#workspace-main");

      return [
        workspaceMain.getByRole("navigation", {
          name: "Workspace settings",
        }),
        workspaceMain.getByRole("heading", {
          level: 2,
          name: "Everything your studio needs, clearly organized.",
        }),
        workspaceMain.getByRole("link", {
          name: "Open Workspace settings",
        }),
      ];
    },
  },
  {
    id: "public-site-editor",
    pathname: "/en/app/settings/public-site",
    heading: "Website & branding",
    requiredApiRequests: [
      "GET /tenants/current/settings/public-site",
      "GET /tenants/current/settings/public-site/preview",
    ],
    ready: (page) => {
      const workspaceMain = page.locator("#workspace-main");

      return [
        workspaceMain.getByRole("navigation", {
          name: "Workspace settings",
        }),
        workspaceMain.locator("#public-site-editor-pane"),
        workspaceMain.getByRole("button", {
          name: "Save draft",
          exact: true,
        }),
      ];
    },
  },
  {
    id: "setup-center",
    pathname: "/en/app/setup",
    heading: "Launch Center",
    requiredApiRequests: [
      "GET /tenants/current/setup-center",
      "GET /tenants/current/settings/workspace-configuration",
      "POST /tenants/current/setup-center/events",
    ],
    ready: (page) => [
      page.getByRole("heading", {
        level: 2,
        name: "Your studio can now accept payments",
        exact: true,
      }),
    ],
  },
  {
    id: "communications-history",
    pathname: "/en/app/communications",
    heading: "Communications",
    requiredApiRequests: [
      "GET /registered-sender-emails",
      "GET /communication-email-logs",
    ],
    ready: (page) => [
      page.getByRole("tab", {
        name: /History/,
        selected: true,
      }),
      page.getByRole("heading", {
        level: 2,
        name: "Automation and system deliveries",
        exact: true,
      }),
    ],
  },
];

const commonRequiredApiRequests = [
  "POST /auth/refresh",
  "GET /tenants/current/onboarding",
  "GET /locations",
  "GET /tenants/current/notifications/summary",
];

async function waitForStablePage(page, scenario) {
  const routeHeading = page.getByRole("heading", {
    level: 1,
    name: scenario.heading,
  });
  const mobile = (page.viewportSize()?.width ?? 1280) < 768;

  await expect(routeHeading).toHaveCount(1);
  await expect(routeHeading).toBeVisible({ timeout: 20_000 });
  const mobileTitle = page.locator(
    "[data-workspace-topbar] [data-mobile-topbar-title]",
  );
  if (mobile) {
    await expect(mobileTitle).toBeVisible();
    await expect(mobileTitle).not.toBeEmpty();
  } else {
    await expect(mobileTitle).toBeHidden();
  }
  for (const readyLocator of scenario.ready(page)) {
    await expect(readyLocator).toBeVisible();
  }
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
}

async function expectMobileCommandBar(page) {
  if ((page.viewportSize()?.width ?? 1280) >= 1280) return;

  const menu = page.getByRole("button", {
    name: "Open dashboard navigation",
  });
  const booking = page.getByRole("link", { name: "New booking" });
  const topbar = page.locator("[data-workspace-topbar]");
  const help = topbar.locator("[data-workspace-help-trigger]");
  const ai = page.getByRole("button", { name: "Open Studio Assistant" });
  const profile = page.getByRole("button", { name: "User menu" });

  for (const action of [menu, help, ai, profile]) {
    await expect(action).toBeVisible();
  }
  await expect(booking).toHaveCount(0);
  await expect(topbar.getByRole("link", { name: /Launch Center/ })).toHaveCount(
    0,
  );

  const boxes = await Promise.all(
    [menu, help, ai, profile].map((action) => action.boundingBox()),
  );
  const topbarBox = await topbar.boundingBox();
  const rowGeometry = await topbar
    .locator("[data-workspace-topbar-row]")
    .evaluate((row) => ({
      clientWidth: row.clientWidth,
      scrollWidth: row.scrollWidth,
    }));

  expect(boxes.every(Boolean)).toBe(true);
  expect(topbarBox).not.toBeNull();
  expect(rowGeometry.scrollWidth).toBeLessThanOrEqual(
    rowGeometry.clientWidth + 1,
  );
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(topbarBox.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(
      topbarBox.x + topbarBox.width + 1,
    );
    expect(box.y).toBeGreaterThanOrEqual(topbarBox.y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(
      topbarBox.y + topbarBox.height + 1,
    );
  }
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].x).toBeGreaterThanOrEqual(
      boxes[index - 1].x + boxes[index - 1].width,
    );
  }

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const mobileTitle = topbar.locator("[data-mobile-topbar-title]");
    const titleBox = await mobileTitle.boundingBox();

    await expect(mobileTitle).toBeVisible();
    expect(titleBox).not.toBeNull();
    expect(titleBox.x).toBeGreaterThanOrEqual(boxes[0].x + boxes[0].width);
    expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(boxes[1].x + 1);
    const tooltips = topbar.locator("[data-topbar-tooltip]");
    await expect(tooltips).toHaveCount(5);
    for (let index = 0; index < 5; index += 1) {
      await expect(tooltips.nth(index)).toBeHidden();
    }
  }
}

async function expectSoundPage({
  handledRequests,
  page,
  pageErrors,
  requiredApiRequests,
  unexpectedRequests,
  expectedPathname,
  expectedSearchParams = {},
}) {
  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe(expectedPathname);
  for (const [name, value] of Object.entries(expectedSearchParams)) {
    expect(currentUrl.searchParams.get(name)).toBe(value);
  }

  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const workspaceMain = document.querySelector("#workspace-main");
    const mainRect = workspaceMain?.getBoundingClientRect() ?? null;

    return {
      bodyScrollWidth: body.scrollWidth,
      clientWidth: root.clientWidth,
      rootScrollWidth: root.scrollWidth,
      workspaceMain: mainRect
        ? {
            left: mainRect.left,
            right: mainRect.right,
            width: mainRect.width,
          }
        : null,
    };
  });

  expect(
    geometry.workspaceMain,
    "The workspace main region must exist.",
  ).not.toBeNull();
  expect(
    Math.max(geometry.rootScrollWidth, geometry.bodyScrollWidth),
    `Document overflowed horizontally: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(
    geometry.workspaceMain.left,
    `Workspace main started outside the viewport: ${JSON.stringify(geometry)}`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    geometry.workspaceMain.right,
    `Workspace main ended outside the viewport: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);

  expect(
    [...unexpectedRequests],
    "Every admin API request must have an explicit deterministic fixture.",
  ).toEqual([]);
  const missingApiRequests = [
    ...commonRequiredApiRequests,
    ...requiredApiRequests,
  ].filter((request) => !handledRequests.has(request));
  expect(
    missingApiRequests,
    `Required deterministic API fixtures were not exercised. Handled: ${[
      ...handledRequests,
    ].join(", ")}`,
  ).toEqual([]);
  expect(pageErrors, "The page emitted uncaught JavaScript errors.").toEqual(
    [],
  );
}

async function attachPageScreenshot(page, testInfo, name) {
  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: true,
  });

  await testInfo.attach(`${name}-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
}

async function expectPaneWithinViewport(page, pane, name) {
  const box = await pane.boundingBox();
  const viewportWidth = page.viewportSize()?.width ?? 1280;

  expect(box, `${name} must be visible and measurable.`).not.toBeNull();
  expect(box.x, `${name} started outside the viewport.`).toBeGreaterThanOrEqual(
    -1,
  );
  expect(
    box.x + box.width,
    `${name} ended outside the viewport.`,
  ).toBeLessThanOrEqual(viewportWidth + 1);

  return box;
}

async function expectElementBefore(page, beforeSelector, afterSelector) {
  await expect(page.locator(beforeSelector)).toHaveCount(1);
  await expect(page.locator(afterSelector)).toHaveCount(1);

  expect(
    await page.evaluate(
      ({ before, after }) => {
        const beforeElement = document.querySelector(before);
        const afterElement = document.querySelector(after);

        return Boolean(
          beforeElement &&
          afterElement &&
          beforeElement.compareDocumentPosition(afterElement) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      },
      { before: beforeSelector, after: afterSelector },
    ),
  ).toBe(true);
}

async function expectDesktopSidebarGeometry(page, expectedWidth) {
  const desktopSidebar = page
    .locator("aside")
    .filter({ has: page.locator('[data-workspace-sidebar="desktop"]') });
  const toggle = desktopSidebar.getByRole("button", {
    name: /studio navigation/i,
  });

  await expect(desktopSidebar).toBeVisible();
  await expect(toggle).toBeVisible();
  await expect
    .poll(async () =>
      Math.round((await desktopSidebar.boundingBox())?.width ?? 0),
    )
    .toBe(expectedWidth);

  const [sidebarBox, toggleBox] = await Promise.all([
    desktopSidebar.boundingBox(),
    toggle.boundingBox(),
  ]);

  expect(sidebarBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(toggleBox.x).toBeGreaterThanOrEqual(sidebarBox.x - 1);
  expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(
    sidebarBox.x + sidebarBox.width + 1,
  );
}

async function withAdaptiveOverviewState(
  { context, locale = "en", overviewScenario, viewport },
  assertState,
) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    if (viewport) await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
    const { handledRequests, unexpectedRequests } = await installAdminApiMocks(
      page,
      { overviewScenario, workspaceLocale: locale },
    );

    await context.addCookies([
      {
        name: "shario_language",
        value: locale.toUpperCase(),
        url: VISUAL_TENANT_ORIGIN,
        sameSite: "Lax",
      },
    ]);

    const pathname = `/${locale}/app`;
    const flowTitle =
      {
        cs: "Provoz studia",
        el: "Λειτουργίες στούντιο",
      }[locale] ?? "Studio operations";
    await page.goto(`${VISUAL_TENANT_ORIGIN}${pathname}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: flowTitle,
        exact: true,
      }),
    ).toBeVisible({ timeout: 20_000 });
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready.then(() => true));

    await assertState(page, { handledRequests });
    await expectSoundPage({
      handledRequests,
      page,
      pageErrors,
      requiredApiRequests: [
        "GET /dashboard/overview",
        "GET /ai/briefings/latest",
        "GET /tenant-payments/connect",
        "GET /tenants/current/setup-center",
      ],
      unexpectedRequests,
      expectedPathname: pathname,
    });
  } finally {
    await page.close();
  }
}

test("adaptive Overview states preserve hierarchy and payment alerts", async ({
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1280",
    "The adaptive state matrix runs once at the compact desktop breakpoint.",
  );

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING,
    },
    async (page) => {
      await expect(
        page.locator("[data-setup-center-presentation]"),
      ).toHaveCount(0);
      await expectElementBefore(page, overviewHeroSelector, studioFlowSelector);
    },
  );

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.DISMISSED,
    },
    async (page) => {
      await expect(
        page.locator("[data-setup-center-presentation]"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Set up customer payments",
          exact: true,
        }),
      ).toBeVisible();
      await expectElementBefore(
        page,
        overviewHeroSelector,
        stripeBannerSelector,
      );
    },
  );

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.GUIDED_INCOMPLETE_PAYMENTS,
    },
    async (page) => {
      // This fixture has completed three launch steps, so the current
      // progressive-disclosure contract presents its remaining setup compactly.
      await expect(
        page.locator('[data-setup-center-presentation="compact"]'),
      ).toBeVisible();
      await expectElementBefore(page, overviewHeroSelector, studioFlowSelector);
      await expectElementBefore(
        page,
        studioFlowSelector,
        '[data-setup-center-presentation="compact"]',
      );
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Set up customer payments",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(page.locator(stripeBannerSelector)).toHaveCount(0);
    },
  );

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.RESTRICTED_PAYMENTS,
    },
    async (page) => {
      await expect(
        page.locator('[data-setup-center-presentation="compact"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Your Stripe account needs attention",
          exact: true,
        }),
      ).toBeVisible();
      await expectElementBefore(
        page,
        overviewHeroSelector,
        stripeBannerSelector,
      );
    },
  );
});

test("all-clear Overview compacts status, neutralizes zero flow, and unifies workspace chrome", async ({
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1280",
    "The compact laptop hierarchy contract runs once at the tightest single-row breakpoint.",
  );

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.ALL_CLEAR,
    },
    async (page) => {
      const hero = page.locator(overviewHeroSelector);
      const emptyGroups = page.locator(
        `${studioFlowSelector} [data-flow-empty-group]`,
      );
      const flow = page.locator(studioFlowSelector);
      const dateControl = flow.locator("[data-overview-date-control]");
      const topbar = page.locator("[data-workspace-topbar]");
      const sidebar = page.locator('[data-workspace-sidebar="desktop"]');

      await expect(hero).toHaveAttribute("data-briefing-state", "all-clear");
      await expect(hero.locator("[data-attention-density]")).toHaveCount(0);
      await expect(
        hero.getByRole("link", { name: "View today’s schedule" }),
      ).toHaveAttribute("href", "/en/app/calendar?date=2026-07-30");
      await expect(
        hero.getByRole("link", { name: "Review priorities" }),
      ).toHaveCount(0);
      await expect(emptyGroups).toHaveCount(2);
      await expect(emptyGroups.locator("strong")).toHaveText(["0", "0"]);
      await expect(flow).toHaveAttribute("data-flow-state", "empty");
      await expect(flow).toHaveAttribute("data-flow-density", "compact");
      await expect(
        flow.getByText("No studio activity is scheduled yet", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("[data-overview-snapshot]")).toHaveCount(0);
      await expect(page.locator("[data-overview-snapshot-metric]")).toHaveCount(
        0,
      );
      await expectElementBefore(page, overviewHeroSelector, studioFlowSelector);
      await expect(dateControl).toBeVisible();
      const nativeDateInput = flow.locator("[data-overview-date-input]");
      await nativeDateInput.evaluate((input) => {
        Object.defineProperty(input, "showPicker", {
          configurable: true,
          value: () => input.setAttribute("data-picker-opened", "true"),
        });
      });
      await flow.getByRole("button", { name: /^Choose date:/ }).click();
      await expect(nativeDateInput).toHaveAttribute(
        "data-picker-opened",
        "true",
      );

      await flow.getByRole("button", { name: "Next day" }).click();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("date"))
        .toBe("2026-07-31");
      await expect(nativeDateInput).toHaveValue("2026-07-31");
      await expect(flow.locator("[data-overview-date-label]")).toHaveText(
        "7/31/2026",
      );
      await flow.getByRole("button", { name: "Back to today" }).click();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("date"))
        .toBeNull();
      await expect(nativeDateInput).toHaveValue("2026-07-30");
      await expect(
        flow.getByRole("button", { name: "Back to today" }),
      ).toHaveCount(0);
      const [heroBox, flowBox, dateControlBox] = await Promise.all([
        hero.boundingBox(),
        flow.boundingBox(),
        dateControl.boundingBox(),
      ]);

      expect(heroBox).not.toBeNull();
      expect(flowBox).not.toBeNull();
      expect(dateControlBox).not.toBeNull();
      expect(heroBox.y + heroBox.height).toBeLessThan(flowBox.y);
      expect(Math.abs(heroBox.x - flowBox.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(heroBox.width - flowBox.width)).toBeLessThanOrEqual(2);
      expect(dateControlBox.width).toBeGreaterThanOrEqual(259);
      expect(dateControlBox.width).toBeLessThanOrEqual(261);
      expect(
        await flow.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await dateControl.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(flowBox.height).toBeLessThanOrEqual(300);
      await expect(emptyGroups.first().locator("strong")).toBeVisible();
      await expect(
        flow.getByRole("link", { name: "Open calendar" }),
      ).toHaveAttribute("href", "/en/app/calendar");

      const coralBrush = hero.locator('[data-workspace-brush-tone="coral"]');
      const cobaltBrush = hero.locator('[data-workspace-brush-tone="cobalt"]');
      await expect(coralBrush).toBeVisible();
      await expect(cobaltBrush).toBeVisible();

      const [coralBox, cobaltBox, coralOpacity, cobaltOpacity] =
        await Promise.all([
          coralBrush.boundingBox(),
          cobaltBrush.boundingBox(),
          coralBrush.evaluate((element) =>
            Number(getComputedStyle(element).opacity),
          ),
          cobaltBrush.evaluate((element) =>
            Number(getComputedStyle(element).opacity),
          ),
        ]);

      expect(coralBox?.width).toBeGreaterThan(0);
      expect(coralBox?.height).toBeGreaterThan(0);
      expect(cobaltBox?.width).toBeGreaterThan(0);
      expect(cobaltBox?.height).toBeGreaterThan(0);
      expect(coralOpacity).toBeCloseTo(0.42, 2);
      expect(cobaltOpacity).toBeCloseTo(0.4, 2);
      await expectNoSeriousAccessibilityViolations(page, overviewHeroSelector);
      await expectNoSeriousAccessibilityViolations(page, studioFlowSelector);

      const [topbarColor, sidebarColor] = await Promise.all([
        topbar.evaluate((element) => getComputedStyle(element).backgroundColor),
        sidebar.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      ]);

      expect(topbarColor).toBe("rgb(255, 254, 251)");
      expect(sidebarColor).toBe(topbarColor);
      await attachPageScreenshot(page, testInfo, "overview-all-clear-harmony");
    },
  );
});

test("completed Czech Overview stays ordered and locale-safe on a narrow viewport", async ({
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-390",
    "The narrow adaptive contract runs once on the 390px project.",
  );

  await withAdaptiveOverviewState(
    {
      context,
      locale: "cs",
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING,
    },
    async (page) => {
      await expect(
        page.locator("[data-setup-center-presentation]"),
      ).toHaveCount(0);
      await expectElementBefore(page, overviewHeroSelector, studioFlowSelector);

      const visibleDate = page.locator("[data-overview-date-label]");
      const nativeDateInput = page.locator("[data-overview-date-input]");
      await expect(visibleDate).toHaveText("30. 7. 2026");
      await expect(nativeDateInput).toHaveValue("2026-07-30");
      await expect(nativeDateInput).toHaveAttribute("lang", "cs");
      await expect(nativeDateInput).toHaveAttribute(
        "aria-label",
        "Datum přehledu",
      );
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: "Denní přehled studia — 30. července 2026",
        }),
      ).toBeVisible();
      await expect(
        page.getByText("Zkontrolujte úkoly týmu před začátkem rezervací."),
      ).toBeVisible();
      await expectNoSeriousAccessibilityViolations(page, overviewHeroSelector);
      await attachPageScreenshot(page, testInfo, "overview-complete-czech");
    },
  );
});

test("Overview preserves its briefing-first hierarchy on tablet and small laptops", async ({
  context,
}, testInfo) => {
  test.skip(
    !["tablet-768", "tablet-1024"].includes(testInfo.project.name),
    "The Overview hierarchy contract runs on the 768px and 1024px tablet projects.",
  );

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.ALL_CLEAR,
    },
    async (page) => {
      const hero = page.locator(overviewHeroSelector);
      const flow = page.locator(studioFlowSelector);
      const dateControl = flow.locator("[data-overview-date-control]");

      await expect(hero).toBeVisible();
      await expect(flow).toBeVisible();
      await expect(page.locator("[data-overview-snapshot]")).toHaveCount(0);
      await expect(page.locator("[data-overview-snapshot-metric]")).toHaveCount(
        0,
      );
      await expectElementBefore(page, overviewHeroSelector, studioFlowSelector);

      const [heroBox, flowBox, dateControlBox] = await Promise.all([
        hero.boundingBox(),
        flow.boundingBox(),
        dateControl.boundingBox(),
      ]);

      expect(heroBox).not.toBeNull();
      expect(flowBox).not.toBeNull();
      expect(dateControlBox).not.toBeNull();
      expect(heroBox.y + heroBox.height).toBeLessThan(flowBox.y);
      expect(Math.abs(heroBox.x - flowBox.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(heroBox.width - flowBox.width)).toBeLessThanOrEqual(2);
      expect(dateControlBox.x + dateControlBox.width).toBeLessThanOrEqual(
        flowBox.x + flowBox.width - 20,
      );
      expect(dateControlBox.width).toBeGreaterThanOrEqual(259);
      expect(dateControlBox.width).toBeLessThanOrEqual(261);
      expect(
        await flow.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await dateControl.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);

      await expectNoSeriousAccessibilityViolations(page, studioFlowSelector);
      await attachPageScreenshot(
        page,
        testInfo,
        `overview-hierarchy-${testInfo.project.name}`,
      );
    },
  );
});

test("localized Overview keeps its primary hierarchy clear on the narrowest viewport", async ({
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-320",
    "The translated Overview hierarchy contract runs once on the 320px project.",
  );

  await withAdaptiveOverviewState(
    {
      context,
      locale: "el",
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.ALL_CLEAR,
    },
    async (page) => {
      const hero = page.locator(overviewHeroSelector);
      const flow = page.locator(studioFlowSelector);
      const dateControl = flow.locator("[data-overview-date-control]");

      await expect(hero).toBeVisible();
      await expect(flow).toBeVisible();
      await expect(page.locator("[data-overview-snapshot]")).toHaveCount(0);
      await expect(page.locator("[data-overview-snapshot-metric]")).toHaveCount(
        0,
      );
      await expectElementBefore(page, overviewHeroSelector, studioFlowSelector);
      const initialDateControlBox = await dateControl.boundingBox();
      expect(initialDateControlBox).not.toBeNull();

      await flow.getByRole("button", { name: "Επόμενη ημέρα" }).click();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("date"))
        .toBe("2026-07-31");
      await expect(dateControl.locator("button[title]")).toBeVisible();

      const [heroBox, flowBox, dateControlBox] = await Promise.all([
        hero.boundingBox(),
        flow.boundingBox(),
        dateControl.boundingBox(),
      ]);

      expect(heroBox).not.toBeNull();
      expect(flowBox).not.toBeNull();
      expect(dateControlBox).not.toBeNull();
      expect(
        Math.abs(dateControlBox.height - initialDateControlBox.height),
      ).toBeLessThanOrEqual(1);
      expect(heroBox.y + heroBox.height).toBeLessThan(flowBox.y);
      expect(Math.abs(heroBox.x - flowBox.x)).toBeLessThanOrEqual(2);
      expect(Math.abs(heroBox.width - flowBox.width)).toBeLessThanOrEqual(2);
      expect(dateControlBox.x).toBeGreaterThanOrEqual(flowBox.x + 14);
      expect(dateControlBox.x + dateControlBox.width).toBeLessThanOrEqual(
        flowBox.x + flowBox.width - 14,
      );
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(
        await hero.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await flow.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        await dateControl.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);

      await expectNoSeriousAccessibilityViolations(page, overviewHeroSelector);
      await expectNoSeriousAccessibilityViolations(page, studioFlowSelector);
      await attachPageScreenshot(page, testInfo, "overview-greek-mobile");
    },
  );
});

test("guided Overview reveals Studio Flow on a short laptop viewport", async ({
  context,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-1280",
    "The short-height laptop contract runs once from the 1280px desktop project.",
  );

  const viewport = { width: 1280, height: 640 };

  await withAdaptiveOverviewState(
    {
      context,
      overviewScenario: ADMIN_OVERVIEW_SCENARIOS.GUIDED_INCOMPLETE_PAYMENTS,
      viewport,
    },
    async (page) => {
      const hero = page.locator(overviewHeroSelector);
      const flow = page.locator(studioFlowSelector);

      await expect(hero).toBeVisible();
      await expect(flow).toBeVisible();
      await expect(
        hero.getByRole("heading", {
          level: 2,
          name: "Daily Studio Briefing — 30 July 2026",
        }),
      ).toBeVisible();
      await expect(
        hero
          .getByRole("list", { name: "Today’s verified priorities" })
          .getByRole("listitem"),
      ).toHaveCount(1);
      await expect(
        hero.getByText("unpaid bookings", { exact: true }),
      ).toBeVisible();
      await expect(
        hero.getByText("overdue staff tasks", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        hero.getByText("low-stock items", { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.scrollingElement?.scrollTop ?? 0),
      ).toBe(0);
      const flowBox = await flow.boundingBox();
      const viewportHeight = page.viewportSize()?.height ?? viewport.height;

      expect(flowBox).not.toBeNull();
      expect(
        Math.min(flowBox.y + flowBox.height, viewportHeight) -
          Math.max(flowBox.y, 0),
      ).toBeGreaterThanOrEqual(64);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await attachPageScreenshot(page, testInfo, "overview-short-laptop");
    },
  );
});

test("responsive command bar opens an accessible mobile workspace menu", async ({
  page,
}, testInfo) => {
  const viewport = page.viewportSize();
  const usesTouch = testInfo.project.name.startsWith("mobile-");
  const activate = (locator) => (usesTouch ? locator.tap() : locator.click());
  test.skip(
    (viewport?.width ?? 1280) >= 1280,
    "The persistent desktop sidebar replaces the mobile workspace menu.",
  );

  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  await installAdminApiMocks(page);
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
  await expect(
    page.getByRole("heading", { level: 1, name: /Good morning, Martin/ }),
  ).toBeVisible();
  await expectMobileCommandBar(page);

  const trigger = page.locator("[data-mobile-navigation-trigger]");
  await expect(trigger).toHaveCount(1);
  const controlledId = await trigger.getAttribute("aria-controls");

  expect(controlledId).toBeTruthy();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await activate(trigger);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const dialog = page.getByRole("dialog", { name: "Studio management" });
  const panel = page.locator(`#${controlledId}`);
  const close = dialog.getByRole("button", {
    name: "Close dashboard navigation",
  });
  const expectOpenPanel = async () => {
    await expect(panel).toBeVisible();
    await expect
      .poll(async () => (await panel.boundingBox())?.x ?? -10_000, {
        message:
          "The mobile navigation drawer must finish opening inside the viewport.",
      })
      .toBeGreaterThanOrEqual(-1);
  };

  // The Headless UI dialog wrapper contains fixed-position children, so its
  // own box can be empty even while the drawer is visibly open.
  await expect(dialog).toHaveCount(1);
  await expectOpenPanel();
  await expect(close).toBeVisible();

  const panelBox = await panel.boundingBox();
  const closeBox = await close.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(closeBox).not.toBeNull();
  expect(panelBox.x).toBeGreaterThanOrEqual(-1);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
    (viewport?.width ?? 1280) + 1,
  );
  expect(closeBox.width).toBeGreaterThanOrEqual(44);
  expect(closeBox.height).toBeGreaterThanOrEqual(44);

  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      panel.evaluate((element) => element.contains(document.activeElement)),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();

  const profile = page.getByRole("button", { name: "User menu" });
  await activate(profile);
  const profilePanel = page.locator("[data-profile-menu-panel]");
  await expect(profilePanel).toBeVisible();
  // The transition may not be registered yet when the drawer becomes visible.
  // Wait for its measured geometry instead of an initially empty animation list.
  await expect(async () => {
    const profileBox = await profilePanel.boundingBox();
    expect(profileBox).not.toBeNull();
    expect(profileBox.x).toBeGreaterThanOrEqual(-1);
    expect(profileBox.y).toBeGreaterThanOrEqual(-1);
    expect(profileBox.x + profileBox.width).toBeLessThanOrEqual(
      (viewport?.width ?? 1280) + 1,
    );
    expect(profileBox.y + profileBox.height).toBeLessThanOrEqual(
      (viewport?.height ?? 900) + 1,
    );
  }).toPass({ timeout: 5_000, intervals: [50, 100, 200] });
  await page.keyboard.press("Escape");
  await expect(profilePanel).toBeHidden();
  await expect(profile).toBeFocused();

  await activate(trigger);
  await expectOpenPanel();
  await activate(panel.getByRole("link", { name: "Overview", exact: true }));
  await expect(panel).toBeHidden();
});

test("completed Launch Center keeps one clear action across breakpoints", async ({
  page,
}, testInfo) => {
  test.skip(
    !["desktop-1280", "tablet-768", "mobile-390", "mobile-320"].includes(
      testInfo.project.name,
    ),
    "The completed Launch Center contract runs at representative desktop, tablet, and mobile widths.",
  );

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const { handledRequests, unexpectedRequests } = await installAdminApiMocks(
    page,
    { overviewScenario: ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING },
  );

  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);

  const pathname = "/en/app/setup";
  await page.goto(`${VISUAL_TENANT_ORIGIN}${pathname}`, {
    waitUntil: "domcontentloaded",
  });
  const finalReview = page.locator("[data-launch-final-review]");
  await expect(
    finalReview.getByRole("heading", {
      level: 2,
      name: "Your studio has launched",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => true));

  await expect(finalReview.locator("[data-readiness-summary]")).toContainText(
    "5 of 5 checks complete",
  );
  await expect(finalReview.locator("[data-readiness-item]")).toHaveCount(5);
  await expect(
    finalReview.locator('[data-readiness-status="ready"]'),
  ).toHaveCount(5);
  await expect(
    finalReview.locator('[data-readiness-item="customerJourney"]'),
  ).toContainText("Step 5");
  await expect(finalReview).toHaveAttribute(
    "data-readiness-density",
    "compact",
  );
  await expect(
    finalReview.locator('[data-launch-attention-accent="true"]'),
  ).toHaveCount(0);
  await expect(
    finalReview.getByText(
      "Workspace-wide readiness across your website, bookings, payments, emails, and customer journey",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    finalReview.locator('[data-launch-primary-action="true"]'),
  ).toHaveCount(0);
  await expect(
    finalReview.getByRole("link", { name: "Open website", exact: true }),
  ).toBeVisible();
  await expect(
    finalReview.getByRole("button", { name: "Copy link", exact: true }),
  ).toBeVisible();
  await expect(
    finalReview.locator('[data-launch-public-url="true"]'),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.getByText("Show all setup tasks", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Grow your studio", { exact: true }),
  ).toBeVisible();
  if (testInfo.project.name === "desktop-1280") {
    const desktopLaunchCenter = page.locator(
      '[data-workspace-sidebar="desktop"]',
    );
    await expect(
      desktopLaunchCenter.locator("[data-launch-center-progress]"),
    ).toHaveCount(0);
    await expect(
      desktopLaunchCenter.getByRole("link", { name: "Open Launch Center" }),
    ).toContainText("Launch Center");
  }

  const visibleActions = finalReview.locator("a, button");
  for (let index = 0; index < (await visibleActions.count()); index += 1) {
    const action = visibleActions.nth(index);
    if (!(await action.isVisible())) continue;
    const box = await action.boundingBox();
    expect(
      box,
      "Visible Launch Center actions must be measurable.",
    ).not.toBeNull();
    expect(
      box.height,
      "Visible Launch Center actions must have a 44px touch target.",
    ).toBeGreaterThanOrEqual(43);
  }

  const accessibility = await new AxeBuilder({ page })
    .include("[data-launch-final-review]")
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);

  await expectSoundPage({
    handledRequests,
    page,
    pageErrors,
    requiredApiRequests: [
      "GET /tenants/current/setup-center",
      "GET /tenants/current/settings/workspace-configuration",
      "POST /tenants/current/setup-center/events",
    ],
    unexpectedRequests,
    expectedPathname: pathname,
  });
  await attachPageScreenshot(page, testInfo, "setup-center-complete");
});

test("live Launch Center attention stays precise across breakpoints", async ({
  page,
}, testInfo) => {
  test.skip(
    !["desktop-1280", "tablet-768", "mobile-320"].includes(
      testInfo.project.name,
    ),
    "The live-attention contract runs at one representative desktop, tablet, and mobile width.",
  );

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const { handledRequests, unexpectedRequests } = await installAdminApiMocks(
    page,
    { overviewScenario: ADMIN_OVERVIEW_SCENARIOS.LIVE_ATTENTION },
  );

  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);

  const pathname = "/en/app/setup";
  await page.goto(`${VISUAL_TENANT_ORIGIN}${pathname}`, {
    waitUntil: "domcontentloaded",
  });
  const finalReview = page.locator("[data-launch-final-review]");
  await expect(
    finalReview.getByRole("heading", {
      level: 2,
      name: "1 launch item needs attention",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => true));

  await expect(finalReview).toHaveAttribute(
    "data-launch-health",
    "needs-attention",
  );
  await expect(finalReview).toHaveAttribute(
    "data-readiness-density",
    "standard",
  );
  await expect(
    finalReview.locator('[data-launch-attention-accent="true"]'),
  ).toHaveCount(1);
  await expect(
    finalReview.locator('[data-launch-attention-accent="true"]'),
  ).toHaveAttribute("aria-hidden", "true");
  await expect(
    finalReview.getByText(
      "Workspace-wide readiness across your website, bookings, payments, emails, and customer journey",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    finalReview.locator('[data-readiness-status="action_required"]'),
  ).toHaveCount(1);

  const emailReadiness = finalReview.locator('[data-readiness-item="emails"]');
  await expect(emailReadiness).toHaveAttribute(
    "data-readiness-status",
    "action_required",
  );
  await expect(
    emailReadiness.getByText("Set up the managed sender.", { exact: true }),
  ).toBeVisible();
  await expect(
    emailReadiness.getByRole("link", {
      name: "Set up email sender",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    finalReview.locator('[data-launch-primary-action="true"]'),
  ).toHaveCount(0);
  await expect(
    finalReview.getByRole("link", { name: "Open website", exact: true }),
  ).toBeVisible();

  if (testInfo.project.name === "desktop-1280") {
    const sidebar = page.locator('[data-workspace-sidebar="desktop"]');
    const statusBadge = sidebar.locator("[data-launch-center-progress]");
    await expect(statusBadge).toHaveAttribute(
      "data-launch-center-status",
      "attention",
    );
    await expect(statusBadge).toHaveText("1 issue");
    await expect(
      sidebar.getByRole("link", { name: "Open Launch Center" }),
    ).toHaveAccessibleDescription(
      "1 launch readiness issue requires attention",
    );

    const publicAddress = finalReview.locator(
      '[data-launch-public-url="true"]',
    );
    await expect(publicAddress).toBeInViewport({ ratio: 0.25 });
  } else {
    const navigationTrigger = page.locator("[data-mobile-navigation-trigger]");
    await navigationTrigger.click();
    const mobileSidebar = page.locator('[data-workspace-sidebar="mobile"]');
    await expect(mobileSidebar).toBeVisible();
    await expect(
      mobileSidebar.locator("[data-launch-center-progress]"),
    ).toHaveAttribute("data-launch-center-status", "attention");
    await expect(
      mobileSidebar.getByRole("link", { name: "Open Launch Center" }),
    ).toHaveAccessibleDescription(
      "1 launch readiness issue requires attention",
    );
    await page.keyboard.press("Escape");
    await expect(mobileSidebar).toBeHidden();
  }

  expect(
    await finalReview.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);

  const visibleActions = finalReview.locator("a, button");
  for (let index = 0; index < (await visibleActions.count()); index += 1) {
    const action = visibleActions.nth(index);
    if (!(await action.isVisible())) continue;
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(43);
  }

  const accessibility = await new AxeBuilder({ page })
    .include("[data-launch-final-review]")
    .analyze();
  expect(
    accessibility.violations.filter(({ impact }) =>
      ["serious", "critical"].includes(impact),
    ),
  ).toEqual([]);

  await expectSoundPage({
    handledRequests,
    page,
    pageErrors,
    requiredApiRequests: [
      "GET /tenants/current/setup-center",
      "GET /tenants/current/settings/workspace-configuration",
      "POST /tenants/current/setup-center/events",
    ],
    unexpectedRequests,
    expectedPathname: pathname,
  });
  await attachPageScreenshot(page, testInfo, "setup-center-live-attention");
});

test.describe("admin workspace visual QA", () => {
  for (const scenario of scenarios) {
    test(`${scenario.id} renders without regressions`, async ({
      page,
    }, testInfo) => {
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
      const { handledRequests, unexpectedRequests } =
        await installAdminApiMocks(page);

      await page.context().addCookies([
        {
          name: "shario_language",
          value: "EN",
          url: VISUAL_TENANT_ORIGIN,
          sameSite: "Lax",
        },
      ]);

      await page.goto(`${VISUAL_TENANT_ORIGIN}${scenario.pathname}`, {
        waitUntil: "domcontentloaded",
      });
      await waitForStablePage(page, scenario);
      await expectMobileCommandBar(page);
      await expectSoundPage({
        handledRequests,
        page,
        pageErrors,
        requiredApiRequests: scenario.requiredApiRequests,
        unexpectedRequests,
        expectedPathname: scenario.expectedPathname ?? scenario.pathname,
        expectedSearchParams: scenario.expectedSearchParams,
      });

      if (scenario.id === "notifications") {
        const trigger = page.locator("[data-workspace-notification-trigger]");
        const badge = page.locator("[data-workspace-notification-badge]");

        await expect(trigger).toBeVisible();
        await expect(badge).toHaveText("2");
        await trigger.click();

        const panel = page.locator("[data-workspace-notification-panel]");
        await expect(panel).toBeVisible();
        await expect(
          panel.getByText("Booking cancelled", { exact: true }),
        ).toBeVisible();

        const accessibility = await new AxeBuilder({ page })
          .include("[data-workspace-notification-panel]")
          .analyze();
        expect(
          accessibility.violations.filter(({ impact }) =>
            ["serious", "critical"].includes(impact),
          ),
        ).toEqual([]);

        await panel
          .getByRole("button", {
            name: "Mark notification as read: Booking cancelled",
          })
          .click();
        await expect(badge).toHaveText("1");

        await panel.getByRole("button", { name: "Mark all as read" }).click();
        await expect(badge).toHaveCount(0);

        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
      }

      const viewport = page.viewportSize();
      let initialScreenshotState = "default";

      if (scenario.id === "overview" && viewport?.width >= 1280) {
        initialScreenshotState = "expanded";
        await expectDesktopSidebarGeometry(page, 224);
        await expect(
          page.locator(
            '[data-workspace-sidebar="desktop"] [data-launch-center-progress]',
          ),
        ).toHaveText("4/7");
      }

      if (scenario.id === "public-site-editor") {
        const editorPane = page.locator("#public-site-editor-pane");
        const previewPane = page.locator("#public-site-preview-pane");
        const preview = page.frameLocator(
          'iframe[title="Studio Olivie production preview"]',
        );
        const previewRoot = preview.locator("[data-tenant-style]").first();
        const showWorkspacePane = async (name) => {
          if ((viewport?.width ?? 1280) < 1536) {
            await page.getByRole("button", { name, exact: true }).click();
          }
        };
        const editorBrush = page.locator(
          '[data-workspace-brush-field="editorHero"]',
        );
        const styleSelector = page.locator("[data-style-preset-selector]");
        const classicStyle = styleSelector.locator(
          'input[value="classic-editorial-v1"]',
        );
        const modernStyle = styleSelector.locator(
          'input[value="modern-minimal-v1"]',
        );
        const warmStyle = styleSelector.locator(
          'input[value="warm-organic-v1"]',
        );
        await expect(editorBrush).toHaveCount(1);
        await expect(editorBrush).toHaveAttribute("aria-hidden", "true");
        await expect(editorBrush).toHaveClass(/pointer-events-none/);
        await expect(
          previewPane.locator("[data-workspace-brush-field]"),
        ).toHaveCount(0);
        await expect(editorPane).toBeVisible();
        await expect(styleSelector.getByRole("radio")).toHaveCount(3);
        await expect(classicStyle).toBeChecked();
        await expect(modernStyle).not.toBeChecked();
        await expect(warmStyle).toBeEnabled();
        await expect(warmStyle).not.toBeChecked();
        await expect(warmStyle).toHaveAttribute("aria-describedby", /.+/);
        await classicStyle.focus();
        await page.keyboard.press("ArrowRight");
        await expect(modernStyle).toBeChecked();
        await expect(modernStyle).toBeFocused();
        await expect(
          page.getByRole("button", { name: "Save draft", exact: true }),
        ).toBeEnabled();
        await showWorkspacePane("Preview draft");
        await expect(previewRoot).toBeVisible();
        await expect(previewRoot).toHaveAttribute(
          "data-tenant-style",
          "modern-minimal-v1",
        );
        await showWorkspacePane("Edit website");
        await modernStyle.focus();
        await page.keyboard.press("ArrowRight");
        await expect(warmStyle).toBeChecked();
        await expect(warmStyle).toBeFocused();
        await showWorkspacePane("Preview draft");
        await expect(previewRoot).toHaveAttribute(
          "data-tenant-style",
          "warm-organic-v1",
        );
        await expect
          .poll(() =>
            previewRoot.evaluate((element) =>
              getComputedStyle(element)
                .getPropertyValue("--tenant-font-display")
                .trim(),
            ),
          )
          .toMatch(/Fraunces/i);

        await showWorkspacePane("Edit website");
        await editorPane.getByRole("tab", { name: "Registration" }).click();
        await expect(
          editorPane.getByText("Customer registration copy"),
        ).toBeVisible();
        await showWorkspacePane("Preview draft");
        await expect(
          preview.locator('[data-customer-auth-chrome="headerless"]'),
        ).toBeVisible();
        const registrationPreview = preview.locator(
          '[data-public-site-edit-path="register.headline.en"]',
        );
        await expect(registrationPreview.locator("form")).toBeVisible();
        await expect(
          registrationPreview.getByRole("heading", {
            name: "Everything you make, together.",
            exact: true,
          }),
        ).toBeVisible();

        await showWorkspacePane("Edit website");
        await editorPane.getByRole("tab", { name: "Customer portal" }).click();
        await expect(
          editorPane.getByText("Customer dashboard welcome"),
        ).toBeVisible();
        await expect(editorPane.getByText("Portal appearance")).toBeVisible();
        await expect(
          editorPane.getByLabel("Header background hex value"),
        ).toHaveValue("#EDE7DC");
        await expect(
          editorPane.getByLabel("Primary button colour hex value"),
        ).toHaveValue("#365BCB");
        await expect(
          editorPane.getByLabel("Calendar background hex value"),
        ).toHaveValue("#FFFDF8");
        await expect(
          editorPane.getByLabel("Profile menu background hex value"),
        ).toHaveValue("#F6EDE2");
        await showWorkspacePane("Preview draft");
        await expect(
          preview.locator("[data-customer-portal-theme]"),
        ).toBeVisible();
        await expect(
          preview.locator("[data-customer-portal-header]"),
        ).toBeVisible();
        await expect(
          preview.locator("[data-customer-portal-calendar]"),
        ).toBeVisible();
        await expect
          .poll(() =>
            previewRoot.evaluate((element) => ({
              button: getComputedStyle(element)
                .getPropertyValue("--tenant-portal-button")
                .trim(),
              calendar: getComputedStyle(element)
                .getPropertyValue("--tenant-portal-calendar-background")
                .trim(),
              header: getComputedStyle(element)
                .getPropertyValue("--tenant-portal-header-background")
                .trim(),
              profile: getComputedStyle(element)
                .getPropertyValue("--tenant-portal-profile-background")
                .trim(),
            })),
          )
          .toEqual({
            button: "#365BCB",
            calendar: "#FFFDF8",
            header: "#EDE7DC",
            profile: "#F6EDE2",
          });

        await showWorkspacePane("Edit website");
        await editorPane.getByRole("tab", { name: "Branding" }).click();

        const accessibility = await new AxeBuilder({ page })
          .include("[data-style-preset-selector]")
          .analyze();
        expect(
          accessibility.violations.filter(({ impact }) =>
            ["serious", "critical"].includes(impact),
          ),
        ).toEqual([]);
        const editorBox = await expectPaneWithinViewport(
          page,
          editorPane,
          "Website editor",
        );

        if ((viewport?.width ?? 1280) < 1536) {
          initialScreenshotState = "editor";
          await expect(previewPane).toBeHidden();
          await expect(
            page.getByRole("button", {
              name: "Edit website",
              pressed: true,
            }),
          ).toBeVisible();

          const draftActions = page.getByRole("group", {
            name: "Draft actions",
          });
          await expect(draftActions).toBeVisible();
          await expect
            .poll(() =>
              draftActions.evaluate(
                (element) => getComputedStyle(element).position,
              ),
            )
            .toBe("fixed");
        } else {
          initialScreenshotState = "split";
          await expect(previewPane).toBeVisible();
          const previewBox = await expectPaneWithinViewport(
            page,
            previewPane,
            "Website preview",
          );
          expect(
            editorBox.x + editorBox.width,
            "Wide editor and preview panes must not overlap.",
          ).toBeLessThanOrEqual(previewBox.x + 1);
        }
      }

      await attachPageScreenshot(
        page,
        testInfo,
        `${scenario.id}-${initialScreenshotState}`,
      );
      if (
        scenario.id === "public-site-editor" &&
        (viewport?.width ?? 1280) < 1536
      ) {
        const editorPane = page.locator("#public-site-editor-pane");
        const previewPane = page.locator("#public-site-preview-pane");
        await page
          .getByRole("button", {
            name: "Preview draft",
            exact: true,
          })
          .click();
        await expect(editorPane).toBeHidden();
        await expect(previewPane).toBeVisible();
        await expectPaneWithinViewport(page, previewPane, "Website preview");

        const productionPreview = previewPane.locator(
          "[data-public-site-production-preview]",
        );
        const previewFrame = previewPane.locator(
          'iframe[title="Studio Olivie production preview"]',
        );
        await expect(previewFrame).toBeVisible();
        await expect(
          page
            .frameLocator('iframe[title="Studio Olivie production preview"]')
            .locator("[data-tenant-style]")
            .first(),
        ).toHaveAttribute("data-tenant-style", "warm-organic-v1");
        const desktopPreview = page.getByRole("button", {
          name: "Desktop preview",
        });
        const tabletPreview = page.getByRole("button", {
          name: "Tablet preview",
        });
        const mobilePreview = page.getByRole("button", {
          name: "Mobile preview",
        });
        await tabletPreview.click();
        await expect(productionPreview).toHaveAttribute(
          "data-preview-device",
          "tablet",
        );
        await mobilePreview.click();
        await expect(productionPreview).toHaveAttribute(
          "data-preview-device",
          "mobile",
        );
        await desktopPreview.click();
        await expect(productionPreview).toHaveAttribute(
          "data-preview-device",
          "desktop",
        );
        if ((viewport?.width ?? 1280) < 640) {
          await mobilePreview.click();
          await expect(productionPreview).toHaveAttribute(
            "data-preview-device",
            "mobile",
          );
          await expect
            .poll(async () => (await previewFrame.boundingBox())?.width)
            .toBe(390);
        }

        await expect(
          page.getByRole("button", {
            name: "Preview draft",
            pressed: true,
          }),
        ).toBeVisible();
        await expectSoundPage({
          handledRequests,
          page,
          pageErrors,
          requiredApiRequests: scenario.requiredApiRequests,
          unexpectedRequests,
          expectedPathname: scenario.expectedPathname ?? scenario.pathname,
          expectedSearchParams: scenario.expectedSearchParams,
        });
        await attachPageScreenshot(page, testInfo, `${scenario.id}-preview`);
      }

      if (scenario.id === "overview" && viewport?.width >= 1280) {
        await page
          .getByRole("button", {
            name: "Collapse studio navigation",
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Expand studio navigation",
            exact: true,
          }),
        ).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              (storageKey) => window.localStorage.getItem(storageKey),
              getVisualSidebarStorageKey(),
            ),
          )
          .toBe("collapsed");
        await expectDesktopSidebarGeometry(page, 72);

        await expectSoundPage({
          handledRequests,
          page,
          pageErrors,
          requiredApiRequests: scenario.requiredApiRequests,
          unexpectedRequests,
          expectedPathname: scenario.expectedPathname ?? scenario.pathname,
          expectedSearchParams: scenario.expectedSearchParams,
        });
        await attachPageScreenshot(page, testInfo, `${scenario.id}-collapsed`);
      }

      await expectSoundPage({
        handledRequests,
        page,
        pageErrors,
        requiredApiRequests: scenario.requiredApiRequests,
        unexpectedRequests,
        expectedPathname: scenario.expectedPathname ?? scenario.pathname,
        expectedSearchParams: scenario.expectedSearchParams,
      });
    });
  }
});
