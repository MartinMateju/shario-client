import { describe, expect, it } from "vitest";
import {
  getLaunchCenterSections,
  getNextBestSetupStep,
  getNextRequiredSetupStep,
  getOverviewSetupPresentation,
  getSetupDisplayState,
  hasIncompleteSetupStep,
} from "@/components/setup-center/setupCenter.utils";
const step = ({
  id,
  requirement = "required",
  status = "incomplete",
  applicable = true,
  reasonCode,
}) => ({
  id,
  requirement,
  status,
  applicable,
  ...(reasonCode
    ? {
        reasonCode,
      }
    : {}),
});
describe("Launch Center sections", () => {
  it("separates unfinished, blocked, completed, and improvement outcomes", () => {
    const setup = {
      steps: [
        step({
          id: "studio",
          status: "complete",
        }),
        step({
          id: "location",
        }),
        step({
          id: "bookable_offer",
          status: "blocked",
        }),
        step({
          id: "payments",
          requirement: "recommended",
          status: "complete",
        }),
        step({
          id: "communications",
          requirement: "recommended",
        }),
        step({
          id: "inventory",
          requirement: "recommended",
          status: "not_applicable",
          applicable: false,
          reasonCode: "inventory_module_disabled",
        }),
        step({
          id: "team",
          requirement: "optional",
          status: "blocked",
        }),
        step({
          id: "membership",
          requirement: "recommended",
          status: "not_applicable",
          applicable: false,
          reasonCode: "memberships_module_disabled",
        }),
      ],
    };
    const sections = getLaunchCenterSections(setup);
    expect(sections.finish.map(({ id }) => id)).toEqual(["location"]);
    expect(sections.waiting.map(({ id }) => id)).toEqual([
      "bookable_offer",
      "team",
    ]);
    expect(sections.ready.map(({ id }) => id)).toEqual([
      "studio",
      "payments",
      "membership",
      "inventory",
    ]);
    expect(sections.improve.map(({ id }) => id)).toEqual(["communications"]);
  });
  it("returns empty sections for a missing snapshot", () => {
    expect(getLaunchCenterSections()).toEqual({
      required: [],
      recommended: [],
      availableLater: [],
      finish: [],
      waiting: [],
      ready: [],
      improve: [],
    });
  });
});
describe("next required Launch Center outcome", () => {
  it("preserves server order when an earlier required outcome is blocked", () => {
    const setup = {
      steps: [
        step({
          id: "location",
          status: "blocked",
        }),
        step({
          id: "bookable_offer",
        }),
        step({
          id: "communications",
          requirement: "recommended",
        }),
      ],
    };
    expect(getNextRequiredSetupStep(setup)?.id).toBe("location");
  });
  it("ignores completed and non-applicable outcomes", () => {
    const setup = {
      steps: [
        step({
          id: "studio",
          status: "complete",
        }),
        step({
          id: "payments",
          status: "not_applicable",
          applicable: false,
          reasonCode: "payments_not_applicable",
        }),
        step({
          id: "location",
        }),
      ],
    };
    expect(getNextRequiredSetupStep(setup)?.id).toBe("location");
  });
  it("does not promote a recommendation when required work is complete", () => {
    const setup = {
      steps: [
        step({
          id: "studio",
          status: "complete",
        }),
        step({
          id: "inventory",
          requirement: "recommended",
        }),
      ],
    };
    expect(getNextRequiredSetupStep(setup)).toBeNull();
  });
});
describe("next best Launch Center outcome", () => {
  it("keeps recommended setup steps in their configured order before publish", () => {
    const setup = {
      publication: {
        status: "draft",
      },
      steps: [
        step({
          id: "studio",
          status: "complete",
        }),
        step({
          id: "communications",
          requirement: "recommended",
        }),
        step({
          id: "public_site",
          requirement: "recommended",
          status: "complete",
        }),
        {
          ...step({
            id: "publish",
            requirement: "recommended",
          }),
          actions: [
            {
              key: "publish_studio",
              href: "/app/setup?step=publish",
              enabled: true,
            },
          ],
        },
      ],
    };
    expect(getNextBestSetupStep(setup)?.id).toBe("communications");
  });
  it("never skips website customization for a prematurely enabled publish action", () => {
    const setup = {
      publication: {
        status: "draft",
      },
      steps: [
        step({
          id: "studio",
          status: "complete",
        }),
        step({
          id: "public_site",
          requirement: "recommended",
          status: "incomplete",
        }),
        {
          ...step({
            id: "publish",
            requirement: "recommended",
          }),
          actions: [
            {
              key: "publish_studio",
              href: "/app/setup?step=publish",
              enabled: true,
            },
          ],
        },
      ],
    };
    expect(getNextBestSetupStep(setup)?.id).toBe("public_site");
  });
  it("keeps the customer journey after every earlier recommendation", () => {
    const setup = {
      publication: {
        status: "live",
      },
      steps: [
        step({
          id: "communications",
          requirement: "recommended",
        }),
        step({
          id: "public_site",
          requirement: "recommended",
          status: "complete",
        }),
        step({
          id: "publish",
          requirement: "recommended",
          status: "complete",
        }),
        step({
          id: "practice_booking",
          requirement: "recommended",
          status: "incomplete",
        }),
      ],
    };
    expect(getNextBestSetupStep(setup)?.id).toBe("communications");
    setup.steps[0].status = "complete";
    expect(getNextBestSetupStep(setup)?.id).toBe("practice_booking");
  });
});
describe("Launch Center display states", () => {
  it("treats an incomplete required outcome as setup needed", () => {
    expect(
      getSetupDisplayState(
        step({
          id: "location",
          status: "incomplete",
        }),
      ),
    ).toBe("setup_needed");
  });
  it.each(["required", "recommended", "optional"])(
    "treats an applicable blocked %s outcome as waiting",
    (requirement) => {
      expect(
        getSetupDisplayState(
          step({
            id: "blocked",
            requirement,
            status: "blocked",
          }),
        ),
      ).toBe("waiting");
    },
  );
  it.each(["recommended", "optional"])(
    "labels incomplete %s work as recommended",
    (requirement) => {
      expect(
        getSetupDisplayState(
          step({
            id: "improvement",
            requirement,
            status: "incomplete",
          }),
        ),
      ).toBe("recommended");
    },
  );
  it("treats an explicitly completed outcome as ready", () => {
    expect(
      getSetupDisplayState(
        step({
          id: "studio",
          status: "complete",
          applicable: false,
        }),
      ),
    ).toBe("ready");
  });
  it.each([
    "firing_module_disabled",
    "memberships_module_disabled",
    "booking_workflow_disabled",
  ])(
    "uses not enabled only for an explicit disabled reason: %s",
    (reasonCode) => {
      expect(
        getSetupDisplayState(
          step({
            id: "disabled",
            status: "not_applicable",
            applicable: false,
            reasonCode,
          }),
        ),
      ).toBe("not_enabled");
    },
  );
  it.each([
    "solo_workspace",
    "location_not_required",
    "payments_not_applicable",
    "public_site_not_applicable",
    "future_reason",
  ])(
    "keeps a non-applicable outcome semantically neutral: %s",
    (reasonCode) => {
      expect(
        getSetupDisplayState(
          step({
            id: "not-needed",
            status: "not_applicable",
            applicable: false,
            reasonCode,
          }),
        ),
      ).toBe("not_needed");
    },
  );
});
describe("Overview Launch Center presentation", () => {
  it("keeps incomplete required setup in the guided presentation", () => {
    expect(
      getOverviewSetupPresentation({
        steps: [
          step({
            id: "studio",
            status: "complete",
          }),
          step({
            id: "location",
            status: "incomplete",
          }),
        ],
      }),
    ).toBe("guided");
  });
  it("hides Overview guidance once the launch journey is complete", () => {
    expect(
      getOverviewSetupPresentation({
        launchReview: {
          launchComplete: true,
          testBooking: {
            applicable: true,
            complete: true,
          },
        },
        steps: [
          step({
            id: "studio",
            status: "complete",
          }),
          step({
            id: "communications",
            requirement: "recommended",
            status: "incomplete",
          }),
        ],
      }),
    ).toBe("hidden");
  });
  it("finds an applicable unfinished payment step without treating completed or disabled steps as reminders", () => {
    expect(
      hasIncompleteSetupStep(
        {
          steps: [
            step({
              id: "payments",
              status: "incomplete",
            }),
          ],
        },
        "payments",
      ),
    ).toBe(true);
    expect(
      hasIncompleteSetupStep(
        {
          steps: [
            step({
              id: "payments",
              status: "complete",
            }),
          ],
        },
        "payments",
      ),
    ).toBe(false);
    expect(
      hasIncompleteSetupStep(
        {
          steps: [
            step({
              id: "payments",
              status: "not_applicable",
              applicable: false,
              reasonCode: "payments_not_applicable",
            }),
          ],
        },
        "payments",
      ),
    ).toBe(false);
  });
});
