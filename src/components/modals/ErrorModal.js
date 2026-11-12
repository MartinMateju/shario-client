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

export default function ErrorModal({ open, setOpen, title, text, error }) {
  const language = useSelector(selectCurrentLanguage);
  const closeButtonRef = useRef(null);
  const closeLabel = translation["CLOSE"]?.[language] || "Close";

  return (
    <Dialog
      open={open}
      className="relative z-[110]"
      initialFocus={closeButtonRef}
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
            <div className="flex items-start gap-4" role="alert">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-danger-soft text-danger ring-1 ring-inset ring-danger/15">
                <ExclamationTriangleIcon
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0 space-y-2 pt-1">
                <p className="text-sm leading-6 text-ink-muted">{text}</p>
                {error ? (
                  <p className="break-words rounded-[14px] border border-danger/15 bg-danger-soft px-3 py-2 text-xs leading-5 text-danger">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </WorkspaceDialogBody>
          <WorkspaceDialogFooter>
            <button
              type="button"
              className={workspaceSecondaryButtonClass}
              onClick={() => setOpen(false)}
              ref={closeButtonRef}
            >
              {closeLabel}
            </button>
          </WorkspaceDialogFooter>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
