export default function CancelButton({
  onClick,
  text = "",
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        min-h-[48px] w-full sm:w-auto
        rounded-[18px]
        border border-black/10 bg-white px-6 py-3
        text-sm font-medium text-black
        transition-all duration-200
        hover:border-[var(--unnamed-color-b3a292)]
        hover:text-[var(--unnamed-color-b3a292)]
        focus:outline-none
        focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {text}
    </button>
  );
}
