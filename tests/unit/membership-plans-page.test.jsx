import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MembershipPlansPage from "@/components/views/membership_plans/MembershipPlansPage";

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetAllProductsQuery: () => ({ data: [] }),
}));

const state = vi.hoisted(() => ({
  access: { roleKey: "owner", status: "active", permissions: [] },
  plans: [],
  languageSettings: {
    publicDefaultLanguage: "cs",
    supportedPublicLanguages: ["cs", "en"],
  },
  editorLanguageSettings: null,
}));

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  archive: vi.fn(),
  duplicate: vi.fn(),
}));

const planPayload = {
  name: "Studio Member",
  description: "Monthly studio membership",
  terms: "",
  sortOrder: 0,
  prices: [{ currency: "CZK", amountMinor: 199000 }],
  billing: { type: "recurring", interval: "month", intervalCount: 1 },
  locationScope: { type: "all", locationIds: [] },
  benefits: [],
};

const plan = {
  id: "plan-1",
  status: "draft",
  draftVersion: {
    ...planPayload,
    id: "version-1",
    version: 1,
  },
};

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({
    settings: { currency: "CZK", ...state.languageSettings },
  }),
  selectCurrentWorkspaceAccess: () => state.access,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: false,
    stepId: "membership",
    refreshAndContinue: vi.fn().mockResolvedValue(false),
  }),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      const labels = {
        "Memberships.owner": {
          eyebrow: "Membership management",
          title: "Memberships",
          description: "Plans",
          createPlan: "Create membership",
          managePermissionRequired: "Permission required",
          "tabs.label": "Membership sections",
          "tabs.plans": "Plans",
          "tabs.customers": "Customer memberships",
          loading: "Loading",
          loadError: "Load error",
          "empty.title": "No plans",
          "empty.description": "Create the first plan",
          unnamedPlan: "Unnamed plan",
          "billing.monthly": "Monthly",
          "billing.yearly": "Yearly",
          "billing.fixed": "Fixed",
          "statuses.draft": "Draft",
          "statuses.published": "Published",
          "statuses.archived": "Archived",
          allLocations: "All locations",
          trackingNotice: "Tracked automatically",
          "actions.edit": "Edit",
          "actions.publish": "Publish",
          "actions.duplicate": "Duplicate",
          "actions.archive": "Archive",
          archiveConfirm: `Archive ${values.name || ""}`,
          "archiveDialog.title": "Archive membership plan?",
          "archiveDialog.confirm": "Archive plan",
          "archiveDialog.cancel": "Keep plan",
          "notices.created": "Created",
          "notices.updated": "Updated",
          "notices.published": "Published",
          "notices.duplicated": "Duplicated",
          "notices.archived": "Archived",
          "notices.actionError": "Action failed",
        },
        "Memberships.common": {
          dismiss: "Dismiss",
          retry: "Retry",
        },
        "Memberships.benefits": {},
      };

      return labels[namespace]?.[key] || key;
    },
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: { locations: [] } }),
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetAllMembershipPlansQuery: () => ({
    data: { plans: state.plans },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateMembershipPlanMutation: () => [api.create, { isLoading: false }],
  useUpdateMembershipPlanMutation: () => [api.update, { isLoading: false }],
  usePublishMembershipPlanMutation: () => [api.publish, { isLoading: false }],
  useArchiveMembershipPlanMutation: () => [api.archive, { isLoading: false }],
  useDuplicateMembershipPlanMutation: () => [
    api.duplicate,
    { isLoading: false },
  ],
}));

vi.mock("@/components/memberships/PlanEditorDialog", () => ({
  default: ({ plan: editingPlan, onClose, onSave, languageSettings }) => {
    state.editorLanguageSettings = languageSettings;
    return (
      <div role="dialog" aria-label={editingPlan ? "Edit plan" : "Create plan"}>
        <button type="button" onClick={() => onSave(planPayload)}>
          Save plan
        </button>
        <button type="button" onClick={onClose}>
          Close editor
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/memberships/MembershipCustomersPanel", () => ({
  default: () => <div>Customer manager</div>,
}));

vi.mock("@/components/modals/ConformationModal", () => ({
  default: ({ open, title, text, confirmText, onConfirm }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{text}</p>
        <button type="button" onClick={onConfirm}>
          {confirmText}
        </button>
      </div>
    ) : null,
}));

const mutationResult = () => ({
  unwrap: () => Promise.resolve({ plan }),
});

describe("MembershipPlansPage management lifecycle", () => {
  beforeEach(() => {
    state.access = { roleKey: "owner", status: "active", permissions: [] };
    state.plans = [plan];
    state.editorLanguageSettings = null;
    for (const mutation of Object.values(api)) {
      mutation.mockReset();
      mutation.mockImplementation(mutationResult);
    }
  });

  it("creates and edits plans through the dedicated plan editor", async () => {
    render(<MembershipPlansPage />);

    fireEvent.click(screen.getByRole("button", { name: "Create membership" }));
    expect(screen.getByRole("dialog", { name: "Create plan" })).toBeVisible();
    expect(state.editorLanguageSettings).toMatchObject(state.languageSettings);

    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));
    await waitFor(() => {
      expect(api.create).toHaveBeenCalledWith(planPayload);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Create plan" }),
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog", { name: "Edit plan" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save plan" }));

    await waitFor(() => {
      expect(api.update).toHaveBeenCalledWith({
        id: "plan-1",
        ...planPayload,
      });
    });
  });

  it("publishes, duplicates and archives a plan using its versioned lifecycle", async () => {
    render(<MembershipPlansPage />);

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(
      screen.getByRole("dialog", { name: "Archive membership plan?" }),
    ).toBeVisible();
    expect(screen.getByText("Archive Studio Member")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Archive plan" }));

    await waitFor(() => {
      expect(api.publish).toHaveBeenCalledWith("plan-1");
      expect(api.duplicate).toHaveBeenCalledWith({ id: "plan-1" });
      expect(api.archive).toHaveBeenCalledWith("plan-1");
    });
  });

  it("opens the plan editor from the unified catalog action", async () => {
    const onCreateOpenChange = vi.fn();
    const { rerender } = render(
      <MembershipPlansPage
        embedded
        createOpen={false}
        onCreateOpenChange={onCreateOpenChange}
        showPageHeader={false}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <MembershipPlansPage
        embedded
        createOpen
        onCreateOpenChange={onCreateOpenChange}
        showPageHeader={false}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Create plan" })).toBeVisible();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close editor" }));
    expect(onCreateOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps plan actions unavailable to view-only roles", () => {
    state.access = {
      roleKey: "custom",
      status: "active",
      permissions: ["memberships.view"],
    };

    render(<MembershipPlansPage />);

    expect(
      screen.getByRole("button", { name: "Create membership" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
  });

  it("only allows duplicating an archived plan", () => {
    state.plans = [
      {
        ...plan,
        status: "archived",
      },
    ];

    render(<MembershipPlansPage />);

    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Publish" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeVisible();
  });

  it("renders translated owner summaries and keeps the plan identity for actions", () => {
    state.plans = [
      {
        ...plan,
        draftVersion: {
          ...plan.draftVersion,
          name: "Členství",
          description: "Český popis",
          translations: {
            en: {
              name: "Translated membership",
              description: "English description",
            },
          },
          benefits: [
            {
              key: "materials",
              type: "boolean",
              enabled: true,
              label: "Materiály",
              translations: { en: { label: "Materials" } },
            },
          ],
        },
      },
    ];
    render(<MembershipPlansPage />);
    expect(
      screen.getByRole("heading", { name: "Translated membership" }),
    ).toBeVisible();
    expect(screen.getByText("English description")).toBeVisible();
    expect(screen.getByText("Materials")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByText("Archive Translated membership")).toBeVisible();
  });

  it("uses canonical benefit text in the stored source language", () => {
    state.plans = [
      {
        ...plan,
        draftVersion: {
          ...plan.draftVersion,
          sourceLanguage: "en",
          benefits: [
            {
              key: "materials",
              type: "boolean",
              enabled: true,
              label: "Current benefit text",
              translations: { en: { label: "Outdated benefit text" } },
            },
          ],
        },
      },
    ];
    render(<MembershipPlansPage />);
    expect(screen.getByText("Current benefit text")).toBeVisible();
    expect(screen.queryByText("Outdated benefit text")).not.toBeInTheDocument();
  });
});
