import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import {
  VISUAL_API_ORIGIN,
  VISUAL_FIXED_TIME,
  VISUAL_IDS,
  VISUAL_TENANT_ORIGIN,
  installAdminApiMocks,
} from "./admin-fixtures.js";

const messages = JSON.parse(readFileSync("src/messages/cs.json", "utf8"));
const guided = messages.AI.guided;
const reportCopy = messages.StudioManagement;
const enabledProjects = new Set(["desktop-1280", "mobile-320"]);
const reportId = "64e000000000000000000099";
const answerText =
  "Dnes máte 12 rezervací pro 18 účastníků. Dvě rezervace zatím čekají na platbu. Zkontrolujte je před příchodem klientů.";
const fixtureReport = {
  id: reportId,
  locationLabel: "Studio Olivie · Brno",
  generatedAt: VISUAL_FIXED_TIME,
  snapshot: {
    metadata: {
      timezone: "Europe/Prague",
      period: { from: "2026-07-01", to: "2026-07-30" },
      comparisonPeriod: { from: "2026-06-01", to: "2026-06-30" },
    },
  },
  narrative: {
    mode: "ai",
    headline: "Měsíční přehled vašeho studia",
    summary:
      "V červenci evidujete 186 rezervací. Počet účastníků v uplynulých rezervacích vzrostl oproti červnu.",
    highlights: ["186 rezervací za sledované období."],
    attention: ["Dvě dnešní rezervace zatím čekají na platbu."],
    recommendations: ["Před příchodem klientů zkontrolujte čekající platby."],
    dataLimitations: ["Účastníci rezervací nejsou ověřená návštěvnost."],
  },
  sections: [
    {
      key: "bookings",
      title: "Rezervace a účastníci",
      columns: ["Ukazatel", "Červenec", "Červen"],
      rows: [
        { label: "Rezervace", value: "186", previous: "166" },
        {
          label: "Účastníci v uplynulých rezervacích",
          value: "224",
          previous: "205",
        },
      ],
      notes: ["Srovnáváme dvě období po 30 dnech."],
    },
  ],
};

async function installGuidedApiMocks(page) {
  const fixture = await installAdminApiMocks(page, {
    workspaceLocale: "cs",
    workspaceRole: "owner",
  });
  const requests = {
    conversations: [],
    answers: [],
    reports: [],
    downloads: [],
  };

  // Registered last so only the flow's endpoints override the shared fixtures.
  // All responses are local test data; no AI provider or backend is contacted.
  await page.route(`${VISUAL_API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const headers = {
      "access-control-allow-origin":
        request.headers().origin || VISUAL_TENANT_ORIGIN,
      "access-control-allow-credentials": "true",
      "access-control-expose-headers": "content-disposition",
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      vary: "Origin",
    };
    const json = (body, status = 200) =>
      route.fulfill({ status, headers, body: JSON.stringify(body) });

    if (method === "GET" && url.pathname === "/ai/capabilities") {
      await json({
        enabled: true,
        available: true,
        features: {
          assistant: true,
          reportInsights: true,
          dailyBriefing: true,
          businessAdvisor: true,
        },
        usage: { exhausted: false },
        credits: { remaining: 1000 },
      });
    } else if (method === "GET" && url.pathname === "/ai/actions") {
      await json({ data: { items: [], pendingCount: 0, total: 0 } });
    } else if (
      method === "POST" &&
      url.pathname === "/ai/assistant/conversations"
    ) {
      requests.conversations.push(request.postDataJSON());
      await json({ data: { id: VISUAL_IDS.conversation } }, 201);
    } else if (
      method === "POST" &&
      url.pathname ===
        `/ai/assistant/conversations/${VISUAL_IDS.conversation}/messages`
    ) {
      requests.answers.push(request.postDataJSON());
      await json({
        data: {
          message: {
            id: "answer-bookings",
            role: "assistant",
            content: answerText,
          },
        },
      });
    } else if (method === "POST" && url.pathname === "/dashboard/reports") {
      requests.reports.push(request.postDataJSON());
      await json({ data: fixtureReport }, 201);
    } else if (
      method === "GET" &&
      url.pathname === `/dashboard/reports/${reportId}/pdf`
    ) {
      requests.downloads.push(url.pathname);
      await route.fulfill({
        status: 200,
        headers: {
          ...headers,
          "content-type": "application/pdf",
          "content-disposition":
            'attachment; filename="studio-report-2026-07-30.pdf"',
        },
        body: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
      });
    } else {
      await route.fallback();
    }
  });
  return { ...fixture, requests };
}

async function expectFits(page, surface) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    )
    .toBe(true);
  const overflow = await surface.evaluate((root) => {
    const width = document.documentElement.clientWidth;
    return [root, ...root.querySelectorAll("*")].flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        !rect.width ||
        !rect.height ||
        style.visibility === "hidden" ||
        style.clip !== "auto" ||
        element.closest('[aria-hidden="true"]')
      )
        return [];
      // Report tables intentionally support horizontal scrolling on small screens.
      if (element.closest('[role="region"][tabindex="0"]')) return [];
      return rect.left < -1 || rect.right > width + 1
        ? [
            {
              text: element.textContent.trim().slice(0, 80),
              left: rect.left,
              right: rect.right,
            },
          ]
        : [];
    });
  });
  expect(overflow).toEqual([]);
}

async function capture(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({
    path,
    fullPage: true,
    animations: "disabled",
    scale: "css",
  });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test("guided AI questions open answers, monthly reports and PDF export without a chat composer", async ({
  page,
}, testInfo) => {
  test.skip(
    !enabledProjects.has(testInfo.project.name),
    "Covered at desktop and the narrowest mobile viewport.",
  );
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.clock.setFixedTime(new Date(VISUAL_FIXED_TIME));
  const fixture = await installGuidedApiMocks(page);
  await page.goto(`${VISUAL_TENANT_ORIGIN}/cs/app/ai`, {
    waitUntil: "domcontentloaded",
  });
  const flow = page.locator(
    "#ai-command-panel-assistant [data-ai-guided-questions]",
  );
  await expect(
    flow.getByRole("heading", { name: guided.title, exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(flow.getByRole("button")).toHaveCount(4);
  await expect(flow.getByRole("textbox")).toHaveCount(0);
  await expect(
    flow.getByText(messages.AI.assistant.recent, { exact: true }),
  ).toHaveCount(0);
  expect(fixture.requests.conversations).toEqual([]);
  expect(fixture.requests.reports).toEqual([]);

  await page.locator('[data-product-tour-target="ai-assistant"]').click();
  const drawer = page.locator("[data-ai-assistant-drawer]");
  const drawerFlow = drawer.locator("[data-ai-guided-questions]");
  await expect(
    drawerFlow.getByRole("heading", { name: guided.title, exact: true }),
  ).toBeVisible();
  await expect(drawerFlow.getByRole("button")).toHaveCount(4);
  await expect(drawerFlow.getByRole("textbox")).toHaveCount(0);
  await expect(
    drawerFlow.getByText(messages.AI.assistant.recent, { exact: true }),
  ).toHaveCount(0);
  await expect(drawer).toBeInViewport({ ratio: 1 });
  await expectFits(page, drawer);
  await capture(page, testInfo, "guided-drawer");
  await drawer
    .getByRole("button", { name: messages.AI.assistant.close, exact: true })
    .click();
  await expect(drawer).toHaveCount(0);

  await expectFits(page, flow);
  await capture(page, testInfo, "guided-picker");

  await flow
    .getByRole("button", { name: guided.questions.bookings.label, exact: true })
    .click();
  await expect(flow.getByText(answerText, { exact: true })).toBeVisible();
  await expect(flow.getByRole("textbox")).toHaveCount(0);
  expect(fixture.requests.conversations).toEqual([
    { locale: "cs", locationId: VISUAL_IDS.location },
  ]);
  expect(fixture.requests.answers).toEqual([
    {
      locale: "cs",
      message: guided.questions.bookings.prompt,
      context: { surface: "command_center", route: "/app/ai" },
    },
  ]);
  await expect(
    flow.getByRole("button", { name: guided.report.generate, exact: true }),
  ).toBeEnabled();
  expect(fixture.requests.reports).toEqual([]);
  await expectFits(page, flow);
  await capture(page, testInfo, "guided-answer");

  await flow
    .getByRole("button", { name: guided.report.generate, exact: true })
    .click();
  const report = flow.locator("[data-guided-studio-report]");
  await expect(
    report.getByRole("heading", {
      name: fixtureReport.narrative.headline,
      exact: true,
    }),
  ).toBeVisible();
  await expect(flow.getByText(answerText, { exact: true })).toBeHidden();
  expect(fixture.requests.reports).toEqual([
    { date: "2026-07-30", locationId: VISUAL_IDS.location, locale: "cs" },
  ]);
  await expect(
    report.getByRole("row", { name: "Rezervace 186 166", exact: true }),
  ).toBeVisible();
  await expect(
    report.getByText(fixtureReport.narrative.dataLimitations[0], {
      exact: true,
    }),
  ).toBeVisible();
  await expectFits(page, flow);
  await capture(page, testInfo, "guided-report");

  const downloadPromise = page.waitForEvent("download");
  await report
    .getByRole("button", { name: reportCopy.exportPdf, exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "studio-report-2026-07-30.pdf",
  );
  expect(fixture.requests.downloads).toEqual([
    `/dashboard/reports/${reportId}/pdf`,
  ]);

  await report
    .getByRole("button", { name: guided.report.back, exact: true })
    .click();
  await expect(flow.getByText(answerText, { exact: true })).toBeVisible();
  await expect(
    flow.getByRole("button", { name: guided.report.open, exact: true }),
  ).toBeFocused();
  await flow
    .getByRole("button", { name: guided.report.open, exact: true })
    .click();
  await expect(report).toBeVisible();
  expect(fixture.requests.reports).toHaveLength(1);
  await report
    .getByRole("button", { name: guided.report.back, exact: true })
    .click();
  await flow.getByRole("button", { name: guided.back, exact: true }).click();
  await expect(
    flow.getByRole("heading", { name: guided.title, exact: true }),
  ).toBeVisible();
  await expect(
    flow.getByRole("button", {
      name: guided.questions.bookings.label,
      exact: true,
    }),
  ).toBeFocused();
  await expect(flow.locator("[data-guided-studio-report]")).toHaveCount(0);
  await expect(flow.getByRole("textbox")).toHaveCount(0);
  await expectFits(page, flow);
  expect([...fixture.unexpectedRequests]).toEqual([]);
  expect(pageErrors).toEqual([]);
});
