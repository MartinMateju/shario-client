"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import {
  ArrowsPointingOutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { customerPortalSecondaryActionClass } from "@/components/customer-shell/CustomerPortalPrimitives";
import { getCourseImageUrls, getCourseName } from "./customerCourses.utils";

const fullscreenControlClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export default function CourseProductGallery({ product, large = false }) {
  const t = useTranslations("CustomerCourses");
  const locale = useLocale();
  const images = getCourseImageUrls(product);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const swipeStart = useRef(null);
  const activeIndex = index < images.length ? index : 0;
  if (!images.length) return null;

  const name = getCourseName(product, locale);
  const previousImage = () =>
    setIndex((activeIndex + images.length - 1) % images.length);
  const nextImage = () => setIndex((activeIndex + 1) % images.length);
  const closeGallery = () => {
    swipeStart.current = null;
    setIsOpen(false);
  };
  const startSwipe = (event) => {
    const touch = event.touches[0];
    swipeStart.current =
      images.length > 1 && event.touches.length === 1
        ? { id: touch.identifier, x: touch.clientX, y: touch.clientY }
        : null;
  };
  const endSwipe = (event) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || event.touches.length || images.length < 2) return;

    const touch = Array.from(event.changedTouches).find(
      (item) => item.identifier === start.id,
    );
    if (!touch) return;

    const distanceX = touch.clientX - start.x;
    const distanceY = touch.clientY - start.y;
    // Ignore taps and vertical movement; let the browser handle pinch zoom.
    if (
      Math.abs(distanceX) < 50 ||
      Math.abs(distanceX) <= Math.abs(distanceY) * 1.25
    )
      return;

    if (distanceX < 0) nextImage();
    else previousImage();
  };
  const position = t("imagePosition", {
    current: activeIndex + 1,
    total: images.length,
  });

  return (
    <div className="min-w-0 overflow-hidden bg-[var(--tenant-surface)]">
      <button
        type="button"
        className="relative block aspect-[3/2] w-full cursor-zoom-in overflow-hidden !rounded-none p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--tenant-accent-on-surface)]"
        aria-label={t("openGallery", { name })}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
      >
        {/* Keep previews uniform; the fullscreen gallery shows the entire image. */}
        {/* Tenant-managed course images may use any validated image host. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[activeIndex]}
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 block h-full w-full object-cover"
        />
        <span
          className="pointer-events-none absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white"
          aria-hidden="true"
        >
          <ArrowsPointingOutIcon className="h-5 w-5" />
        </span>
      </button>
      {images.length > 1 ? (
        <div
          className={`flex items-center justify-between gap-3 border-t border-[var(--tenant-border)] ${large ? "px-5 py-4" : "px-4 py-3"}`}
        >
          <button
            type="button"
            className={customerPortalSecondaryActionClass}
            aria-label={t("previousImage")}
            onClick={previousImage}
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            className="text-center text-xs text-[var(--tenant-text-on-surface)]"
            aria-live="polite"
            aria-atomic="true"
          >
            {position}
          </span>
          <button
            type="button"
            className={customerPortalSecondaryActionClass}
            aria-label={t("nextImage")}
            onClick={nextImage}
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <Dialog
        open={isOpen}
        onClose={closeGallery}
        className="fixed inset-0 z-[100]"
        onKeyDown={(event) => {
          if (images.length < 2) return;
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            previousImage();
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            nextImage();
          }
        }}
      >
        <DialogPanel className="flex h-dvh w-full flex-col bg-neutral-950 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-white">
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <DialogTitle className="line-clamp-2 min-w-0 text-sm font-medium leading-6 text-white sm:text-base">
              {name}
            </DialogTitle>
            <button
              type="button"
              data-autofocus
              className={fullscreenControlClass}
              aria-label={t("closeGallery")}
              onClick={closeGallery}
            >
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div
            className="min-h-0 flex-1 px-2 sm:px-16"
            style={{ touchAction: "pan-y pinch-zoom" }}
            onTouchStart={startSwipe}
            onTouchMove={(event) => {
              if (event.touches.length !== 1) swipeStart.current = null;
            }}
            onTouchEnd={endSwipe}
            onTouchCancel={() => {
              swipeStart.current = null;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeIndex]}
              alt={name}
              decoding="async"
              referrerPolicy="no-referrer"
              className="block h-full w-full object-contain"
            />
          </div>
          <div className="flex shrink-0 justify-center px-4 py-3 sm:py-4">
            <div className="flex w-full max-w-xs items-center justify-center gap-6">
              {images.length > 1 ? (
                <button
                  type="button"
                  className={fullscreenControlClass}
                  aria-label={t("previousImage")}
                  onClick={previousImage}
                >
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}
              <span
                className="text-center text-sm text-white/80"
                aria-live="polite"
                aria-atomic="true"
              >
                {position}
              </span>
              {images.length > 1 ? (
                <button
                  type="button"
                  className={fullscreenControlClass}
                  aria-label={t("nextImage")}
                  onClick={nextImage}
                >
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </div>
  );
}
