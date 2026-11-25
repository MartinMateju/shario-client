import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const API_ORIGIN = "http://127.0.0.1:4311";
const TENANT_ORIGIN = "http://studio-alpha.shario.localhost:4310";
const PRESET_IDS = [
  "modern-minimal-v1",
  "warm-organic-v1",
  "classic-editorial-v1",
];

const PRESET_RECIPES = {
  "classic-editorial-v1": {
    stylePreset: "classic-editorial-v1",
    fontPreset: "editorial-serif-v1",
    accentColor: "#1F36D4",
    secondaryColor: "#D27357",
    backgroundColor: "#FCFBF8",
    textColor: "#1F1F1F",
    labelColor: "#1F36D4",
  },
  "modern-minimal-v1": {
    stylePreset: "modern-minimal-v1",
    fontPreset: "shario-sans-v1",
    accentColor: "#242424",
    secondaryColor: "#7D7D7D",
    backgroundColor: "#F6F6F4",
    textColor: "#171717",
    labelColor: "#454540",
  },
  "warm-organic-v1": {
    stylePreset: "warm-organic-v1",
    fontPreset: "warm-serif-v1",
    accentColor: "#9B4B35",
    secondaryColor: "#C96F4F",
    backgroundColor: "#F9EADC",
    textColor: "#2F241F",
    labelColor: "#88422F",
  },
};

const PRESET_RECIPE_BRANDING_KEYS = new Set([
  "stylePreset",
  "fontPreset",
  "accentColor",
  "secondaryColor",
  "backgroundColor",
  "textColor",
  "labelColor",
]);

const readState = async (request) => {
  const response = await request.get(`${API_ORIGIN}/__rollout/state`);
  expect(response.ok()).toBe(true);
  return response.json();
};

const withoutPresetRecipe = (publicSite) => ({
  branding: Object.fromEntries(
    Object.entries(publicSite.branding).filter(
      ([key]) => !PRESET_RECIPE_BRANDING_KEYS.has(key),
    ),
  ),
  pages: publicSite.pages,
  header: publicSite.header,
  footer: publicSite.footer,
  login: publicSite.login,
  register: publicSite.register,
  customerPortal: publicSite.customerPortal,
});

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

const expectNoHorizontalOverflow = async (page) => {
  expect(
    await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body?.scrollWidth || 0,
      ),
    ),
  ).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth + 1),
  );
};

const waitForVisualStability = async (page) => {
  await page.evaluate(async () => {
    await document.fonts?.ready;

    const visibleImages = [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
      );
    });

    await Promise.all(
      visibleImages.map(async (image) => {
        if (!image.complete) {
          await Promise.race([
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
            new Promise((resolve) => setTimeout(resolve, 5_000)),
          ]);
        }
        if (image.naturalWidth > 0 && typeof image.decode === "function") {
          await image.decode().catch(() => undefined);
        }
      }),
    );

    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });

  await page.waitForFunction(() => {
    const transitions = [
      ...document.querySelectorAll("[data-page-transition]"),
    ];

    return (
      transitions.length > 0 &&
      transitions.every(
        (element) =>
          Number.parseFloat(getComputedStyle(element).opacity || "1") >= 0.99,
      )
    );
  });
};

test("page images change independently and stay private until published", async ({
  page,
  request,
}, testInfo) => {
  const resetResponse = await request.post(`${API_ORIGIN}/__rollout/reset`);
  expect(resetResponse.ok()).toBe(true);
  const initial = await resetResponse.json();
  const originalImages = initial.published.customerPortal.pageImages;
  const replacementImage =
    "https://visual-assets.example.test/page-hero-replacement.webp";
  await page.route(replacementImage, (route) =>
    route.fulfill({
      path: "public/images/DSC09040.webp",
      contentType: "image/webp",
      status: 200,
    }),
  );

  await page.goto(`${TENANT_ORIGIN}/en/app/settings/public-site`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Customer portal", exact: true }).click();
  const imageEditor = page.locator("[data-customer-portal-page-image-editor]");
  await expect(imageEditor).toBeVisible();
  const pageSelector = imageEditor.getByRole("combobox", {
    name: "Page to customize",
    exact: true,
  });
  const expectPreviewImage = async (
    pageKey,
    source,
    { editPhoto = false } = {},
  ) => {
    await imageEditor
      .getByRole("button", { name: "Preview this header", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Preview draft", exact: true })
      .click();
    const preview = page
      .frameLocator('iframe[title="Studio Olivie production preview"]')
      .locator(`[data-customer-portal-page-image-preview="${pageKey}"]`);
    await expect(preview).toBeVisible();
    if (source) {
      await expect(preview.locator("img")).toHaveAttribute("src", source);
      await expect
        .poll(() =>
          preview
            .locator("img")
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
    } else {
      await expect(preview.locator("img")).toHaveCount(0);
      await expect(
        preview.locator("[data-customer-portal-hero-media]"),
      ).toHaveCount(0);
    }
    if (editPhoto) {
      await preview.locator("[data-customer-portal-hero-media]").click();
    } else {
      await page
        .getByRole("button", { name: "Edit website", exact: true })
        .click();
    }
    await expect(imageEditor).toBeVisible();
    await expect(pageSelector).toHaveValue(pageKey);
  };
  await pageSelector.selectOption("vouchers");
  await expectPreviewImage("vouchers", originalImages.vouchers);

  const vouchersField = imageEditor.locator(
    '[data-public-site-field-path="customerPortal.pageImages.vouchers"]',
  );
  await vouchersField.locator("summary").click();
  await vouchersField
    .getByRole("textbox", {
      name: "Advanced: use an external image URL",
      exact: true,
    })
    .fill(replacementImage);
  await expectPreviewImage("vouchers", replacementImage, { editPhoto: true });
  await pageSelector.selectOption("courses");
  await expectPreviewImage("courses", originalImages.courses);
  await pageSelector.selectOption("vouchers");
  await expectPreviewImage("vouchers", replacementImage);

  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved. Customers still see the published version."),
  ).toBeVisible();
  const saved = await readState(request);
  expect(saved.draft.customerPortal.pageImages).toMatchObject({
    ...originalImages,
    vouchers: replacementImage,
  });
  expect(saved.published.customerPortal.pageImages).toEqual(originalImages);
  const readPublishedImages = async () => {
    const response = await request.get(
      `${API_ORIGIN}/public/tenants/studio-alpha/config`,
    );
    expect(response.ok()).toBe(true);
    return (await response.json()).tenant.publicSite.customerPortal.pageImages;
  };
  expect(await readPublishedImages()).toEqual(originalImages);

  const publish = async () => {
    await page
      .getByRole("button", { name: "Publish changes", exact: true })
      .click();
    const confirmation = page.getByRole("dialog");
    await expect(confirmation).toContainText("Publish this public website?");
    await confirmation
      .getByRole("button", { name: "Publish changes", exact: true })
      .click();
    await expect(
      page.getByText("The latest draft is now live for customers."),
    ).toBeVisible();
  };
  await publish();
  expect(await readPublishedImages()).toMatchObject({
    ...originalImages,
    vouchers: replacementImage,
  });

  await imageEditor
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expectPreviewImage("vouchers", "");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved. Customers still see the published version."),
  ).toBeVisible();
  const removedDraft = await readState(request);
  expect(removedDraft.draft.customerPortal.pageImages).toMatchObject({
    ...originalImages,
    vouchers: "",
  });
  expect((await readPublishedImages()).vouchers).toBe(replacementImage);
  await publish();
  expect(await readPublishedImages()).toMatchObject({
    ...originalImages,
    vouchers: "",
  });

  await pageSelector.selectOption("courses");
  await expectPreviewImage("courses", originalImages.courses);
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(
    page,
    "[data-customer-portal-page-image-editor]",
  );
  await testInfo.attach(`page-image-editor-${testInfo.project.name}`, {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png",
  });
});

test("selector → preview → save → publish reaches public and login surfaces", async ({
  page,
  request,
}, testInfo) => {
  const resetResponse = await request.post(`${API_ORIGIN}/__rollout/reset`);
  expect(resetResponse.ok()).toBe(true);
  const initial = await resetResponse.json();
  const preserved = withoutPresetRecipe(initial.published);
  let normalizedPreserved;
  let previouslyPublishedPreset = initial.published.branding.stylePreset;

  await page.goto(`${TENANT_ORIGIN}/en/app/settings/public-site`, {
    waitUntil: "domcontentloaded",
  });

  const styleSelector = page.locator("[data-style-preset-selector]");
  await expect(styleSelector.getByRole("radio")).toHaveCount(3);

  const otherEditor = await page.context().newPage();
  await otherEditor.goto(page.url(), { waitUntil: "domcontentloaded" });
  await expect(
    otherEditor.locator("[data-style-preset-selector] input"),
  ).toHaveCount(3);
  await otherEditor.evaluate(() => {
    window.addEventListener("storage", (event) => {
      if (event.key === "shario:public-site-published:studio-alpha") {
        document.documentElement.dataset.receivedPublication = "true";
      }
    });
  });

  for (const presetId of PRESET_IDS) {
    const optionCard = styleSelector.locator(
      `[data-style-preset-id="${presetId}"]`,
    );
    const option = optionCard.locator(`input[value="${presetId}"]`);
    await optionCard.click();
    await expect(option).toBeChecked();
    await page
      .getByRole("button", { name: "Preview draft", exact: true })
      .click();
    const preview = page.locator("[data-public-site-production-preview]");
    await expect(preview).toBeVisible();
    const previewRoot = page
      .frameLocator('iframe[title="Studio Olivie production preview"]')
      .locator("[data-tenant-style]")
      .first();
    await expect(previewRoot).toHaveAttribute("data-tenant-style", presetId);
    await expect(previewRoot).toBeVisible();
    await page
      .getByRole("button", { name: "Edit website", exact: true })
      .click();

    const saveButton = page.getByRole("button", {
      name: "Save draft",
      exact: true,
    });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(
      page.getByText("Draft saved. Customers still see the published version."),
    ).toBeVisible();

    const saved = await readState(request);
    expect(saved.draft.branding).toMatchObject(PRESET_RECIPES[presetId]);
    expect(saved.published.branding.stylePreset).toBe(
      previouslyPublishedPreset,
    );
    const savedCustomization = withoutPresetRecipe(saved.draft);
    // The sparse legacy fixture gains default fields on its first save.
    // Every configured value (including array order/length) must survive;
    // later presets must also preserve all of those normalized defaults.
    expect(savedCustomization).toMatchObject(preserved);
    if (normalizedPreserved) {
      expect(savedCustomization).toEqual(normalizedPreserved);
    } else {
      normalizedPreserved = savedCustomization;
    }

    await page
      .getByRole("button", { name: "Publish changes", exact: true })
      .click();
    const confirmation = page.getByRole("dialog");
    await expect(confirmation).toContainText("Publish this public website?");
    await confirmation
      .getByRole("button", { name: "Publish changes", exact: true })
      .click();
    await expect(
      page.getByText("The latest draft is now live for customers."),
    ).toBeVisible();

    if (presetId === PRESET_IDS[0]) {
      await expect(otherEditor.locator("html")).toHaveAttribute(
        "data-received-publication",
        "true",
      );
      await otherEditor.close();
    }
    const published = await readState(request);
    // Counts server and browser requests from both editors and the preview.
    if (presetId === PRESET_IDS[0]) expect(published.configReads).toBe(0);
    expect(published.published.branding).toMatchObject(
      PRESET_RECIPES[presetId],
    );
    expect(withoutPresetRecipe(published.published)).toEqual(
      normalizedPreserved,
    );

    const publicPage = await page.context().newPage();
    await publicPage.goto(`${TENANT_ORIGIN}/en`, {
      waitUntil: "domcontentloaded",
    });
    const publicRoot = publicPage
      .locator(`[data-tenant-style="${presetId}"]`)
      .first();
    await expect(publicRoot).toBeVisible({ timeout: 20_000 });
    await waitForVisualStability(publicPage);
    const palette = await publicRoot.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        accent: style.getPropertyValue("--tenant-accent").trim().toUpperCase(),
        secondary: style
          .getPropertyValue("--tenant-secondary")
          .trim()
          .toUpperCase(),
        background: style
          .getPropertyValue("--tenant-background")
          .trim()
          .toUpperCase(),
        text: style.getPropertyValue("--tenant-text").trim().toUpperCase(),
      };
    });
    const recipe = PRESET_RECIPES[presetId];
    expect(palette).toEqual({
      accent: recipe.accentColor,
      secondary: recipe.secondaryColor,
      background: recipe.backgroundColor,
      text: recipe.textColor,
    });
    await expectNoHorizontalOverflow(publicPage);
    await expectNoSeriousAccessibilityViolations(
      publicPage,
      `[data-tenant-style="${presetId}"]`,
    );
    await testInfo.attach(`${presetId}-${testInfo.project.name}-public`, {
      body: await publicPage.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    await publicPage.goto(`${TENANT_ORIGIN}/en/login`, {
      waitUntil: "domcontentloaded",
    });
    const loginRoot = publicPage
      .locator(`[data-tenant-style="${presetId}"]`)
      .first();
    await expect(loginRoot).toBeVisible({ timeout: 20_000 });
    await expect(publicPage.locator("[data-auth-layout]")).toBeVisible({
      timeout: 20_000,
    });
    await waitForVisualStability(publicPage);
    await expectNoHorizontalOverflow(publicPage);
    await expectNoSeriousAccessibilityViolations(
      publicPage,
      `[data-tenant-style="${presetId}"]`,
    );
    await testInfo.attach(`${presetId}-${testInfo.project.name}-login`, {
      body: await publicPage.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    await publicPage.close();
    previouslyPublishedPreset = presetId;
  }

  const corruptResponse = await request.post(
    `${API_ORIGIN}/__rollout/corrupt`,
    {
      data: { stylePreset: "future-layout-v9" },
    },
  );
  expect(corruptResponse.ok()).toBe(true);

  const fallbackPage = await page.context().newPage();
  await fallbackPage.goto(`${TENANT_ORIGIN}/en`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    fallbackPage.locator('[data-tenant-style="classic-editorial-v1"]').first(),
  ).toBeVisible({ timeout: 20_000 });
  await fallbackPage.close();
});
