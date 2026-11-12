import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => ({
      endpoints: endpoints({
        query: (definition) => ({
          ...definition,
          select: () => () => ({}),
        }),
        mutation: (definition) => definition,
      }),
    }),
  },
}));

import { usersApiSlice } from "@/lib/features/users/usersApiSlice";

describe("users API organization scope", () => {
  it("preserves the shared tenant user directory without location params", () => {
    const request = usersApiSlice.endpoints.getUsers.query({
      locationId: "must-not-be-sent",
      userId: "cache-only",
    });

    expect(request.url).toBe("/users");
    expect(request).not.toHaveProperty("params");
  });

  it("explicitly scopes customers without forwarding a tenant or location", () => {
    const request = usersApiSlice.endpoints.getUsers.query({
      tenantRole: "customer",
      tenantId: "must-not-be-sent",
      locationId: "must-not-be-sent",
      userId: "cache-only",
    });
    expect(request.url).toBe("/users");
    expect(request.params).toEqual({ tenantRole: "customer" });
  });
});
