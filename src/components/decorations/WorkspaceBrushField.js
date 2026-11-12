import styles from "./WorkspaceBrushField.module.css";
import {
  WORKSPACE_BRUSH_PRESETS,
  WORKSPACE_BRUSH_TEXTURES,
} from "./WorkspaceBrushField.config";
import { SKAB_BRAND_RGB } from "@/config/brandPalette";

const TONE_RGB = Object.freeze({
  cobalt: SKAB_BRAND_RGB.primary,
  coral: SKAB_BRAND_RGB.accent,
  peach: SKAB_BRAND_RGB.softCoral,
  sand: SKAB_BRAND_RGB.sand,
});

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function WorkspaceBrushField({
  className = "",
  layer = "background",
  variant,
}) {
  const brushes = Object.hasOwn(WORKSPACE_BRUSH_PRESETS, variant)
    ? WORKSPACE_BRUSH_PRESETS[variant]
    : null;

  if (!brushes) return null;

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute inset-0 overflow-hidden [contain:paint] print:hidden [@media(forced-colors:active)]:hidden",
        layer === "perimeter" ? "z-20" : "z-0",
        className,
      )}
      data-workspace-brush-layer={
        layer === "perimeter" ? "perimeter" : "background"
      }
      data-workspace-brush-field={variant}
    >
      {brushes.map((brush, index) => {
        const texture = WORKSPACE_BRUSH_TEXTURES[brush.texture];
        const tone = TONE_RGB[brush.tone] ? brush.tone : "coral";

        return (
          <span
            aria-hidden="true"
            className={cx(
              styles.accent,
              "absolute select-none",
              brush.className,
            )}
            data-workspace-brush={brush.texture}
            data-workspace-brush-tone={tone}
            key={`${variant}-${brush.texture}-${index}`}
            style={{
              "--workspace-brush-aspect-ratio": texture.aspect,
              "--workspace-brush-mask-image": `url("${texture.src}")`,
              "--workspace-brush-rgb": TONE_RGB[tone],
            }}
          >
            <span
              aria-hidden="true"
              className={cx(styles.layer, brush.side === "left" && styles.flip)}
              data-workspace-brush-mask="alpha-webp"
            />
          </span>
        );
      })}
    </div>
  );
}
