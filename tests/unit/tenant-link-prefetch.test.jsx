import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Link } from "@/i18n/navigation";
import { DisableLinkPrefetch } from "@/i18n/tenantLinks";
import CustomerTenantShell from "@/components/customer-shell/CustomerTenantShell";

vi.mock("@/components/public-tenant/PublicTenantChrome", () => ({
  default: ({ children }) => children,
}));

vi.mock("@/i18n/localizedRoutes", () => ({
  Link: ({ href, prefetch, children, onClick }) => (
    <a onClick={onClick} href={href} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

describe("localized tenant links", () => {
  it.each([
    ["public", "false"],
    ["portal", "true"],
    ["auth", "true"],
    ["transaction", "true"],
  ])(
    "keeps deliberate navigation available on the %s surface",
    (surface, prefetch) => {
      const navigate = vi.fn((event) => event.preventDefault());
      render(
        <CustomerTenantShell tenant={{ slug: "studio" }} surface={surface}>
          <Link href="/login?next=%2Fmemberships" prefetch onClick={navigate}>
            Open membership
          </Link>
        </CustomerTenantShell>,
      );
      const link = screen.getByRole("link", { name: "Open membership" });
      expect(link).toHaveAttribute("data-prefetch", prefetch);
      expect(link).toHaveAttribute("href", "/login?next=%2Fmemberships");
      fireEvent.click(link);
      expect(navigate).toHaveBeenCalledOnce();
    },
  );

  it("suppresses default and explicit prefetch inside the draft preview", () => {
    render(
      <>
        <Link href="/courses">Workspace link</Link>
        <DisableLinkPrefetch>
          <Link href="/courses">Preview catalogue</Link>
          <Link href="/courses/wheel" prefetch>
            Preview course
          </Link>
        </DisableLinkPrefetch>
        <Link href="/vouchers" prefetch>
          Prefetched workspace link
        </Link>
      </>,
    );
    expect(screen.getByText("Preview catalogue")).toHaveAttribute(
      "data-prefetch",
      "false",
    );
    expect(screen.getByText("Preview course")).toHaveAttribute(
      "data-prefetch",
      "false",
    );
    expect(screen.getByText("Workspace link")).toHaveAttribute(
      "data-prefetch",
      "undefined",
    );
    expect(screen.getByText("Prefetched workspace link")).toHaveAttribute(
      "data-prefetch",
      "true",
    );
  });
});
