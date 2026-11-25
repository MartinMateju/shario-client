import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key) => key }));
import CustomerShellStatus from "@/components/customer-shell/CustomerShellStatus";

describe("customer shell loading status", () => {
  it("does not publish a placeholder as the page's primary heading", () => {
    render(<CustomerShellStatus />);
    expect(screen.getByText("loadingTitle")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("loadingDescription");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("retains the primary heading and alert for an actual error page", () => {
    render(<CustomerShellStatus kind="error" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "errorTitle" }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("errorDescription");
  });
});
