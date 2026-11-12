import { getPublicTenantLogoHref } from "@/components/public-tenant/publicTenant.config";

export default function TenantLogoLink({
  branding,
  children,
  onClick,
  ...props
}) {
  const href = getPublicTenantLogoHref(branding);

  if (!href) {
    return <span {...props}>{children}</span>;
  }

  // Use the configured destination exactly, without locale or location rewrites.
  return (
    <a {...props} href={href} onClick={onClick}>
      {children}
    </a>
  );
}
