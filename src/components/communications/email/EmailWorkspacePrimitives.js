"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

import { Modal as CommunicationsModal } from "../CommunicationsPrimitives";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function EmailStatusBanner({ tone = "success", children }) {
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

export function EmailModal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
}) {
  return (
    <CommunicationsModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      {children}
    </CommunicationsModal>
  );
}
