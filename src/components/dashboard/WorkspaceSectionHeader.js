const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WorkspaceSectionHeader({
  showTitle = true,
  eyebrow,
  title,
  description,
  actions,
  className,
}) {
  if (!showTitle && !actions) {
    return null;
  }

  return (
    <header
      className={cx(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        !showTitle && "sm:justify-end",
        className,
      )}
    >
      {showTitle ? (
        <div>
          {eyebrow ? (
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-terracotta-600">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-ink sm:text-[34px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}

      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
