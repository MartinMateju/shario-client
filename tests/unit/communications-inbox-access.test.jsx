import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommunicationsWorkspace from "@/components/communications/CommunicationsWorkspace";
import messages from "@/messages/en.json";

const state = vi.hoisted(() => ({
  tenant: null,
  access: null,
  params: null,
  replace: vi.fn(),
  overview: vi.fn(),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => state.tenant,
  selectCurrentWorkspaceAccess: () => state.access,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => state.params }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock(
  "@/lib/features/communicationEmailSetup/communicationEmailSetupApiSlice",
  () => ({ useGetCommunicationEmailSetupQuery: () => ({ data: null }) }),
);
vi.mock("@/lib/features/communications/communicationsApiSlice", () => ({
  useGetCommunicationsOverviewQuery: (...args) => {
    state.overview(...args);
    return { currentData: { staff: [{ id: "staff-a" }] } };
  },
}));
vi.mock("@/components/communications/email/EmailReadinessCard", () => ({
  default: () => <div>Email readiness</div>,
}));
vi.mock("@/components/communications/email/EmailSetupView", () => ({
  default: () => <div>Email setup form</div>,
}));
vi.mock(
  "@/components/views/automated_communications/AutomatedCommunicationsPage",
  () => ({ default: ({ view }) => <div>Outbound {view}</div> }),
);
const show = () =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CommunicationsWorkspace />
    </NextIntlClientProvider>,
  );

describe("communications navigation after Inbox retirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.tenant = {
      id: "tenant-a",
      plan: "professional",
      planVersion: 3,
      modules: { communications: true, automations: true },
      capabilities: { communications: { unifiedInbox: true } },
    };
    state.access = { roleKey: "owner", status: "active" };
    state.params = new URLSearchParams();
  });

  it.each([1, 3])(
    "keeps History as the default without Inbox for an entitled professional plan version %s",
    (planVersion) => {
      state.tenant.planVersion = planVersion;
      show();
      expect(screen.getByText("Outbound history")).toBeVisible();
      expect(screen.queryByRole("tab", { name: /Inbox/ })).toBeNull();
      expect(screen.getAllByRole("tab")).toHaveLength(4);
      expect(state.overview).not.toHaveBeenCalled();
      expect(state.replace).not.toHaveBeenCalled();
    },
  );

  it("redirects an old Inbox link to History while preserving location and source", () => {
    state.params = new URLSearchParams(
      "section=inbox&location=grohova&source=briefing",
    );
    show();
    expect(screen.getByText("Outbound history")).toBeVisible();
    expect(screen.getByText("Email readiness")).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Inbox/ })).toBeNull();
    expect(state.overview).not.toHaveBeenCalled();
    expect(state.replace).toHaveBeenLastCalledWith(
      "/app/communications?section=history&location=grohova&source=briefing",
      { scroll: false },
    );
  });

  it("keeps Starter outbound history and setup while denying direct Inbox navigation", () => {
    state.tenant.plan = "starter";
    state.tenant.modules.automations = false;
    state.tenant.capabilities.communications.unifiedInbox = false;
    state.params = new URLSearchParams("section=inbox");
    show();
    expect(screen.queryByRole("tab", { name: /Inbox/ })).toBeNull();
    expect(screen.getByText("Outbound history")).toBeVisible();
    expect(screen.getByRole("tab", { name: /Email setup/ })).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Automations/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Templates/ })).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(state.overview).not.toHaveBeenCalled();
    expect(state.replace).toHaveBeenLastCalledWith(
      "/app/communications?section=history",
      { scroll: false },
    );
  });

  it("redirects settings-only staff from an old Inbox link to Email setup", () => {
    state.access = {
      role: "custom",
      status: "active",
      permissions: ["communications.settings.manage"],
    };
    state.params = new URLSearchParams("section=inbox");
    show();
    expect(screen.queryByRole("tab", { name: /Inbox/ })).toBeNull();
    expect(screen.getByText("Email setup form")).toBeVisible();
    expect(screen.queryByText("Outbound history")).toBeNull();
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(state.overview).not.toHaveBeenCalled();
    expect(state.replace).toHaveBeenLastCalledWith(
      "/app/communications?section=setup",
      { scroll: false },
    );
  });

  it.each([
    ["Automations", "automations"],
    ["Templates", "templates"],
    ["Email setup", "setup"],
  ])("keeps the %s tab available", (label, section) => {
    state.params = new URLSearchParams("location=grohova");
    show();
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(label) }));
    expect(state.replace).toHaveBeenLastCalledWith(
      `/app/communications?location=grohova&section=${section}`,
      { scroll: false },
    );
  });
});
