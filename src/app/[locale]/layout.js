import PlatformTelemetry from "@/components/analytics/PlatformTelemetry";
import { Suspense } from "react";
import { Barlow_Condensed, Fraunces, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";

import Header from "@/components/headers/Header";
import HeaderPlaceholder from "@/components/headers/HeaderPlaceholder";
import LegacyLocaleSync from "@/components/i18n/LegacyLocaleSync";
import { SKAB_PLATFORM_COLORS } from "@/config/brandPalette";
import { PLATFORM_BROWSER_ICONS } from "@/config/browserIcons";
import { getLegacyLanguageForLocale } from "@/i18n/locales";
import { buildLocaleMetadataContext } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";
import StoreProvider from "@/providers/StoreProvider";

import "@/styles/globals.css";

const geistSans = localFont({
  src: "../../fonts/Manrope-Variable.ttf",
  variable: "--font-manrope",
  display: "swap",
});

const geistMono = localFont({
  src: "../../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  display: "swap",
});

const modernDisplay = Barlow_Condensed({
  variable: "--font-modern-display",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const editorialDisplay = Playfair_Display({
  variable: "--font-editorial",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const warmDisplay = Fraunces({
  variable: "--font-warm-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://shario.io";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const localeMetadata = buildLocaleMetadataContext(locale, routing.locales);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Shario",
      template: "%s | Shario",
    },
    applicationName: "Shario",
    icons: PLATFORM_BROWSER_ICONS,
    robots: localeMetadata.isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

/** @type {import("next").Viewport} */
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: SKAB_PLATFORM_COLORS.canvas,
  colorScheme: "light",
};

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const legacyLanguage = getLegacyLanguageForLocale(locale);
  const localeMetadata = buildLocaleMetadataContext(locale, routing.locales);
  const t = await getTranslations({
    locale,
    namespace: "Common",
  });

  return (
    <html
      lang={locale}
      dir={localeMetadata.direction}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          ${editorialDisplay.variable}
          ${modernDisplay.variable}
          ${warmDisplay.variable}
          min-h-dvh
          bg-canvas
          font-sans
          text-ink
          antialiased
        `}
      >
        <NextIntlClientProvider messages={messages}>
          <StoreProvider legacyLanguage={legacyLanguage}>
            <LegacyLocaleSync key="legacy-locale-sync" />

            <a key="skip-link" className="skip-link" href="#page-content">
              {t("skipToContent")}
            </a>

            <Suspense key="platform-header" fallback={<HeaderPlaceholder />}>
              <Header />
            </Suspense>

            <div
              key="page-content"
              id="page-content"
              tabIndex={-1}
              className="min-h-dvh pt-[var(--header-height)]"
            >
              {children}
            </div>
          </StoreProvider>
        </NextIntlClientProvider>
        <PlatformTelemetry />
      </body>
    </html>
  );
}
