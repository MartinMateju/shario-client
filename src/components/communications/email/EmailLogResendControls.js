"use client";

import { useRef } from "react";
import {
  Dialog,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogFooter,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import {
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from "@/components/dashboard/WorkspaceFormSurface";

export function emailLogReason(reason, t) {
  return reason && t.has(`reasons.${reason}`) ? t(`reasons.${reason}`) : null;
}

export function EmailLogActions({ log, disabled, onResend, t }) {
  return (
    <Menu as="div" className="relative flex justify-end">
      <MenuButton
        disabled={disabled}
        aria-label={`${t("resend.actionMenu")}: ${log.recipientEmail || "—"}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] border border-line bg-white text-ink-muted transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 disabled:opacity-50"
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>
      <MenuItems
        transition
        anchor="bottom end"
        portal
        className="z-[150] w-56 origin-top-right rounded-[13px] border border-line bg-white p-1.5 shadow-floating transition duration-100 ease-out [--anchor-gap:6px] focus:outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        <MenuItem>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onResend(log)}
            className="flex min-h-11 w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-[12px] font-medium text-ink data-focus:bg-surface-muted disabled:opacity-50"
          >
            <PaperAirplaneIcon
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {t("resend.action")}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

export function EmailLogResendDialog({
  log,
  submitting,
  error,
  blocked,
  onClose,
  onConfirm,
  t,
}) {
  const cancelRef = useRef(null);
  const close = () => {
    if (!submitting) onClose();
  };

  return (
    <Dialog
      open
      className="relative z-[110]"
      initialFocus={cancelRef}
      onClose={close}
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            title={t("resend.title")}
            description={t("resend.description")}
            onClose={close}
            closeLabel={t("resend.cancel")}
            closeDisabled={submitting}
          />
          <WorkspaceDialogBody>
            <dl className="space-y-4 rounded-[14px] border border-line bg-surface-muted p-4 text-sm">
              <div>
                <dt className="text-xs font-semibold text-ink-muted">
                  {t("resend.recipient")}
                </dt>
                <dd className="mt-1 [overflow-wrap:anywhere]">
                  {log.recipientEmail || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-muted">
                  {t("resend.subject")}
                </dt>
                <dd className="mt-1 [overflow-wrap:anywhere]">
                  {log.subject || "—"}
                </dd>
              </div>
            </dl>
            {error ? (
              <p role="alert" className="mt-4 text-sm leading-6 text-danger">
                {error}
              </p>
            ) : null}
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter>
            <button
              type="button"
              ref={cancelRef}
              disabled={submitting}
              onClick={close}
              className={workspaceSecondaryButtonClass}
            >
              {t("resend.cancel")}
            </button>
            <button
              type="button"
              disabled={submitting || blocked}
              onClick={onConfirm}
              className={workspacePrimaryButtonClass}
            >
              {t(submitting ? "resend.submitting" : "resend.confirm")}
            </button>
          </WorkspaceDialogFooter>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
