import { describe, expect, it } from "vitest";

import {
  selectCurrentLanguage,
  updateLanguage,
} from "@/lib/features/language/languageSlice";
import { makeStore } from "@/lib/store";

describe("legacy locale store bridge", () => {
  it.each(["CZ", "EN"])(
    "seeds %s synchronously before connected children render",
    (legacyLanguage) => {
      const { store, persistor, teardownListeners } = makeStore({
        legacyLanguage,
      });

      expect(selectCurrentLanguage(store.getState())).toBe(legacyLanguage);

      persistor.pause();
      teardownListeners();
    },
  );

  it("keeps the reducer pure while normalizing Wave 1 to legacy English", () => {
    const { store, persistor, teardownListeners } = makeStore({
      legacyLanguage: "CZ",
    });

    store.dispatch(updateLanguage("de-DE"));

    expect(selectCurrentLanguage(store.getState())).toBe("EN");

    persistor.pause();
    teardownListeners();
  });
});
