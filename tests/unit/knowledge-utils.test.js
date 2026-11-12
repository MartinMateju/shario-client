import { describe, expect, it } from "vitest";

import {
  buildKnowledgePayload,
  getSafeResourceUrl,
  getYoutubeEmbedUrl,
  getYoutubeVideoId,
} from "@/components/knowledge/knowledge.utils";

describe("knowledge resource payloads", () => {
  it("clears irrelevant target selectors and uses empty optional strings", () => {
    expect(
      buildKnowledgePayload({
        title: "Studio rules",
        type: "guide",
        category: "studio_rules",
        language: "en",
        audience: "customer",
        status: "draft",
        tags: "clay, safety, clay",
        targetMembershipIds: ["plan-1"],
        targetCourseIds: ["course-1"],
        customQuestions: [
          { question: "Complete?", answer: "Yes." },
          { question: "Incomplete", answer: "" },
        ],
        locationIds: [],
        featured: false,
        aiEnabled: true,
      }),
    ).toMatchObject({
      sourceUrl: "",
      videoUrl: "",
      fileUrl: "",
      transcript: "",
      tags: ["clay", "safety"],
      targetMembershipIds: [],
      targetCourseIds: [],
      customQuestions: [{ question: "Complete?", answer: "Yes." }],
    });
  });

  it("keeps only the selector matching the chosen audience", () => {
    expect(
      buildKnowledgePayload({
        title: "Member guide",
        audience: "member",
        targetMembershipIds: ["plan-1"],
        targetCourseIds: ["course-1"],
      }),
    ).toMatchObject({
      targetMembershipIds: ["plan-1"],
      targetCourseIds: [],
    });
  });
});

describe("knowledge URL safety", () => {
  const videoId = "dQw4w9WgXcQ";

  it.each([
    [`https://www.youtube.com/watch?v=${videoId}`, videoId],
    [`https://youtu.be/${videoId}`, videoId],
    [`https://youtube.com/shorts/${videoId}`, videoId],
    [`https://youtube.com/embed/${videoId}`, videoId],
  ])("accepts a supported YouTube value", (value, expected) => {
    expect(getYoutubeVideoId(value)).toBe(expected);
  });

  it.each([
    `http://youtube.com/watch?v=${videoId}`,
    `https://user:pass@youtube.com/watch?v=${videoId}`,
    `https://youtube.com:444/watch?v=${videoId}`,
    `https://youtube.example/watch?v=${videoId}`,
    "https://youtube.com/watch?v=too-short",
    `javascript:${videoId}`,
    videoId,
  ])("rejects an unsafe YouTube value", (value) => {
    expect(getYoutubeVideoId(value)).toBe("");
  });

  it("generates only a youtube-nocookie embed URL", () => {
    expect(
      getYoutubeEmbedUrl({
        videoUrl: `https://youtube.com/watch?v=${videoId}`,
      }),
    ).toBe(`https://www.youtube-nocookie.com/embed/${videoId}`);
  });

  it("allows only web URLs and safe relative resource paths", () => {
    expect(getSafeResourceUrl("https://example.com/guide.pdf")).toBe(
      "https://example.com/guide.pdf",
    );
    expect(getSafeResourceUrl("/uploads/guide.pdf")).toBe("/uploads/guide.pdf");
    expect(getSafeResourceUrl("//evil.example/file")).toBe("");
    expect(getSafeResourceUrl("javascript:alert(1)")).toBe("");
  });
});
