"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function PlatformLegalLinks({ currentDocument }) {
  const locale = useLocale();
  const t = useTranslations("PlatformAuth.register.form");

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2" data-platform-legal-links>
      {["terms", "privacy"].map((documentKey) => (
        <Link
          aria-current={currentDocument === documentKey ? "page" : undefined}
          className="inline-flex min-h-11 items-center underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
          href={`/${documentKey}`}
          key={documentKey}
          locale={locale}
        >
          {t(documentKey)}
        </Link>
      ))}
    </div>
  );
}
