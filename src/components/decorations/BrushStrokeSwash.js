import styles from "./BrushStrokeSwash.module.css";
import {
  BRUSH_SWASH_TEXTURES,
  DEFAULT_BRUSH_SWASH_TEXTURE,
} from "./BrushStrokeSwash.config";
import { SKAB_BRAND_RGB } from "@/config/brandPalette";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const TONE_RGB = {
  cobalt: SKAB_BRAND_RGB.primary,
  coral: SKAB_BRAND_RGB.accent,
  peach: SKAB_BRAND_RGB.softCoral,
  sand: SKAB_BRAND_RGB.sand,
};

const SAFE_HEX_COLOR = /^#[\da-f]{6}$/i;

const getCustomRgb = (color) => {
  const normalizedColor = String(color || "");
  if (!SAFE_HEX_COLOR.test(normalizedColor)) return "";

  return [1, 3, 5]
    .map((index) =>
      Number.parseInt(normalizedColor.slice(index, index + 2), 16),
    )
    .join(" ");
};

export default function BrushStrokeSwash({
  className = "",
  color = "",
  side = "right",
  tone = "cobalt",
  texture = DEFAULT_BRUSH_SWASH_TEXTURE,
}) {
  const resolvedTone = TONE_RGB[tone] ? tone : "cobalt";
  const customRgb = getCustomRgb(color);
  const resolvedTexture = Object.hasOwn(BRUSH_SWASH_TEXTURES, texture)
    ? texture
    : DEFAULT_BRUSH_SWASH_TEXTURE;
  const textureConfig = BRUSH_SWASH_TEXTURES[resolvedTexture];

  return (
    <span
      aria-hidden="true"
      className={joinClasses(
        styles.root,
        "pointer-events-none absolute select-none print:hidden [@media(forced-colors:active)]:hidden",
        className,
      )}
      data-brush-style="textured-mask"
      data-brush-texture={resolvedTexture}
      data-brush-texture-src={textureConfig.src}
      data-decoration={
        customRgb ? "custom-brush-swash" : `${resolvedTone}-brush-swash`
      }
      data-testid="brush-swash"
      style={{
        "--brush-aspect-ratio": textureConfig.aspect,
        "--brush-mask-image": `url("${textureConfig.src}")`,
        "--brush-rgb": customRgb || TONE_RGB[resolvedTone],
      }}
    >
      <span
        aria-hidden="true"
        className={joinClasses(styles.layer, side === "left" && styles.flip)}
        data-brush-mask="alpha-webp"
      />
    </span>
  );
}
