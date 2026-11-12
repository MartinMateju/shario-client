import { expect, test } from "@playwright/test";

import {
  LAUNCH_MODULE_SCENARIOS,
  LAUNCH_TENANT_ORIGIN,
  bookingLaunchSnapshot,
  firingOnlyLaunchSnapshot,
  installLaunchAppMocks,
  inventoryOnlyLaunchSnapshot,
  mockLaunchCenter,
  mockSuccessfulWrite,
} from "../helpers/launch-center.js";

const API_ORIGIN = "http://api.shario.localhost:4311";
const SETUP_PATH = "/en/app/setup";

const section = (page, id) => page.locator(`[data-launch-section="${id}"]`);
const finalReview = (page) => page.locator("[data-launch-final-review]");
const stepDetail = (page) => page.locator("#launch-center-step-detail");

const markSetupStepComplete = (snapshot, stepId) => ({
  ...snapshot,
  steps: snapshot.steps.map((step) =>
    step.id === stepId
      ? {
          ...step,
          status: "complete",
          complete: true,
          reasonCode: "complete",
          checks: step.checks.map((check) => ({
            ...check,
            complete: true,
            reasonCode: "complete",
          })),
          actions: step.actions.map((action) => ({
            ...action,
            enabled: false,
          })),
        }
      : step,
  ),
});

const completeEarlierRecommendations = (snapshot) =>
  markSetupStepComplete(
    markSetupStepComplete(snapshot, "communications"),
    "team",
  );

async function openLaunchCenter(
  page,
  snapshot,
  modules = LAUNCH_MODULE_SCENARIOS.booking,
) {
  const app = await installLaunchAppMocks(page, { modules });
  const launch = await mockLaunchCenter(page, snapshot);

  await page.context().addCookies([
    {
      name: "shario_language",
      value: "EN",
      url: LAUNCH_TENANT_ORIGIN,
      sameSite: "Lax",
    },
  ]);
  await page.goto(`${LAUNCH_TENANT_ORIGIN}${SETUP_PATH}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL((url) => url.pathname === SETUP_PATH);

  return { ...app, ...launch };
}

async function expectLaunchSections(page) {
  await expect(section(page, "required")).toContainText(
    "Requirements to accept payments",
  );
  await expect(section(page, "recommended")).toContainText(
    "Checklist before you launch",
  );
  await expect(section(page, "available-later")).toContainText(
    "Show all tasks",
  );
}

async function expandLaunchSection(page, id) {
  const target = section(page, id);
  if ((await target.getAttribute("open")) === null) {
    await target.locator("summary").click();
  }
  await expect(target).toHaveJSProperty("open", true);
  return target;
}

async function expectNoUnexpectedRequests(launch) {
  await expect.poll(() => [...launch.unexpectedRequests]).toEqual([]);
}

async function expectStepCompleted(launch, stepId) {
  await expect
    .poll(() =>
      launch.events.some(
        ({ event, stepId: eventStepId }) =>
          event === "step_completed" && eventStepId === stepId,
      ),
    )
    .toBe(true);
}

async function mockLocationSaveWithRetry(page, launch, completedSnapshot) {
  let saveAttempts = 0;

  await page.route(`${API_ORIGIN}/locations/*`, async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (
      request.method() !== "PATCH" ||
      !/^\/locations\/[^/]+$/.test(pathname)
    ) {
      await route.fallback();
      return;
    }

    saveAttempts += 1;
    if (saveAttempts === 1) {
      await route.fulfill({
        status: 503,
        headers: {
          "access-control-allow-origin": LAUNCH_TENANT_ORIGIN,
          "access-control-allow-credentials": "true",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: "Temporary launch test failure.",
        }),
      });
      return;
    }

    launch.setSnapshot(completedSnapshot);
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": LAUNCH_TENANT_ORIGIN,
        "access-control-allow-credentials": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...request.postDataJSON(),
        id: "64b000000000000000000001",
        isPrimary: true,
        isActive: true,
      }),
    });
  });

  return () => saveAttempts;
}

test.describe("adaptive tenant launch journeys", () => {
  test("booking studio advances only on successful saves, publishes, and opens safe Practice Mode", async ({
    page,
  }) => {
    const locationMissing = bookingLaunchSnapshot({
      locationComplete: false,
      offerComplete: false,
      published: false,
    });
    const locationReady = bookingLaunchSnapshot({
      locationComplete: true,
      offerComplete: false,
      published: false,
    });
    const offerReady = bookingLaunchSnapshot({
      locationComplete: true,
      offerComplete: true,
      paymentsComplete: true,
      published: false,
      publicSiteReviewed: false,
    });
    const communicationsReady = completeEarlierRecommendations(offerReady);
    const readyToPublish = completeEarlierRecommendations(
      bookingLaunchSnapshot({
        locationComplete: true,
        offerComplete: true,
        paymentsComplete: true,
        published: false,
        publicSiteReviewed: true,
      }),
    );
    const published = completeEarlierRecommendations(bookingLaunchSnapshot());
    const launch = await openLaunchCenter(page, locationMissing);
    const getSaveAttempts = await mockLocationSaveWithRetry(
      page,
      launch,
      locationReady,
    );

    expect(launch.modules).toMatchObject({
      bookings: true,
      courses: true,
      payments: true,
      firing: false,
      inventory: false,
    });

    await expectLaunchSections(page);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Have you added your first studio location?",
      }),
    ).toBeVisible();

    await stepDetail(page)
      .getByRole("link", { name: "Review studio location", exact: true })
      .click();
    const locationEditor = page.locator('[data-guided-form="location-edit"]');
    await expect(locationEditor).toBeVisible();
    const editedLocationName = "Studio Alpha launch";
    await locationEditor.getByLabel("Location name").fill(editedLocationName);
    const refreshedLocation = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname ===
          "/locations/64b000000000000000000001",
    );

    await locationEditor
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();
    await refreshedLocation;
    expect(getSaveAttempts()).toBe(1);
    await expect(locationEditor.getByRole("alert")).toContainText(
      "Temporary launch test failure.",
    );
    await expect(locationEditor.getByLabel("Location name")).toHaveValue(
      editedLocationName,
    );
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname ===
          "/en/app/settings/locations/64b000000000000000000001/edit" &&
        url.searchParams.get("setupStep") === "location"
      );
    });
    expect(
      launch.events.some(
        ({ event, stepId }) =>
          event === "step_completed" && stepId === "location",
      ),
    ).toBe(false);

    // The guided route is resumable: a reload reopens the same unfinished form.
    await page.reload({ waitUntil: "domcontentloaded" });
    const resumedEditor = page.locator('[data-guided-form="location-edit"]');
    await expect(resumedEditor).toBeVisible();
    await expect(resumedEditor.getByLabel("Location name")).toHaveValue(
      "Studio Alpha",
    );
    await resumedEditor.getByLabel("Location name").fill(editedLocationName);
    await resumedEditor
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();

    await expect(page).toHaveURL((url) => url.pathname === SETUP_PATH);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Can customers book one of your offers?",
      }),
    ).toBeVisible();
    expect(getSaveAttempts()).toBe(2);
    await expectStepCompleted(launch, "location");

    await mockSuccessfulWrite(page, {
      pathname: "/products",
      onSuccess: () => launch.setSnapshot(offerReady),
      response: {
        product: {
          id: "64c000000000000000000001",
          name: "Launch Open Studio",
          kind: "open-studio",
          price: 450,
          currency: "CZK",
          maxNumberOfParticipants: 8,
          isActive: true,
        },
      },
    });
    await stepDetail(page)
      .getByRole("link", { name: "Open Studio", exact: true })
      .click();

    const productEditor = page.locator('[data-guided-form="product"]');
    await expect(productEditor).toBeVisible();
    await productEditor.getByLabel("Product name").fill("Launch Open Studio");
    await productEditor.getByLabel("Price").fill("450");
    await productEditor
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();

    await expect(page).toHaveURL((url) => url.pathname === SETUP_PATH);
    await expectStepCompleted(launch, "bookable_offer");
    await expect(
      page.locator('[data-payment-readiness="ready"]'),
    ).toContainText("Your studio can now accept payments");
    await expect(finalReview(page)).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Will customers receive the right messages?",
      }),
    ).toBeVisible();
    const communicationsSettings = stepDetail(page).getByRole("link", {
      name: "Set up email sender",
      exact: true,
    });
    await expect(communicationsSettings).toBeVisible();
    await expect(communicationsSettings).toHaveAttribute(
      "href",
      "/en/app/communications?section=setup&setupStep=communications",
    );

    launch.setSnapshot(communicationsReady);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Have you reviewed and customized your public website?",
      }),
    ).toBeVisible();

    await mockSuccessfulWrite(page, {
      method: "PATCH",
      pathname: "/tenants/current/settings/public-site",
      onSuccess: () => launch.setSnapshot(readyToPublish),
      response: {
        draft: {},
        editor: {
          draftRevision: 1,
          publishedRevision: 0,
          hasUnpublishedChanges: true,
          draftUpdatedAt: "2026-08-05T08:02:00.000Z",
          publishedAt: null,
          publicationStatus: "not_published",
        },
      },
    });
    await stepDetail(page)
      .getByRole("link", { name: "Customize public website", exact: true })
      .click();
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/en/app/settings/public-site" &&
        url.searchParams.get("setupStep") === "public_site"
      );
    });
    const publicSiteEditor = page.locator('[data-guided-form="public_site"]');
    await expect(publicSiteEditor).toBeVisible();
    const saveWebsite = publicSiteEditor.getByRole("button", {
      name: "Save and continue",
      exact: true,
    });
    const expectSaveReachable = () =>
      expect
        .poll(() =>
          saveWebsite.evaluate((button) => {
            const bounds = button.getBoundingClientRect();
            const hit = document.elementFromPoint(
              bounds.x + bounds.width / 2,
              bounds.y + bounds.height / 2,
            );
            return button.contains(hit);
          }),
        )
        .toBe(true);
    // Sticky editor tabs must never cover the fixed Save action.
    await expectSaveReachable();
    await page.evaluate(() =>
      window.scrollBy({ top: window.innerHeight, behavior: "instant" }),
    );
    await expectSaveReachable();
    await saveWebsite.click();

    await expect(page).toHaveURL((url) => url.pathname === SETUP_PATH);
    await expectStepCompleted(launch, "public_site");
    await expect(finalReview(page)).toContainText(
      "Your studio is ready to launch",
    );
    await expect(
      finalReview(page).getByRole("link", {
        name: "Launch studio",
        exact: true,
      }),
    ).toBeVisible();

    // The customer journey remains last, after customization and publication.
    const launchChecklist = await expandLaunchSection(page, "recommended");
    const launchChecklistText = await launchChecklist.innerText();
    expect(
      launchChecklistText.indexOf("Your public website is customized"),
    ).toBeLessThan(
      launchChecklistText.indexOf("Are you ready to welcome customers?"),
    );
    expect(
      launchChecklistText.indexOf("Are you ready to welcome customers?"),
    ).toBeLessThan(
      launchChecklistText.indexOf(
        "Have you tested the customer booking journey?",
      ),
    );

    await mockSuccessfulWrite(page, {
      pathname: "/tenants/current/setup-center/publish",
      onSuccess: () => launch.setSnapshot(published),
      response: { data: published },
    });
    await finalReview(page)
      .getByRole("link", { name: "Launch studio", exact: true })
      .click();
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === SETUP_PATH &&
        url.searchParams.get("step") === "publish"
      );
    });
    await page
      .getByRole("button", { name: "Publish studio", exact: true })
      .click();

    await expect(finalReview(page)).toContainText(
      "1 launch item needs attention",
    );
    await expect(finalReview(page)).not.toContainText(
      "Your studio has launched",
    );
    expect(launch.getSnapshot().launchReview.launchComplete).toBe(false);
    const publicUrl = page.locator("[data-launch-public-url]");
    const testBooking = finalReview(page).getByRole("link", {
      name: "Complete test booking",
      exact: true,
    });
    await expect(publicUrl).toBeVisible();
    await expect(testBooking).toBeVisible();
    await expect(finalReview(page)).toContainText("Launch readiness");
    await expect(finalReview(page)).toContainText("1 check needs attention");
    const readinessChecks = finalReview(page).locator(
      "[data-readiness-checklist] > [data-readiness-item]",
    );
    await expect(readinessChecks).toHaveCount(5);
    for (const check of await readinessChecks.all()) {
      await expect(check).toBeVisible();
    }
    await expect(readinessChecks.nth(4)).toContainText("Step 5");
    await expect(
      finalReview(page).locator("[data-readiness-summary]"),
    ).toContainText("4 of 5 checks complete");
    await expect(
      finalReview(page).locator('[data-readiness-item="publicSite"]'),
    ).toHaveAttribute("data-readiness-status", "ready");
    await expect(
      finalReview(page).locator('[data-readiness-item="customerJourney"]'),
    ).toHaveAttribute("data-readiness-status", "action_required");
    await expect(
      finalReview(page).locator('[data-launch-primary-action="true"]'),
    ).toHaveCount(0);
    await expect(
      finalReview(page).locator('[data-readiness-action-permitted="true"]'),
    ).toHaveCount(1);
    await expect(
      finalReview(page).getByRole("button", { name: "Copy link" }),
    ).toBeVisible();
    const absolutePublicHref = await publicUrl.evaluate((link) => link.href);
    await expect(
      finalReview(page).getByRole("textbox", { name: "Public studio URL" }),
    ).toHaveCount(0);
    await expect(publicUrl).toHaveAttribute(
      "aria-label",
      "Open the published studio in a new tab",
    );

    const publicHref = new URL(absolutePublicHref);
    expect(publicHref.pathname).toMatch(/^\/en\/?$/);
    const testBookingHref = new URL(
      await testBooking.getAttribute("href"),
      page.url(),
    );
    expect(testBookingHref.pathname).toBe(SETUP_PATH);
    expect(testBookingHref.searchParams.get("step")).toBe("practice_booking");

    await testBooking.click();
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === SETUP_PATH &&
        url.searchParams.get("step") === "practice_booking"
      );
    });
    await expect(
      page.getByRole("heading", { level: 3, name: "Practice Mode" }),
    ).toBeVisible();
    await expect
      .poll(() => launch.events.map(({ event }) => event))
      .toEqual(
        expect.arrayContaining([
          "launch_center_viewed",
          "studio_ready",
          "test_booking_opened",
        ]),
      );
    const viewEvent = launch.events.find(
      ({ event }) => event === "launch_center_viewed",
    );
    const guidedCompletionEvents = launch.events.filter(
      ({ event, stepId }) =>
        event === "step_completed" &&
        ["location", "bookable_offer", "public_site"].includes(stepId),
    );
    expect(viewEvent).toMatchObject({
      event: "launch_center_viewed",
      source: "launch_center",
    });
    expect(viewEvent.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(viewEvent.sessionId).toEqual(expect.any(String));
    expect(guidedCompletionEvents).toHaveLength(3);
    expect(guidedCompletionEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "location",
          source: "guided_form",
        }),
        expect.objectContaining({
          stepId: "bookable_offer",
          source: "guided_form",
        }),
        expect.objectContaining({
          stepId: "public_site",
          source: "guided_form",
        }),
      ]),
    );
    await expectNoUnexpectedRequests(launch);
  });

  test("firing-only studio completes its kiln journey without billing profiles", async ({
    page,
  }) => {
    const kilnMissing = firingOnlyLaunchSnapshot({
      kilnsComplete: false,
    });
    const operationsReady = firingOnlyLaunchSnapshot();
    const launch = await openLaunchCenter(
      page,
      kilnMissing,
      LAUNCH_MODULE_SCENARIOS.firingOnly,
    );

    expect(launch.modules).toMatchObject({
      bookings: false,
      courses: false,
      payments: false,
      firing: true,
      inventory: false,
    });

    await expectLaunchSections(page);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Are your kilns ready for daily operations?",
      }),
    ).toBeVisible();

    await mockSuccessfulWrite(page, {
      pathname: "/kilns",
      onSuccess: () => launch.setSnapshot(operationsReady),
      response: {
        kiln: {
          id: "64d100000000000000000001",
          name: "Launch kiln",
          brand: "Rohde",
          location: "64b000000000000000000001",
          volumeLiters: 80,
          maxTemperature: 1300,
          supportedFirings: ["BISQUE", "GLAZE"],
          status: "AVAILABLE",
        },
      },
    });
    await page.getByRole("link", { name: "Add a kiln", exact: true }).click();

    const kilnEditor = page.locator("#kiln-form");
    await expect(kilnEditor).toBeVisible();
    await kilnEditor.getByLabel("Kiln name").fill("Launch kiln");
    await kilnEditor.getByLabel("Brand").fill("Rohde");
    await kilnEditor.getByLabel("Volume").fill("80");
    await page
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();

    await expect(page).toHaveURL((url) => url.pathname === SETUP_PATH);
    await expectStepCompleted(launch, "kilns");
    await expect(finalReview(page)).toContainText(
      "Your studio is ready to operate",
    );
    const completedTasks = await expandLaunchSection(page, "all-tasks");
    await expect(completedTasks).toContainText(
      "Your kilns are ready for daily operations",
    );
    await expect(completedTasks).toContainText(/external firing/i);
    await expect(page.locator("[data-launch-public-url]")).toHaveCount(0);
    await expect(page.locator("[data-launch-test-booking]")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Launch studio", exact: true }),
    ).toHaveCount(0);
    expect(
      launch.events.filter(
        ({ event, stepId }) =>
          event === "step_completed" && ["firing", "kilns"].includes(stepId),
      ),
    ).toEqual([
      expect.objectContaining({
        stepId: "kilns",
        source: "guided_form",
      }),
    ]);
    await expectNoUnexpectedRequests(launch);
  });

  test("inventory-only studio saves its first item and reaches final review", async ({
    page,
  }) => {
    const inventoryMissing = inventoryOnlyLaunchSnapshot({
      inventoryComplete: false,
    });
    const inventoryReady = inventoryOnlyLaunchSnapshot();
    const launch = await openLaunchCenter(
      page,
      inventoryMissing,
      LAUNCH_MODULE_SCENARIOS.inventoryOnly,
    );

    expect(launch.modules).toMatchObject({
      bookings: false,
      courses: false,
      payments: false,
      firing: false,
      inventory: true,
    });

    await expectLaunchSections(page);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Can your team track the materials it uses?",
      }),
    ).toBeVisible();

    await mockSuccessfulWrite(page, {
      pathname: "/inventory/items",
      onSuccess: () => launch.setSnapshot(inventoryReady),
      response: {
        item: {
          id: "64e000000000000000000001",
          name: "Stoneware clay",
          category: "clay",
          unit: "kg",
          isActive: true,
        },
      },
    });
    await page
      .getByRole("link", { name: "Set up inventory", exact: true })
      .click();
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/en/app/operations" &&
        url.searchParams.get("section") === "inventory" &&
        url.searchParams.get("action") === "create" &&
        url.searchParams.get("setupStep") === "inventory"
      );
    });

    const inventoryEditor = page.getByRole("dialog", {
      name: "New inventory item",
    });
    await expect(inventoryEditor).toHaveAttribute("aria-modal", "true");
    await expect(
      inventoryEditor.locator('[data-guided-form="inventory"]'),
    ).toBeVisible();
    await inventoryEditor.getByLabel("Name").fill("Stoneware clay");
    const stockLocation = inventoryEditor.getByRole("checkbox", {
      name: "Studio Alpha",
    });
    if (!(await stockLocation.isChecked())) await stockLocation.check();
    await inventoryEditor
      .getByRole("button", { name: "Save and continue", exact: true })
      .click();

    await expect(page).toHaveURL((url) => url.pathname === SETUP_PATH);
    await expectStepCompleted(launch, "inventory");
    await expect(finalReview(page)).toContainText(
      "Your studio is ready to operate",
    );
    const completedTasks = await expandLaunchSection(page, "all-tasks");
    await expect(completedTasks).toContainText("Your team can track materials");
    await expect(page.locator("[data-launch-public-url]")).toHaveCount(0);
    await expect(page.locator("[data-launch-test-booking]")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Launch studio", exact: true }),
    ).toHaveCount(0);
    expect(
      launch.events.find(
        ({ event, stepId }) =>
          event === "step_completed" && stepId === "inventory",
      ),
    ).toMatchObject({ source: "guided_form" });
    await expectNoUnexpectedRequests(launch);
  });
});
