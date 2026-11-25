import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";

const refresh = vi.hoisted(() => vi.fn());
const catalogs = { cs: csMessages, en: enMessages };
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }) =>
    createTranslator({ locale, messages: catalogs[locale], namespace }),
}));

import PublicTenantUnavailable from "@/components/public-tenant/PublicTenantUnavailable";
import PublicTenantRetry from "@/components/public-tenant/PublicTenantRetry";

const renderWithIntl = (locale, ui) =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={catalogs[locale]}
      timeZone="Europe/Prague"
    >
      {ui}
    </NextIntlClientProvider>,
  );

beforeEach(() => refresh.mockReset());

describe("public studio recovery", () => {
  it("refreshes the current route only on request, preserving its booking return path", async () => {
    renderWithIntl("cs", await PublicTenantUnavailable({ locale: "cs" }));
    expect(refresh).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: csMessages.PublicTenant.unavailable.retry,
      }),
    );
    expect(refresh).toHaveBeenCalledExactlyOnceWith();
  });

  it("never submits a surrounding login form", () => {
    const submit = vi.fn();
    renderWithIntl(
      "en",
      <form onSubmit={submit}>
        <PublicTenantRetry />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(submit).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
