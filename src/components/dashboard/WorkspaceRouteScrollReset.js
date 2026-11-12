"use client";

import { useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";

import { usePathname } from "@/i18n/navigation";

const setDocumentScrollToTop = () => {
  const root = document.documentElement;
  const body = document.body;
  const scrollingElement = document.scrollingElement || root;
  const previousRootScrollBehavior = root.style.scrollBehavior;
  const previousBodyScrollBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  /*
   * Chromium can otherwise keep the previous computed smooth-scrolling
   * behavior for the scroll call made in the same frame.
   */
  root.getClientRects();

  scrollingElement.scrollTop = 0;
  scrollingElement.scrollLeft = 0;
  root.scrollTop = 0;
  body.scrollTop = 0;
  window.scrollTo(0, 0);

  root.style.scrollBehavior = previousRootScrollBehavior;
  body.style.scrollBehavior = previousBodyScrollBehavior;
};

export const resetWorkspaceScroll = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  setDocumentScrollToTop();
};

export default function WorkspaceRouteScrollReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "";

  useLayoutEffect(() => {
    let secondAnimationFrame = null;

    resetWorkspaceScroll();

    const firstAnimationFrame = window.requestAnimationFrame(() => {
      resetWorkspaceScroll();

      secondAnimationFrame = window.requestAnimationFrame(() => {
        resetWorkspaceScroll();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstAnimationFrame);

      if (secondAnimationFrame !== null) {
        window.cancelAnimationFrame(secondAnimationFrame);
      }
    };
  }, [pathname, section]);

  return null;
}
