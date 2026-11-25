import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { loadMessages } from "@/i18n/catalogs";
import { selectPublicClientMessages } from "@/i18n/clientMessages";

const mocks = vi.hoisted(() => ({ getMessages: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getMessages: mocks.getMessages,
  getTranslations: vi.fn(async () => (key) => key),
  setRequestLocale: vi.fn(),
}));
vi.mock("next/font/google", () => {
  const font = () => ({ variable: "font-test" });
  return {
    Barlow_Condensed: font,
    Fraunces: font,
    Geist: font,
    Geist_Mono: font,
    Playfair_Display: font,
  };
});
vi.mock("next/font/local", () => ({
  default: () => ({ variable: "font-test" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Unexpected locale not found");
  },
}));
vi.mock("@/components/headers/Header", () => ({ default: () => null }));
vi.mock("@/components/headers/HeaderPlaceholder", () => ({
  default: () => null,
}));
vi.mock("@/components/i18n/LegacyLocaleSync", () => ({ default: () => null }));
vi.mock("@/components/analytics/PlatformTelemetry", () => ({
  default: () => null,
}));
vi.mock("@/providers/StoreProvider", () => ({
  default: ({ children }) => children,
}));

import FullMessagesProvider from "@/components/i18n/FullMessagesProvider";
import LocaleLayout from "@/app/[locale]/layout";

function OrdersProbe() {
  const t = useTranslations("CustomOrders");
  return <h1>{t("title")}</h1>;
}

describe("private route locale resolution", () => {
  it("pins the root provider locale to the route instead of an earlier request-config read", async () => {
    mocks.getMessages.mockImplementation((options) =>
      loadMessages(options?.locale || "en"),
    );
    const tree = await LocaleLayout({
      params: Promise.resolve({ locale: "cs" }),
      children: <p>Route content</p>,
    });
    const body = [tree.props.children]
      .flat()
      .find((child) => child?.type === "body");
    const provider = [body.props.children]
      .flat()
      .find((child) => child?.type === NextIntlClientProvider);

    expect(mocks.getMessages).toHaveBeenCalledWith({ locale: "cs" });
    expect(provider.props.locale).toBe("cs");
    expect(provider.props.messages.CustomerCourses.title).toBe(
      (await loadMessages("cs")).CustomerCourses.title,
    );
    expect(provider.props.messages).not.toHaveProperty("CustomOrders");
  });

  it("loads Czech private messages even before the root establishes the request locale", async () => {
    // Layouts render concurrently. The ambient request can still say English
    // when the private child starts, despite explicit /cs route params.
    mocks.getMessages.mockImplementation((options) =>
      loadMessages(options?.locale || "en"),
    );
    const messages = await loadMessages("cs");
    const children = await FullMessagesProvider({
      locale: "cs",
      children: <OrdersProbe />,
    });

    render(
      <NextIntlClientProvider
        locale="cs"
        messages={selectPublicClientMessages(messages)}
        timeZone="Europe/Prague"
      >
        {children}
      </NextIntlClientProvider>,
    );

    expect(mocks.getMessages).toHaveBeenCalledWith({ locale: "cs" });
    expect(screen.getByRole("heading", { name: "Zakázky" })).toBeVisible();
    expect(screen.queryByText("Custom orders")).not.toBeInTheDocument();
  });
});
