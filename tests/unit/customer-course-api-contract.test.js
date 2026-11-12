import { describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ endpoints: {} }));
vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints }) => {
      Object.assign(
        captured.endpoints,
        endpoints({
          query: (definition) => definition,
          mutation: (definition) => definition,
        }),
      );
      return {};
    },
  },
}));

import "@/lib/features/products/productsApiSlice";
import "@/lib/features/publicBooking/publicBookingApiSlice";

describe("authenticated course catalog requests", () => {
  it("also sends the chosen studio on legacy anonymous catalog and session requests", async () => {
    expect(
      captured.endpoints.getPublicCourseLocations.query({ tenantSlug: "klei" }),
    ).toEqual({
      url: "/public/tenants/klei/products/courses/locations",
      credentials: "omit",
    });
    const baseQuery = vi.fn().mockResolvedValue({ data: { products: [] } });
    await captured.endpoints.getPublicCourseProducts.queryFn(
      { tenantSlug: "klei", locationId: "vaclavska" },
      {},
      {},
      baseQuery,
    );
    expect(baseQuery).toHaveBeenCalledExactlyOnceWith({
      url: "/public/tenants/klei/products/courses",
      credentials: "omit",
      params: { locationId: "vaclavska", page: 1, limit: 100 },
    });
    expect(
      captured.endpoints.getPublicCourseSessions.query({
        tenantSlug: "klei",
        productId: "wheel",
        locationId: "vaclavska",
      }),
    ).toEqual({
      url: "/public/tenants/klei/products/wheel/sessions",
      credentials: "omit",
      params: { locationId: "vaclavska" },
    });
  });
  it("scopes every catalog page to the selected studio without leaking the client cache owner key", async () => {
    const baseQuery = vi.fn().mockResolvedValue({
      data: {
        products: [
          {
            id: "wheel",
            kind: "class",
            courseContent: { name: { en: "Wheel" } },
            nextSession: { id: "date", location: { id: "vaclavska" } },
          },
        ],
        totalPages: 1,
      },
    });
    const response = await captured.endpoints.getCustomerCourseProducts.queryFn(
      { locationId: "vaclavska", ownerScope: "tenant:customer" },
      {},
      {},
      baseQuery,
    );
    expect(baseQuery).toHaveBeenCalledExactlyOnceWith({
      url: "/products/customer-catalog/courses",
      params: { locationId: "vaclavska", page: 1, limit: 100 },
    });
    expect(response.data[0]).toMatchObject({
      id: "wheel",
      nextSession: { id: "date", location: { id: "vaclavska" } },
      courseContent: { name: { en: "Wheel" } },
    });
  });

  it("uses authenticated scoped sessions and allowlists the response instead of exposing attendees", () => {
    const endpoint = captured.endpoints.getCustomerCourseSessions;
    expect(
      endpoint.query({
        productId: "wheel",
        locationId: "vaclavska",
        ownerScope: "tenant:customer",
      }),
    ).toEqual({
      url: "/products/customer-catalog/wheel/sessions",
      params: { locationId: "vaclavska", limit: 100 },
    });
    const [session] = endpoint.transformResponse({
      sessions: [
        {
          id: "date",
          start: "2099-11-01T10:00:00Z",
          end: "2099-11-01T12:00:00Z",
          location: { id: "vaclavska" },
          remainingCapacity: 2,
          capacity: 4,
          user: { email: "private@example.test" },
          attendees: [{ name: "Private" }],
        },
      ],
    });
    expect(session).toMatchObject({
      id: "date",
      location: { id: "vaclavska" },
      remainingCapacity: 2,
    });
    expect(session).not.toHaveProperty("user");
    expect(session).not.toHaveProperty("attendees");
  });
});
