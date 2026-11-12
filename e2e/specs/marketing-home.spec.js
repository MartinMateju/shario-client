import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import en from "../../src/messages/en.json";
import cs from "../../src/messages/cs.json";

for (const [locale, messages] of [
  ["en", en],
  ["cs", cs],
]) {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test(`${locale}: visitors can explore Shario at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const copy = messages.SharioMarketing;
      await page.goto(`/${locale}`);
      await expect(page).toHaveTitle(/Shario/);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        `${copy.hero.title} ${copy.hero.highlight}`,
      );
      await expect(page.locator("header [data-shario-logo]")).toBeVisible();
      await expect(page.locator(".shario-hero img")).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);
      await page
        .getByRole("link", { name: copy.hero.secondary, exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/product$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        copy.product.title,
      );
      await page.goto(`/${locale}`);
      const question = page.locator("summary").first();
      await question.click();
      await expect(page.getByText(copy.faq.one.answer)).toBeVisible();
      await page
        .locator(".shario-hero")
        .getByRole("link", { name: copy.hero.cta })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/register`));
    });
  }
}

test("homepage meets accessibility checks and exposes generic space destinations", async ({
  page,
}) => {
  await page.goto("/en");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page
    .getByRole("button", {
      name: en.SharioMarketing.footer.spaces,
      exact: true,
    })
    .click();
  await page
    .getByRole("link", {
      name: new RegExp(en.SharioMarketing.spaces.coworking.title),
    })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/for-studios#coworking$/);
  await expect(page.locator("#coworking")).toBeVisible();
  await expect(page.locator('a[href*="pottery"]')).toHaveCount(0);
});

test("mobile navigation reaches plans and closes after navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");
  await page
    .getByRole("button", { name: en.Header.openMenu, exact: true })
    .click();
  const menu = page.locator("#mobile-menu");
  await expect(menu).toBeVisible();
  await menu
    .getByRole("link", { name: en.Header.pricing, exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/pricing$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: en.Header.openMenu, exact: true }),
  ).toBeVisible();
});
