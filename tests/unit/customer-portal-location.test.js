import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

import { describe, expect, it } from "vitest";

import {
  buildCustomerPortalPath,
  buildLocalizedCustomerPortalUrl,
  findPortalLocationByReference,
  getPortalLocationReference,
  getPortalLocationReferenceFromPath,
  getPortalLocationReferenceFromSearchParams,
  normalizePortalLocationReference,
  retainCustomerPortalLocation,
  resolvePortalLocationSelection,
} from "@/utils/customerPortalLocation";

const headerUtilsSource = fs.readFileSync(
  path.join(process.cwd(), "src/components/headers/header.utils.js"),
  "utf8",
);
const activePathStart = headerUtilsSource.indexOf(
  "export function isActivePath",
);
const activePathEnd = headerUtilsSource.indexOf(
  "\nexport function isStudioActive",
  activePathStart,
);
const activePathSource = headerUtilsSource
  .slice(activePathStart, activePathEnd)
  .replace("export function", "function");
const isActivePath = vm.runInNewContext(`${activePathSource}\nisActivePath;`);

const locations = [
  {
    id: "64b000000000000000000001",
    name: "Studio Emilka",
    slug: "studio-emilka",
    isActive: true,
    isPrimary: true,
    booking: { enabled: true },
  },
  {
    id: "64b000000000000000000002",
    name: "Studio Olivka",
    slug: "studio-olivka",
    isActive: true,
    isPrimary: false,
    booking: { enabled: true },
  },
];

describe("customer portal location routing", () => {
  it("keeps overview exact while matching the direct bookings route", () => {
    expect(isActivePath("/portal", "/portal")).toBe(true);
    expect(isActivePath("/portal/bookings", "/portal")).toBe(false);
    expect(isActivePath("/portal/bookings", "/portal/bookings")).toBe(true);
    expect(
      isActivePath(
        "/portal/bookings?location=studio-olivka",
        "/portal/bookings?location=studio-olivka",
      ),
    ).toBe(true);
    expect(
      isActivePath(
        "/portal/bookings?location=studio-olivka",
        "/portal?location=studio-olivka",
      ),
    ).toBe(false);
    expect(isActivePath("/portal/bookings/upcoming", "/portal/bookings")).toBe(
      true,
    );
    expect(
      isActivePath(
        "/portal?location=studio-olivka&tab=vouchers",
        "/portal?location=studio-olivka&tab=studio-calendar",
      ),
    ).toBe(false);
    expect(
      isActivePath(
        "/portal?location=studio-olivka&tab=vouchers",
        "/portal?tab=vouchers",
      ),
    ).toBe(true);
    expect(
      isActivePath(
        "/portal?location=studio-olivka",
        "/portal?tab=studio-calendar",
      ),
    ).toBe(true);
  });

  it("normalizes readable slugs and legacy object IDs while rejecting unsafe input", () => {
    expect(normalizePortalLocationReference(" Studio-Olivka ")).toBe(
      "studio-olivka",
    );
    expect(normalizePortalLocationReference("64B000000000000000000002")).toBe(
      "64b000000000000000000002",
    );
    expect(normalizePortalLocationReference("studio/olivka")).toBe("");
    expect(normalizePortalLocationReference("https://evil.example")).toBe("");
    expect(normalizePortalLocationReference("a".repeat(161))).toBe("");
  });

  it("prefers a stable location slug and can resolve the legacy ID", () => {
    expect(getPortalLocationReference(locations[1])).toBe("studio-olivka");
    expect(
      findPortalLocationByReference(locations, "studio-olivka")?.name,
    ).toBe("Studio Olivka");
    expect(
      findPortalLocationByReference(locations, "64b000000000000000000002")
        ?.name,
    ).toBe("Studio Olivka");
    expect(findPortalLocationByReference(locations, "other-studio")).toBeNull();
  });

  it("builds a canonical portal path and retains the selected tab", () => {
    expect(buildCustomerPortalPath({ location: locations[1] })).toBe(
      "/portal?location=studio-olivka",
    );
    expect(
      buildCustomerPortalPath({
        location: locations[1],
        tab: "MY_BOOKINGS",
      }),
    ).toBe("/portal?location=studio-olivka&tab=my-bookings");
    expect(
      buildCustomerPortalPath({
        locationReference: "../wrong",
        tab: "bad/value",
      }),
    ).toBe("/portal");
  });

  it("retains the studio on direct overview and bookings navigation links", () => {
    expect(retainCustomerPortalLocation("/portal", "studio-olivka")).toBe(
      "/portal?location=studio-olivka",
    );
    expect(
      retainCustomerPortalLocation("/portal/bookings", "studio-olivka"),
    ).toBe("/portal/bookings?location=studio-olivka");
    expect(
      retainCustomerPortalLocation("/portal/account", "studio-olivka"),
    ).toBe("/portal/account?location=studio-olivka");
    expect(
      retainCustomerPortalLocation(
        "/portal/credits?tab=history#balance",
        "studio-olivka",
      ),
    ).toBe("/portal/credits?tab=history&location=studio-olivka#balance");
    expect(
      retainCustomerPortalLocation("//evil.example/portal", "studio-olivka"),
    ).toBe("//evil.example/portal");
  });

  it("reads canonical and legacy portal intent only from a tenant-local portal path", () => {
    expect(
      getPortalLocationReferenceFromPath(
        "/portal?location=studio-olivka&tab=studio-calendar",
      ),
    ).toBe("studio-olivka");
    expect(
      getPortalLocationReferenceFromPath(
        "/portal?locationId=64b000000000000000000002",
      ),
    ).toBe("64b000000000000000000002");
    expect(
      getPortalLocationReferenceFromPath(
        "https://evil.example/portal?location=studio-olivka",
      ),
    ).toBe("");
    expect(
      getPortalLocationReferenceFromPath("/app?location=studio-olivka"),
    ).toBe("");

    const params = new URLSearchParams(
      "location=studio-olivka&locationId=64b000000000000000000001",
    );
    expect(getPortalLocationReferenceFromSearchParams(params)).toBe(
      "studio-olivka",
    );
  });

  it("creates localized absolute links without accepting a hostile origin", () => {
    expect(
      buildLocalizedCustomerPortalUrl({
        origin: "https://studio.example.com",
        locale: "cs",
        location: locations[1],
      }),
    ).toBe("https://studio.example.com/cs/portal?location=studio-olivka");
    expect(
      buildLocalizedCustomerPortalUrl({
        origin: "javascript:alert(1)",
        locale: "en",
        location: locations[1],
      }),
    ).toBe("");
  });

  it.each([
    ["fr-FR", "fr"],
    ["pt_PT", "pt-PT"],
    ["sv-SE", "sv"],
    ["no_NO", "nb"],
    ["fi-FI", "fi"],
    ["hu-HU", "hu"],
    ["el_GR", "el"],
    ["tr-TR", "tr"],
    ["nl_NL", "nl"],
    ["ro-RO", "ro"],
    ["ja-JP", "en"],
    ["pt-BR", "en"],
  ])("canonicalizes portal locale %s as %s", (locale, expected) => {
    expect(
      buildLocalizedCustomerPortalUrl({
        origin: "https://studio.example.com",
        locale,
        location: locations[1],
      }),
    ).toBe(
      `https://studio.example.com/${expected}/portal?location=studio-olivka`,
    );
  });
});

describe("customer portal location selection", () => {
  it("prefers an explicit URL location over the remembered studio", () => {
    expect(
      resolvePortalLocationSelection({
        locations,
        requestedReference: "studio-olivka",
        selectedLocationId: locations[0].id,
      }),
    ).toMatchObject({ location: locations[1], reason: "requested" });
  });

  it("uses a remembered location only when the URL has no studio", () => {
    expect(
      resolvePortalLocationSelection({
        locations,
        selectedLocationId: locations[1].id,
      }),
    ).toMatchObject({ location: locations[1], reason: "selected" });
    expect(
      resolvePortalLocationSelection({
        locations,
        requestedReference: "unavailable",
        selectedLocationId: locations[1].id,
      }),
    ).toMatchObject({ location: null, reason: "unavailable" });
  });

  it("ignores stale remembered locations", () => {
    expect(
      resolvePortalLocationSelection({
        locations,
        selectedLocationId: "removed-studio",
      }),
    ).toMatchObject({ location: null, reason: "required" });
  });

  it("requires an explicit choice when several studios have no link intent", () => {
    expect(resolvePortalLocationSelection({ locations })).toMatchObject({
      location: null,
      reason: "required",
    });
  });

  it("opens the requested secondary studio instead of the primary studio", () => {
    expect(
      resolvePortalLocationSelection({
        locations,
        requestedReference: "studio-olivka",
      }),
    ).toMatchObject({
      location: expect.objectContaining({ name: "Studio Olivka" }),
      reason: "requested",
    });
  });

  it("shows the chooser for an invalid or unavailable explicit studio", () => {
    expect(
      resolvePortalLocationSelection({
        locations,
        requestedReference: "removed-studio",
      }),
    ).toMatchObject({ location: null, reason: "unavailable" });

    expect(
      resolvePortalLocationSelection({
        locations: [
          ...locations,
          {
            id: "64b000000000000000000003",
            slug: "inactive-studio",
            isActive: false,
            booking: { enabled: true },
          },
        ],
        requestedReference: "inactive-studio",
      }),
    ).toMatchObject({ location: null, reason: "unavailable" });
  });

  it("allows customers to switch to an active piece-based studio", () => {
    expect(
      resolvePortalLocationSelection({
        locations: [
          ...locations,
          {
            id: "64b000000000000000000004",
            name: "Piece Studio",
            slug: "piece-studio",
            isActive: true,
            booking: { enabled: false },
          },
        ],
        requestedReference: "piece-studio",
      }),
    ).toMatchObject({
      location: expect.objectContaining({ name: "Piece Studio" }),
      reason: "requested",
    });
  });

  it("opens the only available studio without an unnecessary choice", () => {
    expect(
      resolvePortalLocationSelection({ locations: [locations[0]] }),
    ).toMatchObject({
      location: expect.objectContaining({ name: "Studio Emilka" }),
      reason: "single",
    });
  });
});
