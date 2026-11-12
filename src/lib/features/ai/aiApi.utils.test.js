import { describe, expect, it } from "vitest";

import {
  AI_ACTION_CONFIRM_DOMAIN_TAGS,
  aiAccessCacheScope,
  aiActionMutationTags,
  aiAdvisorCacheId,
  aiBriefingCacheId,
  buildKnowledgeCoverageRequest,
  buildPublicConciergeMessageRequest,
  knowledgeCoverageTags,
  normalizeKnowledgeCoverageResponse,
} from "./aiApi.utils";

describe("AI action cache invalidation", () => {
  it("separates daily briefing cache entries by locale and location scope", () => {
    expect(
      aiBriefingCacheId({
        cacheScope: "tenant-1|access-1",
        locale: "en",
        locationId: "location-1",
      }),
    ).toBe("tenant-1|access-1:location-1:en");
    expect(aiBriefingCacheId({ locale: "cs" })).toBe(
      "unscoped:all-locations:cs",
    );
  });

  it("separates Business Advisor snapshots by access, locale and location", () => {
    expect(
      aiAdvisorCacheId({
        cacheScope: "tenant-1|access-1",
        locale: "cs",
        locationId: "location-2",
      }),
    ).toBe("tenant-1|access-1:location-2:cs");
    expect(aiAdvisorCacheId({ locale: "en" })).toBe(
      "unscoped:all-locations:en",
    );
  });

  it("changes AI cache scope across tenant, access and location boundaries", () => {
    const base = {
      tenant: {
        _id: "tenant-1",
        modules: { ai: true, bookings: true, inventory: true },
      },
      access: {
        tenantId: "tenant-1",
        userId: "user-1",
        membershipId: "membership-1",
        accessVersion: 2,
        permissions: ["ai.use", "bookings.view"],
        locationAccess: { mode: "selected", locationIds: ["location-1"] },
      },
    };

    expect(aiAccessCacheScope(base)).not.toBe(
      aiAccessCacheScope({
        ...base,
        access: {
          ...base.access,
          accessVersion: 3,
          locationAccess: { mode: "selected", locationIds: ["location-2"] },
        },
      }),
    );
    expect(aiAccessCacheScope(base)).not.toBe(
      aiAccessCacheScope({
        ...base,
        tenant: {
          ...base.tenant,
          modules: { ...base.tenant.modules, inventory: false },
        },
      }),
    );
  });

  it("invalidates the action, its conversation and affected domain data", () => {
    expect(
      aiActionMutationTags(
        { conversationId: "conversation-1", actionId: "action-1" },
        ["StaffTask"],
      ),
    ).toEqual([
      { type: "AiConversation", id: "conversation-1" },
      { type: "AiConversation", id: "LIST" },
      { type: "AiAction", id: "action-1" },
      { type: "AiAction", id: "LIST" },
      "StaffTask",
    ]);
  });

  it("refreshes Events after a confirmed AI event action", () => {
    expect(AI_ACTION_CONFIRM_DOMAIN_TAGS).toContain("Events");
    expect(
      aiActionMutationTags(
        { conversationId: "conversation-1", actionId: "action-1" },
        AI_ACTION_CONFIRM_DOMAIN_TAGS,
      ),
    ).toContain("Events");
  });

  it("does not create an undefined conversation tag for activity actions", () => {
    expect(aiActionMutationTags({ actionId: "action-1" })).toEqual([
      { type: "AiConversation", id: "LIST" },
      { type: "AiAction", id: "action-1" },
      { type: "AiAction", id: "LIST" },
    ]);
  });

  it("allowlists the anonymous concierge wire contract", () => {
    expect(
      buildPublicConciergeMessageRequest({
        tenantSlug: "studio-olivie",
        locale: "cs",
        locationId: "6aa6942193290d4927b4c182",
        request: {
          message: "Kdy máte otevřeno?",
          sessionToken: "session-1",
          conversationId: "conversation-1",
          tenantSlug: "attacker-studio",
          locale: "en",
          tenantId: "tenant-2",
          audience: "workspace",
          authContext: "workspace",
          userId: "owner-1",
          locationId: "attacker-location",
          context: { surface: "command_center" },
        },
      }),
    ).toEqual({
      url: "/public/tenants/studio-olivie/ai/concierge",
      method: "POST",
      body: {
        message: "Kdy máte otevřeno?",
        locale: "cs",
        locationId: "6aa6942193290d4927b4c182",
        sessionToken: "session-1",
        conversationId: "conversation-1",
      },
    });
  });

  it("omits the public concierge location when no studio is selected", () => {
    expect(
      buildPublicConciergeMessageRequest({
        tenantSlug: "studio-olivie",
        locale: "cs",
        locationId: "",
        request: { message: "Dobrý den" },
      }).body,
    ).toEqual({ message: "Dobrý den", locale: "cs" });
  });

  it("normalizes the tenant-only Knowledge Hub coverage contract", () => {
    expect(
      normalizeKnowledgeCoverageResponse({
        generatedAt: "2026-08-05T09:00:00.000Z",
        score: 67.4,
        answeredCount: 2,
        totalCount: 3,
        complete: true,
        truncated: false,
        warnings: [
          {
            id: "cancellation-policy",
            code: "missing_verified_answer",
            question: "What is your cancellation policy? ",
            category: "booking_policy",
            severity: "high",
            privateCustomerId: "must-not-be-forwarded",
          },
        ],
      }),
    ).toEqual({
      generatedAt: "2026-08-05T09:00:00.000Z",
      score: 67,
      answeredCount: 2,
      totalCount: 3,
      complete: true,
      truncated: false,
      warnings: [
        {
          id: "cancellation-policy",
          code: "missing_verified_answer",
          question: "What is your cancellation policy?",
          category: "booking_policy",
          severity: "high",
        },
      ],
    });
  });

  it("keeps coverage cache scope client-only and allowlists wire parameters", () => {
    expect(
      buildKnowledgeCoverageRequest({
        cacheScope: "tenant-secret|access-v2",
        locale: "cs",
        locationId: " 507f1f77bcf86cd799439011 ",
        tenantId: "attacker-tenant",
        audience: "owner",
      }),
    ).toEqual({
      url: "/ai/knowledge/coverage",
      params: {
        locale: "cs",
        locationId: "507f1f77bcf86cd799439011",
      },
    });
    expect(knowledgeCoverageTags()).toEqual([
      { type: "Knowledge", id: "LIST" },
    ]);
  });

  it.each([
    undefined,
    {},
    { score: 100, answeredCount: 0, totalCount: 0, warnings: [] },
    { score: 100, answeredCount: 9, totalCount: 9, warnings: [{}] },
    { score: 100, answeredCount: 8, totalCount: 9, warnings: [] },
    {
      score: 100,
      answeredCount: 8,
      totalCount: 9,
      warnings: [{ id: "gap", question: "Missing answer" }],
    },
  ])("rejects malformed or inconsistent coverage payloads", (payload) => {
    expect(() => normalizeKnowledgeCoverageResponse(payload)).toThrow(
      "Invalid Knowledge Hub coverage response",
    );
  });
});
