"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

import KnowledgeBrowser from "@/components/knowledge/KnowledgeBrowser";
import { getPublicWebsitePageCustomizationDefaults } from "@/components/customer-shell/customerFacingCustomizationDefaults";
import { useGetPublicKnowledgeQuery } from "@/lib/features/knowledge/knowledgeApiSlice";
import { getValidatedTenantSlugParam } from "@/utils/tenantRouting";

import PublicCapabilityGate from "./PublicCapabilityGate";
import { usePublicTenant } from "./PublicTenantProvider";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
} from "./publicTenant.config";

export default function PublicHelpPage({ previewData }) {
  const contentRef = useRef(null);
  const locale = useLocale();
  const params = useParams();
  const { tenant } = usePublicTenant();
  const tenantSlug = getValidatedTenantSlugParam(params);
  const helpEnabled = tenant.publicCapabilities.help === true;
  const previewMode = Array.isArray(previewData);
  const fetchedQuery = useGetPublicKnowledgeQuery(
    { tenantSlug, limit: 100 },
    { skip: previewMode || !tenantSlug || !helpEnabled },
  );
  const query = previewMode
    ? {
        data: previewData,
        isLoading: false,
        isFetching: false,
        isError: false,
        refetch: () => undefined,
      }
    : fetchedQuery;
  const page = tenant.publicSite.pages.help;
  const theme = getPublicTenantTheme(tenant);
  const customizationDefaults = getPublicWebsitePageCustomizationDefaults({
    page: "help",
    locale,
    studio: tenant.publicSite.branding.displayName,
  });
  const title = getLocalizedPublicTenantText(
    page.title,
    locale,
    customizationDefaults.title,
  );
  const description = getLocalizedPublicTenantText(
    page.description,
    locale,
    customizationDefaults.description,
  );

  useEffect(() => {
    if (!previewMode) return undefined;

    const root = contentRef.current;
    const titleElement = root?.querySelector("h1");
    const descriptionElement = root?.querySelector("h1 + p");
    const titlePath = `pages.help.title.${locale}`;
    const descriptionPath = `pages.help.description.${locale}`;

    titleElement?.setAttribute("data-public-site-edit-path", titlePath);
    descriptionElement?.setAttribute(
      "data-public-site-edit-path",
      descriptionPath,
    );

    return () => {
      titleElement?.removeAttribute("data-public-site-edit-path");
      descriptionElement?.removeAttribute("data-public-site-edit-path");
    };
  }, [locale, previewMode]);

  return (
    <PublicCapabilityGate capability="help">
      <main
        ref={contentRef}
        className="min-h-[70vh] px-4 py-12 sm:px-6 lg:px-8"
        data-tenant-layout="section"
        style={{
          backgroundColor: theme.backgroundColor,
          color: theme.textForeground,
        }}
      >
        <KnowledgeBrowser
          resources={query.data || []}
          isLoading={query.isLoading || query.isFetching}
          isError={query.isError}
          onRetry={query.refetch}
          getResourceHref={(resource) =>
            `/help/${encodeURIComponent(resource.id)}`
          }
          title={title}
          description={description}
        />
      </main>
    </PublicCapabilityGate>
  );
}
