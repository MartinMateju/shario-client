import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiFeatureBoundary from "@/components/auth/AiFeatureBoundary";
import messages from "@/messages/en.json";

const state = vi.hoisted(() => ({
  tenant: null,
  access: null,
  query: null,
  getCapabilities: vi.fn(),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => state.tenant,
  selectCurrentWorkspaceAccess: () => state.access,
  selectIsAuthenticated: () => true,
}));
vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetAiCapabilitiesQuery: (...args) => {
    state.getCapabilities(...args);
    return state.query;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
const show = (feature = "assistant") =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AiFeatureBoundary feature={feature}>
        <p>AI content</p>
      </AiFeatureBoundary>
    </NextIntlClientProvider>,
  );

describe("AI plan and module explanations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.tenant = {
      id: "tenant",
      plan: "professional",
      planVersion: 3,
      modules: { ai: false },
      capabilities: { ai: { studioAssistant: "full", businessAdvisor: false } },
    };
    state.access = { roleKey: "owner", status: "active" };
    state.query = {
      data: { enabled: true, features: { assistant: true } },
      isLoading: false,
      isError: false,
    };
  });

  it("sends an entitled owner to modules when AI was disabled", () => {
    show();
    expect(screen.getByText("Shario AI is not enabled")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Review modules" }),
    ).toHaveAttribute("href", "/app/settings/modules");
    expect(screen.queryByRole("link", { name: "Review plan" })).toBeNull();
    expect(state.getCapabilities.mock.lastCall[1].skip).toBe(true);
  });

  it("shows a plan restriction for a granular feature excluded from an enabled AI module", () => {
    state.tenant.modules.ai = true;
    show("businessAdvisor");
    expect(screen.getByRole("link", { name: "Review plan" })).toHaveAttribute(
      "href",
      "/app/settings/billing",
    );
    expect(screen.queryByText("AI is temporarily unavailable")).toBeNull();
    expect(state.getCapabilities.mock.lastCall[1].skip).toBe(true);
  });

  it("keeps missing permission distinct and hides management links", () => {
    state.access = { role: "custom", status: "active", permissions: [] };
    show();
    expect(screen.getByText("AI access is restricted")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("does not expose module management to an AI user without that permission", () => {
    state.access = {
      role: "custom",
      status: "active",
      permissions: ["ai.use"],
    };
    show();
    expect(screen.getByText("Shario AI is not enabled")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("keeps a disabled runtime AI service separate from plan entitlement", () => {
    state.tenant.modules.ai = true;
    state.query.data.enabled = false;
    show();
    expect(screen.getByText("AI is temporarily unavailable")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Review plan" })).toBeNull();
  });
});
