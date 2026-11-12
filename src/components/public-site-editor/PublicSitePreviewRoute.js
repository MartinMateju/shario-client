"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";

import LoginPage from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/page";
import RegisterPage from "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/register/page";
import PublicMembershipCatalog from "@/components/memberships/PublicMembershipCatalog";
import Menu from "@/components/menu/Menu";
import CustomerCoursesPage from "@/components/courses/CustomerCoursesPage";
import { CustomerPortalPageUnavailable } from "@/components/customer-shell/CustomerPortalPageGate";
import {
  getCustomerPortalFallbackHref,
  isCustomerPortalPageEnabled,
} from "@/components/customer-shell/customerPortalVisibility";
import PublicBookingAvailabilityPage from "@/components/public-tenant/PublicBookingAvailabilityPage";
import PublicCapabilityGate from "@/components/public-tenant/PublicCapabilityGate";
import PublicHelpPage from "@/components/public-tenant/PublicHelpPage";
import PublicProductCatalogPage from "@/components/public-tenant/PublicProductCatalogPage";
import PublicTenantChrome from "@/components/public-tenant/PublicTenantChrome";
import PublicTenantHomePage from "@/components/public-tenant/PublicTenantHomePage";
import PublicVoucherCatalogPage from "@/components/public-tenant/PublicVoucherCatalogPage";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";

const MESSAGE_UPDATE = "shario:public-site-preview:update";
const MESSAGE_READY = "shario:public-site-preview:ready";
const MESSAGE_APPLIED = "shario:public-site-preview:applied";
const MESSAGE_EDIT = "shario:public-site-preview:edit";

function PortalPreview({ data, tenant, previewModules }) {
  if (!isCustomerPortalPageEnabled(tenant, "calendar")) {
    return (
      <CustomerPortalPageUnavailable
        fallbackHref={getCustomerPortalFallbackHref(tenant, previewModules)}
      />
    );
  }
  const locations = Array.isArray(data?.locations) ? data.locations : [];
  const selectedLocation =
    locations.find((item) => item.isPrimary) || locations[0];
  const activeLocationId = String(
    selectedLocation?.id || selectedLocation?._id || "",
  );

  return (
    <div>
      <Menu
        bookings={[]}
        products={Array.isArray(data?.products) ? data.products : []}
        locations={locations}
        activeLocationId={activeLocationId}
        activeBookingLocationId={activeLocationId}
        modules={previewModules}
        previewMode
      />
    </div>
  );
}

const PREVIEW_PATHS = Object.freeze({
  home: "/",
  book: "/book",
  courses: "/courses",
  memberships: "/memberships",
  vouchers: "/vouchers",
  help: "/help",
  login: "/login",
  register: "/register",
  portal: "/portal",
  portalCourses: "/portal/courses",
});

function PreviewPageContent({ page, data }) {
  const normalizedData = data && typeof data === "object" ? data : {};

  switch (page) {
    case "book":
      return <PublicBookingAvailabilityPage previewData={normalizedData} />;
    case "courses":
      return (
        <PublicProductCatalogPage
          kind="courses"
          previewData={normalizedData.courses || []}
        />
      );
    case "memberships":
      return (
        <PublicMembershipCatalog
          previewData={{
            plans: normalizedData.memberships || [],
            locations: normalizedData.membershipLocations || [],
          }}
        />
      );
    case "vouchers":
      return (
        <PublicVoucherCatalogPage previewData={normalizedData.vouchers || []} />
      );
    case "help":
      return <PublicHelpPage previewData={normalizedData.help || []} />;
    case "home":
    default:
      return <PublicTenantHomePage previewData={normalizedData} />;
  }
}

function PreviewPage({ page, data }) {
  const content = <PreviewPageContent page={page} data={data} />;

  if (["book", "courses", "memberships", "vouchers", "help"].includes(page)) {
    return (
      <PublicCapabilityGate capability={page === "book" ? "bookStudio" : page}>
        {content}
      </PublicCapabilityGate>
    );
  }

  return content;
}

export default function PublicSitePreviewRoute({ tenantSlug }) {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const nonce = searchParams.get("nonce") || "";
  const [update, setUpdate] = useState(null);
  const payload = update?.payload;

  useEffect(() => {
    const receive = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== MESSAGE_UPDATE ||
        event.data?.nonce !== nonce
      ) {
        return;
      }

      setUpdate({
        payload: event.data.payload || null,
        revision: event.data.revision,
      });
    };

    window.addEventListener("message", receive);
    window.parent.postMessage(
      { type: MESSAGE_READY, nonce },
      window.location.origin,
    );

    return () => window.removeEventListener("message", receive);
  }, [nonce]);

  useEffect(() => {
    const handleClick = (event) => {
      const element = event.target instanceof Element ? event.target : null;
      const editable = element?.closest?.("[data-public-site-edit-path]");
      const interactive = element?.closest?.(
        "a, button, input, select, textarea, [role='button']",
      );

      if (editable || interactive) {
        event.preventDefault();
        event.stopPropagation();
      }
      if (!editable) return;

      window.parent.postMessage(
        {
          type: MESSAGE_EDIT,
          nonce,
          path: editable.getAttribute("data-public-site-edit-path"),
        },
        window.location.origin,
      );
    };
    const preventSubmit = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", preventSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", preventSubmit, true);
    };
  }, [nonce]);

  const tenant = useMemo(
    () =>
      payload?.tenant
        ? normalizePublicTenant(payload.tenant, tenantSlug)
        : null,
    [payload, tenantSlug],
  );

  useEffect(() => {
    if (!tenant) return;
    // Effects run after the preview tree commits, so READY alone never tells
    // the editor that a draft has actually been rendered.
    window.parent.postMessage(
      { type: MESSAGE_APPLIED, nonce, revision: update?.revision },
      window.location.origin,
    );
  }, [nonce, tenant, update]);

  if (!tenant) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[rgb(var(--skab-offset-rgb))] text-[#686762]">
        <ArrowPathIcon className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const page = payload?.page || "home";
  const surface = ["login", "register"].includes(page)
    ? "auth"
    : ["portal", "portalCourses"].includes(page)
      ? "portal"
      : "public";

  return (
    <>
      <style>{`
        [data-public-site-edit-path] {
          cursor: pointer;
          outline: 2px solid transparent;
          outline-offset: 3px;
          transition: outline-color 120ms ease;
        }
        [data-public-site-edit-path]:hover {
          outline-color: #2563EB;
          outline-style: dashed;
        }
      `}</style>
      <PublicTenantChrome
        tenant={tenant}
        surface={surface}
        previewPathname={PREVIEW_PATHS[page] || "/"}
        previewModules={payload?.previewModules}
      >
        {page === "login" ? (
          <div data-public-site-edit-path={`login.headline.${locale}`}>
            <LoginPage />
          </div>
        ) : page === "register" ? (
          <div data-public-site-edit-path={`register.headline.${locale}`}>
            <RegisterPage />
          </div>
        ) : page === "portalCourses" ? (
          isCustomerPortalPageEnabled(tenant, "courses") ? (
            <CustomerCoursesPage
              previewData={{
                ...payload?.data,
                locations:
                  payload?.data?.courseLocations ??
                  payload?.data?.locations ??
                  [],
              }}
              previewLocationId={payload?.previewLocationId}
            />
          ) : (
            <CustomerPortalPageUnavailable
              fallbackHref={getCustomerPortalFallbackHref(
                tenant,
                payload?.previewModules,
              )}
            />
          )
        ) : page === "portal" ? (
          <PortalPreview
            data={payload?.data}
            tenant={tenant}
            previewModules={payload?.previewModules}
          />
        ) : (
          <PreviewPage page={page} data={payload?.data} />
        )}
      </PublicTenantChrome>
    </>
  );
}
