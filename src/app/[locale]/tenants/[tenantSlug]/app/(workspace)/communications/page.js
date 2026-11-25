import PermissionBoundary from "@/components/auth/PermissionBoundary";
import CommunicationsWorkspace from "@/components/communications/CommunicationsWorkspace";
import {
  getEmailWorkspaceHref,
  resolveEmailWorkspaceSection,
} from "@/components/communications/email/emailWorkspaceNavigation";
import { getSettingsSearchParams } from "@/components/settings/settingsRouteRedirects";
import { PERMISSIONS } from "@/config/permissions";
import { redirect } from "@/i18n/navigation";

export default async function CommunicationsPage({ params, searchParams }) {
  const query = getSettingsSearchParams(await searchParams);
  const section = resolveEmailWorkspaceSection({
    section: query.get("section"),
    tab: query.get("tab"),
    guided: query.get("setupStep") === "communications",
  });
  // Resolve legacy setup bookmarks before the communications-history gate.
  // The canonical settings page applies the original setup-management gate.
  if (section === "setup") {
    const { locale } = await params;
    return redirect({ href: getEmailWorkspaceHref(query, "setup"), locale });
  }
  return (
    <PermissionBoundary
      anyOf={[
        PERMISSIONS.COMMUNICATIONS_VIEW,
        PERMISSIONS.COMMUNICATIONS_MANAGE,
      ]}
    >
      <CommunicationsWorkspace showPageHeader={false} />
    </PermissionBoundary>
  );
}
