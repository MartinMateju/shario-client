import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: null,
  generate: vi.fn(),
  generation: null,
  getLatest: vi.fn(),
  locale: "en",
  locationId: "location-1",
  query: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
}));
vi.mock("react-redux", () => ({
  useSelector: () => mocks.locationId,
}));
vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => mocks.access,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: vi.fn(),
}));
vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetLatestAiBriefingQuery: (...args) => {
    mocks.getLatest(...args);
    return mocks.query;
  },
  useGenerateAiBriefingMutation: () => [mocks.generate, mocks.generation],
}));

import useDailyStudioBriefing from "./useDailyStudioBriefing";

const overview = {
  metadata: { date: "2026-08-03", timezone: "Europe/Prague" },
};

const currentBriefing = {
  id: "briefing-1",
  dateKey: "2026-08-03",
  locale: "en",
  freshness: { state: "fresh" },
  provenance: { snapshotHash: "snapshot-1" },
};

describe("useDailyStudioBriefing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T08:00:00.000Z"));
    vi.clearAllMocks();
    mocks.access = {
      available: true,
      cacheScope: "tenant-1|access-1",
      canReadCached: true,
    };
    mocks.generate.mockReturnValue({ unwrap: vi.fn() });
    mocks.generation = {
      isError: false,
      isLoading: false,
      reset: vi.fn(),
    };
    mocks.query = {
      currentData: currentBriefing,
      isError: false,
      isFetching: false,
      isLoading: false,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("suppresses a previous-day cache entry and proactively generates once", () => {
    mocks.query = {
      ...mocks.query,
      currentData: { ...currentBriefing, dateKey: "2026-08-02" },
    };

    const { result } = renderHook(() => useDailyStudioBriefing({ overview }));

    expect(result.current.briefing).toBeNull();
    expect(mocks.generate).toHaveBeenCalledWith({
      cacheScope: "tenant-1|access-1",
      locale: "en",
      locationId: "location-1",
      force: false,
    });
    expect(mocks.generate).toHaveBeenCalledTimes(1);
  });

  it("keeps a current cached briefing readable when generation quota is blocked", () => {
    mocks.access = {
      ...mocks.access,
      available: false,
      canReadCached: true,
    };

    const { result } = renderHook(() => useDailyStudioBriefing({ overview }));

    expect(result.current.briefing).toEqual(currentBriefing);
    expect(result.current.canGenerate).toBe(false);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("never exposes cached data after current read access is lost", () => {
    mocks.access = {
      ...mocks.access,
      available: false,
      canReadCached: false,
    };

    const { result } = renderHook(() => useDailyStudioBriefing({ overview }));

    expect(result.current.briefing).toBeNull();
    expect(mocks.getLatest).toHaveBeenCalledWith(
      expect.objectContaining({ cacheScope: "tenant-1|access-1" }),
      expect.objectContaining({ skip: true }),
    );
  });

  it("uses tenant/access scope in query identity and changes it immediately", () => {
    const { rerender } = renderHook(() => useDailyStudioBriefing({ overview }));

    expect(mocks.getLatest).toHaveBeenLastCalledWith(
      expect.objectContaining({ cacheScope: "tenant-1|access-1" }),
      expect.any(Object),
    );

    mocks.access = { ...mocks.access, cacheScope: "tenant-2|access-4" };
    rerender();

    expect(mocks.getLatest).toHaveBeenLastCalledWith(
      expect.objectContaining({ cacheScope: "tenant-2|access-4" }),
      expect.any(Object),
    );
  });

  it("retries a transient proactive generation failure after a bounded delay", () => {
    mocks.query = { ...mocks.query, currentData: null };
    mocks.generation = { ...mocks.generation, isError: true };

    renderHook(() => useDailyStudioBriefing({ overview }));
    expect(mocks.generate).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });

    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });
});
