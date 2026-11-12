export default function Divider({ text, onClick, isActive = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isActive}
      className={`
        group flex w-full items-center justify-between gap-4 rounded-[18px]
        px-4 py-4 text-left transition-all duration-200
        sm:px-5
        ${
          isActive
            ? "bg-white border border-[var(--unnamed-color-b3a292)]"
            : "bg-transparent border border-transparent hover:bg-white/70 hover:border-black/5"
        }
      `}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-full border
            text-lg leading-none transition-colors duration-200
            ${
              isActive
                ? "border-[var(--unnamed-color-b3a292)] text-[var(--unnamed-color-b3a292)]"
                : "border-black/10 text-black/50 group-hover:border-[var(--unnamed-color-b3a292)] group-hover:text-[var(--unnamed-color-b3a292)]"
            }
          `}
        >
          {isActive ? "−" : "+"}
        </span>

        <span
          className={`
            truncate font-medium text-base uppercase tracking-[0.14em] sm:text-lg
            ${
              isActive
                ? "text-[var(--unnamed-color-b3a292)]"
                : "text-black group-hover:text-[var(--unnamed-color-b3a292)]"
            }
          `}
        >
          {text}
        </span>
      </div>

      <span
        className={`
          hidden sm:block h-px flex-1 transition-colors duration-200
          ${
            isActive
              ? "bg-[var(--unnamed-color-b3a292)]"
              : "bg-black/10 group-hover:bg-[var(--unnamed-color-b3a292)]"
          }
        `}
      />
    </button>
  );
}
