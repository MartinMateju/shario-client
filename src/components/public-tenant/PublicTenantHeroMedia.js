"use client";

import { useRef, useState } from "react";

import BrushStrokeSwash from "@/components/decorations/BrushStrokeSwash";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";
import { useMissedImageError } from "@/hooks/useMissedImageError";

const cx = (...classes) => classes.filter(Boolean).join(" ");

export default function PublicTenantHeroMedia({
  coverImageUrl,
  logoUrl = "",
  displayName = "",
  accentColor,
  secondaryColor,
  backgroundColor = SKAB_BRAND_COLORS.offset,
  variant = "page",
}) {
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const imageRef = useRef(null);
  const logoRef = useRef(null);
  const showImage = Boolean(coverImageUrl) && failedImageUrl !== coverImageUrl;
  const showLogo = Boolean(logoUrl) && failedLogoUrl !== logoUrl;
  const compact = variant === "preview";
  const initials = String(displayName || "Studio")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  useMissedImageError(imageRef, coverImageUrl, setFailedImageUrl);
  useMissedImageError(logoRef, logoUrl, setFailedLogoUrl);

  return (
    <div
      aria-hidden="true"
      data-public-tenant-hero-media={showImage ? "image" : "fallback"}
      data-public-tenant-hero-variant={compact ? "preview" : "page"}
      className={cx(
        "relative isolate w-full overflow-hidden bg-[#34312B]",
        compact
          ? "absolute inset-0 min-h-0"
          : "aspect-[5/4] min-h-[22rem] border-t border-[color:var(--tenant-border)] lg:absolute lg:inset-0 lg:aspect-auto lg:min-h-0 lg:border-l lg:border-t-0",
      )}
      style={{
        background: `linear-gradient(145deg, color-mix(in srgb, ${accentColor} 42%, #292720) 0%, color-mix(in srgb, ${secondaryColor} 30%, #443B32) 56%, #292720 100%)`,
      }}
    >
      {showImage ? (
        // Tenant covers can use tenant-managed HTTPS hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={coverImageUrl}
          alt=""
          data-public-tenant-hero-image
          data-tenant-image
          className="absolute inset-0 h-full w-full object-cover object-center"
          sizes="(min-width: 1280px) 50vw, (min-width: 1024px) 42vw, 100vw"
          fetchPriority={compact ? undefined : "high"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedImageUrl(coverImageUrl)}
        />
      ) : (
        <>
          <div
            className="absolute inset-0 overflow-hidden"
            data-public-tenant-hero-fallback
          >
            <BrushStrokeSwash
              className={cx(
                "rotate-[7deg] opacity-35",
                compact
                  ? "-right-36 top-2 w-[28rem]"
                  : "-right-40 top-3 w-[38rem] sm:-right-36 sm:w-[48rem] lg:-right-56 lg:top-20 lg:w-[66rem]",
              )}
              color={accentColor}
              texture="loaded"
            />
            <BrushStrokeSwash
              className={cx(
                "-rotate-[8deg] opacity-30",
                compact
                  ? "-bottom-4 -left-36 w-[26rem]"
                  : "-bottom-8 -left-44 w-[36rem] sm:-left-36 sm:w-[44rem] lg:-bottom-16 lg:-left-52 lg:w-[62rem]",
              )}
              color={secondaryColor}
              side="left"
              texture="rake"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-black/5 to-white/[0.04]" />

          {displayName ? (
            <div
              className="absolute inset-0 flex items-center justify-center p-6"
              data-public-tenant-hero-brand
              data-public-tenant-hero-brand-position="center"
            >
              <div
                className={cx(
                  "flex max-w-[82%] flex-col items-center border border-white/20 bg-black/15 text-center text-white shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-md",
                  compact
                    ? "gap-2 rounded-[18px] px-4 py-3"
                    : "gap-3 rounded-[28px] px-8 py-6",
                )}
                style={{
                  boxShadow: `0 24px 70px color-mix(in srgb, ${backgroundColor} 12%, rgba(0,0,0,0.28))`,
                }}
              >
                {showLogo ? (
                  // Tenant logos can use tenant-managed HTTPS hosts.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={logoRef}
                    src={logoUrl}
                    alt=""
                    data-public-tenant-hero-logo
                    className={cx(
                      "max-w-full object-contain drop-shadow-sm",
                      compact ? "h-8 max-w-[7rem]" : "h-14 max-w-[12rem]",
                    )}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedLogoUrl(logoUrl)}
                  />
                ) : (
                  <span
                    className={cx(
                      "inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 font-semibold tracking-[-0.04em]",
                      compact ? "h-8 w-8 text-[10px]" : "h-14 w-14 text-base",
                    )}
                    data-public-tenant-hero-initials
                  >
                    {initials}
                  </span>
                )}
                <span
                  className={cx(
                    "max-w-full truncate font-semibold tracking-[-0.04em]",
                    compact ? "text-[9px]" : "text-lg",
                  )}
                  data-tenant-type="display"
                >
                  {displayName}
                </span>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
