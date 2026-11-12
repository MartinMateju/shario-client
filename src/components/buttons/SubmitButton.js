export default function SubmitButton({
  onClick,
  text = "",
  disabled = false,
  variant = "primary", // "primary" | "accent"
  className = "",
}) {
  const variants = {
    primary: "bg-black hover:bg-[var(--unnamed-color-b3a292)]",
    accent: "bg-[var(--unnamed-color-b3a292)] hover:opacity-90",
  };

  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center
        min-h-[48px] w-full sm:w-auto
        rounded-[18px]
        px-6 py-3
        text-sm font-medium text-white
        transition-all duration-200
        focus:outline-none
        focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/30
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${className}
      `}
    >
      {text}
    </button>
  );
}
