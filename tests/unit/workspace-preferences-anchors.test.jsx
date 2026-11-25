import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loading: true }));
vi.mock("next-intl", () => ({ useTranslations: () => (key) => key }));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector({ auth: { workspaceAccess: null } }),
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({ data: [], isLoading: mocks.loading }),
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetCurrentWorkspaceAccessQuery: () => ({
    data: { workspaceAccess: { membershipId: "me", preferences: {} } },
    isLoading: false,
  }),
  useUpdateWorkspacePreferencesMutation: () => [vi.fn(), { isLoading: false }],
}));

import WorkspacePreferencesPage from "@/components/views/settings/WorkspacePreferencesPage";

describe("personal preference anchor navigation", () => {
  beforeEach(() => {
    mocks.loading = true;
    window.history.replaceState(null, "", "/");
  });

  it.each(["workspace-preferences", "notification-preferences"])(
    "lands on %s after the form's asynchronous data loads",
    (id) => {
      window.history.replaceState(null, "", `/#${id}`);
      const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
      const view = render(<WorkspacePreferencesPage showPageHeader={false} />);
      expect(screen.getByText("loading")).toBeInTheDocument();
      expect(scroll).not.toHaveBeenCalled();

      mocks.loading = false;
      view.rerender(<WorkspacePreferencesPage showPageHeader={false} />);
      expect(scroll).toHaveBeenCalledOnce();
      expect(scroll.mock.instances[0]).toBe(document.getElementById(id));
      expect(scroll).toHaveBeenCalledWith({ block: "start" });

      view.rerender(<WorkspacePreferencesPage showPageHeader={false} />);
      expect(scroll).toHaveBeenCalledOnce();
    },
  );

  it.each(["", "#unrelated-anchor"])(
    "leaves the existing scroll position alone for %s",
    (hash) => {
      window.history.replaceState(null, "", `/${hash}`);
      const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
      mocks.loading = false;
      render(<WorkspacePreferencesPage showPageHeader={false} />);
      expect(scroll).not.toHaveBeenCalled();
    },
  );
});
