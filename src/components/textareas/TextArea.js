export default function TextArea({
  className = "",
  label = "",
  value = "",
  placeholder = "",
  onChange,
  rows = 4,
  id = "description",
  name = "description",
  disabled = false,
}) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={id}
          className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/55"
        >
          {label}
        </label>
      ) : null}

      <textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange}
        disabled={disabled}
        className="
          block w-full rounded-[18px] border border-black/10 bg-white
          px-4 py-3 text-sm text-black
          placeholder:text-black/35
          outline-none transition-all duration-200 resize-none
          focus:border-[var(--unnamed-color-b3a292)]
          focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
          disabled:cursor-not-allowed disabled:opacity-60
        "
      />
    </div>
  );
}
