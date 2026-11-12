import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  VISUAL_IDS,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
  responseForRequest,
} from "./admin-fixtures.js";

const DESKTOP_BREAKPOINT = 1280;

const localeScenarios = ["en", "cs"].map((locale) => {
  const messages = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "src", "messages", `${locale}.json`),
      "utf8",
    ),
  );

  return {
    locale,
    copy: messages.Onboarding,
    headerCopy: messages.Header,
    language:
      locale === "cs"
        ? {
            alternateName: "English",
            alternateShortLabel: "EN",
            currentName: "Čeština",
            currentShortLabel: "CS",
          }
        : {
            alternateName: "Čeština",
            alternateShortLabel: "CS",
            currentName: "English",
            currentShortLabel: "EN",
          },
    setupCopy: messages.SetupCenter,
  };
});

const normalizeText = (value) =>
  String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatAxeViolations = (violations) =>
  violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.flatMap((node) => node.target),
  }));

async function installOnboardingMocks(page, locale) {
  const api = await installAdminApiMocks(page);
  const requests = { complete: 0, patches: [] };
  let onboardingCompleted = false;

  // These deployment-only scripts are absent from the local production server.
  // Match just the two known paths; all other resource errors still fail.
  for (const script of ["insights", "speed-insights"]) {
    await page.route(
      `${VISUAL_TENANT_ORIGIN}/_vercel/${script}/script.js`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "",
        }),
    );
  }

  // Workspace routes follow the tenant's admin language, including onboarding.
  await page.route("**/auth/refresh", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.fallback();
      return;
    }

    const session = responseForRequest({
      method: "POST",
      url: new URL(request.url()),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin":
          request.headers().origin || VISUAL_TENANT_ORIGIN,
        "cache-control": "no-store",
        vary: "Origin",
      },
      body: JSON.stringify({
        ...session,
        tenant: {
          ...session.tenant,
          settings: { ...session.tenant.settings, adminLanguage: locale },
        },
      }),
    });
  });

  await page.route("**/tenants/current/onboarding**", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const pathname = new URL(request.url()).pathname.replace(/\/+$/, "");
    const origin = request.headers().origin || VISUAL_TENANT_ORIGIN;
    const headers = {
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "access-control-allow-origin": origin,
      "cache-control": "no-store",
      vary: "Origin",
    };

    if (method === "OPTIONS") {
      await route.fulfill({ headers, status: 204 });
      return;
    }

    if (method === "PATCH") {
      requests.patches.push(request.postDataJSON());
      await route.fulfill({
        body: JSON.stringify({ onboarding: { completed: false } }),
        contentType: "application/json",
        headers,
        status: 200,
      });
      return;
    }

    if (method === "POST" && pathname.endsWith("/complete")) {
      requests.complete += 1;
      onboardingCompleted = true;
      await route.fulfill({
        body: JSON.stringify({
          onboarding: { completed: true },
          primaryLocation: { _id: VISUAL_IDS.location },
          tenant: { id: VISUAL_IDS.tenant },
        }),
        contentType: "application/json",
        headers,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        onboarding: {
          businessDetails: { country: "Czech Republic" },
          businessType: "pottery_studio",
          completed: onboardingCompleted,
        },
        tenant: {
          id: VISUAL_IDS.tenant,
          name: "Studio Alpha",
          settings: {
            adminLanguage: locale,
            currency: "CZK",
            timezone: "Europe/Prague",
          },
          slug: "studio-alpha",
        },
      }),
      contentType: "application/json",
      headers,
      status: 200,
    });
  });

  return { ...api, requests };
}

async function waitForStablePage(page, heading) {
  await expect(page.getByRole("form", { name: heading })).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
}

async function expectTouchTarget(locator, name) {
  await expect(locator, `${name} must be visible.`).toBeVisible();
  const box = await locator.boundingBox();

  expect(box, `${name} must be measurable.`).not.toBeNull();
  expect(
    box.width,
    `${name} must be at least 44px wide.`,
  ).toBeGreaterThanOrEqual(44);
  expect(
    box.height,
    `${name} must be at least 44px tall.`,
  ).toBeGreaterThanOrEqual(44);
}

async function expectNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
  }));

  expect(
    Math.max(geometry.bodyScrollWidth, geometry.rootScrollWidth),
    `Onboarding overflowed horizontally: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

async function expectPublicStudioDesign(page, card, submit) {
  const surface = page.locator("[data-onboarding-page]");
  await expect(surface).toHaveAttribute("data-skab-public-surface");
  await expect(surface).toHaveCSS("background-color", "rgb(245, 241, 233)");
  await expect(surface).toHaveCSS("color", "rgb(32, 40, 36)");
  await expect(surface).toHaveCSS("font-family", /^"?Switzer"?,/);
  await expect(card).toHaveCSS("background-color", "rgb(255, 254, 251)");
  await expect(card).toHaveCSS("border-radius", "4px");
  await expect(submit).toHaveCSS("background-color", "rgb(38, 60, 213)");
  await expect(submit).toHaveCSS("font-family", /^"?Switzer"?,/);
}

async function expectIntegratedOnboardingHeader(page, copy) {
  const header = page.locator("header[data-onboarding-header]");
  const brandSurface = header.locator("[data-onboarding-brand]");
  const brand = brandSurface.getByRole("link", { name: "shario.io home" });
  const actionSurface = header.locator("[data-onboarding-actions]:visible");
  const exit = actionSurface.getByRole("button", {
    exact: true,
    name: copy.header.exit,
  });

  await expect(page.locator("header")).toHaveCount(1);
  await expect(header).toBeVisible();
  await expect(header.locator("nav")).toHaveCount(0);
  await expect(brandSurface).toBeVisible();
  await expect(brand).toBeVisible();
  await expect(actionSurface).toBeVisible();
  await expectTouchTarget(exit, "Exit action");
  await expect(header.locator("a:visible")).toHaveCount(1);
  await expect(header.locator("button:visible")).toHaveCount(2);

  const box = await header.boundingBox();
  const brandBox = await brand.boundingBox();
  const actionSurfaceBox = await actionSurface.boundingBox();
  const style = await header.evaluate((element) => {
    const computed = window.getComputedStyle(element);

    return {
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      position: computed.position,
    };
  });

  expect(box, "The onboarding header must be measurable.").not.toBeNull();
  expect(
    brandBox,
    "The onboarding wordmark must be measurable.",
  ).not.toBeNull();
  expect(
    actionSurfaceBox,
    "The onboarding actions must be measurable.",
  ).not.toBeNull();
  expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
  expect(box.height).toBeGreaterThanOrEqual(72);
  expect(style.position).toBe("absolute");
  expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(style.backgroundImage).toBe("none");

  return { actionSurfaceBox, box, brandBox, header };
}

async function expectCanonicalLanguageSelector(
  page,
  header,
  headerCopy,
  language,
  viewport,
) {
  const trigger = header.locator("[data-language-selector-trigger]:visible");

  await expect(trigger).toHaveCount(1);
  await expect(trigger).toHaveAttribute(
    "aria-label",
    `${headerCopy.changeLanguage} (${language.currentShortLabel})`,
  );

  const triggerBox = await trigger.boundingBox();

  expect(triggerBox, "The language trigger must be measurable.").not.toBeNull();
  expect(triggerBox.width).toBeGreaterThanOrEqual(44);
  expect(triggerBox.height).toBeGreaterThanOrEqual(44);

  await trigger.click();

  const selector = trigger.locator("xpath=parent::div");
  const panel = selector.locator("[data-language-selector-panel]");
  const selectedOption = selector.locator('button[aria-pressed="true"]');
  const alternateOption = selector
    .locator('button[aria-pressed="false"]')
    .filter({ hasText: language.alternateName });

  await expect(panel).toBeVisible();
  await expect(selectedOption).toHaveCount(1);
  await expect(selectedOption).toContainText(language.currentShortLabel);
  await expect(selectedOption).toContainText(language.currentName);
  await expect(
    selectedOption.getByText(language.currentShortLabel, { exact: true }),
  ).toHaveCSS("color", "rgb(38, 60, 213)");
  await expect(alternateOption).toHaveCount(1);
  await expect(alternateOption).toContainText(language.alternateShortLabel);
  await expect(
    alternateOption.getByText(language.alternateShortLabel, { exact: true }),
  ).toHaveCSS("color", "rgb(98, 103, 95)");

  const panelBox = await panel.boundingBox();

  expect(panelBox, "The language popover must be measurable.").not.toBeNull();
  expect(panelBox.x).toBeGreaterThanOrEqual(-1);
  expect(panelBox.y).toBeGreaterThanOrEqual(-1);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height + 1);
  await expectNoHorizontalOverflow(page);

  await trigger.click();
  await expect(panel).toBeHidden();
}

async function expectChoiceLabelsContained(page, card, viewport) {
  const choices = card.locator("fieldset button[aria-pressed]");
  const cardBox = await card.boundingBox();
  const geometry = await choices.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      const label = element.querySelector("strong");
      const labelBox = label?.getBoundingClientRect();
      const labelStyle = label ? window.getComputedStyle(label) : null;

      return {
        bottom: box.bottom,
        clientWidth: label?.clientWidth ?? 0,
        height: box.height,
        labelHeight: labelBox?.height ?? 0,
        lineHeight: Number.parseFloat(labelStyle?.lineHeight || "0"),
        left: box.left,
        right: box.right,
        scrollWidth: label?.scrollWidth ?? 0,
        top: box.top,
        whiteSpace: labelStyle?.whiteSpace,
      };
    }),
  );

  await expect(choices).toHaveCount(5);
  expect(cardBox).not.toBeNull();
  for (const item of geometry) {
    expect(item.left).toBeGreaterThanOrEqual(cardBox.x - 1);
    expect(item.right).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
    expect(item.height).toBeLessThanOrEqual(viewport.width >= 640 ? 52 : 72);
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
    if (viewport.width >= 640) {
      expect(item.labelHeight).toBeLessThanOrEqual(item.lineHeight + 1);
      expect(item.whiteSpace).toBe("nowrap");
    }
  }

  for (let index = 0; index < geometry.length; index += 1) {
    for (let other = index + 1; other < geometry.length; other += 1) {
      const first = geometry[index];
      const second = geometry[other];
      const overlaps =
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top;

      expect(overlaps, `Studio choices ${index} and ${other} overlap.`).toBe(
        false,
      );
    }
  }
}

async function expectSingleSelectChevrons(card) {
  const selects = card.getByRole("combobox");

  await expect(selects).toHaveCount(3);
  for (const select of await selects.all()) {
    expect(
      await select.evaluate(
        (element) => getComputedStyle(element).backgroundImage,
      ),
    ).toBe("none");
    const chevron = select.locator("xpath=..").locator("[data-select-chevron]");

    await expect(chevron).toHaveCount(1);
    await expect(chevron).toBeVisible();

    const selectBox = await select.boundingBox();
    const chevronBox = await chevron.boundingBox();

    expect(selectBox).not.toBeNull();
    expect(chevronBox).not.toBeNull();
    expect(chevronBox.width).toBeGreaterThanOrEqual(17);
    expect(chevronBox.width).toBeLessThanOrEqual(19);
    expect(chevronBox.x).toBeGreaterThanOrEqual(selectBox.x);
    expect(chevronBox.x + chevronBox.width).toBeLessThanOrEqual(
      selectBox.x + selectBox.width,
    );
    expect(
      Math.abs(
        chevronBox.y +
          chevronBox.height / 2 -
          (selectBox.y + selectBox.height / 2),
      ),
    ).toBeLessThanOrEqual(1);
  }
}

async function attachScreenshot(page, testInfo, name) {
  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });

  await testInfo.attach(`${name}-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
}

for (const {
  locale,
  copy,
  headerCopy,
  language,
  setupCopy,
} of localeScenarios) {
  test(`${locale.toUpperCase()} tenant onboarding is responsive, accessible and functional`, async ({
    page,
  }, testInfo) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const { requests, unexpectedRequests } = await installOnboardingMocks(
      page,
      locale,
    );
    const heading = normalizeText(copy.headings.title);

    await page.goto(
      `${VISUAL_TENANT_ORIGIN}/${locale}/app/onboarding?source=registration#essentials`,
    );
    await waitForStablePage(page, heading);

    const viewport = page.viewportSize();
    const onboardingPage = page.locator("[data-onboarding-page]");
    const grid = page.locator("[data-onboarding-grid]");
    const leftPanel = page.locator("[data-onboarding-left]");
    const card = page.locator("[data-onboarding-card]");
    const visual = page.locator("[data-onboarding-visual]");
    const submit = card.getByRole("button", {
      name: copy.actions.openLaunchCenter,
    });

    await expect(onboardingPage).toHaveCount(1);
    await expect(grid).toHaveCount(1);
    await expect(leftPanel).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(card).toBeVisible();
    await expectPublicStudioDesign(page, card, submit);
    await expect(
      page.getByRole("textbox", { name: copy.studio.name }),
    ).toHaveValue("Studio Alpha");
    await expect(page.getByRole("combobox")).toHaveCount(3);
    await expect(
      card.getByRole("button", {
        name: copy.studio.types.pottery_studio,
      }),
    ).toHaveAttribute("aria-pressed", "true");

    const {
      actionSurfaceBox,
      box: headerBox,
      brandBox,
      header,
    } = await expectIntegratedOnboardingHeader(page, copy);

    await expectCanonicalLanguageSelector(
      page,
      header,
      headerCopy,
      language,
      viewport,
    );

    const gridBox = await grid.boundingBox();
    const leftPanelBox = await leftPanel.boundingBox();
    const cardBox = await card.boundingBox();

    expect(headerBox).not.toBeNull();
    expect(
      gridBox,
      "The onboarding split grid must be measurable.",
    ).not.toBeNull();
    expect(
      leftPanelBox,
      "The onboarding form panel must be measurable.",
    ).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(Math.abs(gridBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(leftPanelBox.y)).toBeLessThanOrEqual(1);
    expect(
      leftPanelBox.y + leftPanelBox.height,
      "The onboarding form panel must cover the viewport height.",
    ).toBeGreaterThanOrEqual(viewport.height - 1);
    expect(cardBox.y).toBeGreaterThanOrEqual(
      headerBox.y + headerBox.height - 1,
    );
    expect(cardBox.x).toBeGreaterThanOrEqual(-1);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);

    await expectChoiceLabelsContained(page, card, viewport);
    await expectSingleSelectChevrons(card);
    await expectTouchTarget(submit, "Launch Center action");
    for (const choice of await card
      .locator("fieldset button[aria-pressed]")
      .all()) {
      await expectTouchTarget(choice, "Studio type choice");
    }

    if (viewport.width >= DESKTOP_BREAKPOINT) {
      await expect(visual).toBeVisible();
      await expect(
        visual.getByText(copy.sidebar.cardTitle, { exact: true }),
      ).toBeVisible();
      const storyBox = await visual
        .locator("[data-onboarding-story]")
        .boundingBox();
      const previewBox = await visual
        .locator("[data-onboarding-preview]")
        .boundingBox();
      const visualBox = await visual.boundingBox();

      expect(storyBox).not.toBeNull();
      expect(previewBox).not.toBeNull();
      expect(visualBox).not.toBeNull();
      expect(
        Math.abs(visualBox.y),
        "The editorial panel must begin at the viewport top behind the setup chrome.",
      ).toBeLessThanOrEqual(1);
      expect(
        visualBox.y + visualBox.height,
        "The editorial panel must reach the viewport bottom.",
      ).toBeGreaterThanOrEqual(viewport.height - 1);
      expect(
        visualBox.y + visualBox.height,
        "The editorial panel must not extend below the viewport.",
      ).toBeLessThanOrEqual(viewport.height + 1);
      expect(
        brandBox.x + brandBox.width / 2,
        "The wordmark must remain over the onboarding form panel.",
      ).toBeLessThan(visualBox.x + 1);
      expect(
        actionSurfaceBox.x + actionSurfaceBox.width / 2,
        "The language and Exit actions must remain over the editorial panel.",
      ).toBeGreaterThanOrEqual(visualBox.x - 1);
      expect(storyBox.y + storyBox.height).toBeLessThanOrEqual(
        previewBox.y + 1,
      );
      expect(previewBox.y).toBeGreaterThanOrEqual(
        headerBox.y + headerBox.height - 1,
      );
      expect(previewBox.y + previewBox.height).toBeLessThanOrEqual(
        visualBox.y + visualBox.height + 1,
      );
      await expect(visual).toHaveCSS("background-color", "rgb(236, 236, 223)");
    } else {
      await expect(visual).toBeHidden();
      const rightGutter = viewport.width - (cardBox.x + cardBox.width);

      expect(
        actionSurfaceBox.x + actionSurfaceBox.width,
        "Compact setup actions must remain inside the form panel.",
      ).toBeLessThanOrEqual(leftPanelBox.x + leftPanelBox.width + 1);
      expect(cardBox.x).toBeGreaterThanOrEqual(15);
      if (viewport.width >= 768) {
        expect(
          cardBox.width,
          "The centered tablet form must retain its readable width.",
        ).toBeCloseTo(620, 0);
      } else {
        expect(cardBox.x).toBeLessThanOrEqual(48);
      }
      expect(Math.abs(cardBox.x - rightGutter)).toBeLessThanOrEqual(2);
    }

    if (viewport.height >= 900 && viewport.width >= 768) {
      await expect(submit).toBeInViewport({ ratio: 0.95 });
    }

    await expectNoHorizontalOverflow(page);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      formatAxeViolations(accessibility.violations),
      "Tenant onboarding must have no Axe accessibility violations.",
    ).toEqual([]);
    await attachScreenshot(
      page,
      testInfo,
      `tenant-onboarding-${locale}-initial`,
    );

    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport({ ratio: 0.95 });
    await expectNoHorizontalOverflow(page);
    await attachScreenshot(page, testInfo, `tenant-onboarding-${locale}-cta`);

    await card
      .getByRole("button", { name: copy.studio.types.art_studio })
      .click();
    await page
      .getByRole("combobox", { name: copy.business.country })
      .selectOption("Denmark");
    await page
      .getByRole("combobox", { name: copy.business.currency })
      .selectOption("EUR");
    await page
      .getByRole("combobox", { name: copy.business.timezone })
      .selectOption("Europe/Copenhagen");
    const setupDocumentResponsePromise = page.waitForResponse((response) => {
      const responseUrl = new URL(response.url());

      return (
        response.request().isNavigationRequest() &&
        responseUrl.origin === VISUAL_TENANT_ORIGIN &&
        responseUrl.pathname === `/${locale}/app/setup`
      );
    });
    await submit.click();

    await expect.poll(() => requests.patches.length).toBe(2);
    expect(requests.patches).toEqual([
      {
        businessType: "art_studio",
        step: 1,
        tenantName: "Studio Alpha",
      },
      {
        businessDetails: { country: "Denmark" },
        settings: { currency: "EUR", timezone: "Europe/Copenhagen" },
        step: 2,
      },
    ]);
    await expect.poll(() => requests.complete).toBe(1);
    const setupDocumentResponse = await setupDocumentResponsePromise;
    expect(
      setupDocumentResponse.status(),
      `Launch Center document request failed: ${setupDocumentResponse.url()}`,
    ).toBe(200);
    await expect(page).toHaveURL(
      new RegExp(`^${VISUAL_TENANT_ORIGIN}/${locale}/app/setup`),
    );
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(
      new RegExp(`^${VISUAL_TENANT_ORIGIN}/${locale}/app/setup`),
    );
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: setupCopy.completion.paymentsTitle,
      }),
    ).toBeVisible();

    expect([...unexpectedRequests]).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
