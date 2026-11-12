const SectionHeader = ({ children }) => (
  <div className="flex items-center">
    <div className="relative flex justify-start">
      <span className="pr-3 font-medium text-[10px] uppercase tracking-[0.18em] text-[#8b8178]">
        {children}
      </span>
    </div>

    <div aria-hidden="true" className="w-full border-t border-[#e1dbd5]" />
  </div>
);
