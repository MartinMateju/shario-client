import { describe, expect, it } from "vitest";

import { logOut } from "@/lib/features/auth/authSlice";
import {
  formatLocationAddress,
  getBookingLocationId,
  getLocationId,
  getPrimaryLocation,
  getTenantIdFromUser,
  isMongoObjectId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";
import studioContextReducer, {
  clearActiveStudioId,
  resetStudioContext,
  selectActiveStudioId,
  selectHasActiveStudio,
  selectStudioContext,
  setActiveStudioId,
} from "@/lib/features/studio/studioContextSlice";

const tenantA = "64b000000000000000000001";
const tenantB = "64b000000000000000000002";
const studioA = "64b000000000000000000011";
const studioB = "64b000000000000000000012";

describe("location identifiers and response normalization", () => {
  it("accepts trimmed Mongo object IDs and rejects malformed values", () => {
    expect(isMongoObjectId(` ${tenantA} `)).toBe(true);
    expect(isMongoObjectId("not-an-object-id")).toBe(false);
    expect(isMongoObjectId(null)).toBe(false);
  });

  it("reads canonical and legacy location identifiers", () => {
    expect(getLocationId({ id: studioA })).toBe(studioA);
    expect(getLocationId({ _id: studioB })).toBe(studioB);
    expect(getLocationId({ id: "invalid", _id: studioB })).toBe("");
    expect(getLocationId(null)).toBe("");
  });

  it("extracts a tenant ID from supported user contracts", () => {
    expect(getTenantIdFromUser({ tenantId: tenantA })).toBe(tenantA);
    expect(getTenantIdFromUser({ tenant: { _id: tenantB } })).toBe(tenantB);
    expect(getTenantIdFromUser({ tenant: tenantA })).toBe(tenantA);
    expect(getTenantIdFromUser({ tenantId: "invalid" })).toBe("");
  });

  it("normalizes, deduplicates, and filters location responses", () => {
    const response = {
      locations: [
        { _id: studioA, name: "Alpha" },
        { id: studioA, name: "Duplicate" },
        { id: studioB, name: "Beta" },
        { id: "invalid", name: "Invalid" },
      ],
    };

    expect(normalizeLocationsResponse(response)).toEqual([
      { _id: studioA, id: studioA, name: "Alpha" },
      { id: studioB, name: "Beta" },
    ]);
    expect(normalizeLocationsResponse({ locations: "invalid" })).toEqual([]);
  });

  it("formats optional address parts without dangling separators", () => {
    expect(
      formatLocationAddress({
        address: {
          line1: "Grohova 102/3",
          line2: "Courtyard",
          postalCode: "602 00",
          city: "Brno",
        },
      }),
    ).toBe("Grohova 102/3, Courtyard, 602 00 Brno");
    expect(formatLocationAddress({ address: { city: "Brno" } })).toBe("Brno");
    expect(formatLocationAddress({ address: "Brno" })).toBe("");
  });

  it("resolves booking location references in priority order", () => {
    expect(
      getBookingLocationId({
        locationId: studioA,
        location: { _id: studioB },
      }),
    ).toBe(studioA);
    expect(getBookingLocationId({ location: { _id: studioB } })).toBe(studioB);
    expect(getBookingLocationId({ location: studioA })).toBe(studioA);
    expect(getBookingLocationId({ location: "invalid" })).toBe("");
  });

  it("chooses an active primary location and safe fallbacks", () => {
    const locations = [
      { id: studioA, isPrimary: true, isActive: false },
      { id: studioB, isActive: true },
    ];

    expect(getPrimaryLocation(locations)).toBe(locations[1]);
    expect(
      getPrimaryLocation([{ id: studioA, isPrimary: true }, { id: studioB }])
        .id,
    ).toBe(studioA);
    expect(getPrimaryLocation("invalid")).toBeNull();
  });
});

describe("active studio context", () => {
  const initialState = { tenantId: null, activeStudioId: null };

  it("stores a studio only when both identifiers are valid", () => {
    expect(
      studioContextReducer(
        initialState,
        setActiveStudioId({ tenantId: tenantA, studioId: studioA }),
      ),
    ).toEqual({ tenantId: tenantA, activeStudioId: studioA });

    expect(
      studioContextReducer(
        initialState,
        setActiveStudioId({ tenantId: "invalid", studioId: studioA }),
      ),
    ).toEqual(initialState);
  });

  it("clears and resets context, including on logout", () => {
    const populated = { tenantId: tenantA, activeStudioId: studioA };

    expect(studioContextReducer(populated, clearActiveStudioId())).toEqual(
      initialState,
    );
    expect(studioContextReducer(populated, resetStudioContext())).toEqual(
      initialState,
    );
    expect(studioContextReducer(populated, logOut())).toEqual(initialState);
  });

  it("exposes a studio only for the authenticated tenant", () => {
    const matching = {
      auth: { userInfo: { tenant: tenantA } },
      studioContext: { tenantId: tenantA, activeStudioId: studioA },
    };
    const mismatched = {
      ...matching,
      auth: { userInfo: { tenant: tenantB } },
    };

    expect(selectStudioContext(matching)).toBe(matching.studioContext);
    expect(selectActiveStudioId(matching)).toBe(studioA);
    expect(selectHasActiveStudio(matching)).toBe(true);
    expect(selectActiveStudioId(mismatched)).toBeNull();
    expect(selectHasActiveStudio(mismatched)).toBe(false);
  });

  it("uses safe selector defaults for absent or invalid context", () => {
    expect(selectStudioContext({})).toEqual(initialState);
    expect(
      selectActiveStudioId({
        auth: { userInfo: { tenant: tenantA } },
        studioContext: {
          tenantId: tenantA,
          activeStudioId: "invalid",
        },
      }),
    ).toBeNull();
  });
});
