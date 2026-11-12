export default function SecondaryButton({ text, callback }) {
  return (
    <button
      onClick={callback}
      className="inline-flex text-base sm:text-sm font-medium justify-center py-3 sm:py-1 h-10 items-center tracking-wide focus:outline-none text-gray-900 hover:text-[var(--unnamed-color-b3a292)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist-600 active:bg-mist-700 active:text-white/80 disabled:opacity-30 disabled:hover:bg-mist-600 2xl:text-base"
    >
      {text}
    </button>
  );
}
