"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { useMemo, useState } from "react";
import { BellAlertIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";
import AutomatedEmailModal from "@/components/modals/email_notifications/AutomatedEmailModal";
import EmailTemplatesTable from "@/components/tables/EmailTemplatesTable";
import AutomatedEmailsTable from "@/components/tables/email_notifications/AutomatedEmailsTable";
import OutboundEmailHistoryView from "@/components/communications/email/OutboundEmailHistoryView";
import DoorAccessEmailAutomation from "@/components/communications/email/DoorAccessEmailAutomation";
import {
  UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES,
  getResourceId,
} from "@/components/communications/email/emailContent";
import {
  isEmailSetupReady,
  normalizeEmailSetup,
} from "@/components/communications/email/emailSetup";
import {
  useDeleteCommunicationAutomationMutation,
  useGetCommunicationAutomationsQuery,
  useToggleCommunicationAutomationMutation,
} from "@/lib/features/communicationAutomations/communicationAutomationsApiSlice";
import { useGetEmailTemplatesQuery } from "@/lib/features/emailTemplates/emailTemplatesApiSlice";

export default function AutomatedCommunicationsPage({
  view = "automations",
  emailSetup,
}) {
  const t = useTranslations("EmailAutomations");
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canManage = hasPermission(
    workspaceAccess,
    PERMISSIONS.COMMUNICATIONS_MANAGE,
  );
  const setup = normalizeEmailSetup(emailSetup);
  const ready = isEmailSetupReady(setup);
  const [editor, setEditor] = useState({
    open: false,
    automation: null,
    mode: "create",
  });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [togglingId, setTogglingId] = useState("");

  const automationQuery = useGetCommunicationAutomationsQuery(
    {},
    { skip: view !== "automations" },
  );
  const templateQuery = useGetEmailTemplatesQuery(
    { search: "", category: "all", active: "all", type: "content" },
    { skip: view !== "automations" },
  );
  const automations = Array.isArray(automationQuery.data)
    ? automationQuery.data
    : [];
  const emailTemplates = useMemo(
    () =>
      Array.isArray(templateQuery.data)
        ? templateQuery.data
        : (templateQuery.data?.templates ?? templateQuery.data?.items ?? []),
    [templateQuery.data],
  );
  const [deleteAutomation, { isLoading: isDeleting }] =
    useDeleteCommunicationAutomationMutation();
  const [toggleAutomation] = useToggleCommunicationAutomationMutation();

  const openEditor = (automation = null, mode = "create") => {
    setEditor({ open: true, automation, mode });
  };

  const handleToggle = async (automation, isActive) => {
    if (isActive && !ready) {
      setFeedback(t("errors.setupRequired"));
      return;
    }
    if (
      isActive &&
      UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES.includes(automation.purpose)
    ) {
      setFeedback(t("automationEditor.errors.unsupportedPurpose"));
      return;
    }

    const id = getResourceId(automation);
    setFeedback("");
    setTogglingId(id);
    try {
      await toggleAutomation({ id, isActive }).unwrap();
    } catch (error) {
      setFeedback(getLocalizedApiErrorMessage(error, t("errors.toggle")));
    } finally {
      setTogglingId("");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setFeedback("");
    try {
      await deleteAutomation(getResourceId(pendingDelete)).unwrap();
      setPendingDelete(null);
    } catch (error) {
      setFeedback(getLocalizedApiErrorMessage(error, t("errors.delete")));
    }
  };

  if (view === "history") return <OutboundEmailHistoryView />;
  if (view === "templates")
    return <EmailTemplatesTable canManage={canManage} />;

  return (
    <section className="w-full space-y-5">
      {hasPermission(workspaceAccess, PERMISSIONS.ACCESS_CODES_VIEW) ? (
        <DoorAccessEmailAutomation
          canManage={
            canManage &&
            hasPermission(workspaceAccess, PERMISSIONS.ACCESS_CODES_MANAGE)
          }
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={BellAlertIcon}
          label={t("stats.total")}
          value={automations.length}
        />
        <StatCard
          icon={CheckCircleIcon}
          label={t("stats.active")}
          value={automations.filter((item) => item.isActive).length}
          tone="success"
        />
      </div>

      {feedback ? (
        <WorkspaceCard
          as="div"
          role="alert"
          className="border-warning/25 bg-warning-soft px-5 py-3 text-[13px] text-warning"
        >
          {feedback}
        </WorkspaceCard>
      ) : null}

      {pendingDelete ? (
        <WorkspaceCard
          as="div"
          role="alertdialog"
          aria-label={t("delete.title")}
          className="flex flex-col gap-3 border-warning/25 bg-warning-soft px-5 py-4 text-[13px] text-warning sm:flex-row sm:items-center"
        >
          <span className="mr-auto">
            {t("delete.message", { name: pendingDelete.name })}
          </span>
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            className="font-semibold underline"
          >
            {t("delete.cancel")}
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={isDeleting}
            className="min-h-11 rounded-full bg-danger px-4 font-semibold text-white disabled:opacity-50"
          >
            {isDeleting ? t("delete.deleting") : t("delete.confirm")}
          </button>
        </WorkspaceCard>
      ) : null}

      <AutomatedEmailsTable
        automations={automations}
        emailTemplates={emailTemplates}
        isLoading={automationQuery.isLoading}
        isError={automationQuery.isError}
        canManage={canManage}
        togglingId={togglingId}
        onCreate={() => openEditor()}
        onEdit={(automation) => openEditor(automation, "edit")}
        onDelete={setPendingDelete}
        onToggleActive={handleToggle}
      />

      {editor.open ? (
        <AutomatedEmailModal
          automation={editor.automation}
          senderEmailId={setup.id}
          emailSetup={setup}
          emailTemplates={emailTemplates}
          mode={editor.mode}
          onClose={() =>
            setEditor({ open: false, automation: null, mode: "create" })
          }
        />
      ) : null}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, tone = "neutral" }) {
  const tones = {
    neutral: "bg-[#f7f3ee] text-[#5f554e]",
    success: "bg-emerald-50 text-emerald-700",
  };

  return (
    <WorkspaceCard as="article" className="px-4 py-4">
      <div className="flex items-center gap-4">
        <div className={`rounded-full p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
        </div>
      </div>
    </WorkspaceCard>
  );
}
