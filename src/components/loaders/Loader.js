export default function Loader({
  label = "Preparing your studio",
  fullscreen = true,
}) {
  return (
    <div
      className={[
        "flex items-center justify-center bg-canvas text-[#1f1b18]",
        fullscreen ? "min-h-screen" : "min-h-[240px]",
      ].join(" ")}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="relative flex flex-col items-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45 blur-3xl" />

        <p className="relative mb-7 text-[10px] font-semibold uppercase tracking-[0.34em] text-accent-text">
          {label}
        </p>

        <div className="relative flex items-center gap-2.5" aria-hidden="true">
          <span className="loader-dot animation-delay-0" />
          <span className="loader-dot animation-delay-150" />
          <span className="loader-dot animation-delay-300" />
        </div>

        <span className="sr-only">Loading</span>
      </div>

      <style jsx>{`
        .loader-dot {
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: var(--color-brand-accent);
          opacity: 0.28;
          transform: scale(1);
          animation: loaderPulse 1.35s ease-in-out infinite;
        }

        .animation-delay-0 {
          animation-delay: 0ms;
        }

        .animation-delay-150 {
          animation-delay: 150ms;
        }

        .animation-delay-300 {
          animation-delay: 300ms;
        }

        @keyframes loaderPulse {
          0%,
          100% {
            opacity: 0.28;
            transform: scale(1);
          }

          50% {
            opacity: 1;
            transform: scale(1.55);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .loader-dot {
            animation: none;
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  );
}
