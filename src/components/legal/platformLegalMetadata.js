import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { LEGAL_DOCUMENTS } from "@/content/platformLegal";
import { routing } from "@/i18n/routing";

export async function buildPlatformLegalMetadata({ documentKey, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const document = LEGAL_DOCUMENTS[documentKey];
  return {
    title: { absolute: `${document.title} | shario.io` },
    description: document.description,
    alternates: { canonical: `/en/${documentKey}` },
    robots: { index: false, follow: true },
  };
}
