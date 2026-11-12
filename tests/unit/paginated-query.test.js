import { describe, expect, it, vi } from "vitest";

import { collectPaginatedQuery } from "@/lib/features/api/paginatedQuery";

describe("collectPaginatedQuery", () => {
  it("loads every advertised page and de-duplicates stable records", async () => {
    const baseQuery = vi
      .fn()
      .mockResolvedValueOnce({
        data: { items: [{ id: "one" }, { id: "two" }], pages: 3 },
      })
      .mockResolvedValueOnce({
        data: { items: [{ id: "two" }, { id: "three" }], pages: 3 },
      })
      .mockResolvedValueOnce({
        data: { items: [{ id: "four" }, { name: "No ID" }], pages: 3 },
      });

    const result = await collectPaginatedQuery({
      baseQuery,
      buildRequest: (page) => ({ url: "/items", params: { page } }),
      selectItems: (response) => response.items,
      selectPageCount: (response) => response.pages,
    });

    expect(baseQuery).toHaveBeenCalledTimes(3);
    expect(baseQuery).toHaveBeenNthCalledWith(3, {
      url: "/items",
      params: { page: 3 },
    });
    expect(result.data.items).toEqual([
      { id: "one" },
      { id: "two" },
      { id: "three" },
      { id: "four" },
      { name: "No ID" },
    ]);
  });

  it("propagates a page error instead of returning a partial catalog", async () => {
    const baseQuery = vi
      .fn()
      .mockResolvedValueOnce({ data: { items: [{ id: "one" }], pages: 2 } })
      .mockResolvedValueOnce({ error: { status: 503 } });

    const result = await collectPaginatedQuery({
      baseQuery,
      buildRequest: (page) => ({ url: "/items", params: { page } }),
      selectItems: (response) => response.items,
      selectPageCount: (response) => response.pages,
    });

    expect(result).toEqual({ error: { status: 503 } });
  });

  it("treats missing or zero page metadata as a single page", async () => {
    const baseQuery = vi.fn().mockResolvedValue({
      data: { items: [{ id: "one" }], pages: 0 },
    });

    const result = await collectPaginatedQuery({
      baseQuery,
      buildRequest: (page) => ({ url: "/items", params: { page } }),
      selectItems: (response) => response.items,
      selectPageCount: (response) => response.pages,
    });

    expect(baseQuery).toHaveBeenCalledTimes(1);
    expect(result.data.items).toEqual([{ id: "one" }]);
  });
});
