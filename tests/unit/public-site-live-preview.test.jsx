import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "use-intl/core";
import en from "@/messages/en.json";
import cs from "@/messages/cs.json";
import nl from "@/messages/nl.json";

const translation = vi.hoisted(() => ({ locale: "en" }));
const messages = { en, cs, nl };
vi.mock("next-intl", () => ({
  useTranslations: (namespace) =>
    createTranslator({
      locale: translation.locale,
      messages: messages[translation.locale],
      namespace,
    }),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

import PublicSiteLivePreview from "@/components/public-site-editor/PublicSiteLivePreview";
import proxy from "@/proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  translation.locale = "en";
});

const props = {
  publicSite: { branding: { displayName: "Clay House" } },
  tenant: { id: "tenant-1", settings: { publicDefaultLanguage: "en" } },
  tenantName: "Clay House",
  tenantSlug: "clay-house",
  capabilities: { bookStudio: true, memberships: true },
  previewModules: { bookings: true, memberships: true, vouchers: false },
  locale: "en",
  page: "home",
  device: "desktop",
  previewData: {
    locations: [{ id: "location-1", name: "Main studio" }],
  },
};

const dispatchFrameMessage = (frame, data) => {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: frame.contentWindow,
        data,
      }),
    );
  });
};

describe("PublicSiteLivePreview", () => {
  it("handshakes with the production iframe and sends real draft data", () => {
    const onEditPath = vi.fn();
    render(<PublicSiteLivePreview {...props} onEditPath={onEditPath} />);

    const frame = screen.getByTitle("Clay House production preview");
    const src = new URL(frame.src);
    const nonce = src.searchParams.get("nonce");
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");

    expect(src.pathname).toBe("/en/public-site-preview");
    expect(nonce).toMatch(/^preview-/);
    expect(frame).toHaveAttribute("sandbox", "allow-same-origin allow-scripts");

    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:ready",
      nonce,
    });

    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "shario:public-site-preview:update",
        nonce,
        revision: expect.any(Number),
        payload: {
          tenant: expect.objectContaining({
            id: "tenant-1",
            name: "Clay House",
            slug: "clay-house",
            publicCapabilities: props.capabilities,
            publicSite: props.publicSite,
          }),
          page: "home",
          data: props.previewData,
          previewModules: props.previewModules,
        },
      },
      window.location.origin,
    );

    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:edit",
      nonce,
      path: "pages.home.headline.en",
    });
    expect(onEditPath).toHaveBeenCalledWith("pages.home.headline.en");
  });

  it("ignores messages with the wrong nonce, source or origin", () => {
    const onEditPath = vi.fn();
    render(<PublicSiteLivePreview {...props} onEditPath={onEditPath} />);
    const frame = screen.getByTitle("Clay House production preview");
    const nonce = new URL(frame.src).searchParams.get("nonce");

    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:edit",
      nonce: `${nonce}-wrong`,
      path: "branding.displayName",
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://attacker.example",
          source: frame.contentWindow,
          data: {
            type: "shario:public-site-preview:edit",
            nonce,
            path: "branding.displayName",
          },
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window,
          data: {
            type: "shario:public-site-preview:edit",
            nonce,
            path: "branding.displayName",
          },
        }),
      );
    });

    expect(onEditPath).not.toHaveBeenCalled();
  });

  it("updates explicit preview modules independently of public capabilities without reloading", () => {
    const { rerender } = render(<PublicSiteLivePreview {...props} />);
    const frame = screen.getByTitle("Clay House production preview");
    const initialSrc = frame.src;
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");
    const previewModules = { ...props.previewModules, vouchers: true };
    rerender(
      <PublicSiteLivePreview {...props} previewModules={previewModules} />,
    );
    expect(frame.src).toBe(initialSrc);
    const message = postMessage.mock.calls.at(-1)[0];
    expect(message.payload.previewModules).toEqual(previewModules);
    expect(message.payload.tenant.publicCapabilities).toEqual(
      props.capabilities,
    );
    expect(message.payload.tenant).not.toHaveProperty("modules");
  });

  it("updates the selected page without reloading the iframe or losing click-to-edit", () => {
    const onEditPath = vi.fn();
    const { rerender } = render(
      <PublicSiteLivePreview {...props} onEditPath={onEditPath} />,
    );
    const frame = screen.getByTitle("Clay House production preview");
    const initialSrc = frame.src;
    const nonce = new URL(initialSrc).searchParams.get("nonce");
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");

    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:ready",
      nonce,
    });
    // Real browsers may deliver READY before the iframe load event. The load
    // retry must not disable later page updates.
    fireEvent.load(frame);
    postMessage.mockClear();

    const helpData = { help: [{ id: "help-1", title: "Arrival" }] };
    rerender(
      <PublicSiteLivePreview
        {...props}
        page="help"
        previewData={helpData}
        onEditPath={onEditPath}
      />,
    );

    expect(frame.src).toBe(initialSrc);
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "shario:public-site-preview:update",
        nonce,
        revision: expect.any(Number),
        payload: expect.objectContaining({
          page: "help",
          data: helpData,
        }),
      },
      window.location.origin,
    );

    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:edit",
      nonce,
      path: "pages.help.title.en",
    });
    expect(onEditPath).toHaveBeenCalledWith("pages.help.title.en");
    expect(frame.src).toBe(initialSrc);
  });

  it("reloads the production route for a selected language and resends the draft", () => {
    const { rerender } = render(<PublicSiteLivePreview {...props} />);
    const frame = screen.getByTitle("Clay House production preview");
    const initialSrc = new URL(frame.src);
    const nonce = initialSrc.searchParams.get("nonce");

    rerender(<PublicSiteLivePreview {...props} locale="cs" />);

    const localizedSrc = new URL(frame.src);
    const localizedNonce = localizedSrc.searchParams.get("nonce");
    const localizedPostMessage = vi.spyOn(frame.contentWindow, "postMessage");
    expect(localizedSrc.pathname).toBe("/cs/public-site-preview");
    expect(localizedNonce).toMatch(/^preview-/);
    expect(localizedNonce).not.toBe(nonce);

    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:ready",
      nonce: localizedNonce,
    });
    fireEvent.load(frame);
    localizedPostMessage.mockClear();
    rerender(<PublicSiteLivePreview {...props} locale="cs" page="help" />);
    expect(localizedPostMessage).toHaveBeenCalledWith(
      {
        type: "shario:public-site-preview:update",
        nonce: localizedNonce,
        revision: expect.any(Number),
        payload: expect.objectContaining({ page: "help" }),
      },
      window.location.origin,
    );
  });

  it("bounds retries, reports an unresponsive frame, and accepts a late current acknowledgement", () => {
    vi.useFakeTimers();
    render(<PublicSiteLivePreview {...props} />);
    const frame = screen.getByTitle("Clay House production preview");
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");
    expect(screen.getByRole("status")).toHaveTextContent("Updating preview");
    act(() => vi.advanceTimersByTime(10000));
    expect(postMessage).toHaveBeenCalledTimes(10);
    const update = postMessage.mock.lastCall[0];
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "your unsaved changes will be kept",
    );
    act(() => vi.advanceTimersByTime(30000));
    expect(postMessage).toHaveBeenCalledTimes(10);
    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:applied",
      nonce: update.nonce,
      revision: update.revision,
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preview is up to date.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores an acknowledgement for an older draft and retries only the newest payload", () => {
    vi.useFakeTimers();
    const { rerender } = render(<PublicSiteLivePreview {...props} />);
    const frame = screen.getByTitle("Clay House production preview");
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");
    fireEvent.load(frame);
    const first = postMessage.mock.lastCall[0];
    const publicSite = { branding: { displayName: "Unsaved new name" } };
    rerender(<PublicSiteLivePreview {...props} publicSite={publicSite} />);
    const latest = postMessage.mock.lastCall[0];
    expect(latest.revision).toBeGreaterThan(first.revision);
    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:applied",
      nonce: first.nonce,
      revision: first.revision,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Updating preview");
    postMessage.mockClear();
    act(() => vi.advanceTimersByTime(2000));
    expect(postMessage).toHaveBeenCalledTimes(2);
    for (const [message] of postMessage.mock.calls) {
      expect(message.revision).toBe(latest.revision);
      expect(message.payload.tenant.publicSite).toEqual(publicSite);
    }
    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:applied",
      nonce: latest.nonce,
      revision: latest.revision,
    });
    postMessage.mockClear();
    act(() => vi.advanceTimersByTime(30000));
    expect(postMessage).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preview is up to date.",
    );
  });

  it("reloads only the iframe with a fresh nonce while retaining unsaved draft, page, language and device", () => {
    const { rerender } = render(<PublicSiteLivePreview {...props} />);
    const publicSite = {
      branding: { displayName: "Unsaved draft", backgroundColor: "#112233" },
    };
    rerender(
      <PublicSiteLivePreview
        {...props}
        publicSite={publicSite}
        page="portal"
        locale="cs"
        device="mobile"
      />,
    );
    const oldFrame = screen.getByTitle("Clay House production preview");
    const oldWindow = oldFrame.contentWindow;
    const oldNonce = new URL(oldFrame.src).searchParams.get("nonce");
    fireEvent.click(screen.getByRole("button", { name: "Reload preview" }));
    const frame = screen.getByTitle("Clay House production preview");
    const source = new URL(frame.src);
    const nonce = source.searchParams.get("nonce");
    expect(frame).not.toBe(oldFrame);
    expect(nonce).not.toBe(oldNonce);
    expect(source.pathname).toBe("/cs/public-site-preview");
    expect(frame).toHaveStyle({ width: "390px" });
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");
    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:ready",
      nonce,
    });
    const update = postMessage.mock.lastCall[0];
    expect(update.payload).toMatchObject({
      page: "portal",
      tenant: { publicSite },
      data: props.previewData,
    });
    for (const overrides of [
      { origin: "https://attacker.example" },
      { source: oldWindow },
      {
        data: {
          type: "shario:public-site-preview:applied",
          nonce: oldNonce,
          revision: update.revision,
        },
      },
    ]) {
      act(() =>
        window.dispatchEvent(
          new MessageEvent("message", {
            origin: window.location.origin,
            source: frame.contentWindow,
            data: {
              type: "shario:public-site-preview:applied",
              nonce,
              revision: update.revision,
            },
            ...overrides,
          }),
        ),
      );
      expect(screen.getByRole("status")).toHaveTextContent("Updating preview");
    }
    dispatchFrameMessage(frame, {
      type: "shario:public-site-preview:applied",
      nonce,
      revision: update.revision,
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preview is up to date.",
    );
  });

  it("stops delivery timers when the editor unmounts", () => {
    vi.useFakeTimers();
    const { unmount } = render(<PublicSiteLivePreview {...props} />);
    const frame = screen.getByTitle("Clay House production preview");
    const postMessage = vi.spyOn(frame.contentWindow, "postMessage");
    unmount();
    act(() => vi.advanceTimersByTime(30000));
    expect(postMessage).not.toHaveBeenCalled();
  });

  it.each(["en", "cs", "nl"])("localizes recovery controls in %s", (locale) => {
    vi.useFakeTimers();
    translation.locale = locale;
    const copy = messages[locale].PublicSiteEditor.preview.connection;
    render(<PublicSiteLivePreview {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent(copy.loading);
    expect(screen.getByRole("button", { name: copy.reload })).toBeVisible();
    act(() => vi.advanceTimersByTime(15000));
    expect(screen.getByRole("alert")).toHaveTextContent(copy.timeout);
  });
});

describe("live preview hostname routing", () => {
  const configureRouting = (environment, customDomains = {}) => {
    for (const key of [
      "TENANT_ROOT_DOMAIN",
      "NEXT_PUBLIC_ROOT_DOMAIN",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_API_URL",
      "PLATFORM_HOSTNAMES",
      "LEGACY_TENANT_SLUGS",
    ]) {
      vi.stubEnv(key, "");
    }
    vi.stubEnv("NODE_ENV", environment);
    vi.stubEnv("CUSTOM_DOMAIN_TENANTS", JSON.stringify(customDomains));
  };

  it.each([
    ["https://clay-house.shario.io", "en", "production", {}],
    [
      "https://clay.example",
      "cs",
      "production",
      { "clay.example": "clay-house" },
    ],
    ["http://clay-house.shario.localhost:3000", "cs", "development", {}],
  ])(
    "loads the generated preview URL through the tenant proxy on %s",
    (origin, locale, environment, customDomains) => {
      render(<PublicSiteLivePreview {...props} locale={locale} />);
      const frame = screen.getByTitle("Clay House production preview");
      const frameUrl = new URL(frame.getAttribute("src"), origin);
      configureRouting(environment, customDomains);

      const response = proxy(
        new NextRequest(frameUrl, { headers: { host: frameUrl.host } }),
      );

      expect(frameUrl.origin).toBe(origin);
      expect(response.status).toBe(200);
      const destination = new URL(response.headers.get("x-middleware-rewrite"));
      expect(destination.origin).toBe(origin);
      expect(destination.pathname).toBe(
        `/${locale}/tenants/clay-house/public-site-preview`,
      );
      expect(destination.searchParams.get("nonce")).toBe(
        frameUrl.searchParams.get("nonce"),
      );
      expect(
        response.headers.get("x-middleware-request-x-shario-internal-rewrite"),
      ).toBe("1");
    },
  );

  it.each([
    "clay-house.shario.io",
    "clay.example",
    "shario.io",
    "unknown.example",
  ])(
    "keeps another tenant's internal preview URLs blocked on %s",
    async (host) => {
      configureRouting("production", { "clay.example": "clay-house" });
      const response = proxy(
        new NextRequest(
          `https://${host}/en/tenants/another-studio/public-site-preview?nonce=test`,
          { headers: { host } },
        ),
      );

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
    },
  );
});
