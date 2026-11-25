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
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
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
const show = (props = {}) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <CommunicationsWorkspace {...props} />
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
    expect(screen.queryByText("Email setup form")).toBeNull();
    expect(screen.queryByText("Outbound history")).toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(state.overview).not.toHaveBeenCalled();
    expect(state.replace).toHaveBeenLastCalledWith(
      "/app/settings/communications",
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
      section === "setup"
        ? "/app/settings/communications?location=grohova"
        : `/app/communications?location=grohova&section=${section}`,
      { scroll: false },
    );
  });

  it("renders the existing email setup in the settings shell with contextual links", () => {
    state.params = new URLSearchParams("source=settings");
    show({ settingsOnly: true, showPageHeader: false });
    expect(screen.getByText("Email setup form")).toBeVisible();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
      "href",
      "/app/communications?source=settings&section=history",
    );
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("opens the Templates list from Automations without reopening a stale door editor", () => {
    state.params = new URLSearchParams(
      "section=automations&doorLocation=location-a&source=door-codes",
    );
    show();
    fireEvent.click(screen.getByRole("tab", { name: /Templates/ }));
    expect(state.replace).toHaveBeenLastCalledWith(
      "/app/communications?section=templates&source=door-codes",
      { scroll: false },
    );
  });

  it("keeps guided setup focused without a second navigation or redirect", () => {
    state.params = new URLSearchParams(
      "setupStep=communications&source=launch",
    );
    show({ settingsOnly: true });
    expect(screen.getByText("Email setup form")).toBeVisible();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("allows setup-only staff to use the canonical settings page without history access", () => {
    state.access = {
      role: "custom",
      status: "active",
      permissions: ["communications.settings.manage"],
    };
    show({ settingsOnly: true });
    expect(screen.getByText("Email setup form")).toBeVisible();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("does not render editable email settings for history-only staff", () => {
    state.access = {
      role: "custom",
      status: "active",
      permissions: ["communications.view"],
    };
    show({ settingsOnly: true });
    expect(screen.queryByText("Email setup form")).toBeNull();
  });
});
