const variants = {
  error: "border-danger/25 bg-danger-soft text-danger",
  neutral: "border-skab-offset-300 bg-surface text-[#1F1F1F]",
};

export function InlineNotice({
  children,
  className = "",
  variant = "neutral",
}) {
  return (
    <div
      role={variant === "error" ? "alert" : undefined}
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
