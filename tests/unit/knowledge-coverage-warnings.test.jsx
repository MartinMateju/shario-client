import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { coverageHook } = vi.hoisted(() => ({
  coverageHook: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        "management.coverage.title": "Common customer questions need answers",
        "management.coverage.questions.booking_cancellation":
          "What is the cancellation and refund policy?",
        "management.coverage.questions.unknown":
          "Add an answer for this topic.",
        "management.coverage.description": "Add approved answers.",
        "management.coverage.readyTitle": "Questions are covered",
        "management.coverage.readyDescription": "Every question is covered.",
        "management.coverage.loading": "Checking coverage…",
        "management.coverage.errorTitle": "Coverage check unavailable",
        "management.coverage.errorDescription": "Retry the coverage check.",
        "management.coverage.missing": "No verified answer",
        "management.coverage.partialScan": "Coverage scan was incomplete.",
        "management.coverage.addSource": "Add an approved answer",
        "actions.retry": "Retry",
        "categories.booking_policy": "Bookings",
        "categories.payments": "Payments",
        "categories.general": "General",
      };

      if (key === "management.coverage.score") {
        return `${values.score}% covered`;
      }
      if (key === "management.coverage.summary") {
        return `${values.answered} of ${values.total} questions covered`;
      }
      if (key === "management.coverage.updated") {
        return `Checked ${values.date}`;
      }
      return messages[key] ?? key;
    },
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetAiKnowledgeCoverageQuery: (...args) => coverageHook(...args),
}));

import KnowledgeCoverageWarnings from "@/components/knowledge/KnowledgeCoverageWarnings";
import { mapKnowledgeCoverageCategory } from "@/lib/features/ai/aiApi.utils";

describe("KnowledgeCoverageWarnings", () => {
  beforeEach(() => {
    coverageHook.mockReset();
  });

  it("renders coverage gaps, the score and a tenant action", () => {
    const onAddSource = vi.fn();
    coverageHook.mockReturnValue({
      currentData: {
        generatedAt: "2026-08-05T09:00:00.000Z",
        score: 67,
        answeredCount: 2,
        totalCount: 3,
        complete: true,
        truncated: false,
        warnings: [
          {
            id: "booking_cancellation",
            question: "What is your cancellation policy?",
            category: "bookings",
            severity: "high",
          },
        ],
      },
    });

    render(
      <KnowledgeCoverageWarnings
        enabled
        cacheScope="tenant-a|access-v1"
        locationId="507f1f77bcf86cd799439011"
        canManage
        onAddSource={onAddSource}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Common customer questions need answers",
      }),
    ).toBeVisible();
    expect(screen.getByText("67% covered")).toBeVisible();
    expect(screen.getByText("2 of 3 questions covered")).toBeVisible();
    expect(
      screen.getByText("What is the cancellation and refund policy?"),
    ).toBeVisible();
    expect(
      screen.queryByText("What is your cancellation policy?"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Bookings")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Add an approved answer" }),
    );
    expect(onAddSource).toHaveBeenCalledTimes(1);
    expect(coverageHook).toHaveBeenCalledWith(
      {
        cacheScope: "tenant-a|access-v1",
        locale: "en",
        locationId: "507f1f77bcf86cd799439011",
      },
      { skip: false, refetchOnMountOrArgChange: true },
    );
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("keeps coverage errors honest and lets the tenant retry", () => {
    const refetch = vi.fn();
    coverageHook.mockReturnValue({ isError: true, refetch });

    render(<KnowledgeCoverageWarnings enabled canManage={false} />);

    expect(screen.getByText("Coverage check unavailable")).toBeVisible();
    expect(screen.getByRole("alert")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does not render stale data from a previous tenant while the new scope loads", () => {
    coverageHook.mockReturnValue({
      data: {
        generatedAt: "2026-08-05T09:00:00.000Z",
        score: 100,
        answeredCount: 9,
        totalCount: 9,
        complete: true,
        truncated: false,
        warnings: [],
      },
      currentData: undefined,
      isFetching: true,
    });

    render(
      <KnowledgeCoverageWarnings
        enabled
        cacheScope="tenant-b|access-v2"
        canManage={false}
      />,
    );

    expect(screen.getByText("Checking coverage…")).toBeVisible();
    expect(screen.queryByText("Questions are covered")).toBeNull();
  });

  it("fails closed when the current response is absent", () => {
    coverageHook.mockReturnValue({
      data: { score: 100, answeredCount: 9, totalCount: 9, warnings: [] },
      currentData: undefined,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<KnowledgeCoverageWarnings enabled canManage={false} />);

    expect(screen.getByText("Coverage check unavailable")).toBeVisible();
    expect(screen.queryByText("Questions are covered")).toBeNull();
  });

  it("never reports ready when the server capped the coverage scan", () => {
    coverageHook.mockReturnValue({
      currentData: {
        generatedAt: "2026-08-05T09:00:00.000Z",
        score: 100,
        answeredCount: 9,
        totalCount: 9,
        complete: false,
        truncated: true,
        warnings: [],
      },
    });

    render(<KnowledgeCoverageWarnings enabled canManage={false} />);

    expect(screen.getByText("Coverage scan was incomplete.")).toBeVisible();
    expect(screen.queryByText("Questions are covered")).toBeNull();
  });

  it("maps backend catalog categories to existing Knowledge Hub labels", () => {
    expect(mapKnowledgeCoverageCategory("pricing")).toBe("payments");
    expect(mapKnowledgeCoverageCategory("bookings")).toBe("booking_policy");
    expect(mapKnowledgeCoverageCategory("studio_access")).toBe("studio_rules");
    expect(mapKnowledgeCoverageCategory("unknown-domain")).toBe("general");
  });
});
