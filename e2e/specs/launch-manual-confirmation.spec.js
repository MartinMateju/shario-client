import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  USERS,
} from "../helpers/auth-surfaces.js";
import { E2E, tenantUrl } from "../helpers/urls.js";

const API = "http://127.0.0.1:4311";
const SETUP = "/tenants/current/setup-center";
const CONFIRMATION = `${SETUP}/practice/confirmation`;

test("an owner manually confirms a stale trial booking, persists it, reconfirms changed settings and can undo it", async ({
  page,
  request,
}) => {
  const login = await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const api = async (method, path, data) => {
    const response = await request[method](`${API}${path}`, { headers, data });
    expect(response.ok(), await response.text()).toBe(true);
    const body = await response.json();
    return body.data ?? body;
  };

  // Configure only the resettable E2E studio through its real settings API.
  await api("patch", "/tenants/current/settings/workspace-configuration", {
    intent: {
      definitionVersion: 2,
      pricingMode: "time",
      answers: {
        sharedStudio: true,
        classes: true,
        memberships: false,
        vouchers: false,
        inventory: false,
      },
    },
  });
  const publicSite = await api("get", "/tenants/current/settings/public-site");
  await api("patch", "/tenants/current/settings/public-site", {
    revision: publicSite.editor.draftRevision,
    patch: { branding: { displayName: "E2E Alpha Studio" } },
  });
  const ready = await api("get", SETUP);
  expect(ready.launchReview.required.incompleteStepIds).toEqual([]);
  expect(ready.launchReview.testBooking.canStart).toBe(true);

  // Reproduce the exact reported state: an old completed walkthrough followed
  // by a location change, without inventing successful walkthrough artifacts.
  let practice = await api("post", `${SETUP}/practice`, {
    idempotencyKey: "manual-confirmation-browser-regression",
  });
  for (const action of [
    "create_booking",
    "preview_confirmation",
    "preview_membership",
    "check_in",
    "cancel_booking",
  ]) {
    practice = await api("post", `${SETUP}/practice/actions/${action}`, {
      runId: practice.practice.runId,
    });
  }
  expect(practice.practice.status).toBe("complete");
  const originalArtifacts = practice.practice.artifacts;
  const locationPath = `/locations/${ready.diagnostics.activeLocationId}`;
  await api("patch", locationPath, { name: "Alpha revised booking location" });

  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/setup"));
  const card = page.locator('[data-readiness-item="customerJourney"]');
  const manual = card.locator("[data-practice-manual-confirmation]");
  const checkbox = manual.getByRole("checkbox", {
    name: "I confirm that the test booking was successful",
  });
  const save = manual.getByRole("button", {
    name: "Confirm check",
    exact: true,
  });
  await expect(card).toHaveAttribute(
    "data-readiness-status",
    "action_required",
  );
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(save).toBeDisabled();
  await manual.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("manual-confirmation-mobile-before.png"),
    fullPage: false,
  });

  const confirmThroughUi = async (expectedStatus = 200) => {
    await checkbox.check();
    const responsePromise = page.waitForResponse((response) =>
      isApiResponse(response, CONFIRMATION, "POST"),
    );
    await save.click();
    const response = await responsePromise;
    expect(response.status(), await response.text()).toBe(expectedStatus);
    const body = await response.json();
    return body.data ?? body;
  };
  const confirmed = await confirmThroughUi();
  expect(confirmed.launchReview.testBooking).toMatchObject({
    complete: true,
    completionSource: "manual",
    retestRecommended: false,
  });
  expect(confirmed.practice.manualConfirmation.current).toBe(true);
  expect(confirmed.practice.artifacts).toEqual(originalArtifacts);
  await expect(card).toHaveAttribute("data-readiness-status", "ready");
  await expect(manual).toContainText("Manually confirmed on");
  await page.reload();
  await expect(card).toHaveAttribute("data-readiness-status", "ready");
  await expect(manual).toContainText("Manually confirmed on");
  const persisted = await api("get", SETUP);
  expect(persisted.practice.manualConfirmation).toEqual(
    confirmed.practice.manualConfirmation,
  );
  await manual.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("manual-confirmation-mobile-saved.png"),
    fullPage: false,
  });

  // An unseen settings change cannot be confirmed from an outdated page.
  await api("patch", locationPath, { name: "Alpha changed settings again" });
  await page.reload();
  await expect(card).toHaveAttribute(
    "data-readiness-status",
    "action_required",
  );
  await expect(checkbox).not.toBeChecked();
  await expect(manual).toContainText(
    "Settings have changed since your confirmation",
  );
  await api("patch", locationPath, { name: "Alpha changed while reviewing" });
  await confirmThroughUi(409);
  await expect(manual.getByRole("alert")).toContainText(
    "Settings changed during your check",
  );
  await expect(checkbox).not.toBeChecked();
  await expect(save).toBeDisabled();
  await confirmThroughUi();
  await expect(card).toHaveAttribute("data-readiness-status", "ready");

  const removed = page.waitForResponse((response) =>
    isApiResponse(response, CONFIRMATION, "DELETE"),
  );
  await manual
    .getByRole("button", { name: "Remove confirmation", exact: true })
    .click();
  expect((await removed).status()).toBe(200);
  await page.reload();
  await expect(card).toHaveAttribute(
    "data-readiness-status",
    "action_required",
  );
  await expect(checkbox).not.toBeChecked();
  const cleared = await api("get", SETUP);
  expect(cleared.practice.manualConfirmation).toBeNull();
  expect(cleared.practice.artifacts).toEqual(originalArtifacts);
});
