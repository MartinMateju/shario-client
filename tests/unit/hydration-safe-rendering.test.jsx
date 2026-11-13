import { readFileSync } from "node:fs";
import path from "node:path";

import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs();
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import Brand from "@/components/headers/Brand";
import PublicTenantHeroMedia from "@/components/public-tenant/PublicTenantHeroMedia";
import { useCurrentYear } from "@/hooks/useCurrentYear";

const tenant = {
  name: "Studio Alpha",
  publicSite: {
    branding: {
      displayName: "Studio Alpha",
      logoUrl: "https://cdn.example.test/logo.svg",
    },
  },
};

const hydrate = async (element, { beforeHydrate } = {}) => {
  const container = document.createElement("div");
  const recoverableErrors = [];

  container.innerHTML = renderToString(element);
  document.body.appendChild(container);
  beforeHydrate?.();

  let root;

  await act(async () => {
    root = hydrateRoot(container, element, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
  });

  return {
    container,
    recoverableErrors,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

// The server-rendered image already finished loading before hydration.
const stubFinishedImages = ({ naturalWidth }) => {
  const prototype = window.HTMLImageElement.prototype;
  const complete = vi.spyOn(prototype, "complete", "get").mockReturnValue(true);
  const width = vi
    .spyOn(prototype, "naturalWidth", "get")
    .mockReturnValue(naturalWidth);

  return () => {
    complete.mockRestore();
    width.mockRestore();
  };
};

const stubImageProbe = (outcome) => {
  const probes = [];

  vi.stubGlobal(
    "Image",
    class {
      set src(value) {
        probes.push({ src: value, referrerPolicy: this.referrerPolicy });
        queueMicrotask(() =>
          outcome === "error" ? this.onerror?.() : this.onload?.(),
        );
      }
    },
  );

  return probes;
};

describe("hydration-safe rendering", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the server year through hydration, then shows the browser year", async () => {
    function Copyright() {
      const { year, yearKey } = useCurrentYear();

      return (
        <p key={yearKey} suppressHydrationWarning>
          {`© ${year} Studio Alpha`}
        </p>
      );
    }

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59));

    const { container, recoverableErrors, cleanup } = await hydrate(
      <Copyright />,
      {
        beforeHydrate: () => vi.setSystemTime(new Date(2027, 0, 1, 0, 1)),
      },
    );

    expect(recoverableErrors).toEqual([]);
    expect(container.textContent).toBe("© 2027 Studio Alpha");

    cleanup();
  });

  it("falls back to the studio name when the logo failed before hydration", async () => {
    const restoreImages = stubFinishedImages({ naturalWidth: 0 });
    const probes = stubImageProbe("error");
    const { container, recoverableErrors, cleanup } = await hydrate(
      <Brand tenant={tenant} />,
    );

    await vi.waitFor(() => {
      expect(container.querySelector("img")).toBeNull();
    });

    expect(container.textContent).toContain("Studio Alpha");
    expect(probes).toEqual([
      {
        src: tenant.publicSite.branding.logoUrl,
        referrerPolicy: "no-referrer",
      },
    ]);
    expect(recoverableErrors).toEqual([]);

    restoreImages();
    cleanup();
  });

  it("keeps a logo without intrinsic size that loaded before hydration", async () => {
    const restoreImages = stubFinishedImages({ naturalWidth: 0 });
    const probes = stubImageProbe("load");
    const { container, cleanup } = await hydrate(<Brand tenant={tenant} />);

    await vi.waitFor(() => {
      expect(probes).toHaveLength(1);
    });
    await act(async () => {});

    expect(container.querySelector("img")).not.toBeNull();

    restoreImages();
    cleanup();
  });

  it("does not probe images that rendered pixels", async () => {
    const restoreImages = stubFinishedImages({ naturalWidth: 640 });
    const probes = stubImageProbe("error");
    const { container, cleanup } = await hydrate(
      <PublicTenantHeroMedia
        coverImageUrl="https://cdn.example.test/cover.jpg"
        displayName="Studio Alpha"
        accentColor="#C2410C"
        secondaryColor="#1F36D4"
      />,
    );

    await act(async () => {});

    expect(probes).toEqual([]);
    expect(
      container.querySelector("[data-public-tenant-hero-media]"),
    ).toHaveAttribute("data-public-tenant-hero-media", "image");

    restoreImages();
    cleanup();
  });

  it("shows the hero fallback when the cover failed before hydration", async () => {
    const restoreImages = stubFinishedImages({ naturalWidth: 0 });

    stubImageProbe("error");

    const { container, cleanup } = await hydrate(
      <PublicTenantHeroMedia
        coverImageUrl="https://cdn.example.test/missing-cover.jpg"
        displayName="Studio Alpha"
        accentColor="#C2410C"
        secondaryColor="#1F36D4"
      />,
    );

    await vi.waitFor(() => {
      expect(
        container.querySelector("[data-public-tenant-hero-media]"),
      ).toHaveAttribute("data-public-tenant-hero-media", "fallback");
    });

    restoreImages();
    cleanup();
  });

  it.each([
    "src/components/public-tenant/PublicTenantFooter.js",
    "src/components/Marketing/MarketingPageShell.js",
  ])("renders the copyright year hydration-safely in %s", (file) => {
    const source = readFileSync(path.resolve(process.cwd(), file), "utf8");

    expect(source).not.toContain("new Date().getFullYear()");
    expect(source).toContain("useCurrentYear()");
    expect(source).toMatch(
      /key=\{yearKey\}[^>]*suppressHydrationWarning|suppressHydrationWarning[^>]*key=\{yearKey\}/,
    );
  });
});
