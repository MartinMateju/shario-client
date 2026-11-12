import { describe, expect, it } from "vitest";

import {
  EMAIL_SETUP_POLL_INTERVAL_MS,
  EMAIL_SETUP_READINESS,
  buildEmailSetupCreateBody,
  buildEmailSetupUpdateBody,
  getEmailSetupPollingInterval,
  isEmailSetupReady,
  normalizeEmailSetup,
  selectManagedSender,
} from "@/components/communications/email/emailSetup";

describe("managed communication email setup", () => {
  it("does not adopt a legacy SMTP row as the managed singleton", () => {
    const legacy = {
      _id: "smtp-1",
      provider: "gmail",
      email: "legacy@example.com",
      replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
    };
    const managed = {
      _id: "managed-1",
      provider: "postmark_managed",
      email: "studio@notify.shario.io",
      readiness: "reply_to_pending",
    };

    expect(selectManagedSender([legacy, managed])).toBe(managed);
    expect(normalizeEmailSetup([legacy]).readiness).toBe(
      EMAIL_SETUP_READINESS.NOT_CONFIGURED,
    );
  });

  it("does not adopt a legacy SMTP sender returned as a single object", () => {
    expect(
      normalizeEmailSetup({
        _id: "legacy-single",
        provider: "smtp",
        email: "legacy@example.com",
        replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
      }),
    ).toMatchObject({
      id: "",
      readiness: EMAIL_SETUP_READINESS.NOT_CONFIGURED,
      fromAddress: "",
    });
  });

  it("prefers a ready managed identity deterministically", () => {
    const pendingDefault = {
      _id: "pending",
      provider: "postmark_managed",
      isDefault: true,
      readiness: "reply_to_pending",
    };
    const ready = {
      _id: "ready",
      provider: "postmark_managed",
      readiness: "ready",
    };

    expect(selectManagedSender({ data: [pendingDefault, ready] })).toBe(ready);
  });

  it("keeps the verified Reply-To active while exposing a pending replacement", () => {
    const setup = normalizeEmailSetup({
      _id: "managed-1",
      mode: "managed",
      email: "studio@notify.shario.io",
      displayName: "Studio Olivka",
      replyToEmail: "active@example.com",
      pendingReplyToEmail: "new@example.com",
      replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
      readiness: "ready",
    });

    expect(setup.replyToEmail).toBe("active@example.com");
    expect(setup.pendingReplyToEmail).toBe("new@example.com");
    expect(setup.replyToStatus).toBe("pending");
    expect(isEmailSetupReady(setup)).toBe(true);
  });

  it("recognizes provisioning as an explicit fail-closed readiness state", () => {
    const setup = normalizeEmailSetup({
      _id: "managed-1",
      mode: "managed",
      readiness: "provisioning",
    });

    expect(setup.readiness).toBe(EMAIL_SETUP_READINESS.PROVISIONING);
    expect(isEmailSetupReady(setup)).toBe(false);
  });

  it("exposes only safe provisioning diagnostics", () => {
    const setup = normalizeEmailSetup({
      _id: "managed-1",
      provider: "postmark_managed",
      readiness: "error",
      providerProvisioningStatus: "error",
      providerProvisioningErrorCode: "POSTMARK_1364",
      providerProvisioningAttemptedAt: "2026-08-30T08:30:00.000Z",
      providerProvisioningError: "X-Postmark-Server-Token=secret",
      lastError: "X-Postmark-Server-Token=secret",
    });

    expect(setup).toMatchObject({
      providerProvisioningErrorCode: "POSTMARK_1364",
      providerProvisioningAttemptedAt: "2026-08-30T08:30:00.000Z",
    });
    expect(setup).not.toHaveProperty("lastError");
    expect(JSON.stringify(setup)).not.toContain("secret");
  });

  it("rejects malformed diagnostic codes", () => {
    const setup = normalizeEmailSetup({
      _id: "managed-1",
      provider: "postmark_managed",
      readiness: "error",
      providerProvisioningErrorCode: "X-Postmark-Server-Token=secret",
    });

    expect(setup.providerProvisioningErrorCode).toBe("");
  });

  it("fails closed when provider provisioning failed despite a verified Reply-To", () => {
    const setup = normalizeEmailSetup({
      _id: "managed-1",
      provider: "postmark_managed",
      email: "studio@notify.shario.io",
      providerProvisioningStatus: "error",
      replyToEmail: "studio@example.com",
      replyToVerifiedAt: "2026-08-01T10:00:00.000Z",
    });

    expect(setup.readiness).toBe(EMAIL_SETUP_READINESS.ERROR);
    expect(isEmailSetupReady(setup)).toBe(false);
  });

  it("polls only while managed provisioning is in progress", () => {
    expect(
      getEmailSetupPollingInterval({
        mode: "managed",
        readiness: "provisioning",
      }),
    ).toBe(EMAIL_SETUP_POLL_INTERVAL_MS);
    expect(
      getEmailSetupPollingInterval({ mode: "managed", readiness: "ready" }),
    ).toBe(0);
    expect(
      getEmailSetupPollingInterval({ mode: "managed", readiness: "error" }),
    ).toBe(0);
  });

  it("emits only the managed schema fields", () => {
    const values = {
      senderName: "  Studio Olivka  ",
      replyToEmail: " HELLO@EXAMPLE.COM ",
      note: "legacy",
      isDefault: false,
    };

    expect(buildEmailSetupCreateBody(values)).toEqual({
      displayName: "Studio Olivka",
      replyToEmail: "hello@example.com",
    });
    expect(buildEmailSetupUpdateBody(values)).toEqual({
      displayName: "Studio Olivka",
      replyToEmail: "hello@example.com",
    });
  });
});
