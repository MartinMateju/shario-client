import FullMessagesProvider from "@/components/i18n/FullMessagesProvider";

import { DisableLinkPrefetch } from "@/i18n/tenantLinks";

export default async function PublicSitePreviewLayout({ children, params }) {
  const { locale } = await params;
  return (
    <FullMessagesProvider locale={locale}>
      <DisableLinkPrefetch>{children}</DisableLinkPrefetch>
    </FullMessagesProvider>
  );
}
