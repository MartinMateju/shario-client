import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import WorkingStudioHome from "@/components/Home/WorkingStudioHome";
import { buildLocaleMetadataContext } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://shario.io";

export async function generateMetadata({ params }) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({
    locale,
    namespace: "Metadata",
  });
  const title = t("homeTitle");
  const description = t("homeDescription");
  const localeMetadata = buildLocaleMetadataContext(locale, routing.locales);

  return {
    title: {
      absolute: `Shario — ${title}`,
    },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: localeMetadata.languageAlternates,
    },
    openGraph: {
      type: "website",
      locale: localeMetadata.openGraphLocale,
      alternateLocale: localeMetadata.openGraphAlternateLocales,
      url: `/${locale}`,
      siteName: "Shario",
      title: `Shario — ${title}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `Shario — ${title}`,
      description,
    },
  };
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MarketingHome" });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Shario",
    url: `${siteUrl}/${locale}`,
    inLanguage: locale,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Shared-space management",
    operatingSystem: "Web",
    description: t("hero.description"),
  };

  return (
    <>
      <WorkingStudioHome />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
