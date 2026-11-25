"use client";

import { useState } from "react";
import {
  EnvelopeIcon,
  EyeIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import {
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import DoorAccessEmailTemplateModal from "@/components/communications/email/DoorAccessEmailTemplateModal";
import { useGetDoorAccessEmailTemplatesQuery } from "@/lib/features/emailTemplates/emailTemplatesApiSlice";

export default function DoorAccessEmailSettings({
  locationId,
  canView = false,
  canManage = false,
}) {
  const t = useTranslations("AccessCodes.emailTemplate");
  const shared = useTranslations("EmailAutomations.doorTemplates");
  const [editorOpen, setEditorOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const query = useGetDoorAccessEmailTemplatesQuery(undefined, {
    skip: !canView || !locationId,
  });
  // The settings location selector and the dedicated API must agree. Never
  // substitute another location or expose cached template content after denial.
  const location =
    !query.isError && !query.isLoading
      ? query.data?.locations?.find((row) => row.locationId === locationId)
      : null;

  if (!canView || !locationId) return null;

  const create = canManage && !location?.isCustomized;
  const ActionIcon = !canManage
    ? EyeIcon
    : create
      ? PlusIcon
      : PencilSquareIcon;

  return (
    <section
      aria-labelledby="access-code-email-settings-title"
      className="rounded-[22px] border border-line bg-white p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cobalt-50 text-cobalt-600">
          <EnvelopeIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="access-code-email-settings-title"
            className="text-[17px] font-semibold tracking-[-0.035em] text-ink"
          >
            {t("title")}
          </h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-ink-muted">
            {t("description")}
          </p>
        </div>
      </div>

      {feedback ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-xs text-success"
        >
          {feedback}
        </p>
      ) : null}

      {query.isLoading ? (
        <p role="status" className="mt-4 text-xs text-ink-muted">
          {shared("loading")}
        </p>
      ) : query.isError ? (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-danger/5 px-4 py-3 text-xs text-danger"
        >
          <p>{shared("loadError")}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="mt-2 min-h-10 font-semibold underline disabled:opacity-50"
          >
            {shared("retry")}
          </button>
        </div>
      ) : location ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-ink">
              {location.locationName}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {shared(location.isCustomized ? "customized" : "default")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFeedback("");
              setEditorOpen(true);
            }}
            disabled={query.isFetching}
            className={`${create ? workspacePrimaryButtonClass : workspaceSecondaryButtonClass} w-full shrink-0 sm:w-auto`}
            aria-label={
              create
                ? t("createFor", { location: location.locationName })
                : shared(canManage ? "editFor" : "previewFor", {
                    location: location.locationName,
                  })
            }
          >
            <ActionIcon aria-hidden="true" className="size-4" />
            {create ? t("create") : shared(canManage ? "edit" : "preview")}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-ink-muted">
          {t("locationUnavailable")}
        </p>
      )}

      {editorOpen && location ? (
        <DoorAccessEmailTemplateModal
          key={location.locationId}
          location={location}
          canManage={canManage}
          onClose={() => setEditorOpen(false)}
          onSaved={(action) => {
            setFeedback(
              shared(action === "reset" ? "resetSuccess" : "saveSuccess", {
                location: location.locationName,
              }),
            );
            setEditorOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}
