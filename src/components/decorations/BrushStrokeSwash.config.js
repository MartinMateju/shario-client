import { WORKSPACE_BRUSH_TEXTURES } from "./WorkspaceBrushField.config";

export const DEFAULT_BRUSH_SWASH_TEXTURE = "loaded";

export const BRUSH_SWASH_TEXTURES = Object.freeze({
  loaded: Object.freeze({
    src: "/images/marketing/brush-loaded-wide.webp",
    width: 2400,
    height: 600,
    aspect: "4 / 1",
  }),
  rake: Object.freeze({
    src: "/images/marketing/brush-dry-rake.webp",
    width: 2500,
    height: 500,
    aspect: "5 / 1",
  }),
  curved: Object.freeze({
    src: "/images/marketing/brush-curved-sweep.webp",
    width: 2400,
    height: 720,
    aspect: "10 / 3",
  }),
  feather: Object.freeze({
    src: "/images/marketing/brush-feather-dry.webp",
    width: 2430,
    height: 540,
    aspect: "9 / 2",
  }),
  arc: WORKSPACE_BRUSH_TEXTURES.arc,
  diagonal: WORKSPACE_BRUSH_TEXTURES.diagonal,
  crescent: WORKSPACE_BRUSH_TEXTURES.crescent,
});
