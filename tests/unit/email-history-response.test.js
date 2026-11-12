import { describe, expect, it } from "vitest";

import { normalizeEmailLogResponse } from "../../src/components/communications/email/emailLogResponse";

describe("communication email history response", () => {
  it("normalizes the paginated backend payload without hiding rows", () => {
    const response = normalizeEmailLogResponse({
      logs: [
        { _id: "log-1", status: "queued" },
        { _id: "log-2", status: "suppressed" },
      ],
      totalCount: 12,
    });

    expect(response.logs).toHaveLength(2);
    expect(response.totalCount).toBe(12);
  });

  it("retains compatibility with legacy array responses", () => {
    expect(normalizeEmailLogResponse([{ _id: "log-1" }])).toEqual({
      logs: [{ _id: "log-1" }],
      totalCount: 1,
    });
  });
});
