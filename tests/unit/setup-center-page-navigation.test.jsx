import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  openSetupAssistant: vi.fn(),
  replace: vi.fn(),
  startPractice: vi.fn(),
  abandonPractice: vi.fn(),
  advancePractice: vi.fn(),
  confirmPractice: vi.fn(),
  removeConfirmation: vi.fn(),
  refetchSetup: vi.fn(),
  trackSetupEvent: vi.fn(),
  search: "",
  setup: null,
  tenant: {
    modules: {
      automations: true,
      bookings: true,
      communications: true,
    },
  },
  workspaceConfiguration: {
    intent: {
      configured: true,
      definitionVersion: 1,
      pricingMode: "piece",
      updatedAt: "2026-08-12T10:30:00.000Z",
      answers: {
        sharedStudio: true,
        classes: false,
        firingServices: true,
        memberships: false,
        vouchers: true,
        inventory: false,
      },
    },
  },
  workspaceConfigurationFetching: false,
  workspaceConfigurationLoading: false,
  workspaceAccess: {
    role: "owner",
    status: "active",
  },
}));
const messages = {
  stepNumber: ({ number }) => `Step ${number}`,
  "hero.launchEyebrow": "Launch Center",
  "hero.launchTitle": "Launch your studio with confidence",
  "hero.launchDescription": "Start with the way your studio works.",
  "hero.remainingTitle": ({ count }) =>
    count === 0
      ? "Review your launch checklist"
      : count === 1
        ? "1 thing left before your studio is ready"
        : `${count} things left before your studio is ready`,
  "hero.remainingDescription": "Complete the launch checklist below.",
  "hero.readyDescription": "Review the status below before publishing.",
  "hero.completeTitle": "Your studio is live",
  "hero.completeDescription":
    "Your public website is published and the customer journey is tested.",
  "hero.adjustModules": "Choose studio workflows",
  "hero.requiredComplete": "Required complete",
  "hero.checklistComplete": "Launch checklist complete",
  "sections.required.title": "Requirements to accept payments",
  "sections.required.description": "Complete payment requirements.",
  "sections.recommended.title": "Checklist before you launch",
  "sections.recommended.description":
    "Helpful improvements that do not block launch.",
  "sections.allTasks.title": "Show all setup tasks",
  "sections.allTasks.description": "Review all existing setup tasks.",
  "sections.availableLater.title": "Available later",
  "sections.availableLater.description":
    "Optional capabilities you can return to later.",
  "sections.progress": ({ completed, total }) =>
    `${completed} of ${total} complete`,
  "sections.progressComplete": ({ completed, total }) =>
    `${completed}/${total} Complete`,
  "sections.optionalCount": ({ count }) => `${count} optional`,
  "sections.postLaunch.required.title": "Payment readiness",
  "sections.postLaunch.required.description":
    "Review payment and payout requirements.",
  "sections.postLaunch.recommended.title": "Launch record",
  "sections.postLaunch.recommended.description":
    "Review the configuration used for launch.",
  "sections.postLaunch.availableLater.title": "Grow your studio",
  "sections.postLaunch.availableLater.description":
    "Optional improvements for later.",
  "viewStates.setup_needed": "Setup needed",
  "viewStates.ready": "Ready",
  "viewStates.not_enabled": "Not enabled",
  "viewStates.not_needed": "Not needed",
  "viewStates.waiting": "Waiting",
  "viewStates.recommended": "Recommended",
  "steps.studio.outcome": "Your workspace essentials are ready",
  "steps.studio.question": "Are your studio details complete?",
  "steps.studio.description": "Add the studio details.",
  "steps.location.outcome": "Your first studio location is ready",
  "steps.location.question": "Is your first studio location ready?",
  "steps.location.description": "Add a bookable studio location.",
  "steps.payments.outcome": "You’re ready to accept payments",
  "steps.payments.question": "Can your studio accept online payments?",
  "steps.payments.description": "Connect and verify Stripe.",
  "steps.publish.outcome": "Your studio is ready to welcome customers",
  "steps.publish.question": "Are you ready to welcome customers?",
  "steps.publish.description": "Make the studio live.",
  "steps.communications.outcome": "Customers receive the right messages",
  "steps.communications.question": "Will customers receive the right messages?",
  "steps.communications.description": "Configure customer messages.",
  "steps.bookable_offer.outcome": "Customers can now make bookings",
  "steps.bookable_offer.question": "Can customers book one of your offers?",
  "steps.bookable_offer.description": "Create a bookable offer.",
  "steps.public_site.outcome": "Your public website is customized",
  "steps.public_site.question":
    "Have you reviewed and customized your public website?",
  "steps.public_site.description": "Review and save the website draft.",
  "steps.practice_booking.outcome": "Your customer booking journey is tested",
  "steps.practice_booking.question":
    "Have you tested the customer booking journey?",
  "steps.practice_booking.description": "Safely rehearse the booking journey.",
  "steps.membership.question": "Do you offer studio memberships?",
  "steps.inventory.question": "Do you manage shared supplies?",
  loading: "Loading Launch Center",
  checksTitle: "To finish this step",
  readyChecksTitle: "What makes this outcome ready",
  "guided.startGuide": "Start guided tour",
  "nextBest.eyebrow": "Next Best Action",
  "nextBest.estimate": ({ minutes }) => `Estimated time: ${minutes} min`,
  "workflowIntent.title": "A Launch Center that fits the way your studio works",
  "workflowIntent.description": "Choose the closest studio workflow.",
  "workflowIntent.action": "Choose studio workflow",
  "completion.eyebrow": "Congratulations!",
  "completion.title": "Your studio is ready",
  "completion.description": "Your required launch outcomes are complete.",
  "completion.readyEyebrow": "Final launch review",
  "completion.readyTitle": "Your studio is ready to launch",
  "completion.readyDescription":
    "Every required launch outcome is complete. Review the checklist, then launch your public studio.",
  "completion.operationalEyebrow": "Launch setup complete",
  "completion.operationalTitle": "Your studio is ready to operate",
  "completion.operationalDescription":
    "Every required operational outcome is complete. Continue to your dashboard; optional improvements remain available.",
  "completion.launchedEyebrow": "Your studio is live",
  "completion.launchedTitle": "Your studio has launched",
  "completion.launchedDescription":
    "Your public studio is live and the customer journey has been tested.",
  "completion.dashboard": "Today’s dashboard",
  "completion.publicStudio": "Public studio",
  "completion.firstBooking": "Create first booking",
  "completion.inviteTeam": "Invite your team",
  "completion.launchAssistant": "Ask Launch Assistant",
  "completion.paymentsEyebrow": "Payments ready",
  "completion.paymentsTitle": "Your studio can now accept payments",
  "completion.paymentsDescription":
    "Customers can pay online and receive payouts.",
  "completion.publishedEyebrow": "Public website live",
  "completion.publishedTitle": "Complete one final customer check",
  "completion.publishedDescription": "Test the booking journey last.",
  "completion.attentionEyebrow": "Public website live",
  "completion.attentionTitle": "Your live setup needs attention",
  "completion.attentionTitleCount": ({ count }) =>
    count === 1
      ? "1 launch item needs attention"
      : `${count} launch items need attention`,
  "completion.attentionDescription": "Review the launch requirements.",
  "completion.launchStudio": "Launch studio",
  "completion.continueChecklist": "Continue launch checklist",
  "completion.testBooking": "Complete a test booking",
  "completion.reviewNext": "Review next requirement",
  "completion.viewPublicStudio": "View public studio",
  "completion.visitPublicStudio": "Visit public studio",
  "completion.publicUrl": "Open public studio",
  "completion.publicAddress": "Public studio URL",
  "completion.openPublicAddress": "Open the published studio in a new tab",
  "completion.openSite": "Open website",
  "completion.copyLink": "Copy link",
  "completion.linkCopied": "Copied",
  "completion.copySuccess": "Public studio link copied.",
  "completion.copyError": "Could not copy the link.",
  "completion.domainSettings": "Website settings",
  "completion.nextImprovements": "Optional next steps",
  "readiness.title": "Launch readiness",
  "readiness.scope":
    "Workspace-wide readiness across your website, bookings, payments, emails, and customer journey",
  "readiness.overallReady": "Launch ready",
  "readiness.overallProgress": "In progress",
  "readiness.overallAttention": "Action required",
  "readiness.issueCount": ({ count }) =>
    count === 1 ? "1 action needed" : `${count} actions needed`,
  "readiness.completedSummary": ({ completed, total }) =>
    `${completed} of ${total} checks complete`,
  "readiness.showCompleted": "Show",
  "readiness.hideCompleted": "Hide",
  "readiness.runAgain": "Run the practice check again",
  "readiness.permissionRequired":
    "Ask a workspace owner or someone with the required permission to complete this action.",
  "readiness.lastChecked": ({ value }) => `Last checked ${value}`,
  "readiness.publishedAt": ({ value }) => `Published ${value}`,
  "readiness.status.ready": "Ready",
  "readiness.status.action_required": "Action required",
  "readiness.status.pending": "Pending verification",
  "readiness.status.not_needed": "Not needed",
  "readiness.items.publicSite.title": "Public website",
  "readiness.items.publicSite.action": "Review website",
  "readiness.items.bookings.title": "Bookings",
  "readiness.items.bookings.action": "Fix bookings",
  "readiness.items.payments.title": "Payments & payouts",
  "readiness.items.payments.action": "Finish payment setup",
  "readiness.items.emails.title": "Email sender",
  "readiness.items.emails.action": "Set up email sender",
  "readiness.items.emails.descriptions.ready": "Managed sender is ready.",
  "readiness.items.emails.descriptions.action_required":
    "Set up the managed sender.",
  "readiness.items.emails.descriptions.sender_required":
    "Set up the managed sender.",
  "readiness.items.customerJourney.title": "Test booking",
  "readiness.items.customerJourney.action": "Complete test booking",
  "readiness.items.customerJourney.descriptions.blocked":
    "Complete the requirements below before starting a test booking.",
  "practice.prerequisitesTitle": "Complete before starting a test booking",
  "practice.manual.title": "Manual confirmation",
  "practice.manual.checkbox": "I confirm that the test booking was successful",
  "practice.manual.confirm": "Confirm check",
  "practice.manual.saving": "Saving…",
  "practice.manual.confirmed": ({ date }) => `Manually confirmed on ${date}.`,
  "practice.manual.stale": "Settings have changed. Check the booking again.",
  "practice.manual.undo": "Remove confirmation",
  "practice.manual.error": "The confirmation could not be saved. Try again.",
  "practice.manual.undoError":
    "The confirmation could not be removed. Try again.",
  "practice.manual.configurationChanged":
    "Settings changed during your check. Review them and confirm again.",
  "readiness.items.customerJourney.descriptions.manual":
    "You manually confirmed a successful test booking.",
  "checks.active_piece_pricing_profile":
    "Active Piece Pricing Profile assigned",
  "reasons.piece_pricing_profile_missing":
    "Create and assign an active Piece Pricing Profile to every Open Studio using separate firing billing.",
  "profile.eyebrow": "Your studio profile",
  "profile.inferredEyebrow": "Review your studio profile",
  "profile.title": "How your studio works",
  "profile.description":
    "Your questionnaire choices shape the tools and launch guidance shown for this studio.",
  "profile.inferredDescription":
    "This profile was inferred from your current studio tools. Review the questionnaire to confirm the exact answers.",
  "profile.inferredBadge": "Review needed",
  "profile.edit": "Review or change answers",
  "profile.noneSelected": "No optional workflows are selected right now.",
  "profile.more": ({ count }) => `+${count} more`,
  "profile.viewAnswers": "View all questionnaire answers",
  "profile.updatedAt": ({ value }) => `Updated ${value}`,
  "profile.enabled": "Included",
  "profile.notEnabled": "Not included",
  "profile.items.sharedStudio": "Shared studio bookings",
  "profile.items.classes": "Classes & workshops",
  "profile.items.firingServices": "By piece",
  "profile.items.memberships": "Memberships",
  "profile.items.vouchers": "Gift vouchers",
  "profile.items.inventory": "Inventory tracking",
  "growth.eyebrow": "Next opportunities",
  "growth.title": "Grow your studio",
  "growth.description": "Optional improvements for your next stage.",
  "growth.opportunityCount": ({ count }) => `${count} opportunities`,
  "growth.inviteTeam": "Invite your team",
  "growth.reviewWorkspace": "Review your studio tools",
  "growth.allSet": "You’re all set for now",
  "growth.unavailable": "Not available right now",
  "growth.next": "Recommended next",
  "growth.explore": "Explore",
  "growth.viewAll": "View all opportunities",
  "workflowQuestions.items.sharedStudio.question":
    "Can customers book time in your shared studio?",
  "workflowQuestions.items.classes.question":
    "Do you run classes or workshops?",
  "workflowQuestions.items.firingServices.question":
    "Do you charge customers for firing their pottery?",
  "workflowQuestions.pricingModes.piece": "By piece",
  "workflowQuestions.items.pricingMode.question":
    "How do you want to charge your customers?",
  "workflowQuestions.items.memberships.question":
    "Do you offer studio memberships?",
  "workflowQuestions.items.vouchers.question": "Do you sell gift vouchers?",
  "workflowQuestions.items.inventory.question":
    "Do you want to track materials and supplies?",
  "actions.edit_studio": "Complete studio details",
  "actions.review_location": "Review studio location",
  "actions.create_offer": "Create a bookable offer",
  "actions.customize_public_site": "Customize public website",
  "actions.configure_communications": "Configure communications",
  "actions.configure_inventory": "Review inventory",
  "publish.action": "Publish studio",
  "publish.liveTitle": "Your studio is live",
  "publish.liveDescription": "Customers can use the live studio experience.",
  "publish.viewPublicSite": "View public studio",
  "publish.testBooking": "Test customer booking",
  "publish.unpublish": "Return to draft",
  "publish.ownerOnly": "Only the owner can publish.",
  "assistant.action": "Ask Launch Assistant",
  "assistant.prompt": ({ step }) => `Help me with ${step}`,
  "learning.eyebrow": "Recommended improvements",
  "learning.title": "Keep improving your studio",
  "learning.description": "Optional improvements remain available.",
  "learning.comingSoon": "Coming soon",
  "learning.items.reminders": "Remind customers before every booking",
  "learning.items.customers": "Your existing customers are ready in shario.io",
};
vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) =>
      typeof messages[key] === "function"
        ? messages[key](values)
        : messages[key] || key,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));
vi.mock("@/components/ai/AiWorkspaceProvider", () => ({
  useAiWorkspace: () => ({
    openSetupAssistant: mocks.openSetupAssistant,
  }),
}));
vi.mock("@/components/decorations/WorkspaceBrushField", () => ({
  default: ({ variant }) => (
    <div aria-hidden="true" data-workspace-brush-field={variant} />
  ),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentWorkspaceAccess: () => mocks.workspaceAccess,
}));
vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  setupCenterApiSlice: {
    util: {
      upsertQueryData: vi.fn((_endpoint, _args, payload) => ({
        type: "setup/upsert",
        payload,
      })),
    },
  },
  useAbandonSetupPracticeMutation: () => [
    mocks.abandonPractice,
    {
      isLoading: false,
    },
  ],
  useAdvanceSetupPracticeMutation: () => [
    mocks.advancePractice,
    {
      isLoading: false,
    },
  ],
  useConfirmSetupPracticeMutation: () => [
    mocks.confirmPractice,
    {
      isLoading: false,
    },
  ],
  useRemoveSetupPracticeConfirmationMutation: () => [
    mocks.removeConfirmation,
    {
      isLoading: false,
    },
  ],
  useGetSetupCenterQuery: () => ({
    data: mocks.setup,
    isLoading: false,
    isError: false,
    refetch: mocks.refetchSetup,
  }),
  usePublishStudioMutation: () => [
    vi.fn(),
    {
      isLoading: false,
    },
  ],
  useStartSetupPracticeMutation: () => [
    mocks.startPractice,
    {
      isLoading: false,
    },
  ],
  useTrackSetupEventMutation: () => [mocks.trackSetupEvent],
  useUnpublishStudioMutation: () => [
    vi.fn(),
    {
      isLoading: false,
    },
  ],
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetWorkspaceConfigurationQuery: () => ({
    data: mocks.workspaceConfiguration,
    isFetching: mocks.workspaceConfigurationFetching,
    isLoading: mocks.workspaceConfigurationLoading,
  }),
}));
import SetupCenterPage from "@/components/setup-center/SetupCenterPage";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";
const completeStep = (id, requirement = "required") => ({
  id,
  status: "complete",
  applicable: true,
  requirement,
  checks: [],
  actions: [],
});
const incompleteStep = ({
  id,
  requirement = "required",
  status = "incomplete",
  action,
}) => ({
  id,
  status,
  applicable: true,
  requirement,
  checks: [],
  actions: action ? [action] : [],
});
const getPrimaryLaunchActions = (container) =>
  container.querySelectorAll('[data-launch-primary-action="true"]');
const livePracticeSetup = ({ blocked = false } = {}) => ({
  definitionVersion: 1,
  phase: "launch",
  health: blocked ? "needs_attention" : "healthy",
  progress: {
    payment: {
      percentage: 100,
      completed: 2,
      total: 2,
    },
    launch: {
      percentage: 80,
      completed: 4,
      total: 5,
    },
  },
  paymentReadiness: {
    applicable: true,
    ready: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    requirementsClear: true,
  },
  launchReview: {
    readyToPublish: false,
    launchComplete: false,
    required: {
      complete: !blocked,
      incompleteStepIds: blocked ? ["inventory"] : [],
    },
    publicSite: {
      applicable: true,
      published: true,
      publicPath: "/",
    },
    testBooking: {
      applicable: true,
      complete: false,
      canStart: !blocked,
      action: {
        key: "practice_booking",
        enabled: !blocked,
        href: "/app/setup?step=practice_booking",
      },
    },
  },
  steps: [
    ...[
      "studio",
      "payments",
      "location",
      "bookable_offer",
      "communications",
      "public_site",
      "publish",
    ].map((id) => completeStep(id)),
    blocked
      ? {
          ...incompleteStep({
            id: "inventory",
            requirement: "recommended",
            action: {
              key: "configure_inventory",
              enabled: true,
              href: "/app/inventory?setupStep=inventory",
            },
          }),
          // This Open Studio charges for firing separately and has no profile assigned.
          checks: [
            {
              id: "active_piece_pricing_profile",
              complete: false,
              reasonCode: "piece_pricing_profile_missing",
            },
          ],
        }
      : completeStep("inventory", "recommended"),
    incompleteStep({
      id: "practice_booking",
      requirement: "recommended",
      status: blocked ? "blocked" : "incomplete",
      action: {
        key: "practice_booking",
        enabled: !blocked,
        href: "/app/setup?step=practice_booking",
      },
    }),
  ],
  practice: {
    status: "expired",
    completedActions: [],
    artifacts: [],
  },
  diagnostics: {
    readinessFingerprint: "ready-v1",
  },
  publication: {
    status: "live",
  },
  recommendations: [],
});
const manuallyConfirmedSetup = (setup) => ({
  ...setup,
  health: "healthy",
  launchReview: {
    ...setup.launchReview,
    launchComplete: true,
    testBooking: {
      ...setup.launchReview.testBooking,
      complete: true,
      retestRecommended: false,
      completedAt: "2026-11-03T12:00:00.000Z",
      completionSource: "manual",
    },
  },
  practice: {
    ...setup.practice,
    manualConfirmation: {
      confirmedAt: "2026-11-03T12:00:00.000Z",
      confirmedBy: "owner-1",
      current: true,
    },
  },
  steps: setup.steps.map((step) =>
    step.id === "practice_booking"
      ? {
          ...step,
          status: "complete",
        }
      : step,
  ),
});
describe("Launch Center route state", () => {
  beforeEach(() => {
    mocks.dispatch.mockReset();
    mocks.openSetupAssistant.mockReset();
    mocks.replace.mockReset();
    mocks.startPractice.mockReset();
    mocks.abandonPractice.mockReset();
    mocks.advancePractice.mockReset();
    mocks.confirmPractice.mockReset();
    mocks.removeConfirmation.mockReset();
    mocks.refetchSetup.mockReset().mockResolvedValue({});
    mocks.trackSetupEvent.mockReset().mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        accepted: true,
      }),
    }));
    mocks.search = "";
    mocks.workspaceConfigurationFetching = false;
    mocks.workspaceConfigurationLoading = false;
    mocks.workspaceConfiguration = {
      intent: {
        configured: true,
        definitionVersion: 1,
        pricingMode: "piece",
        updatedAt: "2026-08-12T10:30:00.000Z",
        answers: {
          sharedStudio: true,
          classes: false,
          firingServices: true,
          memberships: false,
          vouchers: true,
          inventory: false,
        },
      },
      modules: {
        bookings: {
          entitled: true,
          selected: true,
          enabled: true,
        },
        courses: {
          entitled: true,
          selected: false,
          enabled: false,
        },
        firing: {
          entitled: true,
          selected: true,
          enabled: true,
        },
        memberships: {
          entitled: true,
          selected: false,
          enabled: false,
        },
        vouchers: {
          entitled: true,
          selected: true,
          enabled: true,
        },
        inventory: {
          entitled: true,
          selected: false,
          enabled: false,
        },
      },
    };
    mocks.tenant = {
      modules: {
        automations: true,
        bookings: true,
        communications: true,
      },
    };
    mocks.workspaceAccess = {
      role: "owner",
      status: "active",
    };
    mocks.setup = {
      definitionVersion: 1,
      phase: "learning",
      health: "healthy",
      progress: {
        percentage: 100,
        completed: 2,
        total: 2,
        required: {
          percentage: 100,
          completed: 2,
          total: 2,
        },
      },
      steps: [completeStep("studio"), completeStep("publish")],
      practice: {
        status: "not_started",
        completedActions: [],
        artifacts: [],
      },
      publication: {
        status: "draft",
      },
      recommendations: [],
    };
  });
  it("uses a question heading for unfinished setup and keeps the required section open", () => {
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      progress: {
        percentage: 50,
        completed: 1,
        total: 2,
        required: {
          percentage: 50,
          completed: 1,
          total: 2,
        },
      },
      steps: [
        incompleteStep({
          id: "studio",
          action: {
            key: "edit_studio",
            enabled: true,
            href: "/app/settings",
          },
        }),
        completeStep("publish"),
      ],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Are your studio details complete?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Requirements to accept payments").closest("details"),
    ).toHaveAttribute("open");
    expect(screen.getAllByText("Setup needed").length).toBeGreaterThan(0);
    const selectedRow = screen.getByRole("button", {
      name: /Are your studio details complete\?.*Setup needed/,
    });
    expect(selectedRow).toHaveAttribute(
      "aria-controls",
      "launch-center-step-detail",
    );
    expect(selectedRow).toHaveAttribute("aria-expanded", "true");
    expect(
      container.querySelector("#launch-center-step-detail"),
    ).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("link", {
        name: "Complete studio details",
      }),
    ).toHaveAttribute("href", "/app/settings/general?setupStep=studio");
    expect(screen.queryByText("Next Best Action")).not.toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
  });
  it("shows the saved questionnaire outcome and rerun action before launch", () => {
    const { container } = render(<SetupCenterPage />);
    const profile = container.querySelector('[data-studio-profile="true"]');
    expect(profile).toHaveAttribute(
      "data-studio-profile-source",
      "questionnaire",
    );
    expect(within(profile).getByText("Shared studio bookings")).toBeVisible();
    expect(
      within(profile).getByRole("link", {
        name: "Review or change answers",
      }),
    ).toHaveAttribute(
      "href",
      "/app/settings/modules?from=launch-center&workflow=edit",
    );
    expect(
      screen.getByText("Requirements to accept payments"),
    ).toBeInTheDocument();
  });
  it("labels a legacy module-derived profile as inferred and review-needed", () => {
    mocks.workspaceConfiguration = {
      intent: {
        configured: true,
        definitionVersion: 2,
        pricingMode: "piece",
        answers: null,
      },
      modules: {
        bookings: {
          entitled: true,
          selected: true,
          enabled: true,
        },
        courses: {
          entitled: true,
          selected: false,
          enabled: false,
        },
      },
    };
    const { container } = render(<SetupCenterPage />);
    const profile = container.querySelector('[data-studio-profile="true"]');
    expect(profile).toHaveAttribute("data-studio-profile-source", "inferred");
    expect(within(profile).getByText("Review needed")).toBeVisible();
    expect(
      within(profile).getByText(
        "This profile was inferred from your current studio tools. Review the questionnaire to confirm the exact answers.",
      ),
    ).toBeVisible();
    expect(within(profile).getByText("Shared studio bookings")).toBeVisible();
  });
  it("treats a legacy live publication as post-launch without duplicated checklist sections", () => {
    mocks.setup = {
      ...mocks.setup,
      publication: {
        status: "live",
      },
      steps: [completeStep("studio")],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      container.querySelector('[data-launch-final-review="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-studio-profile="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-growth-studio="true"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open website",
      }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.queryByText("Requirements to accept payments"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Payment readiness")).not.toBeInTheDocument();
    expect(screen.queryByText("Launch record")).not.toBeInTheDocument();
  });
  it("shows payment readiness without claiming an empty studio is launch-ready", () => {
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      progress: {
        payment: {
          percentage: 100,
          completed: 2,
          total: 2,
        },
        launch: {
          percentage: 0,
          completed: 0,
          total: 4,
        },
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: false,
        publicSite: {
          applicable: true,
          published: false,
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: false,
        },
      },
      publication: {
        status: "draft",
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        incompleteStep({
          id: "bookable_offer",
          requirement: "recommended",
          action: {
            key: "create_offer",
            enabled: true,
            href: "/app/products?action=create",
          },
        }),
        incompleteStep({
          id: "public_site",
          requirement: "recommended",
          status: "blocked",
          action: {
            key: "customize_public_site",
            enabled: false,
            href: "/app/settings/public-site",
          },
        }),
        incompleteStep({
          id: "publish",
          requirement: "recommended",
          status: "blocked",
        }),
        incompleteStep({
          id: "practice_booking",
          requirement: "recommended",
          status: "blocked",
        }),
      ],
      recommendations: [],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        name: "Your studio can now accept payments",
      }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-payment-readiness="ready"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-launch-final-review="true"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Your studio is ready to launch",
      }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-launch-step-action="bookable_offer"]'),
    ).toHaveAttribute(
      "href",
      "/app/products?action=create&setupStep=bookable_offer",
    );
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    expect(
      container.querySelector('[data-readiness-item="publicSite"]'),
    ).toHaveAttribute("data-readiness-status", "action_required");
    expect(
      container.querySelector('[data-readiness-item="payments"]'),
    ).toHaveAttribute("data-readiness-status", "ready");
  });
  it("puts the owner launch action on the ready-to-publish website card", () => {
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      launchReview: {
        readyToPublish: true,
        launchComplete: false,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: false,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: false,
        },
      },
      publication: {
        status: "draft",
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        incompleteStep({
          id: "publish",
          requirement: "recommended",
          action: {
            key: "publish_studio",
            enabled: true,
            href: "/app/setup?step=publish",
          },
        }),
      ],
    };
    const { container } = render(<SetupCenterPage />);
    const publicSiteReadiness = container.querySelector(
      '[data-readiness-item="publicSite"]',
    );
    expect(
      within(publicSiteReadiness).getByRole("link", {
        name: "Launch studio",
      }),
    ).toHaveAttribute("href", "/app/setup?step=publish");
    expect(
      publicSiteReadiness.querySelector(
        '[data-readiness-action="publicSite"][data-readiness-action-permitted="true"]',
      ),
    ).toBeInTheDocument();
    expect(
      container.querySelector(
        '[data-readiness-item="customerJourney"] [data-readiness-action]',
      ),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-readiness-item="customerJourney"]'),
    ).toHaveAttribute("data-readiness-status", "pending");
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
  });
  it.each(["owner", "staff"])(
    "lets a launched %s review all retained tasks without changing setup or bypassing configuration permissions",
    async (role) => {
      mocks.workspaceAccess = {
        role,
        status: "active",
        ...(role === "staff"
          ? {
              effectivePermissions: [],
            }
          : {}),
      };
      mocks.setup = {
        ...mocks.setup,
        launchReview: {
          launchComplete: true,
          publicSite: {
            applicable: false,
            published: false,
          },
          testBooking: {
            applicable: false,
            complete: false,
          },
        },
        steps: [
          completeStep("studio"),
          incompleteStep({
            id: "inventory",
            requirement: "optional",
          }),
          {
            id: "membership",
            status: "not_applicable",
            applicable: false,
            requirement: "optional",
            reasonCode: "memberships_module_disabled",
            checks: [],
            actions: [],
          },
        ],
      };
      const savedSetup = structuredClone(mocks.setup);
      const savedConfiguration = structuredClone(mocks.workspaceConfiguration);
      const { container } = render(<SetupCenterPage />);
      const allTasks = container.querySelector(
        '[data-launch-section="all-tasks"]',
      );
      expect(allTasks).not.toHaveAttribute("open");
      expect(
        within(allTasks).getAllByRole("listitem", {
          hidden: true,
        }),
      ).toHaveLength(3);
      expect(
        within(allTasks).getByRole("button", {
          name: "Your workspace essentials are ready. Ready",
          hidden: true,
        }),
      ).not.toBeVisible();
      fireEvent.click(within(allTasks).getByText("Show all setup tasks"));
      await waitFor(() => expect(allTasks).toHaveAttribute("open"));
      expect(
        within(allTasks).getByRole("button", {
          name: /Do you manage shared supplies/,
        }),
      ).toBeVisible();
      const moduleLink = within(allTasks).queryByRole("link", {
        name: /Do you offer studio memberships/,
      });
      if (role === "owner") {
        expect(moduleLink).toHaveAttribute(
          "href",
          "/app/settings/modules?from=launch-center",
        );
      } else {
        expect(moduleLink).not.toBeInTheDocument();
        expect(
          within(allTasks).getByText("Do you offer studio memberships?"),
        ).toBeVisible();
      }
      fireEvent.click(
        within(allTasks).getByRole("button", {
          name: "Your workspace essentials are ready. Ready",
        }),
      );
      expect(mocks.replace).toHaveBeenCalledWith(
        "/app/setup?step=studio&review=ready",
        {
          scroll: false,
        },
      );
      expect(mocks.setup).toEqual(savedSetup);
      expect(mocks.workspaceConfiguration).toEqual(savedConfiguration);
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it("keeps all completed readiness checks visible alongside the saved profile and growth", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });
    mocks.setup = {
      ...mocks.setup,
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      progress: {
        payment: {
          percentage: 100,
          completed: 2,
          total: 2,
        },
        launch: {
          percentage: 100,
          completed: 6,
          total: 6,
        },
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: true,
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: true,
          canStart: false,
        },
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        {
          ...completeStep("communications", "recommended"),
          checks: [
            {
              id: "sender_verified",
              complete: true,
            },
          ],
        },
        completeStep("public_site", "recommended"),
        completeStep("publish", "recommended"),
        completeStep("practice_booking", "recommended"),
      ],
      practice: {
        ...mocks.setup.practice,
        status: "complete",
        completedAt: "2026-08-12T10:30:00.000Z",
        retestRecommended: false,
      },
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your studio has launched",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: "Your studio is ready to launch",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Launch ready")).toBeInTheDocument();
    expect(
      container.querySelector('[data-launch-health="healthy"]'),
    ).toHaveAttribute("data-readiness-density", "compact");
    expect(
      container.querySelector('[data-launch-attention-accent="true"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Workspace-wide readiness across your website, bookings, payments, emails, and customer journey",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("5 of 5 checks complete")).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", {
          name: "Launch readiness",
        }),
      ).getAllByRole("listitem"),
    ).toHaveLength(5);
    for (const itemId of [
      "publicSite",
      "bookings",
      "payments",
      "emails",
      "customerJourney",
    ]) {
      const item = container.querySelector(`[data-readiness-item="${itemId}"]`);
      expect(item).toHaveAttribute("data-readiness-status", "ready");
      expect(item).toHaveClass("bg-success-soft/35");
      expect(item).not.toHaveClass("bg-success-soft");
    }
    expect(
      screen.getByRole("link", {
        name: "Open website",
      }),
    ).toMatchObject({
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(screen.queryByText("Payment readiness")).not.toBeInTheDocument();
    expect(screen.queryByText("Launch record")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Today’s dashboard",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Ask Launch Assistant",
      }),
    ).not.toBeInTheDocument();
    const profile = container.querySelector('[data-studio-profile="true"]');
    expect(profile).toBeInTheDocument();
    expect(
      within(profile).getByRole("heading", {
        name: "How your studio works",
      }),
    ).toBeInTheDocument();
    expect(within(profile).getByText("Shared studio bookings")).toBeVisible();
    expect(within(profile).queryByText("By piece")).not.toBeInTheDocument();
    expect(within(profile).getByText("Gift vouchers")).toBeVisible();
    expect(
      within(profile).getByRole("link", {
        name: "Review or change answers",
      }),
    ).toHaveAttribute(
      "href",
      "/app/settings/modules?from=launch-center&workflow=edit",
    );
    const profileAnswers = within(profile)
      .getByText("View all questionnaire answers")
      .closest("details");
    expect(profileAnswers).not.toHaveAttribute("open");
    fireEvent.click(
      within(profileAnswers).getByText("View all questionnaire answers"),
    );
    expect(profileAnswers).toHaveAttribute("open");
    expect(
      within(profileAnswers)
        .getByText("Can customers book time in your shared studio?")
        .closest("li"),
    ).toHaveTextContent("Included");
    expect(
      within(profileAnswers)
        .getByText("Do you run classes or workshops?")
        .closest("li"),
    ).toHaveTextContent("Not included");
    const growth = container.querySelector('[data-growth-studio="true"]');
    expect(growth).toBeInTheDocument();
    expect(growth).toHaveClass("bg-skab-cobalt-900", "text-white");
    expect(
      within(growth).getByRole("heading", {
        name: "Grow your studio",
      }),
    ).toBeInTheDocument();
    expect(
      growth.querySelector('[data-workspace-brush-field="launchHero"]'),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Copy link",
      }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("button", {
        name: "Copied",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Public studio link copied.",
    );
  });
  it("never fabricates a growth route for an unavailable step", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: [],
    };
    mocks.setup = {
      ...mocks.setup,
      publication: {
        status: "live",
      },
      steps: [
        completeStep("studio"),
        completeStep("publish", "recommended"),
        {
          id: "membership",
          status: "not_applicable",
          applicable: false,
          requirement: "optional",
          reasonCode: "memberships_module_disabled",
          checks: [],
          actions: [],
        },
        {
          id: "inventory",
          status: "incomplete",
          applicable: true,
          requirement: "optional",
          checks: [],
          actions: [],
        },
      ],
    };
    const { container, rerender } = render(<SetupCenterPage />);
    let growth = container.querySelector('[data-growth-studio="true"]');
    expect(
      growth.querySelector("[data-growth-primary-action]"),
    ).not.toBeInTheDocument();
    expect(
      growth.querySelector('[href="/app/setup?step=membership"]'),
    ).not.toBeInTheDocument();
    expect(
      growth.querySelector('[href="/app/setup?step=inventory"]'),
    ).not.toBeInTheDocument();
    expect(
      within(growth).getAllByText("Not available right now").length,
    ).toBeGreaterThan(0);
    mocks.workspaceAccess = {
      role: "member",
      status: "active",
      effectivePermissions: ["workspace.configuration.manage"],
    };
    rerender(<SetupCenterPage />);
    growth = container.querySelector('[data-growth-studio="true"]');
    expect(
      growth.querySelector('[data-growth-primary-action="membership"]'),
    ).toHaveAttribute("href", "/app/settings/modules?from=launch-center");
    expect(
      growth.querySelector('[href="/app/setup?step=membership"]'),
    ).not.toBeInTheDocument();
    expect(
      growth.querySelector('[href="/app/setup?step=inventory"]'),
    ).not.toBeInTheDocument();
  });
  it("keeps applicable growth actions behind their destination permissions", () => {
    mocks.workspaceAccess = {
      role: "custom",
      status: "active",
      effectivePermissions: ["memberships.view"],
    };
    mocks.setup = {
      ...mocks.setup,
      publication: {
        status: "live",
      },
      recommendations: [
        {
          id: "reminders",
          complete: false,
          action: {
            enabled: true,
            href: "/app/communications?section=automations",
          },
        },
      ],
      steps: [
        completeStep("studio"),
        completeStep("publish", "recommended"),
        incompleteStep({
          id: "membership",
          requirement: "optional",
          action: {
            key: "create_membership",
            enabled: true,
            href: "/app/memberships?action=create",
          },
        }),
      ],
    };
    const { container, rerender } = render(<SetupCenterPage />);
    let growth = container.querySelector('[data-growth-studio="true"]');
    expect(
      growth.querySelector('[data-growth-primary-action="membership"]'),
    ).not.toBeInTheDocument();
    expect(
      growth.querySelector('[href^="/app/memberships"]'),
    ).not.toBeInTheDocument();
    expect(
      growth.querySelector('[href^="/app/communications"]'),
    ).not.toBeInTheDocument();
    expect(
      within(growth).getAllByText("Not available right now").length,
    ).toBeGreaterThan(0);
    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      effectivePermissions: ["memberships.view", "memberships.manage"],
    };
    rerender(<SetupCenterPage />);
    growth = container.querySelector('[data-growth-studio="true"]');
    expect(
      growth.querySelector('[data-growth-primary-action="membership"]'),
    ).toHaveAttribute(
      "href",
      "/app/memberships?action=create&setupStep=membership",
    );
    expect(
      growth.querySelector('[href^="/app/communications"]'),
    ).not.toBeInTheDocument();
    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      effectivePermissions: [
        "memberships.view",
        "memberships.manage",
        "communications.manage",
      ],
    };
    rerender(<SetupCenterPage />);
    growth = container.querySelector('[data-growth-studio="true"]');
    expect(
      growth.querySelector(
        '[data-growth-opportunity="recommendation-reminders"]',
      ),
    ).toHaveAttribute("href", "/app/communications?section=automations");
  });
  it("keeps publish and management actions behind their permissions", () => {
    mocks.workspaceAccess = {
      role: "member",
      status: "active",
      effectivePermissions: ["workspace.update"],
    };
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      launchReview: {
        readyToPublish: true,
        launchComplete: false,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: false,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: false,
        },
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        incompleteStep({
          id: "publish",
          requirement: "recommended",
          action: {
            key: "publish_studio",
            enabled: true,
            href: "/app/setup?step=publish",
          },
        }),
      ],
    };
    const { container, rerender } = render(<SetupCenterPage />);
    expect(
      screen.queryByRole("link", {
        name: "Launch studio",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Today’s dashboard",
      }),
    ).not.toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    mocks.setup = {
      ...mocks.setup,
      phase: "learning",
      launchReview: {
        readyToPublish: false,
        launchComplete: true,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: true,
          canStart: false,
        },
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        incompleteStep({
          id: "team",
          requirement: "recommended",
          action: {
            key: "invite_team",
            enabled: true,
            href: "/app/settings/team",
          },
        }),
      ],
      practice: {
        ...mocks.setup.practice,
        status: "complete",
        completedAt: "2026-08-12T10:30:00.000Z",
      },
    };
    rerender(<SetupCenterPage />);
    expect(
      screen.queryByRole("link", {
        name: "Today’s dashboard",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Ask Launch Assistant",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Website settings",
      }),
    ).toHaveAttribute("href", "/app/settings/public-site");
    expect(
      screen.queryByRole("link", {
        name: "Invite your team",
      }),
    ).not.toBeInTheDocument();
  });
  it("renders a readiness repair as disabled until the user has its permission", () => {
    mocks.workspaceAccess = {
      role: "member",
      status: "active",
      effectivePermissions: [
        "workspace.update",
        "products.view",
        "products.manage",
        "bookings.view",
        "bookings.create",
      ],
    };
    mocks.setup = {
      ...mocks.setup,
      phase: "learning",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: true,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: true,
          canStart: true,
        },
      },
      publication: {
        status: "live",
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        {
          ...incompleteStep({
            id: "communications",
            requirement: "recommended",
            action: {
              key: "configure_communications",
              enabled: true,
              href: "/app/communications?section=settings",
            },
          }),
          checks: [
            {
              id: "sender_verified",
              complete: false,
            },
          ],
        },
        completeStep("practice_booking", "recommended"),
      ],
      practice: {
        ...mocks.setup.practice,
        status: "complete",
        completedAt: "2026-08-12T10:30:00.000Z",
        retestRecommended: false,
      },
    };
    const { container, rerender } = render(<SetupCenterPage />);
    const emailReadiness = container.querySelector(
      '[data-readiness-item="emails"]',
    );
    const disabledAction = within(emailReadiness).getByRole("button", {
      name: "Set up email sender",
    });
    expect(disabledAction).toBeDisabled();
    expect(disabledAction).toHaveAttribute(
      "data-readiness-action-permitted",
      "false",
    );
    expect(
      within(emailReadiness).queryByRole("link", {
        name: "Set up email sender",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(emailReadiness).getByText(
        "Ask a workspace owner or someone with the required permission to complete this action.",
      ),
    ).toBeVisible();
    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      effectivePermissions: [
        ...mocks.workspaceAccess.effectivePermissions,
        "communications.manage",
      ],
    };
    rerender(<SetupCenterPage />);
    expect(
      within(emailReadiness).getByRole("link", {
        name: "Set up email sender",
      }),
    ).toHaveAttribute(
      "href",
      "/app/communications?section=setup&setupStep=communications",
    );
  });
  it("uses booking permission rather than product permission for a scheduling repair", () => {
    mocks.workspaceAccess = {
      role: "member",
      status: "active",
      effectivePermissions: ["products.manage"],
    };
    mocks.setup = {
      ...mocks.setup,
      phase: "learning",
      launchReview: {
        readyToPublish: false,
        launchComplete: true,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: true,
          canStart: true,
        },
      },
      publication: {
        status: "live",
      },
      steps: [
        completeStep("studio"),
        incompleteStep({
          id: "bookable_offer",
          requirement: "recommended",
          action: {
            key: "schedule_offer",
            enabled: true,
            href: "/app/bookings/new",
          },
        }),
        completeStep("practice_booking", "recommended"),
      ],
      practice: {
        ...mocks.setup.practice,
        status: "complete",
        completedAt: "2026-08-12T10:30:00.000Z",
        retestRecommended: false,
      },
    };
    const { container, rerender } = render(<SetupCenterPage />);
    let bookingsReadiness = container.querySelector(
      '[data-readiness-item="bookings"]',
    );
    expect(
      within(bookingsReadiness).getByRole("button", {
        name: "Fix bookings",
      }),
    ).toBeDisabled();
    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      effectivePermissions: ["products.manage", "bookings.create"],
    };
    rerender(<SetupCenterPage />);
    bookingsReadiness = container.querySelector(
      '[data-readiness-item="bookings"]',
    );
    expect(
      within(bookingsReadiness).getByRole("button", {
        name: "Fix bookings",
      }),
    ).toBeDisabled();
    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      effectivePermissions: [
        "products.manage",
        "bookings.view",
        "bookings.create",
      ],
    };
    rerender(<SetupCenterPage />);
    bookingsReadiness = container.querySelector(
      '[data-readiness-item="bookings"]',
    );
    expect(
      within(bookingsReadiness).getByRole("link", {
        name: "Fix bookings",
      }),
    ).toHaveAttribute("href", "/app/bookings/new?setupStep=bookable_offer");
  });
  it("makes a stale practice walkthrough the primary live-site repair", () => {
    mocks.setup = {
      ...mocks.setup,
      phase: "learning",
      health: "healthy",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: true,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: true,
          canStart: true,
        },
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        completeStep("practice_booking", "recommended"),
      ],
      practice: {
        ...mocks.setup.practice,
        status: "complete",
        completedAt: "2026-08-12T10:30:00.000Z",
        retestRecommended: true,
      },
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "1 launch item needs attention",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Action required").length).toBeGreaterThan(0);
    const journeyReadiness = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    const checklist = screen.getByRole("list", {
      name: "Launch readiness",
    });
    expect(
      Array.from(checklist.children).map((item) => item.dataset.readinessItem),
    ).toEqual([
      "publicSite",
      "bookings",
      "payments",
      "emails",
      "customerJourney",
    ]);
    expect(within(journeyReadiness).getByText("Step 5")).toBeVisible();
    expect(screen.getByText("4 of 5 checks complete")).toBeVisible();
    expect(journeyReadiness).toHaveAttribute(
      "data-readiness-status",
      "action_required",
    );
    expect(
      within(journeyReadiness).getByRole("link", {
        name: "Run the practice check again",
      }),
    ).toHaveAttribute("href", "/app/setup?step=practice_booking&review=ready");
    expect(
      journeyReadiness.querySelector(
        '[data-readiness-action="customerJourney"]',
      ),
    ).toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
  });
  it("uses the managed sender as the only live email-readiness signal", () => {
    mocks.setup = {
      ...mocks.setup,
      phase: "learning",
      health: "healthy",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: true,
        required: {
          complete: true,
          incompleteStepIds: [],
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: true,
          canStart: true,
        },
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        {
          ...incompleteStep({
            id: "communications",
            requirement: "recommended",
            action: {
              key: "configure_communications",
              enabled: true,
              href: "/app/communications?section=settings",
            },
          }),
          checks: [
            {
              id: "sender_verified",
              complete: false,
            },
          ],
        },
        completeStep("practice_booking", "recommended"),
      ],
      practice: {
        ...mocks.setup.practice,
        status: "complete",
        completedAt: "2026-08-12T10:30:00.000Z",
        retestRecommended: false,
      },
    };
    const { container, rerender } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "1 launch item needs attention",
      }),
    ).toBeInTheDocument();
    const emailReadiness = container.querySelector(
      '[data-readiness-item="emails"]',
    );
    expect(emailReadiness).toHaveAttribute(
      "data-readiness-status",
      "action_required",
    );
    expect(
      within(emailReadiness).getByText("Set up the managed sender."),
    ).toBeInTheDocument();
    expect(
      within(emailReadiness).getByRole("link", {
        name: "Set up email sender",
      }),
    ).toHaveAttribute(
      "href",
      "/app/communications?section=setup&setupStep=communications",
    );
    expect(
      emailReadiness.querySelector('[data-readiness-action="emails"]'),
    ).toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    mocks.setup = {
      ...mocks.setup,
      steps: mocks.setup.steps.map((step) =>
        step.id === "communications"
          ? {
              ...step,
              checks: [
                {
                  id: "sender_verified",
                  complete: true,
                },
              ],
            }
          : step,
      ),
    };
    rerender(<SetupCenterPage />);
    const updatedEmailReadiness = container.querySelector(
      '[data-readiness-item="emails"]',
    );
    expect(updatedEmailReadiness).toHaveAttribute(
      "data-readiness-status",
      "ready",
    );
    expect(
      within(updatedEmailReadiness).getByText("Managed sender is ready."),
    ).toBeInTheDocument();
  });
  it("blocks the final customer test when a live studio loses launch readiness", () => {
    mocks.search = "step=practice_booking";
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      health: "needs_attention",
      paymentReadiness: {
        applicable: true,
        ready: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        requirementsClear: false,
      },
      progress: {
        payment: {
          percentage: 50,
          completed: 1,
          total: 2,
        },
        launch: {
          percentage: 80,
          completed: 4,
          total: 5,
        },
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: false,
        required: {
          complete: false,
          incompleteStepIds: ["payments"],
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: true,
          action: {
            key: "practice_booking",
            enabled: true,
            href: "/app/setup?step=practice_booking",
          },
        },
      },
      steps: [
        completeStep("studio"),
        incompleteStep({
          id: "payments",
        }),
        incompleteStep({
          id: "practice_booking",
          requirement: "recommended",
          status: "blocked",
          action: {
            key: "practice_booking",
            enabled: true,
            href: "/app/setup?step=practice_booking",
          },
        }),
      ],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      container.querySelector('[data-launch-final-review="true"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "2 launch items need attention",
      }),
    ).toBeInTheDocument();
    const paymentReadiness = container.querySelector(
      '[data-readiness-item="payments"]',
    );
    expect(paymentReadiness).toHaveAttribute(
      "data-readiness-status",
      "action_required",
    );
    expect(
      within(paymentReadiness).getByRole("link", {
        name: "Finish payment setup",
      }),
    ).toHaveAttribute("href", "/app/setup?step=payments");
    const journeyReadiness = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    expect(journeyReadiness).toHaveAttribute(
      "data-readiness-status",
      "action_required",
    );
    expect(
      within(journeyReadiness).getByRole("link", {
        name: "Review next requirement",
      }),
    ).toHaveAttribute("href", "/app/setup?step=payments");
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    expect(
      container.querySelector('[data-launch-test-booking="true"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Complete one final customer check",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "practice.start",
      }),
    ).toBeDisabled();
  });
  it("offers manual confirmation directly on step five and waits for the saved snapshot", async () => {
    mocks.setup = livePracticeSetup();
    mocks.setup.practice.retestRecommended = true;
    const saved = manuallyConfirmedSetup(mocks.setup);
    let resolveSave;
    mocks.confirmPractice.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    });
    mocks.dispatch.mockImplementation((action) => {
      if (action.type === "setup/upsert") mocks.setup = action.payload;
    });
    const { container, rerender } = render(<SetupCenterPage />);
    const card = () =>
      container.querySelector('[data-readiness-item="customerJourney"]');
    const checkbox = within(card()).getByRole("checkbox", {
      name: messages["practice.manual.checkbox"],
    });
    const submit = within(card()).getByRole("button", {
      name: "Confirm check",
    });
    expect(checkbox).not.toBeChecked();
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mocks.confirmPractice).not.toHaveBeenCalled();
    fireEvent.click(checkbox);
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(mocks.confirmPractice).toHaveBeenCalledExactlyOnceWith("ready-v1");
    expect(
      within(card()).getByRole("button", {
        name: "Saving…",
      }),
    ).toBeDisabled();
    expect(card()).toHaveAttribute("data-readiness-status", "action_required");
    expect(within(card()).queryByRole("status")).not.toBeInTheDocument();
    resolveSave(saved);
    await waitFor(() => expect(mocks.setup).toBe(saved));
    rerender(<SetupCenterPage />);
    expect(card()).toHaveAttribute("data-readiness-status", "ready");
    expect(within(card()).getByRole("status")).toHaveTextContent(
      /Manually confirmed on .*2026/,
    );
    expect(
      within(card()).getByText(
        messages["readiness.items.customerJourney.descriptions.manual"],
      ),
    ).toBeVisible();
    expect(
      within(card()).getByRole("button", {
        name: "Remove confirmation",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText(messages["readiness.runAgain"]),
    ).not.toBeInTheDocument();
    expect(mocks.setup.practice.completedActions).toEqual([]);
    expect(mocks.setup.practice.status).toBe("expired");
    expect(mocks.startPractice).not.toHaveBeenCalled();
    expect(mocks.advancePractice).not.toHaveBeenCalled();
  });
  it("keeps current guided completion compact while offering manual confirmation after it becomes stale", () => {
    mocks.setup = manuallyConfirmedSetup(livePracticeSetup());
    mocks.setup.practice.status = "complete";
    mocks.setup.practice.manualConfirmation = null;
    mocks.setup.launchReview.testBooking.completionSource = "practice";
    const { container, rerender } = render(<SetupCenterPage />);
    const card = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    expect(card).toHaveAttribute("data-readiness-status", "ready");
    expect(
      card.querySelector("[data-practice-manual-confirmation]"),
    ).not.toBeInTheDocument();
    mocks.setup = {
      ...mocks.setup,
      launchReview: {
        ...mocks.setup.launchReview,
        testBooking: {
          ...mocks.setup.launchReview.testBooking,
          complete: false,
          retestRecommended: true,
          completionSource: null,
        },
      },
    };
    rerender(<SetupCenterPage />);
    expect(card).toHaveAttribute("data-readiness-status", "action_required");
    expect(
      within(card).getByRole("checkbox", {
        name: messages["practice.manual.checkbox"],
      }),
    ).toBeEnabled();
    expect(within(card).getByRole("checkbox")).not.toBeChecked();
  });
  it("keeps an unsuccessful manual save incomplete and retryable", async () => {
    mocks.setup = livePracticeSetup();
    mocks.confirmPractice.mockReturnValue({
      unwrap: async () => {
        throw {
          status: 500,
        };
      },
    });
    const { container } = render(<SetupCenterPage />);
    const card = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    fireEvent.click(within(card).getByRole("checkbox"));
    fireEvent.click(
      within(card).getByRole("button", {
        name: "Confirm check",
      }),
    );
    expect(await within(card).findByRole("alert")).toHaveTextContent(
      messages["practice.manual.error"],
    );
    expect(card).toHaveAttribute("data-readiness-status", "action_required");
    expect(within(card).queryByRole("status")).not.toBeInTheDocument();
    expect(
      within(card).getByRole("button", {
        name: "Confirm check",
      }),
    ).toBeEnabled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("clears consent and refreshes after a configuration conflict, requiring a new check", async () => {
    mocks.setup = livePracticeSetup();
    mocks.confirmPractice.mockReturnValue({
      unwrap: async () => {
        throw {
          status: 409,
          data: {
            code: "SETUP_PRACTICE_CONFIGURATION_CHANGED",
          },
        };
      },
    });
    const { container, rerender } = render(<SetupCenterPage />);
    const card = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    fireEvent.click(within(card).getByRole("checkbox"));
    fireEvent.click(
      within(card).getByRole("button", {
        name: "Confirm check",
      }),
    );
    expect(await within(card).findByRole("alert")).toHaveTextContent(
      messages["practice.manual.configurationChanged"],
    );
    await waitFor(() => expect(mocks.refetchSetup).toHaveBeenCalledOnce());
    expect(within(card).getByRole("checkbox")).not.toBeChecked();
    expect(
      within(card).getByRole("button", {
        name: "Confirm check",
      }),
    ).toBeDisabled();
    mocks.setup = {
      ...mocks.setup,
      diagnostics: {
        readinessFingerprint: "ready-v2",
      },
    };
    rerender(<SetupCenterPage />);
    expect(within(card).getByRole("checkbox")).not.toBeChecked();
    expect(mocks.confirmPractice).toHaveBeenCalledOnce();
  });
  it("invalidates an unsaved checkbox when the readiness fingerprint changes", () => {
    mocks.setup = livePracticeSetup();
    const { container, rerender } = render(<SetupCenterPage />);
    const card = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    fireEvent.click(within(card).getByRole("checkbox"));
    expect(within(card).getByRole("checkbox")).toBeChecked();
    mocks.setup = {
      ...mocks.setup,
      diagnostics: {
        readinessFingerprint: "ready-v2",
      },
    };
    rerender(<SetupCenterPage />);
    expect(within(card).getByRole("checkbox")).not.toBeChecked();
    expect(
      within(card).getByRole("button", {
        name: "Confirm check",
      }),
    ).toBeDisabled();
  });
  it("shows persisted manual confirmation after reload and removes it only after server success", async () => {
    const unconfirmed = livePracticeSetup();
    mocks.setup = manuallyConfirmedSetup(unconfirmed);
    let resolveRemove;
    mocks.removeConfirmation.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          resolveRemove = resolve;
        }),
    });
    mocks.dispatch.mockImplementation((action) => {
      if (action.type === "setup/upsert") mocks.setup = action.payload;
    });
    const { container, rerender } = render(<SetupCenterPage />);
    const card = () =>
      container.querySelector('[data-readiness-item="customerJourney"]');
    expect(within(card()).getByRole("status")).toHaveTextContent(
      "Manually confirmed",
    );
    fireEvent.click(
      within(card()).getByRole("button", {
        name: "Remove confirmation",
      }),
    );
    expect(within(card()).getByRole("status")).toHaveTextContent(
      "Manually confirmed",
    );
    expect(
      within(card()).getByRole("button", {
        name: "Saving…",
      }),
    ).toBeDisabled();
    resolveRemove(unconfirmed);
    await waitFor(() => expect(mocks.setup).toBe(unconfirmed));
    rerender(<SetupCenterPage />);
    expect(mocks.removeConfirmation).toHaveBeenCalledOnce();
    expect(within(card()).queryByRole("status")).not.toBeInTheDocument();
    expect(within(card()).getByRole("checkbox")).not.toBeChecked();
    expect(card()).toHaveAttribute("data-readiness-status", "action_required");
  });
  it("keeps a failed removal visibly confirmed and retryable", async () => {
    mocks.setup = manuallyConfirmedSetup(livePracticeSetup());
    mocks.removeConfirmation.mockReturnValue({
      unwrap: async () => {
        throw {
          status: 500,
        };
      },
    });
    const { container } = render(<SetupCenterPage />);
    const card = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    fireEvent.click(
      within(card).getByRole("button", {
        name: "Remove confirmation",
      }),
    );
    expect(await within(card).findByRole("alert")).toHaveTextContent(
      messages["practice.manual.undoError"],
    );
    expect(within(card).getByRole("status")).toHaveTextContent(
      "Manually confirmed",
    );
    expect(
      within(card).getByRole("button", {
        name: "Remove confirmation",
      }),
    ).toBeEnabled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("offers explicit reconfirmation for a stale manual check without claiming success", () => {
    mocks.setup = livePracticeSetup();
    mocks.setup.practice.manualConfirmation = {
      confirmedAt: "2026-11-02T12:00:00.000Z",
      current: false,
    };
    mocks.setup.launchReview.testBooking.retestRecommended = true;
    const { container } = render(<SetupCenterPage />);
    const card = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    expect(
      within(card).getByText(messages["practice.manual.stale"]),
    ).toBeVisible();
    expect(within(card).getByRole("checkbox")).not.toBeChecked();
    expect(within(card).queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole("checkbox"));
    expect(
      within(card).getByRole("button", {
        name: "Confirm check",
      }),
    ).toBeEnabled();
  });
  it.each(["workspace.update", "products.view", "bookings.create"])(
    "does not allow manual save or undo without %s",
    (missing) => {
      mocks.setup = livePracticeSetup();
      mocks.workspaceAccess = {
        role: "custom",
        status: "active",
        permissions: [
          "workspace.update",
          "products.view",
          "bookings.create",
        ].filter((permission) => permission !== missing),
      };
      const { container, rerender } = render(<SetupCenterPage />);
      const card = () =>
        container.querySelector('[data-readiness-item="customerJourney"]');
      expect(within(card()).getByRole("checkbox")).toBeDisabled();
      fireEvent.click(
        within(card()).getByRole("button", {
          name: "Confirm check",
        }),
      );
      expect(mocks.confirmPractice).not.toHaveBeenCalled();
      mocks.setup = manuallyConfirmedSetup(mocks.setup);
      rerender(<SetupCenterPage />);
      expect(
        within(card()).getByRole("button", {
          name: "Remove confirmation",
        }),
      ).toBeDisabled();
      fireEvent.click(
        within(card()).getByRole("button", {
          name: "Remove confirmation",
        }),
      );
      expect(mocks.removeConfirmation).not.toHaveBeenCalled();
    },
  );
  it.each(["prerequisites", "publication", "fingerprint"])(
    "does not allow manual confirmation without %s",
    (missing) => {
      mocks.setup = livePracticeSetup({
        blocked: missing === "prerequisites",
      });
      if (missing === "publication") {
        mocks.setup.publication.status = "draft";
        mocks.setup.launchReview.publicSite.published = false;
      }
      if (missing === "fingerprint") mocks.setup.diagnostics = {};
      const { container } = render(<SetupCenterPage />);
      const card = container.querySelector(
        '[data-readiness-item="customerJourney"]',
      );
      expect(within(card).getByRole("checkbox")).toBeDisabled();
      fireEvent.click(
        within(card).getByRole("button", {
          name: "Confirm check",
        }),
      );
      expect(mocks.confirmPractice).not.toHaveBeenCalled();
    },
  );
  it("keeps prerequisite fixes and practice controls disabled for a read-only member", () => {
    mocks.search = "step=practice_booking";
    mocks.setup = livePracticeSetup({
      blocked: true,
    });
    mocks.workspaceAccess = {
      role: "custom",
      status: "active",
      permissions: ["workspace.view", "products.view"],
    };
    const { container, rerender } = render(<SetupCenterPage />);
    for (const context of ["readiness", "detail"]) {
      const prerequisites = container.querySelector(
        `[data-practice-prerequisites="${context}"]`,
      );
      expect(within(prerequisites).queryByRole("link")).not.toBeInTheDocument();
      expect(
        within(prerequisites).getByRole("button", {
          name: "Review inventory",
        }),
      ).toBeDisabled();
      expect(
        within(prerequisites).getByText(
          messages["readiness.permissionRequired"],
        ),
      ).toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", {
        name: "practice.reset",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "practice.restart",
      }),
    ).toBeDisabled();
    mocks.setup = livePracticeSetup();
    rerender(<SetupCenterPage />);
    expect(
      screen.getByRole("button", {
        name: "practice.restart",
      }),
    ).toBeDisabled();
    mocks.setup = {
      ...mocks.setup,
      practice: {
        ...mocks.setup.practice,
        status: "active",
        runId: "run-1",
      },
    };
    rerender(<SetupCenterPage />);
    expect(
      screen.getByRole("button", {
        name: "practice.try",
      }),
    ).toBeDisabled();
  });
  it.each(["expired", "stale"])(
    "restarts an eligible %s practice and completes all five readiness checks",
    async (session) => {
      mocks.search = "step=practice_booking&review=ready";
      mocks.setup = livePracticeSetup();
      const actions = [
        "create_booking",
        "preview_confirmation",
        "preview_membership",
        "check_in",
        "cancel_booking",
      ];
      if (session === "stale") {
        mocks.setup.practice = {
          status: "complete",
          runId: "old-run",
          completedActions: actions,
          artifacts: [],
          retestRecommended: true,
        };
      }
      mocks.dispatch.mockImplementation((action) => {
        if (action.type === "setup/upsert") mocks.setup = action.payload;
      });
      mocks.abandonPractice.mockImplementation(() => ({
        unwrap: async () => ({
          ...mocks.setup,
          practice: {
            status: "not_started",
            completedActions: [],
            artifacts: [],
            retestRecommended: false,
          },
        }),
      }));
      mocks.startPractice.mockImplementation(() => ({
        unwrap: async () => ({
          ...mocks.setup,
          practice: {
            ...mocks.setup.practice,
            status: "active",
            runId: "new-run",
          },
        }),
      }));
      mocks.advancePractice.mockImplementation(({ action }) => ({
        unwrap: async () => {
          const completedActions = [
            ...mocks.setup.practice.completedActions,
            action,
          ];
          const complete = completedActions.length === actions.length;
          return {
            ...mocks.setup,
            launchReview: {
              ...mocks.setup.launchReview,
              launchComplete: complete,
              testBooking: {
                ...mocks.setup.launchReview.testBooking,
                complete,
              },
            },
            practice: {
              ...mocks.setup.practice,
              completedActions,
              status: complete ? "complete" : "active",
            },
            steps: mocks.setup.steps.map((step) =>
              step.id === "practice_booking" && complete
                ? {
                    ...step,
                    status: "complete",
                  }
                : step,
            ),
          };
        },
      }));
      const { container, rerender } = render(<SetupCenterPage />);
      expect(screen.getByText("4 of 5 checks complete")).toBeVisible();
      expect(
        screen.queryByText("practice.completedTitle"),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", {
          name:
            session === "stale"
              ? "Run the practice check again"
              : "practice.restart",
        }),
      );
      await waitFor(() => expect(mocks.setup.practice.runId).toBe("new-run"));
      expect(mocks.startPractice).toHaveBeenCalledTimes(1);
      expect(mocks.abandonPractice).toHaveBeenCalledTimes(
        session === "stale" ? 1 : 0,
      );
      if (session === "stale") {
        expect(mocks.abandonPractice.mock.invocationCallOrder[0]).toBeLessThan(
          mocks.startPractice.mock.invocationCallOrder[0],
        );
      }
      rerender(<SetupCenterPage />);
      for (const action of actions) {
        fireEvent.click(
          screen.getByRole("button", {
            name: "practice.try",
          }),
        );
        await waitFor(() =>
          expect(mocks.setup.practice.completedActions).toContain(action),
        );
        expect(mocks.advancePractice).toHaveBeenLastCalledWith({
          runId: "new-run",
          action,
        });
        rerender(<SetupCenterPage />);
      }
      expect(screen.getByText("practice.completedTitle")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: "practice.try",
        }),
      ).not.toBeInTheDocument();
      expect(
        container.querySelector('[data-readiness-item="customerJourney"]'),
      ).toHaveAttribute("data-readiness-status", "ready");
      expect(mocks.advancePractice).toHaveBeenCalledTimes(actions.length);
      expect(screen.getByText("5 of 5 checks complete")).toBeVisible();
      expect(
        container.querySelectorAll('[data-readiness-status="ready"]'),
      ).toHaveLength(5);
    },
  );
  it.each(["reset", "start"])(
    "keeps a failed stale-practice %s retryable without claiming completion",
    async (failure) => {
      mocks.search = "step=practice_booking&review=ready";
      mocks.setup = livePracticeSetup();
      mocks.setup.practice = {
        status: "complete",
        completedActions: ["create_booking"],
        artifacts: [],
        retestRecommended: true,
      };
      mocks.dispatch.mockImplementation((action) => {
        if (action.type === "setup/upsert") mocks.setup = action.payload;
      });
      mocks.abandonPractice.mockImplementation(() => ({
        unwrap: async () => {
          if (failure === "reset") throw new Error("Reset failed");
          return {
            ...mocks.setup,
            practice: {
              status: "not_started",
              completedActions: [],
              artifacts: [],
              retestRecommended: false,
            },
          };
        },
      }));
      mocks.startPractice.mockReturnValue({
        unwrap: async () => {
          throw new Error("Start failed");
        },
      });
      const { rerender } = render(<SetupCenterPage />);
      fireEvent.click(
        screen.getByRole("button", {
          name: "Run the practice check again",
        }),
      );
      await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
      rerender(<SetupCenterPage />);
      expect(mocks.startPractice).toHaveBeenCalledTimes(
        failure === "reset" ? 0 : 1,
      );
      expect(mocks.setup.practice.status).toBe(
        failure === "reset" ? "complete" : "not_started",
      );
      expect(
        screen.getByRole("button", {
          name:
            failure === "reset"
              ? "Run the practice check again"
              : "practice.start",
        }),
      ).toBeEnabled();
      expect(
        screen.queryByText("practice.completedTitle"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("4 of 5 checks complete")).toBeVisible();
    },
  );
  it.each(["prerequisites", "permissions"])(
    "disables a stale-practice restart without %s",
    (restriction) => {
      mocks.search = "step=practice_booking&review=ready";
      mocks.setup = livePracticeSetup({
        blocked: restriction === "prerequisites",
      });
      mocks.setup.practice = {
        status: "complete",
        completedActions: [],
        artifacts: [],
        retestRecommended: true,
      };
      if (restriction === "permissions") {
        mocks.workspaceAccess = {
          role: "custom",
          status: "active",
          permissions: ["workspace.view", "products.view"],
        };
      }
      render(<SetupCenterPage />);
      const restartButtons = screen.getAllByRole("button", {
        name: "Run the practice check again",
      });
      for (const restart of restartButtons) {
        expect(restart).toBeDisabled();
        fireEvent.click(restart);
      }
      expect(mocks.abandonPractice).not.toHaveBeenCalled();
      expect(mocks.startPractice).not.toHaveBeenCalled();
    },
  );
  it("auto-clears a completed stale step URL instead of reopening it", async () => {
    mocks.search = "step=studio&source=overview";
    render(<SetupCenterPage />);
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/app/setup?source=overview", {
        scroll: false,
      }),
    );
    expect(
      screen.queryByRole("heading", {
        level: 2,
        name: "Your workspace essentials are ready",
      }),
    ).not.toBeInTheDocument();
  });
  it("keeps completed required work collapsed, focuses explicit review, and clears review when closed", async () => {
    const { container, rerender } = render(<SetupCenterPage />);
    const readyDetails = screen
      .getByText("Requirements to accept payments")
      .closest("details");
    const readySummary = within(readyDetails)
      .getByText("Requirements to accept payments")
      .closest("summary");
    expect(readyDetails).not.toHaveAttribute("open");
    const studioRow = within(readyDetails).getByRole("button", {
      name: /Your workspace essentials are ready/,
      hidden: true,
    });
    expect(studioRow).not.toBeVisible();
    fireEvent.click(readySummary);
    expect(readyDetails).toHaveAttribute("open");
    fireEvent.click(studioRow);
    expect(mocks.replace).toHaveBeenCalledWith(
      "/app/setup?step=studio&review=ready",
      {
        scroll: false,
      },
    );
    mocks.search = "step=studio&review=ready&source=overview";
    rerender(<SetupCenterPage />);
    const reviewedHeading = screen.getByRole("heading", {
      level: 2,
      name: "Your workspace essentials are ready",
    });
    expect(reviewedHeading).toBeInTheDocument();
    const reviewedReadyDetails = screen
      .getByText("Requirements to accept payments")
      .closest("details");
    expect(reviewedReadyDetails).toHaveAttribute("open");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        container.querySelector("#launch-center-step-detail"),
      ),
    );
    fireEvent.click(
      within(reviewedReadyDetails)
        .getByText("Requirements to accept payments")
        .closest("summary"),
    );
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenLastCalledWith(
        "/app/setup?source=overview",
        {
          scroll: false,
        },
      ),
    );
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Your workspace essentials are ready",
      }),
    ).toBeInTheDocument();
  });
  it("offers only live customer checks that apply to enabled workflows", () => {
    mocks.search = "step=publish&review=ready";
    mocks.setup = {
      ...mocks.setup,
      launchReview: {
        required: {
          complete: true,
        },
        publicSite: {
          applicable: true,
          published: true,
          publicPath: "/",
        },
      },
    };
    const { container, rerender } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("link", {
        name: "Open website",
      }),
    ).toMatchObject({
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(
      screen.queryByRole("link", {
        name: "Test customer booking",
      }),
    ).not.toBeInTheDocument();
    mocks.setup = {
      ...mocks.setup,
      steps: [
        ...mocks.setup.steps,
        {
          ...completeStep("bookable_offer"),
          applicable: false,
          status: "not_applicable",
        },
      ],
    };
    rerender(<SetupCenterPage />);
    expect(
      screen.queryByRole("link", {
        name: "Test customer booking",
      }),
    ).not.toBeInTheDocument();
    mocks.setup = {
      ...mocks.setup,
      steps: [
        ...mocks.setup.steps.filter((step) => step.id !== "bookable_offer"),
        completeStep("bookable_offer"),
      ],
    };
    rerender(<SetupCenterPage />);
    const journeyReadiness = container.querySelector(
      '[data-readiness-item="customerJourney"]',
    );
    expect(
      within(journeyReadiness).getByRole("link", {
        name: "Complete test booking",
      }),
    ).toHaveAttribute("href", "/app/setup?step=practice_booking");
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    const customerJourneyLink = within(journeyReadiness).getByRole("link", {
      name: "Complete test booking",
    });
    customerJourneyLink.addEventListener("click", (event) =>
      event.preventDefault(),
    );
    fireEvent.click(customerJourneyLink);
    expect(
      mocks.trackSetupEvent.mock.calls
        .map(([event]) => event)
        .filter(({ event }) => event === "test_booking_opened"),
    ).toEqual([
      expect.objectContaining({
        event: "test_booking_opened",
        source: "final_review",
      }),
    ]);
  });
  it("omits non-applicable setup and opens the checklist at its next action", () => {
    mocks.setup = {
      ...mocks.setup,
      steps: [
        completeStep("studio"),
        {
          ...completeStep("payments"),
          applicable: false,
          status: "not_applicable",
        },
        incompleteStep({
          id: "communications",
          requirement: "recommended",
        }),
        completeStep("publish"),
      ],
    };
    render(<SetupCenterPage />);
    expect(
      screen.queryByRole("button", {
        name: /payments/i,
        hidden: true,
      }),
    ).not.toBeInTheDocument();
    const improveDetails = screen
      .getByText("Checklist before you launch")
      .closest("details");
    expect(improveDetails).toHaveAttribute("open");
    expect(
      within(improveDetails).getByRole("button", {
        name: /Will customers receive the right messages\?/,
        hidden: true,
      }),
    ).toBeVisible();
    expect(within(improveDetails).getByText("Recommended")).toBeVisible();
  });
  it("keeps explicitly disabled workflows visible but collapsed", () => {
    mocks.setup = {
      ...mocks.setup,
      steps: [
        completeStep("studio"),
        {
          id: "inventory",
          status: "not_applicable",
          applicable: false,
          requirement: "recommended",
          reasonCode: "inventory_module_disabled",
          checks: [],
          actions: [],
        },
        {
          id: "membership",
          status: "not_applicable",
          applicable: false,
          requirement: "recommended",
          reasonCode: "memberships_module_disabled",
          checks: [],
          actions: [],
        },
        completeStep("publish"),
      ],
    };
    render(<SetupCenterPage />);
    const readyDetails = screen.getByText("Available later").closest("details");
    const disabledWorkflow = within(readyDetails).getByRole("link", {
      name: /Do you offer studio memberships\?.*Not enabled/,
      hidden: true,
    });
    const piecePricingWorkflow = within(readyDetails).getByRole("link", {
      name: /Do you manage shared supplies\?.*Not enabled/,
      hidden: true,
    });
    expect(readyDetails).not.toHaveAttribute("open");
    expect(disabledWorkflow).not.toBeVisible();
    expect(disabledWorkflow).toHaveAttribute(
      "href",
      "/app/settings/modules?from=launch-center",
    );
    expect(piecePricingWorkflow).toHaveAttribute(
      "href",
      "/app/settings/modules?from=launch-center",
    );
  });
  it("does not link disabled setup rows without configuration permissions", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: [],
    };
    mocks.setup = {
      ...mocks.setup,
      steps: [
        completeStep("studio"),
        {
          id: "inventory",
          status: "not_applicable",
          applicable: false,
          requirement: "recommended",
          reasonCode: "inventory_module_disabled",
          checks: [],
          actions: [],
        },
        {
          id: "membership",
          status: "not_applicable",
          applicable: false,
          requirement: "recommended",
          reasonCode: "memberships_module_disabled",
          checks: [],
          actions: [],
        },
        completeStep("publish"),
      ],
    };
    render(<SetupCenterPage />);
    const readyDetails = screen.getByText("Available later").closest("details");
    expect(
      within(readyDetails).queryByRole("link", {
        hidden: true,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(readyDetails).getByText("Do you manage shared supplies?"),
    ).toBeInTheDocument();
    expect(
      within(readyDetails).getByText("Do you offer studio memberships?"),
    ).toBeInTheDocument();
  });
  it("keeps learning recommendations inside Available later", () => {
    mocks.setup = {
      ...mocks.setup,
      recommendations: [
        {
          id: "reminders",
          complete: false,
          action: {
            enabled: true,
            href: "/app/communications?section=automations",
          },
        },
      ],
    };
    const { container } = render(<SetupCenterPage />);
    const improveDetails = screen
      .getByText("Available later")
      .closest("details");
    const recommendation = within(improveDetails).getByRole("link", {
      name: /Remind customers before every booking.*Recommended/,
      hidden: true,
    });
    expect(improveDetails).not.toHaveAttribute("open");
    expect(recommendation).not.toBeVisible();
    expect(recommendation).toHaveAttribute(
      "href",
      "/app/communications?section=automations",
    );
    expect(container.querySelectorAll("[data-launch-section]")).toHaveLength(2);
  });
  it("waits for workflow intent, then gates the Launch Center behind one workflow action", () => {
    mocks.workspaceConfiguration = undefined;
    mocks.workspaceConfigurationLoading = true;
    const { container, rerender } = render(<SetupCenterPage />);
    expect(screen.getByText("Loading Launch Center")).toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    mocks.workspaceConfigurationLoading = false;
    mocks.workspaceConfiguration = {
      intent: {
        configured: false,
        definitionVersion: 1,
      },
    };
    rerender(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        name: "A Launch Center that fits the way your studio works",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Launch your studio with confidence",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Choose studio workflow",
      }),
    ).toHaveAttribute("href", "/app/settings/modules?from=launch-center");
    expect(
      screen.queryByText("Requirements to accept payments"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Your studio is ready",
      }),
    ).not.toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(1);
  });
  it("opens selected recommended work as a question without creating a second primary action", () => {
    mocks.search = "step=communications";
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      progress: {
        percentage: 0,
        completed: 0,
        total: 2,
        required: {
          percentage: 0,
          completed: 0,
          total: 1,
        },
      },
      steps: [
        incompleteStep({
          id: "studio",
          action: {
            key: "edit_studio",
            enabled: true,
            href: "/app/settings",
          },
        }),
        incompleteStep({
          id: "communications",
          requirement: "recommended",
          action: {
            key: "configure_communications",
            enabled: true,
            href: "/app/communications?section=settings",
          },
        }),
      ],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Will customers receive the right messages?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Checklist before you launch").closest("details"),
    ).toHaveAttribute("open");
    expect(
      screen.getByRole("link", {
        name: "Configure communications",
      }),
    ).toHaveAttribute(
      "href",
      "/app/communications?section=setup&setupStep=communications",
    );
    expect(
      screen.getByRole("link", {
        name: "Start guided tour",
      }),
    ).toHaveAttribute(
      "href",
      "/app/communications?section=setup&guide=customer_communications",
    );
    expect(
      screen.getByRole("link", {
        name: "Start guided tour",
      }),
    ).not.toHaveAttribute("href", expect.stringContaining("setupStep"));
    expect(screen.queryByText("Next Best Action")).not.toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Ask Launch Assistant",
      }),
    );
    expect(mocks.openSetupAssistant).toHaveBeenCalledWith({
      context: {
        surface: "setup_center",
        setupStepId: "communications",
        route: "/app/setup?step=communications",
      },
      starterPrompt: "Help me with Will customers receive the right messages?",
    });
  });
  it("keeps the selected communications actions visible after payments are ready", () => {
    mocks.search = "step=communications";
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      paymentReadiness: {
        applicable: true,
        ready: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        requirementsClear: true,
      },
      progress: {
        payment: {
          percentage: 100,
          completed: 2,
          total: 2,
        },
        launch: {
          percentage: 3,
          completed: 1,
          total: 4,
        },
      },
      launchReview: {
        readyToPublish: false,
        launchComplete: false,
        required: {
          complete: false,
          incompleteStepIds: ["communications"],
        },
        publicSite: {
          applicable: true,
          published: false,
        },
        testBooking: {
          applicable: true,
          complete: false,
          canStart: false,
        },
      },
      publication: {
        status: "draft",
      },
      steps: [
        completeStep("studio"),
        completeStep("payments"),
        completeStep("bookable_offer", "recommended"),
        {
          ...incompleteStep({
            id: "communications",
            requirement: "recommended",
            action: {
              key: "configure_communications",
              enabled: true,
              href: "/app/communications?section=settings",
            },
          }),
          checks: [
            {
              id: "sender_verified",
              complete: false,
            },
          ],
        },
      ],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        name: "Your studio can now accept payments",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("To finish this step")).toBeInTheDocument();
    expect(
      container.querySelector('[data-launch-step-action="communications"]'),
    ).toHaveAttribute(
      "href",
      "/app/communications?section=setup&setupStep=communications",
    );
    expect(
      container.querySelector(
        '[data-launch-guide-action="customer_communications"]',
      ),
    ).toHaveAttribute(
      "href",
      "/app/communications?section=setup&guide=customer_communications",
    );
  });
  it("does not offer the new-location tour for an existing-location review", () => {
    mocks.search = "step=location";
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      publication: {
        status: "draft",
      },
      progress: {
        launch: {
          percentage: 0,
          completed: 0,
          total: 1,
        },
      },
      steps: [
        incompleteStep({
          id: "location",
          requirement: "recommended",
          action: {
            key: "review_location",
            enabled: true,
            href: "/app/settings/locations?locationId=location-1",
          },
        }),
      ],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      container.querySelector('[data-launch-step-action="location"]'),
    ).toHaveAttribute(
      "href",
      "/app/settings/locations?locationId=location-1&setupStep=location",
    );
    expect(
      container.querySelector("[data-launch-guide-action]"),
    ).not.toBeInTheDocument();
  });
  it("shows blocked required work in the open Required section", () => {
    mocks.setup = {
      ...mocks.setup,
      phase: "launch",
      progress: {
        percentage: 0,
        completed: 0,
        total: 2,
        required: {
          percentage: 0,
          completed: 0,
          total: 1,
        },
      },
      steps: [
        incompleteStep({
          id: "bookable_offer",
          status: "blocked",
          action: {
            key: "create_offer",
            enabled: false,
            href: "/app/products",
          },
        }),
        incompleteStep({
          id: "communications",
          requirement: "recommended",
        }),
      ],
    };
    const { container } = render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Can customers book one of your offers?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Requirements to accept payments").closest("details"),
    ).toHaveAttribute("open");
    expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("link", {
        name: /create a bookable offer/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-launch-guide-action]"),
    ).not.toBeInTheDocument();
    expect(getPrimaryLaunchActions(container)).toHaveLength(0);
  });
  it.each(["review_offer", "schedule_offer"])(
    "does not offer the creation tour for a %s action",
    (actionKey) => {
      mocks.search = "step=bookable_offer";
      mocks.setup = {
        ...mocks.setup,
        phase: "launch",
        publication: {
          status: "draft",
        },
        progress: {
          launch: {
            percentage: 0,
            completed: 0,
            total: 1,
          },
        },
        steps: [
          incompleteStep({
            id: "bookable_offer",
            requirement: "recommended",
            action: {
              key: actionKey,
              enabled: true,
              href: "/app/products?category=openStudio",
            },
          }),
        ],
      };
      const { container } = render(<SetupCenterPage />);
      expect(
        container.querySelector('[data-launch-step-action="bookable_offer"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector("[data-launch-guide-action]"),
      ).not.toBeInTheDocument();
    },
  );
  it("shows the customer import recommendation only with import permission", () => {
    mocks.workspaceAccess = {
      role: "custom",
      status: "active",
      permissions: [],
    };
    mocks.setup = {
      ...mocks.setup,
      recommendations: [
        {
          id: "customers",
          complete: false,
          action: {
            enabled: true,
            href: "/app/settings/migration?entity=customers",
          },
        },
      ],
    };
    const { rerender } = render(<SetupCenterPage />);
    expect(
      screen.queryByText("Your existing customers are ready in shario.io"),
    ).not.toBeInTheDocument();
    mocks.workspaceAccess = {
      ...mocks.workspaceAccess,
      permissions: ["customers.import"],
    };
    rerender(<SetupCenterPage />);
    expect(
      screen.getByRole("link", {
        name: /Your existing customers are ready in shario\.io/,
      }),
    ).toHaveAttribute("href", "/app/settings/migration?entity=customers");
  });
  it("does not expose a public studio link while publication is a draft", () => {
    mocks.search = "step=publish";
    mocks.setup = {
      ...mocks.setup,
      publication: {
        status: "draft",
      },
      steps: [
        completeStep("studio"),
        incompleteStep({
          id: "publish",
          requirement: "recommended",
          action: {
            key: "publish_studio",
            enabled: true,
            href: "/app/setup?step=publish",
          },
        }),
      ],
    };
    render(<SetupCenterPage />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Are you ready to welcome customers?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Public studio",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "View public studio",
      }),
    ).not.toBeInTheDocument();
  });
  it.each([
    ["English", messagesEn, "Launch Center", "Test booking"],
    ["Czech", messagesCs, "Centrum spuštění", "Zkušební rezervace"],
  ])(
    "localizes the redesigned Launch Center in %s",
    (_label, catalog, launchCenterLabel, testBookingLabel) => {
      expect(catalog.SetupCenter.hero.launchEyebrow).toBe(launchCenterLabel);
      expect(catalog.SetupCenter.hero.remainingTitle).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.sections.required.title).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.sections.recommended.title).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.sections.availableLater.title).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.sections.allTasks.title).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.sections.allTasks.description).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.viewStates.setup_needed).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.viewStates.ready).toEqual(expect.any(String));
      expect(catalog.SetupCenter.steps.bookable_offer.question).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.steps.bookable_offer.outcome).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.publish.viewPublicSite).toEqual(
        expect.any(String),
      );
      expect(
        catalog.SetupCenter.readiness.items.emails.descriptions.sender_required,
      ).toEqual(expect.any(String));
      expect(
        catalog.SetupCenter.readiness.items.emails.descriptions
          .confirmation_required,
      ).toEqual(expect.any(String));
      expect(catalog.SetupCenter.completion.attentionTitleCount).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.readiness.issueCount).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.readiness.completedSummary).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.readiness.showCompleted).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.readiness.hideCompleted).toEqual(
        expect.any(String),
      );
      expect(catalog.SetupCenter.readiness.permissionRequired).toEqual(
        expect.any(String),
      );
      for (const readinessItem of [
        "publicSite",
        "bookings",
        "payments",
        "emails",
        "customerJourney",
      ]) {
        expect(
          catalog.SetupCenter.readiness.items[readinessItem].action,
        ).toEqual(expect.any(String));
      }
      expect(catalog.SetupCenter.readiness.items.customerJourney.title).toBe(
        testBookingLabel,
      );
      for (const profileKey of [
        "eyebrow",
        "inferredEyebrow",
        "title",
        "description",
        "inferredDescription",
        "inferredBadge",
        "edit",
        "noneSelected",
        "more",
        "viewAnswers",
        "updatedAt",
        "enabled",
        "notEnabled",
      ]) {
        expect(catalog.SetupCenter.profile[profileKey]).toEqual(
          expect.any(String),
        );
      }
      for (const questionId of [
        "sharedStudio",
        "classes",
        "memberships",
        "vouchers",
        "inventory",
      ]) {
        expect(catalog.SetupCenter.profile.items[questionId]).toEqual(
          expect.any(String),
        );
      }
      for (const growthKey of [
        "eyebrow",
        "title",
        "description",
        "opportunityCount",
        "inviteTeam",
        "reviewWorkspace",
        "allSet",
        "unavailable",
        "next",
        "explore",
        "viewAll",
      ]) {
        expect(catalog.SetupCenter.growth[growthKey]).toEqual(
          expect.any(String),
        );
      }
      expect(
        catalog.WorkspaceModules.workflowQuestions.editReviewDescription,
      ).toEqual(expect.any(String));
      expect(catalog.WorkspaceModules.workflowQuestions.applyChanges).toEqual(
        expect.any(String),
      );
      expect(catalog.WorkspaceModules.workflowQuestions.cancel).toEqual(
        expect.any(String),
      );
      for (const previewKey of [
        "title",
        "enabled",
        "disabled",
        "navigation",
        "answers",
        "noChanges",
      ]) {
        expect(
          catalog.WorkspaceModules.workflowQuestions.changePreview[previewKey],
        ).toEqual(expect.any(String));
      }
    },
  );
});
