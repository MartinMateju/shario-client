import { getSettingsRedirectHref } from "@/components/settings/settingsRouteRedirects";
import { redirect } from "@/i18n/navigation";

export default async function AccountPage({ params, searchParams }) {
  const { locale } = await params;
  return redirect({
    href: getSettingsRedirectHref("/app/settings/profile", await searchParams),
    locale,
  });
}
