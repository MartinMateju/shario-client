"use client";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const EDGE_CLIP_PATH =
  "polygon(44% 0%, 100% 0%, 100% 100%, 42% 100%, 34% 92%, 48% 82%, 35% 70%, 44% 58%, 31% 44%, 48% 31%, 36% 18%, 51% 8%)";

const TONE_GRADIENTS = {
  cobalt:
    "linear-gradient(to left, rgb(var(--skab-blue-rgb)/0.9) 0%, rgb(var(--skab-blue-rgb)/0.6) 22%, rgb(103 144 225 / 0.3) 48%, rgb(155 181 236 / 0.11) 70%, rgb(var(--skab-blue-rgb)/0) 94%)",
  coral:
    "linear-gradient(to left, rgb(var(--skab-coral-rgb)/0.82) 0%, rgb(var(--skab-coral-rgb)/0.52) 22%, rgb(241 155 134 / 0.26) 48%, rgb(245 185 170 / 0.1) 70%, rgb(var(--skab-coral-rgb)/0) 94%)",
  peach:
    "linear-gradient(to left, rgb(245 185 170 / 0.72) 0%, rgb(245 185 170 / 0.44) 24%, rgb(253 234 229 / 0.2) 52%, rgb(245 185 170 / 0) 94%)",
};

export default function BrushStrokeEdge({
  className = "",
  side = "right",
  tone = "cobalt",
}) {
  const resolvedTone = TONE_GRADIENTS[tone] ? tone : "cobalt";

  return (
    <div
      aria-hidden="true"
      data-decoration={`${resolvedTone}-ambient-edge`}
      data-brush-style="soft-gradient"
      data-testid="brush-edge"
      className={joinClasses(
        "pointer-events-none absolute overflow-hidden select-none print:hidden [@media(forced-colors:active)]:hidden",
        side === "left" && "-scale-x-100",
        className,
      )}
    >
      <span
        aria-hidden="true"
        data-edge-wash="primary"
        className="absolute -inset-y-[10%] -right-[12%] w-[150%] transform-gpu blur-[28px] sm:blur-[36px] lg:blur-[48px]"
      >
        <span
          aria-hidden="true"
          data-edge-wash="shape"
          className="absolute inset-0"
          style={{
            backgroundImage: TONE_GRADIENTS[resolvedTone],
            clipPath: EDGE_CLIP_PATH,
          }}
        />
      </span>
    </div>
  );
}
