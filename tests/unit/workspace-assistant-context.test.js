import { describe, expect, it } from "vitest";

import {
  buildWorkspaceAssistantContext,
  getWorkspaceAssistantContextScope,
} from "@/components/ai/workspace-assistant-context";

describe("workspace assistant page context", () => {
  it("recognizes the dedicated booking editor without copying attendee details", () => {
    expect(
      buildWorkspaceAssistantContext({
        pathname: "/app/bookings/507f1f77bcf86cd799439011/edit",
        searchParams: new URLSearchParams("name=Private"),
      }),
    ).toEqual({
      surface: "workspace",
      route: "/app/bookings/507f1f77bcf86cd799439011/edit",
      entity: { kind: "booking", id: "507f1f77bcf86cd799439011" },
    });
  });
  it("sends only an opened booking's canonical id", () => {
    const context = buildWorkspaceAssistantContext({
      pathname: "/app/bookings",
      searchParams: new URLSearchParams(
        "bookingId=507f1f77bcf86cd799439011&name=Untrusted+display+name",
      ),
    });

    expect(context).toEqual({
      surface: "workspace",
      route: "/app/bookings",
      entity: {
        kind: "booking",
        id: "507f1f77bcf86cd799439011",
      },
    });
    expect(JSON.stringify(context)).not.toContain("Untrusted");
  });

  it("fails closed for malformed, duplicate, or off-route entity ids", () => {
    for (const [pathname, query] of [
      ["/app/bookings", "bookingId=not-an-object-id"],
      [
        "/app/bookings",
        "bookingId=507f1f77bcf86cd799439011&bookingId=507f191e810c19729de860ea",
      ],
      ["/app/bookings", "bookingId=&bookingId=507f1f77bcf86cd799439011"],
      ["/app/users", "bookingId=507f1f77bcf86cd799439011"],
    ]) {
      expect(
        buildWorkspaceAssistantContext({
          pathname,
          searchParams: new URLSearchParams(query),
        }),
      ).toEqual({
        surface: "command_center",
        route: pathname,
      });
    }
  });

  it("normalizes unsafe routes and makes entity changes part of the scope", () => {
    expect(
      buildWorkspaceAssistantContext({
        pathname: "https://attacker.example/app/bookings",
        searchParams: new URLSearchParams("bookingId=507f1f77bcf86cd799439011"),
      }),
    ).toEqual({
      surface: "command_center",
      route: "/app",
    });

    const first = getWorkspaceAssistantContextScope({
      surface: "workspace",
      route: "/app/bookings",
      entity: { kind: "booking", id: "507f1f77bcf86cd799439011" },
    });
    const second = getWorkspaceAssistantContextScope({
      surface: "workspace",
      route: "/app/bookings",
      entity: { kind: "booking", id: "507f191e810c19729de860ea" },
    });

    expect(first).not.toBe(second);
  });
});
