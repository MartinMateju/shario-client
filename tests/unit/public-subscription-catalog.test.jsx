import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCurrentPlanPrice } from "@/config/subscriptionPlans";
import usePublicSubscriptionCatalog from "@/hooks/usePublicSubscriptionCatalog";
import { fetchPublicSubscriptionCatalog } from "@/lib/publicSubscriptionCatalog";
import { subscriptionCatalog } from "../helpers/subscription-catalog";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("public subscription catalog", () => {
  it("uses backend minor amounts without substituting another currency", () => {
    expect(
      getCurrentPlanPrice(
        "professional",
        "monthly",
        "EUR",
        subscriptionCatalog,
      ),
    ).toBe(5321);
    expect(
      getCurrentPlanPrice("professional", "yearly", "CZK", subscriptionCatalog),
    ).toBe(1187650);
    expect(
      getCurrentPlanPrice(
        "professional",
        "monthly",
        "USD",
        subscriptionCatalog,
      ),
    ).toBeNull();
    expect(
      getCurrentPlanPrice(
        "professional",
        "monthly",
        "PLN",
        subscriptionCatalog,
      ),
    ).toBeNull();
    expect(
      getCurrentPlanPrice("professional", "monthly", "EUR", null),
    ).toBeNull();
  });

  it.each([null, "1234", -1, 1.5, Number.NaN])(
    "rejects invalid amount %s instead of showing zero",
    (amountMinor) => {
      const catalog = {
        plans: [
          { id: "starter", monthly: { EUR: { available: true, amountMinor } } },
        ],
      };
      expect(
        getCurrentPlanPrice("starter", "monthly", "EUR", catalog),
      ).toBeNull();
    },
  );

  it("fetches the public catalog without credentials or authentication", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.test/");
    const fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => subscriptionCatalog });
    vi.stubGlobal("fetch", fetch);
    expect(await fetchPublicSubscriptionCatalog()).toEqual(subscriptionCatalog);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/public/subscription-catalog",
      {
        credentials: "omit",
        signal: undefined,
        headers: { Accept: "application/json" },
      },
    );
  });

  it("exposes loading and then server data", async () => {
    let resolve;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      ),
    );
    const { result } = renderHook(() => usePublicSubscriptionCatalog());
    expect(result.current).toEqual({
      catalog: null,
      isLoading: true,
      isError: false,
    });
    resolve({ ok: true, json: async () => subscriptionCatalog });
    await waitFor(() =>
      expect(result.current.catalog).toEqual(subscriptionCatalog),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it.each([{ ok: false }, { ok: true, json: async () => ({ plans: null }) }])(
    "exposes unavailable pricing for HTTP or malformed-response failures",
    async (response) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      const { result } = renderHook(() => usePublicSubscriptionCatalog());
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.catalog).toBeNull();
      expect(result.current.isLoading).toBe(false);
    },
  );
});
