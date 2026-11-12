export default function TextInput({
  htmlFor = "",
  label = "",
  id = "",
  data = "",
  name = "",
  autoComplete = "off",
  callback,
  value = "",
  className = "",
  type = "text",
  placeholder = "",
  isMandatory = false,
  disabled = false,
}) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor || id}
          className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-black/55"
        >
          {label}
          {isMandatory && <span className="text-red-600"> *</span>}
        </label>
      ) : null}

      <input
        id={id}
        name={name}
        type={type}
        value={value ?? ""}
        data-idx={data}
        autoComplete={autoComplete}
        onChange={callback}
        placeholder={placeholder}
        disabled={disabled}
        className="
          block w-full rounded-[18px] border border-black/10 bg-white
          px-4 py-3 text-sm text-black
          placeholder:text-black/35
          outline-none transition-all duration-200
          focus:border-[var(--unnamed-color-b3a292)]
          focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20
          disabled:cursor-not-allowed disabled:opacity-60
        "
      />
    </div>
  );
}
