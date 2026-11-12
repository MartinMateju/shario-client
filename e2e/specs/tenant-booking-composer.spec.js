import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  USERS,
} from "../helpers/auth-surfaces.js";
import { E2E, isTenantRoute, tenantUrl } from "../helpers/urls.js";

test("creates a tenant session through the modern booking composer", async ({
  page,
}) => {
  await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/calendar"), {
    waitUntil: "domcontentloaded",
  });

  const createButton = page.getByRole("button", {
    name: "New booking",
    exact: true,
  });
  await expect(createButton).toBeVisible();
  await createButton.click();

  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app/bookings/new"),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Create a session" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const sessionDate = await page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const offset = date.getTimezoneOffset() * 60_000;

    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  });

  await page.getByLabel("First date").fill(sessionDate);
  await expect(page.getByLabel("Class or Private Studio")).not.toHaveValue("");
  await expect(page.getByLabel("Studio location")).not.toHaveValue("");

  const createResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/bookings", "POST"),
  );
  await page
    .getByRole("button", { name: "Create session", exact: true })
    .click();

  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Session created" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "View bookings", exact: true })
    .click();
  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app/bookings"),
  );
});
