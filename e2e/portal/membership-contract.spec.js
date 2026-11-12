// Browser UI contracts against disposable local responses. These tests do not
// charge Stripe or claim to verify payment/webhook/accounting implementation.
import { expect, test } from "@playwright/test";

const fixture = `http://127.0.0.1:${process.env.MEMBERSHIP_FIXTURE_PORT || (process.env.CI ? 4311 : 4107)}`;
const controlHeaders = {
  "x-membership-fixture-key": "local-membership-ui-contract",
};
const expectedPlans = [
  { name: "Klei · Chvíle pro sebe", amount: 890, hours: 4 },
  { name: "Klei · Pravidelný rytmus", amount: 1690, hours: 8 },
  { name: "Klei · Vlastní tvorba", amount: 3290, hours: 16 },
  { name: "Klei · Profi", amount: 4600, hours: 30 },
];
const cardFor = (page, name) =>
  page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
const readState = async (request) => {
  const response = await request.get(`${fixture}/__membership-fixture/state`, {
    headers: controlHeaders,
  });
  expect(response.ok()).toBe(true);
  return response.json();
};

test.beforeEach(async ({ page, request }) => {
  expect(
    (
      await request.post(`${fixture}/__membership-fixture/reset`, {
        headers: controlHeaders,
      })
    ).ok(),
  ).toBe(true);
  await page.addLocatorHandler(
    page.locator("[data-customer-portal-tour-dismiss]"),
    (dismiss) => dismiss.click(),
  );
  await page.route("https://visual-assets.example.test/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><text x="0" y="28">Studio</text></svg>',
    }),
  );
  await page.route(
    "https://checkout.stripe.com/c/pay/cs_test_local_membership_*",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<h1>Local checkout handoff fixture — no payment is taken</h1>",
      }),
  );
});

test("all four plans disclose the exact recurring monthly price and share eligible studios", async ({
  page,
}) => {
  await page.goto("/en/portal/membership/plans?location=atelier-brno");
  // The first local visit also compiles the account shell and catalogue route.
  await expect(cardFor(page, expectedPlans[0].name)).toBeVisible({
    timeout: 60_000,
  });
  for (const plan of expectedPlans) {
    const card = cardFor(page, plan.name);
    await expect(
      card.getByText("Monthly membership", { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText(
        new RegExp(
          `Automatically renews at CZK\\s*${plan.amount.toLocaleString("en")} every month until you cancel`,
        ),
      ),
    ).toBeVisible();
    await expect(
      card.getByText(
        new RegExp(
          `${plan.hours} hr of Open Studio time per paid period, for you only`,
        ),
      ),
    ).toBeVisible();
    await expect(
      card.getByText(/Shared balance at: Atelier Brno, Atelier Prague/),
    ).toBeVisible();
    await expect(
      card.getByRole("button", { name: "Choose this plan" }),
    ).toBeDisabled();
  }
  await page.goto("/en/portal/membership/plans?location=atelier-prague");
  for (const plan of expectedPlans)
    await expect(cardFor(page, plan.name)).toBeVisible();
});

test("public and portal memberships show the selected translation without redundant selectors", async ({
  page,
}) => {
  for (const path of [
    "/cs/memberships?currency=EUR&locationId=removed-location",
    "/cs/portal/membership/plans?location=atelier-brno&currency=EUR",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Přeložené členství 1", exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("article")).toHaveCount(4);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    const first = cardFor(page, "Přeložené členství 1");
    await expect(
      first.getByText("Osobní hodiny v ateliéru", { exact: true }),
    ).toBeVisible();
    await expect(first.getByText(/890.*Kč každý měsíc/)).toBeVisible();
    await first.getByText("Podmínky členství", { exact: true }).click();
    await expect(
      first.getByText("České podmínky osobního členství.", { exact: true }),
    ).toBeVisible();
  }
});

test("checkout passes the selected monthly plan and consent without binding the shared allowance to one studio", async ({
  page,
  request,
}) => {
  await page.goto("/en/portal/membership/plans?location=atelier-brno");
  const card = cardFor(page, "Klei · Profi");
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card
    .getByRole("checkbox", {
      name: "I have read and accept the membership terms for this plan.",
    })
    .check();
  await card.getByRole("button", { name: "Choose this plan" }).click();
  await expect(
    page.getByRole("heading", { name: /Local checkout handoff fixture/ }),
  ).toBeVisible();
  const state = await readState(request);
  expect(state.checkouts).toHaveLength(1);
  expect(state.checkouts[0]).toMatchObject({
    planId: "64b000000000000000000103",
    planVersionId: "64b000000000000000000203",
    currency: "CZK",
    locale: "en",
    termsAccepted: true,
  });
  expect(state.checkouts[0]).not.toHaveProperty("locationId");
  expect(state.checkouts[0].idempotencyKey).toMatch(/^membership-checkout-/);
  expect(state.membership.status).toBe("pending");
  expect(state.membership.balances[0].available).toBe(0);

  // Returning from the external checkout alone must not show success. Only
  // the authoritative membership-status response may activate the UI.
  await page.goto(
    `/en/memberships/checkout/success?session_id=${state.checkouts[0].sessionId}`,
  );
  await expect(
    page.getByRole("heading", { name: "Your membership is being prepared" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welcome to your membership" }),
  ).toHaveCount(0);
  expect(
    (
      await request.post(`${fixture}/__membership-fixture/activate`, {
        headers: controlHeaders,
      })
    ).ok(),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Welcome to your membership" }),
  ).toBeVisible();
});

test("paid balance and expiring carryover stay shared; cancelling and resuming preserve paid-period access", async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post(`${fixture}/__membership-fixture/activate`, {
        headers: controlHeaders,
      })
    ).ok(),
  ).toBe(true);
  for (const location of ["atelier-brno", "atelier-prague"]) {
    await page.goto(`/en/portal/membership?location=${location}`);
    await expect(
      page.getByRole("heading", { name: "Klei · Profi" }),
    ).toBeVisible();
    await expect(
      page.getByText("35 hr 30 min available", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Current period remaining", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("30 hr", { exact: true })).toBeVisible();
    await expect(page.getByText("5 hr 30 min", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Carryover expires", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/1 Feb 2027.*1:00|Feb 1, 2027.*1:00/),
    ).toBeVisible();
    await expect(
      page.getByText(/Other participants pay full price/),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Schedule cancellation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Why are you leaving?" });
  await expect(
    dialog.getByText(
      /Cancellation takes effect at the end of the current period/,
    ),
  ).toBeVisible();
  await dialog.getByLabel("Main reason").selectOption("temporary");
  await dialog
    .getByRole("button", { name: "Schedule cancellation", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("Cancellation scheduled", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Your membership remains active until.*2027/),
  ).toBeVisible();
  await expect(
    page.getByText("35 hr 30 min available", { exact: true }),
  ).toBeVisible();
  const cancelled = await readState(request);
  expect(cancelled.cancellationRequests).toEqual([{ reason: "temporary" }]);
  expect(cancelled.membership.status).toBe("active");
  expect(cancelled.membership.cancelAtPeriodEnd).toBe(true);
  await page
    .getByRole("button", { name: "Keep membership", exact: true })
    .click();
  await expect(
    page.getByText("Cancellation scheduled", { exact: true }),
  ).toBeHidden();
  const resumed = await readState(request);
  expect(resumed.resumes).toBe(1);
  expect(resumed.membership.cancelAtPeriodEnd).toBe(false);
  expect(resumed.membership.balances).toEqual(cancelled.membership.balances);
});

test("an existing member compares plans, schedules next-renewal change and cancels it without a second checkout", async ({
  page,
  request,
}) => {
  await request.post(`${fixture}/__membership-fixture/activate`, {
    headers: controlHeaders,
    data: { planId: "64b000000000000000000100" },
  });
  const before = await readState(request);
  await page.goto("/en/portal/membership?location=atelier-brno");
  await page.getByRole("link", { name: "Browse and compare plans" }).click();
  await expect(page).toHaveURL(/membership\/plans\?location=atelier-brno/, {
    timeout: 60_000,
  });
  await expect(
    cardFor(page, expectedPlans[0].name).getByRole("button", {
      name: "Your current plan",
    }),
  ).toBeDisabled();
  await expect(page.getByRole("article")).toHaveCount(4);
  const target = cardFor(page, "Klei · Profi");
  await target.getByRole("checkbox").check();
  await target.getByRole("button", { name: "Change at next renewal" }).click();
  const dialog = page.getByRole("dialog", { name: "Change your membership" });
  await expect(dialog.getByText(/No payment is taken now/)).toBeVisible();
  await expect(dialog.getByText(/Klei · Profi.*4,600/)).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("next-renewal-plan-change.png"),
    fullPage: true,
  });
  expect((await readState(request)).planChanges).toHaveLength(0);
  await dialog
    .getByRole("button", { name: "Schedule plan change", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Plan change scheduled" }),
  ).toBeVisible();
  const scheduled = await readState(request);
  expect(scheduled.checkouts).toHaveLength(0);
  expect(scheduled.planChanges).toHaveLength(1);
  expect(scheduled.planChanges[0]).toMatchObject({
    planId: "64b000000000000000000103",
    planVersionId: "64b000000000000000000203",
    termsAccepted: true,
    locale: "en",
  });
  expect(scheduled.planChanges[0].idempotencyKey).toMatch(
    /^membership-plan-change-/,
  );
  expect(scheduled.membership.planSnapshot).toEqual(
    before.membership.planSnapshot,
  );
  expect(scheduled.membership.balances).toEqual(before.membership.balances);
  expect(scheduled.membership.amountMinor).toBe(before.membership.amountMinor);
  await page.goto("/en/portal/membership?location=atelier-prague");
  await expect(
    page.getByRole("heading", { name: expectedPlans[0].name }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Plan change scheduled" }),
  ).toContainText("Klei · Profi");
  await page
    .getByRole("button", { name: "Cancel plan change", exact: true })
    .click();
  const cancelDialog = page.getByRole("dialog", {
    name: "Keep your current membership",
  });
  await cancelDialog
    .getByRole("button", { name: "Cancel scheduled change", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Plan change scheduled" }),
  ).toHaveCount(0);
  const cancelled = await readState(request);
  expect(cancelled.cancelledPlanChanges).toBe(1);
  expect(cancelled.membership.balances).toEqual(before.membership.balances);
  expect(cancelled.cancellationRequests).toHaveLength(0);
  await page.goto("/en/memberships?location=atelier-prague");
  await expect(
    cardFor(page, expectedPlans[0].name).getByRole("button", {
      name: "Your current plan",
    }),
  ).toBeDisabled();
  await expect(page.getByRole("article")).toHaveCount(4);
});
