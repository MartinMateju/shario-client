import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canRequestRollback,
  downloadCsvReport,
  normalizeImportHistoryPage,
  normalizeRollbackPreview,
} from "@/components/migration/importHistory.utils";

describe("import history normalization", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps server pagination separate from row results", () => {
    expect(
      normalizeImportHistoryPage({
        data: {
          items: [{ id: "import-1" }],
          pagination: { page: 3, limit: 10, total: 42, totalPages: 5 },
        },
      }),
    ).toEqual({
      sessions: [{ id: "import-1" }],
      pagination: { page: 3, limit: 10, total: 42, totalPages: 5 },
    });
  });

  it("normalizes preview row counts without summing mutation journals", () => {
    expect(
      normalizeRollbackPreview({
        data: {
          sessionId: "import-1",
          revision: "revision-1",
          previewToken: "preview-1",
          available: true,
          eligibleRows: 2,
          blockedRows: 1,
          totalRows: 3,
          reasonGroups: [{ code: "DEPENDENT_RECORDS", count: 1 }],
          mutationCount: 7,
        },
      }),
    ).toMatchObject({
      eligibleRows: 2,
      previewToken: "preview-1",
      blockedRows: 1,
      totalRows: 3,
      reasonGroups: [{ code: "dependent_records", count: 1 }],
    });
  });

  it("allows a fresh eligibility retry after partial or failed rollback", () => {
    const base = { status: "completed" };

    expect(
      canRequestRollback({ ...base, rollback: { status: "partial" } }),
    ).toBe(true);
    expect(
      canRequestRollback({ ...base, rollback: { status: "failed" } }),
    ).toBe(true);
    expect(
      canRequestRollback({ ...base, rollback: { status: "completed" } }),
    ).toBe(false);
  });

  it("creates a CSV download and revokes its object URL after the click lifecycle", () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadCsvReport({ csv: "row,status\n1,created", fileName: "import.csv" });

    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });

  it("rejects empty or structured error payloads instead of downloading them", () => {
    expect(() => downloadCsvReport({ csv: "", fileName: "empty.csv" })).toThrow(
      "EMPTY_IMPORT_REPORT",
    );
    expect(() =>
      downloadCsvReport({
        csv: { code: "REPORT_EXPIRED" },
        fileName: "error.csv",
      }),
    ).toThrow("EMPTY_IMPORT_REPORT");
  });
});
