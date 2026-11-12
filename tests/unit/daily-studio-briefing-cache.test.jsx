import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en",
  activeLocationId: "location-a",
  access: {
    cacheScope: "tenant-a|user-a|access-1",
    canReadCached: true,
  },
  latestQuery: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => {
    const translate = (key) => key;
    translate.has = () => false;
    return translate;
  },
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({ activeLocationId: mocks.activeLocationId }),
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.activeLocationId,
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  default: ({ children }) => children,
  useAiAccess: () => mocks.access,
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetLatestAiBriefingQuery: (...args) => mocks.latestQuery(...args),
  useGenerateAiBriefingMutation: () => [
    mocks.generate,
    { isLoading: false, error: undefined },
  ],
}));

vi.mock("@heroicons/react/24/outline", () => ({
  ArrowPathIcon: () => <svg />,
  CalendarDaysIcon: () => <svg />,
  CheckCircleIcon: () => <svg />,
  ChevronRightIcon: () => <svg />,
  ExclamationTriangleIcon: () => <svg />,
  SparklesIcon: () => <svg />,
}));

import DailyStudioBriefing from "@/components/ai/DailyStudioBriefing";

describe("DailyStudioBriefing cache isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locale = "en";
    mocks.activeLocationId = "location-a";
    mocks.access = {
      cacheScope: "tenant-a|user-a|access-1",
      canReadCached: true,
    };
    mocks.latestQuery.mockReturnValue({
      data: { briefing: { headline: "Retained tenant briefing" } },
      currentData: {
        briefing: {
          headline: "Current tenant briefing",
          summary: "Current authorized summary",
          attention: [],
        },
      },
      isLoading: false,
      error: undefined,
    });
    mocks.generate.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    });
  });

  it("renders only currentData and scopes both reads and explicit refreshes", async () => {
    render(<DailyStudioBriefing />);

    expect(mocks.latestQuery).toHaveBeenLastCalledWith(
      {
        cacheScope: "tenant-a|user-a|access-1",
        locale: "en",
        locationId: "location-a",
      },
      { skip: false },
    );
    expect(screen.getByText("Current tenant briefing")).toBeVisible();
    expect(screen.queryByText("Retained tenant briefing")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() =>
      expect(mocks.generate).toHaveBeenLastCalledWith({
        cacheScope: "tenant-a|user-a|access-1",
        locale: "en",
        locationId: "location-a",
        force: true,
      }),
    );
  });

  it("does not flash retained data while a new workspace scope loads", () => {
    const view = render(<DailyStudioBriefing />);
    expect(screen.getByText("Current tenant briefing")).toBeVisible();

    mocks.locale = "cs";
    mocks.activeLocationId = "location-b";
    mocks.access = {
      cacheScope: "tenant-b|user-b|access-2",
      canReadCached: true,
    };
    mocks.latestQuery.mockReturnValue({
      data: { briefing: { headline: "Retained tenant briefing" } },
      currentData: undefined,
      isLoading: true,
      error: undefined,
    });
    view.rerender(<DailyStudioBriefing />);

    expect(mocks.latestQuery).toHaveBeenLastCalledWith(
      {
        cacheScope: "tenant-b|user-b|access-2",
        locale: "cs",
        locationId: "location-b",
      },
      { skip: false },
    );
    expect(screen.queryByText("Current tenant briefing")).toBeNull();
    expect(screen.queryByText("Retained tenant briefing")).toBeNull();
    expect(screen.getByText("loading")).toBeVisible();
  });
});
