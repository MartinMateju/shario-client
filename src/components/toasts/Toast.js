import { Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function Toast({ show, message, onClose }) {
  return (
    <Transition
      show={show}
      enter="transition ease-out duration-100"
      enterFrom="opacity-0 translate-y-2"
      enterTo="opacity-100 translate-y-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-2"
    >
      <div className="bg-[#F7F5F2] rounded-none text-gray-900 border-2 border-gray-900 px-4 py-3 shadow-lg flex items-center justify-between min-w-[300px] max-w-[500px] whitespace-nowrap">
        <span className="text-sm font-medium pr-4">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-900 hover:text-gray-700 focus:outline-none"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </Transition>
  );
}
