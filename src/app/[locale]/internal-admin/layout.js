import InternalAdminBoundary from "@/components/auth/InternalAdminBoundary";

export const metadata = {
  title: "Administration | shario.io",
  robots: {
    index: false,
    follow: false,
  },
};

export default function InternalAdminLayout({ children }) {
  return <InternalAdminBoundary>{children}</InternalAdminBoundary>;
}
