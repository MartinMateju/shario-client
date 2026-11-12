import { expect, test } from "../fixtures/test.js";
import { isApiResponse, loginWorkspaceAs } from "../helpers/auth-surfaces.js";
import { isTenantRoute, platformUrl, tenantUrl } from "../helpers/urls.js";

const POSTMARK_STUB = "http://127.0.0.1:4100";
const E2E_KEY = process.env.E2E_TEST_KEY || "shario-e2e-local-key";
const WORKSPACE = {
  slug: "critical-journey-studio",
  email: "owner@critical-journey.test",
  password: "Critical!123",
  studioName: "Critical Journey Studio",
};

const postmarkControlHeaders = {
  "x-e2e-key": E2E_KEY,
};

const responseFailureDetails = async (response, expectedStatus) => {
  const succeeded =
    expectedStatus === undefined
      ? response.ok()
      : response.status() === expectedStatus;
  if (succeeded) return undefined;

  let text;
  try {
    text = await response.text();
  } catch {
    return { status: response.status(), url: response.url() };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

test("registers, onboards, logs in and verifies managed email delivery", async ({
  browser,
  page,
  request,
}) => {
  const stubReset = await request.post(`${POSTMARK_STUB}/__e2e/reset`, {
    headers: postmarkControlHeaders,
  });
  expect(stubReset.ok(), await stubReset.text()).toBe(true);

  await page.goto(platformUrl("/register"), {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#platform-firstname").fill("Critical");
  await page.locator("#platform-lastname").fill("Owner");
  await page.locator("#platform-studio-name").fill(WORKSPACE.studioName);
  await page.locator("#platform-workspace-slug").fill(WORKSPACE.slug);
  await page.locator("#platform-register-email").fill(WORKSPACE.email);
  await page.locator("#platform-register-password").fill(WORKSPACE.password);
  await page
    .locator("#platform-register-password-confirm")
    .fill(WORKSPACE.password);
  await page.locator("#platform-legal-agreement").check();

  const registrationPromise = page.waitForResponse((response) =>
    isApiResponse(response, "/auth/tenant/register", "POST"),
  );
  await page.getByRole("button", { name: "Create my studio" }).click();
  const registration = await registrationPromise;
  expect(
    registration.status(),
    JSON.stringify(await responseFailureDetails(registration, 201)),
  ).toBe(201);
  await page.waitForURL((url) =>
    isTenantRoute(url, WORKSPACE.slug, "/app/onboarding"),
  );

  await page.getByRole("button", { name: "Coworking space" }).click();
  await page.getByLabel("Country").selectOption("Czech Republic");
  await page.getByLabel("Currency").selectOption("CZK");
  await page.getByLabel("Timezone").selectOption("Europe/Prague");

  const onboardingCompletionPromise = page.waitForResponse((response) =>
    isApiResponse(response, "/tenants/current/onboarding/complete", "POST"),
  );
  await page.getByRole("button", { name: "Continue to Launch Center" }).click();
  const onboardingCompletion = await onboardingCompletionPromise;
  expect(
    onboardingCompletion.status(),
    JSON.stringify(await responseFailureDetails(onboardingCompletion, 200)),
  ).toBe(200);
  await page.waitForURL((url) =>
    isTenantRoute(url, WORKSPACE.slug, "/app/setup"),
  );

  // A separate context proves that registration state is not masking login.
  const authenticatedContext = await browser.newContext({
    locale: "en-GB",
    timezoneId: "Europe/Prague",
    viewport: { width: 1440, height: 1000 },
  });

  try {
    const authenticatedPage = await authenticatedContext.newPage();
    await loginWorkspaceAs(authenticatedPage, {
      slug: WORKSPACE.slug,
      email: WORKSPACE.email,
      password: WORKSPACE.password,
    });
    await expect(authenticatedPage).toHaveURL((url) =>
      isTenantRoute(url, WORKSPACE.slug, "/app"),
    );

    await authenticatedPage.goto(
      `${tenantUrl(WORKSPACE.slug, "/app/communications")}?section=setup`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      authenticatedPage.locator("[data-email-setup-view]"),
    ).toBeVisible();

    await authenticatedPage
      .getByRole("textbox", { name: "Sender name", exact: true })
      .fill(WORKSPACE.studioName);
    await authenticatedPage
      .getByRole("textbox", { name: "Reply-To email", exact: true })
      .fill(WORKSPACE.email);

    const verificationRequestPromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/registered-sender-emails\/[^/]+\/reply-to-verification$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await authenticatedPage.getByRole("button", { name: "Save setup" }).click();
    const verificationRequest = await verificationRequestPromise;
    expect(
      verificationRequest.ok(),
      JSON.stringify(await responseFailureDetails(verificationRequest)),
    ).toBe(true);

    let verificationCode = "";
    await expect
      .poll(async () => {
        const captured = await request.get(
          `${POSTMARK_STUB}/__e2e/messages/latest?purpose=reply-to-verification&to=${encodeURIComponent(
            WORKSPACE.email,
          )}`,
          { headers: postmarkControlHeaders },
        );
        if (!captured.ok()) return "";
        const body = await captured.json();
        verificationCode =
          String(body.textBody || "").match(/\b(\d{6})\b/)?.[1] || "";
        return verificationCode;
      })
      .toMatch(/^\d{6}$/);

    await authenticatedPage
      .getByLabel("Six-digit verification code")
      .fill(verificationCode);
    const confirmationPromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        /\/registered-sender-emails\/[^/]+\/reply-to-verification\/confirm$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await authenticatedPage
      .getByRole("button", { name: "Verify code" })
      .click();
    const confirmation = await confirmationPromise;
    expect(
      confirmation.ok(),
      JSON.stringify(await responseFailureDetails(confirmation)),
    ).toBe(true);
    await expect(
      authenticatedPage.getByText("Email is ready", { exact: true }),
    ).toBeVisible();

    const testEmailPromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        /\/registered-sender-emails\/[^/]+\/test$/.test(
          new URL(response.url()).pathname,
        ),
    );
    await authenticatedPage
      .getByRole("button", { name: "Send test email" })
      .click();
    const testEmail = await testEmailPromise;
    expect(
      testEmail.ok(),
      JSON.stringify(await responseFailureDetails(testEmail)),
    ).toBe(true);
    await expect(
      authenticatedPage.getByText("The test email was queued.", {
        exact: true,
      }),
    ).toBeVisible();

    let capturedTestEmail;
    await expect
      .poll(async () => {
        const captured = await request.get(
          `${POSTMARK_STUB}/__e2e/messages/latest?to=${encodeURIComponent(
            WORKSPACE.email,
          )}`,
          { headers: postmarkControlHeaders },
        );
        if (!captured.ok()) return "";
        capturedTestEmail = await captured.json();
        return capturedTestEmail.subject;
      })
      .toBe("Your shario.io managed email is ready");

    expect(capturedTestEmail).toMatchObject({
      to: WORKSPACE.email,
      replyTo: WORKSPACE.email,
      messageStream: "outbound",
    });
    expect(capturedTestEmail.from).toContain("@notify.shario.io");

    // Manual email composition was retired. Existing links must still open
    // history without exposing the removed composer.
    await authenticatedPage.goto(
      `${tenantUrl(WORKSPACE.slug, "/app/communications")}?section=history&compose=1`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(authenticatedPage).toHaveURL(
      (url) =>
        isTenantRoute(url, WORKSPACE.slug, "/app/communications") &&
        url.searchParams.get("section") === "history" &&
        !url.searchParams.has("compose"),
    );

    const history = authenticatedPage.locator("[data-outbound-email-history]");
    await expect(history).toBeVisible();
    await expect(authenticatedPage.getByRole("dialog")).toHaveCount(0);

    const stubState = await request.get(`${POSTMARK_STUB}/__e2e/state`, {
      headers: postmarkControlHeaders,
    });
    expect(stubState.ok(), await stubState.text()).toBe(true);
    expect(await stubState.json()).toEqual({
      serverCount: 1,
      webhookCount: 1,
      messageCount: 2,
    });
  } finally {
    await authenticatedContext.close();
  }
});
