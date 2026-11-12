"use client";

import { Dialog } from "@headlessui/react";
import {
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";

import {
  cx,
  humanize,
  normalizeChannel,
  normalizePriority,
} from "./communications.utils";

const channelStyles = {
  email: "bg-cobalt-50 text-cobalt-700 ring-cobalt-200",
  whatsapp: "bg-success-soft text-success ring-emerald-200",
  instagram: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
  in_app: "bg-sand-100 text-sand-800 ring-sand-200",
  sms: "bg-coral-50 text-coral-700 ring-coral-200",
};

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <rect
        x="3.25"
        y="3.25"
        width="17.5"
        height="17.5"
        rx="5.25"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.7" r="1.15" fill="currentColor" />
    </svg>
  );
}

const channelIcons = {
  email: EnvelopeIcon,
  whatsapp: ChatBubbleLeftRightIcon,
  instagram: InstagramIcon,
  in_app: GlobeAltIcon,
  sms: ChatBubbleLeftRightIcon,
};

export function ChannelBadge({ channel, compact = false, label }) {
  const t = useTranslations("Communications");
  const normalized = normalizeChannel(channel);
  const Icon = channelIcons[normalized];
  const channelLabel =
    normalized === "in_app"
      ? t("channels.portal")
      : ["email", "whatsapp", "instagram"].includes(normalized)
        ? t(`channels.${normalized}`)
        : humanize(normalized);

  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] ring-1 ring-inset",
        channelStyles[normalized],
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {!compact && (label || channelLabel)}
    </span>
  );
}

const priorityStyles = {
  low: "bg-surface-muted text-ink-muted",
  normal: "bg-cobalt-50 text-cobalt-700",
  high: "bg-warning-soft text-warning",
  urgent: "bg-danger-soft text-danger",
};

export function PriorityBadge({ priority, label }) {
  const normalized = normalizePriority(priority);

  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em]",
        priorityStyles[normalized],
      )}
    >
      {label || humanize(normalized)}
    </span>
  );
}

export function Avatar({ name, initials, className = "" }) {
  const value =
    initials ||
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  return (
    <span
      className={cx(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral-100 text-xs font-semibold text-terracotta-700 ring-1 ring-inset ring-coral-200",
        className,
      )}
      aria-hidden="true"
    >
      {value || "?"}
    </span>
  );
}

export function StatusBanner({ tone = "success", children }) {
  const styles = {
    success: "border-success/15 bg-success-soft text-success",
    warning: "border-warning/15 bg-warning-soft text-warning",
    error: "border-danger/15 bg-danger-soft text-danger",
    info: "border-cobalt-200 bg-cobalt-50 text-cobalt-700",
  };
  const Icon =
    tone === "error" || tone === "warning"
      ? ExclamationTriangleIcon
      : CheckCircleIcon;

  return (
    <div
      className={cx(
        "flex items-start gap-2 rounded-[14px] border px-3 py-2.5 text-xs",
        styles[tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function LoadingState({ label }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center p-8 text-center">
      <div>
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-cobalt-100 border-t-cobalt-500" />
        <p className="mt-3 text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon = ChatBubbleLeftRightIcon,
  title,
  description,
  action,
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-sand-100 text-sand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="mt-1.5 text-sm leading-6 text-ink-muted">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({ title, description, actionLabel, onRetry }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <ExclamationTriangleIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-muted">{description}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-full border border-line-strong bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-cobalt-300 hover:text-cobalt-700"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
}) {
  const t = useTranslations("Communications");
  const sizes = {
    md: "compact",
    lg: "small",
    xl: "wide",
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="modal">
        <WorkspaceDialogPanel layout="modal" size={sizes[size] || sizes.lg}>
          <WorkspaceDialogHeader
            title={title}
            description={description}
            onClose={onClose}
            closeLabel={t("actions.close")}
          />
          <WorkspaceDialogBody className="p-0 sm:p-0">
            {children}
          </WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <label
      className={cx(
        "flex items-start justify-between gap-5",
        disabled && "opacity-55",
      )}
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-ink-muted">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300 disabled:cursor-not-allowed",
          checked ? "bg-cobalt-500" : "bg-line-strong",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </button>
    </label>
  );
}
