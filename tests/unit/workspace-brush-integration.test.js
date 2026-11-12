import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  WORKSPACE_BRUSH_PRESETS,
  WORKSPACE_BRUSH_TEXTURES,
} from "../../src/components/decorations/WorkspaceBrushField.config.js";
import { getWorkspaceRouteBrushVariant } from "../../src/components/dashboard/workspaceRouteConfig.js";

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), "utf8");
const readUint24LE = (buffer, offset) =>
  buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);

const parseWebPChunks = (buffer) => {
  const chunks = [];
  let offset = 12;

  while (offset + 8 <= buffer.byteLength) {
    const name = buffer.subarray(offset, offset + 4).toString("ascii");
    const length = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const nextOffset = dataOffset + length + (length % 2);

    if (nextOffset > buffer.byteLength) {
      throw new Error(`Invalid ${name} chunk length`);
    }

    chunks.push({ dataOffset, length, name });
    offset = nextOffset;
  }

  return { chunks, offset };
};

describe("workspace brush integration", () => {
  it("keeps workspace brush fields decorative and separated from interactive content", () => {
    const sidebar = read("src/components/dashboard/DashboardSidebar.js");
    const shell = read("src/components/dashboard/TenantDashboardShell.js");
    const topbar = read("src/components/dashboard/DashboardTopbar.js");
    const overview = read(
      "src/components/dashboard/overview/StudioBriefingHero.js",
    );
    const settingsShell = read("src/components/settings/SettingsShell.js");
    const settingsOverview = read(
      "src/components/settings/SettingsOverviewPage.js",
    );
    const editor = read(
      "src/components/public-site-editor/PublicSiteEditorPage.js",
    );
    const launch = read("src/components/setup-center/SetupCenterPage.js");
    const brushField = read(
      "src/components/decorations/WorkspaceBrushField.js",
    );
    const fieldCss = read(
      "src/components/decorations/WorkspaceBrushField.module.css",
    );

    expect(sidebar).toMatch(
      /\{!mobile && !effectiveCollapsed \? \(\s*<WorkspaceBrushField variant="sidebar" \/>/,
    );
    expect(sidebar).toContain(
      'data-workspace-sidebar={mobile ? "mobile" : "desktop"}',
    );
    expect(sidebar).not.toContain("<BrushStrokeEdge");
    expect(WORKSPACE_BRUSH_PRESETS.sidebar).toHaveLength(3);
    expect(
      WORKSPACE_BRUSH_PRESETS.sidebar.some(({ tone }) => tone === "cobalt"),
    ).toBe(true);

    expect(shell).toContain("getWorkspaceRouteBrushVariant");
    expect(shell).toMatch(
      /<WorkspaceBrushField\s+layer="background"\s+variant=\{workspaceBrushVariant\}\s+className="opacity-75"\s*\/>/,
    );
    expect(shell).toContain("data-skab-workspace-surface");
    expect(shell).toContain("@/styles/workspaceStudioTheme.css");
    expect(shell).toContain("relative isolate min-h-dvh overflow-clip");
    expect(shell).not.toContain("grain-surface");
    expect(shell).not.toContain("<BrushStrokeEdge");

    expect(topbar).toContain(
      '<WorkspaceBrushField variant="overviewTopbar" />',
    );
    expect(topbar).not.toContain("data-workspace-greeting");
    expect(topbar).toContain("sticky top-0 z-30 isolate border-b");
    expect(topbar).not.toContain("isolate overflow-hidden border-b");
    expect(topbar).toContain("relative z-10 mx-auto flex");
    expect(topbar).toContain("data-workspace-topbar-row");
    expect(brushField).toContain(
      "pointer-events-none absolute inset-0 overflow-hidden [contain:paint]",
    );
    expect(WORKSPACE_BRUSH_PRESETS.overviewTopbar).toHaveLength(2);

    expect(overview).toContain(
      '<WorkspaceBrushField variant="overviewHero" />',
    );
    expect(overview).toContain("data-briefing-readability-scrim");
    expect(overview).toContain("styles.briefingScrim");
    expect(overview).toContain("styles.briefing");
    expect(overview).toContain("relative z-10 grid");
    expect(overview).not.toContain("function BriefingContours");

    expect(settingsShell).toContain(
      'isOverview ? null : <WorkspaceBrushField variant="settingsShell" />',
    );

    expect(settingsOverview).toContain(
      '<WorkspaceBrushField variant="settingsHero" />',
    );
    expect(settingsOverview).toContain(
      '<WorkspaceBrushField variant="settingsLaunch" />',
    );
    expect(settingsOverview).not.toMatch(
      /rounded-full bg-(?:coral|cobalt)-200\/\d+ blur-3xl/,
    );

    expect(editor).toContain('<WorkspaceBrushField variant="editorHero" />');
    const editorHeaderClasses = editor
      .match(/<header className="([^"]+)">/)?.[1]
      .split(/\s+/);
    expect(editorHeaderClasses).toEqual(
      expect.arrayContaining([
        "relative",
        "isolate",
        "overflow-hidden",
        "rounded-[22px]",
      ]),
    );
    expect(editor).toContain("relative z-10 flex flex-col");
    expect(editor).not.toMatch(
      /<PublicSiteLivePreview[\s\S]{0,300}<WorkspaceBrushField/,
    );

    expect(launch).toContain('<WorkspaceBrushField variant="launchHero" />');
    expect(launch).toContain("relative isolate overflow-hidden");
    expect(launch).toContain("relative z-10 flex items-start");
    expect(launch).not.toContain("<BrushStrokeEdge");

    expect(new Set(Object.keys(WORKSPACE_BRUSH_PRESETS))).toEqual(
      new Set([
        "sidebar",
        "shell",
        "overviewShell",
        "overviewTopbar",
        "bookingShell",
        "peopleShell",
        "operationsShell",
        "communicationsShell",
        "calendarShell",
        "overviewHero",
        "editorHero",
        "settingsShell",
        "settingsHero",
        "settingsLaunch",
        "launchHero",
      ]),
    );
    expect(WORKSPACE_BRUSH_PRESETS.overviewHero[0].className).toContain(
      "opacity-[0.28]",
    );
    expect(WORKSPACE_BRUSH_PRESETS.overviewHero[0].className).toContain(
      "sm:opacity-[0.34]",
    );
    expect(WORKSPACE_BRUSH_PRESETS.overviewHero[0].className).toContain(
      "xl:opacity-[0.42]",
    );
    expect(WORKSPACE_BRUSH_PRESETS.overviewHero[1].className).toContain(
      "lg:opacity-[0.3]",
    );
    expect(WORKSPACE_BRUSH_PRESETS.overviewHero[1].className).toContain(
      "xl:opacity-[0.4]",
    );
    expect(fieldCss).toContain("@supports");
    expect(fieldCss).not.toMatch(/\b(?:animation|filter|transition)\s*:/);
  });

  it("selects restrained perimeter fields by workspace route", () => {
    expect(getWorkspaceRouteBrushVariant("/app")).toBe("overviewShell");
    expect(getWorkspaceRouteBrushVariant("/app/setup")).toBeNull();
    expect(getWorkspaceRouteBrushVariant("/app/settings/team")).toBeNull();
    expect(getWorkspaceRouteBrushVariant("/app/calendar")).toBe(
      "calendarShell",
    );
    expect(getWorkspaceRouteBrushVariant("/app/bookings/123")).toBe(
      "bookingShell",
    );
    expect(getWorkspaceRouteBrushVariant("/app/users")).toBe("peopleShell");
    expect(getWorkspaceRouteBrushVariant("/app/finance/invoices")).toBe(
      "bookingShell",
    );
    expect(getWorkspaceRouteBrushVariant("/app/communications")).toBe(
      "communicationsShell",
    );
    expect(getWorkspaceRouteBrushVariant("/app/operations")).toBe(
      "operationsShell",
    );
    expect(getWorkspaceRouteBrushVariant("/app/reports")).toBe("shell");

    for (const variant of [
      "overviewShell",
      "bookingShell",
      "peopleShell",
      "operationsShell",
      "communicationsShell",
      "calendarShell",
    ]) {
      expect(WORKSPACE_BRUSH_PRESETS[variant]).toHaveLength(2);
      expect(
        WORKSPACE_BRUSH_PRESETS[variant].some(({ tone }) => tone === "cobalt"),
      ).toBe(true);
      expect(
        WORKSPACE_BRUSH_PRESETS[variant].some(({ tone }) =>
          ["coral", "peach"].includes(tone),
        ),
      ).toBe(true);
    }
  });

  it("ships three unique, optimized, animated-free alpha WebPs", () => {
    const textures = Object.values(WORKSPACE_BRUSH_TEXTURES);
    const hashes = [];
    let totalBytes = 0;

    expect(textures).toHaveLength(3);

    for (const config of textures) {
      const buffer = fs.readFileSync(path.join(root, "public", config.src));
      const { chunks, offset } = parseWebPChunks(buffer);
      const names = chunks.map(({ name }) => name);
      const vp8x = chunks.find(({ name }) => name === "VP8X");

      expect(buffer.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(buffer.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(buffer.readUInt32LE(4) + 8).toBe(buffer.byteLength);
      expect(offset).toBe(buffer.byteLength);
      expect(buffer.byteLength).toBeLessThan(140_000);
      expect(names).toContain("VP8X");
      expect(names).toContain("ALPH");
      expect(names.some((name) => name === "VP8 " || name === "VP8L")).toBe(
        true,
      );
      expect(names).not.toContain("ANIM");
      expect(buffer[vp8x.dataOffset] & 0x10).toBe(0x10);
      expect(readUint24LE(buffer, vp8x.dataOffset + 4) + 1).toBe(config.width);
      expect(readUint24LE(buffer, vp8x.dataOffset + 7) + 1).toBe(config.height);

      totalBytes += buffer.byteLength;
      hashes.push(crypto.createHash("sha256").update(buffer).digest("hex"));
    }

    expect(new Set(hashes).size).toBe(3);
    expect(totalBytes).toBeLessThan(330_000);
  });
});
