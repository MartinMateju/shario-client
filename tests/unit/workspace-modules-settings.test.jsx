import "@testing-library/jest-dom/vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const MODULE_KEYS = [
  "bookings",
  "payments",
  "customers",
  "courses",
  "memberships",
  "credits",
  "vouchers",
  "automations",
  "newsletter",
  "firing",
  "inventory",
  "staff_tasks",
  "access_codes",
  "communications",
  "ai",
];
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  unwrap: vi.fn(),
  data: null,
  search: "",
}));
const moduleName = {
  bookings: "Bookings",
  payments: "Payments",
  customers: "Customers",
  courses: "Courses & events",
  memberships: "Memberships",
  credits: "Credits",
  vouchers: "Vouchers",
  automations: "Automations",
  newsletter: "Newsletter",
  firing: "Kilns & Firings",
  inventory: "Inventory",
  staff_tasks: "Staff planning",
  access_codes: "Door access",
  communications: "Communications",
  ai: "Studio AI",
};
const dashboardName = {
  studio: "Studio",
  studioFlow: "Studio flow",
  firing: "Studio flow",
};
const labels = {
  "presets.eyebrow": "Fast start",
  "presets.title": "Choose how your studio works",
  "presets.description": "Start with the closest workflow.",
  "presets.note": "Templates only select modules included in your plan.",
  "presets.options.bookingStudio.title": "Booking studio",
  "presets.options.firingStudio.title": "Membership studio",
  "presets.options.membershipStudio.title": "Membership studio",
  "presets.options.fullPotteryStudio.title": "Full pottery studio",
  "presets.applied": "Preset applied. Review the draft, then save.",
  "presets.notAvailable": "A required module is not included.",
  returnToLaunchCenter: "Return to Launch Center",
  save: "Save configuration",
  reviewPlan: "Review plan",
  unsaved: "You have unsaved changes.",
  intentUnconfirmed: "Confirm your workspace setup.",
  notIncluded: "Not included",
  active: "Active",
  requiresCommunications: "Requires Communications",
  saved: "Workspace configuration saved.",
  upToDate: "Your workspace configuration is up to date.",
  "workflowQuestions.eyebrow": "Studio workflows",
  "workflowQuestions.title": "How does your studio work?",
  "workflowQuestions.description":
    "Answer a few questions to focus your workspace.",
  "workflowQuestions.summaryLabel": "Workflow answers",
  "workflowQuestions.current": "Current question",
  "workflowQuestions.yes": "Yes, set it up",
  "workflowQuestions.notNow": "Not now",
  "workflowQuestions.pricingModes.time": "By time",
  "workflowQuestions.pricingModes.piece": "By piece",
  "workflowQuestions.pricingModes.both": "Both",
  "workflowQuestions.states.included": "Included",
  "workflowQuestions.states.notEnabled": "Not enabled",
  "workflowQuestions.states.notIncluded": "Not included",
  "workflowQuestions.edit": "Edit",
  "workflowQuestions.reviewTitle": "Your workspace is ready to configure",
  "workflowQuestions.reviewDescription": "Review your answers and save.",
  "workflowQuestions.editReviewDescription":
    "Review changes before applying them.",
  "workflowQuestions.save": "Save and continue",
  "workflowQuestions.applyChanges": "Apply changes",
  "workflowQuestions.cancel": "Cancel",
  "workflowQuestions.changePreview.title": "Changes to apply",
  "workflowQuestions.changePreview.answers": "Questionnaire answers updated",
  "workflowQuestions.changePreview.noChanges": "No changes",
};
vi.mock("next-intl", () => ({
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      if (namespace === "Dashboard") {
        const value = key.replace("nav.", "");
        return (
          dashboardName[value] || value.charAt(0).toUpperCase() + value.slice(1)
        );
      }
      if (key.startsWith("modules.") && key.endsWith(".name")) {
        return moduleName[key.split(".")[1]];
      }
      if (key === "toggleModule") return `Toggle ${values.module}`;
      if (key === "toggleNavigation")
        return `Show ${values.item} in navigation`;
      if (key === "workflowQuestions.progress") {
        return `${values.completed} of ${values.total} answered`;
      }
      if (key === "workflowQuestions.changePreview.enabled") {
        return `Enabled: ${values.modules ?? values.names ?? values.count}`;
      }
      if (key === "workflowQuestions.changePreview.disabled") {
        return `Disabled: ${values.modules ?? values.names ?? values.count}`;
      }
      if (key === "workflowQuestions.changePreview.navigation") {
        return `Navigation: ${values.items ?? values.names ?? "updated"}`;
      }
      if (key === "workflowQuestions.changePreview.moduleEnabled") {
        return `Enable ${values.name}`;
      }
      if (key === "workflowQuestions.changePreview.moduleDisabled") {
        return `Disable ${values.name}`;
      }
      if (key === "workflowQuestions.changePreview.navigationShown") {
        return `Show ${values.name} in navigation`;
      }
      if (key === "workflowQuestions.changePreview.navigationHidden") {
        return `Hide ${values.name} from navigation`;
      }
      if (key === "workflowQuestions.changePreview.answerYes") {
        return `Set ${values.name} to Yes`;
      }
      if (key === "workflowQuestions.changePreview.answerNo") {
        return `Set ${values.name} to Not now`;
      }
      if (
        key.startsWith("workflowQuestions.items.") &&
        key.endsWith(".question")
      ) {
        return `Question about ${key.split(".")[2]}`;
      }
      if (
        key.startsWith("workflowQuestions.items.") &&
        key.endsWith(".description")
      ) {
        return `Description for ${key.split(".")[2]}`;
      }
      return labels[key] || key;
    },
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        workspaceAccess: {
          role: "owner",
          status: "active",
        },
      },
    }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetWorkspaceConfigurationQuery: () => ({
    data: mocks.data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateWorkspaceConfigurationMutation: () => [
    mocks.update,
    {
      isLoading: false,
    },
  ],
}));
import WorkspaceModulesPage from "@/components/views/settings/WorkspaceModulesPage";
const configuration = ({ intentConfigured = true } = {}) => ({
  definitionVersion: 1,
  intent: {
    configured: intentConfigured,
    definitionVersion: 1,
  },
  modules: Object.fromEntries(
    MODULE_KEYS.map((key) => [
      key,
      {
        entitled: key !== "newsletter",
        selected: !["newsletter", "firing", "inventory"].includes(key),
        enabled: !["newsletter", "firing", "inventory"].includes(key),
      },
    ]),
  ),
  effectiveModules: Object.fromEntries(
    MODULE_KEYS.map((key) => [
      key,
      !["newsletter", "firing", "inventory"].includes(key),
    ]),
  ),
  navigation: {
    hiddenGroups: [],
    hiddenItems: [],
  },
});
const expandTemplates = async () => {
  const disclosure = await screen.findByRole("button", {
    name: /Choose how your studio works/i,
  });
  if (disclosure.getAttribute("aria-expanded") === "false") {
    fireEvent.click(disclosure);
  }
  return disclosure;
};
describe("WorkspaceModulesPage", () => {
  beforeEach(() => {
    mocks.data = configuration();
    mocks.update.mockReset();
    mocks.unwrap.mockReset();
    mocks.search = "";
    mocks.unwrap.mockResolvedValue(configuration());
    mocks.update.mockReturnValue({
      unwrap: mocks.unwrap,
    });
  });
  it("hydrates entitlement state and keeps unavailable modules off and locked", async () => {
    render(<WorkspaceModulesPage />);
    const newsletter = await screen.findByRole("switch", {
      name: "Toggle Newsletter",
    });
    expect(newsletter).toBeDisabled();
    expect(newsletter).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Not included")).toBeInTheDocument();
  });
  it("lets an owner enable entitled Door access independently and save the selection", async () => {
    mocks.data.modules.access_codes = {
      entitled: true,
      selected: false,
      enabled: false,
    };
    mocks.data.effectiveModules.access_codes = false;
    render(<WorkspaceModulesPage />);
    const doorAccess = await screen.findByRole("switch", {
      name: "Toggle Door access",
    });
    expect(doorAccess).toBeEnabled();
    expect(doorAccess).toHaveAttribute("aria-checked", "false");
    fireEvent.click(doorAccess);
    expect(doorAccess).toHaveAttribute("aria-checked", "true");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Save configuration",
      }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0].modules).toEqual({
      access_codes: true,
    });
  });
  it("keeps Door access locked when the plan does not include it", async () => {
    mocks.data.modules.access_codes = {
      entitled: false,
      selected: true,
      enabled: false,
    };
    mocks.data.effectiveModules.access_codes = false;
    render(<WorkspaceModulesPage />);
    const doorAccess = await screen.findByRole("switch", {
      name: "Toggle Door access",
    });
    expect(doorAccess).toBeDisabled();
    expect(doorAccess).toHaveAttribute("aria-checked", "false");
    fireEvent.click(doorAccess);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("keeps templates and save actions out of the way until they are needed", async () => {
    render(<WorkspaceModulesPage />);
    const disclosure = await screen.findByRole("button", {
      name: /Choose how your studio works/i,
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", {
        name: /Membership studio/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Save configuration",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Your workspace configuration is up to date."),
    ).not.toBeInTheDocument();
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", {
        name: /Membership studio/,
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("switch", {
        name: "Toggle Inventory",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Save configuration",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
  });
  it("preserves automation intent while showing its communications dependency", async () => {
    render(<WorkspaceModulesPage />);
    const communications = await screen.findByRole("switch", {
      name: "Toggle Communications",
    });
    const automations = screen.getByRole("switch", {
      name: "Toggle Automations",
    });
    fireEvent.click(communications);
    expect(communications).toHaveAttribute("aria-checked", "false");
    expect(automations).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Requires Communications")).toBeInTheDocument();
  });
  it("offers an explicit return after saving a workflow from Launch Center", async () => {
    mocks.search = "from=launch-center";
    render(<WorkspaceModulesPage />);
    await expandTemplates();
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Membership studio/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Save configuration",
      }),
    );
    expect(
      await screen.findByRole("link", {
        name: "Return to Launch Center",
      }),
    ).toHaveAttribute("href", "/app/setup");
  });
  it("keeps the completed questionnaire focused and returns to Launch Center", async () => {
    mocks.search = "from=launch-center";
    mocks.data = configuration({
      intentConfigured: false,
    });
    render(<WorkspaceModulesPage />);
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "How does your studio work?",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Not now",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Not now",
      }),
    );
    for (let index = 0; index < 3; index += 1)
      fireEvent.click(
        screen.getByRole("button", {
          name: "Not now",
        }),
      );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const body = mocks.update.mock.calls[0][0];
    expect(body).not.toHaveProperty("modules");
    expect(body.intent.definitionVersion).toBe(2);
    expect(body.intent.answers).toEqual({
      sharedStudio: false,
      classes: false,
      memberships: false,
      vouchers: false,
      inventory: false,
    });
    expect(body.intent.pricingMode).toBe("time");
    expect(body.intent).not.toHaveProperty("modules");
    expect(body).not.toHaveProperty("navigation");
    expect(
      await screen.findByRole("heading", {
        name: "Workspace configuration saved.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your workspace configuration is up to date."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Return to Launch Center",
      }),
    ).toHaveAttribute("href", "/app/setup");
    expect(
      screen.queryByRole("switch", {
        name: "Toggle Bookings",
      }),
    ).not.toBeInTheDocument();
  });
  it("prefills saved answers and applies an explicit, reviewable questionnaire edit", async () => {
    mocks.search = "from=launch-center&workflow=edit";
    mocks.data = configuration();
    mocks.data.intent = {
      ...mocks.data.intent,
      answers: {
        sharedStudio: true,
        classes: false,

        memberships: true,
        vouchers: true,
        inventory: false,
      },
      pricingMode: "time",
      updatedAt: "2026-08-29T12:00:00.000Z",
    };
    mocks.data.modules.courses = {
      entitled: true,
      selected: false,
      enabled: false,
    };
    mocks.data.effectiveModules.courses = false;
    mocks.data.navigation = {
      hiddenGroups: ["studio"],
      hiddenItems: [
        "firing",
        "inventory",
        "knowledge",
        "reports",
        "staffPlanning",
      ],
    };
    render(<WorkspaceModulesPage />);
    const summary = await screen.findByRole("region", {
      name: "Workflow answers",
    });
    const sharedStudioQuestion = within(summary).getByText(
      "Question about sharedStudio",
    );
    const classesQuestion = within(summary).getByText("Question about classes");
    expect(sharedStudioQuestion.parentElement).toHaveTextContent("Included");
    expect(classesQuestion.parentElement).toHaveTextContent("Not enabled");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", {
        name: "Cancel",
      }),
    ).toHaveAttribute("href", "/app/setup");
    const firingQuestion = within(summary).getByText(
      "Question about inventory",
    );
    fireEvent.click(
      within(firingQuestion.closest("div")).getByRole("button", {
        name: "Edit",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Yes, set it up",
      }),
    ).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Yes, set it up",
      }),
    );
    const preview = document.querySelector(
      '[data-workflow-change-preview="true"]',
    );
    expect(preview).not.toHaveTextContent("Enable Kilns & Firings");
    expect(preview).not.toHaveTextContent("Navigation:");
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Apply changes",
      }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const body = mocks.update.mock.calls[0][0];
    expect(body).not.toHaveProperty("modules");
    expect(body.intent.answers).toEqual({
      sharedStudio: true,
      classes: false,

      memberships: true,
      vouchers: true,
      inventory: true,
    });
    expect(body.intent.pricingMode).toBe("time");
    expect(body.intent).not.toHaveProperty("modules");
    expect(body).not.toHaveProperty("navigation");
  });
  it("preserves stored module selections across a plan downgrade when saving edited intent", async () => {
    mocks.search = "from=launch-center&workflow=edit";
    mocks.data = configuration();
    mocks.data.intent.answers = {
      sharedStudio: true,
      classes: true,

      memberships: true,
      vouchers: true,
      inventory: false,
    };
    mocks.data.intent.pricingMode = "time";
    mocks.data.modules.memberships = {
      entitled: false,
      selected: true,
      enabled: false,
    };
    mocks.data.modules.newsletter = {
      entitled: false,
      selected: true,
      enabled: false,
    };
    mocks.data.effectiveModules.memberships = false;
    mocks.data.effectiveModules.newsletter = false;
    render(<WorkspaceModulesPage />);
    const summary = await screen.findByRole("region", {
      name: "Workflow answers",
    });
    const firingQuestion = within(summary).getByText(
      "Question about inventory",
    );
    fireEvent.click(
      within(firingQuestion.closest("div")).getByRole("button", {
        name: "Edit",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Yes, set it up",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Apply changes",
      }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const body = mocks.update.mock.calls[0][0];
    expect(body.intent).not.toHaveProperty("modules");
    expect(body).not.toHaveProperty("navigation");
    expect(mocks.data.modules.memberships.selected).toBe(true);
    expect(mocks.data.modules.memberships.enabled).toBe(false);
  });
  it("does not enable AI when it is not included in the workspace plan", async () => {
    mocks.search = "from=launch-center";
    mocks.data = configuration({
      intentConfigured: false,
    });
    mocks.data.modules.ai = {
      entitled: false,
      selected: false,
      enabled: false,
    };
    mocks.data.effectiveModules.ai = false;
    render(<WorkspaceModulesPage />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Not now",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Not now",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Yes, set it up",
      }),
    );
    for (let index = 0; index < 2; index += 1)
      fireEvent.click(
        screen.getByRole("button", {
          name: "Not now",
        }),
      );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Save and continue",
      }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0].intent).not.toHaveProperty("modules");
    expect(mocks.data.modules.ai.enabled).toBe(false);
  });
  it("confirms an unconfigured workspace with a complete versioned intent", async () => {
    mocks.data = configuration({
      intentConfigured: false,
    });
    render(<WorkspaceModulesPage />);
    expect(
      await screen.findByRole("button", {
        name: /Choose how your studio works/i,
      }),
    ).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(
      await screen.findByRole("button", {
        name: /Membership studio/,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Save configuration",
      }),
    );
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const body = mocks.update.mock.calls[0][0];
    expect(body.intent).toEqual({
      definitionVersion: 2,
    });
    expect(body.modules).toMatchObject({
      bookings: false,
      payments: false,
    });
    expect(body.modules).not.toHaveProperty("firing");
    expect(body).toHaveProperty("navigation");
  });
  it("locks a workflow when its required module is not entitled", async () => {
    mocks.data = configuration();
    mocks.data.modules.memberships = {
      entitled: false,
      selected: false,
      enabled: false,
    };
    render(<WorkspaceModulesPage />);
    await expandTemplates();
    const preset = await screen.findByRole("button", {
      name: /Membership studio/,
    });
    expect(preset).toBeDisabled();
    expect(
      screen.getAllByText("A required module is not included."),
    ).toHaveLength(1);
    fireEvent.click(preset);
    expect(
      screen.getByRole("switch", {
        name: "Toggle Bookings",
      }),
    ).toHaveAttribute("aria-checked", "true");
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
