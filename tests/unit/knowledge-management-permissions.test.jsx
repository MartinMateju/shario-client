import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  workspaceAccess: {
    role: "staff",
    status: "active",
    effectivePermissions: ["knowledge.view"],
  },
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => {
    const messages = {
      "actions.addResource": "Add resource",
      "management.deleted": "Deleted",
      "management.title": "Knowledge Hub",
      "management.description": "Manage knowledge",
      "management.metrics.total": "Resources",
      "management.metrics.published": "Published",
      "management.metrics.featured": "Featured",
      "management.metrics.ai": "AI sources",
      "filters.search": "Search",
      "filters.searchPlaceholder": "Search knowledge",
      "filters.category": "Category",
      "filters.type": "Type",
      "filters.status": "Status",
      "filters.allCategories": "All categories",
      "filters.allTypes": "All types",
      "filters.allStatuses": "All statuses",
      "states.emptyManagementTitle": "No resources",
      "states.emptyManagementDescription": "Add one",
    };
    return messages[key] || key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => ({ canUseAssistant: true }),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        workspaceAccess: mocks.workspaceAccess,
      },
    }),
}));

vi.mock("@/lib/features/knowledge/knowledgeApiSlice", () => ({
  useGetKnowledgeResourcesQuery: () => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useDeleteKnowledgeResourceMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
  useCreateKnowledgeResourceMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
  useUpdateKnowledgeResourceMutation: () => [
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ],
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: { locations: [] } }),
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetMembershipPlansQuery: () => ({ data: { plans: [] } }),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetCourseProductsQuery: () => ({ data: [] }),
}));

import KnowledgeManagementPage from "@/components/knowledge/KnowledgeManagementPage";

describe("KnowledgeManagementPage permissions", () => {
  beforeEach(() => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["knowledge.view"],
    };
  });

  it("keeps the hub readable without exposing mutation actions", () => {
    render(<KnowledgeManagementPage showPageHeader={false} />);

    expect(screen.queryByRole("button", { name: "Add resource" })).toBeNull();
  });

  it("shows creation to a knowledge manager", () => {
    mocks.workspaceAccess = {
      role: "staff",
      status: "active",
      effectivePermissions: ["knowledge.view", "knowledge.manage"],
    };

    render(<KnowledgeManagementPage showPageHeader={false} />);

    expect(
      screen.getAllByRole("button", { name: "Add resource" }).length,
    ).toBeGreaterThan(0);
  });
});
