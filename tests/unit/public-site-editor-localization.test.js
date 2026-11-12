import { describe, expect, it } from "vitest";

import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";

const FIELD_NAMESPACE_KEYS = {
  pages: [
    "labelColor",
    "headlineColor",
    "useTextColor",
    "usingTextColor",
    "customHeadlineColor",
    "adjustedHeadlineColor",
  ],
  login: ["eyebrow", "labelColor"],
  register: [
    "contentTitle",
    "contentDescription",
    "eyebrow",
    "labelColor",
    "headline",
    "supportingText",
    "helpText",
    "imageTitle",
    "imageDescription",
    "backgroundImage",
    "backgroundImageHint",
  ],
  customerPortal: [
    "contentTitle",
    "contentDescription",
    "eyebrow",
    "labelColor",
    "headline",
    "description",
  ],
};

describe("public-site editor field localization", () => {
  it("keeps every registration, portal and custom-colour field localized in EN and CS", () => {
    for (const messages of [enMessages, csMessages]) {
      const editor = messages.PublicSiteEditor;

      for (const [namespace, keys] of Object.entries(FIELD_NAMESPACE_KEYS)) {
        for (const key of keys) {
          expect(editor[namespace][key], `${namespace}.${key}`).toEqual(
            expect.any(String),
          );
          expect(editor[namespace][key].trim(), `${namespace}.${key}`).not.toBe(
            "",
          );
        }
      }
    }

    expect(Object.keys(csMessages.PublicSiteEditor.register).sort()).toEqual(
      Object.keys(enMessages.PublicSiteEditor.register).sort(),
    );
    expect(Object.keys(csMessages.PublicSiteEditor.pages).sort()).toEqual(
      Object.keys(enMessages.PublicSiteEditor.pages).sort(),
    );
    expect(
      Object.keys(csMessages.PublicSiteEditor.customerPortal).sort(),
    ).toEqual(Object.keys(enMessages.PublicSiteEditor.customerPortal).sort());
  });
});
