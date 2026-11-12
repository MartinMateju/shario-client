"use client";

import {
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const PANEL_SIZES = Object.freeze({
  compact: "sm:max-w-lg",
  small: "sm:max-w-2xl",
  medium: "sm:max-w-3xl",
  wide: "sm:max-w-4xl",
  large: "sm:max-w-5xl",
  xlarge: "sm:max-w-6xl",
});

const PANEL_LAYOUTS = Object.freeze({
  form: [
    "h-dvh max-h-dvh rounded-none border-0 bg-canvas pt-[env(safe-area-inset-top)]",
    "sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border sm:border-line sm:pt-0",
  ].join(" "),
  modal: [
    "max-h-[calc(100dvh-0.75rem)] rounded-t-[24px] border border-line bg-surface-raised",
    "sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px]",
  ].join(" "),
  compact: [
    "max-h-[min(85dvh,42rem)] rounded-t-[24px] border border-line bg-surface-raised",
    "sm:rounded-[24px]",
  ].join(" "),
  media: [
    "max-h-dvh rounded-none border-0 bg-surface-raised",
    "sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border sm:border-line",
  ].join(" "),
});

const VIEWPORT_LAYOUTS = Object.freeze({
  form: "items-stretch sm:items-center sm:p-6",
  modal: "items-end p-0 sm:items-center sm:p-6",
  compact: "items-end p-0 sm:items-center sm:p-6",
  media: "items-stretch p-0 sm:items-center sm:p-6",
});

export function WorkspaceDialogBackdrop({ className, ...props }) {
  return (
    <DialogBackdrop
      transition
      data-dialog-backdrop
      className={cx(
        "fixed inset-0 bg-[#171717]/35 backdrop-blur-[3px] transition duration-200 ease-out data-closed:opacity-0 motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

export function WorkspaceDialogViewport({
  layout = "form",
  className,
  scrollportStyle,
  children,
  ...props
}) {
  return (
    <div
      data-dialog-scrollport
      className="fixed inset-0 overflow-y-auto overscroll-y-contain"
      style={scrollportStyle}
    >
      <div
        data-dialog-viewport
        className={cx(
          "flex min-h-full justify-center",
          VIEWPORT_LAYOUTS[layout] || VIEWPORT_LAYOUTS.form,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function WorkspaceDialogPanel({
  layout = "form",
  size = "large",
  tone = "workspace",
  className,
  children,
  ...props
}) {
  const resolvedLayout = PANEL_LAYOUTS[layout] ? layout : "form";

  return (
    <DialogPanel
      transition
      data-dialog-layout={resolvedLayout}
      data-dialog-tone={tone}
      data-workspace-dialog={resolvedLayout === "form" ? "form" : undefined}
      className={cx(
        "flex w-full origin-bottom flex-col overflow-hidden text-ink shadow-floating transition duration-200 ease-out data-closed:translate-y-4 data-closed:opacity-0 motion-reduce:transform-none motion-reduce:transition-none",
        "sm:origin-center sm:data-closed:translate-y-0 sm:data-closed:scale-[0.985]",
        PANEL_LAYOUTS[resolvedLayout],
        PANEL_SIZES[size] || PANEL_SIZES.large,
        className,
      )}
      {...props}
    >
      {children}
    </DialogPanel>
  );
}

export function WorkspaceDialogCloseButton({
  label,
  className,
  iconClassName,
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-muted shadow-xs transition hover:border-line-strong hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <XMarkIcon className={cx("h-5 w-5", iconClassName)} aria-hidden="true" />
    </button>
  );
}

export function WorkspaceDialogHeader({
  eyebrow,
  title,
  description,
  onClose,
  closeLabel = "Close",
  closeDisabled = false,
  className,
  children,
}) {
  return (
    <header
      data-dialog-header
      className={cx(
        "flex shrink-0 items-start justify-between gap-4 border-b border-line bg-white/95 px-4 py-4 backdrop-blur sm:px-7 sm:py-5",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {eyebrow}
          </p>
        ) : null}
        <DialogTitle className="text-[19px] font-semibold tracking-[-0.03em] text-ink sm:text-[22px]">
          {title}
        </DialogTitle>
        {description ? (
          <DialogDescription className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-muted sm:text-[13px]">
            {description}
          </DialogDescription>
        ) : null}
        {children}
      </div>
      {onClose ? (
        <WorkspaceDialogCloseButton
          label={closeLabel}
          onClick={onClose}
          disabled={closeDisabled}
        />
      ) : null}
    </header>
  );
}

export function WorkspaceDialogBody({ className, children, ...props }) {
  return (
    <div
      data-dialog-body
      className={cx(
        "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-7 sm:py-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspaceDialogFooter({ className, children, ...props }) {
  return (
    <footer
      data-dialog-footer
      className={cx(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-white/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7 sm:py-4",
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}
