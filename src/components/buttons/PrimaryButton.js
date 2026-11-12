export default function PrimaryButton({ text, callback }) {
  return (
    <button
      onClick={callback}
      className="inline-flex text-base rounded-full sm:text-sm justify-center py-3 sm:py-1 px-6 h-10 items-center tracking-wide focus:outline-none bg-black text-white hover:bg-mist-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist-600 active:bg-mist-700 active:text-white/80 disabled:opacity-30 disabled:hover:bg-mist-600 2xl:text-base"
    >
      {text}
    </button>
  );
}
