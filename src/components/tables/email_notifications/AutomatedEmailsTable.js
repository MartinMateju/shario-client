"use client";

import {
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  OFFSET_EMAIL_SCHEDULE_TYPES,
  UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES,
  getResourceId,
  normalizeAutomationContent,
  normalizeScheduleType,
} from "@/components/communications/email/emailContent";
import {
  WorkspaceEmptyState,
  WorkspaceMobileCard,
  WorkspaceRowActions,
  WorkspaceStatusPill,
  WorkspaceTable,
  WorkspaceTableBody,
  WorkspaceTableCell,
  WorkspaceTableFrame,
  WorkspaceTableHeadCell,
  WorkspaceTableHeader,
  WorkspaceTableRow,
  WorkspaceTableScroller,
  WorkspaceToolbar,
} from "@/components/dashboard/WorkspaceDataSurface";
import { workspacePrimaryButtonClass } from "@/components/dashboard/WorkspaceFormSurface";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function AutomatedEmailsTable({
  automations = [],
  emailTemplates = [],
  isLoading = false,
  isError = false,
  canManage = false,
  togglingId = "",
  onCreate,
  onEdit,
  onDelete,
  onToggleActive,
}) {
  const t = useTranslations("EmailAutomations.list");

  return (
    <section>
      <WorkspaceTableFrame className="overflow-hidden">
        <WorkspaceToolbar
          contained
          className="bg-sand-50/80 sm:flex sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
        >
          <div>
            <h2
              id="automated-emails-heading"
              className="text-[14px] font-semibold tracking-[-0.02em] text-ink"
            >
              {t("title")}
            </h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-muted">
              {t("description")}
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={onCreate}
              className={workspacePrimaryButtonClass}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              {t("create")}
            </button>
          ) : null}
        </WorkspaceToolbar>

        {isLoading ? <StateMessage>{t("loading")}</StateMessage> : null}
        {isError ? (
          <StateMessage tone="error">{t("error")}</StateMessage>
        ) : null}
        {!isLoading && !isError && automations.length === 0 ? (
          <WorkspaceEmptyState
            contained
            icon={EnvelopeIcon}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : null}

        {!isLoading && !isError && automations.length > 0 ? (
          <>
            <div className="grid gap-3 bg-canvas p-3 lg:hidden">
              {automations.map((automation) => (
                <AutomationCard
                  key={getResourceId(automation)}
                  automation={automation}
                  template={emailTemplates.find(
                    (template) =>
                      getResourceId(template) ===
                      getResourceId(automation.templateId),
                  )}
                  canManage={canManage}
                  isToggling={togglingId === getResourceId(automation)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleActive={onToggleActive}
                  t={t}
                />
              ))}
            </div>
            <WorkspaceTableScroller
              ariaLabel={t("title")}
              className="hidden lg:block"
            >
              <WorkspaceTable
                aria-label={t("title")}
                className="min-w-[1040px]"
              >
                <WorkspaceTableHeader>
                  <tr>
                    <WorkspaceTableHeadCell>
                      {t("columns.name")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.trigger")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.languages")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell>
                      {t("columns.status")}
                    </WorkspaceTableHeadCell>
                    <WorkspaceTableHeadCell className="text-right">
                      {t("columns.actions")}
                    </WorkspaceTableHeadCell>
                  </tr>
                </WorkspaceTableHeader>
                <WorkspaceTableBody>
                  {automations.map((automation) => (
                    <AutomationRow
                      key={getResourceId(automation)}
                      automation={automation}
                      template={emailTemplates.find(
                        (template) =>
                          getResourceId(template) ===
                          getResourceId(automation.templateId),
                      )}
                      canManage={canManage}
                      isToggling={togglingId === getResourceId(automation)}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onToggleActive={onToggleActive}
                      t={t}
                    />
                  ))}
                </WorkspaceTableBody>
              </WorkspaceTable>
            </WorkspaceTableScroller>
          </>
        ) : null}
      </WorkspaceTableFrame>
    </section>
  );
}

function AutomationRow({
  automation,
  template,
  canManage,
  isToggling,
  onEdit,
  onDelete,
  onToggleActive,
  t,
}) {
  const content = normalizeAutomationContent(automation, template);

  return (
    <WorkspaceTableRow>
      <WorkspaceTableCell
        as="th"
        scope="row"
        className="text-left font-semibold text-ink"
      >
        <p>{automation.name}</p>
        <p className="mt-1 max-w-xs truncate text-[11px] font-normal text-ink-muted">
          {automation.subject ||
            content.variants[content.defaultLocale]?.subject ||
            t("noSubject")}
        </p>
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <SchedulePill automation={automation} t={t} />
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <LanguageBadges content={content} t={t} />
      </WorkspaceTableCell>
      <WorkspaceTableCell>
        <StatusButton
          automation={automation}
          disabled={!canManage || isToggling}
          onToggle={onToggleActive}
          t={t}
        />
      </WorkspaceTableCell>
      <WorkspaceTableCell className="text-right">
        {canManage ? (
          <WorkspaceRowActions>
            <IconButton label={t("edit")} onClick={() => onEdit?.(automation)}>
              <PencilSquareIcon className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={t("delete")}
              danger
              onClick={() => onDelete?.(automation)}
            >
              <TrashIcon className="h-4 w-4" />
            </IconButton>
          </WorkspaceRowActions>
        ) : (
          <span className="text-[11px] text-ink-muted">{t("readOnly")}</span>
        )}
      </WorkspaceTableCell>
    </WorkspaceTableRow>
  );
}

function AutomationCard({
  automation,
  template,
  canManage,
  isToggling,
  onEdit,
  onDelete,
  onToggleActive,
  t,
}) {
  const content = normalizeAutomationContent(automation, template);
  const subject =
    automation.subject ||
    content.variants[content.defaultLocale]?.subject ||
    t("noSubject");

  return (
    <WorkspaceMobileCard
      title={automation.name}
      subtitle={subject}
      status={
        <StatusButton
          automation={automation}
          disabled={!canManage || isToggling}
          onToggle={onToggleActive}
          t={t}
        />
      }
      actions={
        canManage ? (
          <>
            <MobileAction
              onClick={() => onEdit?.(automation)}
              icon={<PencilSquareIcon className="h-4 w-4" />}
            >
              {t("edit")}
            </MobileAction>
            <MobileAction
              danger
              onClick={() => onDelete?.(automation)}
              icon={<TrashIcon className="h-4 w-4" />}
            >
              {t("delete")}
            </MobileAction>
          </>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <SchedulePill automation={automation} t={t} />
        <LanguageBadges content={content} t={t} />
      </div>
    </WorkspaceMobileCard>
  );
}

function SchedulePill({ automation, t }) {
  const type = normalizeScheduleType(automation.scheduleType);
  let detail = t(`triggers.${type}`);
  if (OFFSET_EMAIL_SCHEDULE_TYPES.includes(type)) {
    detail = t("schedule.offset", {
      trigger: detail,
      minutes: automation.minutesOffset || 0,
    });
  } else if (type === "daily") {
    detail = t("schedule.daily", { time: automation.sendTime || "09:00" });
  } else if (type === "weekly") {
    detail = t("schedule.weekly", {
      day: t(`days.${automation.dayOfWeek || "monday"}`),
      time: automation.sendTime || "09:00",
    });
  } else if (type === "monthly") {
    detail = t("schedule.monthly", {
      day: automation.dayOfMonth || 1,
      time: automation.sendTime || "09:00",
    });
  }

  return <WorkspaceStatusPill tone="neutral">{detail}</WorkspaceStatusPill>;
}

function LanguageBadges({ content, t }) {
  return (
    <div className="flex gap-1.5">
      {["cs", "en"].map((locale) => {
        const variant = content.variants[locale];
        const complete = Boolean(
          !content.fallbackLocales?.includes(locale) &&
          variant?.subject &&
          (variant?.bodyText || variant?.bodyHtml),
        );

        return (
          <WorkspaceStatusPill
            key={locale}
            title={complete ? t("languageReady") : t("languageMissing")}
            tone={complete ? "success" : "warning"}
            className="uppercase"
          >
            {locale}
          </WorkspaceStatusPill>
        );
      })}
    </div>
  );
}

function StatusButton({ automation, disabled, onToggle, t }) {
  const active = Boolean(automation.isActive);
  const activationUnsupported =
    !active &&
    UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES.includes(automation.purpose);

  return (
    <button
      type="button"
      disabled={disabled || activationUnsupported}
      onClick={() => onToggle?.(automation, !active)}
      aria-label={
        activationUnsupported
          ? t("activationUnavailable")
          : active
            ? t("deactivate")
            : t("activate")
      }
      title={activationUnsupported ? t("activationUnavailable") : undefined}
      className={cx(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-success/20 bg-success-soft text-success"
          : "border-line bg-sand-50 text-ink-muted",
      )}
    >
      {active ? (
        <CheckCircleIcon className="h-4 w-4" />
      ) : (
        <ClockIcon className="h-4 w-4" />
      )}
      {active ? t("active") : t("inactive")}
    </button>
  );
}

function StateMessage({ children, tone = "neutral" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "px-5 py-14 text-center text-[13px]",
        tone === "error" ? "text-danger" : "text-ink-muted",
      )}
    >
      {children}
    </div>
  );
}

function IconButton({ children, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cx(
        "inline-flex items-center justify-center rounded-full border bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25",
        danger
          ? "border-danger/20 text-danger hover:bg-danger-soft"
          : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function MobileAction({ children, icon, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-full border px-4 text-[12px] font-semibold",
        danger
          ? "border-danger/20 text-danger hover:bg-danger-soft"
          : "border-line bg-white text-ink-soft hover:border-line-strong",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
