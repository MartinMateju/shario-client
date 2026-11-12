"use client";

import { useRef } from "react";
import { Dialog } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogFooter,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import { workspaceSecondaryButtonClass } from "@/components/dashboard/WorkspaceFormSurface";

const variantStyles = {
  danger: {
    iconWrapper: "bg-danger-soft text-danger ring-danger/15",
    infoBox: "border-danger/15 bg-danger-soft text-danger",
    confirmButton:
      "bg-danger text-white hover:brightness-95 focus-visible:ring-danger/30",
  },
  warning: {
    iconWrapper: "bg-warning-soft text-warning ring-warning/15",
    infoBox: "border-warning/15 bg-warning-soft text-warning",
    confirmButton:
      "bg-warning text-white hover:brightness-95 focus-visible:ring-warning/30",
  },
  neutral: {
    iconWrapper: "bg-cobalt-50 text-cobalt-700 ring-cobalt-200",
    infoBox: "border-cobalt-200 bg-cobalt-50 text-cobalt-700",
    confirmButton:
      "bg-cobalt-500 text-white hover:bg-cobalt-600 focus-visible:ring-cobalt-500/30",
  },
};

export default function ConfirmationModalWindow({
  open,
  title = "Potvrdit akci",
  description,
  highlightedText,
  infoText,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  loadingLabel = "Pracuji...",
  isLoading = false,
  disabled = false,
  variant = "danger",
  icon: Icon = ExclamationTriangleIcon,
  onClose,
  onConfirm,
}) {
  const cancelButtonRef = useRef(null);
  const styles = variantStyles[variant] || variantStyles.danger;
  const requestClose = isLoading ? () => {} : onClose;

  return (
    <Dialog
      open={open}
      className="relative z-[110]"
      initialFocus={cancelButtonRef}
      onClose={requestClose}
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            title={title}
            onClose={onClose}
            closeLabel={cancelLabel}
            closeDisabled={isLoading}
          />
          <WorkspaceDialogBody>
            <div className="flex items-start gap-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ring-1 ring-inset ${styles.iconWrapper}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                {description ? (
                  <p className="text-sm leading-6 text-ink-muted">
                    {description}{" "}
                    {highlightedText ? (
                      <span className="font-semibold text-ink">
                        {highlightedText}
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {infoText ? (
                  <div
                    className={`mt-4 rounded-[14px] border px-4 py-3 text-sm leading-6 ${styles.infoBox}`}
                  >
                    {infoText}
                  </div>
                ) : null}
              </div>
            </div>
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={workspaceSecondaryButtonClass}
              ref={cancelButtonRef}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading || disabled}
              className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:text-[12px] ${styles.confirmButton}`}
            >
              {isLoading ? loadingLabel : confirmLabel}
            </button>
          </WorkspaceDialogFooter>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
