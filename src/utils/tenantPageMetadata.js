import { formatTenantNameFromSlug } from "@/utils/tenantBrandUtils";
const getLocale = (locale) => (locale === "cs" ? "cs" : "en");
const buildAlternates = (path) => ({
  canonical: (locale) => `/${locale}${path}`,
  languages: {
    cs: `/cs${path}`,
    en: `/en${path}`,
  },
});
const getAuthMetadata = ({ page, locale, tenantSlug }) => {
  const isCzech = locale === "cs";
  const tenantName = formatTenantNameFromSlug(
    tenantSlug,
    isCzech ? "Vaše studio" : "Your studio",
  );
  const isLogin = page === "login";
  const pageTitle = isLogin
    ? isCzech
      ? "Přihlášení"
      : "Sign in"
    : isCzech
      ? "Registrace"
      : "Create account";
  const description = isLogin
    ? isCzech
      ? `Přihlaste se ke svému účtu ve studiu ${tenantName}.`
      : `Sign in to your ${tenantName} account.`
    : isCzech
      ? `Vytvořte si účet pro rezervace ve studiu ${tenantName}.`
      : `Create your account to book at ${tenantName}.`;
  const path = `/${page}`;
  const alternates = buildAlternates(path);
  const canonical = alternates.canonical(locale);
  const title = `${tenantName} | ${pageTitle}`;
  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical,
      languages: alternates.languages,
    },
    openGraph: {
      type: "website",
      locale: isCzech ? "cs_CZ" : "en_US",
      url: canonical,
      siteName: tenantName,
      title,
      description,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
};
export const createTenantPageMetadata = (page) => {
  return async function generateTenantPageMetadata({ params }) {
    const { locale: localeParam, tenantSlug } = await params;
    const locale = getLocale(localeParam);
    if (page === "login" || page === "register") {
      return getAuthMetadata({
        page,
        locale,
        tenantSlug,
      });
    }
    throw new Error("Unsupported account metadata page");
  };
};
