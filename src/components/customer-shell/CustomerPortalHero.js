"use client";

import { useState } from "react";

import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { getCustomerPortalPageImage } from "@/components/public-tenant/publicTenantPageImages";

export default function CustomerPortalHero({
  children,
  className = "",
  imageUrl,
  mediaEditPath,
  pageKey,
}) {
  const tenant = useOptionalPublicTenant()?.tenant;
  const source = imageUrl ?? getCustomerPortalPageImage(tenant, pageKey);
  const [failedSource, setFailedSource] = useState(null);
  const showImage = Boolean(source && source !== failedSource);

  return (
    <header
      className={className}
      data-customer-portal-page-header="feature"
      data-customer-portal-hero={pageKey || "page"}
      data-customer-portal-hero-layout={showImage ? "split" : "text"}
    >
      <div data-customer-portal-hero-copy data-tenant-layout="hero-copy">
        {children}
      </div>
      {showImage ? (
        <div
          data-customer-portal-hero-media
          data-public-site-edit-path={
            mediaEditPath || `customerPortal.pageImages.${pageKey}`
          }
        >
          {/* The tenant photo decorates the adjacent, fully labelled content. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source}
            alt=""
            decoding="async"
            onError={() => setFailedSource(source)}
          />
        </div>
      ) : null}
    </header>
  );
}
