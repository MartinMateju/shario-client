import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/app/settings/payments",
  search: "",
  selectorState: {
    tenant: { _id: "tenant-a", modules: { ai: true } },
    workspaceAccess: {
      tenantId: "tenant-a",
      userId: "user-a",
      accessVersion: 1,
      permissions: ["ai.use"],
    },
    activeLocationId: "location-a",
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.selectorState),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => ({
    available: true,
    capabilities: {},
  }),
}));

vi.mock("@/lib/features/ai/aiApi.utils", () => ({
  aiAccessCacheScope: ({ tenant, access }) =>
    [
      tenant?._id || "none",
      access?.userId || "none",
      access?.accessVersion ?? 0,
    ].join("|"),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: (state) => state.workspaceAccess,
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.activeLocationId,
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ open, children }) => (open ? <div>{children}</div> : null),
  DialogBackdrop: () => <div />,
  DialogPanel: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
}));

vi.mock("@heroicons/react/24/outline", () => ({
  SparklesIcon: () => <svg />,
  XMarkIcon: () => <svg />,
}));

vi.mock("@/components/ai/StudioAssistantConversation", () => ({
  default: ({ assistantContext }) => (
    <div
      data-testid="assistant-context"
      data-route={assistantContext?.route || ""}
      data-entity-kind={assistantContext?.entity?.kind || ""}
      data-entity-id={assistantContext?.entity?.id || ""}
    >
      {assistantContext?.surface || "general"}
    </div>
  ),
}));

vi.mock("@/components/setup-center/SetupAssistantFallback", () => ({
  default: () => <div>Setup fallback</div>,
}));

import AiWorkspaceProvider, {
  useAiWorkspace,
} from "@/components/ai/AiWorkspaceProvider";

function ProviderControls() {
  const workspace = useAiWorkspace();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          workspace.openSetupAssistant({
            context: {
              surface: "setup_center",
              route: mocks.pathname,
              setupStepId: "payments",
            },
          })
        }
      >
        Open setup
      </button>
      <button type="button" onClick={() => workspace.openAssistant()}>
        Open general
      </button>
      <button type="button" onClick={() => workspace.closeAssistant()}>
        Close
      </button>
    </>
  );
}

const renderProvider = () =>
  render(
    <AiWorkspaceProvider>
      <ProviderControls />
    </AiWorkspaceProvider>,
  );

describe("AiWorkspaceProvider contextual request lifecycle", () => {
  beforeEach(() => {
    mocks.pathname = "/app/settings/payments";
    mocks.search = "";
    mocks.selectorState = {
      tenant: { _id: "tenant-a", modules: { ai: true } },
      workspaceAccess: {
        tenantId: "tenant-a",
        userId: "user-a",
        accessVersion: 1,
        permissions: ["ai.use"],
      },
      activeLocationId: "location-a",
    };
  });

  it("clears setup context before opening a route-aware command assistant", () => {
    renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Open setup" }));
    expect(screen.getByTestId("assistant-context")).toHaveTextContent(
      "setup_center",
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("assistant-context")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open general" }));
    expect(screen.getByTestId("assistant-context")).toHaveTextContent(
      "command_center",
    );
    expect(screen.getByTestId("assistant-context")).toHaveAttribute(
      "data-route",
      "/app/settings/payments",
    );
  });

  it("opens with an opaque booking context and closes when that entity changes", async () => {
    mocks.pathname = "/app/bookings";
    mocks.search = "bookingId=507f1f77bcf86cd799439011&name=Do+not+send+me";
    const view = renderProvider();

    fireEvent.click(screen.getByRole("button", { name: "Open general" }));
    expect(screen.getByTestId("assistant-context")).toHaveTextContent(
      "workspace",
    );
    expect(screen.getByTestId("assistant-context")).toHaveAttribute(
      "data-route",
      "/app/bookings",
    );
    expect(screen.getByTestId("assistant-context")).toHaveAttribute(
      "data-entity-kind",
      "booking",
    );
    expect(screen.getByTestId("assistant-context")).toHaveAttribute(
      "data-entity-id",
      "507f1f77bcf86cd799439011",
    );
    expect(screen.getByTestId("assistant-context").outerHTML).not.toContain(
      "Do not send me",
    );

    mocks.search = "bookingId=507f191e810c19729de860ea";
    view.rerender(
      <AiWorkspaceProvider>
        <ProviderControls />
      </AiWorkspaceProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByTestId("assistant-context")).toBeNull(),
    );
  });

  it("closes and clears a contextual request when the route changes", async () => {
    const view = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Open setup" }));
    expect(screen.getByTestId("assistant-context")).toBeVisible();

    mocks.pathname = "/app/ai";
    view.rerender(
      <AiWorkspaceProvider>
        <ProviderControls />
      </AiWorkspaceProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByTestId("assistant-context")).toBeNull(),
    );
  });

  it("closes and clears a contextual request when workspace access changes", async () => {
    const view = renderProvider();
    fireEvent.click(screen.getByRole("button", { name: "Open setup" }));

    mocks.selectorState = {
      tenant: { _id: "tenant-b", modules: { ai: true } },
      workspaceAccess: {
        tenantId: "tenant-b",
        userId: "user-b",
        accessVersion: 2,
        permissions: ["ai.use"],
      },
      activeLocationId: "location-b",
    };
    view.rerender(
      <AiWorkspaceProvider>
        <ProviderControls />
      </AiWorkspaceProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByTestId("assistant-context")).toBeNull(),
    );
  });
});
