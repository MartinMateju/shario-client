import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      captured.endpoints = endpoints({
        query: (definition) => definition,
        mutation: (definition) => definition,
      });

      return {
        useGetAccessCodePoolsQuery: vi.fn(),
        useCreateAccessCodePoolMutation: vi.fn(),
        useUpdateAccessCodePoolMutation: vi.fn(),
        useArchiveAccessCodePoolMutation: vi.fn(),
        useGetAccessCodesQuery: vi.fn(),
        useCreateAccessCodeMutation: vi.fn(),
        useUpdateAccessCodeMutation: vi.fn(),
        useRetireAccessCodeMutation: vi.fn(),
        useRevealAccessCodeMutation: vi.fn(),
        useBulkCreateAccessCodesMutation: vi.fn(),
        useGetAccessCodeAuditQuery: vi.fn(),
      };
    },
  },
}));

import "@/lib/features/accessCodes/accessCodeApiSlice";

describe("manual access-code API contracts", () => {
  it("uses the pool collection and item routes", () => {
    expect(
      captured.endpoints.getAccessCodePools.query({
        tenantId: "not-a-query-param",
        locationId: "location-1",
      }),
    ).toEqual({
      url: "/access-codes/pools",
      params: { locationId: "location-1" },
    });

    expect(
      captured.endpoints.createAccessCodePool.query({ name: "Front door" }),
    ).toEqual({
      url: "/access-codes/pools",
      method: "POST",
      body: { name: "Front door" },
    });

    expect(
      captured.endpoints.updateAccessCodePool.query({
        id: "pool-1",
        name: "Side door",
      }),
    ).toEqual({
      url: "/access-codes/pools/pool-1",
      method: "PATCH",
      body: { name: "Side door" },
    });

    expect(captured.endpoints.archiveAccessCodePool.query("pool-1")).toEqual({
      url: "/access-codes/pools/pool-1",
      method: "DELETE",
    });
  });

  it("uses the code collection filters and mutation routes", () => {
    expect(
      captured.endpoints.getAccessCodes.query({
        tenantId: "not-a-query-param",
        poolId: "pool-1",
        status: "available",
        type: "single_booking",
        page: 2,
        limit: 25,
      }),
    ).toEqual({
      url: "/access-codes",
      params: {
        poolId: "pool-1",
        status: "available",
        type: "single_booking",
        page: 2,
        limit: 25,
      },
    });

    expect(
      captured.endpoints.createAccessCode.query({
        poolId: "pool-1",
        code: "001234",
      }),
    ).toEqual({
      url: "/access-codes",
      method: "POST",
      body: { poolId: "pool-1", code: "001234" },
    });

    expect(
      captured.endpoints.updateAccessCode.query({
        id: "code-1",
        label: "Weekday code",
      }),
    ).toEqual({
      url: "/access-codes/code-1",
      method: "PATCH",
      body: { label: "Weekday code" },
    });

    expect(captured.endpoints.retireAccessCode.query("code-1")).toEqual({
      url: "/access-codes/code-1",
      method: "DELETE",
    });

    expect(captured.endpoints.revealAccessCode.query("code-1")).toEqual({
      url: "/access-codes/code-1/reveal",
      method: "POST",
    });
  });

  it("uses the bulk-import and audit routes", () => {
    const bulkBody = {
      poolId: "pool-1",
      codes: [{ code: "001234" }, { code: "000007" }],
    };

    expect(captured.endpoints.bulkCreateAccessCodes.query(bulkBody)).toEqual({
      url: "/access-codes/bulk",
      method: "POST",
      body: bulkBody,
    });

    expect(
      captured.endpoints.getAccessCodeAudit.query({
        tenantId: "not-a-query-param",
        poolId: "pool-1",
        page: 3,
        limit: 50,
      }),
    ).toEqual({
      url: "/access-codes/audit",
      params: { poolId: "pool-1", page: 3, limit: 50 },
    });
  });
});
