import { describe, expect, it, vi } from "vitest";

import {
  readSmtpMessage,
  readSmtpMessages,
} from "../../e2e/helpers/smtp-mailbox.js";

const recipient = "booking-customer@studio-alpha.test";
const message = (id, address = recipient) => ({
  ID: id,
  To: [{ Address: address }],
  Subject: "Alpha Main Studio | Booking cancelled",
});
const response = (body, status = 200) => ({
  ok: () => status === 200,
  status: () => status,
  json: async () => body,
});

describe("SMTP acceptance-test mailbox", () => {
  it("reads every page and excludes search hits for another recipient", async () => {
    const request = {
      get: vi
        .fn()
        .mockResolvedValueOnce(
          response({
            messages: [message("new"), message("other", `other-${recipient}`)],
            messages_count: 3,
          }),
        )
        .mockResolvedValueOnce(
          response({
            messages: [message("old")],
            messages_count: 3,
          }),
        ),
    };

    expect(await readSmtpMessages(request, recipient)).toEqual([
      message("new"),
      message("old"),
    ]);
    expect(
      request.get.mock.calls.map(([url, options]) => ({
        url,
        start: options.params.start,
        query: options.params.query,
      })),
    ).toEqual([
      {
        url: "http://127.0.0.1:8025/api/v1/search",
        start: 0,
        query: `to:${recipient}`,
      },
      {
        url: "http://127.0.0.1:8025/api/v1/search",
        start: 2,
        query: `to:${recipient}`,
      },
    ]);
  });

  it("fails explicitly when the SMTP sink is absent", async () => {
    const request = {
      get: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    };
    await expect(readSmtpMessages(request, recipient)).rejects.toThrow(
      "The local Mailpit SMTP sink is required",
    );
  });

  it("does not turn HTTP failure into an empty inbox", async () => {
    const request = { get: vi.fn().mockResolvedValue(response({}, 503)) };
    await expect(readSmtpMessages(request, recipient)).rejects.toThrow(
      "HTTP 503",
    );
  });

  it.each([
    {},
    { messages: [], messages_count: 1 },
    { messages: [], messages_count: "0" },
  ])("rejects an incomplete mailbox response: %j", async (body) => {
    const request = { get: vi.fn().mockResolvedValue(response(body)) };
    await expect(readSmtpMessages(request, recipient)).rejects.toThrow(
      "incomplete message listing",
    );
  });

  it("loads the captured SMTP message by ID without following another origin", async () => {
    const captured = {
      ...message("one"),
      Text: "Your booking has been cancelled successfully.",
    };
    const request = { get: vi.fn().mockResolvedValue(response(captured)) };
    expect(await readSmtpMessage(request, "one/path")).toEqual(captured);
    expect(request.get).toHaveBeenCalledWith(
      "http://127.0.0.1:8025/api/v1/message/one%2Fpath",
      { params: undefined, timeout: 5_000, maxRedirects: 0 },
    );
  });
});
