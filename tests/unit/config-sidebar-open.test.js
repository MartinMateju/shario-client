import { describe, expect, it } from "vitest";

import configReducer, {
  closeSidebar,
  openSidebar,
} from "@/lib/features/config/configSlice";

describe("booking sidebar open action", () => {
  it("opens with the selected calendar date and prefill atomically", () => {
    const prefill = {
      start: "2099-08-04T09:00:00.000Z",
      end: "2099-08-04T10:30:00.000Z",
      source: "calendar-selection",
    };
    const state = configReducer(
      undefined,
      openSidebar({
        context: "studio",
        locationId: "studio-1",
        selectedDate: "2099-08-04",
        prefill,
      }),
    );

    expect(state).toMatchObject({
      isSidebarOpen: true,
      selectedDate: "2099-08-04",
      sidebarContext: "studio",
      sidebarLocationId: "studio-1",
      sidebarPrefill: prefill,
    });
  });

  it("clears the retained location and prefill when closed", () => {
    const openState = configReducer(
      undefined,
      openSidebar({
        context: "studio",
        locationId: "studio-1",
        prefill: {
          start: "2099-08-04T09:00:00.000Z",
          end: "2099-08-04T10:30:00.000Z",
        },
      }),
    );

    const state = configReducer(openState, closeSidebar());

    expect(state).toMatchObject({
      isSidebarOpen: false,
      sidebarLocationId: null,
      sidebarPrefill: null,
    });
  });
});
