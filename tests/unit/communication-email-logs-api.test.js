import { describe, expect, it, vi } from "vitest";

const endpoints = vi.hoisted(() => ({}));
vi.mock("../../src/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: ({ endpoints: defineEndpoints }) => {
      Object.assign(
        endpoints,
        defineEndpoints({
          query: (definition) => definition,
          mutation: (definition) => definition,
        }),
      );
      return {};
    },
  },
}));

await import("../../src/lib/features/communicationEmailLogs/communicationEmailLogsApiSlice");

describe("email log retry API contract", () => {
  it("posts only the reviewed retry version to the log-specific route", () => {
    expect(
      endpoints.retryCommunicationEmailLog.query({
        id: "email-log-1",
        expectedManualRetryCount: 2,
        force: true,
        recipientEmail: "different@example.test",
      }),
    ).toEqual({
      url: "/communication-email-logs/email-log-1/retry",
      method: "POST",
      body: { expectedManualRetryCount: 2 },
    });
  });

  it.each([true, false])(
    "refreshes history after accepting a retry with queued=%s",
    (queued) => {
      expect(
        endpoints.retryCommunicationEmailLog.invalidatesTags(
          { queued },
          undefined,
        ),
      ).toEqual(["CommunicationEmailLogs"]);
    },
  );

  it.each([
    "COMMUNICATION_EMAIL_RETRY_BLOCKED",
    "COMMUNICATION_EMAIL_RETRY_STALE",
  ])("refreshes eligibility after %s", (code) => {
    expect(
      endpoints.retryCommunicationEmailLog.invalidatesTags(undefined, {
        status: 409,
        data: { code },
      }),
    ).toEqual(["CommunicationEmailLogs"]);
  });

  it("does not claim an unrelated failed request changed delivery history", () => {
    expect(
      endpoints.retryCommunicationEmailLog.invalidatesTags(undefined, {
        status: 500,
      }),
    ).toEqual([]);
  });
});
