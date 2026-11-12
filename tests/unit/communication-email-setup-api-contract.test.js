import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/lib/features/communicationEmailSetup/communicationEmailSetupApiSlice.js",
  ),
  "utf8",
);
const workspaceSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/components/communications/CommunicationsWorkspace.js",
  ),
  "utf8",
);
const englishMessages = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/messages/en.json"), "utf8"),
);
const czechMessages = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "src/messages/cs.json"), "utf8"),
);

describe("communication email setup API contract", () => {
  it("wraps the frozen registered sender transport as one managed setup", () => {
    expect(source).toContain('const BASE_URL = "/registered-sender-emails"');
    expect(source).toContain('method: "GET"');
    expect(source).toContain('method: "POST"');
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain("/${id}/reply-to-verification`");
    expect(source).toContain("/${id}/reply-to-verification/confirm`");
    expect(source).toContain("body: { code:");
    expect(source).toContain("/${id}/test`");
  });

  it("uses a dedicated id-only retry without clearing managed identity fields", () => {
    const retryStart = source.indexOf("retryCommunicationEmailSetup");
    const retryEnd = source.indexOf(
      "requestCommunicationReplyToVerification",
      retryStart,
    );
    const retrySource = source.slice(retryStart, retryEnd);

    expect(retrySource).toContain('method: "PATCH"');
    expect(retrySource).toContain("body: {}");
    expect(retrySource).not.toContain("buildEmailSetupUpdateBody");
  });

  it("polls only through the status-aware workspace subscription", () => {
    expect(workspaceSource).toContain("getEmailSetupPollingInterval(setup)");
    expect(workspaceSource).toContain("pollingInterval: setupPollingInterval");
    expect(workspaceSource).toContain("skipPollingIfUnfocused: true");
    expect(workspaceSource).toContain("refetchOnFocus: true");
    expect(workspaceSource).toContain("refetchOnReconnect: true");
  });

  it("keeps recovery copy in the CommunicationsEmail catalog", () => {
    for (const catalog of [englishMessages, czechMessages]) {
      expect(catalog.CommunicationsEmail.actions.retrySetup).toBeTruthy();
      expect(catalog.CommunicationsEmail.actions.refreshStatus).toBeTruthy();
      expect(catalog.CommunicationsEmail.diagnostics.reference).toContain(
        "{code}",
      );
      expect(catalog.CommunicationsEmail.diagnostics.lastAttempt).toContain(
        "{attemptedAt",
      );
    }
  });

  it("does not create a competing communications/email-settings transport", () => {
    expect(source).not.toContain("/communications/email-settings");
  });
});
