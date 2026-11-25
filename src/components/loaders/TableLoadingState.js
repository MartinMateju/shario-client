export default function TableLoadingState({ label, refreshing = false }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="table-loading-state"
      data-mode={refreshing ? "refreshing" : "initial"}
      className={
        refreshing
          ? "flex items-center gap-2 px-5 py-2 text-xs text-ink-muted"
          : "flex min-h-48 items-center justify-center gap-3 p-6 text-sm text-ink-muted"
      }
    >
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-primary/20 border-t-brand-primary"
      />
      <span>{label}</span>
    </div>
  );
}
