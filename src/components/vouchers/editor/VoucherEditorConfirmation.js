"use client";

import { Dialog, DialogDescription, DialogTitle } from "@headlessui/react";
import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";

export default function VoucherEditorConfirmation({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-[130]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel size="compact" layout="compact" className="p-6">
          <DialogTitle className="text-xl font-semibold tracking-tight text-ink">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-6 text-ink-muted">
            {description}
          </DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className={workspaceSecondaryButtonClass}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={workspacePrimaryButtonClass}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
