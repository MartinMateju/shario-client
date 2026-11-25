import { test as base, expect } from "@playwright/test";

const resetUrl =
  process.env.E2E_RESET_URL || "http://127.0.0.1:4311/__e2e/reset";
const resetKey = process.env.E2E_TEST_KEY || "shario-e2e-local-key";

export const test = base.extend({
  page: async ({ page }, providePage) => {
    if (process.env.E2E_HTTPS_MODE !== "1") {
      await providePage(page);
      return;
    }
    const session = await page.context().newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.setCookieControls", {
      enableThirdPartyCookieRestriction: true,
    });
    // Chromium applies this policy on the next load. Set it before navigating
    // to the custom host so login and reload cannot rely on third-party cookies.
    await page.reload({ waitUntil: "domcontentloaded" });
    try {
      await providePage(page);
    } finally {
      await session.detach();
    }
  },
  e2eState: [
    async ({ request }, use) => {
      const response = await request.post(resetUrl, {
        headers: {
          "x-e2e-key": resetKey,
        },
      });
      const body = await response.text();

      if (!response.ok()) {
        throw new Error(
          `E2E reset failed with ${response.status()}: ${body || "<empty response>"}`,
        );
      }

      let state = {};

      if (body) {
        try {
          state = JSON.parse(body);
        } catch {
          state = { raw: body };
        }
      }

      await use(state);
    },
    { auto: true },
  ],
});

export { expect };
