import { useEffect } from "react";

/*
 * React does not replay image error events that fire before hydration, so a
 * server-rendered <img> with a broken source never reaches its onError
 * fallback. After mounting, an image that finished without decoded pixels
 * (broken, or an SVG without an intrinsic size) is loaded once more off-screen
 * to tell the two apart. onError receives the failed source.
 */
export const useMissedImageError = (imageRef, src, onError) => {
  useEffect(() => {
    const image = imageRef.current;

    if (!src || !image?.complete || image.naturalWidth > 0) {
      return undefined;
    }

    const probe = new window.Image();

    probe.referrerPolicy = image.getAttribute("referrerpolicy") || "";
    probe.onerror = () => onError(src);
    probe.src = src;

    return () => {
      probe.onerror = null;
    };
  }, [imageRef, onError, src]);
};
