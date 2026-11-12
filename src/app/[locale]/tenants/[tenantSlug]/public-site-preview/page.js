import PublicSitePreviewRoute from "@/components/public-site-editor/PublicSitePreviewRoute";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicSitePreviewPage({ params }) {
  const { tenantSlug } = await params;

  return <PublicSitePreviewRoute tenantSlug={tenantSlug} />;
}
