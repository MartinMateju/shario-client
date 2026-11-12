import { describe, expect, it, vi } from "vitest";

import { collectPublicCourseProducts } from "@/lib/features/products/publicCourseProductsQuery";

describe("public course product pagination", () => {
  it("collects every public class page for complete category browsing", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `class-${index + 1}`,
      kind: "class",
      classCategory: "Wheel throwing",
    }));
    const baseQuery = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPage })
      .mockResolvedValueOnce({
        data: [
          {
            id: "class-101",
            kind: "class",
            classCategory: "Modeling",
          },
        ],
      });
    const buildRequest = (page, limit) => ({
      url: "/public/tenants/atelier-klei/products/courses",
      credentials: "omit",
      params: { page, limit },
    });

    await expect(
      collectPublicCourseProducts({ baseQuery, buildRequest }),
    ).resolves.toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: "class-101",
          classCategory: "Modeling",
        }),
      ]),
    });
    expect(baseQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ params: { page: 1, limit: 100 } }),
    );
    expect(baseQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ params: { page: 2, limit: 100 } }),
    );
  });

  it("returns the API error without serving a partial catalog", async () => {
    const error = { status: 503, data: { message: "Unavailable" } };
    const baseQuery = vi.fn().mockResolvedValue({ error });

    await expect(
      collectPublicCourseProducts({
        baseQuery,
        buildRequest: vi.fn(() => ({ url: "/courses" })),
      }),
    ).resolves.toEqual({ error });
  });

  it("stops when an older server repeats its unpaginated first page", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `class-${index + 1}`,
      kind: "class",
    }));
    const baseQuery = vi.fn().mockResolvedValue({ data: firstPage });

    await expect(
      collectPublicCourseProducts({
        baseQuery,
        buildRequest: (page, limit) => ({
          url: "/courses",
          params: { page, limit },
        }),
      }),
    ).resolves.toMatchObject({ data: { length: 100 } });
    expect(baseQuery).toHaveBeenCalledTimes(2);
  });
});
