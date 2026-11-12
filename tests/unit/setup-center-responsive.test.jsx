import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setupSteps = [
  ["studio", "required", "complete"],
  ["location", "required", "incomplete"],
  ["bookable_offer", "required", "incomplete"],
  ["practice_booking", "required", "blocked"],
  ["payments", "recommended", "incomplete"],
  ["communications", "recommended", "incomplete"],
  ["publish", "recommended", "blocked"],
].map(([id, requirement, status]) => ({
  id,
  requirement,
  status,
  applicable: true,
  checks: [],
  actions: [{ key: "continue", enabled: false, href: "/app" }],
}));

const mocks = vi.hoisted(() => ({
  search: "step=location",
  replace: vi.fn(),
  setup: {
    definitionVersion: 1,
    phase: "launch",
    health: "healthy",
    progress: {
      percentage: 25,
      completed: 2,
      total: 8,
    },
    publication: {
      status: "draft",
    },
    recommendations: [],
  },
}));

mocks.setup.steps = setupSteps;

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) => {
      if (key === "stepNumber") return `Step ${values.number}`;
      if (key.startsWith("steps.") && key.endsWith(".outcome")) {
        return `A deliberately long ${key.split(".")[1]} launch outcome`;
      }
      return key;
    },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: {
          modules: {
            bookings: true,
          },
        },
        workspaceAccess: {
          role: "owner",
          status: "active",
        },
      },
    }),
}));

vi.mock("@/config/permissions", () => ({
  DATA_IMPORT_PERMISSIONS: [],
  PERMISSIONS: { WORKSPACE_CONFIGURATION_MANAGE: "workspace:configure" },
  hasPermission: () => true,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
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
    openSetupAssistant: vi.fn(),
  }),
}));

vi.mock("@/components/decorations/WorkspaceBrushField", () => ({
  default: ({ variant }) => (
    <div aria-hidden="true" data-workspace-brush-field={variant} />
  ),
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => {
  const mutationHook = () => [vi.fn(), { isLoading: false }];

  return {
    setupCenterApiSlice: {
      util: {
        upsertQueryData: vi.fn(),
      },
    },
    useGetSetupCenterQuery: () => ({
      data: mocks.setup,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useAbandonSetupPracticeMutation: mutationHook,
    useAdvanceSetupPracticeMutation: mutationHook,
    useConfirmSetupPracticeMutation: mutationHook,
    useRemoveSetupPracticeConfirmationMutation: mutationHook,
    usePublishStudioMutation: mutationHook,
    useStartSetupPracticeMutation: mutationHook,
    useTrackSetupEventMutation: () => [
      vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({ accepted: true }) })),
    ],
    useUnpublishStudioMutation: mutationHook,
  };
});

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetWorkspaceConfigurationQuery: () => ({
    data: { intent: { configured: true, definitionVersion: 1 } },
  }),
}));

import SetupCenterPage from "@/components/setup-center/SetupCenterPage";

describe("SetupCenterPage responsive step navigation", () => {
  beforeEach(() => {
    mocks.search = "step=location";
    mocks.replace.mockReset();
  });

  it("uses full-width stacked sections with only required work expanded", () => {
    const { container } = render(<SetupCenterPage />);

    expect(
      container.querySelector('[data-workspace-brush-field="launchHero"]'),
    ).toBeInTheDocument();

    const activeStep = container.querySelector('[aria-current="step"]');
    const required = screen
      .getByText("sections.required.title")
      .closest("details");
    const recommended = screen
      .getByText("sections.recommended.title")
      .closest("details");
    const sectionStack = required.parentElement;

    expect(activeStep.classList.contains("w-full")).toBe(true);
    expect(activeStep.closest("details")).toBe(required);
    expect(sectionStack.classList.contains("space-y-3")).toBe(true);
    expect(sectionStack.classList.contains("grid")).toBe(false);
    expect(Array.from(sectionStack.children)).toEqual([required, recommended]);

    expect(required.hasAttribute("open")).toBe(true);
    expect(recommended.hasAttribute("open")).toBe(false);

    expect(container.querySelector("aside")).toBeNull();
    expect(
      container.querySelector('[class*="lg:grid-cols-[300px"]'),
    ).toBeNull();
    expect(container.querySelector('[class~="overflow-x-auto"]')).toBeNull();
    expect(container.querySelector('[class~="min-w-max"]')).toBeNull();
  });
});
