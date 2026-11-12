"use client";

import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function CourseDetailsModal({
  isOpen,
  onClose,
  title,
  children,
  language = "CZ",
  tenantStylePresetId = null,
  tenantThemeStyle = null,
}) {
  const isSectionsArray =
    Array.isArray(children) &&
    children.every(
      (item) =>
        item && typeof item === "object" && "title" in item && "text" in item,
    );

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
        data-tenant-style={tenantStylePresetId || undefined}
        style={tenantThemeStyle || undefined}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-6 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                data-dialog-layout="modal"
                className="
                  flex max-h-[92vh] w-full flex-col overflow-hidden
                  rounded-t-[28px] bg-white shadow-2xl ring-1 ring-black/5
                  sm:max-w-2xl sm:rounded-[28px]
                "
              >
                <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7 sm:py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--unnamed-color-e6a684)]">
                        {language === "CZ" ? "Detail kurzu" : "Course detail"}
                      </p>

                      <DialogTitle className="text-xl font-medium leading-tight text-gray-950 sm:text-2xl">
                        {title}
                      </DialogTitle>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label={language === "CZ" ? "Zavřít" : "Close"}
                      className="
                        group -mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center
                        rounded-full bg-gray-50 text-gray-500 transition-all duration-200
                        hover:bg-gray-100 hover:text-gray-900 active:scale-95
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-[var(--unnamed-color-e6a684)]
                        focus-visible:ring-offset-2
                      "
                    >
                      <XMarkIcon className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                  {isSectionsArray ? (
                    <div className="space-y-4">
                      {children.map((section, idx) => (
                        <section
                          key={idx}
                          className="
                            rounded-2xl border border-gray-100 bg-[#fbfaf8]
                            px-4 py-4 sm:px-5 sm:py-5
                          "
                        >
                          <h3 className="text-base font-medium text-gray-950 sm:text-lg">
                            {section.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-gray-700 sm:text-[15px]">
                            {section.text}
                          </p>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="prose prose-gray max-w-none text-sm leading-6 text-gray-700 sm:text-[15px]">
                      {children}
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 border-t border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="
                        inline-flex items-center justify-center rounded-full
                        bg-[var(--unnamed-color-e6a684)] px-5 py-2.5
                        text-sm font-medium text-white
                        shadow-sm transition-all duration-200
                        hover:bg-[#8f8579] active:scale-[0.98]
                        focus:outline-none focus-visible:ring-2
                        focus-visible:ring-[var(--unnamed-color-e6a684)]
                        focus-visible:ring-offset-2
                      "
                    >
                      {language === "CZ" ? "Zavřít" : "Close"}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
