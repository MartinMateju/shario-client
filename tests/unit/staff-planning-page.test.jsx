import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const locationId = "64b000000000000000000011";
const secondLocationId = "64b000000000000000000012";
const userId = "64b000000000000000000021";

const resolvedMutation = () => ({
  unwrap: () => Promise.resolve({}),
});

const mocks = vi.hoisted(() => ({
  permissions: [
    "planning.submit",
    "planning.team.view",
    "planning.manage",
    "tasks.view",
    "tasks.manage",
  ],
  moduleEnabled: true,
  locationMode: "selected",
  aiAvailable: false,
  locations: [
    {
      _id: "64b000000000000000000011",
      name: "Grohova",
      isActive: true,
    },
  ],
  overviewCalls: [],
  saveDaily: vi.fn(() => resolvedMutation()),
  saveWeekly: vi.fn(() => resolvedMutation()),
  saveMonthly: vi.fn(() => resolvedMutation()),
  saveSettings: vi.fn(() => resolvedMutation()),
  saveSchedule: vi.fn(() => resolvedMutation()),
  createTask: vi.fn(() => resolvedMutation()),
  draftDaily: vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        focusToday: "Unload the bisque kiln",
        focusTaskIds: ["task-1"],
        completedTaskIds: ["task-2"],
        blockerTaskIds: ["task-1"],
      }),
  })),
  overview: null,
}));

const translate = (key, values = {}) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    key,
  );

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => translate,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: {
          modules: { staff_tasks: mocks.moduleEnabled, ai: false },
          settings: { timezone: "Europe/Prague" },
        },
        userInfo: { id: userId },
        workspaceAccess: {
          role: "custom",
          status: "active",
          effectivePermissions: mocks.permissions,
          locationAccess: {
            mode: mocks.locationMode,
            locationIds:
              mocks.locationMode === "selected"
                ? mocks.locations.map((location) => location._id)
                : [],
          },
        },
      },
      studioContext: { activeStudioId: locationId },
    }),
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => ({
    available: mocks.aiAvailable,
    isLoading: false,
    moduleEnabled: false,
  }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: { locations: mocks.locations },
    isLoading: false,
  }),
}));

vi.mock("@/lib/features/staffPlanning/staffPlanningApiSlice", () => ({
  useGetStaffPlanningOverviewQuery: (args, options) => {
    mocks.overviewCalls.push({ args, options });
    return {
      data: mocks.overview,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useSaveStaffDailyUpdateMutation: () => [
    mocks.saveDaily,
    { isLoading: false },
  ],
  useSaveStaffWeeklyPlanMutation: () => [
    mocks.saveWeekly,
    { isLoading: false },
  ],
  useSaveStaffMonthlyPrioritiesMutation: () => [
    mocks.saveMonthly,
    { isLoading: false },
  ],
  useUpdateStaffPlanningAttentionMutation: () => [
    vi.fn(() => resolvedMutation()),
    { isLoading: false },
  ],
  useUpdateStaffPlanningMemberScheduleMutation: () => [
    mocks.saveSchedule,
    { isLoading: false },
  ],
  useUpdateStaffPlanningSettingsMutation: () => [
    mocks.saveSettings,
    { isLoading: false },
  ],
  useGenerateStaffPlanningDailyDraftMutation: () => [
    mocks.draftDaily,
    { isLoading: false },
  ],
  useGenerateStaffPlanningBriefingMutation: () => [
    vi.fn(() => resolvedMutation()),
    { isLoading: false },
  ],
}));

vi.mock("@/lib/features/staffTasks/staffTasksApiSlice", () => ({
  useGetStaffTasksQuery: () => ({
    data: { tasks: [], total: 0, page: 1, pages: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreateStaffTaskMutation: () => [mocks.createTask, { isLoading: false }],
  useUpdateStaffTaskMutation: () => [
    vi.fn(() => resolvedMutation()),
    { isLoading: false },
  ],
  useDeleteStaffTaskMutation: () => [
    vi.fn(() => resolvedMutation()),
    { isLoading: false },
  ],
}));

import StaffTasksPage from "@/components/views/staff_tasks/StaffTasksPage";

const createOverview = () => ({
  metadata: {
    date: "2026-07-28",
    generatedAt: "2026-07-28T08:00:00.000Z",
    week: { from: "2026-07-27", to: "2026-08-02" },
    month: { key: "2026-07", from: "2026-07-01", to: "2026-07-31" },
  },
  permissions: {
    canSubmit: true,
    canViewTeam: true,
    canManage: true,
    canManageGlobalSettings: true,
  },
  settings: { expectedUpdateTime: "09:00" },
  today: {
    myUpdate: null,
    staff: [
      {
        memberId: "64b000000000000000000031",
        userId,
        displayName: "Martin",
        canManageSchedule: true,
        expectedWeekdays: [1, 2, 3, 4, 5],
        isExpectedToday: true,
        state: "waiting",
      },
    ],
    counts: {
      submitted: 0,
      waiting: 1,
      missing: 0,
      blocked: 0,
      needsOwnerAttention: 0,
      notWorking: 0,
    },
  },
  week: { plans: [] },
  month: { prioritySets: [] },
  board: { tasks: [] },
});

describe("Staff Planning page", () => {
  beforeEach(() => {
    mocks.permissions = [
      "planning.submit",
      "planning.team.view",
      "planning.manage",
      "tasks.view",
      "tasks.manage",
    ];
    mocks.moduleEnabled = true;
    mocks.locationMode = "selected";
    mocks.aiAvailable = false;
    mocks.locations = [{ _id: locationId, name: "Grohova", isActive: true }];
    mocks.overview = createOverview();
    mocks.overviewCalls.length = 0;
    mocks.saveDaily.mockClear();
    mocks.saveWeekly.mockClear();
    mocks.saveMonthly.mockClear();
    mocks.saveSettings.mockClear();
    mocks.saveSchedule.mockClear();
    mocks.createTask.mockClear();
    mocks.draftDaily.mockClear();
  });

  it("shows the four MVP views and limits weekly outcomes to three", () => {
    render(<StaffTasksPage />);

    expect(screen.getByRole("tab", { name: "tabs.today" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "tabs.board" })).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "tabs.week" }));
    const add = screen.getByRole("button", {
      name: "week.form.add",
    });

    fireEvent.click(add);
    fireEvent.click(add);

    expect(
      screen.getAllByPlaceholderText("week.form.outcomePlaceholder"),
    ).toHaveLength(3);
    expect(add).toBeDisabled();
  });

  it("submits an explicit not-working payload without UI-only fields", async () => {
    render(<StaffTasksPage />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "today.form.needsAttention" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "today.form.notWorking" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "today.form.submit" }));

    await waitFor(() => expect(mocks.saveDaily).toHaveBeenCalledTimes(1));
    const payload = mocks.saveDaily.mock.calls[0][0];

    expect(payload).toMatchObject({
      notWorkingToday: true,
      needsOwnerAttention: false,
      focusToday: "",
      completedSinceLast: "",
      blockers: "",
      linkedTaskIds: [],
      locationId,
    });
    expect(payload).not.toHaveProperty("submissionLocationId");
  });

  it("preserves the existing Board for task-only users without calling planning", () => {
    mocks.permissions = ["tasks.view"];

    render(<StaffTasksPage />);

    expect(
      screen.queryByRole("tab", { name: "tabs.today" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "tabs.board" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(mocks.overviewCalls.at(-1)?.options).toMatchObject({ skip: true });
  });

  it("creates a board task with only its required title", async () => {
    mocks.locationMode = "all";
    render(<StaffTasksPage />);

    fireEvent.change(screen.getByLabelText("filters.location"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "tabs.board" }));
    fireEvent.click(screen.getByRole("button", { name: "board.form.add" }));
    fireEvent.change(
      screen.getByPlaceholderText("board.form.titlePlaceholder"),
      {
        target: { value: "Unload kiln" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "board.form.save" }));

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledTimes(1));
    expect(mocks.createTask).toHaveBeenCalledWith({ title: "Unload kiln" });
  });

  it("scopes an all-location owner's quick task to the selected location", async () => {
    mocks.locationMode = "all";
    render(<StaffTasksPage />);

    fireEvent.change(screen.getByLabelText("filters.location"), {
      target: { value: locationId },
    });
    fireEvent.click(screen.getByRole("tab", { name: "tabs.board" }));
    fireEvent.click(screen.getByRole("button", { name: "board.form.add" }));
    fireEvent.change(
      screen.getByPlaceholderText("board.form.titlePlaceholder"),
      {
        target: { value: "Check Grohova kiln" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "board.form.save" }));

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledTimes(1));
    expect(mocks.createTask).toHaveBeenCalledWith({
      title: "Check Grohova kiln",
      locationId,
    });
  });

  it("automatically scopes a quick task for a location-limited manager", async () => {
    render(<StaffTasksPage />);

    fireEvent.click(screen.getByRole("tab", { name: "tabs.board" }));
    fireEvent.click(screen.getByRole("button", { name: "board.form.add" }));
    fireEvent.change(
      screen.getByPlaceholderText("board.form.titlePlaceholder"),
      {
        target: { value: "Count glazes" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "board.form.save" }));

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledTimes(1));
    expect(mocks.createTask).toHaveBeenCalledWith({
      title: "Count glazes",
      locationId,
    });
  });

  it("keeps the AI daily draft advisory and links only returned visible tasks", async () => {
    mocks.aiAvailable = true;
    mocks.overview = {
      ...createOverview(),
      board: {
        tasks: [
          { id: "task-1", title: "Unload kiln", status: "todo" },
          { id: "task-2", title: "Stocktake", status: "todo" },
        ],
      },
    };

    render(<StaffTasksPage />);
    fireEvent.click(screen.getByRole("button", { name: "today.form.aiDraft" }));

    await waitFor(() =>
      expect(
        screen.getByPlaceholderText("today.form.focusPlaceholder"),
      ).toHaveValue("Unload the bisque kiln"),
    );
    expect(screen.getByRole("checkbox", { name: "Unload kiln" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Stocktake" })).toBeChecked();
    expect(mocks.draftDaily).toHaveBeenCalledWith(
      expect.objectContaining({ locationId }),
    );
    expect(mocks.saveDaily).not.toHaveBeenCalled();
  });

  it("scopes daily task links and AI drafting to the form location", async () => {
    mocks.locationMode = "all";
    mocks.locations = [
      { _id: locationId, name: "Grohova", isActive: true },
      { _id: secondLocationId, name: "Vinohrady", isActive: true },
    ];
    mocks.aiAvailable = true;
    mocks.overview = {
      ...createOverview(),
      board: {
        tasks: [
          {
            id: "task-1",
            title: "Grohova kiln",
            status: "todo",
            locationId,
          },
          {
            id: "task-2",
            title: "Vinohrady stocktake",
            status: "todo",
            locationId: secondLocationId,
          },
          {
            id: "task-global",
            title: "Studio handbook",
            status: "todo",
            appliesToAllLocations: true,
          },
          {
            id: "task-unscoped",
            title: "General admin",
            status: "todo",
          },
        ],
      },
    };

    render(<StaffTasksPage />);
    fireEvent.change(screen.getByLabelText("filters.location"), {
      target: { value: "" },
    });

    expect(
      screen.getByRole("checkbox", { name: "Grohova kiln" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: "Vinohrady stocktake" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Grohova kiln" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Studio handbook" }));

    fireEvent.change(screen.getByLabelText("today.form.updateLocation"), {
      target: { value: secondLocationId },
    });

    expect(
      screen.queryByRole("checkbox", { name: "Grohova kiln" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Vinohrady stocktake" }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Studio handbook" }),
    ).toBeChecked();

    fireEvent.change(
      screen.getByPlaceholderText("today.form.focusPlaceholder"),
      { target: { value: "Prepare Vinohrady" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "today.form.submit" }));
    await waitFor(() => expect(mocks.saveDaily).toHaveBeenCalledTimes(1));
    expect(mocks.saveDaily).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: secondLocationId,
        linkedTaskIds: ["task-global"],
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "today.form.aiDraft" }));
    await waitFor(() =>
      expect(mocks.draftDaily).toHaveBeenCalledWith(
        expect.objectContaining({ locationId: secondLocationId }),
      ),
    );
  });

  it("drops weekly task links that do not match a changed plan location", async () => {
    mocks.locationMode = "all";
    mocks.locations = [
      { _id: locationId, name: "Grohova", isActive: true },
      { _id: secondLocationId, name: "Vinohrady", isActive: true },
    ];
    mocks.overview = {
      ...createOverview(),
      board: {
        tasks: [
          {
            id: "task-local",
            title: "Grohova clay",
            status: "todo",
            locationId,
          },
          {
            id: "task-other",
            title: "Vinohrady clay",
            status: "todo",
            locationId: secondLocationId,
          },
          {
            id: "task-global",
            title: "Order aprons",
            status: "todo",
            appliesToAllLocations: true,
          },
        ],
      },
    };

    render(<StaffTasksPage />);
    fireEvent.change(screen.getByLabelText("filters.location"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "tabs.week" }));
    fireEvent.change(
      screen.getByPlaceholderText("week.form.outcomePlaceholder"),
      { target: { value: "Prepare the week" } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Grohova clay" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Order aprons" }));

    fireEvent.change(screen.getByLabelText("week.form.planLocation"), {
      target: { value: secondLocationId },
    });

    expect(
      screen.queryByRole("checkbox", { name: "Grohova clay" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Vinohrady clay" }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Order aprons" }),
    ).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "week.form.save" }));
    await waitFor(() => expect(mocks.saveWeekly).toHaveBeenCalledTimes(1));
    expect(mocks.saveWeekly).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: secondLocationId,
        outcomes: [expect.objectContaining({ linkedTaskIds: ["task-global"] })],
      }),
    );
  });

  it("hides task-backed AI drafting and the Board without tasks.view", () => {
    mocks.permissions = ["planning.submit"];
    mocks.aiAvailable = true;
    mocks.overview = {
      ...createOverview(),
      permissions: {
        canSubmit: true,
        canViewTeam: false,
        canManage: false,
      },
    };

    render(<StaffTasksPage />);

    expect(
      screen.queryByRole("button", { name: "today.form.aiDraft" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "tabs.board" }),
    ).not.toBeInTheDocument();
  });

  it("omits hidden task links while preserving weekly and monthly item ids", async () => {
    mocks.permissions = ["planning.submit", "planning.manage"];
    mocks.overview = {
      ...createOverview(),
      permissions: {
        canSubmit: true,
        canViewTeam: false,
        canManage: true,
        canManageGlobalSettings: true,
      },
      week: {
        myPlan: {
          id: "plan-1",
          userId,
          locationId,
          outcomes: [
            {
              id: "outcome-1",
              title: "Keep the hidden task link",
              linkedTaskIds: ["task-hidden"],
            },
          ],
        },
        plans: [],
      },
      month: {
        prioritySets: [
          {
            id: "set-1",
            locationId,
            priorities: [
              {
                id: "priority-1",
                title: "Preserve hidden priority links",
                linkedTaskIds: ["task-hidden"],
              },
            ],
          },
        ],
      },
    };

    render(<StaffTasksPage />);
    fireEvent.change(
      screen.getByPlaceholderText("today.form.focusPlaceholder"),
      { target: { value: "Open the studio" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "today.form.submit" }));
    await waitFor(() => expect(mocks.saveDaily).toHaveBeenCalledTimes(1));
    expect(mocks.saveDaily.mock.calls[0][0]).not.toHaveProperty(
      "linkedTaskIds",
    );

    fireEvent.click(screen.getByRole("tab", { name: "tabs.week" }));
    fireEvent.click(screen.getByRole("button", { name: "week.form.save" }));
    await waitFor(() => expect(mocks.saveWeekly).toHaveBeenCalledTimes(1));
    expect(mocks.saveWeekly.mock.calls[0][0].outcomes[0]).toMatchObject({
      id: "outcome-1",
      title: "Keep the hidden task link",
    });
    expect(mocks.saveWeekly.mock.calls[0][0].outcomes[0]).not.toHaveProperty(
      "linkedTaskIds",
    );

    fireEvent.click(screen.getByRole("tab", { name: "tabs.month" }));
    fireEvent.click(screen.getByRole("button", { name: "month.form.save" }));
    await waitFor(() => expect(mocks.saveMonthly).toHaveBeenCalledTimes(1));
    expect(mocks.saveMonthly.mock.calls[0][0].priorities[0]).toMatchObject({
      id: "priority-1",
      title: "Preserve hidden priority links",
    });
    expect(mocks.saveMonthly.mock.calls[0][0].priorities[0]).not.toHaveProperty(
      "linkedTaskIds",
    );
    expect(screen.queryByText("common.linkedTasks")).not.toBeInTheDocument();
  });

  it("limits planning settings to the manager's authorized scope", async () => {
    mocks.overview = {
      ...createOverview(),
      permissions: {
        canSubmit: true,
        canViewTeam: true,
        canManage: true,
        canManageGlobalSettings: false,
      },
      today: {
        ...createOverview().today,
        staff: [
          {
            memberId: "member-manageable",
            userId,
            displayName: "Martin",
            canManageSchedule: true,
            expectedWeekdays: [1, 2, 3, 4, 5],
            isExpectedToday: true,
            state: "waiting",
          },
          {
            memberId: "member-outside-scope",
            userId: "64b000000000000000000099",
            displayName: "Petra",
            canManageSchedule: false,
            expectedWeekdays: [1, 3, 5],
            isExpectedToday: true,
            state: "waiting",
          },
        ],
      },
    };

    render(<StaffTasksPage />);
    fireEvent.click(screen.getByRole("button", { name: "actions.settings" }));

    expect(
      screen.queryByLabelText("settings.expectedUpdateTime"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("settings.globalSettingsOutsideScope"),
    ).toBeVisible();
    expect(screen.getByText("settings.scheduleOutsideScope")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "settings.saveDays" }),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "settings.saveDays" }));
    await waitFor(() => expect(mocks.saveSchedule).toHaveBeenCalledTimes(1));
    expect(mocks.saveSchedule).toHaveBeenCalledWith({
      memberId: "member-manageable",
      expectedWeekdays: [1, 2, 3, 4, 5],
    });
    expect(mocks.saveSettings).not.toHaveBeenCalled();
  });

  it("renders studio-wide and local monthly priorities without merging saves", async () => {
    mocks.overview = {
      ...createOverview(),
      month: {
        prioritySets: [
          {
            id: "set-global",
            locationId: null,
            priorities: [
              { id: "priority-global", title: "Publish studio handbook" },
            ],
          },
          {
            id: "set-local",
            locationId,
            priorities: [
              { id: "priority-local", title: "Service kiln elements" },
            ],
          },
        ],
      },
    };

    render(<StaffTasksPage />);
    fireEvent.click(screen.getByRole("tab", { name: "tabs.month" }));

    expect(screen.getByText("Publish studio handbook")).toBeVisible();
    const localPriority = screen.getByPlaceholderText(
      "month.form.priorityPlaceholder",
    );
    expect(localPriority).toHaveValue("Service kiln elements");
    fireEvent.change(localPriority, {
      target: { value: "Replace kiln elements" },
    });
    fireEvent.click(screen.getByRole("button", { name: "month.form.save" }));

    await waitFor(() => expect(mocks.saveMonthly).toHaveBeenCalledTimes(1));
    expect(mocks.saveMonthly.mock.calls[0][0]).toMatchObject({
      month: "2026-07",
      locationId,
      priorities: [expect.objectContaining({ title: "Replace kiln elements" })],
    });
    expect(
      mocks.saveMonthly.mock.calls[0][0].priorities.map(
        (priority) => priority.title,
      ),
    ).not.toContain("Publish studio handbook");
  });

  it("shows an explicit unavailable state when the module is disabled", () => {
    mocks.moduleEnabled = false;

    render(<StaffTasksPage />);

    expect(screen.getByText("unavailable.title")).toBeVisible();
    expect(mocks.overviewCalls.at(-1)?.options).toMatchObject({ skip: true });
  });
});
