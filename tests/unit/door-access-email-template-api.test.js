import { configureStore } from "@reduxjs/toolkit";
import { createApi } from "@reduxjs/toolkit/query/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ baseQuery: vi.fn() }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: createApi({
    reducerPath: "doorTemplateTestApi",
    baseQuery: mocks.baseQuery,
    tagTypes: ["EmailTemplates", "CommunicationAutomations"],
    endpoints: () => ({}),
  }),
}));
import { emailTemplatesApiSlice as api } from "@/lib/features/emailTemplates/emailTemplatesApiSlice";

beforeEach(() => {
  mocks.baseQuery.mockReset();
  mocks.baseQuery.mockImplementation(async (request) => ({
    data:
      typeof request === "string"
        ? { locations: [] }
        : { location: { locationId: "location-b" } },
  }));
});
function store() {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });
}

describe("location door-template API", () => {
  it("saves to the selected location endpoint and refreshes the template list", async () => {
    const state = store();
    const list = state.dispatch(
      api.endpoints.getDoorAccessEmailTemplates.initiate(),
    );
    await list;
    const content = {
      defaultLocale: "en",
      contentVariants: {
        en: { subject: "Entry", format: "plain", body: "{{entryCode}}" },
      },
    };
    await state.dispatch(
      api.endpoints.updateDoorAccessEmailTemplate.initiate({
        locationId: "location-b",
        ...content,
      }),
    );
    await vi.waitFor(() => expect(mocks.baseQuery).toHaveBeenCalledTimes(3));
    expect(mocks.baseQuery.mock.calls.map(([request]) => request)).toEqual([
      "/email-templates/door-access",
      {
        url: "/email-templates/door-access/location-b",
        method: "PATCH",
        body: content,
      },
      "/email-templates/door-access",
    ]);
    list.unsubscribe();
    state.dispatch(api.util.resetApiState());
  });

  it("resets the selected location without sending any template or delivery settings", async () => {
    const state = store();
    await state.dispatch(
      api.endpoints.resetDoorAccessEmailTemplate.initiate("location-b"),
    );
    expect(mocks.baseQuery.mock.calls[0][0]).toEqual({
      url: "/email-templates/door-access/location-b",
      method: "DELETE",
    });
    state.dispatch(api.util.resetApiState());
  });
});
