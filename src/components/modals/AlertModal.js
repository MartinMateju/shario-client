import { useRef } from "react";
import { Dialog } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useSelector } from "react-redux";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogFooter,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";
import { workspaceSecondaryButtonClass } from "@/components/dashboard/WorkspaceFormSurface";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import translation from "@/translations/translation";

export default function AlertModal({
  open,
  setOpen,
  onSubmitClicked,
  title,
  text,
  buttonText = "",
}) {
  const language = useSelector(selectCurrentLanguage);
  const cancelButtonRef = useRef(null);
  const closeLabel = translation["CLOSE"]?.[language] || "Close";

  return (
    <Dialog
      open={open}
      className="relative z-[110]"
      initialFocus={cancelButtonRef}
      onClose={setOpen}
    >
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="compact">
        <WorkspaceDialogPanel layout="compact" size="compact">
          <WorkspaceDialogHeader
            title={title}
            onClose={() => setOpen(false)}
            closeLabel={closeLabel}
          />
          <WorkspaceDialogBody>
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-danger-soft text-danger ring-1 ring-inset ring-danger/15">
                <ExclamationTriangleIcon
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </span>
              <p className="pt-1 text-sm leading-6 text-ink-muted">{text}</p>
            </div>
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter>
            <button
              type="button"
              className={workspaceSecondaryButtonClass}
              onClick={() => setOpen(false)}
              ref={cancelButtonRef}
            >
              {translation["CANCEL"]?.[language] || "Cancel"}
            </button>
            <button
              type="button"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-danger px-6 text-[13px] font-semibold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 focus-visible:ring-offset-2 sm:min-h-11 sm:w-auto sm:text-[12px]"
              onClick={onSubmitClicked}
            >
              {buttonText || translation["REMOVE"]?.[language] || "Remove"}
            </button>
          </WorkspaceDialogFooter>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
