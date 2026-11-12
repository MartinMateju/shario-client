import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readMessages = (locale) =>
  JSON.parse(
    readFileSync(resolve(process.cwd(), `src/messages/${locale}.json`), "utf8"),
  );

const leafEntries = (value, prefix = "") =>
  Object.entries(value ?? {}).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return item && typeof item === "object" && !Array.isArray(item)
      ? leafEntries(item, path)
      : [[path, item]];
  });

describe("dashboard localization", () => {
  const en = readMessages("en");
  const cs = readMessages("cs");
  const dashboardLocales = [
    "en",
    "cs",
    "de",
    "pl",
    "sk",
    "da",
    "fr",
    "es",
    "it",
    "pt-PT",
    "sv",
    "nb",
    "fi",
    "hu",
    "el",
    "tr",
    "nl",
    "ro",
  ];
  const planKeys = ["starter", "professional", "studio_plus", "enterprise"];

  it.each([
    "Header",
    "Dashboard",
    "WorkspaceSettingsNav",
    "WorkspaceModules",
    "SetupCenter",
    "WorkspaceSettingsOverview",
  ])("keeps the English and Czech %s message keys in parity", (namespace) => {
    const englishKeys = leafEntries(en[namespace])
      .map(([key]) => key)
      .sort();
    const czechKeys = leafEntries(cs[namespace])
      .map(([key]) => key)
      .sort();

    expect(czechKeys).toEqual(englishKeys);
  });

  it.each(planKeys)("defines the %s dashboard plan in every locale", (plan) => {
    expect(en.Dashboard.plans[plan]).toEqual(expect.any(String));
    expect(en.Dashboard.plans[plan]).not.toBe("");
    expect(cs.Dashboard.plans[plan]).toEqual(expect.any(String));
    expect(cs.Dashboard.plans[plan]).not.toBe("");
  });

  it.each(dashboardLocales)(
    "localizes the compact snapshot and uses honest %s briefing labels",
    (locale) => {
      const overview = readMessages(locale).Dashboard.overview;

      expect(overview.snapshot).toEqual(
        expect.objectContaining({
          title: expect.any(String),
          bookings: expect.any(String),
          expectedVisitors: expect.any(String),
          actionablePieces: expect.any(String),
          unreadMessages: expect.any(String),
          revenue: expect.any(String),
          date: expect.any(String),
          currentState: expect.any(String),
          unavailable: expect.any(String),
          live: expect.any(String),
        }),
      );
      expect(
        Object.values(overview.snapshot).every((value) => value.length > 0),
      ).toBe(true);
      expect(overview.dateNavigation).toEqual(
        expect.objectContaining({
          previousDay: expect.any(String),
          nextDay: expect.any(String),
          today: expect.any(String),
          backToToday: expect.any(String),
          chooseDate: expect.any(String),
        }),
      );
      expect(
        Object.values(overview.dateNavigation).every(
          (value) => typeof value === "string" && value.length > 0,
        ),
      ).toBe(true);
      expect(overview.briefing.operationalEyebrow).not.toContain("·");
      expect(overview.briefing.verifiedEyebrow).not.toContain("·");
      expect(overview.briefing.aiEyebrow).not.toContain("·");
    },
  );

  it("uses Czech copy for the visible launch and plan labels", () => {
    expect(cs.Dashboard.setupCenter).toBe("Centrum spuštění");
    expect(cs.Dashboard.openSetupCenter).toBe("Otevřít Centrum spuštění");
    expect(cs.Dashboard.nav.setup).toBe("Centrum spuštění");
    expect(cs.Dashboard.routeTitles.setup).toBe("Centrum spuštění");
    expect(cs.Dashboard.plans.professional).toBe("Profesionální");
    expect(cs.Header.account.tenantLinks.setupCenter).toBe("Centrum spuštění");
    expect(cs.WorkspaceSettingsNav.items.setup).toBe("Centrum spuštění");
    expect(cs.WorkspaceModules.returnToLaunchCenter).toBe(
      "Zpět do Centra spuštění",
    );
    expect(cs.WorkspaceModules.intentUnconfirmed).toContain("Centrum spuštění");
    expect(cs.WorkspaceModules.workflowQuestions.reviewDescription).toContain(
      "Centrum spuštění",
    );
    expect(cs.SetupCenter.widget.eyebrow).toBe("Centrum spuštění");
    expect(cs.SetupCenter.widget.review).toBe("Projít Centrum spuštění");
    expect(cs.WorkspaceSettingsOverview.launchCenter.action).toBe(
      "Otevřít Centrum spuštění",
    );

    const visibleCzechCopy = [
      ...leafEntries(cs.Header.account.tenantLinks),
      ...leafEntries(cs.Dashboard),
      ...leafEntries(cs.WorkspaceSettingsNav),
      ...leafEntries(cs.WorkspaceModules),
      ...leafEntries(cs.SetupCenter),
      ...leafEntries(cs.WorkspaceSettingsOverview),
    ]
      .map(([, value]) => value)
      .filter((value) => typeof value === "string");

    expect(visibleCzechCopy.some((value) => /Launch Center/i.test(value))).toBe(
      false,
    );
    expect(visibleCzechCopy).not.toContain("Professional");
  });

  it("keeps the dashboard status and schedule actions friendly in both locales", () => {
    expect(en.Header.account.customerLinks.waitlists).toBe("Waitlists");
    expect(cs.Header.account.customerLinks.waitlists).toBe("Čekací listiny");
    expect(en.Dashboard.utilityNavigationLabel).toBe(
      "Studio setup and settings",
    );
    expect(en.Dashboard.launchCenterRequiredProgress).toContain("{completed}");
    expect(cs.Dashboard.utilityNavigationLabel).toBe(
      "Spuštění a nastavení studia",
    );
    expect(cs.Dashboard.launchCenterRequiredProgress).toContain("{completed}");
    expect(en.Dashboard.overview.briefing.viewTodaySchedule).toBe(
      "View today’s schedule",
    );
    expect(cs.Dashboard.overview.briefing.viewTodaySchedule).toBe(
      "Zobrazit dnešní program",
    );
    expect(en.Dashboard.overview.snapshot.expectedVisitors).toBe(
      "Expected visitors",
    );
    expect(en.Dashboard.overview.snapshot.title).toBe("At a glance");
    expect(en.Dashboard.overview.snapshot.bookings).toBe("Bookings");
    expect(en.Dashboard.overview.snapshot.revenue).toBe("Revenue");
    expect(cs.Dashboard.overview.snapshot.expectedVisitors).toBe(
      "Očekávaní návštěvníci",
    );
    expect(cs.Dashboard.overview.snapshot.title).toBe("Přehled");
    expect(cs.Dashboard.overview.snapshot.bookings).toBe("Rezervace");
    expect(cs.Dashboard.overview.snapshot.revenue).toBe("Tržby");
    expect(en.Dashboard.overview.snapshot.live).toBe("Live");
    expect(en.Dashboard.overview.snapshot.currentState).toBe("Current");
    expect(en.Dashboard.overview.dateNavigation.backToToday).toBe(
      "Back to today",
    );
    expect(cs.Dashboard.overview.dateNavigation.backToToday).toEqual(
      expect.any(String),
    );
    expect(en.Dashboard.overview.briefing.deterministicSummary).not.toMatch(
      /\bToday\b/i,
    );
    expect(cs.Dashboard.overview.briefing.deterministicSummary).not.toMatch(
      /\bDnes\b/i,
    );
    expect(en.Dashboard.overview.rhythm.emptyTitle).not.toMatch(/\bToday\b/i);
    expect(cs.Dashboard.overview.rhythm.emptyTitle).not.toMatch(/\bDnes\b/i);
    expect(en.Dashboard.overview.briefing.coverageComplete).toContain(
      "studio signal",
    );
    expect(cs.Dashboard.overview.briefing.coverageComplete).toContain(
      "signálu ze studia",
    );
    expect(en.Dashboard.overview.flow.title).toBe("Studio operations");
    expect(cs.Dashboard.overview.flow.title).toBe("Provoz studia");
    expect(en.Dashboard.overview.flow.emptyTitle).toBe(
      "No studio activity is scheduled yet",
    );
    expect(cs.Dashboard.overview.flow.emptyTitle).toBe(
      "Dnes zatím není naplánovaný žádný provoz",
    );
    expect(en.Dashboard.overview.flow.groups.visits.title).toBe(
      "Bookings & attendance",
    );
    expect(en.Dashboard.overview.opportunity.items.noBookings).toBe(
      "No upcoming bookings yet.",
    );
    expect(cs.Dashboard.overview.opportunity.items.noBookings).toBe(
      "Zatím nejsou žádné nadcházející rezervace.",
    );
    expect(en.Dashboard.overview.opportunity.guidance).toContain(
      "new studio data",
    );
    expect(cs.Dashboard.overview.opportunity.guidance).toContain(
      "nová data ze studia",
    );
  });

  it("keeps the onboarding handoff as intentional product copy", () => {
    expect(cs.Onboarding.headings.description).toContain("Launch Center");
    expect(cs.Onboarding.sidebar.eyebrow).toBe("DALŠÍ: LAUNCH CENTER");
    expect(cs.Onboarding.actions.openLaunchCenter).toContain("Launch Center");
  });
});
