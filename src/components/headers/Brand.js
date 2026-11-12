"use client";

import { memo, useRef, useState } from "react";

import SkabLogo from "@/components/brand/SkabLogo";
import TenantLogoLink from "@/components/brand/TenantLogoLink";
import { useMissedImageError } from "@/hooks/useMissedImageError";
import { Link } from "@/i18n/navigation";
import { normalizePublicTenantLogoSize } from "@/components/public-tenant/publicTenant.config";

const Brand = memo(function Brand({
  onClickHome,
  tenant = null,
  href = "/",
  textColor: textColorOverride,
}) {
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const logoRef = useRef(null);
  const branding = tenant?.publicSite?.branding;
  const tenantName = String(branding?.displayName || tenant?.name || "").trim();
  const logoUrl = String(branding?.logoUrl || "").trim();
  const logoSize = normalizePublicTenantLogoSize(branding?.logoSize);
  const showLogo = Boolean(logoUrl && failedLogoUrl !== logoUrl);
  const textColor =
    textColorOverride || (tenant ? "var(--tenant-text)" : "#182333");

  useMissedImageError(logoRef, logoUrl, setFailedLogoUrl);

  const Wrapper = tenant ? TenantLogoLink : Link;
  const wrapperProps = tenant ? { branding } : { href };

  return (
    <Wrapper
      {...wrapperProps}
      aria-label={tenantName || "Shario home"}
      onClick={onClickHome}
      className={`group inline-flex items-center rounded-full px-1.5 ${
        tenant ? "min-w-0 max-w-full xl:shrink-0" : "shrink-0"
      } ${
        showLogo ? "py-0.5" : "py-2"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 ${
        tenant
          ? textColorOverride
            ? "focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-[var(--tenant-surface)]"
            : "focus-visible:ring-[var(--tenant-accent-link)] focus-visible:ring-offset-[var(--tenant-background)]"
          : "focus-visible:ring-brand-primary/35 focus-visible:ring-offset-brand-offset"
      }`}
    >
      {showLogo ? (
        // Tenant logos can use tenant-managed HTTPS hosts, so a plain img
        // avoids requiring every hostname in Next image configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={logoRef}
          src={logoUrl}
          alt={tenantName}
          className="w-auto min-w-0 max-h-[72px] max-w-[min(100%,52vw,204px)] rounded-[12px] object-contain sm:max-w-[min(100%,232px)]"
          style={{ height: `${logoSize}px` }}
          referrerPolicy="no-referrer"
          onError={() => setFailedLogoUrl(logoUrl)}
        />
      ) : tenantName ? (
        <span className="inline-flex min-w-0 items-center">
          <span
            className="max-w-[132px] truncate text-[19px] font-medium tracking-[-0.035em] min-[360px]:max-w-[180px] sm:max-w-[280px] sm:text-[20px]"
            style={{ color: textColor }}
          >
            {tenantName}
          </span>
        </span>
      ) : (
        <SkabLogo />
      )}
    </Wrapper>
  );
});

export default Brand;
