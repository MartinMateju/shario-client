"use client";

import { useLegacyText } from "@/i18n/useLegacyCopy";
import { useCallback, useMemo, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";

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
import { Link } from "@/i18n/navigation";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";

export default function ConfirmationModal({
  open,
  show,
  setOpen,
  onClose,
  title,
  text,
  message,
  href = "#",
  onConfirm,
  confirmText,
  continueText,
  cancelText,
  confirmIntent,
  customerMode = false,
  tenantStylePresetId = null,
  tenantThemeStyle = null,
  isLoading = false,
  showSuccessIcon = true,
}) {
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const language = useSelector(selectCurrentLanguage);
  const secondaryButtonRef = useRef(null);

  const t = useMemo(
    () =>
      (key, fallback = "") =>
        translation?.[key]?.[language] ?? fallback,
    [language, translation],
  );

  const isOpen =
    typeof open === "boolean" ? open : typeof show === "boolean" ? show : false;
  const displayText = message ?? text ?? "";
  const resolvedTitle = title || t("CONFIRMATION");

  const handleClose = useCallback(() => {
    if (isLoading) return;

    if (typeof onClose === "function") {
      onClose();
      return;
    }

    if (typeof setOpen === "function") {
      setOpen(false);
    }
  }, [isLoading, onClose, setOpen]);

  const primaryButtonText = isLoading
    ? t("LOADING")
    : confirmText || t("CONTINUE");
  const secondaryButtonText =
    cancelText || legacyText("ConfirmationModal_Close_bbfa7");

  return (
    <Dialog
      open={isOpen}
      className="relative z-[110]"
      initialFocus={onConfirm ? secondaryButtonRef : undefined}
      onClose={handleClose}
      data-tenant-style={
        customerMode ? tenantStylePresetId || undefined : undefined
      }
      style={customerMode ? tenantThemeStyle || undefined : undefined}
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            title={resolvedTitle}
            onClose={handleClose}
            closeLabel={secondaryButtonText}
            closeDisabled={isLoading}
          />
          <WorkspaceDialogBody>
            <div className="flex flex-col items-center text-center">
              {showSuccessIcon && (
                <span
                  data-confirmation-success
                  className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-success-soft text-success ring-1 ring-inset ring-success/15"
                >
                  <CheckIcon className="h-7 w-7" aria-hidden="true" />
                </span>
              )}
              <div
                className={`${showSuccessIcon ? "mt-4 " : ""}max-w-md text-sm leading-6 text-ink-muted`}
              >
                {typeof displayText === "string" ? (
                  <p>{displayText}</p>
                ) : (
                  displayText
                )}
              </div>
            </div>
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter className="sm:justify-center">
            {onConfirm ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className={workspaceSecondaryButtonClass}
                  ref={secondaryButtonRef}
                >
                  {secondaryButtonText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  data-tenant-intent={confirmIntent || undefined}
                  className={workspacePrimaryButtonClass}
                >
                  {primaryButtonText}
                </button>
              </>
            ) : (
              <Link
                href={href}
                onClick={handleClose}
                data-tenant-button="primary"
                className={workspacePrimaryButtonClass}
              >
                {continueText || t("CONTINUE")}
              </Link>
            )}
          </WorkspaceDialogFooter>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
