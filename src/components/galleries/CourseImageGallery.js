"use client";

import { useTranslations } from "next-intl";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const safeText = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

export default function CourseImageGallery({ images = [], courseName = "" }) {
  const t = useTranslations("Common.gallery");
  const safeImages = useMemo(() => {
    return Array.isArray(images)
      ? images.filter((image) => typeof image === "string" && image.trim())
      : [];
  }, [images]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const imageCount = safeImages.length;
  const hasMultipleImages = imageCount > 1;

  useEffect(() => {
    if (currentImageIndex > imageCount - 1) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, imageCount]);

  const currentImage = safeImages[currentImageIndex];

  const nextImage = useCallback(() => {
    if (!imageCount) return;

    setCurrentImageIndex((index) => (index >= imageCount - 1 ? 0 : index + 1));
  }, [imageCount]);

  const prevImage = useCallback(() => {
    if (!imageCount) return;

    setCurrentImageIndex((index) => (index <= 0 ? imageCount - 1 : index - 1));
  }, [imageCount]);

  const goToImage = useCallback(
    (index) => {
      if (index < 0 || index >= imageCount) return;
      setCurrentImageIndex(index);
    },
    [imageCount],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!hasMultipleImages) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextImage();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevImage();
      }
    },
    [hasMultipleImages, nextImage, prevImage],
  );

  if (!currentImage) return null;

  const baseAlt = safeText(courseName, t("image"));

  return (
    <div
      className="relative w-full min-w-0 max-w-[670px]"
      onKeyDown={handleKeyDown}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-[#f3ece4] shadow-[0_24px_80px_rgba(72,56,39,0.10)] ring-1 ring-black/[0.04]">
        <Image
          src={currentImage}
          alt={t("imageAlt", { name: baseAlt, number: currentImageIndex + 1 })}
          fill
          sizes="(max-width: 1024px) 100vw, (max-width: 1280px) 42vw, 670px"
          priority={currentImageIndex === 0}
          loading={currentImageIndex === 0 ? "eager" : "lazy"}
          quality={82}
          className="object-cover transition-opacity duration-300"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/75 text-[#483827] shadow-[0_10px_24px_rgba(72,56,39,0.12)] backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#483827]/20 focus-visible:ring-offset-2"
              aria-label={t("previous")}
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={nextImage}
              className="absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/75 text-[#483827] shadow-[0_10px_24px_rgba(72,56,39,0.12)] backdrop-blur-sm transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#483827]/20 focus-visible:ring-offset-2"
              aria-label={t("next")}
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <div className="absolute bottom-3 right-3 rounded-full bg-[#241b14]/65 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {currentImageIndex + 1} / {imageCount}
            </div>
          </>
        )}
      </div>

      {hasMultipleImages && (
        <div
          className="mt-4 w-full overflow-x-auto overflow-y-hidden scroll-smooth"
          aria-label={t("thumbnails")}
        >
          <div className="flex gap-3 pb-1">
            {safeImages.map((image, index) => {
              const isActive = index === currentImageIndex;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => goToImage(index)}
                  className={classNames(
                    "relative h-20 w-24 shrink-0 overflow-hidden rounded-[1.1rem] transition-all duration-200 sm:h-24 sm:w-28 lg:h-32 lg:w-40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#483827]/20 focus-visible:ring-offset-2",
                    isActive
                      ? "ring-2 ring-[#483827] ring-offset-2"
                      : "ring-1 ring-black/[0.06] hover:opacity-85",
                  )}
                  aria-label={t("view", {
                    number: index + 1,
                    count: imageCount,
                  })}
                  aria-current={isActive ? "true" : undefined}
                >
                  <Image
                    src={image}
                    alt={t("thumbnailAlt", {
                      name: baseAlt,
                      number: index + 1,
                    })}
                    fill
                    sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 160px"
                    loading="lazy"
                    quality={72}
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
