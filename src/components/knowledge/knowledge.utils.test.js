import { describe, expect, it } from "vitest";

import {
  KNOWLEDGE_AI_READINESS,
  KNOWLEDGE_AI_INDEX_VERSION,
  findKnowledgeResourceById,
  getKnowledgeAiReadiness,
  isKnowledgeResourceId,
} from "./knowledge.utils";

const now = new Date("2026-08-03T10:00:00.000Z");

const eligible = {
  status: "published",
  aiEnabled: true,
  effectiveFrom: "2026-08-01T00:00:00.000Z",
  effectiveUntil: "2026-08-10T00:00:00.000Z",
  embeddingIndexVersion: KNOWLEDGE_AI_INDEX_VERSION,
};

describe("Knowledge Hub AI readiness", () => {
  it.each([
    ["ready", KNOWLEDGE_AI_READINESS.READY],
    ["pending", KNOWLEDGE_AI_READINESS.INDEXING],
    ["processing", KNOWLEDGE_AI_READINESS.INDEXING],
    ["failed", KNOWLEDGE_AI_READINESS.NEEDS_ATTENTION],
    ["skipped", KNOWLEDGE_AI_READINESS.NEEDS_ATTENTION],
  ])("maps %s indexing to %s", (embeddingStatus, expected) => {
    expect(getKnowledgeAiReadiness({ ...eligible, embeddingStatus }, now)).toBe(
      expected,
    );
  });

  it("does not count drafts, disabled sources or out-of-window sources as AI ready", () => {
    expect(getKnowledgeAiReadiness({ ...eligible, status: "draft" }, now)).toBe(
      KNOWLEDGE_AI_READINESS.NOT_USED,
    );
    expect(
      getKnowledgeAiReadiness({ ...eligible, aiEnabled: false }, now),
    ).toBe(KNOWLEDGE_AI_READINESS.NOT_USED);
    expect(
      getKnowledgeAiReadiness(
        { ...eligible, effectiveFrom: "2026-09-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(KNOWLEDGE_AI_READINESS.NOT_USED);
  });

  it("keeps a legacy ready embedding in indexing until the current index exists", () => {
    expect(
      getKnowledgeAiReadiness(
        { ...eligible, embeddingStatus: "ready", embeddingIndexVersion: "" },
        now,
      ),
    ).toBe(KNOWLEDGE_AI_READINESS.INDEXING);
    expect(
      getKnowledgeAiReadiness(
        {
          ...eligible,
          embeddingStatus: "ready",
          embeddingIndexVersion: "knowledge-article-v1",
        },
        now,
      ),
    ).toBe(KNOWLEDGE_AI_READINESS.INDEXING);
  });

  it("validates resource ids before using them in AI or deep-link context", () => {
    expect(isKnowledgeResourceId("507f1f77bcf86cd799439011")).toBe(true);
    expect(isKnowledgeResourceId("507f1f77bcf86cd79943901z")).toBe(false);
    expect(isKnowledgeResourceId("../../another-tenant")).toBe(false);
  });

  it("resolves only the exact resource requested by a validated deep link", () => {
    const resources = [
      { id: "507f1f77bcf86cd799439011", title: "Studio rules" },
      { id: "507f191e810c19729de860ea", title: "Kiln safety" },
    ];

    expect(
      findKnowledgeResourceById(resources, "507F191E810C19729DE860EA"),
    ).toEqual(resources[1]);
    expect(findKnowledgeResourceById(resources, "../rules")).toBeNull();
    expect(
      findKnowledgeResourceById(resources, "507f1f77bcf86cd799439099"),
    ).toBeNull();
  });
});
