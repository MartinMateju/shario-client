"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { useOptionalCustomerPortalLocation } from "@/components/customer-shell/CustomerPortalLocationProvider";
import { useGetCustomerKnowledgeQuery } from "@/lib/features/knowledge/knowledgeApiSlice";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";

import KnowledgeBrowser from "./KnowledgeBrowser";

export default function CustomerKnowledgeHub({
  embedded = false,
  locationId: providedLocationId,
}) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const portalLocation = useOptionalCustomerPortalLocation();
  const fallbackLocationId = useSelector(selectActiveStudioId);
  const locationId =
    providedLocationId ||
    (portalLocation ? portalLocation.activeLocationId : fallbackLocationId);
  const query = useGetCustomerKnowledgeQuery(
    {
      language: locale,
      ...(locationId ? { locationId } : {}),
    },
    { refetchOnMountOrArgChange: true },
  );

  const browser = (
    <KnowledgeBrowser
      key={`${locale}:${locationId || "all"}`}
      resources={query.currentData || []}
      isLoading={query.isLoading || (query.isFetching && !query.currentData)}
      isError={query.isError}
      onRetry={query.refetch}
      embedded={embedded}
      variant="portal"
      initialResourceId={searchParams?.get("resource") || ""}
    />
  );

  return browser;
}
