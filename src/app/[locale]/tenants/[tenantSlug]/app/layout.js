import TenantSurfaceBoundary from "@/components/auth/TenantSurfaceBoundary";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function TenantAppLayout({ children }) {
  return (
    <div className="-mt-[var(--header-height)] min-h-dvh">
      <TenantSurfaceBoundary surface="app">{children}</TenantSurfaceBoundary>
    </div>
  );
}
