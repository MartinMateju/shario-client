import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";

vi.mock("@/lib/features/api/apiSlice", async () => {
  const { createApi, fetchBaseQuery } =
    await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "membershipCancellationTestApi",
      baseQuery: fetchBaseQuery({ baseUrl: "https://api.skab.test" }),
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

const redemption = { id: "debit", type: "redemption", amount: -60 };
const reversal = { id: "refund", type: "reversal", amount: 60 };
const ledgerArgs = { limit: 20 };

const mockMembershipCancellation = ({ fails = false } = {}) => {
  let cancelled = false;
  const calls = { membership: 0, ledger: 0, bookings: 0 };
  server.use(
    http.get("https://api.skab.test/memberships/mine", () => {
      calls.membership += 1;
      return HttpResponse.json({
        membership: {
          id: "membership-1",
          balances: [{ benefitKey: "hours", available: cancelled ? 240 : 180 }],
        },
      });
    }),
    http.get("https://api.skab.test/memberships/mine/ledger", () => {
      calls.ledger += 1;
      return HttpResponse.json({
        entries: cancelled ? [reversal, redemption] : [redemption],
      });
    }),
    http.get("https://api.skab.test/bookings/mine", () => {
      calls.bookings += 1;
      return HttpResponse.json({ bookings: [] });
    }),
    http.patch("https://api.skab.test/bookings/mine/booking-1/cancel", () => {
      if (fails) {
        return HttpResponse.json(
          { message: "The access code has already been issued." },
          { status: 409 },
        );
      }
      cancelled = true;
      return HttpResponse.json({
        booking: { id: "booking-1", status: "cancelled" },
        refundType: "membership_credit",
        membershipQuantity: 60,
      });
    }),
  );
  return calls;
};

const subscribeToMembership = async (store) => {
  const membership = store.dispatch(
    membershipsApiSlice.endpoints.getMyMembership.initiate(),
  );
  const ledger = store.dispatch(
    membershipsApiSlice.endpoints.getMyMembershipLedger.initiate(ledgerArgs),
  );
  await Promise.all([membership.unwrap(), ledger.unwrap()]);
  return { membership, ledger };
};

describe("membership refund cache after cancelling a booking", () => {
  it.each(["subscribed", "navigated away"])(
    "shows the returned hour and refund history without reload when %s",
    async (pageState) => {
      const calls = mockMembershipCancellation();
      const store = createStore();
      const subscriptions = await subscribeToMembership(store);
      expect(
        membershipsApiSlice.endpoints.getMyMembershipLedger.select(ledgerArgs)(
          store.getState(),
        ).data.entries,
      ).toEqual([redemption]);

      if (pageState === "navigated away") {
        subscriptions.membership.unsubscribe();
        subscriptions.ledger.unsubscribe();
      }
      await store
        .dispatch(
          bookingsApiSlice.endpoints.cancelBooking.initiate({
            id: "booking-1",
          }),
        )
        .unwrap();
      if (pageState === "navigated away") {
        await subscribeToMembership(store);
      }

      await vi.waitFor(() => {
        expect(
          membershipsApiSlice.endpoints.getMyMembership.select()(
            store.getState(),
          ).data.membership.balances[0].available,
        ).toBe(240);
        expect(
          membershipsApiSlice.endpoints.getMyMembershipLedger.select(
            ledgerArgs,
          )(store.getState()).data.entries,
        ).toEqual([reversal, redemption]);
      });
      expect(calls.membership).toBe(2);
      expect(calls.ledger).toBe(2);
    },
  );

  it("preserves failed-cancellation booking refresh without reporting a membership refund", async () => {
    const calls = mockMembershipCancellation({ fails: true });
    const store = createStore();
    await subscribeToMembership(store);
    await store
      .dispatch(bookingsApiSlice.endpoints.getUserBookings.initiate())
      .unwrap();

    const result = await store.dispatch(
      bookingsApiSlice.endpoints.cancelBooking.initiate({ id: "booking-1" }),
    );

    expect(result.error.status).toBe(409);
    await vi.waitFor(() => expect(calls.bookings).toBe(2));
    expect(calls.membership).toBe(1);
    expect(calls.ledger).toBe(1);
    expect(
      membershipsApiSlice.endpoints.getMyMembershipLedger.select(ledgerArgs)(
        store.getState(),
      ).data.entries,
    ).toEqual([redemption]);
  });
});
