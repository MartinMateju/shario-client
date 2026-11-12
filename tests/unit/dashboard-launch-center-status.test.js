import { describe, expect, it, vi } from "vitest";

import { getLaunchCenterStatusPresentation } from "@/components/dashboard/launchCenterNavigation";

const translate = vi.fn((key, values = {}) => {
  if (key === "launchCenterIssueBadge") return `${values.count} issue`;
  return key;
});

describe("Launch Center sidebar status presentation", () => {
  it.each([
    {
      status: { status: "progress", completed: 5, total: 7, issueCount: 0 },
      expected: {
        badgeText: "5/7",
        description: "launchCenterRequiredProgress",
        tone: "progress",
      },
    },
    {
      status: { status: "live", completed: 7, total: 7, issueCount: 0 },
      expected: {
        badgeText: "launchCenterLiveBadge",
        description: "launchCenterLiveStatus",
        tone: "positive",
      },
    },
    {
      status: {
        status: "attention",
        completed: 7,
        total: 7,
        issueCount: 1,
      },
      expected: {
        badgeText: "1 issue",
        description: "launchCenterAttentionStatus",
        tone: "attention",
      },
    },
    {
      status: {
        status: "operational",
        completed: 4,
        total: 4,
        issueCount: 0,
      },
      expected: {
        badgeText: "launchCenterReadyBadge",
        description: "launchCenterReadyStatus",
        tone: "positive",
      },
    },
  ])(
    "maps $status.status to its badge and accessible copy",
    ({ status, expected }) => {
      expect(
        getLaunchCenterStatusPresentation(status, translate),
      ).toMatchObject(expected);
    },
  );

  it("passes normalized values into progress and issue translations", () => {
    getLaunchCenterStatusPresentation(
      { status: "progress", completed: 3.8, total: 7.2 },
      translate,
    );
    expect(translate).toHaveBeenCalledWith("launchCenterRequiredProgress", {
      completed: 3,
      total: 7,
    });

    getLaunchCenterStatusPresentation(
      { status: "attention", completed: 7, total: 7, issueCount: 2.9 },
      translate,
    );
    expect(translate).toHaveBeenCalledWith("launchCenterIssueBadge", {
      count: 2,
    });
    expect(translate).toHaveBeenCalledWith("launchCenterAttentionStatus", {
      count: 2,
    });
  });

  it.each([
    null,
    {},
    { status: "unknown", completed: 1, total: 2 },
    { status: "progress", completed: 0, total: 0 },
    { status: "attention", completed: 2, total: 2, issueCount: 0 },
  ])("does not render malformed status %#", (status) => {
    expect(getLaunchCenterStatusPresentation(status, translate)).toBeNull();
  });
});
