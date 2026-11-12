import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installLocalVercelTelemetryRoutes } from "./local-vercel-telemetry";

const TENANT_ORIGIN = "http://studio-alpha.shario.localhost:4310";
const CUSTOMER_PORTAL_FIXED_TIME = "2026-08-11T10:30:00+02:00";
const REPRESENTATIVE_PRESET_SCENARIOS = [
  {
    id: "classic-editorial-v1",
    origin: "http://studio-classic.shario.localhost:4310",
    name: "Atelier Classic",
    logoRedirectUrl: "https://studio.example.test/",
    font: /Switzer/i,
    panelRadius: "2rem",
    buttonHeight: "3rem",
  },
  {
    id: "warm-organic-v1",
    origin: "http://studio-warm.shario.localhost:4310",
    name: "Atelier Warm",
    logoRedirectUrl: "/about?source=logo",
    font: /Switzer/i,
    panelRadius: "2.75rem 1.5rem 2.75rem 1.5rem",
    buttonHeight: "3.125rem",
  },
];
const DECIMAL_CURRENCY_FRACTION_PATTERN = /\d[.,]\d{2}(?!\d)/;
const MEMBER_ID = "234";
const BRNO_LOCATION_ID = "64b000000000000000000021";
const PRAGUE_LOCATION_ID = "64b000000000000000000022";
const SHORT_LAPTOP_PROJECTS = new Set([
  "laptop-1280-short",
  "laptop-1366-short",
]);
const BOOKING_DRAWER_PROJECTS = new Set(["laptop-1280-short", "mobile-320"]);
const PORTAL_PAGE_ALIGNMENT_PROJECTS = new Set([
  "desktop-1440",
  "laptop-1280-short",
  "tablet-768",
  "mobile-320",
]);
const PORTAL_PAGE_SCREENSHOT_PROJECTS = new Set(["desktop-1440", "mobile-320"]);
const PORTAL_MENU_PROJECTS = new Set([
  "desktop-1440",
  "laptop-1280-short",
  "tablet-1024",
  "mobile-390",
  "mobile-320",
]);

const portalPageScenarios = [
  { key: "work", path: "/portal/work?location=atelier-brno", active: false },
  {
    key: "membership",
    path: "/portal/membership?location=atelier-brno",
    active: true,
  },
  {
    key: "vouchers",
    path: "/portal?tab=vouchers&location=atelier-brno",
    active: true,
  },
  {
    key: "knowledge",
    path: "/portal/knowledge?location=atelier-brno",
    active: true,
  },
  {
    key: "invoices",
    path: "/portal/invoices?location=atelier-brno",
    active: false,
  },
  {
    key: "credits",
    path: "/portal/credits?location=atelier-brno",
    active: false,
  },
  {
    key: "bookings",
    path: "/portal/bookings?location=atelier-brno",
    active: false,
  },
  {
    key: "account",
    path: "/portal/account?location=atelier-brno",
    active: false,
  },
].filter(
  (scenario) =>
    scenario.key !== "invoices" ||
    process.env.NEXT_PUBLIC_NATIVE_INVOICES_ENABLED === "true",
);

const localeScenarios = [
  {
    locale: "en",
    oppositeLegacyLanguage: "CZ",
    copy: {
      day: /^Day$/i,
      month: /^Month$/i,
      week: /^Week$/i,
      greeting: /welcome|good (morning|afternoon|evening)/i,
      bookings: /^My bookings$/i,
      manageBooking: /^View booking$/i,
      bookSession: /^Book a session$/i,
      cartTitle: /^Review your booking$/i,
      checkout: /^Continue to payment$/i,
      drawerTitle: /^Book a session$/i,
      guests: /^Guests$/i,
      newBooking: /^New booking$/i,
      primaryProduct: "Open Studio",
      secondaryProduct: "Glazing Lab",
      sessionType: /^Session type$/i,
      brnoBookingTitle: /Open Studio/i,
      pragueBookingTitle: /Glazing Lab/i,
    },
  },
  {
    locale: "cs",
    oppositeLegacyLanguage: "EN",
    copy: {
      day: /^Den$/i,
      month: /^Měsíc$/i,
      week: /^Týden$/i,
      greeting: /vítejte|dobré (ráno|odpoledne|večer)/i,
      bookings: /^Moje rezervace$/i,
      manageBooking: /^Zobrazit rezervaci$/i,
      bookSession: /^Rezervovat návštěvu$/i,
      cartTitle: /^Zkontrolujte rezervaci$/i,
      checkout: /^Pokračovat k platbě$/i,
      drawerTitle: /^Rezervace studia$/i,
      guests: /^Počet osob$/i,
      newBooking: /^Nová rezervace$/i,
      primaryProduct: "Otevřený ateliér",
      secondaryProduct: "Glazovací dílna",
      sessionType: /^Typ rezervace$/i,
      brnoBookingTitle: /Otevřený ateliér/i,
      pragueBookingTitle: /Glazovací dílna/i,
    },
  },
];

const formatAxeViolations = (violations) =>
  violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    targets: nodes.flatMap((node) => node.target),
  }));

const contrastRatio = (page, foreground, background) =>
  page.evaluate(
    ({ foreground, background }) => {
      // Let the browser convert computed colors (including Oklab transitions)
      // to rendered sRGB instead of assuming a particular CSS serialization.
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", {
        colorSpace: "srgb",
        willReadFrequently: true,
      });
      if (!context) throw new Error("Cannot measure rendered color contrast");

      const relativeLuminance = (value) => {
        if (!CSS.supports("color", value)) {
          throw new Error(`Unsupported computed CSS color: ${value}`);
        }
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        const channels = [...context.getImageData(0, 0, 1, 1).data];
        if (channels[3] !== 255) {
          throw new Error(
            `Contrast requires an opaque rendered color: ${value}`,
          );
        }
        return channels.slice(0, 3).reduce((total, channel, index) => {
          const normalized = channel / 255;
          const linear =
            normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          return total + linear * [0.2126, 0.7152, 0.0722][index];
        }, 0);
      };
      const foregroundLuminance = relativeLuminance(foreground);
      const backgroundLuminance = relativeLuminance(background);
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      );
    },
    { foreground, background },
  );

const logoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" role="img" aria-label="Atelier Nami">
    <rect width="320" height="120" rx="24" fill="#F5F1EA"/>
    <circle cx="60" cy="60" r="38" fill="#2748D8"/>
    <path d="M34 70c15-43 38-43 53 0-17-13-36-13-53 0Z" fill="#FFFFFF"/>
    <text x="116" y="72" font-family="Georgia, serif" font-size="34" fill="#22221F">Nami</text>
  </svg>`;

async function installAssetRoutes(page) {
  await installLocalVercelTelemetryRoutes(page);
  await page.route("https://visual-assets.example.test/**", (route) =>
    route.fulfill({
      body: logoSvg,
      contentType: "image/svg+xml",
      status: 200,
    }),
  );
}

const isLocationScopedResponse = (response, pathname, locationId) => {
  const url = new URL(response.url());

  return (
    response.request().method() === "GET" &&
    url.pathname.replace(/\/+$/, "") === pathname &&
    url.searchParams.get("locationId") === locationId
  );
};

async function expectNoHorizontalOverflow(page) {
  const geometry = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
    root: document.documentElement.scrollWidth,
  }));

  expect(
    Math.max(geometry.body, geometry.root),
    `Customer portal overflowed horizontally: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.client + 1);
}

async function expectTouchTarget(locator, name) {
  await expect(locator, `${name} must be visible.`).toBeVisible();
  const box = await locator.boundingBox();

  expect(box, `${name} must be measurable.`).not.toBeNull();
  expect(
    box.width + 0.01,
    `${name} must be at least 44px wide.`,
  ).toBeGreaterThanOrEqual(44);
  expect(
    box.height + 0.01,
    `${name} must be at least 44px tall.`,
  ).toBeGreaterThanOrEqual(44);
}

async function expectCompactViewportBounds(page, locator, name) {
  await expect(locator, `${name} must be visible.`).toBeVisible();
  await expect
    .poll(
      async () => {
        const box = await locator.boundingBox();
        const viewport = page.viewportSize();
        return Boolean(
          box &&
          viewport &&
          box.x >= -1 &&
          box.y >= -1 &&
          box.x + box.width <= viewport.width + 1 &&
          box.y + box.height <= viewport.height + 1,
        );
      },
      { message: `${name} must fit inside the short phone viewport.` },
    )
    .toBe(true);
}

async function expectReachableCompactControl(page, locator, name) {
  await locator.scrollIntoViewIfNeeded();
  // A control can already be in the viewport but sit beneath the floating
  // assistant or sticky header. Scroll it into the reading area as a user can.
  await locator.evaluate((element) =>
    element.scrollIntoView({
      behavior: "instant",
      block: "center",
      inline: "nearest",
    }),
  );
  await expectCompactViewportBounds(page, locator, name);
  await expect
    .poll(
      () =>
        locator.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              box.x + box.width / 2,
              box.y + box.height / 2,
            ),
          );
        }),
      { message: `${name} must not be covered by a sticky footer or overlay.` },
    )
    .toBe(true);
}

for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
]) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`Short phone ${size} keeps account fields, navigation and booking pagination usable`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-320",
      "Run each short height once in the mobile matrix.",
    );
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date(CUSTOMER_PORTAL_FIXED_TIME));
    await installAssetRoutes(page);
    await page.goto(
      `${TENANT_ORIGIN}/en/portal/account?location=atelier-brno`,
      {
        waitUntil: "domcontentloaded",
      },
    );

    await expect(
      page.getByRole("heading", { name: "Personal details", exact: true }),
    ).toBeVisible();
    const accountFields = page
      .locator(
        'main input:is(:not([type]), [type="text"], [type="email"], [type="tel"], [type="password"])',
      )
      .filter({ visible: true });
    expect(await accountFields.count()).toBeGreaterThanOrEqual(7);
    for (let index = 0; index < (await accountFields.count()); index += 1) {
      const field = accountFields.nth(index);
      await field.scrollIntoViewIfNeeded();
      await expectCompactViewportBounds(
        page,
        field,
        `Account field ${index + 1}`,
      );
      expect(
        await field.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
        "Text entry must remain at least 16px to avoid mobile browser focus zoom.",
      ).toBeGreaterThanOrEqual(16);
      if (await field.isEnabled()) {
        await field.focus();
        await expect(field).toBeFocused();
        await expectCompactViewportBounds(
          page,
          field,
          `Focused account field ${index + 1}`,
        );
      }
    }
    const firstName = page.getByLabel("First name", { exact: true });
    await firstName.fill("");
    const saveProfile = page.getByRole("button", {
      name: "Save profile",
      exact: true,
    });
    await expect(saveProfile).toBeDisabled();
    await firstName.fill("Martin");
    await expect(saveProfile).toBeEnabled();
    await expectReachableCompactControl(
      page,
      saveProfile,
      "Save profile action",
    );
    await page
      .getByLabel("Current password", { exact: true })
      .fill("current-example");
    await page
      .getByLabel("New password", { exact: true })
      .fill("new-example-one");
    await page
      .getByLabel("Confirm new password", { exact: true })
      .fill("new-example-two");
    const changePassword = page.getByRole("button", {
      name: "Change password",
      exact: true,
    });
    await expectReachableCompactControl(
      page,
      changePassword,
      "Change password action",
    );
    // Mismatch validation stays entirely local; no account mutation is sent.
    await changePassword.click();
    const passwordError = page
      .locator("form")
      .filter({
        has: page.getByLabel("Current password", { exact: true }),
      })
      .getByRole("alert");
    await expect(passwordError).toBeVisible();
    await expect(passwordError).toHaveText("The new passwords do not match.");

    const appearance = page.getByRole("form", { name: "Your portal colours" });
    await appearance
      .getByText("Customize individual colours", { exact: true })
      .click();
    const hexFields = appearance.locator('input[type="text"]');
    expect(await hexFields.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await hexFields.count()); index += 1) {
      const hex = hexFields.nth(index);
      const row = hex.locator("..");
      await hex.scrollIntoViewIfNeeded();
      const geometry = await row.evaluate((element) => {
        const rowBox = element.getBoundingClientRect();
        const panelBox = element.closest("form").getBoundingClientRect();
        return {
          fitsPanel:
            rowBox.left >= panelBox.left && rowBox.right <= panelBox.right,
          fitsRow: [...element.querySelectorAll("input, button")].every(
            (control) => {
              const box = control.getBoundingClientRect();
              return (
                box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1
              );
            },
          ),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        };
      });
      expect(
        geometry.fitsPanel,
        "Expanded colour rows must stay inside the account panel.",
      ).toBe(true);
      expect(
        geometry.fitsRow,
        "Colour picker, hex field and Studio reset must fit together.",
      ).toBe(true);
      expect(geometry.scrollWidth).toBeLessThanOrEqual(
        geometry.clientWidth + 1,
      );
      await expectReachableCompactControl(
        page,
        hex,
        `Hex colour field ${index + 1}`,
      );
      expect(
        await hex.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
      await hex.fill("#2455B5");
      const reset = row.getByRole("button", {
        name: /^Use studio colour for /,
      });
      await expectReachableCompactControl(
        page,
        reset,
        `Studio colour reset ${index + 1}`,
      );
      await reset.click();
      await expect(hex).toHaveValue("");
    }
    await expectNoHorizontalOverflow(page);

    const menuTrigger = page
      .locator('button[aria-controls="mobile-menu"]')
      .filter({ visible: true });
    await menuTrigger.click();
    const menu = page.locator("[data-customer-portal-mobile-menu]");
    await expectCompactViewportBounds(page, menu, "Mobile navigation");
    const navigationLinks = menu.locator(
      "[data-customer-portal-mobile-navigation] a",
    );
    expect(await navigationLinks.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await navigationLinks.count()); index += 1) {
      await expectReachableCompactControl(
        page,
        navigationLinks.nth(index),
        `Navigation link ${index + 1}`,
      );
    }
    const accountMenu = menu.locator("[data-customer-portal-mobile-account]");
    await expectReachableCompactControl(page, accountMenu, "Open account menu");
    await accountMenu.click();
    await expect(menu).toBeHidden();
    const profile = page.locator("[data-customer-portal-profile-sheet]");
    await expectCompactViewportBounds(page, profile, "Account menu");
    const footerActions = profile
      .locator(
        "[data-profile-menu-footer] a, [data-profile-menu-footer] button",
      )
      .filter({ visible: true });
    expect(await footerActions.count()).toBeGreaterThan(0);
    for (let index = 0; index < (await footerActions.count()); index += 1) {
      await expectReachableCompactControl(
        page,
        footerActions.nth(index),
        `Account footer action ${index + 1}`,
      );
    }
    await page.keyboard.press("Escape");
    await expect(profile).toBeHidden();

    // Czech labels caught the original clipped next-page button at 320px.
    await page.goto(
      `${TENANT_ORIGIN}/cs/portal/bookings?location=atelier-brno`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    await page.getByRole("button", { name: "Historie", exact: true }).click();
    const pagination = page.getByRole("navigation", {
      name: "Stránkování rezervací",
    });
    await expect(pagination).toContainText("1 / 5");
    await pagination.scrollIntoViewIfNeeded();
    await expectCompactViewportBounds(page, pagination, "Booking pagination");
    const next = pagination.getByRole("button", { name: "Další", exact: true });
    const previous = pagination.getByRole("button", {
      name: "Předchozí",
      exact: true,
    });
    await expect(previous).toBeDisabled();
    await expectReachableCompactControl(page, next, "Next booking page");
    await next.click();
    await expect(pagination).toContainText("2 / 5");
    await expectReachableCompactControl(
      page,
      previous,
      "Previous booking page",
    );
    await previous.click();
    await expect(pagination).toContainText("1 / 5");
    await expectNoHorizontalOverflow(page);
  });

  test(`Short phone ${size} keeps booking and cart actions visible without clipping`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-320",
      "Run each short height once in the mobile matrix.",
    );
    test.setTimeout(180_000);
    await page.setViewportSize(viewport);
    await page.clock.setFixedTime(new Date(CUSTOMER_PORTAL_FIXED_TIME));
    await installAssetRoutes(page);
    await page.goto(`${TENANT_ORIGIN}/cs/portal?location=atelier-brno`, {
      waitUntil: "domcontentloaded",
    });
    const welcome = page.locator("[data-customer-portal-tour-welcome]");
    await expect(welcome).toHaveAttribute("aria-modal", "true");
    await expectCompactViewportBounds(
      page,
      welcome.locator('[data-dialog-layout="modal"]'),
      "First-visit welcome panel",
    );
    const dismissWelcome = welcome.locator(
      "[data-customer-portal-tour-dismiss]",
    );
    await expectReachableCompactControl(
      page,
      dismissWelcome,
      "Dismiss first-visit welcome",
    );
    await dismissWelcome.click();
    await expect(welcome).toHaveCount(0);
    const calendar = page.locator("[data-customer-portal-calendar]");
    const availableSlot = calendar
      .locator(
        '[data-calendar-mobile-week-grid="true"] [data-calendar-slot-bookable="true"]',
      )
      .last();
    await expect(availableSlot).toBeVisible();
    await availableSlot.scrollIntoViewIfNeeded();
    await availableSlot.click();
    const continueBooking = calendar.locator("[data-calendar-mobile-continue]");
    await expectReachableCompactControl(
      page,
      continueBooking,
      "Continue with selected time",
    );
    await continueBooking.click();

    const drawer = page.locator('[data-dialog-layout="drawer"]');
    await expectCompactViewportBounds(page, drawer, "Booking drawer");
    await drawer
      .getByRole("combobox", { name: "Typ rezervace", exact: true })
      .selectOption({ label: "Glazovací dílna" });
    await drawer
      .getByRole("combobox", { name: "Počet osob", exact: true })
      .selectOption("2");
    const bookingScroll = drawer.locator("[data-booking-scroll-region]");
    const bookingFooter = drawer.locator("[data-booking-summary-footer]");
    await expectElementsNotToIntersect(
      bookingScroll,
      bookingFooter,
      "Booking form must remain clear of its persistent actions.",
    );
    await expectReachableCompactControl(
      page,
      drawer.getByRole("combobox", { name: "Počet osob", exact: true }),
      "Booking guests control",
    );
    const submit = drawer.locator("[data-booking-submit]");
    await expect(submit).toBeEnabled();
    await expectReachableCompactControl(page, submit, "Add booking to cart");
    await submit.click();
    await expect(drawer).toBeHidden();

    const cart = page.locator("[data-cart-modal]");
    await expectCompactViewportBounds(page, cart, "Cart");
    await expect(cart.locator("[data-cart-item]")).toHaveCount(1);
    const cartScroll = cart.locator("[data-cart-scroll-region]");
    const cartFooter = cart.locator("[data-cart-checkout-footer]");
    await cart.locator("[data-cart-summary]").scrollIntoViewIfNeeded();
    await expectElementsNotToIntersect(
      cartScroll,
      cartFooter,
      "Cart contents must remain clear of the payment action.",
    );
    await expectCompactViewportBounds(page, cartFooter, "Cart checkout footer");
    const checkout = cart.locator('[data-cart-checkout="persistent"]');
    await expect(checkout).toHaveText("Pokračovat k platbě");
    await expectReachableCompactControl(
      page,
      checkout,
      "Continue to payment action",
    );
    const labelGeometry = await checkout
      .locator("span")
      .evaluate((element) => ({
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
        height: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
    expect(
      labelGeometry.scrollWidth,
      "The complete Czech payment label must fit without ellipsis.",
    ).toBeLessThanOrEqual(labelGeometry.width + 1);
    expect(
      labelGeometry.scrollHeight,
      "The payment label must not be clipped vertically.",
    ).toBeLessThanOrEqual(labelGeometry.height + 1);
    await expectNoHorizontalOverflow(page);
    await cart
      .getByRole("button", { name: "Zavřít košík", exact: true })
      .click();
    await expect(cart).toBeHidden();

    // Adding the cart badge must not push the menu button off a narrow header.
    const menuTrigger = page
      .locator('header button[aria-controls="mobile-menu"]')
      .filter({ visible: true });
    const cartTrigger = page
      .getByRole("button", { name: "Otevřít košík", exact: true })
      .filter({ visible: true });
    await expectReachableCompactControl(
      page,
      menuTrigger,
      "Header menu with a populated cart",
    );
    await expectReachableCompactControl(
      page,
      cartTrigger,
      "Header cart with a booking",
    );
    await expect(
      cartTrigger.locator('[data-header-badge="cart-count"]'),
    ).toHaveText("1");
    await menuTrigger.click();
    const mobileMenu = page.locator("[data-customer-portal-mobile-menu]");
    await expect(mobileMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(mobileMenu).toBeHidden();
    await cartTrigger.click();
    await expect(cart).toBeVisible();
    await expect(cart.locator("[data-cart-item]")).toHaveCount(1);
    await cart
      .getByRole("button", { name: "Zavřít košík", exact: true })
      .click();
    await expect(cart).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });
}

async function dispatchTouchGesture(
  page,
  { from, to, steps = 8, settleMilliseconds = 120 },
) {
  const session = await page.context().newCDPSession(page);
  const touchPoint = (x, y) => ({
    force: 1,
    id: 1,
    radiusX: 6,
    radiusY: 6,
    x: Math.round(x),
    y: Math.round(y),
  });

  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [touchPoint(from.x, from.y)],
    });

    for (let step = 1; step <= steps; step += 1) {
      const progress = step / steps;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          touchPoint(
            from.x + (to.x - from.x) * progress,
            from.y + (to.y - from.y) * progress,
          ),
        ],
      });
      await page.waitForTimeout(16);
    }

    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }

  await page.waitForTimeout(settleMilliseconds);
}

async function swipeCalendarHorizontally(
  page,
  surface,
  direction,
  pinnedWidth = 0,
) {
  await surface.scrollIntoViewIfNeeded();
  const [box, viewport] = await Promise.all([
    surface.boundingBox(),
    Promise.resolve(page.viewportSize()),
  ]);

  expect(
    box,
    "The mobile calendar swipe surface must be measurable.",
  ).not.toBeNull();
  expect(viewport, "The mobile viewport must be measurable.").not.toBeNull();

  const left = Math.max(12, box.x + pinnedWidth + 12);
  const right = Math.min(viewport.width - 12, box.x + box.width - 12);
  const visibleTop = Math.max(6, box.y + 6);
  const visibleBottom = Math.min(viewport.height - 6, box.y + box.height - 6);
  const y = visibleTop + (visibleBottom - visibleTop) / 2;
  expect(
    visibleBottom - visibleTop,
    "The calendar must be visible before it receives a thumb swipe.",
  ).toBeGreaterThan(30);
  expect(
    right - left,
    "The calendar must expose enough room for a horizontal thumb swipe.",
  ).toBeGreaterThan(80);

  await dispatchTouchGesture(page, {
    from: { x: direction === "forward" ? right : left, y },
    to: { x: direction === "forward" ? left : right, y },
  });
}

async function swipeTargetIntoHorizontalView({
  page,
  scrollRegion,
  gestureSurface,
  target,
  pinnedWidth = 0,
}) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const [regionBox, targetBox] = await Promise.all([
      scrollRegion.boundingBox(),
      target.boundingBox(),
    ]);
    expect(
      regionBox,
      "The mobile week scroller must be measurable.",
    ).not.toBeNull();
    expect(
      targetBox,
      "The requested calendar slot must be measurable.",
    ).not.toBeNull();

    const geometryTolerance = 1;
    const visibleLeft = regionBox.x + pinnedWidth - geometryTolerance;
    const visibleRight = regionBox.x + regionBox.width + geometryTolerance;
    if (
      targetBox.x >= visibleLeft &&
      targetBox.x + targetBox.width <= visibleRight
    ) {
      return;
    }

    const direction =
      targetBox.x + targetBox.width > visibleRight ? "forward" : "backward";
    const previousScrollLeft = await scrollRegion.evaluate(
      (element) => element.scrollLeft,
    );
    await swipeCalendarHorizontally(page, gestureSurface, direction);
    const nextScrollLeft = await scrollRegion.evaluate(
      (element) => element.scrollLeft,
    );

    expect(
      Math.abs(nextScrollLeft - previousScrollLeft),
      `A ${direction} thumb swipe must move the weekly calendar.`,
    ).toBeGreaterThan(1);
  }

  throw new Error("A calendar slot could not be reached with thumb swipes.");
}

async function expectElementsNotToIntersect(first, second, message) {
  await expect
    .poll(
      async () => {
        const [firstBox, secondBox] = await Promise.all([
          first.boundingBox(),
          second.boundingBox(),
        ]);

        if (!firstBox || !secondBox) return Number.POSITIVE_INFINITY;

        const geometryEpsilon = 0.1;
        const horizontalOverlap = Math.max(
          0,
          Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) -
            Math.max(firstBox.x, secondBox.x) -
            geometryEpsilon,
        );
        const verticalOverlap = Math.max(
          0,
          Math.min(
            firstBox.y + firstBox.height,
            secondBox.y + secondBox.height,
          ) -
            Math.max(firstBox.y, secondBox.y) -
            geometryEpsilon,
        );

        return horizontalOverlap * verticalOverlap;
      },
      { message },
    )
    .toBe(0);
}

test("Classic Editorial and Warm Organic cover the customer portal", async ({
  context,
  page,
}, testInfo) => {
  test.skip(
    !["desktop-1440", "mobile-390"].includes(testInfo.project.name),
    "Representative cross-preset QA runs at one desktop and one mobile size.",
  );

  await installAssetRoutes(page);

  for (const scenario of REPRESENTATIVE_PRESET_SCENARIOS) {
    await context.addCookies([
      {
        name: "shario_language",
        url: scenario.origin,
        value: "EN",
      },
    ]);
    await page.goto(`${scenario.origin}/en/portal?location=atelier-brno`, {
      waitUntil: "domcontentloaded",
    });

    const root = page.locator(`[data-tenant-style="${scenario.id}"]`).first();
    const overview = page.locator("[data-customer-portal-overview]");
    await expect(root).toBeVisible({ timeout: 20_000 });
    await expect(overview).toBeVisible({ timeout: 20_000 });
    const firstVisitWelcome = page.locator(
      "[data-customer-portal-tour-welcome]",
    );
    await expect(firstVisitWelcome).toHaveAttribute("aria-modal", "true");
    await expect(
      firstVisitWelcome.locator('[data-tenant-surface="panel"]'),
    ).toBeVisible();
    await expect(firstVisitWelcome).toHaveAttribute(
      "data-tenant-style",
      scenario.id,
    );
    await firstVisitWelcome
      .locator("[data-customer-portal-tour-dismiss]")
      .click();
    await expect(firstVisitWelcome).toHaveCount(0);

    const logoLink = page
      .locator("[data-customer-portal-header], header")
      .filter({ visible: true })
      .first()
      .getByRole("link", { name: scenario.name, exact: true });
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute("href", scenario.logoRedirectUrl);
    await expect(logoLink).not.toHaveAttribute("target");

    const tokens = await root.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        font: style.getPropertyValue("--tenant-font-display").trim(),
        panelRadius: style.getPropertyValue("--tenant-radius-panel").trim(),
        buttonHeight: style
          .getPropertyValue("--tenant-button-min-height")
          .trim(),
      };
    });
    expect(tokens.font).toMatch(scenario.font);
    expect(tokens.panelRadius).toBe(scenario.panelRadius);
    expect(tokens.buttonHeight).toBe(scenario.buttonHeight);

    const calendarShell = page.locator("[data-customer-calendar-shell]");
    const contextualAction = page
      .locator("[data-customer-portal-action-priority]")
      .first();
    await expect(calendarShell).toBeVisible();
    const portalDisplay = page
      .locator('[data-customer-portal-calendar] [data-tenant-type="display"]')
      .first();
    await expect(portalDisplay).toBeVisible();
    const appliedCalendarStyle = {
      radius: await calendarShell.evaluate(
        (element) => getComputedStyle(element).borderRadius,
      ),
      displayFont: await portalDisplay.evaluate(
        (element) => getComputedStyle(element).fontFamily,
      ),
    };
    expect(appliedCalendarStyle.radius).toBe("8px");
    expect(appliedCalendarStyle.displayFont).toMatch(scenario.font);

    const calendarRoot = calendarShell.locator('[data-calendar-shell="true"]');
    const calendarScrollRegion = calendarShell.locator(
      '[data-calendar-scroll-region="true"]',
    );
    await expect(calendarRoot).toHaveAttribute(
      "data-calendar-page-scroll",
      "true",
    );
    await expect
      .poll(() =>
        calendarScrollRegion.evaluate(
          (element) => getComputedStyle(element).overflowY,
        ),
      )
      .toBe("visible");
    await expect(
      page
        .locator("[data-customer-calendar-studio-selector]")
        .locator("[data-customer-studio-switcher]"),
    ).toHaveAttribute("data-tenant-navigation");
    await expectTouchTarget(
      contextualAction,
      `${scenario.id} portal contextual action`,
    );
    expect(
      await contextualAction.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(48);
    await expectNoHorizontalOverflow(page);

    const accessibility = await new AxeBuilder({ page })
      .include("[data-customer-portal-overview]")
      .analyze();
    expect(formatAxeViolations(accessibility.violations)).toEqual([]);

    const conciergeLauncher = page.locator("[data-concierge-launcher]");
    await conciergeLauncher.click();
    const conciergePanel = page.locator("[data-customer-concierge-panel]");
    await expect(conciergePanel).toBeVisible();
    const conciergeTheme = await conciergePanel.evaluate((element) => {
      const root = element.closest("[data-tenant-style]");
      const send = element.querySelector("[data-customer-concierge-send]");

      return {
        preset: root?.getAttribute("data-tenant-style") || "",
        background: getComputedStyle(element).backgroundColor,
        sendBackground: send ? getComputedStyle(send).backgroundColor : "",
      };
    });
    expect(conciergeTheme.preset).toBe(scenario.id);
    expect(conciergeTheme.background).not.toBe("rgb(255, 255, 255)");
    expect(conciergeTheme.sendBackground).toBe("rgb(39, 72, 216)");

    const conciergeAccessibility = await new AxeBuilder({ page })
      .include("[data-customer-concierge-panel]")
      .analyze();
    expect(formatAxeViolations(conciergeAccessibility.violations)).toEqual([]);
    await conciergePanel.locator("[data-customer-concierge-close]").click();
    await expect(conciergePanel).toBeHidden();

    const screenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: page.viewportSize().width < 1024,
    });
    await testInfo.attach(
      `customer-portal-${scenario.id}-${testInfo.project.name}.png`,
      { body: screenshot, contentType: "image/png" },
    );

    // A tenant destination must not gain the portal locale or studio query.
    const logoDestination = new URL(scenario.logoRedirectUrl, scenario.origin)
      .href;
    await page.route(
      logoDestination,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><html><body><h1>Studio website</h1></body></html>",
        }),
      { times: 1 },
    );
    await logoLink.click();
    await expect(page).toHaveURL(logoDestination);
    await expect(
      page.getByRole("heading", { name: "Studio website" }),
    ).toBeVisible();
  }
});

test("Customer portal visibility blocks disabled pages and preserves hidden navigation destinations", async ({
  page,
}, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name));
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date(CUSTOMER_PORTAL_FIXED_TIME));
  await installAssetRoutes(page);
  const origin = "http://studio-portal-controls.shario.localhost:4310";
  await page.goto(`${origin}/en/portal?location=atelier-brno`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect(page.locator("[data-customer-portal-calendar]")).toBeVisible();
  await expect(
    page.locator("[data-customer-portal-page-unavailable]"),
  ).toHaveCount(0);
  await expect(
    page.locator('header a[href*="/portal/membership"]'),
  ).toHaveCount(0);
  await expect(page.locator('header a[href*="/portal/vouchers"]')).toHaveCount(
    0,
  );
  await expect(page.locator('header a[href*="/portal/knowledge"]')).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: /Open notifications/i }),
  ).toHaveCount(0);
  await expect(page.locator("[data-customer-portal-upcoming]")).toHaveCount(0);

  for (const path of [
    "/portal/membership",
    "/portal?tab=VOUCHERS",
    "/portal?tab=my-bookings",
    "/portal/work",
    "/portal/credits",
    "/portal/notifications",
  ]) {
    await page.goto(
      `${origin}/en${path}${path.includes("?") ? "&" : "?"}location=atelier-brno`,
      { waitUntil: "domcontentloaded", timeout: 90_000 },
    );
    await expect(
      page.locator("[data-customer-portal-page-unavailable]"),
    ).toBeVisible();
    await expect(page.locator("[data-customer-portal-calendar]")).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "Continue in the portal" }),
    ).toHaveAttribute("href", /location=atelier-brno/);
  }
  // Hiding only the header link keeps the underlying page usable by direct URL.
  await page.goto(`${origin}/en/portal/knowledge?location=atelier-brno`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect(
    page.locator("[data-customer-portal-page-unavailable]"),
  ).toHaveCount(0);
  await expect(page.locator("main")).toBeVisible();
});

test("Customer portal visibility handles a disabled landing page and an entirely disabled portal", async ({
  page,
}, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name));
  test.setTimeout(180_000);
  await installAssetRoutes(page);
  await page.goto(
    "http://studio-portal-no-calendar.shario.localhost:4310/en/portal?location=atelier-brno",
    { waitUntil: "domcontentloaded", timeout: 90_000 },
  );
  await expect(page).toHaveURL(/\/portal\/courses\?location=atelier-brno/);
  await expect(
    page.locator("[data-customer-portal-page-unavailable]"),
  ).toHaveCount(0);
  const origin = "http://studio-portal-disabled.shario.localhost:4310";
  await page.goto(`${origin}/en/portal?location=atelier-brno`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect(
    page.locator("[data-customer-portal-page-unavailable]"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Continue in the portal" }),
  ).toHaveCount(0);
  await expect(page.locator("[data-customer-portal-calendar]")).toHaveCount(0);
  await expect(page).toHaveURL(/\/portal\?location=atelier-brno/);
  // Payment recovery remains reachable even if settings changed during payment.
  await page.goto(`${origin}/en/portal/cancel?location=atelier-brno`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect(
    page.locator("[data-customer-portal-page-unavailable]"),
  ).toHaveCount(0);
  await expect(
    page.getByText("Payment cancelled", { exact: true }),
  ).toBeVisible();
});

test("Mobile customer calendar supports body swipes without scroll feedback", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile-"));
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date(CUSTOMER_PORTAL_FIXED_TIME));
  await installAssetRoutes(page);
  await page.goto(`${TENANT_ORIGIN}/en/portal?location=atelier-brno`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const calendar = page.locator('[data-calendar-mobile-week-grid="true"]');
  const body = calendar.locator('[data-calendar-week-scroll="true"]');
  const header = calendar
    .locator('[data-calendar-grid-header="true"]')
    .filter({ visible: true })
    .first();
  const timeRail = calendar.locator('[data-calendar-time-rail="true"]').first();
  await expect(body).toBeVisible();
  // The first-visit welcome is scheduled after session hydration. Wait for it
  // explicitly so a late overlay cannot intercept the native touch gestures.
  const firstVisitWelcome = page.locator("[data-customer-portal-tour-welcome]");
  await expect(
    firstVisitWelcome.locator('[data-tenant-surface="panel"]'),
  ).toBeVisible();
  await firstVisitWelcome
    .locator("[data-customer-portal-tour-dismiss]")
    .click();
  await expect(firstVisitWelcome).toHaveCount(0);
  await expect(
    calendar.locator('[data-calendar-week-day-column="true"]'),
  ).toHaveCount(7);
  await body.scrollIntoViewIfNeeded();
  const { x: railLeft, width: railWidth } = await timeRail.boundingBox();

  // Record actual browser scroll events, including momentum after pointercancel.
  await body.evaluate((element) => {
    element.gestureOffsets = [];
    element.addEventListener("scroll", () => {
      element.gestureOffsets.push(element.scrollLeft);
    });
  });
  for (const direction of ["forward", "backward"]) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const distanceToEdge = await body.evaluate(
        (element, swipeDirection) =>
          swipeDirection === "forward"
            ? element.scrollWidth - element.clientWidth - element.scrollLeft
            : element.scrollLeft,
        direction,
      );
      if (distanceToEdge <= 1) break;
      await body.evaluate((element) => {
        element.gestureOffsets = [element.scrollLeft];
      });
      await swipeCalendarHorizontally(page, body, direction, railWidth);
      // Let native inertia finish before starting the next independent gesture.
      await page.waitForTimeout(500);
      const offsets = await body.evaluate((element) => element.gestureOffsets);
      const sign = direction === "forward" ? 1 : -1;
      const reversals = offsets
        .slice(1)
        .filter((offset, index) => (offset - offsets[index]) * sign < -1);
      expect(
        reversals,
        `Unexpected ${direction} swipe rewind: ${offsets}`,
      ).toEqual([]);
      await expect
        .poll(async () =>
          Math.abs(
            (await body.evaluate((element) => element.scrollLeft)) -
              (await header.evaluate((element) => element.scrollLeft)),
          ),
        )
        .toBeLessThanOrEqual(1);
    }
    const remaining = await body.evaluate(
      (element, swipeDirection) =>
        swipeDirection === "forward"
          ? element.scrollWidth - element.clientWidth - element.scrollLeft
          : element.scrollLeft,
      direction,
    );
    expect(
      remaining,
      `Body swipes must reach the ${direction} end of the week`,
    ).toBeLessThanOrEqual(1);
  }
  expect(
    Math.abs((await timeRail.boundingBox()).x - railLeft),
  ).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-calendar-slot-preview="true"]')).toHaveCount(
    0,
  );

  // The header must still take over immediately after a body swipe.
  await swipeCalendarHorizontally(page, header, "forward", railWidth);
  await expect
    .poll(() => body.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(40);
  await expect
    .poll(async () =>
      Math.abs(
        (await body.evaluate((element) => element.scrollLeft)) -
          (await header.evaluate((element) => element.scrollLeft)),
      ),
    )
    .toBeLessThanOrEqual(1);
});

for (const { copy, locale, oppositeLegacyLanguage } of localeScenarios) {
  test(`${locale.toUpperCase()} premium customer portal is localized, responsive and accessible`, async ({
    context,
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(new Date(CUSTOMER_PORTAL_FIXED_TIME));
    const isMobileProject = testInfo.project.name.startsWith("mobile-");
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await context.addCookies([
      {
        name: "shario_language",
        url: TENANT_ORIGIN,
        value: oppositeLegacyLanguage,
      },
    ]);
    await context.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: TENANT_ORIGIN,
    });

    await installAssetRoutes(page);

    const returnedBrnoAvailabilityResponse = page.waitForResponse((response) =>
      isLocationScopedResponse(
        response,
        "/bookings/mine/availability",
        BRNO_LOCATION_ID,
      ),
    );
    const returnedBrnoUpcomingResponse = page.waitForResponse((response) =>
      isLocationScopedResponse(response, "/bookings/mine", BRNO_LOCATION_ID),
    );
    await page.goto(`${TENANT_ORIGIN}/${locale}/portal?location=atelier-brno`, {
      waitUntil: "domcontentloaded",
    });
    await Promise.all([
      returnedBrnoAvailabilityResponse,
      returnedBrnoUpcomingResponse,
    ]);

    const overview = page.locator("[data-customer-portal-overview]");
    const greeting = page.locator("[data-customer-portal-greeting]");
    const upcoming = page.locator("[data-customer-portal-upcoming]");
    const memberId = page.locator("[data-customer-member-id]");
    const copyMemberId = page.locator("[data-copy-member-id]");
    const calendar = page.locator("[data-customer-portal-calendar]");
    const commandBar = page.locator("[data-calendar-command-bar]");
    const calendarStudioSelector = page.locator(
      "[data-customer-calendar-studio-selector]",
    );
    const conciergeLauncher = page.locator("[data-concierge-launcher]");
    const portalHeader = page
      .locator("[data-customer-portal-header], header")
      .filter({ visible: true })
      .first();
    const studioSwitcher = calendarStudioSelector
      .locator("[data-customer-studio-switcher-trigger]")
      .filter({ visible: true })
      .first();
    const notifications = portalHeader.getByRole("button", {
      name: locale === "cs" ? /Otevřít oznámení/i : /Open notifications/i,
    });

    await expect(overview).toBeVisible({ timeout: 20_000 });
    const firstVisitWelcome = page.locator(
      "[data-customer-portal-tour-welcome]",
    );
    await expect(firstVisitWelcome).toHaveAttribute("aria-modal", "true");
    await expect(
      firstVisitWelcome.locator('[data-tenant-surface="panel"]'),
    ).toBeVisible();
    await firstVisitWelcome
      .locator("[data-customer-portal-tour-dismiss]")
      .click();
    await expect(firstVisitWelcome).toHaveCount(0);
    await expect(greeting).toBeVisible();
    const contextualBookingAction = overview.getByRole("button", {
      name: copy.manageBooking,
    });
    await expect(
      overview.locator("[data-customer-portal-action-priority]"),
      "The hero should contain one booking convenience shortcut only.",
    ).toHaveCount(1);
    await expect(contextualBookingAction).toBeVisible();
    await expectTouchTarget(
      contextualBookingAction,
      "Next visit contextual action",
    );
    await expect(upcoming).toBeVisible();
    await expect(memberId).toContainText(MEMBER_ID);
    await expect(copyMemberId).toHaveCount(1);
    await expect(calendar).toBeVisible();
    await expect(commandBar).toBeVisible();
    await expect(calendarStudioSelector).toBeVisible();
    const legendTrigger = commandBar.locator("[data-calendar-filter-trigger]");
    const calendarLegend = page.locator("[data-customer-calendar-legend]");
    await expectTouchTarget(legendTrigger, "Calendar legend trigger");
    if (isMobileProject) {
      await expect(legendTrigger).toHaveAttribute("aria-expanded", "false");
      await expect(legendTrigger).toHaveAccessibleName(
        locale === "cs" ? /Otevřít legendu/i : /Open legend/i,
      );
      await expect(calendarLegend).toBeHidden();

      await legendTrigger.click();
      await expect(legendTrigger).toHaveAttribute("aria-expanded", "true");
      await expect(calendarLegend).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.keyboard.press("Escape");
      await expect(legendTrigger).toHaveAttribute("aria-expanded", "false");
      await expect(calendarLegend).toBeHidden();
      await expect(legendTrigger).toBeFocused();
    } else {
      await expect(legendTrigger).toHaveAttribute("aria-expanded", "true");
      await expect(legendTrigger).toHaveAccessibleName(
        locale === "cs" ? /Zavřít legendu/i : /Close legend/i,
      );
      await expect(calendarLegend).toBeVisible();
    }
    await expect(conciergeLauncher).toBeVisible();
    await expect(conciergeLauncher).toHaveAttribute(
      "data-tenant-hover",
      "preserve",
    );
    if (!isMobileProject) {
      await expect(
        commandBar.locator('[data-tenant-hover="preserve"]'),
        "Calendar navigation, view, and filter controls should retain their native interaction colours.",
      ).toHaveCount(7);
    }
    await expectElementsNotToIntersect(
      conciergeLauncher,
      calendarStudioSelector,
      "The AI concierge launcher must not cover the studio selector.",
    );
    await expect(portalHeader).toBeVisible();
    await expect(
      portalHeader
        .locator("[data-customer-portal-help-trigger]")
        .filter({ visible: true }),
    ).toHaveAttribute("data-tenant-hover", "preserve");
    await expect(notifications).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(new URL(page.url()).pathname).toBe(`/${locale}/portal`);
    await expect(greeting).toContainText(copy.greeting);
    await expect(greeting).toContainText(/Martin/i);

    const h1 = page.getByRole("heading", { level: 1 });
    await expect(
      h1,
      "The portal must expose one clear page title.",
    ).toHaveCount(1);

    const activeNavigation = portalHeader.locator('[aria-current="page"]');
    await expect(
      activeNavigation,
      "Exactly one portal navigation destination must be active.",
    ).toHaveCount(1);
    await expect(activeNavigation).toHaveText(copy.bookSession);

    await expect(studioSwitcher).toHaveAccessibleName(/Atelier Brno/i);
    await expectTouchTarget(studioSwitcher, "Calendar studio switcher");
    await expect(
      portalHeader.locator("[data-customer-studio-switcher]"),
      "Studio selection must not be duplicated in the portal header.",
    ).toHaveCount(0);

    const headerBrand = portalHeader.locator('span[aria-label="Atelier Nami"]');
    const logo = headerBrand.getByRole("img", {
      name: "Atelier Nami",
      exact: true,
    });
    await expect(headerBrand).toHaveText("");
    await expect(
      portalHeader.getByRole("link", { name: /Atelier Nami/i }),
      "An unconfigured tenant logo must not be a navigation link.",
    ).toHaveCount(0);
    await expect(logo).toBeVisible();
    await expect
      .poll(() => logo.evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0);
    await expect(logo).toHaveAttribute("src", /customer-portal-logo/);
    await expect
      .poll(() => logo.evaluate((image) => image.style.height))
      .toBe("46px");
    const portalUrlBeforeLogoClick = page.url();
    await logo.click();
    await expect(page).toHaveURL(portalUrlBeforeLogoClick);

    const theme = await overview.evaluate((element) => {
      const root = element.closest("[data-tenant-style]");
      const styles = getComputedStyle(element);
      const heading = document.querySelector("h1");
      const contextualAction = element.querySelector(
        "[data-customer-portal-action-priority]",
      );
      const panel = element.querySelector('[data-tenant-surface="panel"]');

      if (!root || !heading || !contextualAction || !panel) return null;

      const headingStyle = getComputedStyle(heading);
      const actionStyle = getComputedStyle(contextualAction);
      const panelStyle = getComputedStyle(panel);

      return {
        accent: styles.getPropertyValue("--tenant-accent").trim(),
        background: styles.getPropertyValue("--tenant-background").trim(),
        secondary: styles.getPropertyValue("--tenant-secondary").trim(),
        preset: root.getAttribute("data-tenant-style"),
        displayFont: headingStyle.fontFamily,
        displayTransform: headingStyle.textTransform,
        displayTracking: Number.parseFloat(headingStyle.letterSpacing),
        buttonMinHeight: styles
          .getPropertyValue("--tenant-button-min-height")
          .trim(),
        actionMinHeight: actionStyle.minHeight,
        actionRadius: actionStyle.borderRadius,
        actionShadow: actionStyle.boxShadow,
        actionTransform: actionStyle.textTransform,
        panelRadius: panelStyle.borderRadius,
        panelShadow: panelStyle.boxShadow,
      };
    });
    expect(theme).not.toBeNull();
    expect(theme).toMatchObject({
      accent: "#2748D8",
      background: "#F5F1EA",
      secondary: "#D9785D",
      preset: "modern-minimal-v1",
      buttonMinHeight: "2.75rem",
      actionMinHeight: "44px",
      actionRadius: "9999px",
      actionShadow: "none",
      actionTransform: "uppercase",
      displayTransform: "none",
      panelRadius: "8px",
      panelShadow: "none",
    });
    expect(theme.displayFont).toMatch(/Switzer/i);
    expect(theme.displayTracking).toBeLessThan(0);

    if (await activeNavigation.isVisible()) {
      const currentNavigationColours = await activeNavigation.evaluate(
        (element) => {
          const probe = document.createElement("span");
          probe.style.color = "var(--tenant-interactive-hover)";
          element.append(probe);
          const expectedColor = getComputedStyle(probe).color;
          probe.remove();

          return {
            color: getComputedStyle(element).color,
            expectedColor,
          };
        },
      );
      expect(currentNavigationColours.color).toBe(
        currentNavigationColours.expectedColor,
      );
    }

    const supportsFinePointer = await page.evaluate(
      () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    );

    if (supportsFinePointer) {
      const readInteractionColors = (target, foregroundToken) =>
        target.evaluate((element, token) => {
          const styles = getComputedStyle(element);
          const probe = document.createElement("span");
          probe.style.color = `var(${token})`;
          element.append(probe);
          const expectedColor = getComputedStyle(probe).color;
          probe.remove();

          return {
            background: styles.backgroundColor,
            color: styles.color,
            expectedColor,
          };
        }, foregroundToken);

      if (await activeNavigation.isVisible()) {
        await activeNavigation.hover();
        await expect
          .poll(async () => {
            const colors = await readInteractionColors(
              activeNavigation,
              "--tenant-interactive-hover",
            );
            return colors.color === colors.expectedColor;
          })
          .toBe(true);
      }

      await expect(contextualBookingAction).toHaveAttribute(
        "data-tenant-hover",
        "preserve",
      );
      await expect(contextualBookingAction).toHaveAttribute(
        "data-tenant-button",
        "text",
      );
      const contextualActionColors = await readInteractionColors(
        contextualBookingAction,
        "--tenant-accent-on-surface",
      );
      expect(contextualActionColors.background).toBe("rgba(0, 0, 0, 0)");
      expect(contextualActionColors.color).toBe(
        contextualActionColors.expectedColor,
      );
      const contextualActionSurface = await contextualBookingAction.evaluate(
        (element) =>
          getComputedStyle(element.closest('[data-tenant-surface="panel"]'))
            .backgroundColor,
      );
      expect(
        await contrastRatio(
          page,
          contextualActionColors.color,
          contextualActionSurface,
        ),
      ).toBeGreaterThanOrEqual(4.5);

      await contextualBookingAction.hover();
      await expect
        .poll(async () => {
          const colors = await readInteractionColors(
            contextualBookingAction,
            "--tenant-accent-on-surface",
          );
          return {
            background: colors.background,
            color: colors.color,
          };
        })
        .toEqual({
          background: contextualActionColors.background,
          color: contextualActionColors.color,
        });

      const notificationTrigger = notifications;
      await expect(notificationTrigger).toBeVisible();
      await expect(notificationTrigger).toHaveAttribute(
        "data-tenant-hover",
        "preserve",
      );
      await notificationTrigger.click();
      const notificationPanel = page.locator(
        "[data-customer-notification-panel]",
      );
      await expect(notificationPanel).toBeVisible();
      await expect(notificationPanel).toHaveAttribute(
        "data-tenant-style",
        "modern-minimal-v1",
      );

      const unreadNotificationLink = notificationPanel
        .locator(
          '[data-customer-notification][data-notification-read="false"] a',
        )
        .first();
      const notificationTitle = unreadNotificationLink.locator(
        "[data-tenant-interactive-label]",
      );
      await expect(unreadNotificationLink).toBeVisible();
      await expect(notificationTitle).toBeVisible();
      await unreadNotificationLink.hover();
      await expect
        .poll(async () => {
          const colors = await readInteractionColors(
            notificationTitle,
            "--tenant-portal-profile-secondary-on-surface",
          );
          return colors.color === colors.expectedColor;
        })
        .toBe(true);

      const notificationRowColors = await unreadNotificationLink.evaluate(
        async (element) => {
          const row = element.closest("[data-customer-notification]");
          await Promise.all(
            row
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished.catch(() => {})),
          );
          return {
            background: getComputedStyle(row).backgroundColor,
            color: getComputedStyle(
              element.querySelector("[data-tenant-interactive-label]"),
            ).color,
          };
        },
      );
      expect(
        await contrastRatio(
          page,
          notificationRowColors.color,
          notificationRowColors.background,
        ),
      ).toBeGreaterThanOrEqual(4.5);

      const notificationButton = notificationPanel
        .locator("button:not(:disabled)")
        .first();
      await expect(notificationButton).toBeVisible();
      await notificationButton.hover();
      await expect
        .poll(async () => {
          const colors = await readInteractionColors(
            notificationButton,
            "--tenant-interactive-hover-foreground",
          );
          return {
            background: colors.background,
            color: colors.color,
            expectedColor: colors.expectedColor,
          };
        })
        .toEqual({
          background: "rgb(217, 120, 93)",
          color: "rgb(17, 17, 15)",
          expectedColor: "rgb(17, 17, 15)",
        });

      await page.keyboard.press("Escape");
      await expect(notificationPanel).toBeHidden();
    }

    await expect(upcoming).toContainText(copy.brnoBookingTitle);
    await expect(upcoming).toContainText(/Atelier Brno/i);

    await expect
      .poll(() => new URL(page.url()).searchParams.get("tab"))
      .toBeNull();
    await expect(calendar).toBeVisible();

    await expect(studioSwitcher).toHaveAccessibleName(/Atelier Brno/i);
    await expectTouchTarget(studioSwitcher, "Studio switcher");

    await studioSwitcher.click();

    await expect(studioSwitcher).toHaveAttribute("aria-expanded", "true");
    const lastStudioOption = page.getByRole("option", {
      name: /Atelier Prague/i,
    });
    await expect(
      lastStudioOption,
      "The complete studio switcher must escape the dashboard card without clipping.",
    ).toBeVisible();
    await expectTouchTarget(lastStudioOption, "Prague studio option");

    const pragueAvailabilityResponse = page.waitForResponse((response) =>
      isLocationScopedResponse(
        response,
        "/bookings/mine/availability",
        PRAGUE_LOCATION_ID,
      ),
    );
    const pragueUpcomingResponse = page.waitForResponse((response) =>
      isLocationScopedResponse(response, "/bookings/mine", PRAGUE_LOCATION_ID),
    );

    if (testInfo.project.name.startsWith("mobile-")) {
      await lastStudioOption.click();
    } else {
      await page.keyboard.press("End");
      await page.keyboard.press("Enter");
    }

    await Promise.all([pragueAvailabilityResponse, pragueUpcomingResponse]);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("location"))
      .toBe("atelier-prague");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("tab"))
      .toBeNull();
    await expect(calendar).toBeVisible();

    const pragueStudioSwitcher = calendarStudioSelector
      .locator("[data-customer-studio-switcher-trigger]")
      .filter({ visible: true })
      .first();
    await expect(pragueStudioSwitcher).toBeVisible();
    await expect(pragueStudioSwitcher).toHaveAccessibleName(/Atelier Prague/i);
    await expect(pragueStudioSwitcher).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    const selectedStudioName = pragueStudioSwitcher.locator(
      "[data-customer-selected-studio]",
    );
    const selectedStudioNameLayout = await selectedStudioName.evaluate(
      (element) => ({
        clientHeight: element.clientHeight,
        lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
        title: element.getAttribute("title"),
      }),
    );
    expect(selectedStudioNameLayout.title).toContain("Atelier Prague");
    expect(selectedStudioNameLayout.clientHeight).toBeLessThanOrEqual(
      selectedStudioNameLayout.lineHeight + 2,
    );
    await expect(upcoming).toContainText(copy.pragueBookingTitle);
    await expect(upcoming).toContainText(/Atelier Prague/i);
    await expect(upcoming).not.toContainText(copy.brnoBookingTitle);

    for (const [name, target] of [
      ["Notification action", notifications],
      ["Copy member ID action", copyMemberId],
      ["AI concierge launcher", conciergeLauncher],
    ]) {
      await expectTouchTarget(target, name);
    }

    const visibleMobileMenuTrigger = portalHeader
      .locator('button[aria-controls="mobile-menu"]')
      .filter({ visible: true });
    if ((await visibleMobileMenuTrigger.count()) > 0) {
      await expectTouchTarget(
        visibleMobileMenuTrigger.first(),
        "Mobile navigation trigger",
      );
    }

    await copyMemberId.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" }),
    );
    await expect(copyMemberId).toBeInViewport();
    await copyMemberId.click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(MEMBER_ID);

    await page.evaluate(async () => {
      await document.fonts?.ready;
    });
    await expect(memberId).toHaveAttribute("title", `#${MEMBER_ID}`);
    const accountStats = await overview
      .locator("[data-customer-portal-account-stat]")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const bounds = element.getBoundingClientRect();
          const value = element.querySelectorAll("p")[1];
          return {
            width: bounds.width,
            top: bounds.top,
            clientWidth: value.clientWidth,
            scrollWidth: value.scrollWidth,
            clientHeight: value.clientHeight,
            scrollHeight: value.scrollHeight,
          };
        }),
      );
    expect(accountStats).toHaveLength(2);
    expect(
      Math.abs(accountStats[0].width - accountStats[1].width),
      "Member ID and Credits must have equal column widths.",
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(accountStats[0].top - accountStats[1].top),
      "Member ID and Credits must remain in the same row on phones too.",
    ).toBeLessThanOrEqual(1);
    for (const value of accountStats) {
      expect(
        value.scrollWidth,
        "Account values must not be truncated.",
      ).toBeLessThanOrEqual(value.clientWidth + 1);
      expect(
        value.scrollHeight,
        "Wrapped account values must remain fully visible.",
      ).toBeLessThanOrEqual(value.clientHeight + 1);
    }
    await expectNoHorizontalOverflow(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    if (SHORT_LAPTOP_PROJECTS.has(testInfo.project.name)) {
      const desktopNavigation = portalHeader.locator(
        "[data-customer-portal-navigation]",
      );
      const desktopActions = portalHeader.locator(
        "[data-customer-portal-actions]",
      );
      await expect(desktopNavigation).toBeVisible();
      await expect(desktopActions).toBeVisible();
      await expectElementsNotToIntersect(
        pragueStudioSwitcher,
        desktopNavigation,
        "A long studio name must stay clear of localized navigation.",
      );
      await expectElementsNotToIntersect(
        desktopNavigation,
        desktopActions,
        "Localized navigation must stay clear of header actions.",
      );

      await expect(
        commandBar,
        "The calendar toolbar must be visible in the short-laptop fold.",
      ).toBeInViewport({ ratio: 1 });

      const overviewBox = await overview.boundingBox();
      const calendarGrid = calendar
        .locator('[data-calendar-desktop-grid="true"]')
        .first();
      const [calendarBox, commandBarBox, calendarGridBox] = await Promise.all([
        calendar.boundingBox(),
        commandBar.boundingBox(),
        calendarGrid.boundingBox(),
      ]);

      expect(overviewBox).not.toBeNull();
      expect(calendarBox).not.toBeNull();
      expect(commandBarBox).not.toBeNull();
      expect(calendarGridBox).not.toBeNull();
      expect(
        overviewBox.height,
        "The complete overview must stay compact on a short laptop.",
      ).toBeLessThanOrEqual(290);
      expect(calendarBox.y).toBeLessThan(viewport.height - 44);
      expect(commandBarBox.y + commandBarBox.height).toBeLessThanOrEqual(
        viewport.height,
      );
      expect(
        calendarGridBox.y,
        "Actual calendar availability must begin inside the short-laptop fold.",
      ).toBeLessThan(viewport.height - 80);
    }

    const initialScreenshot = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      fullPage: false,
    });
    await testInfo.attach(
      `customer-portal-${locale}-${testInfo.project.name}.png`,
      { body: initialScreenshot, contentType: "image/png" },
    );

    if (viewport.width <= 639) {
      const monthView = commandBar.getByRole("button", { name: copy.month });
      const weekView = commandBar.getByRole("button", { name: copy.week });
      const dayView = commandBar.getByRole("button", { name: copy.day });
      for (const [viewControl, label] of [
        [monthView, "Month"],
        [weekView, "Week"],
        [dayView, "Day"],
      ]) {
        await expect(viewControl).toBeVisible();
        await expectTouchTarget(viewControl, `${label} calendar view`);
      }
      await expect(weekView).toHaveAttribute("aria-pressed", "true");

      await dayView.click();
      await expect(dayView).toHaveAttribute("aria-pressed", "true");
      await expect(
        calendar.locator('[data-calendar-mobile-day-grid="true"]'),
      ).toBeVisible();
      await expect(
        calendar.locator("[data-calendar-mobile-agenda]"),
      ).toBeHidden();

      await monthView.click();
      await expect(monthView).toHaveAttribute("aria-pressed", "true");
      await expect(
        calendar.locator('[data-calendar-month-grid="true"]'),
      ).toBeVisible();

      await weekView.click();
      await expect(weekView).toHaveAttribute("aria-pressed", "true");

      const mobileWeekGrid = calendar.locator(
        '[data-calendar-mobile-week-grid="true"]',
      );
      const weekScroll = mobileWeekGrid.locator(
        '[data-calendar-week-scroll="true"]',
      );
      const timeRail = mobileWeekGrid
        .locator('[data-calendar-time-rail="true"]')
        .first();
      const dayColumns = mobileWeekGrid.locator(
        '[data-calendar-week-day-column="true"]',
      );
      const gridHeader = mobileWeekGrid
        .locator('[data-calendar-grid-header="true"]')
        .filter({ visible: true })
        .first();
      const mobileAgenda = calendar.locator("[data-calendar-mobile-agenda]");

      await expect(mobileWeekGrid).toBeVisible();
      await expect(weekScroll).toBeVisible();
      await expect(gridHeader).toBeVisible();
      await expect(timeRail).toBeVisible();
      await expect(dayColumns).toHaveCount(7);
      await expect(gridHeader.locator("[data-calendar-day-state]")).toHaveCount(
        7,
      );
      await expect(
        mobileAgenda,
        "Phones must retain the weekly time grid rather than switching to an agenda.",
      ).toBeHidden();

      const gridMetrics = await weekScroll.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          clientWidth: element.clientWidth,
          overflowX: styles.overflowX,
          scrollWidth: element.scrollWidth,
        };
      });
      expect(
        gridMetrics.scrollWidth,
        "The seven-day grid should own its horizontal overflow.",
      ).toBeGreaterThan(gridMetrics.clientWidth);
      expect(gridMetrics.overflowX).toMatch(/auto|scroll/);

      const [timeRailStyles, headerStyles, firstDayBox, timeRailBox] =
        await Promise.all([
          timeRail.evaluate((element) => {
            const styles = getComputedStyle(element);
            return { left: styles.left, position: styles.position };
          }),
          gridHeader.evaluate((element) => ({
            position: getComputedStyle(element).position,
          })),
          dayColumns.first().boundingBox(),
          timeRail.boundingBox(),
        ]);
      expect(timeRailStyles.position).toBe("sticky");
      expect(Number.parseFloat(timeRailStyles.left) || 0).toBe(0);
      expect(headerStyles.position).toBe("sticky");
      expect(firstDayBox).not.toBeNull();
      expect(timeRailBox).not.toBeNull();
      expect(
        firstDayBox.width,
        "Each mobile day column must remain wide enough to scan and select.",
      ).toBeGreaterThanOrEqual(112);
      const visibleDayCapacity =
        (gridMetrics.clientWidth - timeRailBox.width) / firstDayBox.width;
      expect(
        visibleDayCapacity,
        "The phone grid should expose roughly two readable day columns at once.",
      ).toBeGreaterThanOrEqual(1.6);
      expect(visibleDayCapacity).toBeLessThanOrEqual(2.75);
      await expectNoHorizontalOverflow(page);

      if (viewport.width <= 320) {
        const initialHorizontalState = await weekScroll.evaluate((element) => ({
          left: element.scrollLeft,
          max: element.scrollWidth - element.clientWidth,
        }));
        const swipeDirection =
          initialHorizontalState.left < initialHorizontalState.max / 2
            ? "forward"
            : "backward";

        await gridHeader.scrollIntoViewIfNeeded();
        await swipeCalendarHorizontally(page, gridHeader, swipeDirection);
        // Native momentum outlives touchend. Observe both surfaces at rest so
        // the next gesture's baseline excludes the preceding horizontal fling.
        let previousOffsets;
        let stableOffsetSamples = 0;
        await expect
          .poll(
            async () => {
              const offsets = await Promise.all([
                weekScroll.evaluate((element) => element.scrollLeft),
                gridHeader.evaluate((element) => element.scrollLeft),
              ]);
              stableOffsetSamples =
                previousOffsets &&
                offsets.every(
                  (offset, index) =>
                    Math.abs(offset - previousOffsets[index]) <= 0.5,
                )
                  ? stableOffsetSamples + 1
                  : 0;
              previousOffsets = offsets;
              return stableOffsetSamples;
            },
            {
              message:
                "The header fling must settle before measuring a separate vertical swipe.",
              timeout: 5000,
              intervals: [50],
            },
          )
          .toBeGreaterThanOrEqual(4);
        await expect
          .poll(async () => {
            const nextScrollLeft = await weekScroll.evaluate(
              (element) => element.scrollLeft,
            );
            return Math.abs(nextScrollLeft - initialHorizontalState.left);
          })
          .toBeGreaterThan(40);

        const synchronizedScrollOffsets = await Promise.all([
          weekScroll.evaluate((element) => element.scrollLeft),
          gridHeader.evaluate((element) => element.scrollLeft),
        ]);
        expect(
          Math.abs(synchronizedScrollOffsets[0] - synchronizedScrollOffsets[1]),
          "A weekday-header swipe must keep the header and time grid on the same horizontal offset.",
        ).toBeLessThanOrEqual(1);

        const [scrollBox, stickyRailBox, stickyHeaderBox] = await Promise.all([
          weekScroll.boundingBox(),
          timeRail.boundingBox(),
          gridHeader.boundingBox(),
        ]);
        expect(scrollBox).not.toBeNull();
        expect(stickyRailBox).not.toBeNull();
        expect(stickyHeaderBox).not.toBeNull();
        expect(
          Math.abs(stickyRailBox.x - scrollBox.x),
          "The time rail must remain pinned while the week scrolls horizontally.",
        ).toBeLessThanOrEqual(1);
        await expect
          .poll(
            async () => {
              const [headerDayBox, gridDayBox] = await Promise.all([
                gridHeader
                  .locator("[data-calendar-day-state]")
                  .last()
                  .boundingBox(),
                dayColumns.last().boundingBox(),
              ]);
              if (!headerDayBox || !gridDayBox) {
                return Number.POSITIVE_INFINITY;
              }
              return Math.abs(headerDayBox.x - gridDayBox.x);
            },
            {
              message:
                "The sticky weekday header must remain aligned with the horizontally scrolled day columns.",
            },
          )
          .toBeLessThanOrEqual(1);

        const horizontalOffsetBeforeVerticalGesture = await weekScroll.evaluate(
          (element) => element.scrollLeft,
        );
        const pageScrollBeforeVerticalGesture = await page.evaluate(
          () => window.scrollY,
        );
        const visibleGridTop = Math.max(
          stickyHeaderBox.y + stickyHeaderBox.height + 20,
          scrollBox.y + 20,
          20,
        );
        const visibleGridBottom = Math.min(
          viewport.height - 24,
          scrollBox.y + scrollBox.height - 20,
        );
        expect(
          visibleGridBottom - visibleGridTop,
          "The mobile time grid must expose enough vertical room for a thumb swipe.",
        ).toBeGreaterThan(100);
        const verticalGestureX = Math.max(
          12,
          Math.min(
            viewport.width - 12,
            stickyRailBox.x + stickyRailBox.width / 2,
          ),
        );
        const verticalGesture = {
          from: { x: verticalGestureX, y: visibleGridBottom - 8 },
          to: { x: verticalGestureX, y: visibleGridBottom - 108 },
        };
        expect(
          await timeRail.evaluate(
            (element, gesture) =>
              [gesture.from, gesture.to].every(({ x, y }) =>
                element.contains(element.ownerDocument.elementFromPoint(x, y)),
              ),
            verticalGesture,
          ),
          "The vertical swipe must land on the visible pinned time rail.",
        ).toBe(true);
        await dispatchTouchGesture(page, verticalGesture);

        const horizontalOffsetAfterVerticalGesture = await weekScroll.evaluate(
          (element) => element.scrollLeft,
        );
        expect(
          Math.abs(
            horizontalOffsetAfterVerticalGesture -
              horizontalOffsetBeforeVerticalGesture,
          ),
          "A vertical thumb swipe must not accidentally pan the week sideways.",
        ).toBeLessThanOrEqual(8);
        await expect
          .poll(() => page.evaluate(() => window.scrollY))
          .toBeGreaterThan(pageScrollBeforeVerticalGesture + 20);

        const commandBarBox = await commandBar.boundingBox();
        expect(commandBarBox).not.toBeNull();
        expect(
          commandBarBox.height,
          "The 320px calendar toolbar must stay within two control rows.",
        ).toBeLessThanOrEqual(120);
      }

      const fullPageScreenshot = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        fullPage: true,
      });
      await testInfo.attach(
        `customer-portal-${locale}-${testInfo.project.name}-full.png`,
        { body: fullPageScreenshot, contentType: "image/png" },
      );
    }

    await commandBar.scrollIntoViewIfNeeded();
    await expect(commandBar).toBeInViewport();
    await expect(conciergeLauncher).toHaveAttribute(
      "data-concierge-compact",
      "true",
    );
    await expectElementsNotToIntersect(
      conciergeLauncher,
      commandBar,
      "The AI concierge launcher must not cover the calendar command bar.",
    );
    await expectElementsNotToIntersect(
      conciergeLauncher,
      calendarStudioSelector,
      "The AI concierge launcher must stay clear of the studio selector after scrolling.",
    );
    await expectNoHorizontalOverflow(page);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      formatAxeViolations(accessibility.violations),
      "The premium customer portal must have no WCAG A/AA Axe violations.",
    ).toEqual([]);

    if (BOOKING_DRAWER_PROJECTS.has(testInfo.project.name)) {
      await calendar.scrollIntoViewIfNeeded();

      if (testInfo.project.name === "mobile-320") {
        const mobileWeekGrid = calendar.locator(
          '[data-calendar-mobile-week-grid="true"]',
        );
        const weekScroll = mobileWeekGrid.locator(
          '[data-calendar-week-scroll="true"]',
        );
        const timeRail = mobileWeekGrid
          .locator('[data-calendar-time-rail="true"]')
          .first();
        const dayColumns = mobileWeekGrid.locator(
          '[data-calendar-week-day-column="true"]',
        );
        const availableDay = dayColumns
          .filter({
            has: page.locator('[data-calendar-slot-bookable="true"]'),
          })
          .last();
        const availableSlotSurface = availableDay
          .locator('[data-calendar-slot-bookable="true"]')
          .first();

        await expect(availableSlotSurface).toHaveAttribute(
          "data-calendar-slot-state",
          /available|limited/,
        );
        const timeRailBox = await timeRail.boundingBox();
        expect(timeRailBox).not.toBeNull();
        await swipeTargetIntoHorizontalView({
          page,
          scrollRegion: weekScroll,
          gestureSurface: weekScroll,
          target: availableSlotSurface,
          pinnedWidth: timeRailBox.width,
        });
        await expect
          .poll(() => weekScroll.evaluate((element) => element.scrollLeft))
          .toBeGreaterThan(0);
        // Horizontal swipe helpers reveal their scroll surface vertically too.
        // Place the slot below sticky navigation only after those swipes.
        await availableSlotSurface.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const targetY = Math.min(window.innerHeight * 0.52, 360);
          window.scrollBy(0, box.top + box.height / 2 - targetY);
        });
        let previousTapCenter;
        let stableTapSamples = 0;
        await expect
          .poll(
            async () => {
              const center = await availableSlotSurface.evaluate((element) => {
                const box = element.getBoundingClientRect();
                const x = box.x + box.width / 2;
                const y = box.y + box.height / 2;
                return {
                  x,
                  y,
                  hitsSlot: element.contains(document.elementFromPoint(x, y)),
                };
              });
              stableTapSamples =
                center.hitsSlot &&
                previousTapCenter &&
                Math.abs(center.x - previousTapCenter.x) <= 0.5 &&
                Math.abs(center.y - previousTapCenter.y) <= 0.5
                  ? stableTapSamples + 1
                  : 0;
              previousTapCenter = center;
              return stableTapSamples;
            },
            {
              message:
                "The slot must be stationary and receive the tap below sticky navigation.",
              timeout: 5000,
              intervals: [50],
            },
          )
          .toBeGreaterThanOrEqual(4);
        const availableSlotBox = await availableSlotSurface.boundingBox();
        expect(availableSlotBox).not.toBeNull();
        await page.touchscreen.tap(
          availableSlotBox.x + availableSlotBox.width / 2,
          availableSlotBox.y + availableSlotBox.height / 2,
        );

        const slotPreview = mobileWeekGrid.locator(
          '[data-calendar-slot-preview="true"]',
        );
        const selectionSummary = calendar.locator(
          "[data-calendar-mobile-selection-summary]",
        );
        const continueBooking = selectionSummary.locator(
          "[data-calendar-mobile-continue]",
        );
        await expect(slotPreview).toBeVisible();
        await expect(slotPreview).toHaveAttribute(
          "data-calendar-slot-state",
          /available|limited/,
        );
        const confirmSelectedSlot = slotPreview.locator(
          '[data-calendar-slot-confirm="true"]',
        );
        await expect(
          confirmSelectedSlot,
          "The selected mobile slot must expose its inline booking action.",
        ).toBeVisible();
        await expect(confirmSelectedSlot).toBeEnabled();
        await expect(selectionSummary).toBeVisible();
        await expect(conciergeLauncher).toBeHidden();
        await expectTouchTarget(
          continueBooking,
          "Continue with selected mobile time",
        );
        const resizeStart = slotPreview.locator(
          '[data-calendar-slot-resize="start"]',
        );
        const resizeEnd = slotPreview.locator(
          '[data-calendar-slot-resize="end"]',
        );
        await expectTouchTarget(resizeStart, "Selected time start handle");
        await expectTouchTarget(resizeEnd, "Selected time end handle");

        const initialSelection = {
          box: await slotPreview.boundingBox(),
          label: await slotPreview.getAttribute("aria-label"),
        };
        expect(initialSelection.box).not.toBeNull();
        expect(initialSelection.label).toBeTruthy();

        const initialEndHandleBox = await resizeEnd.boundingBox();
        expect(initialEndHandleBox).not.toBeNull();
        await dispatchTouchGesture(page, {
          from: {
            x: initialEndHandleBox.x + initialEndHandleBox.width / 2,
            y: initialEndHandleBox.y + initialEndHandleBox.height / 2,
          },
          to: {
            x: initialEndHandleBox.x + initialEndHandleBox.width / 2,
            y: initialEndHandleBox.y + initialEndHandleBox.height / 2 + 42,
          },
        });
        await expect(slotPreview).toHaveAttribute(
          "data-calendar-slot-phase",
          "ready",
        );
        await expect
          .poll(async () => (await slotPreview.boundingBox())?.height || 0)
          .toBeGreaterThan(initialSelection.box.height + 20);
        await expect(slotPreview).not.toHaveAttribute(
          "aria-label",
          initialSelection.label,
        );

        const expandedEndHandleBox = await resizeEnd.boundingBox();
        expect(expandedEndHandleBox).not.toBeNull();
        await dispatchTouchGesture(page, {
          from: {
            x: expandedEndHandleBox.x + expandedEndHandleBox.width / 2,
            y: expandedEndHandleBox.y + expandedEndHandleBox.height / 2,
          },
          to: {
            x: expandedEndHandleBox.x + expandedEndHandleBox.width / 2,
            y: expandedEndHandleBox.y + expandedEndHandleBox.height / 2 - 42,
          },
        });
        await expect
          .poll(async () => {
            const restoredBox = await slotPreview.boundingBox();
            return restoredBox
              ? Math.abs(restoredBox.height - initialSelection.box.height)
              : Number.POSITIVE_INFINITY;
          })
          .toBeLessThanOrEqual(1);
        await expect(slotPreview).toHaveAttribute(
          "aria-label",
          initialSelection.label,
        );

        await expect(
          slotPreview,
          "A selected mobile slot must expose its body as a movable touch target.",
        ).toHaveAttribute("tabindex", "0");
        const getSelectionBodyPoint = async () => {
          const point = await slotPreview.evaluate((element) => {
            const box = element.getBoundingClientRect();
            // Boundary resize handles can cover the selection's center.
            // Find exposed body space so this gesture exercises moving.
            for (const fraction of [0.25, 0.75, 0.5]) {
              const x = Math.round(box.x + box.width * fraction);
              const y = Math.round(box.y + box.height / 2);
              const hit = document.elementFromPoint(x, y);
              if (
                element.contains(hit) &&
                !hit?.closest("[data-calendar-slot-control]")
              ) {
                return { x, y };
              }
            }
            return null;
          });
          expect(
            point,
            "The move gesture must hit the selected slot body outside its controls.",
          ).not.toBeNull();
          return point;
        };
        const selectionBeforeMove = await slotPreview.boundingBox();
        expect(selectionBeforeMove).not.toBeNull();
        const pageScrollBeforeMove = await page.evaluate(() => window.scrollY);
        const moveStart = await getSelectionBodyPoint();
        await dispatchTouchGesture(page, {
          from: moveStart,
          to: { x: moveStart.x, y: moveStart.y + 42 },
        });
        await expect(slotPreview).toHaveAttribute(
          "data-calendar-slot-phase",
          "ready",
        );
        await expect
          .poll(async () => {
            const movedBox = await slotPreview.boundingBox();
            return movedBox ? movedBox.y - selectionBeforeMove.y : 0;
          })
          .toBeGreaterThan(20);
        await expect(slotPreview).not.toHaveAttribute(
          "aria-label",
          initialSelection.label,
        );
        expect(
          Math.abs(
            (await page.evaluate(() => window.scrollY)) - pageScrollBeforeMove,
          ),
          "Dragging a selected slot must move the draft rather than the page.",
        ).toBeLessThanOrEqual(1);

        const movedSelectionBox = await slotPreview.boundingBox();
        expect(movedSelectionBox).not.toBeNull();
        const restoreStart = await getSelectionBodyPoint();
        await dispatchTouchGesture(page, {
          from: restoreStart,
          to: { x: restoreStart.x, y: restoreStart.y - 42 },
        });
        await expect
          .poll(async () => {
            const restoredBox = await slotPreview.boundingBox();
            return restoredBox
              ? Math.abs(restoredBox.y - selectionBeforeMove.y)
              : Number.POSITIVE_INFINITY;
          })
          .toBeLessThanOrEqual(1);
        await expect(slotPreview).toHaveAttribute(
          "aria-label",
          initialSelection.label,
        );
        await expect(slotPreview).toHaveAttribute(
          "data-calendar-slot-bookable",
          "true",
        );
        await expect(
          page.locator('[data-dialog-layout="drawer"]'),
        ).toBeHidden();
        await expectNoHorizontalOverflow(page);
        const selectedSlotAccessibility = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          formatAxeViolations(selectedSlotAccessibility.violations),
          "The selected mobile booking summary must remain WCAG A/AA clean.",
        ).toEqual([]);
        await confirmSelectedSlot.tap();
      } else {
        const lastAvailableDay = calendar
          .locator(
            '[data-calendar-desktop-grid="true"] [role="group"][tabindex="0"]',
          )
          .last();
        await lastAvailableDay.focus();
        await page.keyboard.press("Enter");
        const confirmSlot = calendar.locator(
          '[data-calendar-slot-confirm="true"]',
        );
        await expect(confirmSlot).toBeVisible();
        await confirmSlot.click();
      }

      const drawer = page.locator('[data-dialog-layout="drawer"]');
      await expect(drawer).toBeVisible();
      await expect(
        drawer.getByRole("heading", { name: copy.drawerTitle }),
      ).toBeVisible();

      const sessionType = drawer.getByRole("combobox", {
        name: copy.sessionType,
      });
      await expect(sessionType).toBeVisible();
      await expect(sessionType.locator("option").nth(0)).toHaveText(
        copy.primaryProduct,
      );
      await expect(sessionType.locator("option").nth(1)).toHaveText(
        copy.secondaryProduct,
      );
      await sessionType.selectOption({ label: copy.secondaryProduct });
      const guests = drawer.getByRole("combobox", { name: copy.guests });
      await expect(guests).toBeVisible();
      await guests.selectOption("2");
      await expect(guests).toHaveValue("2");

      const bookingScrollRegion = drawer.locator(
        "[data-booking-scroll-region]",
      );
      const priceBreakdown = bookingScrollRegion.locator(
        "[data-booking-price-breakdown]",
      );
      await expect(priceBreakdown).toBeVisible();
      await expect(
        drawer.locator("[data-booking-price-total]"),
      ).not.toContainText(DECIMAL_CURRENCY_FRACTION_PATTERN);

      const tenantInteractiveColors = await drawer.evaluate((element) => {
        const selectedDuration = element.querySelector(
          '[data-booking-duration-selected="true"]',
        );
        const submit = element.querySelector("[data-booking-submit]");

        return {
          selectedDuration: selectedDuration
            ? getComputedStyle(selectedDuration).backgroundColor
            : null,
          submit: submit ? getComputedStyle(submit).backgroundColor : null,
        };
      });
      expect(tenantInteractiveColors).toEqual({
        selectedDuration: "rgb(39, 72, 216)",
        submit: "rgb(39, 72, 216)",
      });
      await expect(
        drawer.locator('[data-booking-duration-selected="true"]'),
      ).toHaveAttribute("data-tenant-hover", "preserve");

      await expectElementsNotToIntersect(
        bookingScrollRegion,
        drawer.locator("[data-booking-summary-footer]"),
        "Booking controls must remain clear of the summary footer.",
      );
      const availabilityStatus = bookingScrollRegion.locator(
        "[data-booking-availability-state]",
      );
      await availabilityStatus.scrollIntoViewIfNeeded();
      await expect(availabilityStatus).toBeInViewport({ ratio: 1 });
      await expectElementsNotToIntersect(
        availabilityStatus,
        drawer.locator("[data-booking-summary-footer]"),
        "The final booking guidance must remain reachable above the sticky footer.",
      );
      const compactDrawerLayout = await drawer.evaluate((element) => {
        const scrollRegion = element.querySelector(
          "[data-booking-scroll-region]",
        );
        const footer = element.querySelector("[data-booking-summary-footer]");

        return {
          footerHeight: footer?.getBoundingClientRect().height || 0,
          scrollRegionHeight: scrollRegion?.getBoundingClientRect().height || 0,
        };
      });
      expect(
        compactDrawerLayout.footerHeight,
        "The sticky booking footer must stay compact on short screens.",
      ).toBeLessThanOrEqual(170);
      expect(
        compactDrawerLayout.scrollRegionHeight,
        "A short screen must preserve a useful scrollable booking form.",
      ).toBeGreaterThanOrEqual(260);
      const drawerGeometry = await drawer.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(drawerGeometry.scrollWidth).toBeLessThanOrEqual(
        drawerGeometry.clientWidth + 1,
      );

      const drawerAccessibility = await new AxeBuilder({ page })
        .include('[data-dialog-layout="drawer"]')
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        formatAxeViolations(drawerAccessibility.violations),
        "The booking drawer must have no WCAG A/AA Axe violations.",
      ).toEqual([]);

      const drawerScreenshot = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        fullPage: false,
      });
      await testInfo.attach(
        `customer-booking-drawer-${locale}-${testInfo.project.name}.png`,
        { body: drawerScreenshot, contentType: "image/png" },
      );

      await drawer.locator("[data-booking-submit]").click();
      await expect(drawer).toBeHidden();

      const cartModal = page.locator("[data-cart-modal]");
      await expect(cartModal).toBeVisible();
      await expect(
        cartModal.getByRole("heading", { name: copy.cartTitle }),
      ).toBeVisible();
      await expect(cartModal.locator("[data-cart-item]")).toHaveCount(1);
      await expect(cartModal.locator("[data-cart-total]")).toBeVisible();
      await expect(
        cartModal.locator(
          'input[name="cart-payment-option"][value="card:default"]',
        ),
      ).toBeChecked();

      const cartScrollRegion = cartModal.locator("[data-cart-scroll-region]");
      const cartSummary = cartModal.locator("[data-cart-summary]");
      await cartSummary.scrollIntoViewIfNeeded();
      await expect(cartSummary).toBeInViewport();
      const cartCheckoutFooter = cartModal.locator(
        "[data-cart-checkout-footer]",
      );
      await expect(cartCheckoutFooter).toBeVisible();
      await expect(
        cartModal.locator('[data-cart-checkout="persistent"]'),
      ).toBeVisible();
      await expect(
        cartModal.getByRole("button", { name: copy.checkout }),
      ).toBeVisible();
      await expectElementsNotToIntersect(
        cartScrollRegion,
        cartCheckoutFooter,
        "Cart content must remain clear of the persistent checkout footer.",
      );
      const creditBalance = cartModal.locator("[data-cart-credit-compact]");
      await expect(creditBalance).toBeVisible();
      const compactCartLayout = await cartModal.evaluate((element) => {
        const credit = element.querySelector("[data-cart-credit-compact]");
        const scrollRegion = element.querySelector("[data-cart-scroll-region]");

        return {
          creditHeight: credit?.getBoundingClientRect().height || 0,
          scrollRegionHeight: scrollRegion?.getBoundingClientRect().height || 0,
        };
      });
      expect(compactCartLayout.creditHeight).toBeLessThanOrEqual(80);
      await expectCompactViewportBounds(
        page,
        cartCheckoutFooter,
        "Cart checkout footer",
      );
      expect(compactCartLayout.scrollRegionHeight).toBeGreaterThanOrEqual(300);
      await expect(cartModal.locator("[data-cart-total]")).not.toContainText(
        DECIMAL_CURRENCY_FRACTION_PATTERN,
      );
      await expect(creditBalance).toContainText(
        /Credit balance|Zůstatek kreditů/i,
      );
      await expect(creditBalance).toContainText("400");
      await expect(creditBalance).not.toContainText(
        DECIMAL_CURRENCY_FRACTION_PATTERN,
      );
      const paymentOptions = cartModal.locator("[data-cart-payment-options]");
      await expect(paymentOptions).toBeVisible();
      const studioCredits = paymentOptions.locator(
        'input[name="cart-payment-option"][value="money_credits:default"]',
      );
      await expect(studioCredits).toBeDisabled();
      const studioCreditsLabel = studioCredits.locator("..");
      await expect(studioCreditsLabel).toContainText(
        /Not enough studio credits|nemáte dostatek kreditů studia/i,
      );
      await expect(studioCreditsLabel).not.toContainText(
        /Credit balance|Zůstatek kreditů|Available balance|Dostupný zůstatek/i,
      );
      await expect(studioCreditsLabel).not.toContainText(
        DECIMAL_CURRENCY_FRACTION_PATTERN,
      );

      const cartGeometry = await cartModal.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(cartGeometry.scrollWidth).toBeLessThanOrEqual(
        cartGeometry.clientWidth + 1,
      );

      const cartAccessibility = await new AxeBuilder({ page })
        .include("[data-cart-modal]")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        formatAxeViolations(cartAccessibility.violations),
        "The cart modal must have no WCAG A/AA Axe violations.",
      ).toEqual([]);

      const cartScreenshot = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        fullPage: false,
      });
      await testInfo.attach(
        `customer-cart-${locale}-${testInfo.project.name}.png`,
        { body: cartScreenshot, contentType: "image/png" },
      );

      await cartModal
        .getByRole("button", { name: /Close cart|Zavřít košík/i })
        .click();
      await expect(cartModal).toBeHidden();
    }

    const scopedBookingsResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        isLocationScopedResponse(
          response,
          "/bookings/mine",
          PRAGUE_LOCATION_ID,
        ) && url.searchParams.get("limit") === "20"
      );
    });
    await Promise.all([
      scopedBookingsResponse,
      upcoming.getByRole("button", { name: copy.manageBooking }).click(),
    ]);
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/portal/bookings\\?location=atelier-prague$`),
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const bookingsPage = page.locator("[data-customer-bookings-location-id]");
    await expect(bookingsPage).toHaveAttribute(
      "data-customer-bookings-location-id",
      PRAGUE_LOCATION_ID,
    );
    // The Prague fixture includes its calendar visit and its future visit.
    await expect(
      bookingsPage.getByText(copy.pragueBookingTitle).filter({ visible: true }),
    ).toHaveCount(2);
    await expect(bookingsPage.getByText(copy.brnoBookingTitle)).toHaveCount(0);
    await expect(
      portalHeader.locator('[aria-current="page"]'),
      "Personal booking history is no longer a top-level destination.",
    ).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await expect(
      portalHeader.locator("[data-customer-studio-switcher]"),
    ).toHaveCount(0);

    const refreshedPragueAvailability = page.waitForResponse((response) =>
      isLocationScopedResponse(
        response,
        "/bookings/mine/availability",
        PRAGUE_LOCATION_ID,
      ),
    );
    const refreshedPragueUpcoming = page.waitForResponse((response) =>
      isLocationScopedResponse(response, "/bookings/mine", PRAGUE_LOCATION_ID),
    );
    await page.goto(
      `${TENANT_ORIGIN}/${locale}/portal?location=atelier-prague`,
      {
        waitUntil: "domcontentloaded",
      },
    );
    await Promise.all([refreshedPragueAvailability, refreshedPragueUpcoming]);

    const dashboardSwitcher = page
      .locator("[data-customer-calendar-studio-selector]")
      .locator("[data-customer-studio-switcher-trigger]")
      .filter({ visible: true })
      .first();
    await expect(dashboardSwitcher).toHaveAccessibleName(/Atelier Prague/i);

    await dashboardSwitcher.click();

    const brnoStudioOption = page.getByRole("option", {
      name: /Atelier Brno/i,
    });
    await expect(brnoStudioOption).toBeVisible();

    const brnoAvailabilityResponse = page.waitForResponse((response) =>
      isLocationScopedResponse(
        response,
        "/bookings/mine/availability",
        BRNO_LOCATION_ID,
      ),
    );
    const brnoUpcomingResponse = page.waitForResponse((response) =>
      isLocationScopedResponse(response, "/bookings/mine", BRNO_LOCATION_ID),
    );

    if (testInfo.project.name.startsWith("mobile-")) {
      await brnoStudioOption.click();
    } else {
      await page.keyboard.press("Home");
      await page.keyboard.press("Enter");
    }

    await Promise.all([brnoAvailabilityResponse, brnoUpcomingResponse]);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("location"))
      .toBe("atelier-brno");
    await expect(upcoming).toContainText(copy.brnoBookingTitle);
    await expect(upcoming).not.toContainText(copy.pragueBookingTitle);

    const brnoBookingsResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        isLocationScopedResponse(
          response,
          "/bookings/mine",
          BRNO_LOCATION_ID,
        ) && url.searchParams.get("limit") === "20"
      );
    });

    await Promise.all([
      brnoBookingsResponse,
      upcoming.getByRole("button", { name: copy.manageBooking }).click(),
    ]);
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/portal/bookings\\?location=atelier-brno$`),
    );
    await expect(bookingsPage).toHaveAttribute(
      "data-customer-bookings-location-id",
      BRNO_LOCATION_ID,
    );
    // Five Tuesday visits, Wednesday's visit, and the future Open Studio visit.
    await expect(
      bookingsPage.getByText(copy.brnoBookingTitle).filter({ visible: true }),
    ).toHaveCount(7);
    await expect(bookingsPage.getByText(copy.pragueBookingTitle)).toHaveCount(
      0,
    );
    await expectNoHorizontalOverflow(page);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

for (const { locale, oppositeLegacyLanguage } of localeScenarios) {
  test(`${locale.toUpperCase()} customer subpages share the premium responsive page system`, async ({
    context,
    page,
  }, testInfo) => {
    test.skip(
      !PORTAL_PAGE_ALIGNMENT_PROJECTS.has(testInfo.project.name),
      "The subpage matrix samples desktop, short laptop, tablet and compact mobile.",
    );

    await context.addCookies([
      {
        name: "shario_language",
        url: TENANT_ORIGIN,
        value: oppositeLegacyLanguage,
      },
    ]);
    await installAssetRoutes(page);

    let headingFontFamily = "";

    for (const scenario of portalPageScenarios) {
      await page.goto(`${TENANT_ORIGIN}/${locale}${scenario.path}`, {
        waitUntil: "domcontentloaded",
      });
      const portalPage = page.locator("[data-customer-portal-page]");
      const pageHeader = portalPage.locator(
        scenario.key === "vouchers"
          ? ":scope > div > header"
          : "[data-customer-portal-page-header]",
      );
      const pageContent = portalPage.locator(
        scenario.key === "vouchers"
          ? "#voucher-shop"
          : "[data-customer-portal-page-content]",
      );
      const h1 = portalPage.getByRole("heading", { level: 1 });
      const portalHeader = page.locator("[data-customer-portal-header]");

      await expect(
        portalPage,
        `${scenario.key} needs the shared page root.`,
      ).toBeVisible({
        timeout: 20_000,
      });
      await expect(pageHeader).toBeVisible();
      await expect(pageContent).toBeVisible();
      await expect(pageContent).toHaveCSS("opacity", "1");
      await expect(page.locator("main")).toHaveCount(1);
      await expect(h1, `${scenario.key} needs exactly one H1.`).toHaveCount(1);
      if (scenario.key === "vouchers") {
        await expect(page).toHaveURL(
          `${TENANT_ORIGIN}/${locale}/portal/vouchers?location=atelier-brno`,
        );
        await expect(h1).toHaveText(
          locale === "cs" ? "Dárkové poukazy" : "Gift vouchers",
        );
        await expect(
          pageContent.getByRole("button", {
            name: locale === "cs" ? /Tvoření jako dárek/ : /Gift of clay/,
          }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(pageContent.locator('input[type="email"]')).toHaveValue(
          "martin.maker@example.test",
        );
        await expect(
          pageContent.locator('button[type="submit"]'),
        ).toBeEnabled();
        await expect(
          portalPage.locator("#my-vouchers #promo-code"),
        ).toBeVisible();
        await expect(
          page.locator("[data-customer-portal-tour-welcome]"),
        ).toHaveCount(0);
      }
      await expect(
        page.locator("[data-customer-portal-overview]"),
        `${scenario.key} must not repeat the booking-dashboard hero.`,
      ).toHaveCount(0);

      const currentFontFamily = await h1.evaluate(
        (element) => getComputedStyle(element).fontFamily,
      );
      if (!headingFontFamily) headingFontFamily = currentFontFamily;
      expect(
        currentFontFamily,
        `${scenario.key} must use the same signature display face.`,
      ).toBe(headingFontFamily);

      const modernPageStyles = await portalPage.evaluate((element) => {
        const root = element.closest("[data-tenant-style]");
        const heading = element.querySelector("h1");
        const surface = element.querySelector("[data-customer-portal-surface]");

        if (!root || !heading || !surface) return null;

        const pageStyle = getComputedStyle(element);
        const headingStyle = getComputedStyle(heading);
        const surfaceStyle = getComputedStyle(surface);

        return {
          preset: root.getAttribute("data-tenant-style"),
          pageInline: pageStyle
            .getPropertyValue("--tenant-space-page-inline")
            .trim(),
          pagePaddingLeft: Number.parseFloat(pageStyle.paddingLeft),
          displayFont: headingStyle.fontFamily,
          displayTransform: headingStyle.textTransform,
          surfaceRadius: surfaceStyle.borderRadius,
          surfaceShadow: surfaceStyle.boxShadow,
        };
      });

      expect(modernPageStyles).not.toBeNull();
      expect(modernPageStyles.preset).toBe("modern-minimal-v1");
      expect(modernPageStyles.pageInline).toBe("clamp(1rem, 3vw, 2rem)");
      expect(modernPageStyles.pagePaddingLeft).toBeGreaterThanOrEqual(16);
      expect(modernPageStyles.pagePaddingLeft).toBeLessThanOrEqual(32);
      expect(modernPageStyles.displayFont).toMatch(/Switzer/i);
      expect(modernPageStyles.displayTransform).toBe("none");
      expect(modernPageStyles.surfaceRadius).toBe("8px");
      expect(modernPageStyles.surfaceShadow).toBe("none");

      const activeNavigation = portalHeader.locator('[aria-current="page"]');
      await expect(
        activeNavigation,
        `${scenario.key} has the wrong top-level navigation state.`,
      ).toHaveCount(scenario.active ? 1 : 0);

      const headerActions = pageHeader.locator("a, button").filter({
        visible: true,
      });
      for (let index = 0; index < (await headerActions.count()); index += 1) {
        await expectTouchTarget(
          headerActions.nth(index),
          `${scenario.key} header action ${index + 1}`,
        );
      }

      await expectNoHorizontalOverflow(page);

      if (
        testInfo.project.name === "desktop-1440" ||
        testInfo.project.name === "mobile-320"
      ) {
        const accessibility = await new AxeBuilder({ page })
          .include("[data-customer-portal-page]")
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          formatAxeViolations(accessibility.violations),
          `${scenario.key} must have no WCAG A/AA Axe violations.`,
        ).toEqual([]);
      }

      if (PORTAL_PAGE_SCREENSHOT_PROJECTS.has(testInfo.project.name)) {
        const screenshot = await page.screenshot({
          animations: "disabled",
          caret: "hide",
          fullPage: true,
        });
        await testInfo.attach(
          `customer-${scenario.key}-${locale}-${testInfo.project.name}.png`,
          { body: screenshot, contentType: "image/png" },
        );
      }
    }
  });
}

for (const { locale, oppositeLegacyLanguage } of localeScenarios) {
  test(`${locale.toUpperCase()} customer profile drawer and mobile menus share the premium portal system`, async ({
    context,
    page,
  }, testInfo) => {
    test.skip(
      !PORTAL_MENU_PROJECTS.has(testInfo.project.name),
      "The open-menu matrix samples desktop, the lg–xl breakpoint and compact mobile.",
    );

    await context.addCookies([
      {
        name: "shario_language",
        url: TENANT_ORIGIN,
        value: oppositeLegacyLanguage,
      },
    ]);
    await installAssetRoutes(page);

    const desktop = (page.viewportSize()?.width || 0) >= 1280;
    const path = desktop
      ? "/portal/credits?location=atelier-brno"
      : "/portal/membership?location=atelier-brno";
    await page.goto(`${TENANT_ORIGIN}/${locale}${path}`, {
      waitUntil: "domcontentloaded",
    });

    const pageRoot = page.locator("[data-customer-portal-page]");
    await expect(pageRoot).toBeVisible({ timeout: 20_000 });
    const tenantTheme = await pageRoot.evaluate((element) => {
      const styles = getComputedStyle(element);
      const root = element.closest("[data-tenant-style]");
      return {
        preset: root?.getAttribute("data-tenant-style") || "",
        accent: styles.getPropertyValue("--tenant-accent").trim(),
        surface: styles.getPropertyValue("--tenant-surface").trim(),
        text: styles.getPropertyValue("--tenant-text").trim(),
        displayFont: styles.getPropertyValue("--tenant-font-display").trim(),
        pageInline: styles
          .getPropertyValue("--tenant-space-page-inline")
          .trim(),
        controlRadius: styles
          .getPropertyValue("--tenant-radius-control")
          .trim(),
        cardRadius: styles.getPropertyValue("--tenant-radius-card").trim(),
        buttonShadow: styles.getPropertyValue("--tenant-shadow-button").trim(),
        cardShadow: styles.getPropertyValue("--tenant-shadow-card").trim(),
        headerSurface: styles
          .getPropertyValue("--tenant-portal-header-surface")
          .trim(),
        profileSurface: styles
          .getPropertyValue("--tenant-portal-profile-surface")
          .trim(),
      };
    });
    expect(tenantTheme).toMatchObject({
      preset: "modern-minimal-v1",
      pageInline: "clamp(1rem, 3vw, 2rem)",
      controlRadius: "9999px",
      cardRadius: "0.25rem",
      buttonShadow: "none",
      cardShadow: "none",
    });
    expect(tenantTheme.displayFont).toMatch(/Switzer/i);
    const { headerSurface, profileSurface, ...baseTenantTheme } = tenantTheme;

    if (desktop) {
      const trigger = page
        .locator("[data-profile-menu-trigger]")
        .filter({ visible: true });
      await expectTouchTarget(trigger, "Customer profile trigger");
      await expect(trigger).toHaveAttribute("data-tenant-hover", "preserve");
      await trigger.focus();
      await page.keyboard.press("Enter");

      const panel = page.locator("[data-customer-portal-profile-sheet]");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("data-dialog-layout", "drawer");
      await expect(panel.locator("[data-profile-menu-identity]")).toContainText(
        /Martin Maker/i,
      );
      await expect(
        panel.locator('a[aria-current="page"]'),
        "Credits should be active inside the desktop profile drawer.",
      ).toHaveCount(1);

      const panelTheme = await panel.evaluate((element) => {
        const styles = getComputedStyle(element);
        const root = element.closest("[data-tenant-style]");
        return {
          preset: root?.getAttribute("data-tenant-style") || "",
          accent: styles.getPropertyValue("--tenant-accent").trim(),
          surface: styles.getPropertyValue("--tenant-surface").trim(),
          text: styles.getPropertyValue("--tenant-text").trim(),
          displayFont: styles.getPropertyValue("--tenant-font-display").trim(),
          pageInline: styles
            .getPropertyValue("--tenant-space-page-inline")
            .trim(),
          controlRadius: styles
            .getPropertyValue("--tenant-radius-control")
            .trim(),
          cardRadius: styles.getPropertyValue("--tenant-radius-card").trim(),
          buttonShadow: styles
            .getPropertyValue("--tenant-shadow-button")
            .trim(),
          cardShadow: styles.getPropertyValue("--tenant-shadow-card").trim(),
        };
      });
      expect(panelTheme).toEqual({
        ...baseTenantTheme,
        surface: profileSurface,
      });
      const panelItemStyle = await panel
        .locator("[data-profile-menu-item]")
        .first()
        .evaluate((element) => {
          const styles = getComputedStyle(element);
          const label = element.querySelector("[data-profile-menu-item-label]");
          return {
            borderWidths: [
              styles.borderTopWidth,
              styles.borderRightWidth,
              styles.borderBottomWidth,
              styles.borderLeftWidth,
            ],
            labelTransform: label ? getComputedStyle(label).textTransform : "",
            radius: styles.borderRadius,
            transform: styles.transform,
          };
        });
      expect(panelItemStyle).toEqual({
        borderWidths: ["0px", "0px", "0px", "0px"],
        labelTransform: "none",
        radius: "4px",
        transform: "none",
      });

      // Headless UI mounts the visible panel offscreen before its enter
      // animation exists. Wait for its actual open position and transition
      // completion, rather than a possibly empty getAnimations() snapshot.
      await expect(panel).toBeInViewport({ ratio: 1 });
      await expect(panel).not.toHaveAttribute("data-transition");
      const panelBox = await panel.boundingBox();
      const viewport = page.viewportSize();
      expect(panelBox).not.toBeNull();
      expect(panelBox.width).toBeGreaterThanOrEqual(410);
      expect(panelBox.width).toBeLessThanOrEqual(421);
      expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
      expect(panelBox.x + panelBox.width).toBeGreaterThanOrEqual(
        viewport.width - 1,
      );
      expect(panelBox.y).toBeLessThanOrEqual(1);
      expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
      expect(panelBox.y + panelBox.height).toBeGreaterThanOrEqual(
        viewport.height - 1,
      );
      await expect(
        panel.locator("[data-profile-menu-footer]"),
      ).toBeInViewport();

      const profileTargets = panel.locator("a, button").filter({
        visible: true,
      });
      for (let index = 0; index < (await profileTargets.count()); index += 1) {
        await expectTouchTarget(
          profileTargets.nth(index),
          `Desktop profile target ${index + 1}`,
        );
      }
      const profileLinks = panel.locator('a[href*="/portal/"]');
      for (let index = 0; index < (await profileLinks.count()); index += 1) {
        await expect(profileLinks.nth(index)).toHaveAttribute(
          "href",
          /location=atelier-brno/,
        );
      }

      const accessibility = await new AxeBuilder({ page })
        .include("[data-customer-portal-profile-sheet]")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        formatAxeViolations(accessibility.violations),
        "The desktop customer profile drawer must have no WCAG A/AA violations.",
      ).toEqual([]);

      const screenshot = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        fullPage: false,
      });
      await testInfo.attach(
        `customer-profile-drawer-${locale}-${testInfo.project.name}.png`,
        { body: screenshot, contentType: "image/png" },
      );

      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      const menuTrigger = page
        .locator('button[aria-controls="mobile-menu"]')
        .filter({ visible: true });
      await expectTouchTarget(menuTrigger, "Mobile menu trigger");
      await menuTrigger.click();

      const drawer = page.locator("[data-customer-portal-mobile-menu]");
      await expect(drawer).toBeVisible();
      await expect(
        drawer.locator(
          '[data-customer-portal-mobile-navigation] [aria-current="page"]',
        ),
      ).toHaveCount(1);
      const drawerTheme = await drawer.evaluate((element) => {
        const styles = getComputedStyle(element);
        const root = element.closest("[data-tenant-style]");
        return {
          preset: root?.getAttribute("data-tenant-style") || "",
          accent: styles.getPropertyValue("--tenant-accent").trim(),
          surface: styles.getPropertyValue("--tenant-surface").trim(),
          text: styles.getPropertyValue("--tenant-text").trim(),
          displayFont: styles.getPropertyValue("--tenant-font-display").trim(),
          pageInline: styles
            .getPropertyValue("--tenant-space-page-inline")
            .trim(),
          controlRadius: styles
            .getPropertyValue("--tenant-radius-control")
            .trim(),
          cardRadius: styles.getPropertyValue("--tenant-radius-card").trim(),
          buttonShadow: styles
            .getPropertyValue("--tenant-shadow-button")
            .trim(),
          cardShadow: styles.getPropertyValue("--tenant-shadow-card").trim(),
        };
      });
      expect(drawerTheme).toEqual({
        ...baseTenantTheme,
        surface: headerSurface,
      });
      await drawer.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      await expectNoHorizontalOverflow(page);

      const drawerTargets = drawer.locator("a, button").filter({
        visible: true,
      });
      for (let index = 0; index < (await drawerTargets.count()); index += 1) {
        await expectTouchTarget(
          drawerTargets.nth(index),
          `Mobile navigation target ${index + 1}`,
        );
      }

      await drawer.locator("[data-customer-portal-mobile-account]").click();
      await expect(drawer).toBeHidden();

      const sheet = page.locator("[data-customer-portal-profile-sheet]");
      await expect(
        sheet,
        "The account drawer must remain visible at every portal breakpoint.",
      ).toBeVisible();
      await expect(sheet.locator("[data-profile-menu-identity]")).toContainText(
        /Martin Maker/i,
      );
      await expect(sheet.locator("[data-profile-menu-footer]")).toBeVisible();
      const sheetTheme = await sheet.evaluate((element) => {
        const styles = getComputedStyle(element);
        const root = element.closest("[data-tenant-style]");
        return {
          preset: root?.getAttribute("data-tenant-style") || "",
          accent: styles.getPropertyValue("--tenant-accent").trim(),
          surface: styles.getPropertyValue("--tenant-surface").trim(),
          text: styles.getPropertyValue("--tenant-text").trim(),
          displayFont: styles.getPropertyValue("--tenant-font-display").trim(),
          pageInline: styles
            .getPropertyValue("--tenant-space-page-inline")
            .trim(),
          controlRadius: styles
            .getPropertyValue("--tenant-radius-control")
            .trim(),
          cardRadius: styles.getPropertyValue("--tenant-radius-card").trim(),
          buttonShadow: styles
            .getPropertyValue("--tenant-shadow-button")
            .trim(),
          cardShadow: styles.getPropertyValue("--tenant-shadow-card").trim(),
        };
      });
      expect(sheetTheme).toEqual({
        ...baseTenantTheme,
        surface: profileSurface,
      });
      const sheetItemStyle = await sheet
        .locator("[data-profile-menu-item]")
        .first()
        .evaluate((element) => {
          const styles = getComputedStyle(element);
          const label = element.querySelector("[data-profile-menu-item-label]");
          return {
            borderWidths: [
              styles.borderTopWidth,
              styles.borderRightWidth,
              styles.borderBottomWidth,
              styles.borderLeftWidth,
            ],
            labelTransform: label ? getComputedStyle(label).textTransform : "",
            radius: styles.borderRadius,
            transform: styles.transform,
          };
        });
      expect(sheetItemStyle).toEqual({
        borderWidths: ["0px", "0px", "0px", "0px"],
        labelTransform: "none",
        radius: "4px",
        transform: "none",
      });

      await sheet.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => undefined)),
        );
      });
      const sheetBox = await sheet.boundingBox();
      const viewport = page.viewportSize();
      expect(sheetBox).not.toBeNull();
      expect(sheetBox.x).toBeGreaterThanOrEqual(0);
      expect(sheetBox.x + sheetBox.width).toBeLessThanOrEqual(viewport.width);
      expect(sheetBox.y + sheetBox.height).toBeLessThanOrEqual(viewport.height);
      if (viewport.width >= 640) {
        expect(sheetBox.width).toBeGreaterThanOrEqual(410);
        expect(sheetBox.width).toBeLessThanOrEqual(421);
      }

      const accountLinks = sheet.locator('a[href*="/portal/"]');
      for (let index = 0; index < (await accountLinks.count()); index += 1) {
        await expect(accountLinks.nth(index)).toHaveAttribute(
          "href",
          /location=atelier-brno/,
        );
      }
      await expectNoHorizontalOverflow(page);

      const accessibility = await new AxeBuilder({ page })
        .include("[data-customer-portal-profile-sheet]")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        formatAxeViolations(accessibility.violations),
        "The mobile customer profile sheet must have no WCAG A/AA violations.",
      ).toEqual([]);

      const screenshot = await page.screenshot({
        animations: "disabled",
        caret: "hide",
        fullPage: false,
      });
      await testInfo.attach(
        `customer-mobile-profile-${locale}-${testInfo.project.name}.png`,
        { body: screenshot, contentType: "image/png" },
      );
    }
  });
}
