import { Dialog } from "@headlessui/react";

import {
  WorkspaceDialogBackdrop,
  WorkspaceDialogBody,
  WorkspaceDialogHeader,
  WorkspaceDialogPanel,
  WorkspaceDialogViewport,
} from "@/components/dashboard/WorkspaceDialogSurface";

const resolveSize = (maxWidthClass) => {
  if (maxWidthClass?.includes("max-w-4xl")) return "wide";
  if (maxWidthClass?.includes("max-w-5xl")) return "large";
  if (maxWidthClass?.includes("max-w-6xl")) return "xlarge";
  if (maxWidthClass?.includes("max-w-2xl")) return "small";
  if (maxWidthClass?.includes("max-w-lg")) return "compact";
  return "medium";
};

export default function ResponsiveModal({
  open,
  onClose,
  title,
  description,
  closeLabel = "Close",
  children,
  maxWidthClass = "sm:max-w-3xl",
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-[100]">
      <WorkspaceDialogBackdrop />
      <WorkspaceDialogViewport layout="form">
        <WorkspaceDialogPanel layout="form" size={resolveSize(maxWidthClass)}>
          <WorkspaceDialogHeader
            title={title}
            description={description}
            onClose={onClose}
            closeLabel={closeLabel}
          />
          <WorkspaceDialogBody>{children}</WorkspaceDialogBody>
        </WorkspaceDialogPanel>
      </WorkspaceDialogViewport>
    </Dialog>
  );
}
