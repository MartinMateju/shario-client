import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installLocalVercelTelemetryRoutes } from "./local-vercel-telemetry";

const TENANT_ORIGIN = "http://studio-alpha.shario.localhost:4310";
const LONG_COPY_TENANT_ORIGIN = "http://studio-long.shario.localhost:4310";
const REPRESENTATIVE_PRESET_SCENARIOS = [
  {
    id: "classic-editorial-v1",
    origin: "http://studio-classic.shario.localhost:4310",
    font: /Manrope/i,
    cardRadius: "1.5rem",
    panelRadius: "2rem",
    minimumButtonHeight: 48,
    imageFilter: "saturate(0.96) contrast(1.02)",
  },
  {
    id: "warm-organic-v1",
    origin: "http://studio-warm.shario.localhost:4310",
    font: /Manrope/i,
    cardRadius: "2rem 1rem 2rem 1rem",
    panelRadius: "2.75rem 1.5rem 2.75rem 1.5rem",
    minimumButtonHeight: 50,
    imageFilter: "saturate(0.9) sepia(0.08) contrast(0.98)",
  },
];
const DESKTOP_BREAKPOINT = 1024;
const REGISTRATION_PROJECTS = new Set([
  "mobile-320",
  "tablet-768",
  "tablet-1024",
  "laptop-1280-short",
]);

const repeatToLength = (value, length) =>
  value.repeat(Math.ceil(length / value.length)).slice(0, length);

const longCopy = {
  headline: repeatToLength(
    "A welcoming account for every member and every shared creative session. ",
    160,
  ),
  supportingText: repeatToLength(
    "Keep upcoming bookings, memberships, course details and credits together in one calm customer space. ",
    800,
  ),
  helpText: repeatToLength(
    "If you need help accessing the account, contact the studio team and they will help you continue safely. ",
    800,
  ),
};

const localeScenarios = [
  {
    locale: "en",
    copy: {
      formTitle: "Sign in",
      heroDescription: "Bookings, memberships and credits in one calm place.",
      heroTitle: "Welcome back to your studio.",
      registerFormTitle: "Create account",
      registerHeroTitle: "Everything you create, kept together.",
      registerSubmit: "Register",
      submit: "Sign in",
    },
  },
  {
    locale: "cs",
    copy: {
      formTitle: "Přihlášení",
      heroDescription: "Rezervace, členství a kredity na jednom klidném místě.",
      heroTitle: "Vítejte zpět v ateliéru.",
      registerFormTitle: "Vytvořit účet",
      registerHeroTitle: "Vše, co tvoříte, přehledně spolu.",
      registerSubmit: "Registrovat se",
      submit: "Přihlásit se",
    },
  },
];

const heroSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#b9c9bf"/>
        <stop offset="0.52" stop-color="#8fa89b"/>
        <stop offset="1" stop-color="#6d8278"/>
      </linearGradient>
      <linearGradient id="coral" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f0b09a"/>
        <stop offset="1" stop-color="#c85f48"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="1400" fill="url(#bg)"/>
    <circle cx="870" cy="290" r="270" fill="#f1ddd0" opacity="0.45"/>
    <ellipse cx="560" cy="900" rx="360" ry="170" fill="#263b33" opacity="0.18"/>
    <rect x="245" y="425" width="710" height="460" rx="48" fill="url(#coral)"/>
    <rect x="335" y="520" width="530" height="60" rx="18" fill="#fff7ef" opacity="0.8"/>
    <rect x="335" y="625" width="355" height="45" rx="14" fill="#fff7ef" opacity="0.6"/>
    <circle cx="820" cy="900" r="140" fill="#dae9df"/>
  </svg>`;

const logoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 300">
    <rect x="8" y="8" width="104" height="284" rx="32" fill="#f5f1ea"/>
    <circle cx="60" cy="108" r="38" fill="#2748d8"/>
    <path d="M38 118c12-34 32-34 44 0-14-10-30-10-44 0Z" fill="white"/>
    <text x="60" y="218" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#22221f">Nami</text>
  </svg>`;

const formatAxeViolations = (violations) =>
  violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.flatMap((node) => node.target),
  }));

const isExpectedAnonymousRefreshError = (message) => {
  if (
    message.type() !== "error" ||
    !message.text().includes("401 (Unauthorized)")
  ) {
    return false;
  }

  try {
    return ["/auth/refresh", "/auth/customer/refresh"].includes(
      new URL(message.location().url).pathname,
    );
  } catch {
    return false;
  }
};

async function installAssetRoutes(page) {
  await installLocalVercelTelemetryRoutes(page);
  await page.route("https://visual-assets.example.test/**", async (route) => {
    const logo = route.request().url().endsWith("logo.svg");

    await route.fulfill({
      body: logo ? logoSvg : heroSvg,
      contentType: "image/svg+xml",
      status: 200,
    });
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
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    root: document.documentElement.scrollWidth,
  }));

  expect(
    Math.max(geometry.body, geometry.root),
    `Page overflowed horizontally: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.client + 1);
}

for (const { locale } of localeScenarios) {
  test(`${locale.toUpperCase()} public studio hero is responsive, branded and accessible`, async ({
    page,
  }, testInfo) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !isExpectedAnonymousRefreshError(message)
      ) {
        consoleErrors.push({
          message: message.text(),
          url: message.location().url,
        });
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await installAssetRoutes(page);
    await page.goto(`${TENANT_ORIGIN}/${locale}`, {
      waitUntil: "domcontentloaded",
    });

    const hero = page.locator("[data-public-tenant-hero]");
    const media = page.locator('[data-public-tenant-hero-media="image"]');
    const image = media.locator("[data-public-tenant-hero-image]");

    await expect(hero).toBeVisible({ timeout: 20_000 });
    await expect(media).toBeVisible();
    await expect(image).toBeVisible();
    await expect(media.locator("[data-public-tenant-hero-brand]")).toHaveCount(
      0,
    );
    await expect(media.locator('[data-testid="brush-swash"]')).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect
      .poll(() => image.evaluate((element) => element.naturalWidth))
      .toBeGreaterThan(0);
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });

    const modernStyles = await hero.evaluate((element) => {
      const root = element.closest("[data-tenant-style]");
      const heading = element.querySelector('[data-tenant-type="display"]');
      const section = root?.querySelector("[data-public-tenant-ways-to-visit]");
      const primaryAction = root?.querySelector(
        "[data-public-tenant-primary-action]",
      );
      const card = root?.querySelector("[data-public-tenant-service]");

      if (!root || !heading || !section || !primaryAction || !card) {
        return null;
      }

      const rootStyle = getComputedStyle(root);
      const headingStyle = getComputedStyle(heading);
      const sectionStyle = getComputedStyle(section);
      const actionStyle = getComputedStyle(primaryAction);
      const cardStyle = getComputedStyle(card);

      return {
        preset: root.getAttribute("data-tenant-style"),
        displayFont: headingStyle.fontFamily,
        displayTracking: Number.parseFloat(headingStyle.letterSpacing),
        displayTransform: headingStyle.textTransform,
        pageInline: rootStyle
          .getPropertyValue("--tenant-space-page-inline")
          .trim(),
        sectionPaddingLeft: Number.parseFloat(sectionStyle.paddingLeft),
        buttonMinHeight: rootStyle
          .getPropertyValue("--tenant-button-min-height")
          .trim(),
        actionMinHeight: actionStyle.minHeight,
        actionHeight: primaryAction.getBoundingClientRect().height,
        actionRadius: actionStyle.borderRadius,
        actionShadow: actionStyle.boxShadow,
        actionTransform: actionStyle.textTransform,
        cardRadius: cardStyle.borderRadius,
        cardShadow: cardStyle.boxShadow,
      };
    });

    expect(modernStyles).not.toBeNull();
    expect(modernStyles.preset).toBe("modern-minimal-v1");
    expect(modernStyles.displayFont).toMatch(/Manrope/i);
    expect(modernStyles.displayTracking).toBeLessThan(0);
    expect(modernStyles.displayTransform).toBe("none");
    expect(modernStyles.pageInline).toBe("clamp(1rem, 3vw, 2rem)");
    expect(modernStyles.sectionPaddingLeft).toBeGreaterThanOrEqual(16);
    expect(modernStyles.sectionPaddingLeft).toBeLessThanOrEqual(32);
    expect(modernStyles.buttonMinHeight).toBe("2.75rem");
    expect(modernStyles.actionMinHeight).toBe("44px");
    expect(modernStyles.actionHeight).toBeGreaterThanOrEqual(44);
    expect(modernStyles.actionRadius).toBe("9999px");
    expect(modernStyles.actionShadow).toBe("none");
    expect(modernStyles.actionTransform).toBe("uppercase");
    expect(modernStyles.cardRadius).toBe("4px");
    expect(modernStyles.cardShadow).toBe("none");

    const viewport = page.viewportSize();
    const heroBox = await hero.boundingBox();
    const mediaBox = await media.boundingBox();

    expect(heroBox).not.toBeNull();
    expect(mediaBox).not.toBeNull();
    expect(mediaBox.x).toBeGreaterThanOrEqual(-1);
    expect(mediaBox.x + mediaBox.width).toBeLessThanOrEqual(viewport.width + 1);
    if (viewport.width >= DESKTOP_BREAKPOINT) {
      expect(mediaBox.x).toBeGreaterThan(heroBox.x + heroBox.width * 0.45);
      expect(Math.abs(mediaBox.y - heroBox.y)).toBeLessThanOrEqual(1);
    } else {
      expect(mediaBox.y).toBeGreaterThan(heroBox.y);
      expect(mediaBox.width).toBeGreaterThanOrEqual(viewport.width - 1);
    }

    await expectNoHorizontalOverflow(page);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(formatAxeViolations(accessibility.violations)).toEqual([]);

    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: false,
    });
    await testInfo.attach(
      `public-home-${locale}-${testInfo.project.name}.png`,
      { body: screenshot, contentType: "image/png" },
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test("public studio hero uses the tenant brush fallback without an uploaded photo", async ({
  page,
}, testInfo) => {
  await installAssetRoutes(page);
  await page.goto(`${LONG_COPY_TENANT_ORIGIN}/en`, {
    waitUntil: "domcontentloaded",
  });

  const media = page.locator('[data-public-tenant-hero-media="fallback"]');
  const swashes = media.locator('[data-testid="brush-swash"]');

  await expect(media).toBeVisible({ timeout: 20_000 });
  await expect(swashes).toHaveCount(2);
  await expect(swashes.nth(0)).toHaveAttribute("data-brush-texture", "loaded");
  await expect(swashes.nth(1)).toHaveAttribute("data-brush-texture", "rake");
  await expect(media.locator("[data-public-tenant-hero-brand]")).toHaveCount(1);
  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(formatAxeViolations(accessibility.violations)).toEqual([]);

  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: page.viewportSize().width < DESKTOP_BREAKPOINT,
  });
  await testInfo.attach(`public-home-fallback-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
});

test("Classic Editorial and Warm Organic cover public and login surfaces", async ({
  page,
}, testInfo) => {
  test.skip(
    !["desktop-1440", "mobile-390"].includes(testInfo.project.name),
    "Representative cross-preset QA runs at one desktop and one mobile size.",
  );

  await installAssetRoutes(page);

  for (const scenario of REPRESENTATIVE_PRESET_SCENARIOS) {
    await page.goto(`${scenario.origin}/en`, {
      waitUntil: "domcontentloaded",
    });

    const publicRoot = page
      .locator(`[data-tenant-style="${scenario.id}"]`)
      .first();
    await expect(publicRoot).toBeVisible({ timeout: 20_000 });
    const publicTokens = await publicRoot.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        font: style.getPropertyValue("--tenant-font-display").trim(),
        cardRadius: style.getPropertyValue("--tenant-radius-card").trim(),
        panelRadius: style.getPropertyValue("--tenant-radius-panel").trim(),
        imageFilter: style.getPropertyValue("--tenant-image-filter").trim(),
      };
    });

    expect(publicTokens.font).toMatch(scenario.font);
    expect(publicTokens.cardRadius).toBe(scenario.cardRadius);
    expect(publicTokens.panelRadius).toBe(scenario.panelRadius);
    expect(publicTokens.imageFilter).toBe(scenario.imageFilter);
    const heroMedia = page
      .locator('[data-public-tenant-hero] [data-tenant-surface="media"]')
      .first();
    const heroImage = page.locator('[data-public-tenant-hero-media="image"]');
    const primaryAction = page.locator("[data-public-tenant-primary-action]");
    await expect(heroImage).toBeVisible();
    const appliedHeroStyle = await heroMedia.evaluate((element) => ({
      radius: getComputedStyle(element).borderRadius,
      filter: getComputedStyle(element.querySelector("[data-tenant-image]"))
        .filter,
    }));
    expect(appliedHeroStyle).toEqual({
      // The public hero deliberately spans the page edge with square corners.
      radius: "0px",
      filter: scenario.imageFilter,
    });
    await expectTouchTarget(
      primaryAction,
      `${scenario.id} public primary action`,
    );
    expect(
      await primaryAction.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(scenario.minimumButtonHeight);
    await expectNoHorizontalOverflow(page);

    const publicAccessibility = await new AxeBuilder({ page }).analyze();
    expect(formatAxeViolations(publicAccessibility.violations)).toEqual([]);

    await page.goto(`${scenario.origin}/en/login`, {
      waitUntil: "domcontentloaded",
    });

    const authRoot = page
      .locator(`[data-tenant-style="${scenario.id}"]`)
      .first();
    await expect(authRoot).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-auth-layout]")).toBeVisible();
    await expect(page.locator("[data-auth-visual]")).toHaveAttribute(
      "data-tenant-surface",
      "media",
    );
    const authLayout = page.locator("[data-auth-layout]");
    const authPrimaryAction = page
      .locator('[data-tenant-button="primary"]')
      .first();
    const authAppliedStyle = await authLayout.evaluate((element) => ({
      radius: getComputedStyle(element).borderRadius,
      displayFont: getComputedStyle(
        element.querySelector('[data-tenant-type="display"]'),
      ).fontFamily,
      imageFilter: getComputedStyle(
        element.querySelector("[data-auth-hero-image]"),
      ).filter,
    }));
    expect(authAppliedStyle.radius).toBe("0px");
    expect(authAppliedStyle.displayFont).toMatch(scenario.font);
    expect(authAppliedStyle.imageFilter).toBe(scenario.imageFilter);
    await expectTouchTarget(
      authPrimaryAction,
      `${scenario.id} login primary action`,
    );
    expect(
      await authPrimaryAction.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(scenario.minimumButtonHeight);
    await expectNoHorizontalOverflow(page);

    const authAccessibility = await new AxeBuilder({ page }).analyze();
    expect(formatAxeViolations(authAccessibility.violations)).toEqual([]);

    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: page.viewportSize().width < DESKTOP_BREAKPOINT,
    });
    await testInfo.attach(
      `customer-auth-${scenario.id}-${testInfo.project.name}.png`,
      { body: screenshot, contentType: "image/png" },
    );
  }
});

for (const { copy, locale } of localeScenarios) {
  test(`${locale.toUpperCase()} customer login is responsive, branded and accessible`, async ({
    page,
  }, testInfo) => {
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !isExpectedAnonymousRefreshError(message)
      ) {
        consoleErrors.push({
          message: message.text(),
          url: message.location().url,
        });
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await installAssetRoutes(page);
    await page.goto(`${TENANT_ORIGIN}/${locale}/login`, {
      waitUntil: "domcontentloaded",
    });

    const form = page.getByRole("form", { name: copy.formTitle });
    const authControls = page.locator("[data-customer-auth-controls]");
    const surface = page.locator('[data-auth-surface="login"]');
    const layout = page.locator("[data-auth-layout]");
    const visual = page.locator("[data-auth-visual]");
    const visualCopy = page.locator("[data-auth-visual-copy]");
    const formPanel = page.locator("[data-auth-form-panel]");
    const card = page.locator("[data-auth-card]");
    const heroImage = page.locator("[data-auth-hero-image]");
    const formBrand = page.locator("[data-auth-form-brand]");
    const formLogo = formBrand.locator("img");
    const formTitle = page.getByRole("heading", {
      level: 2,
      name: copy.formTitle,
    });
    const heroTitle = page.getByRole("heading", {
      level: 1,
      name: copy.heroTitle,
    });
    const socialDivider = form.locator("[data-social-auth-divider]");

    await expect(form).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-customer-auth-header]")).toHaveCount(0);
    await expect(page.locator("header")).toHaveCount(0);
    await expect(authControls).toBeVisible();
    await expect(authControls.getByRole("link")).toHaveCount(1);
    await expect(authControls.getByRole("button")).toHaveCount(1);
    await expect(authControls.getByText("Atelier Nami")).toHaveCount(0);
    await expect(authControls.locator('img[alt*="Atelier Nami"]')).toHaveCount(
      0,
    );
    await expect(
      authControls.locator('[aria-controls="mobile-menu"]'),
    ).toHaveCount(0);
    await expect(surface).toHaveCount(1);
    await expect(layout).toHaveCount(1);
    await expect(visual).toBeVisible();
    await expect(formPanel).toBeVisible();
    await expect(heroImage).toBeVisible();
    await expect(formLogo).toBeVisible();
    await expect(formLogo).toHaveAttribute("alt", "");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(heroTitle).toBeVisible();
    await expect(page.getByText("Atelier Nami", { exact: true })).toHaveCount(
      1,
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.getByText(copy.heroDescription, { exact: true }),
    ).toBeVisible();
    await expect(form.getByRole("button", { name: /Google/i })).toBeVisible();
    await expect(form.getByRole("button", { name: /Apple/i })).toBeVisible();
    await expect
      .poll(() => heroImage.evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0);
    await expect
      .poll(() => formLogo.evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0);
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const modernAuthStyles = await surface.evaluate((element) => {
      const root = element.closest("[data-tenant-style]");
      const heading = element.querySelector('[data-tenant-type="display"]');
      const authLayout = element.querySelector("[data-auth-layout]");
      const field = element.querySelector('[data-tenant-surface="field"]');
      const submit = element.querySelector('[data-tenant-button="primary"]');

      if (!root || !heading || !authLayout || !field || !submit) return null;

      const headingStyle = getComputedStyle(heading);
      const layoutStyle = getComputedStyle(authLayout);
      const fieldStyle = getComputedStyle(field);
      const submitStyle = getComputedStyle(submit);

      return {
        preset: root.getAttribute("data-tenant-style"),
        displayFont: headingStyle.fontFamily,
        displayTransform: headingStyle.textTransform,
        layoutRadius: layoutStyle.borderRadius,
        layoutShadow: layoutStyle.boxShadow,
        fieldRadius: fieldStyle.borderRadius,
        fieldMinHeight: fieldStyle.minHeight,
        submitRadius: submitStyle.borderRadius,
        submitMinHeight: submitStyle.minHeight,
        submitShadow: submitStyle.boxShadow,
        submitTransform: submitStyle.textTransform,
      };
    });

    expect(modernAuthStyles).not.toBeNull();
    expect(modernAuthStyles.preset).toBe("modern-minimal-v1");
    expect(modernAuthStyles.displayFont).toMatch(/Manrope/i);
    expect(modernAuthStyles.displayTransform).toBe("none");
    expect(modernAuthStyles.layoutRadius).toBe("0px");
    // Tailwind's shadow-none can serialize as transparent zero-size layers.
    // Keep rejecting every nontransparent or nonzero shadow.
    expect(
      modernAuthStyles.layoutShadow === "none" ||
        modernAuthStyles.layoutShadow
          .split(/, (?=rgba\()/)
          .every((shadow) => shadow === "rgba(0, 0, 0, 0) 0px 0px 0px 0px"),
      `The auth layout must have no visible shadow: ${modernAuthStyles.layoutShadow}`,
    ).toBe(true);
    expect(modernAuthStyles.fieldRadius).toBe("4px");
    expect(modernAuthStyles.fieldMinHeight).toBe("44px");
    expect(modernAuthStyles.submitRadius).toBe("9999px");
    expect(modernAuthStyles.submitMinHeight).toBe("44px");
    expect(modernAuthStyles.submitShadow).toBe("none");
    expect(modernAuthStyles.submitTransform).toBe("uppercase");

    const viewport = page.viewportSize();
    const surfaceBox = await surface.boundingBox();
    const layoutBox = await layout.boundingBox();
    const controlsBox = await authControls.boundingBox();
    const controlsInnerBox = await authControls
      .locator("[data-customer-auth-controls-inner]")
      .boundingBox();
    const backControlBox = await authControls.getByRole("link").boundingBox();
    const languageControlBox = await authControls
      .locator("[data-customer-auth-language]")
      .boundingBox();
    const visualBox = await visual.boundingBox();
    const visualCopyBox = await visualCopy.boundingBox();
    const formPanelBox = await formPanel.boundingBox();
    const cardBox = await card.boundingBox();
    const logoBox = await formLogo.boundingBox();
    const titleBox = await formTitle.boundingBox();

    expect(surfaceBox).not.toBeNull();
    expect(layoutBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(controlsInnerBox).not.toBeNull();
    expect(backControlBox).not.toBeNull();
    expect(languageControlBox).not.toBeNull();
    expect(visualBox).not.toBeNull();
    expect(visualCopyBox).not.toBeNull();
    expect(formPanelBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(cardBox.x).toBeGreaterThanOrEqual(-1);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(Math.abs(surfaceBox.y)).toBeLessThanOrEqual(1);
    expect(layoutBox.y).toBeGreaterThanOrEqual(0);
    expect(layoutBox.y).toBeLessThanOrEqual(17);
    expect(controlsBox.x).toBeGreaterThanOrEqual(0);
    expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(controlsInnerBox.width).toBe(Math.min(viewport.width, 1480));
    expect(
      Math.abs(
        controlsInnerBox.x * 2 + controlsInnerBox.width - viewport.width,
      ),
    ).toBeLessThanOrEqual(1);
    expect(backControlBox.x).toBeGreaterThanOrEqual(controlsInnerBox.x - 1);
    expect(backControlBox.x - controlsInnerBox.x).toBeLessThanOrEqual(25);
    expect(
      controlsInnerBox.x +
        controlsInnerBox.width -
        languageControlBox.x -
        languageControlBox.width,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      controlsInnerBox.x +
        controlsInnerBox.width -
        languageControlBox.x -
        languageControlBox.width,
    ).toBeLessThanOrEqual(25);
    expect(logoBox.height).toBeLessThanOrEqual(44);
    expect(logoBox.width).toBeLessThanOrEqual(180);
    expect(logoBox.y + logoBox.height).toBeLessThanOrEqual(titleBox.y + 1);

    if (viewport.width >= DESKTOP_BREAKPOINT) {
      expect(visualBox.x + visualBox.width).toBeLessThanOrEqual(
        formPanelBox.x + 1,
      );
      expect(Math.abs(visualBox.y - formPanelBox.y)).toBeLessThanOrEqual(1);
      expect(visualBox.height).toBeLessThanOrEqual(formPanelBox.height + 1);
      expect(visualCopyBox.y).toBeGreaterThanOrEqual(visualBox.y);
      expect(visualCopyBox.y + visualCopyBox.height).toBeLessThanOrEqual(
        Math.min(visualBox.y + visualBox.height, viewport.height) + 1,
      );
    } else {
      expect(visualBox.y + visualBox.height).toBeLessThanOrEqual(
        formPanelBox.y + 1,
      );
      expect(visualBox.width).toBeGreaterThanOrEqual(viewport.width - 42);
      expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(
        visualCopyBox.y + 1,
      );
    }

    const email = form.getByLabel("E-mail");
    const password = form.locator("#password");
    const passwordVisibility = form.getByRole("button", {
      name: locale === "cs" ? "Zobrazit heslo" : "Show password",
    });
    const submit = form.getByRole("button", {
      name: copy.submit,
      exact: true,
    });
    const google = form.getByRole("button", { name: /Google/i });
    const apple = form.getByRole("button", { name: /Apple/i });

    if (viewport.width >= DESKTOP_BREAKPOINT) {
      for (const [name, target] of [
        ["Hero title", heroTitle],
        ["Sign-in action", submit],
        ["Social divider", socialDivider],
        ["Google sign-in", google],
        ["Apple sign-in", apple],
      ]) {
        await expect(
          target,
          `${name} must be inside the initial viewport.`,
        ).toBeInViewport({
          ratio: 1,
        });
        const box = await target.boundingBox();
        expect(box, `${name} must be measurable.`).not.toBeNull();
        expect(
          box.y + box.height,
          `${name} must stay above the desktop fold.`,
        ).toBeLessThanOrEqual(viewport.height - 8);
      }
    }

    for (const [name, target] of [
      ["Back to studio", authControls.getByRole("link")],
      ["Language selector", authControls.getByRole("button")],
      ["Email field", email],
      ["Password field", password],
      ["Password visibility", passwordVisibility],
      ["Sign-in action", submit],
      ["Google sign-in", google],
      ["Apple sign-in", apple],
    ]) {
      await expectTouchTarget(target, name);
    }

    await passwordVisibility.click();
    await expect(password).toHaveAttribute("type", "text");
    if (viewport.width < DESKTOP_BREAKPOINT) {
      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport({ ratio: 1 });
    }
    await expectNoHorizontalOverflow(page);

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      formatAxeViolations(accessibility.violations),
      "The customer login must have no Axe accessibility violations.",
    ).toEqual([]);

    if (viewport.width < DESKTOP_BREAKPOINT) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    }

    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: false,
    });
    await testInfo.attach(
      `customer-login-${locale}-${testInfo.project.name}.png`,
      {
        body: screenshot,
        contentType: "image/png",
      },
    );

    if (viewport.width < DESKTOP_BREAKPOINT) {
      const fullPageScreenshot = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        fullPage: true,
      });
      await testInfo.attach(
        `customer-login-${locale}-${testInfo.project.name}-full.png`,
        {
          body: fullPageScreenshot,
          contentType: "image/png",
        },
      );
    }

    await submit.click();
    const validationError = form.getByRole("alert");
    await expect(validationError).toBeVisible();
    await expect(validationError).toBeFocused();
    await expectNoHorizontalOverflow(page);
    if (viewport.width >= DESKTOP_BREAKPOINT) {
      await expect(heroTitle).toBeInViewport({ ratio: 1 });
    }

    const errorAccessibility = await new AxeBuilder({ page }).analyze();
    expect(
      formatAxeViolations(errorAccessibility.violations),
      "The focused customer login error must have no Axe violations.",
    ).toEqual([]);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test(`${locale.toUpperCase()} customer registration matches the responsive login system`, async ({
    page,
  }, testInfo) => {
    test.skip(!REGISTRATION_PROJECTS.has(testInfo.project.name));

    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !isExpectedAnonymousRefreshError(message)
      ) {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await installAssetRoutes(page);
    await page.goto(`${TENANT_ORIGIN}/${locale}/register?next=/book`, {
      waitUntil: "domcontentloaded",
    });

    const surface = page.locator('[data-auth-surface="register"]');
    const layout = page.locator("[data-auth-layout]");
    const visual = page.locator("[data-auth-visual]");
    const visualCopy = page.locator("[data-auth-visual-copy]");
    const formPanel = page.locator("[data-auth-form-panel]");
    const card = page.locator("[data-auth-card]");
    const controls = page.locator("[data-customer-auth-controls]");
    const form = page.getByRole("form", { name: copy.registerFormTitle });
    const heroTitle = page.getByRole("heading", {
      level: 1,
      name: copy.registerHeroTitle,
    });
    const formLogo = page.locator("[data-auth-form-brand] img");
    const submit = form.getByRole("button", {
      name: copy.registerSubmit,
      exact: true,
    });
    const google = form.getByRole("button", { name: /Google/i });
    const apple = form.getByRole("button", { name: /Apple/i });
    const signIn = form.getByRole("link", {
      name: locale === "cs" ? "Přihlaste se" : "Sign in",
      exact: true,
    });
    const passwordToggle = form.getByRole("button", {
      name: locale === "cs" ? "Zobrazit heslo" : "Show password",
      exact: true,
    });
    const confirmationToggle = form.getByRole("button", {
      name:
        locale === "cs"
          ? "Zobrazit potvrzení hesla"
          : "Show password confirmation",
      exact: true,
    });
    const rulesLabel = form
      .locator("label")
      .filter({ has: page.locator("#rules-check") });
    const termsLabel = form
      .locator("label")
      .filter({ has: page.locator("#terms-check") });

    await expect(form).toBeVisible({ timeout: 20_000 });
    await expect(surface).toHaveCount(1);
    await expect(page.locator("header")).toHaveCount(0);
    await expect(page.locator("[data-customer-auth-header]")).toHaveCount(0);
    await expect(controls).toBeVisible();
    await expect(controls.getByRole("link")).toHaveCount(1);
    await expect(controls.getByRole("button")).toHaveCount(1);
    await expect(layout).toHaveCount(1);
    await expect(visual).toBeVisible();
    await expect(formPanel).toBeVisible();
    await expect(heroTitle).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("[data-auth-story-highlights] li")).toHaveCount(
      2,
    );
    await expect(
      page.locator("[data-booking-intent-reassurance]"),
    ).toContainText(locale === "cs" ? "výběr rezervace" : "booking selection");
    await expect(formLogo).toBeVisible();
    await expect(formLogo).toHaveAttribute("alt", "");
    await expect(
      form.locator("[data-social-auth-variant='compact']"),
    ).toHaveCount(1);
    await expect(
      form.getByRole("link", { name: /privacy|osobních/i }),
    ).toHaveAttribute("href", "https://legal.example.test/privacy");
    await expect(
      form.locator('a[href="https://legal.example.test/studio-rules"]'),
    ).toHaveCount(1);
    await expect(
      form.locator('a[href="https://legal.example.test/terms"]'),
    ).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);

    await expect
      .poll(() => formLogo.evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0);
    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    const viewport = page.viewportSize();
    const surfaceBox = await surface.boundingBox();
    const layoutBox = await layout.boundingBox();
    const controlsBox = await controls.boundingBox();
    const controlsInnerBox = await controls
      .locator("[data-customer-auth-controls-inner]")
      .boundingBox();
    const backControlBox = await controls.getByRole("link").boundingBox();
    const languageControlBox = await controls
      .locator("[data-customer-auth-language]")
      .boundingBox();
    const visualBox = await visual.boundingBox();
    const visualCopyBox = await visualCopy.boundingBox();
    const formPanelBox = await formPanel.boundingBox();
    const cardBox = await card.boundingBox();
    const logoBox = await formLogo.boundingBox();

    expect(surfaceBox).not.toBeNull();
    expect(layoutBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(controlsInnerBox).not.toBeNull();
    expect(backControlBox).not.toBeNull();
    expect(languageControlBox).not.toBeNull();
    expect(visualBox).not.toBeNull();
    expect(visualCopyBox).not.toBeNull();
    expect(formPanelBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(logoBox).not.toBeNull();
    expect(Math.abs(surfaceBox.y)).toBeLessThanOrEqual(1);
    expect(layoutBox.y).toBeGreaterThanOrEqual(0);
    expect(layoutBox.y).toBeLessThanOrEqual(17);
    expect(cardBox.x).toBeGreaterThanOrEqual(-1);
    expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(controlsBox.x).toBeGreaterThanOrEqual(0);
    expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(
      viewport.width,
    );
    expect(controlsInnerBox.width).toBe(Math.min(viewport.width, 1480));
    expect(
      Math.abs(
        controlsInnerBox.x * 2 + controlsInnerBox.width - viewport.width,
      ),
    ).toBeLessThanOrEqual(1);
    expect(backControlBox.x).toBeGreaterThanOrEqual(controlsInnerBox.x - 1);
    expect(backControlBox.x - controlsInnerBox.x).toBeLessThanOrEqual(25);
    expect(
      controlsInnerBox.x +
        controlsInnerBox.width -
        languageControlBox.x -
        languageControlBox.width,
    ).toBeGreaterThanOrEqual(-1);
    expect(
      controlsInnerBox.x +
        controlsInnerBox.width -
        languageControlBox.x -
        languageControlBox.width,
    ).toBeLessThanOrEqual(25);
    expect(logoBox.height).toBeLessThanOrEqual(44);
    expect(logoBox.width).toBeLessThanOrEqual(180);

    if (viewport.width >= DESKTOP_BREAKPOINT) {
      expect(visualBox.x + visualBox.width).toBeLessThanOrEqual(
        formPanelBox.x + 1,
      );
      expect(Math.abs(visualBox.y - formPanelBox.y)).toBeLessThanOrEqual(1);
    } else {
      expect(visualBox.y + visualBox.height).toBeLessThanOrEqual(
        formPanelBox.y + 1,
      );
      expect(visualBox.width).toBeGreaterThanOrEqual(viewport.width - 42);
      expect(controlsBox.y + controlsBox.height).toBeLessThanOrEqual(
        visualCopyBox.y + 1,
      );
    }

    const panelOverflow = await formPanel.evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
    }));
    expect(panelOverflow.overflowY).not.toMatch(/auto|scroll/);
    expect(panelOverflow.scrollHeight).toBeLessThanOrEqual(
      panelOverflow.clientHeight + 1,
    );

    for (const [name, target] of [
      ["Back to studio", controls.getByRole("link")],
      ["Language selector", controls.getByRole("button")],
      ["First name", form.locator("#firstname")],
      ["Last name", form.locator("#lastname")],
      ["Email", form.locator("#email")],
      ["Phone", form.locator("#phone")],
      ["Password", form.locator("#password")],
      ["Password confirmation", form.locator("#password_confirm")],
      ["Password visibility", passwordToggle],
      ["Confirmation visibility", confirmationToggle],
      ["Studio rules agreement", rulesLabel],
      ["Terms agreement", termsLabel],
      ["Registration action", submit],
      ["Google registration", google],
      ["Apple registration", apple],
      ["Sign-in link", signIn],
    ]) {
      await expectTouchTarget(target, name);
    }

    await expectNoHorizontalOverflow(page);
    const initialAccessibility = await new AxeBuilder({ page }).analyze();
    expect(
      formatAxeViolations(initialAccessibility.violations),
      "The customer registration must have no Axe violations.",
    ).toEqual([]);

    const initialScreenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: false,
    });
    await testInfo.attach(
      `customer-register-${locale}-${testInfo.project.name}-initial.png`,
      { body: initialScreenshot, contentType: "image/png" },
    );

    await form.locator("#firstname").fill("1");
    await form.locator("#lastname").fill("1");
    await form.locator("#email").fill("invalid-email");
    await form.locator("#phone").fill("x");
    await form.locator("#password").fill("short");
    await form.locator("#password_confirm").fill("different");
    await passwordToggle.click();
    await expect(form.locator("#password")).toHaveAttribute("type", "text");
    await confirmationToggle.click();
    await expect(form.locator("#password_confirm")).toHaveAttribute(
      "type",
      "text",
    );
    await submit.click();

    const validationError = form.getByRole("alert");
    await expect(validationError).toBeVisible();
    await expect(validationError).toBeFocused();
    await expect(form.locator('[id$="-error"]')).toHaveCount(6);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
    await expect(controls).toBeInViewport({ ratio: 1 });
    if (viewport.width >= DESKTOP_BREAKPOINT) {
      await expect(heroTitle).toBeInViewport({ ratio: 1 });
    }
    await expectNoHorizontalOverflow(page);

    const errorAccessibility = await new AxeBuilder({ page }).analyze();
    expect(
      formatAxeViolations(errorAccessibility.violations),
      "The longest invalid registration state must have no Axe violations.",
    ).toEqual([]);

    const finalScreenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: viewport.width < DESKTOP_BREAKPOINT,
    });
    await testInfo.attach(
      `customer-register-${locale}-${testInfo.project.name}-invalid.png`,
      { body: finalScreenshot, contentType: "image/png" },
    );

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test("booking continuation keeps every login action above the short-laptop fold", async ({
  page,
}, testInfo) => {
  test.skip(
    !["laptop-1280-short", "laptop-1366-short"].includes(testInfo.project.name),
  );

  await installAssetRoutes(page);
  await page.goto(`${TENANT_ORIGIN}/en/login?next=/book`, {
    waitUntil: "domcontentloaded",
  });

  const form = page.getByRole("form", { name: "Sign in" });
  const targets = [
    [
      "Hero title",
      page.getByRole("heading", {
        level: 1,
        name: "Welcome back to your studio.",
      }),
    ],
    ["Sign-in action", form.getByRole("button", { name: "Sign in" })],
    ["Social divider", form.locator("[data-social-auth-divider]")],
    ["Google sign-in", form.getByRole("button", { name: /Google/i })],
    ["Apple sign-in", form.getByRole("button", { name: /Apple/i })],
  ];

  await expect(page.locator("[data-booking-intent-reassurance]")).toContainText(
    "Your booking selection is saved",
  );
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const viewport = page.viewportSize();
  for (const [name, target] of targets) {
    await expect(
      target,
      `${name} must remain in the initial booking-return viewport.`,
    ).toBeInViewport({ ratio: 1 });
    const box = await target.boundingBox();

    expect(box, `${name} must be measurable.`).not.toBeNull();
    expect(
      box.y + box.height,
      `${name} must stay above the booking-return fold.`,
    ).toBeLessThanOrEqual(viewport.height - 8);
  }

  await expectNoHorizontalOverflow(page);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(formatAxeViolations(accessibility.violations)).toEqual([]);
});

test("maximum-length customized copy remains reachable without clipping", async ({
  page,
}, testInfo) => {
  test.skip(
    !["mobile-320", "laptop-1280-short"].includes(testInfo.project.name),
  );

  await installAssetRoutes(page);
  await page.goto(`${LONG_COPY_TENANT_ORIGIN}/en/login`, {
    waitUntil: "domcontentloaded",
  });

  const visual = page.locator("[data-auth-visual]");
  const visualContent = page.locator("[data-auth-visual-content]");
  const copy = page.locator("[data-auth-visual-copy]");
  const heading = page.getByRole("heading", {
    level: 1,
    name: longCopy.headline,
  });
  const copyParagraphs = copy.locator("p");

  await expect(heading).toBeVisible();
  await expect(copyParagraphs.nth(1)).toHaveText(longCopy.supportingText);
  await expect(copyParagraphs.nth(2)).toHaveText(longCopy.helpText);
  await expect(visualContent).toHaveAttribute("role", "region");
  await expect(visualContent).toHaveAttribute(
    "aria-labelledby",
    "customer-auth-story-title",
  );

  const visualBox = await visual.boundingBox();
  const copyBox = await copy.boundingBox();
  expect(visualBox).not.toBeNull();
  expect(copyBox).not.toBeNull();

  if (testInfo.project.name === "mobile-320") {
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(heading).toBeInViewport({ ratio: 0.2 });
    expect(copyBox.y).toBeGreaterThanOrEqual(visualBox.y);
    expect(copyBox.y + copyBox.height).toBeLessThanOrEqual(
      visualBox.y + visualBox.height + 1,
    );

    const overflow = await visual.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(overflow.scrollHeight).toBeLessThanOrEqual(
      overflow.clientHeight + 1,
    );
  } else {
    const initialOverflow = await visualContent.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    }));
    expect(initialOverflow.scrollHeight).toBeGreaterThan(
      initialOverflow.clientHeight,
    );
    expect(initialOverflow.scrollTop).toBe(0);

    await visualContent.focus();
    await expect(visualContent).toBeFocused();
    await page.keyboard.press("End");
    await expect
      .poll(() => visualContent.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    await expect(copyParagraphs.nth(2)).toBeInViewport({ ratio: 1 });
  }

  await expectNoHorizontalOverflow(page);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(formatAxeViolations(accessibility.violations)).toEqual([]);
});

test("password recovery keeps the tenant auth design through OTP verification", async ({
  page,
}, testInfo) => {
  test.skip(!["mobile-320", "desktop-1280"].includes(testInfo.project.name));

  await installAssetRoutes(page);
  await page.route("**/password-reset/request", async (route) => {
    const origin = route.request().headers().origin || TENANT_ORIGIN;

    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers": "content-type",
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-origin": origin,
        },
        status: 204,
      });
      return;
    }

    expect(route.request().postDataJSON()).toEqual({
      email: "maker@example.com",
      locale: "en",
      tenantSlug: "studio-alpha",
    });

    await route.fulfill({
      body: JSON.stringify({ status: "PENDING" }),
      contentType: "application/json",
      headers: {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": origin,
      },
      status: 202,
    });
  });

  await page.goto(`${TENANT_ORIGIN}/en/password?next=/book`, {
    waitUntil: "domcontentloaded",
  });

  const surface = page.locator('[data-auth-surface="recovery"]');
  const form = page.getByRole("form", { name: "Reset password" });
  const email = form.getByLabel("E-mail");
  const submit = form.getByRole("button", {
    name: "Send verification code",
  });

  await expect(surface).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("[data-auth-layout]")).toHaveCount(1);
  await expect(page.locator("[data-auth-visual]")).toBeVisible();
  await expect(page.locator("[data-auth-form-brand] img")).toBeVisible();
  await expect(email).toHaveAttribute("autocomplete", "email");
  await expect(email).toHaveAccessibleDescription(
    "Use the address registered with this studio.",
  );
  await expectTouchTarget(email, "Recovery email");
  await expectTouchTarget(submit, "Recovery request action");
  await expectNoHorizontalOverflow(page);

  const initialAccessibility = await new AxeBuilder({ page }).analyze();
  expect(formatAxeViolations(initialAccessibility.violations)).toEqual([]);

  await email.fill("maker@example.com");
  await submit.click();

  const dialog = page.getByRole("dialog", { name: "Check your email" });
  const digits = dialog.getByRole("textbox", {
    name: /Verification code digit/,
  });
  const close = dialog.getByRole("button", { name: "Close verification" });

  await expect(dialog).toHaveAttribute("aria-modal", "true");
  // Headless UI's role wrapper contains fixed children and has no own height.
  await expect(dialog.locator("[data-password-recovery-dialog]")).toBeVisible();
  await expect(digits).toHaveCount(6);
  for (const digit of await digits.all()) {
    await expectTouchTarget(digit, "Recovery code digit");
  }
  await expect(dialog).toContainText("maker@example.com");
  await expect(dialog).toContainText("six-digit code");
  await expectTouchTarget(close, "Recovery dialog close");
  await expectNoHorizontalOverflow(page);

  const dialogAccessibility = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .analyze();
  expect(formatAxeViolations(dialogAccessibility.violations)).toEqual([]);

  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });
  await testInfo.attach(
    `customer-password-recovery-${testInfo.project.name}.png`,
    { body: screenshot, contentType: "image/png" },
  );
});
