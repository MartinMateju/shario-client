import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        "filters.search": "Search knowledge",
        "filters.searchPlaceholder": "Search resources",
        "filters.category": "Category",
        "filters.type": "Resource type",
        "filters.allCategories": "All categories",
        "filters.allTypes": "All types",
        "card.open": "Open resource",
        "card.watch": "Watch video",
        "card.noSummary": "No summary",
        "viewer.questions": "Questions and answers",
        "viewer.transcript": "Video transcript",
        "viewer.aiSource": "AI source",
        "viewer.openFile": "Open file",
        "viewer.openLink": "Open link",
        "badges.featured": "Featured",
      };

      if (key === "card.openLabel") return `Open ${values.title}`;
      return messages[key] || key;
    },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import KnowledgeBrowser from "@/components/knowledge/KnowledgeBrowser";

const resources = [
  {
    id: "video-1",
    title: "Wheel basics",
    summary: "Learn centering",
    content: "Keep your elbows steady.",
    type: "video",
    category: "pottery",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    tags: ["wheel"],
    customQuestions: [],
    featured: true,
    aiEnabled: true,
  },
  {
    id: "guide-1",
    title: "Pickup guide",
    summary: "Collect finished pieces",
    content: "Bring your customer ID.",
    type: "guide",
    category: "pickup",
    tags: ["collection"],
    customQuestions: [],
  },
];

describe("KnowledgeBrowser", () => {
  it("filters the read-only catalog by searchable content", () => {
    render(<KnowledgeBrowser resources={resources} embedded />);

    expect(screen.getByText("Wheel basics")).toBeInTheDocument();
    expect(screen.getByText("Pickup guide")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Search resources"), {
      target: { value: "customer ID" },
    });

    expect(screen.queryByText("Wheel basics")).toBeNull();
    expect(screen.getByText("Pickup guide")).toBeInTheDocument();
  });

  it("opens a validated privacy-enhanced YouTube viewer", () => {
    render(<KnowledgeBrowser resources={resources} embedded />);

    fireEvent.click(screen.getByRole("button", { name: "Open Wheel basics" }));

    expect(screen.getByTitle("Wheel basics")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(
      screen.queryByText("https://www.youtube.com/watch"),
    ).not.toBeInTheDocument();
  });
});
