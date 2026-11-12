import { describe, expect, it } from "vitest";

import { getAutomatedCommunicationsHref } from "@/components/views/automated_communications/automatedCommunications.navigation";

describe("automated communications navigation", () => {
  it("preserves Launch Center context while changing tabs", () => {
    expect(
      getAutomatedCommunicationsHref(
        new URLSearchParams(
          "section=setup&setupStep=communications&source=launch-center",
        ),
        "senders",
      ),
    ).toBe(
      "/app/communications?section=automations&setupStep=communications&source=launch-center&tab=senders",
    );
  });
});
