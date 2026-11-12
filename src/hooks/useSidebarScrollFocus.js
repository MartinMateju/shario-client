import { useState } from "react";

export default function useSidebarScrollFocus() {
  const [isScrolled, setIsScrolled] = useState(false);

  const [shouldHighlightPlannedActivity, setShouldHighlightPlannedActivity] =
    useState(false);
  const [shouldHighlightStartTime, setShouldHighlightStartTime] =
    useState(false);
  const [shouldHighlightEndTime, setShouldHighlightEndTime] = useState(false);
  const [shouldHighlightNumberOfPeople, setShouldHighlightNumberOfPeople] =
    useState(false);
  const [shouldHighlightOrderSummary, setShouldHighlightOrderSummary] =
    useState(false);

  const scrollToRef = (ref, options = {}) => {
    ref?.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      ...options,
    });
  };

  const focusRef = (ref) => {
    ref?.current?.focus?.();
  };

  const highlightFor = (setter, ms = 3000) => {
    setter(true);
    setTimeout(() => setter(false), ms);
  };

  const scrollToRefAndHighlight = (ref, setter, ms = 3000) => {
    scrollToRef(ref);
    highlightFor(setter, ms);
  };

  return {
    isScrolled,
    setIsScrolled,

    shouldHighlightPlannedActivity,
    setShouldHighlightPlannedActivity,

    shouldHighlightStartTime,
    setShouldHighlightStartTime,

    shouldHighlightEndTime,
    setShouldHighlightEndTime,

    shouldHighlightNumberOfPeople,
    setShouldHighlightNumberOfPeople,

    shouldHighlightOrderSummary,
    setShouldHighlightOrderSummary,

    scrollToRef,
    focusRef,
    highlightFor,
    scrollToRefAndHighlight,
  };
}
