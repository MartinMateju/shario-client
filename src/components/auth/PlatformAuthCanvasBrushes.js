import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";

/**
 * A quiet mobile counterpart to the large editorial brush field shown beside
 * the desktop auth and onboarding forms. It reuses the same cached textures,
 * stays behind interactive content, and disappears when the story panel is
 * visible.
 */
export default function PlatformAuthCanvasBrushes() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden xl:hidden"
      data-platform-auth-brushes
    >
      <BrushStrokeSwash
        className="-right-[18rem] -top-10 w-[38rem] -rotate-[8deg] opacity-[0.10] sm:-right-[20rem] sm:w-[46rem] sm:opacity-[0.12]"
        color="#263cd5"
        texture="loaded"
        tone="cobalt"
      />
      <BrushStrokeSwash
        className="-bottom-16 -left-[20rem] w-[42rem] rotate-[7deg] opacity-[0.08] sm:w-[50rem] sm:opacity-[0.10]"
        color="#ad4d32"
        side="left"
        texture="rake"
        tone="coral"
      />
    </div>
  );
}
