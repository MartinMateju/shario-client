import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "CustomerAuth.complete",
  });

  return {
    title: t("metadataTitle"),
    robots: { index: false, follow: false },
  };
}

export default function CustomerSocialCompleteLayout({ children }) {
  return children;
}
