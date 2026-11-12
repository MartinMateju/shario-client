import { describe, expect, it } from "vitest";

import {
  getLocationCreateHref,
  getLocationEditHref,
  getLocationListHref,
} from "@/components/views/locations/locations.navigation";

describe("guided location navigation", () => {
  it("moves legacy create requests to the full page and preserves context", () => {
    expect(
      getLocationCreateHref(
        new URLSearchParams(
          "action=create&setupStep=location&source=launch-center",
        ),
      ),
    ).toBe(
      "/app/settings/locations/new?setupStep=location&source=launch-center",
    );
  });

  it("returns the canonical create route when no context remains", () => {
    expect(getLocationCreateHref(new URLSearchParams("action=create"))).toBe(
      "/app/settings/locations/new",
    );
  });

  it("builds a dedicated edit route and preserves durable context", () => {
    expect(
      getLocationEditHref(
        "64b000000000000000000001",
        new URLSearchParams(
          "action=edit&guide=studio_location_setup&locationId=legacy&setupStep=location&source=launch-center",
        ),
      ),
    ).toBe(
      "/app/settings/locations/64b000000000000000000001/edit?setupStep=location&source=launch-center",
    );
  });

  it("builds a safe edit return route without reopening guided setup", () => {
    expect(
      getLocationListHref(
        new URLSearchParams(
          "action=edit&guide=studio_location_setup&locationId=legacy&setupStep=location&source=launch-center&tab=details",
        ),
        { clearSetupStep: true },
      ),
    ).toBe("/app/settings/locations?source=launch-center&tab=details");
  });
});
