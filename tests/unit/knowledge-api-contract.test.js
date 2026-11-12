import { describe, expect, it } from "vitest";

import { dashboardNavigation } from "@/components/dashboard/dashboard.data";
import { PERMISSIONS } from "@/config/permissions";
import {
  knowledgeApiRoutes,
  normalizeKnowledgeCollection,
  normalizeKnowledgeResource,
} from "@/lib/features/knowledge/knowledgeApiSlice";

describe("knowledge API contract", () => {
  it("uses dedicated workspace and customer endpoint families", () => {
    expect(knowledgeApiRoutes.collection).toBe("/knowledge");
    expect(knowledgeApiRoutes.resource("resource 1")).toBe(
      "/knowledge/resource%201",
    );
    expect(knowledgeApiRoutes.customer).toBe("/knowledge/customer");
  });

  it("normalizes supported envelopes and legacy field aliases", () => {
    expect(
      normalizeKnowledgeCollection({
        data: {
          resources: [
            {
              _id: "resource-1",
              resourceType: "VIDEO",
              description: "Start here",
              audiences: ["member"],
              membershipPlanIds: ["plan-1"],
              questions: [{ title: "Can I join?", content: "Yes." }],
              aiApproved: true,
            },
          ],
        },
      }),
    ).toEqual([
      expect.objectContaining({
        id: "resource-1",
        _id: "resource-1",
        type: "video",
        summary: "Start here",
        audience: "member",
        targetMembershipIds: ["plan-1"],
        customQuestions: [{ question: "Can I join?", answer: "Yes." }],
        aiEnabled: true,
      }),
    ]);
  });

  it("rejects non-object records at the API boundary", () => {
    expect(normalizeKnowledgeResource(null)).toBeNull();
    expect(normalizeKnowledgeResource("resource")).toBeNull();
  });
});

describe("knowledge navigation", () => {
  it("is permission-gated and independent of the communications module", () => {
    expect(
      dashboardNavigation.find((entry) => entry.key === "knowledge"),
    ).toMatchObject({
      href: "/app/knowledge",
      permissions: [PERMISSIONS.KNOWLEDGE_VIEW],
    });
    expect(
      dashboardNavigation.find((entry) => entry.key === "knowledge"),
    ).not.toHaveProperty("module");
  });

  it("keeps the messages entry scoped to communications", () => {
    expect(
      dashboardNavigation.find((entry) => entry.key === "messages"),
    ).toMatchObject({
      module: "communications",
      permissions: [
        PERMISSIONS.COMMUNICATIONS_VIEW,
        PERMISSIONS.COMMUNICATIONS_MANAGE,
      ],
    });
  });
});
