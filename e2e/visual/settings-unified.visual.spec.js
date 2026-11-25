import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import {
  ADMIN_OVERVIEW_SCENARIOS,
  VISUAL_FIXED_TIME,
  VISUAL_IDS,
  installAdminApiMocks,
  visualWorkspaceAccess,
} from "./admin-fixtures.js";

const messages = Object.fromEntries(
  ["cs", "en"].map((locale) => [
    locale,
    JSON.parse(readFileSync(`src/messages/${locale}.json`, "utf8")),
  ]),
);
const standardVisualProjects = new Set([
  "desktop-1440",
  "tablet-768",
  "mobile-320",
]);

test.beforeEach(({}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("settings-") &&
      !standardVisualProjects.has(testInfo.project.name),
    "Settings coverage uses representative desktop, tablet and small phone projects.",
  );
});

const settingsLink = (root, locale, suffix) =>
  root.locator(`a[href="/${locale}/app/settings${suffix}"]`);

async function expectNoHorizontalOverflow(page, root) {
  const issues = await root.evaluate((element) => {
    const viewport = document.documentElement.clientWidth;
    return [element, ...element.querySelectorAll("*")].flatMap((node) => {
      if (!(node instanceof HTMLElement)) return [];
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (
        !rect.width ||
        !rect.height ||
        style.visibility === "hidden" ||
        style.clip !== "auto" ||
        node.closest('[aria-hidden="true"]')
      )
        return [];
      return rect.left < -1 || rect.right > viewport + 1
        ? [
            {
              text: node.textContent.trim().slice(0, 80),
              left: rect.left,
              right: rect.right,
            },
          ]
        : [];
    });
  });
  expect(issues).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

async function prepare(
  page,
  baseURL,
  locale,
  {
    staff = false,
    incomplete = false,
    subscriptionPlan = "studio_plus",
    subscriptionStatus = "active",
  } = {},
) {
  const errors = [];
  let subscriptionRequests = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const fixture = await installAdminApiMocks(page, {
    workspaceLocale: locale,
    overviewScenario: incomplete
      ? ADMIN_OVERVIEW_SCENARIOS.DENSE_GUIDED
      : ADMIN_OVERVIEW_SCENARIOS.COMPLETE_LEARNING,
    ...(staff
      ? {
          workspaceAccess: {
            ...visualWorkspaceAccess,
            role: "staff",
            roleKey: "staff",
            permissions: ["workspace.view", "bookings.view"],
            effectivePermissions: ["workspace.view", "bookings.view"],
          },
        }
      : {}),
  });
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/tenants\/current\/subscription$/,
    async (route) => {
      const headers = {
        "access-control-allow-origin": new URL(baseURL).origin,
        "access-control-allow-credentials": "true",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,OPTIONS",
      };
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers });
        return;
      }
      subscriptionRequests += 1;
      await route.fulfill({
        json: {
          tenant: { id: VISUAL_IDS.tenant, plan: subscriptionPlan },
          subscription: {
            billingPlan: subscriptionPlan,
            status: subscriptionStatus,
            billingInterval: "monthly",
            hasStripeSubscription: true,
            ...(subscriptionStatus === "trialing"
              ? { trialEndsAt: "2026-08-13T00:00:00.000Z" }
              : {}),
          },
          access: {
            mode: "full",
            remainingTrialDays: subscriptionStatus === "trialing" ? 14 : 0,
          },
          permissions: { canManageBilling: !staff },
        },
        headers,
      });
    },
  );
  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/account$/,
    async (route) => {
      await route.fulfill({
        json: {
          account: {
            id: VISUAL_IDS.owner,
            firstname: "Martin",
            lastname: "Matějů",
            email: "owner@studio-alpha.test",
            phone: "+420777123456",
          },
        },
        headers: {
          "access-control-allow-origin": new URL(baseURL).origin,
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "authorization,content-type",
          "access-control-allow-methods": "GET,OPTIONS",
        },
      });
    },
  );
  await page.context().addCookies([
    {
      name: "shario_language",
      value: locale.toUpperCase(),
      url: new URL(baseURL).origin,
      sameSite: "Lax",
    },
  ]);
  return {
    ...fixture,
    errors,
    subscriptionRequests: () => subscriptionRequests,
  };
}

async function open(page, baseURL, locale, path) {
  await page.goto(new URL(`/${locale}/app${path}`, baseURL).toString(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("[data-settings-hub]")).toBeVisible({
    timeout: 45_000,
  });
}

async function expectSettingsSummary(
  page,
  hub,
  locale,
  { staff = false } = {},
) {
  const t = messages[locale];
  const plan = hub.locator("[data-settings-plan-summary]");
  const planName = plan.locator("[data-settings-plan-name]");
  const language = hub.locator("[data-settings-language]");
  await expect(planName).toHaveText(
    t.Billing.plans[staff ? "professional" : "studio_plus"],
  );
  await expect(planName).toBeInViewport({ ratio: 1 });
  const planTextLayout = await planName.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }));
  expect(planTextLayout.height).toBeLessThanOrEqual(
    planTextLayout.lineHeight + 0.5,
  );
  await expect(language).toContainText(locale === "cs" ? "Čeština" : "English");
  const languageLink = language.getByRole("link", {
    name: t.UnifiedSettings.language.change,
    exact: true,
  });
  if (staff) {
    await expect(languageLink).toHaveCount(0);
    await expect(language).toContainText(
      t.UnifiedSettings.language.managedByAdmin,
    );
    await expect(language).toBeInViewport();
    await expect(plan.locator("[data-settings-plan-status]")).toHaveCount(0);
    await expect(plan.getByRole("link")).toHaveCount(0);
  } else {
    await expect(plan.locator("[data-settings-plan-status]")).toHaveText(
      t.Billing.statuses.active,
    );
    await expect(languageLink).toHaveAttribute(
      "href",
      `/${locale}/app/settings/general#workspace-language`,
    );
    await expect(languageLink).toBeInViewport({ ratio: 1 });
    const box = await languageLink.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44 - 0.01);
  }
  const typography = await page.evaluate(() => {
    const settingsTitle = document.querySelector("[data-settings-hub] h2");
    const pageTitle = document.querySelector("[data-workspace-topbar-row] h1");
    const search = document.querySelector(
      '[data-settings-hub] input[type="search"]',
    );
    return {
      settingsFont: getComputedStyle(settingsTitle).fontFamily,
      pageFont: getComputedStyle(pageTitle).fontFamily,
      searchFontSize: Number.parseFloat(getComputedStyle(search).fontSize),
    };
  });
  expect(typography.settingsFont).toBe(typography.pageFont);
  if (page.viewportSize().width < 640) {
    expect(typography.searchFontSize).toBeGreaterThanOrEqual(16);
  }
}

async function expectPersonalMenu(page, locale) {
  const t = messages[locale];
  await page
    .getByRole("button", { name: t.Header.account.menu, exact: true })
    .click();
  const panel = page.locator("[data-profile-menu-panel]");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("link")).toHaveCount(1);
  await expect(
    panel.getByRole("link", { name: t.UnifiedSettings.personalTitle }),
  ).toHaveAttribute("href", `/${locale}/app/settings?section=personal`);
  await expect(
    panel.getByRole("button", { name: t.Header.account.logout, exact: true }),
  ).toBeVisible();
  await expect(panel).not.toContainText(t.Header.account.language);
  await expect
    .poll(async () =>
      panel.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= -1 &&
          rect.right <= document.documentElement.clientWidth + 1
        );
      }),
    )
    .toBe(true);
  await expectNoHorizontalOverflow(page, panel);
  await panel
    .getByRole("link", { name: t.UnifiedSettings.personalTitle })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/${locale}/app/settings\\?section=personal$`),
  );
}

for (const locale of ["cs", "en"]) {
  test(`${locale}: owners can search scoped settings and use one personal menu on every device`, async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = messages[locale];
    const fixture = await prepare(page, baseURL, locale);
    await open(page, baseURL, locale, "/settings?section=studio");
    const hub = page.locator("[data-settings-hub]");
    const tabs = hub.getByRole("navigation", {
      name: t.UnifiedSettings.navigation,
    });
    await expect(
      hub.getByRole("heading", { name: t.UnifiedSettings.title, exact: true }),
    ).toBeVisible();
    await expect(settingsLink(tabs, locale, "?section=studio")).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(hub).toContainText(t.UnifiedSettings.studioScope);
    await expect(settingsLink(hub, locale, "/general")).toBeVisible();
    await expect(settingsLink(hub, locale, "/roles")).toBeVisible();
    await expect(hub.locator(`a[href="/${locale}/app/setup"]`)).toHaveCount(0);
    await expectSettingsSummary(page, hub, locale);
    expect(fixture.subscriptionRequests()).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page, hub);
    await testInfo.attach(`settings-studio-${locale}.png`, {
      body: await page.screenshot({ fullPage: true, animations: "disabled" }),
      contentType: "image/png",
    });

    await hub
      .locator("[data-settings-language]")
      .getByRole("link", {
        name: t.UnifiedSettings.language.change,
        exact: true,
      })
      .click();
    const languageField = hub
      .locator("#workspace-language")
      .getByRole("combobox");
    await expect(languageField).toHaveValue(locale);
    await expect(languageField).toBeInViewport({ ratio: 1 });
    await open(page, baseURL, locale, "/settings/general#workspace-language");
    await expect(languageField).toHaveValue(locale);
    await expect(languageField).toBeInViewport({ ratio: 1 });
    await open(page, baseURL, locale, "/settings?section=studio");

    const search = hub.getByRole("searchbox", {
      name: t.UnifiedSettings.searchLabel,
    });
    await search.focus();
    await search.pressSequentially(
      t.UnifiedSettings.items.locations.title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    );
    await expect(settingsLink(hub, locale, "/locations")).toBeVisible();
    await expect(settingsLink(hub, locale, "/roles")).toHaveCount(0);
    await search.fill("no-matching-setting-9382");
    await expect(settingsLink(hub, locale, "/locations")).toHaveCount(0);
    await search.fill("");
    await expect(settingsLink(hub, locale, "/roles")).toBeVisible();

    await settingsLink(tabs, locale, "?section=personal").click();
    await expect(
      settingsLink(tabs, locale, "?section=personal"),
    ).toHaveAttribute("aria-current", "page");
    await expect(hub).toContainText(t.UnifiedSettings.personalScope);
    await expect(settingsLink(hub, locale, "/profile")).toBeVisible();
    await expect(
      settingsLink(hub, locale, "/preferences#workspace-preferences"),
    ).toBeVisible();
    await expect(
      settingsLink(hub, locale, "/preferences#notification-preferences"),
    ).toBeVisible();
    await expect(settingsLink(hub, locale, "/roles")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, hub);
    await expectPersonalMenu(page, locale);
    await expectSettingsSummary(page, hub, locale);
    await testInfo.attach(`settings-personal-${locale}.png`, {
      body: await page.screenshot({ fullPage: true, animations: "disabled" }),
      contentType: "image/png",
    });
    await settingsLink(
      hub,
      locale,
      "/preferences#notification-preferences",
    ).click();
    const notifications = hub.locator("#notification-preferences");
    await expect(notifications).toBeVisible();
    await testInfo.attach("notification-anchor-layout.json", {
      body: JSON.stringify(
        await notifications.evaluate((element) => ({
          top: element.getBoundingClientRect().top,
          scrollY: window.scrollY,
          hash: window.location.hash,
          viewportHeight: window.innerHeight,
        })),
      ),
      contentType: "application/json",
    });
    await expect(
      notifications.getByRole("heading", {
        name: t.WorkspacePreferences.notifications.title,
        exact: true,
      }),
    ).toBeInViewport();
    await open(
      page,
      baseURL,
      locale,
      "/settings/preferences#notification-preferences",
    );
    await expect(
      notifications.getByRole("heading", {
        name: t.WorkspacePreferences.notifications.title,
        exact: true,
      }),
    ).toBeInViewport();
    expect([...fixture.unexpectedRequests]).toEqual([]);
    expect(fixture.errors).toEqual([]);
  });

  test(`${locale}: staff can edit their own preferences and follow old links without studio privileges`, async ({
    page,
    baseURL,
  }, testInfo) => {
    const t = messages[locale];
    const fixture = await prepare(page, baseURL, locale, { staff: true });
    await open(page, baseURL, locale, "/settings");
    const hub = page.locator("[data-settings-hub]");
    await expect(hub).toContainText(t.UnifiedSettings.personalScope);
    await expect(settingsLink(hub, locale, "?section=studio")).toHaveCount(0);
    for (const path of ["/general", "/roles", "/team", "/billing", "/payments"])
      await expect(settingsLink(hub, locale, path)).toHaveCount(0);
    await expectSettingsSummary(page, hub, locale, { staff: true });
    expect(fixture.subscriptionRequests()).toBe(0);
    await settingsLink(hub, locale, "/profile").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/app/settings/profile$`),
    );
    await expect(
      hub.getByRole("heading", {
        name: t.AccountSettings.profile.title,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      hub.getByLabel(t.AccountSettings.fields.firstname, { exact: true }),
    ).toHaveValue("Martin");
    await expectNoHorizontalOverflow(page, hub);

    await open(page, baseURL, locale, "/account?from=legacy");
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/app/settings/profile\\?from=legacy$`),
    );
    await expect(
      hub.getByLabel(t.AccountSettings.fields.firstname, { exact: true }),
    ).toHaveValue("Martin");
    await open(
      page,
      baseURL,
      locale,
      "/preferences?from=legacy&source=one&source=two",
    );
    await expect(page).toHaveURL(
      new RegExp(
        `/${locale}/app/settings/preferences\\?from=legacy&source=one&source=two$`,
      ),
    );
    await expect(hub).toContainText(t.UnifiedSettings.personalScope);
    const timezone = hub.getByRole("combobox", {
      name: t.WorkspacePreferences.fields.timezone,
      exact: true,
    });
    await timezone.selectOption("Europe/London");
    await hub
      .getByRole("combobox", {
        name: t.WorkspacePreferences.fields.calendarView,
        exact: true,
      })
      .selectOption("day");
    const cancelled = hub.getByRole("checkbox", {
      name: `${t.WorkspacePreferences.notifications.items.bookingCancelled.label} ${t.WorkspacePreferences.notifications.items.bookingCancelled.description}`,
      exact: true,
    });
    await cancelled.uncheck();
    await hub
      .getByRole("button", {
        name: t.WorkspacePreferences.actions.save,
        exact: true,
      })
      .click();
    await expect(hub.getByRole("status")).toHaveText(
      t.WorkspacePreferences.messages.saved,
    );
    expect(fixture.preferencePatches.at(-1)).toMatchObject({
      displayTimezone: "Europe/London",
      defaultCalendarView: "day",
      notifications: { bookingCancelled: false },
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(timezone).toHaveValue("Europe/London");
    await expect(cancelled).not.toBeChecked();
    await expectNoHorizontalOverflow(page, hub);
    await testInfo.attach(`settings-staff-preferences-${locale}.png`, {
      body: await page.screenshot({ fullPage: true, animations: "disabled" }),
      contentType: "image/png",
    });
    await expectPersonalMenu(page, locale);
    expect(fixture.subscriptionRequests()).toBe(0);
    expect([...fixture.unexpectedRequests]).toEqual([]);
    expect(fixture.errors).toEqual([]);
  });
}

test("incomplete studio setup remains reachable from the settings hub", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(
    !["settings-desktop-1440", "desktop-1440"].includes(testInfo.project.name),
  );
  await prepare(page, baseURL, "en", { incomplete: true });
  await open(page, baseURL, "en", "/settings?section=studio");
  await expect(
    page.locator('[data-settings-hub] a[href="/en/app/setup"]'),
  ).toBeVisible();
});

test("trial plan is explicitly marked instead of appearing as a paid subscription", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(
    !["settings-desktop-1440", "desktop-1440"].includes(testInfo.project.name),
  );
  const fixture = await prepare(page, baseURL, "en", {
    subscriptionPlan: "professional",
    subscriptionStatus: "trialing",
  });
  await open(page, baseURL, "en", "/settings");
  const plan = page.locator("[data-settings-plan-summary]");
  await expect(plan.locator("[data-settings-plan-name]")).toHaveText(
    messages.en.Billing.plans.professional,
  );
  await expect(plan.locator("[data-settings-plan-status]")).toHaveText(
    messages.en.Billing.statuses.trialing,
  );
  await expect(plan.locator("[data-settings-plan-name]")).toBeInViewport({
    ratio: 1,
  });
  expect(fixture.subscriptionRequests()).toBeGreaterThan(0);
  expect([...fixture.unexpectedRequests]).toEqual([]);
  expect(fixture.errors).toEqual([]);
});
