import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isExpectedAnonymousRefreshConsoleError } from "./platform-auth.console.js";

const PLATFORM_ORIGIN = "http://shario.localhost:4310";
const DESKTOP_BREAKPOINT = 1280;

const localeScenarios = [
  {
    locale: "en",
    copy: {
      alternateChangeLanguage: "Změnit jazyk",
      alternateLanguage: "Čeština",
      alternateLocale: "cs",
      alternateShortLabel: "CS",
      alreadyHaveWorkspace: "Already have a workspace?",
      changeLanguage: "Change language",
      createWorkspace: "Create workspace",
      currentLanguage: "English",
      currentShortLabel: "EN",
      email: "Email address",
      findWorkspace: "Find your workspace",
      forgotPassword: "Forgot password?",
      heading: "Sign in to your workspace",
      hidePassword: "Hide password",
      newToSkab: "New to shario.io?",
      password: "Password",
      rememberWorkspace: "Remember workspace",
      showPassword: "Show password",
      signIn: "Sign in",
      submit: "Sign in",
      workspace: "Workspace URL",
      workspaceHelpDescription:
        "It’s the unique address you use to open your studio, for example clay-house.shario.io. You’ll find it in your welcome or invitation email. If you’re unsure, ask your studio owner or administrator.",
      workspaceHelpOpen: "What is a workspace URL?",
      workspaceHelpTitle: "Your studio’s shario.io address",
    },
  },
  {
    locale: "cs",
    copy: {
      alternateChangeLanguage: "Change language",
      alternateLanguage: "English",
      alternateLocale: "en",
      alternateShortLabel: "EN",
      alreadyHaveWorkspace: "Už máte své studio?",
      changeLanguage: "Změnit jazyk",
      createWorkspace: "Vytvořit studio",
      currentLanguage: "Čeština",
      currentShortLabel: "CS",
      email: "E-mail",
      findWorkspace: "Najít své studio",
      forgotPassword: "Zapomněli jste heslo?",
      heading: "Přihlaste se do studia",
      hidePassword: "Skrýt heslo",
      newToSkab: "Začínáte se shario.io?",
      password: "Heslo",
      rememberWorkspace: "Zapamatovat studio",
      showPassword: "Zobrazit heslo",
      signIn: "Přihlásit se",
      submit: "Přihlásit se",
      workspace: "Adresa studia",
      workspaceHelpDescription:
        "Je to jedinečná adresa, přes kterou otevíráte své studio, například atelier-nova.shario.io. Najdete ji v uvítacím e-mailu nebo pozvánce. Pokud si nejste jistí, zeptejte se majitele nebo správce studia.",
      workspaceHelpOpen: "Co je adresa studia?",
      workspaceHelpTitle: "Adresa vašeho studia na shario.io",
    },
  },
];

const formatAxeViolations = (violations) =>
  violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.flatMap((node) => node.target),
  }));

const parseCssColor = (value) => {
  const channels =
    String(value)
      .match(/[\d.]+/g)
      ?.map(Number) ?? [];

  if (String(value).startsWith("color(srgb") && channels.length >= 3) {
    return channels.slice(0, 3);
  }

  if (String(value).startsWith("rgb") && channels.length >= 3) {
    return channels.slice(0, 3).map((channel) => channel / 255);
  }

  throw new Error(`Unsupported computed CSS color: ${value}`);
};

const contrastRatio = (foreground, background) => {
  const relativeLuminance = (value) =>
    parseCssColor(value)
      .map((channel) =>
        channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4,
      )
      .reduce(
        (total, channel, index) =>
          total + channel * [0.2126, 0.7152, 0.0722][index],
        0,
      );
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
};

const collectLeafStrings = (value) => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectLeafStrings);
  if (!value || typeof value !== "object") return [];

  return Object.values(value).flatMap(collectLeafStrings);
};

const normalizeText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const loadRegisterCatalog = (locale) => {
  const messagesPath = path.join(
    process.cwd(),
    "src",
    "messages",
    `${locale}.json`,
  );
  const messages = JSON.parse(readFileSync(messagesPath, "utf8"));
  const catalog = messages.PlatformAuth?.register;

  if (!catalog) {
    throw new Error(`PlatformAuth.register is missing from ${locale}.json.`);
  }

  return catalog;
};

async function attachViewportScreenshot(page, testInfo, locale, surface) {
  const screenshot = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });

  await testInfo.attach(
    `platform-auth-${surface}-${locale}-${testInfo.project.name}.png`,
    {
      body: screenshot,
      contentType: "image/png",
    },
  );
}

async function installPlatformAuthMocks(page) {
  const fulfillAnonymousRefresh = (route) =>
    route.fulfill({
      body: JSON.stringify({ code: "UNAUTHENTICATED" }),
      contentType: "application/json",
      status: 401,
    });

  await page.route("**/auth/refresh", fulfillAnonymousRefresh);
  await page.route("**/auth/customer/refresh", fulfillAnonymousRefresh);

  // Vercel serves these telemetry scripts in deployment, not on the local
  // production server used for visual QA. Keep unrelated resource errors fatal.
  for (const script of ["insights", "speed-insights"]) {
    await page.route(
      `${PLATFORM_ORIGIN}/_vercel/${script}/script.js`,
      (route) =>
        route.fulfill({
          body: "",
          contentType: "application/javascript",
          status: 200,
        }),
    );
  }
}

async function expectPlatformAuthHeader(page, copy, locale, mode) {
  const header = page.locator("header[data-platform-auth-header]");
  const brandSurface = header.locator("[data-platform-auth-brand]");
  const brand = brandSurface.getByRole("link", { name: "shario.io home" });
  const actionSurface = header.locator("[data-platform-auth-actions]:visible");
  const isRegister = mode === "register";
  const prompt = actionSurface.getByText(
    isRegister ? copy.alreadyHaveWorkspace : copy.newToSkab,
    { exact: true },
  );
  const crossLink = actionSurface.getByRole("link", {
    exact: true,
    name: isRegister ? copy.signIn : copy.createWorkspace,
  });

  await expect(page.locator("header")).toHaveCount(1);
  await expect(header).toBeVisible();
  await expect(header.locator("nav")).toHaveCount(0);
  await expect(brandSurface).toBeVisible();
  await expect(actionSurface).toBeVisible();
  await expect(prompt).toBeVisible();
  await expectTouchTarget(crossLink, "Auth cross-link action");

  expect(
    new URL(await crossLink.getAttribute("href"), PLATFORM_ORIGIN).pathname,
  ).toBe(isRegister ? `/${locale}/login` : `/${locale}/register`);

  // The auth chrome contains only its wordmark, locale control, prompt and
  // reciprocal auth link. Public marketing navigation/actions must not leak in.
  await expect(header.locator("a:visible")).toHaveCount(2);
  await expect(header.locator("button:visible")).toHaveCount(1);
  expect(await header.getAttribute("data-platform-header")).toBeNull();

  const box = await header.boundingBox();
  const brandBox = await brand.boundingBox();
  const actionSurfaceBox = await actionSurface.boundingBox();
  const pageContentPaddingTop = await page
    .locator("#page-content")
    .evaluate((element) =>
      Number.parseFloat(window.getComputedStyle(element).paddingTop),
    );
  const headerStyle = await header.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      position: style.position,
    };
  });

  expect(box, "The platform auth header must be measurable.").not.toBeNull();
  expect(brandBox, "The auth wordmark must be measurable.").not.toBeNull();
  expect(
    actionSurfaceBox,
    "The auth action surface must be measurable.",
  ).not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.height).toBeGreaterThanOrEqual(72);
  expect(pageContentPaddingTop).toBe(0);
  expect(headerStyle.position).toBe("absolute");
  expect(headerStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(headerStyle.backgroundImage).toBe("none");

  return { actionSurface, actionSurfaceBox, box, brandBox, header };
}

async function expectStudioAuthTheme(authPage, authCard) {
  expect(
    await authPage.getAttribute("data-skab-public-surface"),
  ).not.toBeNull();
  await expect(authPage).toHaveCSS("font-family", /^"?Switzer"?,/);
  await expect(authPage).toHaveCSS("background-color", "rgb(245, 241, 233)");
  await expect(authCard).toHaveCSS("border-radius", "4px");
  await expect(authCard).toHaveCSS("background-color", "rgb(255, 254, 251)");
  await expect(authCard).toHaveCSS("backdrop-filter", "none");
}

async function expectPlatformLanguageControl(languageSurface, copy) {
  const languageSelector = languageSurface;
  const languageControl = languageSelector.locator(
    "[data-language-selector-trigger]:visible",
  );

  await expect(languageControl).toBeVisible();
  await expect(languageControl).toHaveAttribute(
    "aria-label",
    `${copy.changeLanguage} (${copy.currentShortLabel})`,
  );

  const box = await languageControl.boundingBox();

  expect(box, "The auth language control must be measurable.").not.toBeNull();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(languageControl).toHaveCSS("border-radius", "4px");

  return { languageControl, languageSelector };
}

async function expectSelectedLanguage(
  page,
  languageControl,
  languageSelector,
  copy,
) {
  await languageControl.click();

  const selectedOption = languageSelector.locator(
    'button[aria-pressed="true"]',
  );

  await expect(selectedOption).toHaveCount(1);
  await expect(selectedOption).toContainText(copy.currentShortLabel);
  await expect(selectedOption).toContainText(copy.currentLanguage);

  const panel = languageSelector.locator("[data-language-selector-panel]");

  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("border-radius", "4px");
  const alternateCode = languageSelector
    .locator('button[aria-pressed="false"]')
    .filter({ hasText: copy.alternateLanguage })
    .getByText(copy.alternateShortLabel, { exact: true });
  const alternateCodeColor = await alternateCode.evaluate(
    (element) => window.getComputedStyle(element).color,
  );
  const panelBackground = await panel.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );

  expect(
    contrastRatio(alternateCodeColor, panelBackground),
    "Unselected language short codes must remain legible in the open menu.",
  ).toBeGreaterThanOrEqual(4.5);
  const panelBox = await panel.boundingBox();
  const viewport = page.viewportSize();

  expect(panelBox, "The open language menu must be measurable.").not.toBeNull();
  expect(panelBox.x).toBeGreaterThanOrEqual(-1);
  expect(panelBox.y).toBeGreaterThanOrEqual(-1);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(
    (viewport?.width ?? 1280) + 1,
  );
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(
    (viewport?.height ?? 900) + 1,
  );
  await expectNoHorizontalOverflow(page);

  return selectedOption;
}

async function closePlatformLanguageSurface(languageControl) {
  await languageControl.click();
}

const getAlternateLocaleCopy = (copy) => ({
  alternateLanguage: copy.currentLanguage,
  alternateShortLabel: copy.currentShortLabel,
  changeLanguage: copy.alternateChangeLanguage,
  currentLanguage: copy.alternateLanguage,
  currentShortLabel: copy.alternateShortLabel,
});

async function expectTwoWebpSwashes(visualPanel) {
  const swashes = visualPanel.locator('[data-brush-style="textured-mask"]');
  const swashMasks = visualPanel.locator('[data-brush-mask="alpha-webp"]');

  await expect(swashes).toHaveCount(2);
  await expect(swashMasks).toHaveCount(2);
  expect(
    await swashes.evaluateAll((elements) =>
      elements.map((element) => element.dataset.brushTextureSrc),
    ),
  ).toEqual([
    "/images/marketing/brush-loaded-wide.webp",
    "/images/marketing/brush-dry-rake.webp",
  ]);

  return swashes;
}

async function expectNoAccessibilityViolations(page) {
  const accessibility = await new AxeBuilder({ page }).analyze();

  expect(
    formatAxeViolations(accessibility.violations),
    "The platform auth surface must have no Axe accessibility violations.",
  ).toEqual([]);
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
  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;

    return {
      bodyScrollWidth: body.scrollWidth,
      clientWidth: root.clientWidth,
      rootScrollWidth: root.scrollWidth,
    };
  });

  expect(
    Math.max(geometry.bodyScrollWidth, geometry.rootScrollWidth),
    `Platform auth overflowed horizontally: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

test.describe("platform auth visual QA", () => {
  for (const { copy, locale } of localeScenarios) {
    test(`${locale} login remains responsive, localized and accessible`, async ({
      page,
    }, testInfo) => {
      const pageErrors = [];
      const consoleErrors = [];

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !isExpectedAnonymousRefreshConsoleError(message)
        ) {
          consoleErrors.push(message.text());
        }
      });

      await installPlatformAuthMocks(page);

      await page.goto(
        `${PLATFORM_ORIGIN}/${locale}/login?source=public-header#workspace`,
        {
          waitUntil: "domcontentloaded",
        },
      );

      const viewport = page.viewportSize();
      const viewportWidth = viewport?.width ?? 1280;
      const viewportHeight = viewport?.height ?? 900;
      const authPage = page.locator("[data-platform-auth-page]");
      const authGrid = page.locator("[data-platform-auth-grid]");
      const leftPanel = page.locator("[data-platform-auth-left]");
      const authCard = page.locator("[data-platform-auth-card]");
      const visualPanel = page.locator("[data-platform-auth-visual]");
      const storyCard = visualPanel.locator("[data-platform-auth-story-card]");
      const form = page.getByRole("form", { name: copy.heading });

      await expect(authPage).toHaveCount(1);
      await expect(authGrid).toHaveCount(1);
      await expect(leftPanel).toHaveCount(1);
      await expect(authCard).toHaveCount(1);
      await expect(form).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      expect(new URL(page.url()).pathname).toBe(`/${locale}/login`);
      await expect(
        page.getByRole("heading", { level: 1, name: copy.heading }),
      ).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts?.ready;
      });

      await expectStudioAuthTheme(authPage, authCard);
      await attachViewportScreenshot(page, testInfo, locale, "login");

      const {
        actionSurfaceBox,
        box: headerBox,
        brandBox,
        header: authHeader,
      } = await expectPlatformAuthHeader(page, copy, locale, "login");
      const { languageControl, languageSelector } =
        await expectPlatformLanguageControl(authHeader, copy);

      await expectSelectedLanguage(
        page,
        languageControl,
        languageSelector,
        copy,
      );
      await closePlatformLanguageSurface(languageControl);

      const workspaceInput = form.getByRole("textbox", {
        name: copy.workspace,
        exact: true,
      });
      const workspaceControl = form.locator(
        "[data-platform-workspace-control]",
      );
      const workspaceHelp = form.getByRole("button", {
        name: copy.workspaceHelpOpen,
      });
      const emailInput = form.getByLabel(copy.email);
      const passwordInput = form.getByLabel(copy.password, { exact: true });
      const findWorkspace = form.getByRole("button", {
        name: copy.findWorkspace,
      });
      const forgotPassword = form.getByRole("button", {
        name: copy.forgotPassword,
      });
      const passwordVisibility = form.getByRole("button", {
        name: copy.showPassword,
      });
      const rememberWorkspace = form.getByLabel(copy.rememberWorkspace);
      const rememberWorkspaceTarget = rememberWorkspace.locator(
        "xpath=ancestor::label",
      );
      const submit = form.getByRole("button", {
        name: copy.submit,
        exact: true,
      });

      await expect(workspaceControl).toHaveCount(1);
      await expect(workspaceHelp).toBeVisible();
      await expect(submit).toHaveAttribute("data-platform-auth-submit");
      await expect(submit).toBeDisabled();

      await workspaceHelp.click();

      const workspaceHelpPanel = form.locator(
        "[data-platform-workspace-help-panel]",
      );

      await expect(workspaceHelp).toHaveAttribute("aria-expanded", "true");
      await expect(workspaceHelpPanel).toBeVisible();
      await expect(workspaceHelpPanel).toContainText(copy.workspaceHelpTitle);
      await expect(workspaceHelpPanel).toContainText(
        copy.workspaceHelpDescription,
      );

      const workspaceHelpPanelBox = await workspaceHelpPanel.boundingBox();

      expect(
        workspaceHelpPanelBox,
        "The workspace explanation must be measurable.",
      ).not.toBeNull();
      expect(workspaceHelpPanelBox.x).toBeGreaterThanOrEqual(-1);
      expect(
        workspaceHelpPanelBox.x + workspaceHelpPanelBox.width,
      ).toBeLessThanOrEqual(viewportWidth + 1);
      await expectNoHorizontalOverflow(page);

      await page.keyboard.press("Escape");
      await expect(workspaceHelpPanel).toBeHidden();
      await expect(workspaceHelp).toBeFocused();

      const disabledSubmitStyle = await submit.evaluate((element) => {
        const style = window.getComputedStyle(element);

        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          opacity: Number.parseFloat(style.opacity),
        };
      });

      expect(
        disabledSubmitStyle.opacity,
        "The disabled sign-in action must use solid colors, not opacity.",
      ).toBe(1);
      expect(
        contrastRatio(
          disabledSubmitStyle.color,
          disabledSubmitStyle.backgroundColor,
        ),
        "The disabled sign-in action must remain clearly legible.",
      ).toBeGreaterThanOrEqual(4.5);

      await workspaceInput.focus();
      await expect(workspaceInput).toBeFocused();
      await expect(workspaceControl).toHaveCSS("outline-style", "solid");
      await expect(workspaceControl).toHaveCSS("outline-width", "2px");
      await expect(workspaceControl).toHaveCSS(
        "outline-color",
        "rgb(38, 60, 213)",
      );

      const workspaceFocusStyle = await workspaceControl.evaluate((control) => {
        const input = control.querySelector("input");
        const controlStyle = window.getComputedStyle(control);
        const inputStyle = window.getComputedStyle(input);

        return {
          controlBoxShadow: controlStyle.boxShadow,
          controlOutlineColor: controlStyle.outlineColor,
          controlOutlineStyle: controlStyle.outlineStyle,
          controlOutlineWidth: controlStyle.outlineWidth,
          focusWithin: control.matches(":focus-within"),
          inputAppearance: inputStyle.appearance,
          inputBorderWidths: [
            inputStyle.borderTopWidth,
            inputStyle.borderRightWidth,
            inputStyle.borderBottomWidth,
            inputStyle.borderLeftWidth,
          ],
          inputBoxShadow: inputStyle.boxShadow,
          inputOutlineStyle: inputStyle.outlineStyle,
        };
      });

      expect(workspaceFocusStyle.focusWithin).toBe(true);
      expect(workspaceFocusStyle.inputAppearance).toBe("none");
      expect(workspaceFocusStyle.inputBorderWidths).toEqual([
        "0px",
        "0px",
        "0px",
        "0px",
      ]);
      expect(workspaceFocusStyle.inputOutlineStyle).toBe("none");
      for (const [label, shadow] of [
        ["Workspace input", workspaceFocusStyle.inputBoxShadow],
        ["Workspace control", workspaceFocusStyle.controlBoxShadow],
      ]) {
        if (shadow === "none") continue;

        // Tailwind can serialize ring-0 as several zero-sized shadows.
        // A nonzero offset, blur or spread would create another visible ring.
        const dimensions = shadow.match(/-?(?:\d+\.?\d*|\.\d+)px\b/g) ?? [];
        expect(
          dimensions.length,
          `${label} shadow must be measurable.`,
        ).toBeGreaterThanOrEqual(2);
        expect(
          dimensions.every((dimension) => Number.parseFloat(dimension) === 0),
          `${label} must not render a shadow in addition to the control outline.`,
        ).toBe(true);
      }
      expect(
        workspaceFocusStyle.controlOutlineStyle,
        "The unified workspace control must own the visible focus ring.",
      ).toBe("solid");
      expect(
        Number.parseFloat(workspaceFocusStyle.controlOutlineWidth),
      ).toBeGreaterThanOrEqual(2);
      expect(workspaceFocusStyle.controlOutlineColor).toBe("rgb(38, 60, 213)");

      for (const [name, target] of [
        ["Workspace input", workspaceInput],
        ["Workspace help action", workspaceHelp],
        ["Find-workspace action", findWorkspace],
        ["Email input", emailInput],
        ["Password input", passwordInput],
        ["Password visibility action", passwordVisibility],
        ["Remember-workspace control", rememberWorkspaceTarget],
        ["Forgot-password action", forgotPassword],
        ["Sign-in action", submit],
      ]) {
        await expectTouchTarget(target, name);
      }

      await passwordVisibility.click();
      await expect(passwordInput).toHaveAttribute("type", "text");
      await expect(
        form.getByRole("button", { name: copy.hidePassword }),
      ).toBeVisible();

      // Clicking the password toggle may scroll a short mobile viewport.
      // Measure the initial layout from the same origin as the header boxes.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      const swashes = await expectTwoWebpSwashes(visualPanel);

      const cardBox = await authCard.boundingBox();

      expect(
        cardBox,
        "The platform login card must be measurable.",
      ).not.toBeNull();
      expect(cardBox.x).toBeGreaterThanOrEqual(-1);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewportWidth + 1);
      expect(cardBox.y).toBeGreaterThanOrEqual(
        headerBox.y + headerBox.height - 1,
      );

      const authGridBox = await authGrid.boundingBox();
      const leftPanelBox = await leftPanel.boundingBox();

      expect(
        authGridBox,
        "The auth split grid must be measurable.",
      ).not.toBeNull();
      expect(
        leftPanelBox,
        "The auth form panel must be measurable.",
      ).not.toBeNull();
      expect(Math.abs(authGridBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(leftPanelBox.y)).toBeLessThanOrEqual(1);

      if (viewportWidth >= DESKTOP_BREAKPOINT) {
        await expect(visualPanel).toBeVisible();
        await expect(storyCard).toBeVisible();
        const visualPanelBox = await visualPanel.boundingBox();

        expect(
          visualPanelBox,
          "The full-height editorial panel must be measurable.",
        ).not.toBeNull();
        expect(
          Math.abs(visualPanelBox.y),
          "The editorial panel must begin at the viewport top behind the auth header.",
        ).toBeLessThanOrEqual(1);
        expect(
          brandBox.x + brandBox.width / 2,
          "The wordmark must remain over the left auth panel.",
        ).toBeLessThan(visualPanelBox.x + 1);
        expect(
          actionSurfaceBox.x + actionSurfaceBox.width / 2,
          "The auth actions must remain over the right editorial panel.",
        ).toBeGreaterThanOrEqual(visualPanelBox.x - 1);
        expect(
          visualPanelBox.y + visualPanelBox.height,
          "The editorial panel must reach the viewport bottom.",
        ).toBeGreaterThanOrEqual(viewportHeight - 1);
        expect(
          visualPanelBox.y + visualPanelBox.height,
          "The initial editorial panel must not extend below the viewport.",
        ).toBeLessThanOrEqual(viewportHeight + 1);
        for (let index = 0; index < 2; index += 1) {
          await expect(swashes.nth(index)).toBeVisible();
        }
      } else {
        await expect(visualPanel).toBeHidden();
        await expect(storyCard).toBeHidden();
        await expect(authCard).toBeInViewport();
        expect(
          actionSurfaceBox.x + actionSurfaceBox.width,
          "Compact auth actions must remain inside the visible form panel.",
        ).toBeLessThanOrEqual(leftPanelBox.x + leftPanelBox.width + 1);
      }

      if (viewportWidth >= 1280) {
        const storyCardBox = await storyCard.boundingBox();

        await expect(submit).toBeInViewport({ ratio: 1 });
        expect(
          storyCardBox,
          "The studio-pulse story card must be measurable.",
        ).not.toBeNull();
        expect(
          cardBox.y + cardBox.height,
          "The complete form card must be initially visible on laptop and desktop viewports.",
        ).toBeLessThanOrEqual(viewportHeight + 1);
        expect(storyCardBox.y).toBeGreaterThanOrEqual(
          headerBox.y + headerBox.height - 1,
        );
        expect(
          storyCardBox.y + storyCardBox.height,
          "The complete studio-pulse story card must be initially visible on laptop and desktop viewports.",
        ).toBeLessThanOrEqual(viewportHeight + 1);
      }

      await expectNoHorizontalOverflow(page);

      if (viewportWidth === 320 || viewportWidth === 390) {
        expect(cardBox.width).toBeLessThanOrEqual(viewportWidth - 16);
      }

      await expectNoAccessibilityViolations(page);

      const alternateLanguageSurface = await expectPlatformLanguageControl(
        authHeader,
        copy,
      );

      await alternateLanguageSurface.languageControl.click();
      const alternateOption = alternateLanguageSurface.languageSelector
        .locator('button[aria-pressed="false"]')
        .filter({ hasText: copy.alternateLanguage });

      await expect(alternateOption).toHaveCount(1);
      await expect(alternateOption).toContainText(copy.alternateShortLabel);
      await alternateOption.click();

      await expect
        .poll(() => new URL(page.url()).pathname)
        .toBe(`/${copy.alternateLocale}/login`);
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        copy.alternateLocale,
      );
      expect(new URL(page.url()).search).toBe("?source=public-header");
      expect(new URL(page.url()).hash).toBe("#workspace");

      const alternateCopy = getAlternateLocaleCopy(copy);
      const updatedLanguageSurface = await expectPlatformLanguageControl(
        authHeader,
        alternateCopy,
      );

      await expectSelectedLanguage(
        page,
        updatedLanguageSurface.languageControl,
        updatedLanguageSurface.languageSelector,
        alternateCopy,
      );
      await closePlatformLanguageSurface(
        updatedLanguageSurface.languageControl,
      );

      const localeCookie = (await page.context().cookies()).find(
        ({ name }) => name === "NEXT_LOCALE",
      );

      expect(localeCookie?.value).toBe(copy.alternateLocale);
      expect(
        pageErrors,
        "The page emitted uncaught JavaScript errors.",
      ).toEqual([]);
      expect(consoleErrors, "The page emitted console errors.").toEqual([]);
    });
  }
});

test.describe("platform registration visual QA", () => {
  for (const { copy, locale } of localeScenarios) {
    test(`${locale} registration remains responsive, localized and accessible`, async ({
      page,
    }, testInfo) => {
      const pageErrors = [];
      const consoleErrors = [];

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          !isExpectedAnonymousRefreshConsoleError(message)
        ) {
          consoleErrors.push(message.text());
        }
      });

      await installPlatformAuthMocks(page);
      await page.goto(
        `${PLATFORM_ORIGIN}/${locale}/register?source=public-header#studio`,
        {
          waitUntil: "domcontentloaded",
        },
      );

      const viewport = page.viewportSize();
      const viewportWidth = viewport?.width ?? 1280;
      const viewportHeight = viewport?.height ?? 900;
      const oppositeLocale = locale === "en" ? "cs" : "en";
      const registerCatalog = loadRegisterCatalog(locale);
      const localeStrings =
        collectLeafStrings(registerCatalog).map(normalizeText);
      const oppositeLocaleStrings = collectLeafStrings(
        loadRegisterCatalog(oppositeLocale),
      ).map(normalizeText);
      const authPage = page.locator("[data-platform-auth-page]");
      const authGrid = page.locator("[data-platform-auth-grid]");
      const leftPanel = page.locator("[data-platform-auth-left]");
      const authCard = page.locator("[data-platform-auth-card]");
      const visualPanel = page.locator("[data-platform-auth-visual]");
      const storyCard = visualPanel.locator("[data-platform-auth-story-card]");
      const workspaceControl = authCard.locator(
        "[data-platform-workspace-control]",
      );
      const heading = authCard.getByRole("heading", { level: 1 });
      const form = authCard;

      await expect(authPage).toHaveCount(1);
      await expect(authGrid).toHaveCount(1);
      await expect(leftPanel).toHaveCount(1);
      await expect(authCard).toHaveCount(1);
      await expect(workspaceControl).toHaveCount(1);
      await expect(storyCard).toHaveCount(1);
      await expect(form).toHaveCount(1);
      await expect(form).toBeVisible();
      await expect(heading).toHaveCount(1);
      await expect(heading).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      expect(new URL(page.url()).pathname).toBe(`/${locale}/register`);
      await page.evaluate(async () => {
        await document.fonts?.ready;
      });

      await expectStudioAuthTheme(authPage, authCard);
      const headingText = normalizeText(await heading.innerText());

      expect(headingText).toBe(registerCatalog.form.title);
      expect(localeStrings).toContain(headingText);
      expect(oppositeLocaleStrings).not.toContain(headingText);
      await expect(form).toHaveAccessibleName(headingText);

      await attachViewportScreenshot(page, testInfo, locale, "register");

      const {
        actionSurfaceBox,
        box: headerBox,
        brandBox,
        header: authHeader,
      } = await expectPlatformAuthHeader(page, copy, locale, "register");
      const { languageControl, languageSelector } =
        await expectPlatformLanguageControl(authHeader, copy);

      await expectSelectedLanguage(
        page,
        languageControl,
        languageSelector,
        copy,
      );
      await closePlatformLanguageSurface(languageControl);

      const fields = form.locator(
        'input:not([type="checkbox"]):not([type="hidden"])',
      );
      const passwordFields = form.locator('input[autocomplete="new-password"]');
      const passwordRevealActions = form.locator("button[aria-pressed]");
      const legalCheckbox = form.locator('input[type="checkbox"]');
      const legalTarget = legalCheckbox.locator("xpath=ancestor::label");
      const submit = form.locator('button[type="submit"]');

      expect(await fields.count()).toBeGreaterThanOrEqual(7);
      await expect(passwordFields).toHaveCount(2);
      await expect(passwordRevealActions).toHaveCount(2);
      await expect(legalCheckbox).toHaveCount(1);
      await expect(submit).toHaveCount(1);
      await expect(submit).toHaveAttribute("data-platform-auth-submit");
      await expect(submit).toBeEnabled();

      const submitText = normalizeText(await submit.innerText());

      expect(submitText).toBe(registerCatalog.form.submit);
      expect(localeStrings).toContain(submitText);
      expect(oppositeLocaleStrings).not.toContain(submitText);

      for (let index = 0; index < (await fields.count()); index += 1) {
        await expectTouchTarget(
          fields.nth(index),
          `Registration field ${index + 1}`,
        );
      }
      const passwordVisibilityScenarios = [
        {
          hide: registerCatalog.form.hidePassword,
          input: form.getByLabel(registerCatalog.form.passwordLabel, {
            exact: true,
          }),
          show: registerCatalog.form.showPassword,
        },
        {
          hide: registerCatalog.form.hidePasswordConfirm,
          input: form.getByLabel(registerCatalog.form.passwordConfirmLabel, {
            exact: true,
          }),
          show: registerCatalog.form.showPasswordConfirm,
        },
      ];

      for (const [
        index,
        passwordVisibility,
      ] of passwordVisibilityScenarios.entries()) {
        const reveal = form.getByRole("button", {
          exact: true,
          name: passwordVisibility.show,
        });

        await expectTouchTarget(reveal, `Password reveal action ${index + 1}`);
        await expect(reveal).toHaveAttribute("aria-pressed", "false");
        await expect(passwordVisibility.input).toHaveAttribute(
          "type",
          "password",
        );
        await reveal.click();
        const hide = form.getByRole("button", {
          exact: true,
          name: passwordVisibility.hide,
        });

        await expect(hide).toHaveAttribute("aria-pressed", "true");
        await expect(passwordVisibility.input).toHaveAttribute("type", "text");
        await expect(hide).toBeVisible();
      }

      // Reveal clicks may scroll long registration cards on short/mobile
      // viewports. Restore the true initial position before measuring layout.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      await expectTouchTarget(legalTarget, "Legal acceptance control");
      await expectTouchTarget(submit, "Create-workspace action");

      const expectedControlHeight = viewportHeight <= 800 ? 44 : 48;

      for (let index = 0; index < (await fields.count()); index += 1) {
        const field = fields.nth(index);
        const isWorkspaceField = (await field.getAttribute("name")) === "slug";
        const control = isWorkspaceField ? workspaceControl : field;
        const controlHeight = isWorkspaceField
          ? viewportHeight <= 800
            ? 46
            : 48
          : expectedControlHeight;
        const controlBox = await control.boundingBox();

        expect(
          controlBox,
          `Registration control ${index + 1} must remain measurable after interaction.`,
        ).not.toBeNull();
        expect(
          Math.abs(controlBox.height - controlHeight),
          `Registration control ${index + 1} must use the ${controlHeight}px ${
            viewportHeight <= 800 ? "short-height" : "standard"
          } control contract.`,
        ).toBeLessThanOrEqual(1);
      }

      const submitBox = await submit.boundingBox();

      expect(
        submitBox,
        "The registration CTA must be measurable.",
      ).not.toBeNull();
      expect(
        Math.abs(submitBox.height - expectedControlHeight),
        `The registration CTA must use the ${expectedControlHeight}px ${
          viewportHeight <= 800 ? "short-height" : "standard"
        } control contract.`,
      ).toBeLessThanOrEqual(1);

      const description = form.getByText(registerCatalog.form.description, {
        exact: true,
      });

      if (viewportHeight <= 800) {
        await expect(description).toBeHidden();
      } else {
        await expect(description).toBeVisible();
      }

      const compactTrialBenefit = form.getByText(registerCatalog.form.trial, {
        exact: true,
      });

      if (viewportWidth >= DESKTOP_BREAKPOINT) {
        await expect(compactTrialBenefit).toBeHidden();
      } else {
        await expect(compactTrialBenefit).toBeVisible();
      }

      const swashes = await expectTwoWebpSwashes(visualPanel);
      const cardBox = await authCard.boundingBox();
      const cardStyle = await authCard.evaluate((element) => {
        const style = window.getComputedStyle(element);

        return {
          backdropFilter: style.backdropFilter,
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          boxShadow: style.boxShadow,
          maxWidth: style.maxWidth,
        };
      });

      expect(
        cardBox,
        "The platform registration card must be measurable.",
      ).not.toBeNull();
      expect(cardBox.x).toBeGreaterThanOrEqual(-1);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(viewportWidth + 1);
      expect(cardBox.width).toBeLessThanOrEqual(620 + 1);
      expect(cardBox.y).toBeGreaterThanOrEqual(
        headerBox.y + headerBox.height - 1,
      );
      expect(cardStyle.maxWidth).toBe("620px");
      expect(cardStyle.borderRadius).toBe("4px");
      expect(cardStyle.backgroundColor).toBe("rgb(255, 254, 251)");
      expect(cardStyle.boxShadow).not.toBe("none");
      expect(cardStyle.backdropFilter).toBe("none");

      const authGridBox = await authGrid.boundingBox();
      const leftPanelBox = await leftPanel.boundingBox();

      expect(
        authGridBox,
        "The auth split grid must be measurable.",
      ).not.toBeNull();
      expect(
        leftPanelBox,
        "The auth form panel must be measurable.",
      ).not.toBeNull();
      expect(Math.abs(authGridBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(leftPanelBox.y)).toBeLessThanOrEqual(1);

      if (viewportWidth >= DESKTOP_BREAKPOINT) {
        await expect(visualPanel).toBeVisible();
        await expect(storyCard).toBeVisible();
        const visualPanelBox = await visualPanel.boundingBox();
        const visualPanelStyle = await visualPanel.evaluate((element) => {
          const style = window.getComputedStyle(element);

          return {
            backgroundColor: style.backgroundColor,
            backgroundImage: style.backgroundImage,
            height: style.height,
            minHeight: style.minHeight,
            position: style.position,
            top: style.top,
          };
        });
        const storyCardBox = await storyCard.boundingBox();
        const storyCardStyle = await storyCard.evaluate((element) => {
          const style = window.getComputedStyle(element);

          return {
            backdropFilter: style.backdropFilter,
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            maxWidth: style.maxWidth,
          };
        });

        expect(
          visualPanelBox,
          "The registration editorial panel must be measurable.",
        ).not.toBeNull();
        expect(
          Math.abs(visualPanelBox.y),
          "The registration editorial panel must begin at the viewport top behind the auth header.",
        ).toBeLessThanOrEqual(1);
        expect(
          brandBox.x + brandBox.width / 2,
          "The wordmark must remain over the left registration panel.",
        ).toBeLessThan(visualPanelBox.x + 1);
        expect(
          actionSurfaceBox.x + actionSurfaceBox.width / 2,
          "The auth actions must remain over the registration editorial panel.",
        ).toBeGreaterThanOrEqual(visualPanelBox.x - 1);
        expect(
          visualPanelBox.y + visualPanelBox.height,
          "The registration editorial panel must reach the viewport bottom.",
        ).toBeGreaterThanOrEqual(viewportHeight - 1);
        expect(
          visualPanelBox.y + visualPanelBox.height,
          "The initial registration editorial panel must not extend below the viewport.",
        ).toBeLessThanOrEqual(viewportHeight + 1);
        expect(
          Math.abs(visualPanelBox.x - (authGridBox.x + authGridBox.width / 2)),
          "The desktop registration split must keep two equal panels.",
        ).toBeLessThanOrEqual(1);
        expect(
          Math.abs(
            visualPanelBox.x +
              visualPanelBox.width -
              (authGridBox.x + authGridBox.width),
          ),
          "The editorial panel must end at the auth grid edge.",
        ).toBeLessThanOrEqual(1);
        expect(visualPanelStyle.position).toBe("sticky");
        expect(visualPanelStyle.top).toBe("0px");
        expect(Number.parseFloat(visualPanelStyle.height)).toBeCloseTo(
          viewportHeight,
          0,
        );
        expect(Number.parseFloat(visualPanelStyle.minHeight)).toBeCloseTo(
          viewportHeight,
          0,
        );
        expect(visualPanelStyle.backgroundColor).toBe("rgb(245, 241, 233)");
        expect(visualPanelStyle.backgroundImage).toBe("none");
        expect(
          storyCardBox,
          "The registration launch-path card must be measurable.",
        ).not.toBeNull();
        expect(storyCardBox.x).toBeGreaterThanOrEqual(visualPanelBox.x - 1);
        expect(storyCardBox.x + storyCardBox.width).toBeLessThanOrEqual(
          visualPanelBox.x + visualPanelBox.width + 1,
        );
        expect(storyCardStyle.maxWidth).toBe("350px");
        expect(storyCardStyle.borderRadius).toBe("4px");
        expect(storyCardStyle.backgroundColor).toBe("rgb(255, 254, 251)");
        expect(storyCardStyle.boxShadow).not.toBe("none");
        expect(storyCardStyle.backdropFilter).toBe("none");
        for (let index = 0; index < 2; index += 1) {
          await expect(swashes.nth(index)).toBeVisible();
        }
      } else {
        await expect(visualPanel).toBeHidden();
        await expect(storyCard).toBeHidden();
        await expect(heading).toBeInViewport();
        expect(
          actionSurfaceBox.x + actionSurfaceBox.width,
          "Compact auth actions must remain inside the visible registration panel.",
        ).toBeLessThanOrEqual(leftPanelBox.x + leftPanelBox.width + 1);
      }

      await expectNoHorizontalOverflow(page);

      if (viewportWidth === 320 || viewportWidth === 390) {
        expect(cardBox.width).toBeLessThanOrEqual(viewportWidth - 16);

        for (let index = 0; index < (await fields.count()); index += 1) {
          const fieldBox = await fields.nth(index).boundingBox();

          expect(fieldBox.x).toBeGreaterThanOrEqual(-1);
          expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(
            viewportWidth + 1,
          );
        }
      }

      const initialSubmitBox = await submit.boundingBox();
      const initiallyFullyVisible = Boolean(
        initialSubmitBox &&
        initialSubmitBox.y >= headerBox.y + headerBox.height - 1 &&
        initialSubmitBox.y + initialSubmitBox.height <= viewportHeight + 1,
      );

      if (!initiallyFullyVisible) {
        const scrollGeometry = await page.evaluate(() => ({
          clientHeight: document.documentElement.clientHeight,
          scrollHeight: Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
          ),
        }));

        expect(
          scrollGeometry.scrollHeight,
          "A below-fold registration CTA requires intentional vertical scrolling.",
        ).toBeGreaterThan(scrollGeometry.clientHeight);
      }

      await submit.scrollIntoViewIfNeeded();
      await expect(submit).toBeInViewport({ ratio: 0.99 });

      const visibleSubmitBox = await submit.boundingBox();

      expect(visibleSubmitBox).not.toBeNull();
      expect(visibleSubmitBox.x).toBeGreaterThanOrEqual(-1);
      expect(visibleSubmitBox.x + visibleSubmitBox.width).toBeLessThanOrEqual(
        viewportWidth + 1,
      );
      expect(visibleSubmitBox.y).toBeGreaterThanOrEqual(-1);
      expect(visibleSubmitBox.y + visibleSubmitBox.height).toBeLessThanOrEqual(
        viewportHeight + 1,
      );
      await expectNoHorizontalOverflow(page);

      if (!initiallyFullyVisible) {
        await attachViewportScreenshot(page, testInfo, locale, "register-cta");
      }

      await expectNoAccessibilityViolations(page);

      const alternateLanguageSurface = await expectPlatformLanguageControl(
        authHeader,
        copy,
      );

      await alternateLanguageSurface.languageControl.click();
      const alternateOption = alternateLanguageSurface.languageSelector
        .locator('button[aria-pressed="false"]')
        .filter({ hasText: copy.alternateLanguage });

      await expect(alternateOption).toHaveCount(1);
      await expect(alternateOption).toContainText(copy.alternateShortLabel);
      await alternateOption.click();

      await expect
        .poll(() => new URL(page.url()).pathname)
        .toBe(`/${copy.alternateLocale}/register`);
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        copy.alternateLocale,
      );
      expect(new URL(page.url()).search).toBe("?source=public-header");
      expect(new URL(page.url()).hash).toBe("#studio");

      const localeCookie = (await page.context().cookies()).find(
        ({ name }) => name === "NEXT_LOCALE",
      );

      expect(localeCookie?.value).toBe(copy.alternateLocale);
      expect(
        pageErrors,
        "The page emitted uncaught JavaScript errors.",
      ).toEqual([]);
      expect(consoleErrors, "The page emitted console errors.").toEqual([]);
    });
  }
});
