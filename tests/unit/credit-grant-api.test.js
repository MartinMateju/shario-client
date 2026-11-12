import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/test/mocks/server";

// Exercise the real credit endpoint through RTK Query's HTTP serialization.
vi.mock("@/lib/features/api/apiSlice", async () => {
  const { createApi, fetchBaseQuery } =
    await import("@reduxjs/toolkit/query/react");
  return {
    apiSlice: createApi({
      reducerPath: "creditGrantTestApi",
      baseQuery: fetchBaseQuery({ baseUrl: "https://api.skab.test" }),
      tagTypes: ["Credits", "CreditTransactions", "User"],
      endpoints: () => ({}),
    }),
  };
});

import { creditsApiSlice } from "@/lib/features/credits/creditsApiSlice";

const createStore = () =>
  configureStore({
    reducer: { [creditsApiSlice.reducerPath]: creditsApiSlice.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(creditsApiSlice.middleware),
  });

const grant = {
  targetUserId: "customer-1",
  amount: 3400,
  reason: "1x poukaz glazování a 1x točení",
  idempotencyKey: "credit-grant-674459ec-62f6-49a9-9494-d3673325f914",
};

describe("admin credit grant HTTP contract", () => {
  it("sends the form's key in the required header and preserves the grant details", async () => {
    const requests = [];
    server.use(
      http.post(
        "https://api.skab.test/credits/admin/grant",
        async ({ request }) => {
          const key = request.headers.get("Idempotency-Key");
          requests.push({ key, body: await request.json() });
          if (!/^[A-Za-z0-9._:-]{8,160}$/.test(key || "")) {
            return HttpResponse.json(
              { message: "A valid Idempotency-Key header is required." },
              { status: 400 },
            );
          }
          return HttpResponse.json({ balance: 3400, currency: "CZK" });
        },
      ),
    );
    const store = createStore();
    const result = await store.dispatch(
      creditsApiSlice.endpoints.adminGrantCredits.initiate(grant),
    );

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ balance: 3400, currency: "CZK" });
    expect(requests).toEqual([
      {
        key: grant.idempotencyKey,
        body: {
          targetUserId: grant.targetUserId,
          amount: grant.amount,
          reason: grant.reason,
        },
      },
    ]);
    store.dispatch(creditsApiSlice.util.resetApiState());
  });

  it("reuses the key after a lost response so the server can replay the grant", async () => {
    const requests = [];
    const appliedKeys = new Set();
    let balance = 0;
    server.use(
      http.post(
        "https://api.skab.test/credits/admin/grant",
        async ({ request }) => {
          const key = request.headers.get("Idempotency-Key");
          const body = await request.json();
          requests.push(key);
          if (!key) return HttpResponse.json({}, { status: 400 });
          if (!appliedKeys.has(key)) {
            balance += body.amount;
            appliedKeys.add(key);
          }
          // The first grant succeeds, but its response never reaches the client.
          if (requests.length === 1) return HttpResponse.error();
          return HttpResponse.json({ balance, currency: "CZK" });
        },
      ),
    );
    const store = createStore();
    const first = await store.dispatch(
      creditsApiSlice.endpoints.adminGrantCredits.initiate(grant),
    );
    expect(first.error.status).toBe("FETCH_ERROR");

    const retry = await store.dispatch(
      creditsApiSlice.endpoints.adminGrantCredits.initiate(grant),
    );
    expect(retry.data).toEqual({ balance: 3400, currency: "CZK" });
    expect(requests).toEqual([grant.idempotencyKey, grant.idempotencyKey]);
    expect(appliedKeys.size).toBe(1);
    store.dispatch(creditsApiSlice.util.resetApiState());
  });
});
