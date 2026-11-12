import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readMessages = (locale) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `src/messages/${locale}.json`), "utf8"),
  );

const flattenKeys = (value, prefix = "") =>
  Object.entries(value || {}).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object"
      ? flattenKeys(child, path)
      : [path];
  });

describe("waitlist localization contract", () => {
  it("keeps the complete waitlist, catalog and profile copy in EN and CS", () => {
    const english = readMessages("en");
    const czech = readMessages("cs");

    expect(flattenKeys(czech.Waitlists).sort()).toEqual(
      flattenKeys(english.Waitlists).sort(),
    );
    expect(english.Header.account.customerLinks.waitlists).toBe("Waitlists");
    expect(czech.Header.account.customerLinks.waitlists).toBe("Čekací listiny");
    expect(english.Waitlists.publicReasons.disabled).toBe(
      "This class is full and does not have a waitlist.",
    );
    expect(english.Waitlists.publicReasons.join_closed).toBe(
      "This class is full and its waitlist has closed.",
    );
    expect(czech.Waitlists.publicReasons.disabled).toBe(
      "Kurz je plný a nemá čekací listinu.",
    );
    expect(czech.Waitlists.publicReasons.join_closed).toBe(
      "Kurz je plný a čekací listina je uzavřená.",
    );

    for (const localeMessages of [english, czech]) {
      for (const path of flattenKeys(localeMessages.Waitlists)) {
        const value = path
          .split(".")
          .reduce((current, key) => current[key], localeMessages.Waitlists);
        expect(value.trim(), path).not.toBe("");
      }
    }
  });
});
