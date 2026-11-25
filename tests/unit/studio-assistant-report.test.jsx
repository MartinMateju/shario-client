import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: { available: true, cacheScope: "tenant-a:user-a:1" },
  workspaceAccess: { permissions: [] },
  generate: vi.fn(),
  download: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (namespace) => (key, values) =>
    `${namespace}.${key}${values?.date ? ` ${values.date}` : ""}`,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: (state) => state.workspaceAccess,
}));
vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => mocks.access,
}));
vi.mock("@/lib/features/dashboard/managementApiSlice", () => ({
  useGenerateStudioReportMutation: () => [mocks.generate, {}],
  useDownloadStudioReportPdfMutation: () => [mocks.download, {}],
}));

import StudioAssistantReport from "@/components/ai/StudioAssistantReport";

const report = {
  id: "report-a",
  locationLabel: "Grohova",
  snapshot: {
    metadata: {
      period: { from: "2026-11-01", to: "2026-11-12" },
      comparisonPeriod: { from: "2026-10-01", to: "2026-10-12" },
    },
  },
  narrative: {
    mode: "ai",
    headline: "Studio performance",
    summary: "A saved summary from studio data.",
    highlights: ["More bookings this month."],
    attention: [],
    recommendations: ["Review quieter hours."],
    dataLimitations: ["Attendance is not verified."],
  },
  sections: [
    {
      key: "visits",
      title: "Booking activity",
      columns: ["Metric", "Current", "Previous"],
      rows: [{ label: "Participants", value: "42", previous: "35" }],
      notes: ["Participants in elapsed bookings."],
    },
  ],
};

const request = (result) => ({
  unwrap: () => Promise.resolve(result),
  abort: vi.fn(),
});
const deferredRequest = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { unwrap: () => promise, abort: vi.fn(), resolve, reject };
};
const baseProps = {
  date: "2026-11-12",
  locationId: "location-a",
  locale: "cs",
};
const generateButton = () =>
  screen.getByRole("button", { name: "AI.guided.report.generate" });

describe("guided studio report", () => {
  beforeEach(() => {
    mocks.access = { available: true, cacheScope: "tenant-a:user-a:1" };
    mocks.workspaceAccess = {
      permissions: [
        "workspace.view",
        "reports.view",
        "reports.export",
        "ai.use",
      ],
    };
    mocks.generate.mockReset().mockImplementation(() => request(report));
    mocks.download.mockReset().mockImplementation(() =>
      request({
        downloadUrl: "blob:studio-report",
        filename: "studio-report.pdf",
      }),
    );
    vi.stubGlobal(
      "URL",
      class extends URL {
        static revokeObjectURL = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each(["workspace.view", "reports.view"])(
    "hides generation without %s permission",
    (permission) => {
      mocks.workspaceAccess.permissions =
        mocks.workspaceAccess.permissions.filter(
          (value) => value !== permission,
        );
      render(<StudioAssistantReport {...baseProps} />);
      expect(screen.queryByRole("button")).toBeNull();
      expect(mocks.generate).not.toHaveBeenCalled();
    },
  );

  it("hides generation when report insights are unavailable", () => {
    mocks.access.available = false;
    render(<StudioAssistantReport {...baseProps} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("generates on demand in the captured date, studio and locale and reopens the saved report", async () => {
    const onViewChange = vi.fn();
    render(
      <StudioAssistantReport {...baseProps} onViewChange={onViewChange} />,
    );
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(generateButton()).not.toHaveFocus();
    fireEvent.click(generateButton());
    expect(
      await screen.findByRole("heading", { name: "Studio performance" }),
    ).toBeVisible();
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(baseProps);
    expect(onViewChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("table")).toHaveTextContent("42");
    expect(screen.getByText("Attendance is not verified.")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "AI.guided.report.back" }),
    );
    expect(onViewChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(
      screen.getByRole("button", { name: "AI.guided.report.open" }),
    );
    expect(
      screen.getByRole("heading", { name: "Studio performance" }),
    ).toBeVisible();
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it("does not submit a second generation while the first is pending", async () => {
    const pending = deferredRequest();
    mocks.generate.mockReturnValue(pending);
    render(<StudioAssistantReport {...baseProps} />);
    const button = generateButton();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => pending.resolve(report));
    expect(
      screen.getByRole("heading", { name: "Studio performance" }),
    ).toBeVisible();
  });

  it("allows retry after generation fails and rejects malformed success responses", async () => {
    mocks.generate.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject(new Error("offline")),
    }));
    mocks.generate.mockImplementationOnce(() => request({ id: "incomplete" }));
    render(<StudioAssistantReport {...baseProps} />);
    fireEvent.click(generateButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "StudioManagement.reportError",
    );
    fireEvent.click(generateButton());
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "StudioManagement.reportError",
    );
    fireEvent.click(generateButton());
    expect(
      await screen.findByRole("heading", { name: "Studio performance" }),
    ).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("aborts and ignores a report completed after changing the studio scope", async () => {
    const pending = deferredRequest();
    const onViewChange = vi.fn();
    mocks.generate.mockReturnValue(pending);
    const view = render(
      <StudioAssistantReport {...baseProps} onViewChange={onViewChange} />,
    );
    fireEvent.click(generateButton());
    view.rerender(
      <StudioAssistantReport
        {...baseProps}
        locationId="location-b"
        onViewChange={onViewChange}
      />,
    );
    expect(pending.abort).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(report));
    expect(
      screen.queryByRole("heading", { name: "Studio performance" }),
    ).toBeNull();
    expect(onViewChange).not.toHaveBeenCalledWith(true);
    expect(generateButton()).toBeEnabled();
  });

  it("aborts and ignores generation completed after unmount", async () => {
    const pending = deferredRequest();
    const onViewChange = vi.fn();
    mocks.generate.mockReturnValue(pending);
    const view = render(
      <StudioAssistantReport {...baseProps} onViewChange={onViewChange} />,
    );
    fireEvent.click(generateButton());
    view.unmount();
    expect(pending.abort).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(report));
    expect(onViewChange).not.toHaveBeenCalledWith(true);
  });

  it("does not show PDF export without export permission", async () => {
    mocks.workspaceAccess.permissions = [
      "workspace.view",
      "reports.view",
      "ai.use",
    ];
    render(<StudioAssistantReport {...baseProps} />);
    fireEvent.click(generateButton());
    await screen.findByRole("heading", { name: "Studio performance" });
    expect(
      screen.queryByRole("button", { name: "StudioManagement.exportPdf" }),
    ).toBeNull();
  });

  it("downloads only the generated report and revokes its object URL", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    render(<StudioAssistantReport {...baseProps} />);
    fireEvent.click(generateButton());
    await screen.findByRole("heading", { name: "Studio performance" });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "StudioManagement.exportPdf" }),
      );
    });
    expect(mocks.download).toHaveBeenCalledExactlyOnceWith("report-a");
    expect(click).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(
      "blob:studio-report",
    );
  });

  it("does not start a download completed after unmount but still revokes its URL", async () => {
    const pending = deferredRequest();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    mocks.download.mockReturnValue(pending);
    const view = render(<StudioAssistantReport {...baseProps} />);
    fireEvent.click(generateButton());
    await screen.findByRole("heading", { name: "Studio performance" });
    fireEvent.click(
      screen.getByRole("button", { name: "StudioManagement.exportPdf" }),
    );
    view.unmount();
    expect(pending.abort).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    await act(async () =>
      pending.resolve({ downloadUrl: "blob:stale-report" }),
    );
    expect(click).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1_000));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:stale-report");
  });

  it("shows a recoverable error for a missing PDF without navigating away", async () => {
    mocks.download.mockImplementationOnce(() =>
      request({ message: "not available" }),
    );
    render(<StudioAssistantReport {...baseProps} />);
    fireEvent.click(generateButton());
    await screen.findByRole("heading", { name: "Studio performance" });
    fireEvent.click(
      screen.getByRole("button", { name: "StudioManagement.exportPdf" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "StudioManagement.exportError",
    );
    expect(
      screen.getByRole("button", { name: "StudioManagement.exportPdf" }),
    ).toBeEnabled();
  });
});
