"use client";

import styles from "./overview.module.css";

import {
  CheckCircleIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cx, formatSignalDate } from "./overview.utils";

const priorityTone = {
  urgent: "bg-[var(--overview-danger-soft)] text-[var(--overview-danger)]",
  high: "bg-[var(--overview-warning-soft)] text-[var(--overview-warning)]",
  normal: "bg-[var(--overview-blue-soft)] text-[var(--studio-blue)]",
  low: "bg-[var(--studio-soft)] text-[var(--studio-muted)]",
};

function SignalCard({
  enabled = true,
  title,
  count,
  countLabel,
  href,
  icon: Icon,
  available,
  emptyLabel,
  children,
}) {
  const t = useTranslations("Dashboard.overview");

  if (!enabled) return null;

  return (
    <section className={`${styles.module} ${styles.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--overview-blue-soft)] text-[var(--studio-blue)]">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words text-[20px] font-medium tracking-[-0.035em] text-[var(--studio-ink)]">
              {title}
            </h2>
            {available ? (
              <p className="mt-0.5 text-[12px] text-[var(--studio-muted)]">
                {countLabel}
              </p>
            ) : null}
          </div>
        </div>
        {available ? (
          <Link
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--studio-blue)] transition hover:text-[var(--studio-blue)]"
          >
            {t("signals.open")}
            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {!available ? (
        <p className="mt-5 rounded-[16px] border border-dashed border-[var(--studio-rule)] px-4 py-5 text-[13px] leading-5 text-[var(--studio-muted)]">
          {t("signals.unavailable")}
        </p>
      ) : children ? (
        <div className="mt-4 divide-y divide-[var(--studio-rule)]">
          {children}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-[16px] bg-[var(--overview-success-soft)] px-4 py-4 text-[13px] text-[var(--overview-success)]">
          <CheckCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

export const getEnabledSignalKeys = (modules) => [
  ...(modules?.staff_tasks === true ? ["tasks"] : []),
];

export default function StudioSignals({ signals, timezone, modules }) {
  const locale = useLocale();
  const t = useTranslations("Dashboard.overview");
  const tasks = signals?.tasks ?? {};
  const taskItems = Array.isArray(tasks.items) ? tasks.items.slice(0, 3) : [];
  const enabledSignals = new Set(getEnabledSignalKeys(modules));

  if (!enabledSignals.size) return null;

  return (
    <div className={styles.signals}>
      <SignalCard
        enabled={enabledSignals.has("tasks")}
        title={t("signals.tasks.title")}
        count={tasks.openCount ?? 0}
        countLabel={t("signals.tasks.count", {
          count: tasks.openCount ?? 0,
        })}
        href="/app/operations?section=tasks"
        icon={ClipboardDocumentCheckIcon}
        available={tasks.available === true}
        emptyLabel={t("signals.tasks.empty")}
      >
        {taskItems.length
          ? taskItems.map((task) => (
              <Link
                key={task.id}
                href="/app/operations?section=tasks"
                className={styles.signalRow}
              >
                <div className="min-w-0">
                  <p className="break-words text-[14px] font-medium text-[var(--studio-ink)]">
                    {task.title || t("signals.tasks.untitled")}
                  </p>
                  <p className="mt-1 break-words text-[12px] text-[var(--studio-muted)]">
                    {task.assigneeName || t("signals.tasks.unassigned")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cx(
                      "rounded-full px-2 py-1 text-[12px] font-medium uppercase tracking-[0.08em]",
                      priorityTone[task.priority] ?? priorityTone.normal,
                    )}
                  >
                    {t(`signals.tasks.priorities.${task.priority || "normal"}`)}
                  </span>
                  {task.dueDate ? (
                    <span className="text-[12px] text-[var(--studio-muted)]">
                      {formatSignalDate(task.dueDate, locale, timezone, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))
          : null}
      </SignalCard>
    </div>
  );
}
