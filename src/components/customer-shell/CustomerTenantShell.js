import PublicTenantChrome from "@/components/public-tenant/PublicTenantChrome";

export default function CustomerTenantShell({
  children,
  tenant,
  degraded = false,
  surface = "public",
}) {
  return (
    <PublicTenantChrome tenant={tenant} degraded={degraded} surface={surface}>
      {children}
    </PublicTenantChrome>
  );
}
