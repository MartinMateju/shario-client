import { test, expect } from "../fixtures/test.js";
import {
  isApiResponse,
  loginWorkspaceAs,
  PASSWORD,
  USERS,
} from "../helpers/auth-surfaces.js";
import {
  E2E,
  isTenantRoute,
  platformOrigin,
  tenantUrl,
} from "../helpers/urls.js";

const INVITATIONS = "/tenants/current/access/invitations";
const CONTROL_HEADERS = {
  "x-e2e-key": process.env.E2E_TEST_KEY || "shario-e2e-local-key",
};
const NEW_PASSWORD = "Invitation!456";

async function capturedInvitation(request, email, previousId) {
  let message;
  await expect
    .poll(async () => {
      const response = await request.get(
        `http://127.0.0.1:4100/__e2e/messages/latest?to=${encodeURIComponent(email)}`,
        { headers: CONTROL_HEADERS },
      );
      if (!response.ok()) return false;
      message = await response.json();
      return Boolean(message.messageId && message.messageId !== previousId);
    })
    .toBe(true);
  expect(message.to).toBe(email);
  expect(message.subject).toContain("Studio Alpha");
  expect(message.htmlBody).toContain("Accept invitation");
  const url = new URL(
    message.textBody.match(
      /https?:\/\/[^\s]+\/en\/team-invitation\?token=[A-Za-z0-9_-]+/,
    )?.[0],
  );
  expect(url.origin).toBe(platformOrigin());
  expect(url.searchParams.get("token")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  return { ...message, url: url.toString() };
}

async function openTeam(page) {
  await loginWorkspaceAs(page, { slug: E2E.alphaSlug, email: USERS.owner });
  await page.goto(tenantUrl(E2E.alphaSlug, "/app/settings/team"));
  await expect(
    page.getByRole("button", { name: "Invite team member", exact: true }),
  ).toBeVisible();
}

async function invite(page, email, { role = "staff", location } = {}) {
  await page
    .getByRole("button", { name: "Invite team member", exact: true })
    .click();
  const dialog = page.getByTestId("team-member-dialog");
  const submit = dialog.getByRole("button", {
    name: "Send invitation",
    exact: true,
  });
  await expect(submit).toBeInViewport();
  await page.screenshot({
    path: test.info().outputPath("invitation-modal.png"),
    fullPage: false,
  });
  await dialog.getByLabel("Email address", { exact: true }).fill(email);
  await dialog
    .getByRole("combobox", { name: "Role", exact: true })
    .selectOption(role);
  if (location) {
    await dialog.getByLabel("Only selected locations", { exact: true }).check();
    await dialog.getByLabel(location.name, { exact: true }).check();
  }
  await expect(submit).toBeInViewport();
  const responsePromise = page.waitForResponse((response) =>
    isApiResponse(response, INVITATIONS, "POST"),
  );
  await submit.click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(201);
  const { invitation } = await response.json();
  expect(invitation.deliveryStatus).toBe("sent");
  expect(invitation.status).toBe("pending");
  expect(invitation).not.toHaveProperty("token");
  expect(invitation).not.toHaveProperty("tokenHash");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator("[data-team-invitation-row]").filter({ hasText: email }),
  ).toBeVisible();
  return invitation;
}

async function openEmail(browser, url, viewport = { width: 390, height: 640 }) {
  const context = await browser.newContext({
    locale: "en-GB",
    timezoneId: "Europe/Prague",
    viewport,
  });
  const page = await context.newPage();
  await page.goto(url);
  await expect(page.locator("[data-team-invitation-form]")).toBeVisible();
  return { context, page };
}

async function acceptAndLogin(page, { existing = false } = {}) {
  const accepted = page.waitForResponse((response) =>
    isApiResponse(response, "/auth/team-invitations/accept", "POST"),
  );
  const loggedIn = page.waitForResponse((response) =>
    isApiResponse(response, "/auth", "POST"),
  );
  await page
    .getByRole("button", {
      name: existing ? "Sign in" : "Accept invitation",
      exact: true,
    })
    .click();
  const acceptResponse = await accepted;
  expect(acceptResponse.status(), await acceptResponse.text()).toBe(200);
  const loginResponse = await loggedIn;
  expect(loginResponse.status(), await loginResponse.text()).toBe(200);
  const session = await loginResponse.json();
  await expect(page).toHaveURL((url) =>
    isTenantRoute(url, E2E.alphaSlug, "/app"),
  );
  await expect(page.locator('[data-workspace-ui="true"]')).toBeVisible();
  return session;
}

test("short modal sends a real invitation email; a new teammate chooses a password and logs in with restricted access", async ({
  browser,
  page,
  request,
  e2eState,
}) => {
  const email = "new-viewer@team-invitations.test";
  await page.setViewportSize({ width: 1280, height: 600 });
  await openTeam(page);
  await invite(page, email, {
    role: "viewer",
    location: e2eState.locations.alpha,
  });
  const message = await capturedInvitation(request, email);
  const recipient = await openEmail(browser, message.url);
  try {
    await expect(
      recipient.page.getByRole("heading", {
        name: "Join the team",
        exact: true,
      }),
    ).toBeVisible();
    await recipient.page
      .getByLabel("First name", { exact: true })
      .fill("Invitation");
    await recipient.page
      .getByLabel("Last name", { exact: true })
      .fill("Viewer");
    await recipient.page
      .getByLabel("New password", { exact: true })
      .fill(NEW_PASSWORD);
    await recipient.page
      .getByLabel("Confirm new password", { exact: true })
      .fill(NEW_PASSWORD);
    const session = await acceptAndLogin(recipient.page);
    expect(session.authContext).toBe("workspace");
    expect(session.workspaceAccess.roleKey).toBe("viewer");
    expect(session.workspaceAccess.locationAccess).toEqual({
      mode: "selected",
      locationIds: [e2eState.locations.alpha.id],
    });
    expect(session.workspaceAccess.permissions).not.toContain("team.manage");
    expect(session.workspaceAccess.permissions).not.toContain(
      "bookings.create",
    );
    const refreshed = recipient.page.waitForResponse((response) =>
      isApiResponse(response, "/auth/refresh", "POST"),
    );
    await recipient.page.reload();
    expect((await refreshed).status()).toBe(200);
    await expect(
      recipient.page.locator('[data-workspace-ui="true"]'),
    ).toBeVisible();
    await recipient.page.screenshot({
      path: test.info().outputPath("invited-viewer-mobile.png"),
      fullPage: false,
    });
  } finally {
    await recipient.context.close();
  }
  const fresh = await browser.newContext();
  try {
    const freshPage = await fresh.newPage();
    const response = await loginWorkspaceAs(freshPage, {
      slug: E2E.alphaSlug,
      email,
      password: NEW_PASSWORD,
    });
    expect((await response.json()).workspaceAccess.roleKey).toBe("viewer");
  } finally {
    await fresh.close();
  }
  await page.reload();
  await expect(
    page.locator("[data-team-invitation-row]").filter({ hasText: email }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("article").filter({ hasText: email }),
  ).toContainText("Viewer");
});

test("existing customer proves their current password and keeps it after accepting", async ({
  browser,
  page,
  request,
}) => {
  await openTeam(page);
  await invite(page, USERS.customer);
  const message = await capturedInvitation(request, USERS.customer);
  const recipient = await openEmail(browser, message.url);
  try {
    await expect(
      recipient.page.getByLabel("New password", { exact: true }),
    ).toHaveCount(0);
    await recipient.page
      .getByLabel("Current password", { exact: true })
      .fill("Wrong-password!5");
    const rejected = recipient.page.waitForResponse((response) =>
      isApiResponse(response, "/auth/team-invitations/accept", "POST"),
    );
    await recipient.page
      .getByRole("button", { name: "Accept invitation", exact: true })
      .click();
    expect((await rejected).status()).toBe(401);
    await expect(
      recipient.page.locator("[data-team-invitation-page]").getByRole("alert"),
    ).toBeVisible();
    await recipient.page
      .getByLabel("Current password", { exact: true })
      .fill(PASSWORD);
    expect((await acceptAndLogin(recipient.page)).workspaceAccess.roleKey).toBe(
      "staff",
    );
  } finally {
    await recipient.context.close();
  }
  const fresh = await browser.newContext();
  try {
    const freshPage = await fresh.newPage();
    await loginWorkspaceAs(freshPage, {
      slug: E2E.alphaSlug,
      email: USERS.customer,
      password: PASSWORD,
    });
  } finally {
    await fresh.close();
  }
});

test("resending rotates the emailed link and revocation prevents acceptance", async ({
  browser,
  page,
  request,
}) => {
  const email = "revoke@team-invitations.test";
  await page.setViewportSize({ width: 390, height: 640 });
  await openTeam(page);
  const invitation = await invite(page, email);
  const first = await capturedInvitation(request, email);
  const scenario = await request.post(
    "http://127.0.0.1:4311/__e2e/team-invitation-scenario",
    {
      headers: CONTROL_HEADERS,
      data: { invitationId: invitation.id, scenario: "resend-ready" },
    },
  );
  expect(scenario.ok(), await scenario.text()).toBe(true);
  const row = page
    .locator("[data-team-invitation-row]")
    .filter({ hasText: email });
  const resent = page.waitForResponse((response) =>
    isApiResponse(response, `${INVITATIONS}/${invitation.id}/resend`, "POST"),
  );
  await row.getByRole("button", { name: "Resend", exact: true }).click();
  expect((await resent).status()).toBe(200);
  const second = await capturedInvitation(request, email, first.messageId);
  expect(second.url).not.toBe(first.url);
  const recipient = await browser.newContext();
  try {
    const recipientPage = await recipient.newPage();
    await recipientPage.goto(first.url);
    await expect(
      recipientPage.locator("[data-team-invitation-page]").getByRole("alert"),
    ).toBeVisible();
    await expect(
      recipientPage.locator("[data-team-invitation-form]"),
    ).toHaveCount(0);
    page.once("dialog", (dialog) => dialog.accept());
    const revoked = page.waitForResponse((response) =>
      isApiResponse(response, `${INVITATIONS}/${invitation.id}`, "DELETE"),
    );
    await row.getByRole("button", { name: "Revoke", exact: true }).click();
    expect((await revoked).status()).toBe(200);
    await expect(row).toHaveCount(0);
    await recipientPage.goto(second.url);
    await expect(
      recipientPage.locator("[data-team-invitation-page]").getByRole("alert"),
    ).toBeVisible();
    await expect(
      recipientPage.locator("[data-team-invitation-form]"),
    ).toHaveCount(0);
  } finally {
    await recipient.close();
  }
});

test("previously added active teammates receive a sign-in link without changing their role", async ({
  browser,
  page,
  request,
}) => {
  await openTeam(page);
  const member = page.getByRole("article").filter({ hasText: USERS.viewer });
  const sent = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/access\/team\/[^/]+\/invitation$/.test(
        new URL(response.url()).pathname,
      ),
  );
  await member
    .getByRole("button", { name: "Send sign-in link", exact: true })
    .click();
  const response = await sent;
  expect(response.status(), await response.text()).toBe(201);
  expect((await response.json()).invitation.mode).toBe("sign_in");
  const message = await capturedInvitation(request, USERS.viewer);
  const recipient = await openEmail(browser, message.url);
  try {
    await recipient.page
      .getByLabel("Current password", { exact: true })
      .fill(PASSWORD);
    const session = await acceptAndLogin(recipient.page, { existing: true });
    expect(session.workspaceAccess.roleKey).toBe("viewer");
    expect(session.workspaceAccess.permissions).not.toContain("team.manage");
  } finally {
    await recipient.context.close();
  }
});

test("a signed-in mobile browser keeps the invitation form after restoring its existing session", async ({
  page,
  request,
}) => {
  const email = "signed-in-preview@team-invitations.test";
  await openTeam(page);
  await invite(page, email, { role: "viewer" });
  const message = await capturedInvitation(request, email);
  await page.setViewportSize({ width: 390, height: 640 });

  let releaseRestore;
  const restoreGate = new Promise((resolve) => {
    releaseRestore = resolve;
  });
  // Keep the real owner session response behind the real invitation preview.
  // This reproduces opening an emailed link in a browser already signed in.
  await page.route("**/auth/refresh", async (route) => {
    const response = await route.fetch();
    await restoreGate;
    await route.fulfill({ response });
  });
  const restored = page.waitForResponse((response) =>
    isApiResponse(response, "/auth/refresh", "POST"),
  );
  try {
    await page.goto(message.url);
    const form = page.locator("[data-team-invitation-form]");
    await expect(form).toBeVisible();
    releaseRestore();
    const restoreResponse = await restored;
    expect(restoreResponse.status(), await restoreResponse.text()).toBe(200);
    expect((await restoreResponse.json()).workspaceAccess.roleKey).toBe(
      "owner",
    );
    await restoreResponse.finished();
    // The signed-in header proves the restore has reached React, including
    // the synchronous authentication cache reset that used to erase preview.
    await expect(
      page.getByRole("button", { name: "User menu", exact: true }),
    ).toBeVisible();
    await expect(form).toBeVisible();
    await form.getByLabel("First name", { exact: true }).fill("Mobile");
    await expect(
      form.getByLabel("New password", { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("[data-team-invitation-page]").getByRole("status"),
    ).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath("signed-in-invitation-mobile.png"),
      fullPage: true,
    });
  } finally {
    releaseRestore();
  }
});
