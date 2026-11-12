import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queries: [],
  locale: "en",
  portalLocation: null,
  response: {},
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useSelector: () => "fallback-location",
}));

vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => mocks.portalLocation,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/knowledge/knowledgeApiSlice", () => ({
  useGetCustomerKnowledgeQuery: (params) => {
    mocks.queries.push(params);
    return {
      currentData: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      ...mocks.response,
    };
  },
}));

import CustomerKnowledgeHub from "@/components/knowledge/CustomerKnowledgeHub";

describe("CustomerKnowledgeHub query scope", () => {
  beforeEach(() => {
    mocks.queries.length = 0;
    mocks.locale = "en";
    mocks.portalLocation = null;
    mocks.response = {};
  });

  it("uses the location selected by the legacy portal", () => {
    render(<CustomerKnowledgeHub embedded locationId="portal-location" />);

    expect(mocks.queries.at(-1)).toEqual({
      language: "en",
      locationId: "portal-location",
    });
  });

  it("falls back to the shared studio context outside the portal provider", () => {
    render(<CustomerKnowledgeHub embedded />);

    expect(mocks.queries.at(-1)).toEqual({
      language: "en",
      locationId: "fallback-location",
    });
  });

  it("uses the customer's selected studio instead of a stale workspace selection", () => {
    mocks.portalLocation = { activeLocationId: "customer-studio" };
    render(<CustomerKnowledgeHub />);

    expect(mocks.queries.at(-1)).toEqual({
      language: "en",
      locationId: "customer-studio",
    });
  });

  it("does not borrow the workspace studio when the portal has no selection", () => {
    mocks.portalLocation = { activeLocationId: null };
    render(<CustomerKnowledgeHub />);

    expect(mocks.queries.at(-1)).toEqual({ language: "en" });
  });

  it("updates the API language and studio when the customer switches them", () => {
    mocks.portalLocation = { activeLocationId: "vaclavska-id" };
    const { rerender } = render(<CustomerKnowledgeHub />);
    mocks.locale = "cs";
    mocks.portalLocation = { activeLocationId: "grohova-id" };
    rerender(<CustomerKnowledgeHub />);

    expect(mocks.queries.at(-1)).toEqual({
      language: "cs",
      locationId: "grohova-id",
    });
  });

  it("clears an open guide and old-location content while the new studio is loading", async () => {
    const user = userEvent.setup();
    const previousArticles = [
      {
        id: "grohova-rules",
        title: "Grohova rules",
        content: "Grohova-specific pickup instructions",
        type: "guide",
        category: "studio_rules",
        tags: [],
      },
    ];
    mocks.portalLocation = { activeLocationId: "grohova-id" };
    mocks.response = { currentData: previousArticles, data: previousArticles };
    const { rerender } = render(<CustomerKnowledgeHub />);
    await user.click(screen.getByRole("button", { name: "card.openLabel" }));
    expect(
      within(screen.getByRole("dialog")).getByText(
        "Grohova-specific pickup instructions",
      ),
    ).toBeInTheDocument();

    mocks.portalLocation = { activeLocationId: "vaclavska-id" };
    mocks.response = {
      data: previousArticles,
      currentData: undefined,
      isFetching: true,
    };
    rerender(<CustomerKnowledgeHub />);

    expect(screen.queryByText("Grohova rules")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Grohova-specific pickup instructions"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("states.loading")).toBeInTheDocument();

    mocks.response = { currentData: [], data: [], isFetching: false };
    rerender(<CustomerKnowledgeHub />);
    expect(screen.getByText("states.emptyTitle")).toBeInTheDocument();
  });
});
