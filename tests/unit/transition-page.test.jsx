import { readFileSync } from "node:fs";
import path from "node:path";

import { render } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const transitionState = vi.hoisted(() => ({
  pathname: "/app",
  search: "",
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => transitionState.pathname,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(transitionState.search),
}));

import WorkspaceTemplate from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/template";
import TransitionPage from "@/components/transitions/TransitionPage";

const getSurface = (container) =>
  container.querySelector("[data-page-transition]");

describe("TransitionPage", () => {
  beforeEach(() => {
    transitionState.pathname = "/app";
    transitionState.search = "";
  });

  it("plays the shared skab page-entry motion for client-side navigations", () => {
    const { container } = render(
      <TransitionPage>
        <p>Workspace content</p>
      </TransitionPage>,
    );

    const surface = getSurface(container);

    expect(surface).toHaveAttribute("data-page-transition", "route");
    expect(surface).toHaveAttribute("data-page-transition-enter");
  });

  it("server-renders and hydrates pages without the entry motion", async () => {
    const page = (
      <TransitionPage>
        <p>Server content</p>
      </TransitionPage>
    );
    const container = document.createElement("div");
    const recoverableErrors = [];

    container.innerHTML = renderToString(page);
    document.body.appendChild(container);

    const serverSurface = getSurface(container);

    expect(serverSurface).toHaveAttribute("data-page-transition", "route");
    expect(serverSurface).not.toHaveAttribute("data-page-transition-enter");

    let root;

    await act(async () => {
      root = hydrateRoot(container, page, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(getSurface(container)).toBe(serverSurface);
    expect(serverSurface).not.toHaveAttribute("data-page-transition-enter");
    expect(recoverableErrors).toEqual([]);

    act(() => root.unmount());
    container.remove();
  });

  it("keeps the motion CSS-only and disables it for reduced motion", () => {
    const css = readFileSync(
      path.resolve(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );

    // A forwards/both fill keeps an identity transform on the surface, which
    // would trap position: fixed descendants after the motion ends.
    expect(css).toMatch(
      /\[data-page-transition-enter\]\s*\{\s*animation:\s*skab-page-enter 300ms cubic-bezier\(0\.22, 1, 0\.36, 1\) backwards;/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\[data-page-transition-enter\]\s*\{\s*animation:\s*none;/,
    );
  });

  it("wires the shared transition into the workspace template", () => {
    const { container, getByText } = render(
      <WorkspaceTemplate>
        <p>Workspace page</p>
      </WorkspaceTemplate>,
    );

    expect(getSurface(container)).toHaveAttribute(
      "data-page-transition",
      "workspace",
    );
    expect(getByText("Workspace page")).toBeInTheDocument();
  });

  it("restarts workspace motion for pathname changes, not same-route updates", () => {
    const page = () => (
      <WorkspaceTemplate>
        <p>Workspace page</p>
      </WorkspaceTemplate>
    );
    const { container, rerender } = render(page());
    const initialSurface = getSurface(container);

    initialSurface.dataset.instanceProbe = "initial";
    rerender(page());

    expect(getSurface(container)).toBe(initialSurface);
    expect(initialSurface).toHaveAttribute("data-instance-probe", "initial");

    transitionState.pathname = "/app/settings/billing";
    rerender(page());

    expect(getSurface(container)).not.toBe(initialSurface);
    expect(getSurface(container)).not.toHaveAttribute("data-instance-probe");
    expect(getSurface(container)).toHaveAttribute("data-page-transition-enter");
  });

  it("restarts for operations views while ignoring their inner tabs", () => {
    transitionState.pathname = "/app/operations";
    transitionState.search = "section=inventory";
    const page = () => (
      <WorkspaceTemplate>
        <p>Workspace page</p>
      </WorkspaceTemplate>
    );
    const { container, rerender } = render(page());
    const inventorySurface = getSurface(container);

    inventorySurface.dataset.instanceProbe = "inventory";
    transitionState.search = "section=inventory&tab=suppliers";
    rerender(page());

    expect(getSurface(container)).toBe(inventorySurface);

    transitionState.search = "section=tasks";
    rerender(page());

    expect(getSurface(container)).not.toBe(inventorySurface);
    expect(getSurface(container)).not.toHaveAttribute("data-instance-probe");
  });
});
