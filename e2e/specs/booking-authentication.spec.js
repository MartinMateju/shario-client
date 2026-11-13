import { test, expect } from "../fixtures/test.js";
import { isApiResponse, PASSWORD, USERS } from "../helpers/auth.js";
import {
  customTenantOrigin,
  customTenantUrl,
  E2E,
  isCustomTenantRoute,
  isTenantRoute,
  tenantOrigin,
  tenantUrl,
} from "../helpers/urls.js";

async function setEnglish(page, origin) {
  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: origin,
      sameSite: "Lax",
    },
  ]);
}

const isIntentResponse = (response, method, suffix = "") => {
  const url = new URL(response.url());

  return (
    response.request().method() === method &&
    url.pathname.startsWith("/booking-intents/") &&
    url.pathname.endsWith(suffix)
  );
};

async function completeAuthenticationGate({
  page,
  e2eState,
  origin,
  expectedHost,
  custom = false,
}) {
  await setEnglish(page, origin);
  const productId = e2eState.products.alpha.id;
  const detailUrl = custom
    ? customTenantUrl(expectedHost, `/courses/${productId}`)
    : tenantUrl(E2E.alphaSlug, `/courses/${productId}`);

  await page.goto(detailUrl, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Alpha Workshop",
    }),
  ).toBeVisible();

  const slot = page.getByRole("radio").first();
  await expect(slot).toBeVisible();
  await slot.check();

  const createResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      response.request().method() === "POST" &&
      url.pathname === `/public/tenants/${E2E.alphaSlug}/booking-intents`
    );
  });
  await page
    .getByRole("button", {
      name: "Book with my account",
    })
    .click();
  const createResponse = await createResponsePromise;

  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  const token = String(created.token || "");
  expect(token.length).toBeGreaterThan(40);

  await expect(page).toHaveURL(
    (url) =>
      url.hostname === expectedHost &&
      url.pathname === "/en/login" &&
      url.searchParams
        .get("next")
        ?.includes(`/portal/booking/confirm?intent=${token}`),
  );

  await page.getByLabel(/^e-?mail\s*\*?$/i).fill(USERS.customer);
  await page.getByLabel(/^Password\s*\*?$/).fill(PASSWORD);

  const loginResponsePromise = page.waitForResponse((response) =>
    isApiResponse(response, "/auth/customer", "POST"),
  );
  const restoreResponsePromise = page.waitForResponse((response) =>
    isIntentResponse(response, "GET"),
  );
  await page
    .getByRole("button", {
      name: "Sign in",
      exact: true,
    })
    .click();

  expect((await loginResponsePromise).status()).toBe(200);
  expect((await restoreResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL((url) =>
    custom
      ? isCustomTenantRoute(url, expectedHost, "/portal/booking/confirm")
      : isTenantRoute(url, E2E.alphaSlug, "/portal/booking/confirm"),
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Review and confirm",
    }),
  ).toBeVisible();
  await expect(page.getByText("Alpha Workshop", { exact: true })).toBeVisible();

  return token;
}

test.describe("booking authentication gate", () => {
  test("restores a server-issued intent after subdomain sign-in and rejects a tampered token", async ({
    page,
    e2eState,
  }) => {
    const token = await completeAuthenticationGate({
      page,
      e2eState,
      origin: tenantOrigin(E2E.alphaSlug),
      expectedHost: `${E2E.alphaSlug}.shario.localhost`,
    });
    const parts = token.split(".");
    parts[2] = `${parts[2][0] === "a" ? "b" : "a"}${parts[2].slice(1)}`;
    const tampered = parts.join(".");
    const rejectedResponsePromise = page.waitForResponse(
      (response) =>
        isIntentResponse(response, "GET") &&
        response.url().includes(encodeURIComponent(tampered)),
    );

    await page.goto(
      tenantUrl(
        E2E.alphaSlug,
        `/portal/booking/confirm?intent=${encodeURIComponent(tampered)}`,
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );

    const rejected = await rejectedResponsePromise;
    expect(rejected.status()).toBe(400);
    expect(await rejected.json()).toMatchObject({
      code: "INVALID_BOOKING_INTENT",
    });
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Booking could not be loaded",
      }),
    ).toBeVisible();
  });

  test("keeps the complete sign-in and restoration flow on an active custom host", async ({
    page,
    e2eState,
  }) => {
    await completeAuthenticationGate({
      page,
      e2eState,
      origin: customTenantOrigin(E2E.alphaCustomHostname),
      expectedHost: E2E.alphaCustomHostname,
      custom: true,
    });

    expect(new URL(page.url()).hostname).toBe(E2E.alphaCustomHostname);
  });
});

test.describe("recovery continuation", () => {
  test("verifies email on a custom host and preserves only a safe tenant continuation", async ({
    page,
  }) => {
    const origin = customTenantOrigin(E2E.alphaCustomHostname);
    await setEnglish(page, origin);
    const token = "a".repeat(64);
    let verifyBody;

    await page.route(
      "**/auth/customer/email-verification/verify",
      async (route) => {
        verifyBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "VERIFIED",
            verified: true,
          }),
        });
      },
    );

    await page.goto(
      customTenantUrl(
        E2E.alphaCustomHostname,
        `/verify-email?token=${token}&next=${encodeURIComponent(
          "//evil.example/steal",
        )}`,
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Email verified",
      }),
    ).toBeVisible();
    expect(verifyBody).toEqual({
      tenantSlug: E2E.alphaSlug,
      token,
    });

    const continuation = page.getByRole("link", {
      name: "Sign in and continue",
    });
    await expect(continuation).toHaveAttribute(
      "href",
      /\/en\/login\?next=%2Fportal$/,
    );
    await continuation.click();
    await expect(page).toHaveURL(
      (url) =>
        isCustomTenantRoute(url, E2E.alphaCustomHostname, "/login") &&
        url.searchParams.get("next") === "/portal",
    );
  });

  test("carries tenantSlug and an opaque reset token through password recovery", async ({
    page,
  }) => {
    const origin = tenantOrigin(E2E.alphaSlug);
    await setEnglish(page, origin);
    const resetToken = "f".repeat(64);
    const requests = [];

    await page.route("**/password-reset/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const requestOrigin = request.headers().origin || origin;

      if (request.method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-credentials": "true",
            "access-control-allow-headers": "content-type",
            "access-control-allow-methods": "POST,OPTIONS",
            "access-control-allow-origin": requestOrigin,
          },
        });
        return;
      }

      const body = request.postDataJSON();
      requests.push({
        pathname,
        body,
      });

      if (pathname.endsWith("/verify-otp")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-credentials": "true",
            "access-control-allow-origin": requestOrigin,
          },
          body: JSON.stringify({
            status: "VERIFIED",
            resetToken,
          }),
        });
        return;
      }

      await route.fulfill({
        status: pathname.endsWith("/request") ? 202 : 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-origin": requestOrigin,
        },
        body: JSON.stringify({
          status: pathname.endsWith("/request") ? "PENDING" : "SUCCESS",
        }),
      });
    });

    const next = "/portal/booking/confirm?intent=restored-intent";
    await page.goto(
      tenantUrl(E2E.alphaSlug, `/password?next=${encodeURIComponent(next)}`),
      {
        waitUntil: "domcontentloaded",
      },
    );
    await page
      .getByPlaceholder("you@email.com")
      .fill("customer@studio-alpha.test");
    await page
      .getByRole("button", {
        name: "Send verification code",
      })
      .click();

    await page.getByLabel("Verification code digit 1").fill("123456");
    await page
      .getByRole("button", {
        name: "Continue",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL((url) =>
      isTenantRoute(url, E2E.alphaSlug, "/password/reset"),
    );

    await page.getByLabel(/^New password\s*\*?$/).fill("NewPassword123");
    await page
      .getByLabel(/^Confirm new password\s*\*?$/)
      .fill("NewPassword123");
    await page
      .getByRole("button", {
        name: "Save new password",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      (url) =>
        isTenantRoute(url, E2E.alphaSlug, "/password/success") &&
        url.searchParams.get("next") === next,
    );

    expect(requests).toEqual([
      {
        pathname: "/password-reset/request",
        body: {
          tenantSlug: E2E.alphaSlug,
          email: "customer@studio-alpha.test",
          locale: "en",
        },
      },
      {
        pathname: "/password-reset/verify-otp",
        body: {
          otp: "123456",
          email: "customer@studio-alpha.test",
          tenantSlug: E2E.alphaSlug,
        },
      },
      {
        pathname: "/password-reset/reset",
        body: {
          tenantSlug: E2E.alphaSlug,
          resetToken,
          password: "NewPassword123",
        },
      },
    ]);
  });
});
