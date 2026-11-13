import { useTranslations } from "next-intl";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export function WorkspaceCard({
  as: Component = "article",
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cx(
        "min-w-0 max-w-full rounded-[24px] border border-line bg-white shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function WorkspaceToolbar({
  contained = false,
  className,
  children,
  ...props
}) {
  return (
    <section
      className={cx(
        "min-w-0 max-w-full space-y-4",
        contained
          ? "border-b border-line px-4 py-3.5 sm:px-5"
          : "rounded-[24px] border border-line bg-white p-3 shadow-sm sm:p-4",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function WorkspaceTableFrame({ className, children, ...props }) {
  return (
    <div
      className={cx(
        "min-w-0 max-w-full overflow-hidden rounded-[24px] border border-line bg-white shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspaceTableScroller({
  ariaLabel,
  className,
  children,
  ...props
}) {
  return (
    <div
      role={ariaLabel ? "region" : undefined}
      aria-label={ariaLabel}
      tabIndex={ariaLabel ? 0 : undefined}
      className={cx(
        "max-w-full overflow-x-auto overscroll-x-contain",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt-300",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspaceTableHeadCell({
  className,
  children,
  scope = "col",
  ...props
}) {
  return (
    <th
      scope={scope}
      className={cx(
        "border-b border-line px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function WorkspaceTableHeader({ className, children, ...props }) {
  return (
    <thead className={cx("bg-sand-50", className)} {...props}>
      {children}
    </thead>
  );
}

export function WorkspaceTableBody({ className, children, ...props }) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

export function WorkspaceTable({ className, children, ...props }) {
  return (
    <table
      data-workspace-table="true"
      className={cx(
        "w-full border-separate border-spacing-0 text-[13px] text-ink-soft",
        className,
      )}
      {...props}
    >
      {children}
    </table>
  );
}

export function WorkspaceTableRow({ className, children, ...props }) {
  return (
    <tr
      className={cx(
        "transition-colors duration-150 hover:bg-sand-50/80",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function WorkspaceTableCell({
  as: Component = "td",
  className,
  children,
  ...props
}) {
  return (
    <Component
      className={cx(
        "border-b border-line px-4 py-3.5 text-left align-middle text-[13px] text-ink-soft",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function WorkspaceMobileList({ className, children, ...props }) {
  return (
    <div className={cx("grid gap-3 md:hidden", className)} {...props}>
      {children}
    </div>
  );
}

export function WorkspaceMobileCard({
  title,
  subtitle,
  status,
  actions,
  className,
  children,
  ...props
}) {
  return (
    <WorkspaceCard className={cx("p-4", className)} {...props}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-[14px] font-semibold leading-5 text-ink">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 break-words text-[12px] leading-5 text-ink-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
      {children ? (
        <div className="mt-3 rounded-[14px] bg-sand-50 px-3.5 py-3 text-[13px] text-ink-soft">
          {children}
        </div>
      ) : null}
      {actions ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3 [&_button]:min-h-11 [&_button]:min-w-11">
          {actions}
        </div>
      ) : null}
    </WorkspaceCard>
  );
}

const STATUS_TONES = Object.freeze({
  neutral: "border-line bg-sand-50 text-ink-soft",
  info: "border-cobalt-200 bg-cobalt-50 text-cobalt-700",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/25 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
});

export function WorkspaceStatusPill({
  tone = "neutral",
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold leading-4",
        STATUS_TONES[tone] || STATUS_TONES.neutral,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function WorkspaceRowActions({ className, children, ...props }) {
  return (
    <div
      className={cx(
        "flex items-center justify-end gap-1.5 [&_button]:min-h-11 [&_button]:min-w-11",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function WorkspacePagination({
  page,
  pageCount,
  onPrevious,
  onNext,
  previousLabel,
  nextLabel,
  pageLabel,
  className,
  ...props
}) {
  const commonT = useTranslations("Common");
  const resolvedPage = Math.max(1, Number(page) || 1);
  const resolvedPageCount = Math.max(1, Number(pageCount) || 1);

  return (
    <nav
      aria-label={pageLabel || commonT("pagination")}
      className={cx(
        "flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <p className="text-center text-[12px] font-medium text-ink-muted sm:text-left">
        {resolvedPage} / {resolvedPageCount}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          onClick={onPrevious}
          disabled={resolvedPage <= 1}
          className="min-h-11 rounded-full border border-line bg-white px-4 text-[12px] font-semibold text-ink-soft transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"
        >
          {previousLabel ?? commonT("previousPage")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={resolvedPage >= resolvedPageCount}
          className="min-h-11 rounded-full border border-line bg-white px-4 text-[12px] font-semibold text-ink-soft transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"
        >
          {nextLabel ?? commonT("nextPage")}
        </button>
      </div>
    </nav>
  );
}

export function WorkspaceEmptyState({
  icon: Icon,
  title,
  description,
  action,
  contained = false,
  className,
  ...props
}) {
  return (
    <div
      className={cx(
        "flex min-h-[280px] items-center justify-center px-6 py-12 text-center",
        !contained &&
          "rounded-[24px] border border-dashed border-line bg-white/70",
        className,
      )}
      {...props}
    >
      <div className="max-w-sm">
        {Icon ? (
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-sand-100 text-sand-700">
            <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
          </span>
        ) : null}
        <h2 className="mt-4 break-words text-[16px] font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 break-words text-[12px] leading-5 text-ink-muted">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function WorkspaceTruncatedText({
  as: Component = "span",
  children,
  className,
  title,
  ...props
}) {
  const resolvedTitle =
    title ??
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : undefined);

  return (
    <Component
      className={cx("block min-w-0 truncate", className)}
      title={resolvedTitle}
      {...props}
    >
      {children}
    </Component>
  );
}
