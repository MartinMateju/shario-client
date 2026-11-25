import { CheckIcon } from "@heroicons/react/24/outline";

export default function LaunchWorkflowHeader({ completed, total, t }) {
  const percentage = total ? Math.round((completed / total) * 100) : 100;
  const progressLabel = t("workflowQuestions.progress", { completed, total });

  return (
    <header className="rounded-[26px] border border-line bg-white p-6 text-ink shadow-card sm:p-8">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-cobalt-600">
        {t("workflowQuestions.eyebrow")}
      </p>
      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-[34px]">
        {t("workflowQuestions.title")}
      </h1>
      <p className="mt-3 max-w-[58ch] text-[14px] leading-6 text-ink-muted sm:text-[15px]">
        {t("workflowQuestions.description")}
      </p>

      <div className="mt-6 border-t border-line pt-5">
        <p className="flex items-center gap-2 text-[12px] font-semibold leading-5 text-ink sm:text-[13px]">
          {completed === total && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
              <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          {progressLabel}
        </p>
        <div
          role="progressbar"
          aria-label={t("workflowQuestions.eyebrow")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-valuetext={progressLabel}
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <span
            className="block h-full rounded-full bg-cobalt-500 transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </header>
  );
}
