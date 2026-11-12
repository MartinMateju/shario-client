"use client";

import { Fragment, memo } from "react";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  ArrowLongRightIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { classNames, isActivePath } from "./header.utils";
import { PUBLIC_NAV_ITEMS } from "./marketingNavigation";

const navItemClass = (active = false, open = false) =>
  classNames(
    "group relative inline-flex h-10 items-center gap-1.5 rounded-full px-3",
    "text-[13px] font-medium tracking-[-0.015em]",
    "transition-colors duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-brand-primary/25 focus-visible:ring-offset-4",
    "focus-visible:ring-offset-brand-offset",
    active || open
      ? "text-primary-text"
      : "text-[#343430] hover:text-primary-text",
  );

const activeIndicatorClass = (visible = false) =>
  classNames(
    "pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-center bg-brand-primary",
    "transition-transform duration-200 ease-out motion-reduce:transition-none",
    visible
      ? "scale-x-100"
      : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100",
  );

function MenuItem({ item, pathname, t }) {
  const active = isActivePath(pathname, item.href);

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <PopoverButton
            className={navItemClass(active, open)}
            data-marketing-nav-trigger={item.key}
          >
            <span>{t(item.labelKey)}</span>
            <ChevronDownIcon
              aria-hidden="true"
              className={classNames(
                "h-3.5 w-3.5 stroke-[1.7] text-[#777771] transition-transform duration-200",
                open && "rotate-180 text-primary-text",
              )}
            />
            <span
              aria-hidden="true"
              className={activeIndicatorClass(active || open)}
              data-marketing-nav-indicator={item.key}
            />
          </PopoverButton>

          <Transition
            as={Fragment}
            enter="transition duration-180 ease-out motion-reduce:transition-none"
            enterFrom="translate-y-2 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
            enterTo="translate-y-0 scale-100 opacity-100"
            leave="transition duration-120 ease-in motion-reduce:transition-none"
            leaveFrom="translate-y-0 scale-100 opacity-100"
            leaveTo="translate-y-1 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
          >
            <PopoverPanel
              className={classNames(
                "absolute left-1/2 top-[calc(100%+14px)] z-50 w-[390px] -translate-x-1/2 overflow-hidden",
                "rounded-[22px] border border-line bg-surface-raised p-2",
                "shadow-[0_24px_70px_rgba(17,17,15,0.13)]",
                "focus:outline-none motion-reduce:transform-none",
              )}
              data-marketing-nav-panel={item.key}
            >
              <div
                className="border-b border-line-warm px-4 pb-4 pt-3"
                data-marketing-nav-intro
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">
                  {t(item.labelKey)}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#686864]">
                  {t(item.descriptionKey)}
                </p>
              </div>

              <div className="space-y-1 py-2">
                {item.items.map((subItem) => (
                  <Link
                    aria-current={
                      isActivePath(pathname, subItem.href) ? "page" : undefined
                    }
                    className="group/link flex items-start justify-between gap-4 rounded-[15px] px-4 py-3 transition-colors hover:bg-skab-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/25"
                    data-marketing-nav-link={subItem.key}
                    href={subItem.href}
                    key={subItem.key}
                    onClick={close}
                  >
                    <span className="min-w-0">
                      <span
                        className="block text-[13px] font-semibold tracking-[-0.02em] text-[#20201D]"
                        data-marketing-nav-label
                      >
                        {t(subItem.labelKey)}
                      </span>
                      <span className="mt-1 block text-[11px] leading-[18px] text-[#686864]">
                        {t(subItem.descriptionKey)}
                      </span>
                    </span>
                    <ArrowLongRightIcon
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 stroke-[1.65] text-[#8A8A84] transition-transform group-hover/link:translate-x-0.5 group-hover/link:text-primary-text"
                    />
                  </Link>
                ))}
              </div>

              <Link
                className="group/overview flex min-h-11 items-center justify-between rounded-[15px] bg-[#F4F1EB] px-4 text-[12px] font-semibold text-[#292925] transition-colors hover:bg-[#ECE8DF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/25"
                data-marketing-nav-link="overview"
                href={item.href}
                onClick={close}
              >
                {t(item.overviewLabelKey)}
                <ArrowLongRightIcon
                  aria-hidden="true"
                  className="h-4 w-4 stroke-[1.65] transition-transform group-hover/overview:translate-x-0.5"
                />
              </Link>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

const DesktopNavPublic = memo(function DesktopNavPublic({ pathname = "" }) {
  const t = useTranslations();

  return (
    <nav
      className="hidden min-w-0 items-center justify-center gap-x-1 xl:flex 2xl:gap-x-2"
      aria-label={PUBLIC_NAV_ITEMS.map((item) => t(item.labelKey)).join(", ")}
    >
      {PUBLIC_NAV_ITEMS.map((item) => {
        if (item.type === "menu") {
          return (
            <MenuItem item={item} key={item.key} pathname={pathname} t={t} />
          );
        }

        const active = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={navItemClass(active)}
            data-marketing-nav-trigger={item.key}
            href={item.href}
            key={item.key}
          >
            <span>{t(item.labelKey)}</span>
            <span
              aria-hidden="true"
              className={activeIndicatorClass(active)}
              data-marketing-nav-indicator={item.key}
            />
          </Link>
        );
      })}
    </nav>
  );
});

export default DesktopNavPublic;
