import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const port = Number(process.env.CUSTOMER_PORTAL_FIXTURE_PORT || 4002);

const TENANT_ID = "64b000000000000000000001";
const CUSTOMER_ID = "64b000000000000000000011";
const LOCATION_ID = "64b000000000000000000021";
const SECONDARY_LOCATION_ID = "64b000000000000000000022";
const PRODUCT_ID = "64b000000000000000000031";
const SECONDARY_PRODUCT_ID = "64b000000000000000000032";
const PRAGUE_OPEN_STUDIO_PRODUCT_ID = "64b000000000000000000034";
const BRNO_GLAZING_PRODUCT_ID = "64b000000000000000000035";
const BOOKING_ID = "64b000000000000000000041";
const SECONDARY_BOOKING_ID = "64b000000000000000000042";
const CALENDAR_BOOKING_ID = "64b000000000000000000043";
const SECONDARY_CALENDAR_BOOKING_ID = "64b000000000000000000044";
const COMPACT_BOOKING_ID = "64b000000000000000000051";
const COURSE_BOOKING_ID = "64b000000000000000000056";
const COURSE_PRODUCT_ID = "64b000000000000000000033";
const OCCUPANCY_BOOKING_ID = "64b000000000000000000061";
const FIXTURE_NOW = new Date("2026-08-11T08:30:00.000Z");

const corsHeaders = (request) => ({
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-origin": request.headers.origin || "*",
  "cache-control": "no-store",
  vary: "Origin",
});

const sendJson = (request, response, status, payload) => {
  response.writeHead(status, {
    ...corsHeaders(request),
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

const sendSvg = (request, response, svg) => {
  response.writeHead(200, {
    ...corsHeaders(request),
    "content-type": "image/svg+xml; charset=utf-8",
  });
  response.end(svg);
};

const base64Url = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const createUnsignedCustomerToken = (tenantId = TENANT_ID) => {
  const header = base64Url({ alg: "none", typ: "JWT" });
  const payload = base64Url({
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    iat: Math.floor(Date.now() / 1000),
    UserInfo: {
      authContext: "customer",
      id: CUSTOMER_ID,
      memberNumber: 234,
      tenantId,
      tenantRole: "customer",
    },
  });

  return `${header}.${payload}.`;
};

const tenant = {
  id: TENANT_ID,
  name: "Atelier Nami",
  slug: "studio-alpha",
  modules: {
    ai: true,
    bookings: true,
    courses: true,
    credits: true,
    firing: true,
    invoices: true,
    memberships: true,
    payments: true,
    vouchers: true,
  },
  settings: {
    currency: "CZK",
    defaultLanguage: "en",
    publicDefaultLanguage: "en",
    supportedPublicLanguages: ["en", "cs"],
    timezone: "Europe/Prague",
  },
  publicCapabilities: {
    bookStudio: true,
    courses: true,
    help: true,
    memberships: true,
    registration: true,
  },
  publicSite: {
    branding: {
      accentColor: "#2748D8",
      backgroundColor: "#F5F1EA",
      description: {
        cs: "Keramické studio pro klidnou tvorbu.",
        en: "A calm place to make with clay.",
      },
      displayName: "Atelier Nami",
      logoUrl: "https://visual-assets.example.test/customer-portal-logo.svg",
      logoSize: 46,
      secondaryColor: "#D9785D",
      textColor: "#22221F",
      stylePreset: "modern-minimal-v1",
    },
    footer: {
      address: "Brno",
      copyright: { cs: "Atelier Nami", en: "Atelier Nami" },
      description: { cs: "Tvořte v klidu.", en: "Make at your own pace." },
      email: "hello@atelier-nami.test",
      legal: {
        privacy: "https://legal.example.test/privacy",
        studioRules: "https://legal.example.test/studio-rules",
        terms: "https://legal.example.test/terms",
      },
      openingHours: { cs: "Po–Ne 08:00–20:00", en: "Mon–Sun 08:00–20:00" },
      phone: "",
      social: {},
    },
    header: {
      announcement: { text: { cs: "", en: "" }, url: "" },
      hiddenItems: [],
      navOrder: ["book", "courses", "memberships", "help"],
      primaryCta: "book",
    },
    pages: {
      vouchers: {
        title: { cs: "Dárkové poukazy", en: "Gift vouchers" },
        description: {
          cs: "Darujte čas na tvoření v našem ateliéru.",
          en: "Give someone time to create in our studio.",
        },
      },
    },
  },
};

const createPresetTenant = ({
  id,
  slug,
  name,
  stylePreset,
  logoRedirectUrl = "",
}) => ({
  ...tenant,
  id,
  name,
  slug,
  publicSite: {
    ...tenant.publicSite,
    branding: {
      ...tenant.publicSite.branding,
      displayName: name,
      stylePreset,
      logoRedirectEnabled: Boolean(logoRedirectUrl),
      logoRedirectUrl,
    },
  },
});

const presetTenants = {
  "studio-alpha": tenant,
  "studio-beta": createPresetTenant({
    id: "64b000000000000000000002",
    slug: "studio-beta",
    name: "Atelier Beta",
    stylePreset: "modern-minimal-v1",
  }),
  "studio-classic": createPresetTenant({
    id: TENANT_ID,
    slug: "studio-classic",
    name: "Atelier Classic",
    stylePreset: "classic-editorial-v1",
    logoRedirectUrl: "https://studio.example.test/",
  }),
  "studio-warm": createPresetTenant({
    id: TENANT_ID,
    slug: "studio-warm",
    name: "Atelier Warm",
    stylePreset: "warm-organic-v1",
    logoRedirectUrl: "/about?source=logo",
  }),
};

presetTenants["studio-language"] = {
  ...createPresetTenant({
    id: "64b000000000000000000003",
    slug: "studio-language",
    name: "Atelier Language",
    stylePreset: "modern-minimal-v1",
  }),
  settings: {
    ...tenant.settings,
    publicDefaultLanguage: "cs",
    supportedPublicLanguages: ["cs", "en"],
  },
};

presetTenants["studio-credits"] = {
  ...createPresetTenant({
    id: TENANT_ID,
    slug: "studio-credits",
    name: "Atelier Credits",
    stylePreset: "warm-organic-v1",
  }),
  settings: {
    ...tenant.settings,
    publicDefaultLanguage: "cs",
    supportedPublicLanguages: ["cs", "en"],
  },
};

const customerLanguageDefaults = new Map([["studio-language", null]]);

const customerLanguagePreference = (requestTenant) =>
  customerLanguageDefaults.has(requestTenant.slug)
    ? {
        customerDefaultLanguage: customerLanguageDefaults.get(
          requestTenant.slug,
        ),
      }
    : {};

const customerAccount = (requestTenant) => ({
  id: CUSTOMER_ID,
  customId: "UJ-MS79UT9H-OVERVIEW",
  memberNumber: 234,
  firstname: "Martin",
  lastname: "Maker",
  email: "martin.maker@example.test",
  phone: "",
  ...customerLanguagePreference(requestTenant),
});

for (const [slug, customerPortal] of Object.entries({
  "studio-portal-controls": {
    pages: Object.fromEntries(
      [
        "memberships",
        "vouchers",
        "bookings",
        "work",
        "credits",
        "notifications",
        "waitlists",
      ].map((id) => [id, { enabled: false }]),
    ),
    navigation: { studioGuide: { visible: false } },
  },
  "studio-portal-no-calendar": { pages: { calendar: { enabled: false } } },
  "studio-portal-disabled": {
    pages: Object.fromEntries(
      [
        "calendar",
        "courses",
        "memberships",
        "vouchers",
        "studioGuide",
        "bookings",
        "work",
        "credits",
        "invoices",
        "account",
        "notifications",
        "waitlists",
      ].map((id) => [id, { enabled: false }]),
    ),
  },
})) {
  presetTenants[slug] = {
    ...tenant,
    slug,
    publicSite: { ...tenant.publicSite, customerPortal },
  };
}

const getRequestTenant = (request) => {
  const origin = String(request.headers.origin || "");

  if (origin.includes("studio-language."))
    return presetTenants["studio-language"];
  if (origin.includes("studio-credits."))
    return presetTenants["studio-credits"];

  const portalSlug = origin.match(/^https?:\/\/(studio-portal-[a-z-]+)\./)?.[1];
  if (portalSlug && presetTenants[portalSlug]) return presetTenants[portalSlug];

  if (origin.includes("studio-beta.")) return presetTenants["studio-beta"];
  if (origin.includes("studio-classic."))
    return presetTenants["studio-classic"];
  if (origin.includes("studio-warm.")) return presetTenants["studio-warm"];
  return tenant;
};

const location = {
  _id: LOCATION_ID,
  id: LOCATION_ID,
  isActive: true,
  isPrimary: true,
  name: "Atelier Brno",
  slug: "atelier-brno",
  address: {
    city: "Brno",
    country: "Czech Republic",
    line1: "Vancurova 49",
    postalCode: "602 00",
  },
  booking: {
    activityCapacities: [
      { activity: "WORKSTATION", capacity: 8 },
      { activity: "SHARED_TABLE", capacity: 12 },
    ],
    allowPublicOverlap: true,
    enabled: true,
    globalCapacity: 20,
    maxBookingMinutes: 360,
    maxConcurrentOpenStudioBookings: 8,
    minBookingMinutes: 60,
    slotStepMinutes: 30,
    timezone: "Europe/Prague",
  },
  openingHours: Object.fromEntries(
    [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ].map((day) => [
      day,
      { closeTime: "20:00", isOpen: true, openTime: "08:00" },
    ]),
  ),
};

const secondaryLocation = {
  ...location,
  _id: SECONDARY_LOCATION_ID,
  id: SECONDARY_LOCATION_ID,
  isPrimary: false,
  name: "Atelier Prague Ceramic Arts & Community Studio",
  slug: "atelier-prague",
  address: {
    city: "Prague",
    country: "Czech Republic",
    line1: "Vinohradska 18",
    postalCode: "120 00",
  },
};

const product = {
  _id: PRODUCT_ID,
  id: PRODUCT_ID,
  availability: "onRequest",
  bookingMode: "public",
  category: "openStudio",
  currency: "CZK",
  isActive: true,
  kind: "open-studio",
  locationId: LOCATION_ID,
  name: { cs: "Otevřený ateliér", en: "Open Studio" },
  price: 490,
  title: "Open Studio",
};

const secondaryProduct = {
  ...product,
  _id: SECONDARY_PRODUCT_ID,
  id: SECONDARY_PRODUCT_ID,
  locationId: SECONDARY_LOCATION_ID,
  name: { cs: "Glazovací dílna", en: "Glazing Lab" },
  price: 590,
  title: "Glazing Lab",
};

const courseProduct = {
  ...product,
  _id: COURSE_PRODUCT_ID,
  id: COURSE_PRODUCT_ID,
  kind: "class",
  category: "course",
  name: { cs: "Tvůrčí workshop", en: "Creative Workshop" },
  title: "Creative Workshop",
};

const pragueOpenStudioProduct = {
  ...product,
  _id: PRAGUE_OPEN_STUDIO_PRODUCT_ID,
  id: PRAGUE_OPEN_STUDIO_PRODUCT_ID,
  locationId: SECONDARY_LOCATION_ID,
};
const brnoGlazingProduct = {
  ...secondaryProduct,
  _id: BRNO_GLAZING_PRODUCT_ID,
  id: BRNO_GLAZING_PRODUCT_ID,
  locationId: LOCATION_ID,
};
const catalogProducts = [
  product,
  pragueOpenStudioProduct,
  secondaryProduct,
  brnoGlazingProduct,
  courseProduct,
];

const nextVisitStart = new Date(Date.now() + 36 * 60 * 60 * 1000);
nextVisitStart.setUTCMinutes(0, 0, 0);
const nextVisitEnd = new Date(nextVisitStart.getTime() + 2 * 60 * 60 * 1000);
const secondaryVisitStart = new Date(Date.now() + 12 * 60 * 60 * 1000);
secondaryVisitStart.setUTCMinutes(0, 0, 0);
const secondaryVisitEnd = new Date(
  secondaryVisitStart.getTime() + 90 * 60 * 1000,
);

const upcomingBooking = {
  _id: BOOKING_ID,
  id: BOOKING_ID,
  bookingMode: "public",
  bookingProduct: product,
  end: nextVisitEnd.toISOString(),
  location,
  locationId: LOCATION_ID,
  numberOfGuests: 1,
  paymentStatus: "CONFIRMED",
  plannedActivity: "WORKSTATION",
  productId: PRODUCT_ID,
  start: nextVisitStart.toISOString(),
  status: "processed",
  tag: "open-studio",
  title: "Open Studio",
};

const secondaryUpcomingBooking = {
  ...upcomingBooking,
  _id: SECONDARY_BOOKING_ID,
  id: SECONDARY_BOOKING_ID,
  bookingProduct: secondaryProduct,
  end: secondaryVisitEnd.toISOString(),
  location: secondaryLocation,
  locationId: SECONDARY_LOCATION_ID,
  plannedActivity: "SHARED_TABLE",
  productId: SECONDARY_PRODUCT_ID,
  start: secondaryVisitStart.toISOString(),
  title: "Glazing Lab",
};

// The visual browser clock is fixed to 11 August 2026. Five earlier visits
// deliberately put the Wednesday booking outside the upcoming summary's limit.
const earlierCalendarBookings = Array.from({ length: 5 }, (_, index) => {
  const start = new Date(
    `2026-08-11T${String(9 + index).padStart(2, "0")}:00:00.000Z`,
  );
  return {
    ...upcomingBooking,
    _id: `${COMPACT_BOOKING_ID.slice(0, -2)}${51 + index}`,
    id: `${COMPACT_BOOKING_ID.slice(0, -2)}${51 + index}`,
    start: start.toISOString(),
    end: new Date(
      start.getTime() + (index === 0 ? 15 : 30) * 60_000,
    ).toISOString(),
  };
});
const calendarOwnedBookings = [
  ...earlierCalendarBookings,
  {
    ...upcomingBooking,
    _id: CALENDAR_BOOKING_ID,
    id: CALENDAR_BOOKING_ID,
    start: "2026-08-12T08:00:00.000Z",
    end: "2026-08-12T10:00:00.000Z",
  },
  {
    ...secondaryUpcomingBooking,
    _id: SECONDARY_CALENDAR_BOOKING_ID,
    id: SECONDARY_CALENDAR_BOOKING_ID,
    start: "2026-08-11T12:00:00.000Z",
    end: "2026-08-11T13:30:00.000Z",
  },
  {
    ...upcomingBooking,
    _id: COURSE_BOOKING_ID,
    id: COURSE_BOOKING_ID,
    bookingProduct: courseProduct,
    productId: COURSE_PRODUCT_ID,
    tag: "class",
    title: "Creative Workshop",
    numberOfGuests: 8,
    maxNumberOfParticipants: 12,
    courseSessionId: COURSE_BOOKING_ID,
    participantCount: 2,
    start: "2026-08-12T12:00:00.000Z",
    end: "2026-08-12T14:00:00.000Z",
  },
];

// The real endpoint permits 100 rows per page. History fills the first page
// so identifying the visible owned bookings requires fetching the second one.
const historicalBookings = Array.from({ length: 100 }, (_, index) => {
  const start = new Date(Date.UTC(2026, 3, 1 + index, 8));
  const id = `64b00000000000000000${String(1000 + index).padStart(4, "0")}`;
  return {
    ...upcomingBooking,
    _id: id,
    id,
    status: "completed",
    start: start.toISOString(),
    end: new Date(start.getTime() + 60 * 60_000).toISOString(),
  };
});
const customerBookings = [
  ...historicalBookings,
  ...calendarOwnedBookings,
  secondaryUpcomingBooking,
  upcomingBooking,
];
// Two fully populated activity pools make the calendar's capacity states real:
// one place per activity remains at 16:00; both pools are full at 17:00.
const capacityCalendarBookings = [
  { hour: 14, activity: "WORKSTATION", guests: 7 },
  { hour: 14, activity: "SHARED_TABLE", guests: 11 },
  { hour: 15, activity: "WORKSTATION", guests: 8 },
  { hour: 15, activity: "SHARED_TABLE", guests: 12 },
].map(({ hour, activity, guests }, index) => ({
  ...upcomingBooking,
  _id: `64b0000000000000000000${71 + index}`,
  id: `64b0000000000000000000${71 + index}`,
  plannedActivity: activity,
  numberOfGuests: guests,
  start: `2026-08-11T${hour}:00:00.000Z`,
  end: `2026-08-11T${hour + 1}:00:00.000Z`,
}));
const calendarAvailabilityBookings = [
  ...calendarOwnedBookings,
  ...capacityCalendarBookings,
  secondaryUpcomingBooking,
  upcomingBooking,
  ...Array.from({ length: 2 }, (_, index) => ({
    ...upcomingBooking,
    _id: `${OCCUPANCY_BOOKING_ID.slice(0, -2)}${61 + index}`,
    id: `${OCCUPANCY_BOOKING_ID.slice(0, -2)}${61 + index}`,
    start: `2026-08-12T08:${index === 0 ? "00" : "15"}:00.000Z`,
    end: `2026-08-12T10:${index === 0 ? "00" : "15"}:00.000Z`,
  })),
];

// Match serializeCustomerAvailabilityBooking: occupancy contains no identity
// or ownership hints and product/location references are unpopulated IDs.
const serializeAvailabilityBooking = (booking) => ({
  _id: booking.id,
  id: booking.id,
  bookingProduct: booking.productId,
  productId: booking.productId,
  location: booking.locationId,
  locationId: booking.locationId,
  start: booking.start,
  end: booking.end,
  numberOfGuests: booking.numberOfGuests,
  ...(booking.tag === "class"
    ? {
        maxNumberOfParticipants: booking.maxNumberOfParticipants,
        courseSessionId: booking.courseSessionId,
      }
    : {}),
  bookingMode: booking.bookingMode,
  publicCapacityLimit: null,
  bookingType: booking.bookingMode,
  plannedActivity: booking.plannedActivity,
  tag: booking.tag,
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  paymentExpiresAt: null,
});

// Match serializeCustomerBooking for both /mine pages and /mine/:id details.
// Membership in /mine, rather than an invented isMine flag, establishes ownership.
const serializeCustomerBooking = (booking) => ({
  id: booking.id,
  type: booking.tag === "class" ? "course" : "studio",
  kind: booking.tag === "class" ? "class" : "open-studio",
  tag: booking.tag,
  status: booking.status,
  paymentStatus: booking.paymentStatus,
  start: booking.start,
  end: booking.end,
  participantCount: booking.participantCount ?? booking.numberOfGuests,
  bookingType: booking.bookingMode,
  bookingMode: booking.bookingMode,
  publicCapacityLimit: null,
  customerChoiceBooking: false,
  plannedActivity: booking.plannedActivity,
  canCancel: false,
  canReschedule: false,
  product: {
    id: booking.bookingProduct.id,
    name: booking.bookingProduct.name,
    kind: booking.bookingProduct.kind,
    bookingMode: booking.bookingProduct.bookingMode,
    currency: booking.bookingProduct.currency,
  },
  location: {
    id: booking.location.id,
    name: booking.location.name,
    slug: booking.location.slug,
    address: booking.location.address,
    timezone: "Europe/Prague",
    arrival: {
      publicInstructions: "",
      accessCodeDeliveryMinutesBefore: 15,
      accessCodeDeliveryEnabled: false,
      accessCodeDelivered: false,
      accessCodeIssuanceStarted: false,
    },
  },
});

const getLocationScopedBookings = (url, bookings = customerBookings) => {
  const requestedLocationId = String(
    url.searchParams.get("locationId") || "",
  ).trim();

  return requestedLocationId
    ? bookings.filter((booking) => booking.locationId === requestedLocationId)
    : bookings;
};

const customerRefreshResponse = (requestTenant = tenant) => ({
  accessToken: createUnsignedCustomerToken(requestTenant.id),
  authContext: "customer",
  tenant: requestTenant,
  user: {
    _id: CUSTOMER_ID,
    customId: "UJ-MS79UT9H-OVERVIEW",
    memberNumber: 234,
    email: "martin.maker@example.test",
    firstName: "Martin",
    firstname: "Martin",
    id: CUSTOMER_ID,
    lastName: "Maker",
    name: "Martin Maker",
    ...customerLanguagePreference(requestTenant),
  },
  workspaceAccess: null,
});

const logoSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" role="img" aria-label="Atelier Nami">
    <rect width="320" height="120" rx="24" fill="#F5F1EA"/>
    <circle cx="60" cy="60" r="38" fill="#2748D8"/>
    <path d="M34 70c15-43 38-43 53 0-17-13-36-13-53 0Z" fill="#FFFFFF"/>
    <text x="116" y="72" font-family="Georgia, serif" font-size="34" fill="#22221F">Nami</text>
  </svg>`;

export const handleCustomerPortalFixtureRequest = async (request, response) => {
  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const method = String(request.method || "GET").toUpperCase();

  if (method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  if (pathname === "/ready") {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("ready");
    return;
  }

  if (method === "GET" && pathname === "/assets/atelier-nami-logo.svg") {
    sendSvg(request, response, logoSvg);
    return;
  }

  const publicTenantMatch = pathname.match(
    /^\/public\/tenants\/([^/]+)\/config$/,
  );
  const publicTenant = publicTenantMatch
    ? presetTenants[publicTenantMatch[1]]
    : null;

  if (method === "GET" && publicTenant) {
    sendJson(request, response, 200, { tenant: publicTenant });
    return;
  }

  const voucherProductsMatch = pathname.match(
    /^\/public\/tenants\/([^/]+)\/vouchers\/products$/,
  );
  if (method === "GET" && presetTenants[voucherProductsMatch?.[1]]) {
    sendJson(request, response, 200, {
      products: [
        {
          id: "64b000000000000000000036",
          name: { CZ: "Tvoření jako dárek", EN: "Gift of clay" },
          description: {
            CZ: "Kredit na tvoření v ateliéru.",
            EN: "Studio credit for a creative visit.",
          },
          type: "coupon",
          isActive: true,
          hasVoucherDesign: true,
          price: 500,
          currency: "CZK",
          voucherSettings: { validity: { mode: "months", months: 12 } },
        },
      ],
    });
    return;
  }

  if (method === "POST" && pathname === "/auth/customer/refresh") {
    sendJson(
      request,
      response,
      200,
      customerRefreshResponse(getRequestTenant(request)),
    );
    return;
  }

  if (method === "POST" && pathname === "/auth/refresh") {
    sendJson(request, response, 401, { message: "No platform session" });
    return;
  }

  if (method === "GET" && pathname === "/locations/customer") {
    sendJson(request, response, 200, {
      locations: [location, secondaryLocation],
    });
    return;
  }

  if (method === "GET" && pathname === "/notifications/mine/summary") {
    sendJson(request, response, 200, { unreadCount: 1 });
    return;
  }

  if (method === "GET" && pathname === "/notifications/mine") {
    sendJson(request, response, 200, {
      notifications: [
        {
          id: "64b000000000000000000071",
          category: "bookings",
          severity: "info",
          title: {
            en: "Your studio visit is booked",
            cs: "Návštěva studia je rezervována",
          },
          message: {
            en: "View the details of your upcoming visit to Atelier Brno.",
            cs: "Zobrazte si podrobnosti nadcházející návštěvy Atelier Brno.",
          },
          actionUrl: "/portal/bookings?location=atelier-brno",
          location: { id: LOCATION_ID, name: location.name },
          isRead: false,
          readAt: null,
          createdAt: FIXTURE_NOW.toISOString(),
        },
      ],
      pagination: {
        page: Number(url.searchParams.get("page") || 1),
        limit: Number(url.searchParams.get("limit") || 8),
        totalCount: 1,
        totalPages: 1,
      },
    });
    return;
  }

  if (method === "GET" && pathname === "/bookings/mine/availability") {
    const from = new Date(url.searchParams.get("from") || FIXTURE_NOW);
    const to = new Date(
      url.searchParams.get("to") || from.getTime() + 90 * 24 * 60 * 60_000,
    );
    sendJson(request, response, 200, {
      bookings: getLocationScopedBookings(url, calendarAvailabilityBookings)
        .filter(
          (booking) =>
            new Date(booking.end) > from && new Date(booking.start) < to,
        )
        .sort((first, second) => new Date(first.start) - new Date(second.start))
        .map(serializeAvailabilityBooking),
    });
    return;
  }

  if (method === "GET" && pathname === "/bookings/mine") {
    const scope = url.searchParams.get("scope") || "upcoming";
    const currentPage = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(url.searchParams.get("limit")) || 20),
    );
    const scopedBookings = getLocationScopedBookings(url)
      .filter((booking) => {
        if (scope === "all") return true;
        if (scope === "history")
          return (
            new Date(booking.end) < FIXTURE_NOW ||
            booking.status === "cancelled"
          );
        return new Date(booking.end) >= FIXTURE_NOW;
      })
      .sort(
        (first, second) =>
          (new Date(first.start) - new Date(second.start)) *
          (scope === "history" ? -1 : 1),
      );
    sendJson(request, response, 200, {
      bookings: scopedBookings
        .slice((currentPage - 1) * pageSize, currentPage * pageSize)
        .map(serializeCustomerBooking),
      currentPage,
      pageSize,
      totalCount: scopedBookings.length,
      totalPages: Math.ceil(scopedBookings.length / pageSize),
    });
    return;
  }

  const customerBookingMatch = pathname.match(/^\/bookings\/mine\/([^/]+)$/);
  if (method === "GET" && customerBookingMatch) {
    const booking = customerBookings.find(
      (entry) => entry.id === customerBookingMatch[1],
    );
    sendJson(
      request,
      response,
      booking ? 200 : 404,
      booking
        ? { booking: serializeCustomerBooking(booking) }
        : { code: "NOT_FOUND", message: "Booking not found" },
    );
    return;
  }

  if (method === "GET" && pathname === "/products/customer-catalog/courses") {
    const locationId = url.searchParams.get("locationId");
    const products =
      !locationId || locationId === LOCATION_ID
        ? [
            {
              ...courseProduct,
              name: { CZ: "Tvůrčí workshop", EN: "Creative Workshop" },
            },
          ]
        : [];
    sendJson(request, response, 200, {
      products,
      currentPage: 1,
      totalPages: 1,
      totalCount: products.length,
    });
    return;
  }

  if (
    method === "GET" &&
    pathname === `/products/customer-catalog/${COURSE_PRODUCT_ID}/sessions`
  ) {
    const locationId = url.searchParams.get("locationId");
    const sessions =
      !locationId || locationId === LOCATION_ID
        ? [
            {
              id: COURSE_BOOKING_ID,
              productId: COURSE_PRODUCT_ID,
              locationId: LOCATION_ID,
              location: {
                id: LOCATION_ID,
                name: location.name,
                slug: location.slug,
              },
              start: "2026-08-12T12:00:00.000Z",
              end: "2026-08-12T14:00:00.000Z",
              capacity: 12,
              remainingCapacity: 4,
              available: true,
            },
          ]
        : [];
    sendJson(request, response, 200, { sessions });
    return;
  }

  if (method === "GET" && pathname === "/products/customer-catalog") {
    const locationId = String(url.searchParams.get("locationId") || "").trim();
    sendJson(request, response, 200, {
      products: locationId
        ? catalogProducts.filter((entry) => entry.locationId === locationId)
        : catalogProducts,
    });
    return;
  }

  if (method === "GET" && pathname === "/credits/mine/balance") {
    sendJson(request, response, 200, { balance: 400, currency: "CZK" });
    return;
  }

  if (method === "GET" && pathname === "/pottery-pieces/my") {
    sendJson(request, response, 200, { pieces: [] });
    return;
  }

  if (method === "GET" && pathname === "/memberships/mine") {
    sendJson(request, response, 200, { membership: null });
    return;
  }

  if (method === "GET" && pathname === "/coupons/redeem") {
    sendJson(request, response, 200, []);
    return;
  }

  if (method === "GET" && pathname === "/knowledge/customer") {
    sendJson(request, response, 200, []);
    return;
  }

  if (method === "GET" && pathname === "/invoices/mine") {
    sendJson(request, response, 200, {
      invoices: [],
      page: Number(url.searchParams.get("page") || 1),
      total: 0,
      totalPages: 0,
    });
    return;
  }

  if (method === "GET" && pathname === "/credits/mine/transactions") {
    sendJson(request, response, 200, {
      transactions: [],
      pagination: {
        page: Number(url.searchParams.get("page") || 1),
        limit: Number(url.searchParams.get("limit") || 15),
        totalCount: 0,
        totalPages: 0,
      },
    });
    return;
  }

  if (method === "GET" && pathname === "/account") {
    sendJson(request, response, 200, {
      account: customerAccount(getRequestTenant(request)),
    });
    return;
  }

  if (
    method === "PATCH" &&
    pathname === "/account/customer-preferences" &&
    customerLanguageDefaults.has(getRequestTenant(request).slug)
  ) {
    const requestTenant = getRequestTenant(request);
    try {
      let body = "";
      for await (const chunk of request) body += chunk;
      const payload = JSON.parse(body);
      if (
        Object.keys(payload).length !== 1 ||
        ![null, "cs", "en"].includes(payload.defaultLanguage)
      ) {
        sendJson(request, response, 400, {
          message: "Invalid language preference",
        });
        return;
      }
      customerLanguageDefaults.set(requestTenant.slug, payload.defaultLanguage);
      sendJson(request, response, 200, {
        account: customerAccount(requestTenant),
      });
    } catch {
      sendJson(request, response, 400, { message: "Invalid JSON body" });
    }
    return;
  }

  if (method === "POST" && pathname === "/cart/check-credits") {
    sendJson(request, response, 200, {
      canAfford: false,
      deficit: 1960,
    });
    return;
  }

  if (method === "POST" && pathname === "/checkout/quote") {
    try {
      let body = "";
      for await (const chunk of request) body += chunk;
      const { cart } = JSON.parse(body);
      if (!Array.isArray(cart) || !cart.length) {
        throw new Error("A non-empty fixture cart is required.");
      }

      // Use fixture catalog prices, not browser-supplied product prices.
      const totalMinor = cart.reduce((total, item) => {
        const productId = item?.product?._id || item?.product?.id;
        const fixtureProduct = catalogProducts.find(
          (entry) => entry.id === productId,
        );
        if (!fixtureProduct) throw new Error("Unknown fixture product.");
        const durationBlocks =
          (new Date(item.end).getTime() - new Date(item.start).getTime()) /
          (30 * 60_000);
        const quantity = Number(item.quantity ?? durationBlocks);
        const guests = Number(item.numberOfGuests ?? 1);
        if (
          !Number.isFinite(quantity) ||
          quantity <= 0 ||
          !Number.isInteger(guests) ||
          guests < 1
        ) {
          throw new Error("Invalid fixture booking quantity.");
        }
        const units =
          Math.ceil(quantity) * (fixtureProduct.kind === "class" ? 1 : guests);
        return total + fixtureProduct.price * 100 * units;
      }, 0);
      const availableMinor = 400 * 100;
      sendJson(request, response, 200, {
        quote: {
          currency: "CZK",
          subtotalMinor: totalMinor,
          discountMinor: 0,
          totalMinor,
        },
        paymentOptions: [
          { method: "card", available: true },
          {
            method: "money_credits",
            availableMinor,
            availableMajor: 400,
            coversTotal: availableMinor >= totalMinor,
          },
        ],
      });
    } catch (error) {
      sendJson(request, response, 400, { message: error.message });
    }
    return;
  }

  if (method === "GET" && pathname === "/ai/customer/concierge/config") {
    sendJson(request, response, 200, {
      config: {
        enabled: true,
        handoff: { email: "hello@atelier-nami.test" },
      },
    });
    return;
  }

  sendJson(request, response, 404, {
    code: "NOT_FOUND",
    path: `${method} ${pathname}`,
  });
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer(handleCustomerPortalFixtureRequest);
  server.listen(port, "0.0.0.0");

  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
