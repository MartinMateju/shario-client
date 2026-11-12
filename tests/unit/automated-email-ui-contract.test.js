import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

describe("automated email workspace UI contract", () => {
  it("keeps the hub flat and uses History as its explicit URL fallback", () => {
    const page = read(
      "src/components/views/automated_communications/AutomatedCommunicationsPage.js",
    );
    const navigation = read(
      "src/components/views/automated_communications/automatedCommunicationsTabs.js",
    );
    const workspace = read(
      "src/components/communications/CommunicationsWorkspace.js",
    );

    expect(navigation).toContain('DEFAULT_AUTOMATED_EMAIL_TAB = "history"');
    expect(navigation).toContain('resolvedRequest === "templates"');
    expect(navigation).toContain("activeTab: null");
    expect(page).toContain('if (view === "history")');
    expect(page).toContain('if (view === "templates")');
    expect(workspace).toContain("resolveEmailWorkspaceSection");
    expect(workspace).toContain("<WorkspaceTabs");
    expect(workspace).not.toContain("rounded-[28px] border border-black/5");
  });

  it("uses responsive mobile cards and horizontal-only desktop tables", () => {
    const tableFiles = [
      "src/components/tables/email_notifications/AutomatedEmailsTable.js",
      "src/components/tables/email_notifications/SentEmailLogsTable.js",
      "src/components/tables/email_notifications/RegisteredSenderEmailTable.js",
    ];

    for (const file of tableFiles) {
      const source = read(file);
      expect(source).toContain("WorkspaceTableScroller");
      expect(source).toContain("WorkspaceTable");
      expect(source).not.toContain("max-h-[70vh]");
      expect(source).not.toContain('<WorkspaceTableHeader className="sticky');
    }

    expect(read(tableFiles[0])).toContain("WorkspaceMobileCard");
    expect(read(tableFiles[1])).toContain("WorkspaceMobileCard");
    expect(read(tableFiles[2])).toContain("WorkspaceMobileCard");
  });

  it("keeps every email editor large on desktop and fullscreen on mobile", () => {
    const automationEditor = read(
      "src/components/modals/email_notifications/AutomatedEmailModal.js",
    );
    const templateEditor = read("src/components/modals/EmailTemplateModal.js");
    const senders = read(
      "src/components/tables/email_notifications/RegisteredSenderEmailTable.js",
    );
    const dialogSurface = read(
      "src/components/dashboard/WorkspaceDialogSurface.js",
    );

    expect(automationEditor).toContain('<WorkspaceDialogPanel size="xlarge">');
    expect(templateEditor).toContain('<WorkspaceDialogPanel size="xlarge">');
    expect(senders.match(/<WorkspaceDialogPanel\s+size="large"/g)).toHaveLength(
      2,
    );
    expect(dialogSurface).toContain("h-dvh");
    expect(dialogSurface).toContain("sm:max-h-[calc(100dvh-3rem)]");
  });

  it("uses the shared form and editor surface tokens", () => {
    const templates = read("src/components/tables/EmailTemplatesTable.js");
    const localizedEditor = read(
      "src/components/communications/email/LocalizedEmailEditor.js",
    );

    expect(templates).toContain("workspaceInputClass");
    expect(templates).toContain("WorkspaceStatusPill");
    expect(localizedEditor).toContain("WorkspaceFormSection");
    expect(localizedEditor).toContain("workspaceInputClass");
    expect(localizedEditor).not.toContain("min-h-[42px]");
    expect(localizedEditor).not.toContain("min-h-[40px]");
    expect(localizedEditor).toContain("inline-flex min-h-11");
    expect(localizedEditor).toContain('role="tabpanel"');
    expect(localizedEditor).toContain("aria-controls=");
    expect(localizedEditor).toContain("aria-pressed={active}");
    expect(templates).toContain('role={tone === "error" ? "alert" : "status"}');
    expect(templates).toContain("aria-pressed={Boolean(template.isActive)}");
  });
});
