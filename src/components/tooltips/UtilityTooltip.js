export default function UtilityTooltip({ children }) {
  return (
    <span
      aria-hidden="true"
      data-topbar-tooltip
      className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-50 hidden -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-[10px] bg-[#11110F] px-2.5 py-1.5 text-[10px] font-medium text-white opacity-0 shadow-[0_10px_28px_rgba(17,17,15,0.18)] transition duration-150 group-hover/topbar-action:translate-y-0 group-hover/topbar-action:opacity-100 group-focus-visible/topbar-action:translate-y-0 group-focus-visible/topbar-action:opacity-100 motion-reduce:transform-none motion-reduce:transition-none md:block"
    >
      {children}
    </span>
  );
}
