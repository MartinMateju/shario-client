import { configureStore } from "@reduxjs/toolkit";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";

vi.mock("@/lib/features/api/apiSlice", async () => {
  const { createApi, fetchBaseQuery } =
    await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "dashboardCacheTestApi",
      baseQuery: fetchBaseQuery({ baseUrl: "https://api.shario.test" }),
      tagTypes: [
        "DashboardOverview",
        "Reports",
        "Booking",
        "Events",
        "SetupCenter",
      ],
      endpoints: () => ({}),
    }),
  };
});

import { apiSlice } from "@/lib/features/api/apiSlice";
import { dashboardApiSlice } from "@/lib/features/dashboard/dashboardApiSlice";
import { managementApiSlice } from "@/lib/features/dashboard/managementApiSlice";
import { bookingsApiSlice } from "@/lib/features/bookings/bookingsApiSlice";

describe("dashboard booking freshness", () => {
  it("refreshes both scoped dashboard snapshots after a successful booking edit", async () => {
    let bookedParticipants = 2;
    const reads = [];
    server.use(
      http.get(
        "https://api.shario.test/dashboard/:view",
        ({ request, params }) => {
          const url = new URL(request.url);
          const locationId = url.searchParams.get("locationId");
          const date = url.searchParams.get("date");
          reads.push({ view: params.view, locationId, date });
          return HttpResponse.json({
            data: {
              metadata: { locationId, date },
              bookedParticipants,
            },
          });
        },
      ),
      http.patch("https://api.shario.test/bookings", async ({ request }) => {
        bookedParticipants = (await request.json()).numberOfGuests;
        return HttpResponse.json({ id: "booking-1", bookedParticipants });
      }),
    );
    const store = configureStore({
      reducer: { [apiSlice.reducerPath]: apiSlice.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(apiSlice.middleware),
    });
    const scope = { date: "2026-11-12", locationId: "grohova" };
    const overview = store.dispatch(
      dashboardApiSlice.endpoints.getDashboardOverview.initiate(scope),
    );
    const management = store.dispatch(
      managementApiSlice.endpoints.getDashboardManagement.initiate(scope),
    );
    try {
      await Promise.all([overview.unwrap(), management.unwrap()]);
      expect(reads).toHaveLength(2);
      await store
        .dispatch(
          bookingsApiSlice.endpoints.updateBooking.initiate({
            id: "booking-1",
            numberOfGuests: 3,
          }),
        )
        .unwrap();
      await waitFor(() => {
        expect(
          dashboardApiSlice.endpoints.getDashboardOverview.select(scope)(
            store.getState(),
          ).data?.bookedParticipants,
        ).toBe(3);
        expect(
          managementApiSlice.endpoints.getDashboardManagement.select(scope)(
            store.getState(),
          ).data?.bookedParticipants,
        ).toBe(3);
      });
      expect(reads).toHaveLength(4);
      expect(
        reads.every(
          ({ locationId, date }) =>
            locationId === scope.locationId && date === scope.date,
        ),
      ).toBe(true);
    } finally {
      overview.unsubscribe();
      management.unsubscribe();
      store.dispatch(apiSlice.util.resetApiState());
    }
  });
});
