const cx = (...classes) => classes.filter(Boolean).join(" ");

export const workspaceLabelClass =
  "block min-w-0 text-[12px] font-semibold leading-5 text-ink-soft";

export const workspaceInputClass =
  "mt-2 min-h-12 w-full min-w-0 rounded-[14px] border border-line bg-white px-3.5 text-base text-ink shadow-xs outline-none transition placeholder:text-ink-subtle hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted disabled:opacity-75 aria-invalid:border-danger aria-invalid:focus:ring-danger/10 sm:text-[13px]";

export const workspaceTextareaClass = cx(
  workspaceInputClass,
  "min-h-[112px] resize-y py-3 leading-5",
);

export const workspacePrimaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-[13px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-11 sm:w-auto sm:text-[12px]";

export const workspaceSecondaryButtonClass =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:w-auto sm:text-[12px]";

export function WorkspaceFormSection({
  as: Component = "section",
  title,
  description,
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cx(
        "rounded-[20px] border border-line bg-white p-4 shadow-xs sm:p-5",
        className,
      )}
      {...props}
    >
      {title || description ? (
        <header>
          {title ? (
            <h3 className="text-[13px] font-semibold tracking-[-0.02em] text-ink">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-1 text-[11px] leading-5 text-ink-muted">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </Component>
  );
}

export function WorkspaceFormActions({ className, children, ...props }) {
  return (
    <footer
      className={cx(
        "sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-line bg-white/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7 sm:py-4",
        className,
      )}
      {...props}
    >
      {children}
    </footer>
  );
}
