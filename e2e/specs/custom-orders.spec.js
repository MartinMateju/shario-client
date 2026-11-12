import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "../fixtures/test.js";
import {
  loginWorkspaceAs,
  USERS,
  isApiResponse,
} from "../helpers/auth-surfaces.js";
import { E2E, tenantUrl } from "../helpers/urls.js";

test.setTimeout(300_000);

const image = {
  name: "sign-design.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGUlEQVQokWMwSjtDEmIY1ZA2GkpGwzVpAACo8GQQpVJ5AAAAAABJRU5ErkJggg==",
    "base64",
  ),
};
const document = {
  name: "quotation.pdf",
  mimeType: "application/pdf",
  buffer: readFileSync(resolve("e2e/fixtures/custom-order-quotation.pdf")),
};

test("custom orders persist specifications, private attachments and an immutable close/reopen history", async ({
  page,
  request,
}) => {
  const login = await loginWorkspaceAs(page, {
    slug: E2E.alphaSlug,
    email: USERS.owner,
  });
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const optionsResponse = await request.get(
    "http://127.0.0.1:4311/custom-orders/options",
    { headers },
  );
  expect(optionsResponse.ok(), await optionsResponse.text()).toBe(true);
  const options = await optionsResponse.json();
  const locationId = options.locations[0].id;

  await page.goto(
    tenantUrl(E2E.alphaSlug, `/app/custom-orders/new?locationId=${locationId}`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "New custom order" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Please check" }),
  ).toContainText("Please check the highlighted fields");
  await expect(page.getByLabel(/^Order\ name(?:\s*\*)?$/)).toBeFocused();
  await page
    .getByLabel(/^Order\ name(?:\s*\*)?$/)
    .fill("Six blue meeting-room signs");
  await page
    .getByLabel(/^Detailed\ description(?:\s*\*)?$/)
    .fill(
      "Six matching wooden meeting-room signs, each with a room name and blue finish.",
    );
  await page.getByLabel(/^Number\ of\ pieces(?:\s*\*)?$/).fill("6");
  await page
    .getByLabel(/^Materials(?:\s*\*)?$/)
    .fill("Painted wooden signs with a blue finish");
  await page.getByLabel(/^Start\ date(?:\s*\*)?$/).fill("2030-11-01");
  await page.getByLabel(/^Deadline(?:\s*\*)?$/).fill("2030-11-20");
  await page
    .getByRole("radio", { name: "Enter contact details", exact: true })
    .check();
  await page.getByLabel(/^Name(?:\s*\*)?$/).fill("Local custom-order customer");
  await page.getByLabel("Quoted amount", { exact: true }).fill("2400");
  const createdResponse = page.waitForResponse((response) =>
    isApiResponse(response, "/custom-orders", "POST"),
  );
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  const response = await createdResponse;
  expect(response.ok(), await response.text()).toBe(true);
  const created = await response.json();
  const apiUrl = `http://127.0.0.1:4311/custom-orders/${created.id}`;
  const read = async () => {
    const result = await request.get(apiUrl, { headers });
    expect(result.ok(), await result.text()).toBe(true);
    return result.json();
  };
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Six blue meeting-room signs",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "The order has been saved." }),
  ).toContainText("The order has been saved.");

  await page
    .getByLabel("Add photos or PDFs", { exact: true })
    .setInputFiles([image, document]);
  await expect(
    page.getByRole("status").filter({ hasText: "Attachments added." }),
  ).toBeVisible();
  const attached = await read();
  expect(attached.attachments).toHaveLength(2);
  const pdf = attached.attachments.find((file) => file.kind === "document");
  const downloaded = await request.get(pdf.url);
  expect(downloaded.ok()).toBe(true);
  expect(downloaded.headers()["content-disposition"]).toContain("attachment");
  expect((await downloaded.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await expect(
    page.getByRole("img", { name: "sign-design.png" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("img", { name: "sign-design.png" })
        .evaluate((element) => element.naturalWidth),
    )
    .toBeGreaterThan(0);

  await page
    .getByLabel(/^Progress\ comment(?:\s*\*)?$/)
    .fill("Assembly complete; waiting for final inspection.");
  await page.getByRole("button", { name: "Add comment", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Comment added." }),
  ).toBeVisible();
  await expect(page.getByLabel(/^Progress\ comment(?:\s*\*)?$/)).toHaveValue(
    "",
  );
  await page.getByRole("link", { name: "Edit order", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Edit custom order" }),
  ).toBeVisible();
  await page.getByLabel(/^Number\ of\ pieces(?:\s*\*)?$/).fill("8");
  await page
    .getByRole("radio", { name: "Link an existing customer", exact: true })
    .check();
  await page
    .getByLabel(/^Customer\ ID\ or\ member\ number(?:\s*\*)?$/)
    .fill("ALPHA-CUSTOMER");
  await page
    .getByRole("button", { name: "Find customer", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Linked to" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Six blue meeting-room signs",
    }),
  ).toBeVisible();
  const edited = await read();
  expect(edited.pieceCount).toBe(8);
  expect(edited.customerId).toBeTruthy();
  expect(edited.quotedAmount).toBe(2400);
  await page.reload();
  await expect(
    page.getByText("Assembly complete; waiting for final inspection.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/custom-order-detail-desktop.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Close order", exact: true }).click();
  const closeDialog = page.getByRole("dialog");
  await closeDialog
    .getByLabel(/^Reason for closing(?:\s*\*)?$/)
    .selectOption("completed");
  await closeDialog
    .getByRole("button", { name: "Close order", exact: true })
    .click();
  await expect(closeDialog).toHaveCount(0);
  await expect(
    page.getByText("Closed · Completed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Edit order", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Add photos or PDFs", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/^Progress\ comment(?:\s*\*)?$/)).toHaveCount(0);
  const closed = await read();
  const blocked = await request.post(`${apiUrl}/comments`, {
    headers,
    data: { revision: closed.revision, body: "Should not be accepted" },
  });
  expect(blocked.status()).toBe(409);
  expect((await request.delete(apiUrl, { headers })).status()).toBe(404);

  await page.getByRole("button", { name: "Reopen order", exact: true }).click();
  const reopenDialog = page.getByRole("dialog");
  await reopenDialog
    .getByRole("button", { name: "Reopen order", exact: true })
    .click();
  await expect(reopenDialog.getByRole("alert")).toContainText(
    "Please explain why",
  );
  await reopenDialog
    .getByLabel(/^Reason\ for\ reopening(?:\s*\*)?$/)
    .fill("Customer requested two additional cups.");
  await reopenDialog
    .getByRole("button", { name: "Reopen order", exact: true })
    .click();
  await expect(reopenDialog).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Edit order", exact: true }),
  ).toBeVisible();
  expect((await read()).history.map((event) => event.action)).toEqual(
    expect.arrayContaining([
      "created",
      "updated",
      "comment_added",
      "attachment_added",
      "closed",
      "reopened",
    ]),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Six blue meeting-room signs",
    }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/custom-order-detail-mobile.png",
    fullPage: true,
  });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/custom-orders"));
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 1, name: "Custom orders" }),
  ).toBeVisible();
  await page
    .getByLabel("Studio location", { exact: true })
    .selectOption(locationId);
  await expect(
    page
      .getByRole("link", { name: "Six blue meeting-room signs", exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/custom-order-list-mobile.png",
    fullPage: true,
  });
  // Workspace routes follow the tenant's admin language, not only the URL.
  const czechSettings = await request.patch(
    "http://127.0.0.1:4311/tenants/current/settings",
    { headers, data: { adminLanguage: "cs" } },
  );
  expect(czechSettings.ok(), await czechSettings.text()).toBe(true);
  const czechListUrl = new URL(page.url());
  czechListUrl.pathname = czechListUrl.pathname.replace(/^\/en\//, "/cs/");
  await page.goto(czechListUrl.toString());
  await expect(
    page
      .getByRole("main")
      .getByRole("heading", { level: 1, name: "Zakázky", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Po termínu", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/custom-order-list-mobile-cs.png",
    fullPage: true,
  });
});
