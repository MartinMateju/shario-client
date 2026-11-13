import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CATALOG_LOCALE_CODES, loadMessages } from "@/i18n/catalogs";
import {
  ALL_LOCALE_CODES,
  ROLLOUT_ELIGIBLE_LOCALE_CODES,
  WAVE_TWO_A_LOCALE_CODES,
  WAVE_TWO_B_LOCALE_CODES,
  WAVE_TWO_C_LOCALE_CODES,
  WAVE_TWO_D_LOCALE_CODES,
  WAVE_TWO_E_LOCALE_CODES,
  WAVE_TWO_LOCALE_CODES,
} from "@/i18n/locales";
import messagesEn from "@/messages/en.json";
import { validateRequiredCatalogKeys } from "../../scripts/validate-locales.mjs";

describe("locale validator readiness requirements", () => {
  const source = {
    ...messagesEn,
    FutureWorkspaceFeature: { title: "New feature", help: "Feature help" },
  };

  it("rejects a missing Dutch key outside the preview-required namespaces", () => {
    const catalog = {
      ...source,
      FutureWorkspaceFeature: { title: "Nieuwe functie" },
    };
    expect(
      validateRequiredCatalogKeys({ locale: "nl", source, catalog }),
    ).toEqual([
      "nl: FutureWorkspaceFeature is missing 1 keys (FutureWorkspaceFeature.help)",
    ]);
  });

  it("requires newly added namespaces for a ready Dutch catalog", () => {
    expect(
      validateRequiredCatalogKeys({
        locale: "nl",
        source,
        catalog: messagesEn,
      }),
    ).toEqual(["nl: missing required namespace FutureWorkspaceFeature"]);
  });

  it("requires complete product copy even for preview locales", () => {
    expect(
      validateRequiredCatalogKeys({
        locale: "de",
        source,
        catalog: messagesEn,
      }),
    ).toEqual(["de: missing required namespace FutureWorkspaceFeature"]);
  });

  it("still rejects missing required preview copy", () => {
    const catalog = { ...source, Common: { ...source.Common } };
    delete catalog.Common.skipToContent;
    expect(
      validateRequiredCatalogKeys({ locale: "de", source, catalog }),
    ).toEqual(["de: Common is missing 1 keys (Common.skipToContent)"]);
  });

  it("rejects unknown keys in ready-only namespaces", () => {
    const catalog = {
      ...source,
      FutureWorkspaceFeature: {
        ...source.FutureWorkspaceFeature,
        obsolete: "Oud",
      },
    };
    expect(
      validateRequiredCatalogKeys({ locale: "nl", source, catalog }),
    ).toEqual([
      "nl: FutureWorkspaceFeature has 1 unknown keys (FutureWorkspaceFeature.obsolete)",
    ]);
  });

  // Four subprocesses each validate every full catalog; allow for shared CI CPU.
  it("fails the CLI for any missing locale, including Czech and previews", () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "shario-locale-validator-"),
    );
    try {
      fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
      fs.mkdirSync(path.join(fixtureRoot, "src/i18n"), { recursive: true });
      fs.mkdirSync(path.join(fixtureRoot, "src/messages"), { recursive: true });
      fs.writeFileSync(
        path.join(fixtureRoot, "package.json"),
        '{"type":"module"}',
      );
      for (const filename of [
        "scripts/validate-locales.mjs",
        "src/i18n/locales.js",
      ]) {
        fs.copyFileSync(
          path.resolve(filename),
          path.join(fixtureRoot, filename),
        );
      }
      const writeCatalog = (locale, catalog) =>
        fs.writeFileSync(
          path.join(fixtureRoot, "src/messages", `${locale}.json`),
          JSON.stringify(catalog),
        );
      for (const locale of ALL_LOCALE_CODES) writeCatalog(locale, source);
      writeCatalog("de", messagesEn);
      writeCatalog("nl", {
        ...source,
        FutureWorkspaceFeature: { title: "Nieuwe functie" },
      });
      const run = () =>
        spawnSync(
          process.execPath,
          [path.join(fixtureRoot, "scripts/validate-locales.mjs")],
          { encoding: "utf8" },
        );
      const incomplete = run();
      expect(incomplete.status).toBe(1);
      expect(incomplete.stderr).toContain(
        "nl: FutureWorkspaceFeature is missing 1 keys (FutureWorkspaceFeature.help)",
      );

      writeCatalog("nl", source);
      expect(run().stderr).toContain(
        "de: missing required namespace FutureWorkspaceFeature",
      );
      writeCatalog("de", source);
      fs.unlinkSync(path.join(fixtureRoot, "src/messages/cs.json"));
      expect(run().stderr).toContain("cs: missing catalog file");
      writeCatalog("cs", source);
      const complete = run();
      expect(complete.status).toBe(0);
      expect(complete.stdout).toContain("Target catalogs passed");
    } finally {
      // Only remove the exact disposable directory created for this test.
      const resolved = path.resolve(fixtureRoot);
      if (
        path.dirname(resolved) !== path.resolve(os.tmpdir()) ||
        !path.basename(resolved).startsWith("shario-locale-validator-")
      ) {
        throw new Error("Unexpected locale-validator fixture directory");
      }
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }, 15_000);
});

describe("complete message catalogs without English overlays", () => {
  it.each(ALL_LOCALE_CODES)("loads exactly the %s catalog", async (locale) => {
    const catalog = JSON.parse(
      fs.readFileSync(path.resolve(`src/messages/${locale}.json`), "utf8"),
    );
    await expect(loadMessages(locale)).resolves.toEqual(catalog);
    expect(
      validateRequiredCatalogKeys({ locale, source: messagesEn, catalog }),
    ).toEqual([]);
  });

  it("keeps catalog loaders aligned with every rollout-eligible locale", () => {
    expect(CATALOG_LOCALE_CODES).toEqual(ROLLOUT_ELIGIBLE_LOCALE_CODES);
    expect(
      CATALOG_LOCALE_CODES.filter((locale) =>
        WAVE_TWO_LOCALE_CODES.includes(locale),
      ),
    ).toEqual([
      ...WAVE_TWO_A_LOCALE_CODES,
      ...WAVE_TWO_B_LOCALE_CODES,
      ...WAVE_TWO_C_LOCALE_CODES,
      ...WAVE_TWO_D_LOCALE_CODES,
      ...WAVE_TWO_E_LOCALE_CODES,
    ]);
  });

  it.each(ALL_LOCALE_CODES.filter((locale) => locale !== "en"))(
    "loads localized tenant-core copy for %s",
    async (locale) => {
      const messages = await loadMessages(locale);

      expect(messages.Metadata.homeTitle).toEqual(expect.any(String));
      expect(messages.Common.skipToContent).toEqual(expect.any(String));
      expect(messages.Dashboard.greetingMorning).not.toBe(
        messagesEn.Dashboard.greetingMorning,
      );
      expect(messages.WorkspaceSettings.title).not.toBe(
        messagesEn.WorkspaceSettings.title,
      );
      expect(messages.WorkspaceSettingsNav.title).not.toBe(
        messagesEn.WorkspaceSettingsNav.title,
      );
    },
  );

  it("uses complete English messages for an unsupported locale", async () => {
    await expect(loadMessages("not-a-locale")).resolves.toEqual(messagesEn);
  });

  it("reuses the catalog promise for canonical locale aliases", () => {
    expect(loadMessages("de-DE")).toBe(loadMessages("de"));
    expect(loadMessages("pt_PT")).toBe(loadMessages("pt-PT"));
    expect(loadMessages("sv-SE")).toBe(loadMessages("sv"));
    expect(loadMessages("no_NO")).toBe(loadMessages("nb"));
    expect(loadMessages("fi-FI")).toBe(loadMessages("fi"));
    expect(loadMessages("hu-HU")).toBe(loadMessages("hu"));
    expect(loadMessages("el_GR")).toBe(loadMessages("el"));
    expect(loadMessages("tr-TR")).toBe(loadMessages("tr"));
    expect(loadMessages("nl_NL")).toBe(loadMessages("nl"));
    expect(loadMessages("ro_RO")).toBe(loadMessages("ro"));
  });
});
