import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { buildLocaleMetadataContext } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";

export async function buildMarketingPageMetadata({
  pageKey,
  params,
  pathname,
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({
    locale,
    namespace: `MarketingPages.${pageKey}`,
  });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const localeMetadata = buildLocaleMetadataContext(
    locale,
    routing.locales,
    pathname,
  );
  const documentTitle = `${title} | Shario`;

  return {
    title: {
      absolute: documentTitle,
    },
    description,
    alternates: {
      canonical: localeMetadata.canonicalPath,
      languages: localeMetadata.languageAlternates,
    },
    openGraph: {
      type: "website",
      locale: localeMetadata.openGraphLocale,
      alternateLocale: localeMetadata.openGraphAlternateLocales,
      url: localeMetadata.canonicalPath,
      siteName: "Shario",
      title: documentTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: documentTitle,
      description,
    },
  };
}
