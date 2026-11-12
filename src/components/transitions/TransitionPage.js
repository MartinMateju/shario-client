"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useHydrated } from "@/hooks/useHydrated";
import { usePathname } from "@/i18n/navigation";

function TransitionSurface({ children, scope }) {
  /*
   * Server-rendered pages must be visible at first paint, so the entry
   * motion (globals.css, [data-page-transition-enter]) only plays when the
   * surface mounts during a client-side navigation, never while hydrating.
   * useState keeps the value from the first render of this surface.
   */
  const hydrated = useHydrated();
  const [animateEntry] = useState(hydrated);

  return (
    <div
      data-page-transition={scope}
      data-page-transition-enter={animateEntry ? "" : undefined}
    >
      {children}
    </div>
  );
}

const getWorkspaceViewKey = (pathname, searchParams, scope) => {
  if (scope !== "workspace") return pathname;

  const normalizedPathname =
    pathname?.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const sectionDefaults = {
    "/app/management": "locations",
    "/app/operations": "automations",
  };
  const matchingPath = Object.keys(sectionDefaults).find(
    (path) => normalizedPathname === path || normalizedPathname?.endsWith(path),
  );

  if (!matchingPath) return pathname;

  const section = searchParams.get("section") || sectionDefaults[matchingPath];

  return `${pathname}?workspace-section=${section}`;
};

function PathnameTransition({ children, scope }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const viewKey = getWorkspaceViewKey(pathname, searchParams, scope);

  return (
    <TransitionSurface key={viewKey} scope={scope}>
      {children}
    </TransitionSurface>
  );
}

export default function TransitionPage({
  children,
  scope = "route",
  animateOnPathnameChange = false,
}) {
  if (animateOnPathnameChange) {
    return <PathnameTransition scope={scope}>{children}</PathnameTransition>;
  }

  return <TransitionSurface scope={scope}>{children}</TransitionSurface>;
}
