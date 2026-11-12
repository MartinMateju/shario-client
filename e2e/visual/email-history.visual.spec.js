import { expect, test } from "@playwright/test";

import {
  VISUAL_FIXED_TIME,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
} from "./admin-fixtures.js";

const deliveries = Array.from({ length: 45 }, (_, index) => {
  const number = 45 - index;
  const timestamp = new Date(
    Date.parse(VISUAL_FIXED_TIME) - index * 60_000,
  ).toISOString();
  return {
    _id: `visual-email-${number}`,
    recipientEmail: `maker-${String(number).padStart(3, "0")}@example.test`,
    recipientName: `Zákazník ${number}`,
    subject: "Atelier Klei | Potvrzení rezervace",
    automation: { name: "Potvrzení rezervace po zaplacení" },
    emailType: "afterBookingCreated",
    status: number % 3 === 0 ? "failed" : "delivered",
    createdAt: timestamp,
    sentAt: number % 3 === 0 ? null : timestamp,
    scheduledFor: timestamp,
  };
});

test("delivery history pages through 20 recent messages and resets filters", async ({
  page,
  context,
}, testInfo) => {
  const requests = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const { unexpectedRequests } = await installAdminApiMocks(page, {
    workspaceLocale: "cs",
  });
  await context.addCookies([
    {
      name: "shario_language",
      value: "CS",
      url: VISUAL_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);

  await page.route(
    /^http:\/\/api\.shario\.localhost:4311\/communication-email-logs(?:\?|$)/,
    async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      const url = new URL(route.request().url());
      const params = Object.fromEntries(url.searchParams);
      requests.push(params);
      const currentPage = Number(params.page);
      const pageSize = Number(params.limit);
      const search = (params.search || "").toLowerCase();
      const filtered = deliveries.filter(
        (log) =>
          (params.status === "all" || log.status === params.status) &&
          log.recipientEmail.toLowerCase().includes(search),
      );
      await route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": VISUAL_TENANT_ORIGIN,
          "access-control-allow-credentials": "true",
          "cache-control": "no-store",
        },
        contentType: "application/json",
        body: JSON.stringify({
          logs: filtered.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize,
          ),
          totalCount: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSize),
          currentPage,
          pageSize,
        }),
      });
    },
  );

  await page.goto(
    `${VISUAL_TENANT_ORIGIN}/cs/app/communications?section=history`,
    {
      waitUntil: "domcontentloaded",
    },
  );
  const history = page.locator("[data-outbound-email-history]");
  const mobile = (page.viewportSize()?.width ?? 1280) < 768;
  const visibleEntries = mobile
    ? history.getByRole("article")
    : history.locator("tbody tr");
  const topPagination = history
    .getByRole("navigation", {
      name: "Stránky historie doručování e-mailů",
    })
    .first();
  const next = topPagination.getByRole("button", {
    name: "Další",
    exact: true,
  });
  const previous = topPagination.getByRole("button", {
    name: "Předchozí",
    exact: true,
  });
  const range = history.locator('[aria-live="polite"]');
  const search = history.getByRole("textbox");
  const status = history.getByRole("combobox");

  await expect(visibleEntries).toHaveCount(20);
  await expect(range).toContainText("Zobrazeno 1–20 z 45 e-mailových doručení");
  await expect(range).toContainText("Nejnovější první · 20 na stránku");
  await expect(visibleEntries.first()).toContainText("maker-045@example.test");
  await expect(visibleEntries.last()).toContainText("maker-026@example.test");
  await expect(
    visibleEntries.first().getByText("Potvrzení rezervace", { exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("afterBookingCreated", { exact: true }),
  ).toHaveCount(0);
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  if (!mobile) {
    const rowHeights = await visibleEntries.evaluateAll((rows) =>
      rows.map((row) => row.getBoundingClientRect().height),
    );
    expect(Math.max(...rowHeights)).toBeLessThanOrEqual(80);
    const deliveredLabel = visibleEntries
      .nth(1)
      .getByText("Doručeno", { exact: true });
    expect((await deliveredLabel.boundingBox()).height).toBeLessThanOrEqual(20);
  }

  await next.click();
  await expect(range).toContainText(
    "Zobrazeno 21–40 z 45 e-mailových doručení",
  );
  await expect(visibleEntries).toHaveCount(20);
  await expect(visibleEntries.first()).toContainText("maker-025@example.test");
  await expect(visibleEntries.last()).toContainText("maker-006@example.test");
  await previous.click();
  await expect(range).toContainText("Zobrazeno 1–20 z 45 e-mailových doručení");
  await next.click();
  await expect(range).toContainText(
    "Zobrazeno 21–40 z 45 e-mailových doručení",
  );
  await next.click();
  await expect(visibleEntries).toHaveCount(5);
  await expect(range).toContainText(
    "Zobrazeno 41–45 z 45 e-mailových doručení",
  );
  await expect(visibleEntries.first()).toContainText("maker-005@example.test");
  await expect(visibleEntries.last()).toContainText("maker-001@example.test");
  await expect(next).toBeDisabled();

  await status.selectOption("failed");
  await expect(range).toContainText("Zobrazeno 1–15 z 15 e-mailových doručení");
  await expect(visibleEntries).toHaveCount(15);
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await status.selectOption("all");
  await expect(visibleEntries).toHaveCount(20);
  await next.click();
  await expect(range).toContainText(
    "Zobrazeno 21–40 z 45 e-mailových doručení",
  );
  await search.fill("maker-04");
  await expect(range).toContainText("Zobrazeno 1–6 z 6 e-mailových doručení");
  await expect(visibleEntries).toHaveCount(6);
  await expect(previous).toBeDisabled();
  await expect(next).toBeDisabled();
  await search.fill("");
  await expect(visibleEntries).toHaveCount(20);
  await expect(range).toContainText("Zobrazeno 1–20 z 45 e-mailových doručení");

  expect(requests.every(({ limit }) => limit === "20")).toBe(true);
  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ page: "1", status: "all", search: "" }),
      expect.objectContaining({ page: "2", status: "all", search: "" }),
      expect.objectContaining({ page: "3", status: "all", search: "" }),
      expect.objectContaining({ page: "1", status: "failed", search: "" }),
      expect.objectContaining({ page: "1", status: "all", search: "maker-04" }),
    ]),
  );
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(Math.max(geometry.root, geometry.body)).toBeLessThanOrEqual(
    geometry.width + 1,
  );
  for (const control of [next, previous]) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect([...unexpectedRequests]).toEqual([]);
  expect(pageErrors).toEqual([]);

  await history.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const screenshotPath = testInfo.outputPath("email-history-paginated-cs.png");
  await page.screenshot({
    path: screenshotPath,
    animations: "disabled",
    caret: "hide",
  });
  await testInfo.attach("email-history-paginated-cs", {
    path: screenshotPath,
    contentType: "image/png",
  });
});
