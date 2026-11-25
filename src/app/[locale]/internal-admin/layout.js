import InternalAdminBoundary from "@/components/auth/InternalAdminBoundary";
import FullMessagesProvider from "@/components/i18n/FullMessagesProvider";

export const metadata = {
  title: "Administration | shario.io",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InternalAdminLayout({ children, params }) {
  const { locale } = await params;
  return (
    <FullMessagesProvider locale={locale}>
      <InternalAdminBoundary>{children}</InternalAdminBoundary>
    </FullMessagesProvider>
  );
}
