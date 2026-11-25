import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import {
  NextIntlClientProvider,
  useMessages,
  useTranslations,
} from "next-intl";
import { describe, expect, it, vi } from "vitest";

import ExtendedMessagesProvider from "@/components/i18n/ExtendedMessagesProvider";
import { CATALOG_LOCALE_CODES, loadMessages } from "@/i18n/catalogs";
import {
  PUBLIC_CLIENT_MESSAGE_NAMESPACES,
  selectPrivateClientMessages,
  selectPublicClientMessages,
} from "@/i18n/clientMessages";
import { PUBLIC_NAV_ITEMS } from "@/components/headers/marketingNavigation";

const root = process.cwd();
const localeRoutes = path.join(root, "src/app/[locale]");
const privateSegments = new Set([
  "app",
  "portal",
  "internal-admin",
  "public-site-preview",
]);

function walkPublicRoutes(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return privateSegments.has(entry.name) ? [] : walkPublicRoutes(file);
    }
    return /\.[cm]?jsx?$/.test(entry.name) ? [file] : [];
  });
}

function resolveSourceImport(file, specifier) {
  const base = specifier.startsWith("@/")
    ? path.join(root, "src", specifier.slice(2))
    : specifier.startsWith(".")
      ? path.resolve(path.dirname(file), specifier)
      : null;
  if (!base) return null;
  return [base, `${base}.js`, `${base}.jsx`, `${base}/index.js`].find(
    (candidate) => /\.[cm]?jsx?$/.test(candidate) && existsSync(candidate),
  );
}

// Follow the real public-route import graph, including lazy imports. Adding a
// public widget with a new namespace must not silently ship missing messages.
function publicTranslationNamespaces() {
  const visited = new Set();
  const namespaces = new Set();
  const visit = (file) => {
    if (visited.has(file)) return;
    visited.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(
      /useTranslations\s*\(\s*["'`]([A-Za-z][A-Za-z0-9]*)/g,
    )) {
      namespaces.add(match[1]);
    }
    for (const match of source.matchAll(
      /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g,
    )) {
      const imported = resolveSourceImport(file, match[1]);
      if (imported) visit(imported);
    }
  };
  walkPublicRoutes(localeRoutes).forEach(visit);
  return [...namespaces].sort();
}

function PublicProbe() {
  const courses = useTranslations("CustomerCourses");
  const auth = useTranslations("CustomerAuth.social");
  const rootT = useTranslations();
  const messages = useMessages();
  return (
    <>
      <p data-testid="course-title">{courses("title")}</p>
      <p data-testid="auth-label">{auth("label")}</p>
      <p data-testid="marketing-link">{rootT(PUBLIC_NAV_ITEMS[0].labelKey)}</p>
      <p data-testid="public-scope">
        {messages.MigrationCenter ? "private" : "public"}
      </p>
    </>
  );
}

function WorkspaceProbe() {
  const migration = useTranslations("MigrationCenter.hero");
  const courses = useTranslations("CustomerCourses");
  return (
    <>
      <p data-testid="private-title">{migration("title")}</p>
      <p data-testid="inherited-title">{courses("title")}</p>
    </>
  );
}

describe("client translation scopes", () => {
  it("covers every public-route client namespace and dynamic navigation key", () => {
    for (const namespace of publicTranslationNamespaces()) {
      expect(PUBLIC_CLIENT_MESSAGE_NAMESPACES, namespace).toContain(namespace);
    }
    for (const item of PUBLIC_NAV_ITEMS.flatMap((item) => [
      item,
      ...(item.items || []),
    ])) {
      for (const [property, value] of Object.entries(item)) {
        if (property.endsWith("Key")) {
          expect(PUBLIC_CLIENT_MESSAGE_NAMESPACES, value).toContain(
            value.split(".")[0],
          );
        }
      }
    }
  });

  it.each(CATALOG_LOCALE_CODES)(
    "reduces the %s public payload by over 60%% while preserving the complete private catalogue",
    async (locale) => {
      const messages = await loadMessages(locale);
      const publicMessages = selectPublicClientMessages(messages);
      const privateMessages = selectPrivateClientMessages(messages);
      const bytes = (value) => Buffer.byteLength(JSON.stringify(value));

      expect(bytes(publicMessages)).toBeLessThan(bytes(messages) * 0.4);
      expect(publicMessages).not.toHaveProperty("MigrationCenter");
      expect(publicMessages).not.toHaveProperty("Dashboard");
      expect(publicMessages).not.toHaveProperty("PublicSiteEditor");
      expect(Object.values(publicMessages)).not.toContain(undefined);
      expect(Object.keys(privateMessages)).not.toContain("Header");
      expect({ ...publicMessages, ...privateMessages }).toEqual(messages);
    },
  );

  it("keeps public copy available through private navigation and locale changes without leaking private messages back", async () => {
    const en = await loadMessages("en");
    const cs = await loadMessages("cs");
    const onError = vi.fn();
    const tree = (locale, messages, privateRoute) => (
      <NextIntlClientProvider
        locale={locale}
        messages={selectPublicClientMessages(messages)}
        timeZone="Europe/Prague"
        onError={onError}
      >
        <PublicProbe />
        {privateRoute ? (
          <ExtendedMessagesProvider
            messages={selectPrivateClientMessages(messages)}
          >
            <WorkspaceProbe />
          </ExtendedMessagesProvider>
        ) : null}
      </NextIntlClientProvider>
    );
    const view = render(tree("en", en, false));
    expect(screen.getByTestId("course-title")).toHaveTextContent(
      en.CustomerCourses.title,
    );
    expect(screen.getByTestId("auth-label")).toHaveTextContent(
      en.CustomerAuth.social.label,
    );
    expect(screen.getByTestId("public-scope")).toHaveTextContent("public");

    view.rerender(tree("en", en, true));
    expect(screen.getByTestId("private-title")).toHaveTextContent(
      en.MigrationCenter.hero.title,
    );
    expect(screen.getByTestId("inherited-title")).toHaveTextContent(
      en.CustomerCourses.title,
    );
    expect(screen.getByTestId("public-scope")).toHaveTextContent("public");

    view.rerender(tree("cs", cs, true));
    expect(screen.getByTestId("private-title")).toHaveTextContent(
      cs.MigrationCenter.hero.title,
    );
    expect(screen.getByTestId("inherited-title")).toHaveTextContent(
      cs.CustomerCourses.title,
    );

    view.rerender(tree("cs", cs, false));
    expect(screen.queryByTestId("private-title")).not.toBeInTheDocument();
    expect(screen.getByTestId("course-title")).toHaveTextContent(
      cs.CustomerCourses.title,
    );
    expect(screen.getByTestId("public-scope")).toHaveTextContent("public");
    expect(onError).not.toHaveBeenCalled();
  });
});
