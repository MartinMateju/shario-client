import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "src/lib/features/communicationAutomations/communicationAutomationsApiSlice.js",
  ),
  "utf8",
);

describe("communication automations API slice contract", () => {
  it("uses the collection endpoint for reads and creates", () => {
    expect(source).toMatch(
      /getCommunicationAutomations:[\s\S]*?url:\s*["']\/communication-automations["']/,
    );
    expect(source).toMatch(
      /createCommunicationAutomation:[\s\S]*?url:\s*["']\/communication-automations["'][\s\S]*?method:\s*["']POST["']/,
    );
  });

  it("uses resource PATCH for edits and true activation changes", () => {
    expect(source).toMatch(
      /updateCommunicationAutomation:[\s\S]*?method:\s*["']PATCH["']/,
    );
    expect(source).toMatch(
      /toggleCommunicationAutomation:[\s\S]*?method:\s*["']PATCH["']/,
    );
    expect(source).toMatch(/body:\s*{\s*isActive,/);
    expect(source).toContain(
      'automationStatus: isActive ? "active" : "inactive"',
    );
  });

  it("uses resource DELETE and exports every editor mutation hook", () => {
    expect(source).toMatch(
      /deleteCommunicationAutomation:[\s\S]*?method:\s*["']DELETE["']/,
    );
    expect(source).toContain("useCreateCommunicationAutomationMutation");
    expect(source).toContain("useUpdateCommunicationAutomationMutation");
    expect(source).toContain("useToggleCommunicationAutomationMutation");
    expect(source).toContain("useDeleteCommunicationAutomationMutation");
  });

  it("optimistically updates activation and rolls back failed requests", () => {
    expect(source).toContain('"getCommunicationAutomations"');
    expect(source).toContain("automation.isActive = isActive");
    expect(source).toContain("patch.undo()");
  });
});
