import { getSettingsRedirectHref } from "@/components/settings/settingsRouteRedirects";
import { redirect } from "@/i18n/navigation";

export default async function PreferencesPage({ params, searchParams }) {
  const { locale } = await params;
  return redirect({
    href: getSettingsRedirectHref(
      "/app/settings/preferences",
      await searchParams,
    ),
    locale,
  });
}
