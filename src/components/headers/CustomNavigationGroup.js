"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export default function CustomNavigationGroup({
  item,
  mobile = false,
  onNavigate,
  accentLinkColor,
}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className={
        mobile ? "border-b border-[var(--tenant-border)]" : "relative shrink-0"
      }
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        data-tenant-hover="preserve"
        onClick={() => setOpen((value) => !value)}
        className={
          mobile
            ? "flex min-h-[58px] w-full items-center justify-between gap-2 px-2 text-[17px] font-semibold"
            : "inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-[14px] font-semibold"
        }
        style={{ color: accentLinkColor }}
      >
        {item.label}
        <ChevronDownIcon
          aria-hidden="true"
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id={id}
          className={
            mobile
              ? "grid pb-3 pl-4"
              : "absolute left-0 top-full z-50 mt-2 grid min-w-56 rounded-xl border border-[var(--tenant-border)] bg-[var(--tenant-background)] p-2 shadow-lg"
          }
        >
          {item.children.map((child) => (
            <a
              key={child.key}
              href={child.href}
              data-tenant-hover="preserve"
              className={`flex min-h-11 items-center px-3 py-2 text-sm hover:opacity-70 ${child.separatorBefore ? "border-t border-[var(--tenant-border)] mt-1 pt-3" : ""}`}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              {child.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
