import { describe, expect, it } from "vitest";

import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

import {
  clampAiActionPage,
  getAiActionErrorKey,
  getAiActionItems,
  getAiActionResultHref,
  normalizeAiAction,
} from "./ai-action.utils";

describe("AI action client contract", () => {
  it("uses the server-authoritative action returned by a confirmation", () => {
    expect(
      normalizeAiAction(
        {
          data: {
            action: {
              id: "action-1",
              status: "failed",
              errorCode: "AI_ACTION_TARGET_CHANGED",
            },
          },
        },
        { id: "action-1", status: "suggested", label: "Old preview" },
      ),
    ).toMatchObject({
      id: "action-1",
      status: "failed",
      label: "Old preview",
      errorCode: "AI_ACTION_TARGET_CHANGED",
    });
  });

  it("normalizes paginated activity and rejects unsafe result links", () => {
    expect(
      getAiActionItems({
        data: { items: [{ id: "action-1", status: "completed" }] },
      }),
    ).toHaveLength(1);
    expect(getAiActionResultHref({ result: { href: "/app/inventory" } })).toBe(
      "/app/inventory",
    );
    expect(
      getAiActionResultHref({
        result: { href: "https://evil.example/collect" },
      }),
    ).toBe("");
  });

  it("integrates the create-event preview, result and localized labels", () => {
    const action = {
      key: "create_event",
      preview: {
        summary: "create_event",
        fields: [
          { key: "location", value: "Grohova" },
          { key: "date", value: "2026-08-17" },
          { key: "startTime", value: "09:00" },
          { key: "endTime", value: "10:00" },
          { key: "status", value: "inquiry" },
        ],
      },
      result: { type: "event", id: "event-1", title: "Closed studio" },
    };

    expect(getAiActionResultHref(action, { canOpenEventResult: true })).toBe(
      "/app/operations?section=events",
    );
    expect(getAiActionResultHref(action)).toBe("");
    expect(messagesEn.AI.actions.summaries.create_event).toBe(
      "Create a studio event",
    );
    expect(messagesCs.AI.actions.summaries.create_event).toBe(
      "Vytvořit akci studia",
    );
    for (const messages of [messagesEn, messagesCs]) {
      expect(messages.AI.actions.confirmation.create_event).toEqual(
        expect.any(String),
      );
      for (const field of action.preview.fields) {
        expect(messages.AI.actions.fields[field.key]).toEqual(
          expect.any(String),
        );
      }
      expect(messages.AI.actions.values.inquiry).toEqual(expect.any(String));
    }
  });

  it("maps server error codes to localized copy keys", () => {
    expect(
      getAiActionErrorKey({ data: { code: "AI_ACTION_TARGET_CHANGED" } }),
    ).toBe("targetChanged");
    expect(getAiActionErrorKey({ code: "AI_ACTION_EXPIRED" })).toBe("expired");
    expect(getAiActionErrorKey({ data: { message: "raw server text" } })).toBe(
      "generic",
    );
  });

  it("clamps activity pagination when the result set shrinks", () => {
    expect(clampAiActionPage(2, 1)).toBe(1);
    expect(clampAiActionPage(2, 4)).toBe(2);
    expect(clampAiActionPage(-1, 0)).toBe(1);
  });
});
