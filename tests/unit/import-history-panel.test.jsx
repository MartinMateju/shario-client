import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import enMessages from "@/messages/en.json";

const mocks = vi.hoisted(() => ({
  historyArgs: [],
  detailOptions: [],
  historyData: null,
  detailData: null,
  previewData: null,
  preview: vi.fn(),
  rollback: vi.fn(),
  importReport: vi.fn(),
  rollbackReport: vi.fn(),
  refetchHistory: vi.fn(),
  refetchDetail: vi.fn(),
}));

const historyMessages = enMessages.MigrationCenter.historyV2;

const getHistoryMessage = (key) =>
  key
    .split(".")
    .reduce((message, segment) => message?.[segment], historyMessages);

const translate = (key, values = {}) => {
  const message = getHistoryMessage(key);
  if (message !== undefined && typeof message !== "string") {
    throw new TypeError(`Translation ${key} must resolve to a string`);
  }
  if (key === "viewDetailsFor") return `View details for ${values.file}`;
  if (key === "rollback.submitSafe" || key === "rollback.submitAll") {
    return `Roll back ${values.count} safe rows`;
  }
  if (key === "rollback.blockedDescription") {
    return `${values.count} rows are blocked`;
  }
  if (key === "pagination.summary") {
    return `${values.total} imports · page ${values.page} of ${values.pages}`;
  }
  return key;
};
translate.has = (key) => !key.endsWith("unexpected_reason");

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => translate,
}));

vi.mock("@/lib/features/data-import/dataImportApiSlice", () => ({
  useGetDataImportHistoryQuery: (args) => {
    mocks.historyArgs.push(args);
    return {
      data: mocks.historyData,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: mocks.refetchHistory,
    };
  },
  useGetDataImportSessionQuery: (_id, options) => {
    mocks.detailOptions.push(options);
    return {
      data: mocks.detailData,
      isLoading: false,
      isError: false,
      refetch: mocks.refetchDetail,
    };
  },
  useLazyGetDataImportRollbackPreviewQuery: () => [
    mocks.preview,
    { isFetching: false },
  ],
  useRollbackDataImportMutation: () => [mocks.rollback, { isLoading: false }],
  useLazyDownloadDataImportReportQuery: () => [
    mocks.importReport,
    { isFetching: false },
  ],
  useLazyDownloadDataImportRollbackReportQuery: () => [
    mocks.rollbackReport,
    { isFetching: false },
  ],
}));

import ImportHistoryPanel from "@/components/migration/ImportHistoryPanel";

const session = (rollback = { status: "available" }) => ({
  id: "import-1",
  entityType: "customers",
  originalFileName: "customers.csv",
  status: "completed",
  createdAt: "2026-08-01T10:00:00.000Z",
  reportAvailable: true,
  reportAvailableUntil: "2099-08-01T10:00:00.000Z",
  summary: { total: 6, created: 4, updated: 2, failed: 0 },
  rollback,
});

const renderPanel = (props = {}) =>
  render(
    <ImportHistoryPanel
      entities={["customers", "credits"]}
      selectedEntity="customers"
      canRollbackEntity={() => true}
      onOpenSession={vi.fn()}
      {...props}
    />,
  );

const openDetails = async (user) => {
  const buttons = screen.getAllByRole("button", {
    name: "View details for customers.csv",
  });
  await user.click(buttons[0]);
  return screen.getByRole("dialog", { name: "detail.title" });
};

describe("ImportHistoryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.historyArgs.length = 0;
    mocks.detailOptions.length = 0;
    mocks.historyData = {
      data: {
        items: [session()],
        pagination: { page: 1, limit: 10, total: 21, totalPages: 3 },
      },
    };
    mocks.detailData = { data: session() };
    mocks.previewData = {
      data: {
        sessionId: "import-1",
        revision: "revision-1",
        previewToken: "preview-1",
        available: true,
        eligibleRows: 4,
        blockedRows: 2,
        totalRows: 6,
        reasonGroups: [{ code: "RECORD_CHANGED", count: 2 }],
      },
    };
    mocks.preview.mockImplementation(() => ({
      unwrap: () => Promise.resolve(mocks.previewData),
    }));
    mocks.rollback.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({ data: { rollback: { status: "queued" } } }),
    }));
    mocks.importReport.mockImplementation(() => ({
      unwrap: () => Promise.resolve("row,status\n1,created"),
    }));
    mocks.rollbackReport.mockImplementation(() => ({
      unwrap: () => Promise.resolve("row,status\n1,restored"),
    }));
    mocks.refetchHistory.mockResolvedValue({});
    mocks.refetchDetail.mockResolvedValue({});
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:report"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("applies server filters and resets pagination when filters change", async () => {
    const user = userEvent.setup();
    renderPanel();

    const entityFilter = screen.getByLabelText("filters.entity");
    expect(
      within(entityFilter)
        .getAllByRole("option")
        .map((option) => option.value),
    ).toEqual(["customers", "credits"]);
    expect(mocks.historyArgs.at(-1).entity).toBe("customers");
    expect(
      screen.getByRole("table", { name: "tableCaption" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "filters.rollbackStatus" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "pagination.next" }));
    expect(mocks.historyArgs.at(-1).page).toBe(2);

    await user.type(screen.getByLabelText("filters.search"), "legacy");
    await user.selectOptions(
      screen.getByLabelText("filters.importStatus"),
      "completed",
    );
    await user.type(screen.getByLabelText("filters.from"), "2026-07-01");
    await user.type(screen.getByLabelText("filters.to"), "2026-08-01");
    await user.click(screen.getByRole("button", { name: "filters.apply" }));

    expect(mocks.historyArgs.at(-1)).toMatchObject({
      page: 1,
      search: "legacy",
      status: "completed",
      createdFrom: "2026-07-01",
      createdTo: "2026-08-01",
    });
  });

  it("requires a fresh preview and explicit confirmation for safe rows", async () => {
    const user = userEvent.setup();
    renderPanel();
    const detail = await openDetails(user);

    await user.click(
      within(detail).getByRole("button", { name: "rollback.open" }),
    );
    const rollbackDialog = await screen.findByRole("dialog", {
      name: "rollback.title",
    });
    await waitFor(() =>
      expect(
        within(rollbackDialog).getByRole("button", { name: "close" }),
      ).toHaveFocus(),
    );
    expect(mocks.preview).toHaveBeenCalledWith({ id: "import-1" }, false);
    expect(
      within(rollbackDialog).getByText("2 rows are blocked"),
    ).toBeInTheDocument();
    expect(
      within(rollbackDialog).getByText("rollback.reasons.record_changed"),
    ).toBeInTheDocument();

    const submit = within(rollbackDialog).getByRole("button", {
      name: "Roll back 4 safe rows",
    });
    expect(submit).toBeDisabled();
    await user.click(within(rollbackDialog).getByRole("checkbox"));
    await user.click(submit);

    await waitFor(() => expect(mocks.rollback).toHaveBeenCalledOnce());
    expect(mocks.rollback.mock.calls[0][0]).toMatchObject({
      id: "import-1",
      revision: "revision-1",
      previewToken: "preview-1",
      idempotencyKey: expect.any(String),
    });
  });

  it("discards stale eligibility and requires another fresh preview", async () => {
    const user = userEvent.setup();
    mocks.rollback.mockImplementationOnce(() => ({
      unwrap: () =>
        Promise.reject({
          status: 409,
          data: { code: "ROLLBACK_PREVIEW_STALE" },
        }),
    }));
    renderPanel();
    const detail = await openDetails(user);
    await user.click(
      within(detail).getByRole("button", { name: "rollback.open" }),
    );
    const rollbackDialog = await screen.findByRole("dialog", {
      name: "rollback.title",
    });
    await user.click(within(rollbackDialog).getByRole("checkbox"));
    await user.click(
      within(rollbackDialog).getByRole("button", {
        name: "Roll back 4 safe rows",
      }),
    );

    expect(
      await within(rollbackDialog).findByText("rollback.staleTitle"),
    ).toBeInTheDocument();
    expect(
      within(rollbackDialog).queryByRole("checkbox"),
    ).not.toBeInTheDocument();

    mocks.previewData.data.revision = "revision-2";
    mocks.previewData.data.previewToken = "preview-2";
    await user.click(
      within(rollbackDialog).getByRole("button", {
        name: "rollback.checkAgain",
      }),
    );
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledTimes(2));
    expect(
      await within(rollbackDialog).findByRole("checkbox"),
    ).toBeInTheDocument();
  });

  it("disables rollback when no row is safe and hides it without destructive access", async () => {
    const user = userEvent.setup();
    mocks.previewData.data.eligibleRows = 0;
    mocks.previewData.data.blockedRows = 6;
    renderPanel();
    const detail = await openDetails(user);
    await user.click(
      within(detail).getByRole("button", { name: "rollback.open" }),
    );
    const rollbackDialog = await screen.findByRole("dialog", {
      name: "rollback.title",
    });
    await user.click(within(rollbackDialog).getByRole("checkbox"));
    expect(
      within(rollbackDialog).getByRole("button", {
        name: "Roll back 0 safe rows",
      }),
    ).toBeDisabled();

    await user.click(
      within(rollbackDialog).getByRole("button", { name: "rollback.cancel" }),
    );
    await user.click(within(detail).getByRole("button", { name: "close" }));
    renderPanel({ canRollbackEntity: () => false });
    const dialogs = await screen.findAllByRole("button", {
      name: "View details for customers.csv",
    });
    await user.click(dialogs.at(-1));
    expect(
      screen.queryByRole("button", { name: "rollback.open" }),
    ).not.toBeInTheDocument();
  });

  it("resumes active rollback polling and exposes partial retry and its report", async () => {
    const user = userEvent.setup();
    mocks.historyData.data.items = [session({ status: "processing" })];
    mocks.detailData = {
      data: session({
        status: "processing",
        counters: {},
      }),
    };
    const { rerender } = renderPanel();
    await openDetails(user);
    await waitFor(() =>
      expect(
        mocks.detailOptions.some((options) => options.pollingInterval === 2000),
      ).toBe(true),
    );
    expect(screen.getByText("detail.progress.processing")).toBeInTheDocument();

    mocks.detailData = {
      data: session({
        status: "partial",
        reportAvailable: true,
        reportAvailableUntil: "2099-08-01T10:00:00.000Z",
        counters: { restored: 2, blocked: 2, failed: 2 },
      }),
    };
    rerender(
      <ImportHistoryPanel
        entities={["customers", "credits"]}
        selectedEntity="customers"
        canRollbackEntity={() => true}
      />,
    );
    expect(await screen.findByText("detail.partialTitle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "rollback.retry" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "reports.rollback" }),
    ).toBeInTheDocument();
  });

  it("downloads import and rollback reports separately and revokes blob URLs", async () => {
    const user = userEvent.setup();
    mocks.detailData = {
      data: session({
        status: "completed",
        reportAvailable: true,
        reportAvailableUntil: "2099-08-01T10:00:00.000Z",
      }),
    };
    renderPanel();
    const detail = await openDetails(user);

    await user.click(
      within(detail).getByRole("button", { name: "reports.import" }),
    );
    await user.click(
      within(detail).getByRole("button", { name: "reports.rollback" }),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
    expect(mocks.importReport).toHaveBeenCalledWith({ id: "import-1" }, false);
    expect(mocks.rollbackReport).toHaveBeenCalledWith(
      { id: "import-1" },
      false,
    );
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2));
  });

  it("explains legacy imports instead of exposing a rollback action", async () => {
    const user = userEvent.setup();
    mocks.detailData = {
      data: session({
        status: "unavailable",
        unavailableReason: "legacy_manifest_unavailable",
      }),
    };
    renderPanel();
    await openDetails(user);

    expect(
      screen.getByText("detail.unavailableReasons.legacy_manifest_unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "rollback.open" }),
    ).not.toBeInTheDocument();
  });

  it("uses truthful rollback counters and disables reports without retention metadata", async () => {
    const user = userEvent.setup();
    mocks.detailData = {
      data: {
        ...session({
          status: "completed",
          counters: { archived: 3, compensated: 1 },
        }),
        reportAvailable: true,
        reportAvailableUntil: null,
      },
    };
    renderPanel();
    const detail = await openDetails(user);

    const archivedLabel = within(detail).getByText(
      "detail.rollbackCounters.archived",
    );
    expect(
      within(archivedLabel.parentElement).getByText("3"),
    ).toBeInTheDocument();
    expect(
      within(detail).queryByText("detail.rollbackCounters.removed"),
    ).not.toBeInTheDocument();
    expect(
      within(detail).queryByRole("button", { name: "reports.import" }),
    ).not.toBeInTheDocument();
    expect(
      within(detail).getByText("reports.importUnavailable"),
    ).toBeInTheDocument();
  });
});
