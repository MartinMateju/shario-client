import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  USERS,
} from "../helpers/auth-surfaces.js";
import { E2E, isTenantRoute, tenantUrl } from "../helpers/urls.js";

const CATALOG_SECTIONS = Object.freeze({
  openStudio: "Open Studio",
  classes: "Classes",
  memberships: "Memberships",
  vouchers: "Vouchers",
  privateStudio: "Private Studio",
});

async function openProducts(
  page,
  { email, slug = E2E.alphaSlug, category = "openStudio" },
) {
  await loginWorkspaceAs(page, {
    slug,
    email,
  });
  const productsResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/products", "GET"),
  );
  await page.goto(tenantUrl(slug, `/app/products?category=${category}`), {
    waitUntil: "domcontentloaded",
  });
  const productsResponse = await productsResponsePromise;

  expect(productsResponse.ok()).toBe(true);
  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, slug, "/app/products"),
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Products & Classes",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("tablist", { name: "Product and class categories" })
      .getByRole("tab", {
        name: new RegExp(CATALOG_SECTIONS[category], "i"),
      }),
  ).toHaveAttribute("aria-selected", "true");

  return productsResponse;
}

test.describe("workspace products", () => {
  test("gives a viewer read-only product access", async ({ page }) => {
    await openProducts(page, {
      email: USERS.viewer,
      category: "classes",
    });

    await expect(page.getByText("View only", { exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create class" }),
    ).toHaveCount(0);
    await expect(page.getByRole("switch")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /^Open actions for / }),
    ).toHaveCount(0);
  });

  test("shows an owner the seeded product and management controls", async ({
    page,
  }) => {
    const productsResponse = await openProducts(page, {
      email: USERS.owner,
      category: "classes",
    });
    const payload = await productsResponse.json();
    const productNames = (payload.products || []).map(({ name }) => name);

    await expect(page.getByRole("table")).toBeVisible();
    expect(productNames).toContain("Alpha Workshop");
    expect(productNames).not.toContain("Beta Workshop");
    await expect(
      page.getByRole("row").filter({ hasText: "Alpha Workshop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Beta Workshop" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Create class" }),
    ).toBeVisible();

    const productActions = page.getByRole("button", {
      name: /^Open actions for /,
    });
    expect(await productActions.count()).toBeGreaterThan(0);
    await expect(productActions.last()).toBeVisible();
  });

  test("scopes the beta owner's catalog to the beta tenant", async ({
    page,
  }) => {
    const productsResponse = await openProducts(page, {
      slug: E2E.betaSlug,
      email: USERS.betaOwner,
      category: "classes",
    });
    const payload = await productsResponse.json();
    const productNames = (payload.products || []).map(({ name }) => name);

    expect(productNames).toContain("Beta Workshop");
    expect(productNames).not.toContain("Alpha Workshop");
    await expect(
      page.getByRole("row").filter({ hasText: "Beta Workshop" }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: "Alpha Workshop" }),
    ).toHaveCount(0);
  });

  test("blocks invalid input, surfaces an API failure and succeeds on retry", async ({
    page,
  }) => {
    await openProducts(page, {
      email: USERS.owner,
      category: "openStudio",
    });

    let productCreateRequests = 0;
    let rejectNextValidCreate = true;
    page.on("request", (request) => {
      const url = new URL(request.url());

      if (url.pathname === "/products" && request.method() === "POST") {
        productCreateRequests += 1;
      }
    });
    await page.route("**/products", async (route) => {
      if (route.request().method() === "POST" && rejectNextValidCreate) {
        rejectNextValidCreate = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Catalog is temporarily unavailable.",
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.getByRole("button", { name: "Add Open Studio" }).click();

    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app/products/new"),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Add Open Studio" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const form = page.locator('form[data-guided-form="product"]');

    const nameInput = form.getByLabel("Product name");
    const submit = form.getByRole("button", {
      name: "Create Open Studio",
    });

    await submit.click();

    expect(
      await nameInput.evaluate((input) => input.validity.valueMissing),
    ).toBe(true);
    await expect(nameInput).toBeFocused();
    await expect(form).toBeVisible();
    expect(productCreateRequests).toBe(0);

    const productName = "Playwright studio session";
    await nameInput.fill(productName);
    await form.getByLabel("Price").fill("640");

    const rejectedResponsePromise = page.waitForResponse(
      (response) =>
        isApiResponse(response, "/products", "POST") &&
        response.status() === 503,
    );
    await submit.click();

    expect((await rejectedResponsePromise).status()).toBe(503);
    await expect(form).toBeVisible();
    await expect(
      form.getByRole("alert").filter({
        hasText: "Catalog is temporarily unavailable.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: productName }),
    ).toHaveCount(0);
    expect(productCreateRequests).toBe(1);

    const createResponsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/products", "POST"),
    );
    await submit.click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBe(true);
    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app/products"),
    );
    await expect(form).toBeHidden();
    await expect(
      page.getByRole("status").filter({
        hasText: "Product created successfully.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: productName }),
    ).toBeVisible();
    expect(productCreateRequests).toBe(2);
  });

  test("edits and deletes a product with explicit confirmation", async ({
    page,
  }) => {
    await openProducts(page, {
      email: USERS.owner,
      category: "classes",
    });

    await page
      .getByRole("button", {
        name: "Open actions for Alpha Workshop",
      })
      .click();
    await page
      .getByRole("button", { name: "Edit product", exact: true })
      .click();

    const updatedName = "Alpha Workshop Updated";

    await expect(page).toHaveURL((url) =>
      /\/app\/products\/[^/]+\/edit$/.test(url.pathname),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Edit class" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const editForm = page.locator('form[data-guided-form="product"]');
    await expect(editForm.getByLabel("Class category")).toBeVisible();
    await editForm.getByLabel("Product name").fill(updatedName);

    const updateResponsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/products", "PATCH"),
    );
    await editForm
      .getByRole("button", { name: "Save changes", exact: true })
      .click();

    expect((await updateResponsePromise).ok()).toBe(true);
    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app/products"),
    );
    await expect(editForm).toBeHidden();
    await expect(
      page.getByRole("status").filter({
        hasText: "Product updated successfully.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: updatedName }),
    ).toBeVisible();
    await expect(page.getByText("Alpha Workshop", { exact: true })).toHaveCount(
      0,
    );

    await page
      .getByRole("button", {
        name: `Open actions for ${updatedName}`,
      })
      .click();
    await page
      .getByRole("button", { name: "Delete product", exact: true })
      .click();

    const deleteDialog = page.getByRole("dialog", {
      name: "Delete product?",
    });
    await expect(deleteDialog).toContainText(
      `Delete ${updatedName}? This action cannot be undone.`,
    );

    const deleteResponsePromise = page.waitForResponse((response) =>
      isApiResponse(response, "/products", "DELETE"),
    );
    await deleteDialog
      .getByRole("button", { name: "Delete product", exact: true })
      .click();

    expect((await deleteResponsePromise).ok()).toBe(true);
    await expect(deleteDialog).toBeHidden();
    await expect(
      page.getByRole("status").filter({
        hasText: "Product deleted successfully.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("row").filter({ hasText: updatedName }),
    ).toHaveCount(0);
  });

  test("offers exactly five distinct catalog tabs", async ({ page }) => {
    await openProducts(page, {
      email: USERS.owner,
      category: "openStudio",
    });

    const tablist = page.getByRole("tablist", {
      name: "Product and class categories",
    });
    await expect(tablist.getByRole("tab")).toHaveCount(5);

    for (const label of Object.values(CATALOG_SECTIONS)) {
      await expect(
        tablist.getByRole("tab", { name: new RegExp(label, "i") }),
      ).toBeVisible();
    }

    await expect(
      tablist.getByRole("tab", {
        name: /Retail|Add-ons|Internal|Other/i,
      }),
    ).toHaveCount(0);
  });

  test("integrates membership plan and customer management into the catalog", async ({
    page,
  }) => {
    await openProducts(page, {
      email: USERS.owner,
      category: "memberships",
    });

    const membershipTabs = page.getByRole("tablist", {
      name: "Membership management view",
    });
    await expect(
      membershipTabs.getByRole("tab", { name: "Plans" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      membershipTabs.getByRole("tab", { name: "Customer memberships" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Create membership" }).click();

    const dialog = page.getByRole("dialog", {
      name: "Create membership plan",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Plan name")).toBeVisible();
    await expect(dialog.getByLabel("Billing type")).toBeVisible();
    await dialog.getByRole("button", { name: "Close plan editor" }).click();

    await membershipTabs
      .getByRole("tab", { name: "Customer memberships" })
      .click();
    await expect(
      membershipTabs.getByRole("tab", { name: "Customer memberships" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Search customer memberships")).toBeVisible();
  });

  test("uses the dedicated class form", async ({ page }) => {
    await openProducts(page, {
      email: USERS.owner,
      category: "classes",
    });

    await page.getByRole("button", { name: "Create class" }).click();

    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app/products/new"),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Create class" }),
    ).toBeVisible();
    const form = page.locator('form[data-guided-form="product"]');
    await expect(form.getByLabel("Maximum capacity")).toBeVisible();
    await expect(form.getByLabel("Product image")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    await expect(form.getByLabel("Product kind")).toHaveCount(0);
    await expect(form.getByPlaceholder("https://…")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("uses the dedicated voucher form", async ({ page }) => {
    await openProducts(page, {
      email: USERS.owner,
      category: "vouchers",
    });

    await page.getByRole("button", { name: "Create voucher" }).click();

    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/app/products/new"),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Create voucher" }),
    ).toBeVisible();
    const form = page.locator('form[data-guided-form="product"]');
    await expect(form.getByLabel("Voucher PDF template")).toBeVisible();
    await expect(form.getByLabel("Product image")).toBeVisible();
    await expect(form.getByLabel("Product kind")).toHaveCount(0);
    await expect(form.getByLabel("Maximum capacity")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
