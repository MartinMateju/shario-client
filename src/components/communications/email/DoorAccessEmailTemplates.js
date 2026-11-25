"use client";

import { useState } from "react";
import {
  KeyIcon,
  PencilSquareIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";
import { workspaceSecondaryButtonClass } from "@/components/dashboard/WorkspaceFormSurface";
import { useGetDoorAccessEmailTemplatesQuery } from "@/lib/features/emailTemplates/emailTemplatesApiSlice";
import DoorAccessEmailTemplateModal from "./DoorAccessEmailTemplateModal";
import { getEmailWorkspaceHref } from "./emailWorkspaceNavigation";

export default function DoorAccessEmailTemplates({ canManage = false }) {
  const t = useTranslations("EmailAutomations.doorTemplates");
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLocation = searchParams.get("doorLocation");
  const [editor, setEditor] = useState(null);
  const [dismissedRequest, setDismissedRequest] = useState(null);
  const [feedback, setFeedback] = useState("");
  const query = useGetDoorAccessEmailTemplatesQuery();
  const locations = query.data?.locations || [];
  const selected =
    editor ||
    (searchParams !== dismissedRequest
      ? locations.find((location) => location.locationId === requestedLocation)
      : null);

  function closeEditor() {
    setEditor(null);
    // Hide immediately while the router removes the deep link. A later explicit
    // navigation supplies a new search-params snapshot, even for this location.
    setDismissedRequest(searchParams);
    if (requestedLocation) {
      router.replace(getEmailWorkspaceHref(searchParams, "templates"), {
        scroll: false,
      });
    }
  }

  return (
    <WorkspaceCard
      as="section"
      className="overflow-hidden"
      aria-labelledby="door-email-templates-title"
    >
      <div className="flex items-start gap-4 border-b border-line bg-sand-50/80 p-5 sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cobalt-50 text-cobalt-600">
          <KeyIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="door-email-templates-title"
            className="text-base font-semibold tracking-tight text-ink"
          >
            {t("title")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-ink-muted">
            {t("description")}
          </p>
        </div>
      </div>
      {feedback ? (
        <p
          role="status"
          className="border-b border-line bg-success-soft px-5 py-3 text-sm text-success"
        >
          {feedback}
        </p>
      ) : null}
      {query.isLoading ? (
        <p role="status" className="p-5 text-sm">
          {t("loading")}
        </p>
      ) : query.isError ? (
        <div role="alert" className="p-5 text-sm text-danger">
          {t("loadError")}{" "}
          <button
            type="button"
            onClick={() => query.refetch()}
            className="font-semibold underline"
          >
            {t("retry")}
          </button>
        </div>
      ) : locations.length === 0 ? (
        <p className="p-5 text-sm text-ink-muted">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {locations.map((location) => (
            <li
              key={location.locationId}
              className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6"
            >
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-sm font-semibold text-ink">
                  {location.locationName}
                </h3>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {t("locationHint")}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${location.isCustomized ? "bg-cobalt-50 text-cobalt-700" : "bg-surface text-ink-muted"}`}
                >
                  {t(location.isCustomized ? "customized" : "default")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFeedback("");
                  setEditor(location);
                }}
                className={workspaceSecondaryButtonClass}
                aria-label={t(canManage ? "editFor" : "previewFor", {
                  location: location.locationName,
                })}
              >
                {canManage ? (
                  <PencilSquareIcon className="size-4" aria-hidden="true" />
                ) : (
                  <EyeIcon className="size-4" aria-hidden="true" />
                )}
                {t(canManage ? "edit" : "preview")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected ? (
        <DoorAccessEmailTemplateModal
          key={selected.locationId}
          location={selected}
          canManage={canManage}
          onClose={closeEditor}
          onSaved={(action) => {
            setFeedback(
              t(action === "reset" ? "resetSuccess" : "saveSuccess", {
                location: selected.locationName,
              }),
            );
            closeEditor();
          }}
        />
      ) : null}
    </WorkspaceCard>
  );
}
