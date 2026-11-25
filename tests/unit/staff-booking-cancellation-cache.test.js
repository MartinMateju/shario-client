import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";

vi.mock("@/lib/features/api/apiSlice", async () => {
  const { createApi, fetchBaseQuery } =
    await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "staffCancellationTestApi",
      baseQuery: fetchBaseQuery({ baseUrl: "https://api.shario.test" }),
      tagTypes: [
        "Booking",
        "Credits",
        "SetupCenter",
        "Membership",
        "MembershipLedger",
      ],
      endpoints: () => ({}),
    }),
  };
});

import { bookingsApiSlice } from "@/lib/features/bookings/bookingsApiSlice";
import { membershipsApiSlice } from "@/lib/features/memberships/membershipsApiSlice";

const stores = [];
const createStore = () => {
  const store = configureStore({
    reducer: { [bookingsApiSlice.reducerPath]: bookingsApiSlice.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(bookingsApiSlice.middleware),
  });
  stores.push(store);
  return store;
};

afterEach(() => {
  for (const store of stores.splice(0)) {
    store.dispatch(bookingsApiSlice.util.resetApiState());
  }
});

const historyArgs = { customerId: "customer-1" };
const otherHistoryPage = { customerId: "customer-1", page: 2 };
const queries = [
  [bookingsApiSlice.endpoints.getBookings, undefined],
  [bookingsApiSlice.endpoints.getBookingEditor, "booking-1"],
  [bookingsApiSlice.endpoints.getCustomerBookingHistory, historyArgs],
  [bookingsApiSlice.endpoints.getCustomerBookingHistory, otherHistoryPage],
  [membershipsApiSlice.endpoints.getUserMembershipById, "membership-1"],
  [membershipsApiSlice.endpoints.getUserMemberships, undefined],
];

const subscribe = (store) =>
  queries.map(([endpoint, arg]) => store.dispatch(endpoint.initiate(arg)));

const mockCancellation = ({ fails = false, populatedOwner = false } = {}) => {
  let cancelled = false;
  const calls = { list: 0, editor: 0, history: 0, detail: 0, memberships: 0 };
  const booking = () => ({
    id: "booking-1",
    createdBy: "customer-1",
    status: cancelled ? "cancelled" : "confirmed",
  });
  const membership = () => ({
    id: "membership-1",
    balances: [{ benefitKey: "hours", available: cancelled ? 240 : 180 }],
  });
  server.use(
    http.get("https://api.shario.test/bookings", () => {
      calls.list += 1;
      return HttpResponse.json({ bookings: [booking()] });
    }),
    http.get("https://api.shario.test/bookings/booking-1/editor", () => {
      calls.editor += 1;
      return HttpResponse.json({ booking: booking() });
    }),
    http.get(
      "https://api.shario.test/users/customer-1/bookings",
      ({ request }) => {
        calls.history += 1;
        return HttpResponse.json({
          bookings:
            new URL(request.url).searchParams.get("page") === "2"
              ? []
              : [booking()],
          totalActive: cancelled ? 0 : 1,
        });
      },
    ),
    http.get(
      "https://api.shario.test/memberships/user-memberships/membership-1",
      () => {
        calls.detail += 1;
        return HttpResponse.json({ membership: membership() });
      },
    ),
    http.get("https://api.shario.test/memberships/user-memberships", () => {
      calls.memberships += 1;
      return HttpResponse.json({ memberships: [membership()] });
    }),
    http.patch("https://api.shario.test/bookings/cancel", async ({ request }) => {
      expect(await request.json()).toEqual({ id: "booking-1" });
      if (fails) {
        return HttpResponse.json(
          { message: "The access code has already been issued." },
          { status: 409 },
        );
      }
      cancelled = true;
      return HttpResponse.json({
        booking: {
          ...booking(),
          createdBy: populatedOwner ? { _id: "customer-1" } : "customer-1",
        },
        refundType: "membership_credit",
        membershipQuantity: 60,
      });
    }),
  );
  return calls;
};

describe("staff cancellation cache consistency", () => {
  it.each(["subscribed", "navigated away"])(
    "refreshes booking history, editor and restored membership when %s",
    async (pageState) => {
      const calls = mockCancellation({
        populatedOwner: pageState === "navigated away",
      });
      const store = createStore();
      const subscriptions = subscribe(store);
      await Promise.all(
        subscriptions.map((subscription) => subscription.unwrap()),
      );
      if (pageState === "navigated away") {
        subscriptions.forEach((subscription) => subscription.unsubscribe());
      }

      await store
        .dispatch(
          bookingsApiSlice.endpoints.deleteBooking.initiate({
            id: "booking-1",
          }),
        )
        .unwrap();
      if (pageState === "navigated away") {
        await Promise.all(
          subscribe(store).map((subscription) => subscription.unwrap()),
        );
      }

      await vi.waitFor(() => {
        const state = store.getState();
        expect(
          bookingsApiSlice.endpoints.getBookings.select()(state).data
            .bookings[0].status,
        ).toBe("cancelled");
        expect(
          bookingsApiSlice.endpoints.getBookingEditor.select("booking-1")(state)
            .data.booking.status,
        ).toBe("cancelled");
        expect(
          bookingsApiSlice.endpoints.getCustomerBookingHistory.select(
            historyArgs,
          )(state).data.bookings[0].status,
        ).toBe("cancelled");
        // Pages without the cancelled booking still have changed totals.
        expect(
          bookingsApiSlice.endpoints.getCustomerBookingHistory.select(
            otherHistoryPage,
          )(state).data.totalActive,
        ).toBe(0);
        expect(
          membershipsApiSlice.endpoints.getUserMembershipById.select(
            "membership-1",
          )(state).data.membership.balances[0].available,
        ).toBe(240);
        expect(
          membershipsApiSlice.endpoints.getUserMemberships.select()(state).data
            .memberships[0].balances[0].available,
        ).toBe(240);
      });
      expect(calls).toEqual({
        list: 2,
        editor: 2,
        history: 4,
        detail: 2,
        memberships: 2,
      });
    },
  );

  it("keeps the existing booking and membership after a rejected cancellation", async () => {
    const calls = mockCancellation({ fails: true });
    const store = createStore();
    await Promise.all(
      subscribe(store).map((subscription) => subscription.unwrap()),
    );
    const result = await store.dispatch(
      bookingsApiSlice.endpoints.deleteBooking.initiate({ id: "booking-1" }),
    );
    expect(result.error.status).toBe(409);
    expect(calls).toEqual({
      list: 1,
      editor: 1,
      history: 2,
      detail: 1,
      memberships: 1,
    });
    const state = store.getState();
    expect(
      bookingsApiSlice.endpoints.getBookingEditor.select("booking-1")(state)
        .data.booking.status,
    ).toBe("confirmed");
    expect(
      membershipsApiSlice.endpoints.getUserMembershipById.select(
        "membership-1",
      )(state).data.membership.balances[0].available,
    ).toBe(180);
  });
});
