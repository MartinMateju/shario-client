import TenantSurfaceBoundary from "@/components/auth/TenantSurfaceBoundary";
import FullMessagesProvider from "@/components/i18n/FullMessagesProvider";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TenantAppLayout({ children, params }) {
  const { locale } = await params;
  return (
    <FullMessagesProvider locale={locale}>
      <div className="-mt-[var(--header-height)] min-h-dvh">
        <TenantSurfaceBoundary surface="app">{children}</TenantSurfaceBoundary>
      </div>
    </FullMessagesProvider>
  );
}
