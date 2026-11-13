import { createTranslator } from "next-intl";
import { loadMessages } from "@/i18n/catalogs";
import {
  getLocaleDefinition,
  resolveRolloutEligibleLocaleCode,
} from "@/i18n/locales";
import { routing } from "@/i18n/routing";
import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";

export const createTenantPageMetadata = (page) => {
  return async function generateTenantPageMetadata({ params }) {
    const { locale: localeParam, tenantSlug } = await params;
    const locale = resolveRolloutEligibleLocaleCode(localeParam);
    if (page !== "login" && page !== "register") {
      throw new Error("Unsupported account metadata page");
    }
    const t = createTranslator({
      locale,
      messages: await loadMessages(locale),
      namespace: "Legacy.metadata",
    });
    const tenantName = formatTenantNameFromSlug(
      tenantSlug,
      t("studioFallback"),
    );
    const isLogin = page === "login";
    const pageTitle = t(isLogin ? "loginTitle" : "registerTitle");
    const description = t(
      isLogin ? "loginDescription" : "registerDescription",
      {
        studio: tenantName,
      },
    );
    const canonical = `/${locale}/${page}`;
    const title = `${tenantName} | ${pageTitle}`;
    return {
      title: { absolute: title },
      description,
      alternates: {
        canonical,
        languages: Object.fromEntries(
          routing.locales.map((code) => [code, `/${code}/${page}`]),
        ),
      },
      openGraph: {
        type: "website",
        locale: getLocaleDefinition(locale).openGraphLocale,
        url: canonical,
        siteName: tenantName,
        title,
        description,
      },
      twitter: { card: "summary", title, description },
      robots: { index: false, follow: false },
    };
  };
};
