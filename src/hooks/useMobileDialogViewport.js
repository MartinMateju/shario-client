"use client";

import { useEffect, useState } from "react";

// Mobile keyboards can shrink the visual viewport without changing 100dvh.
// Keep the form and its actions inside the visible area, including iOS panning.
export function useMobileDialogViewport(open) {
  const [bounds, setBounds] = useState(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;

    const update = () => {
      const next =
        window.innerWidth < 640 && viewport.scale === 1
          ? { height: viewport.height, top: viewport.offsetTop }
          : null;
      setBounds((current) =>
        current?.height === next?.height && current?.top === next?.top
          ? current
          : next,
      );
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return open ? bounds : null;
}
