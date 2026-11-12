export const eventTones = {
  cobalt: {
    dot: "bg-brand-primary",
    card: "border-skab-cobalt-200 bg-skab-cobalt-50 text-skab-cobalt-800",
  },
  coral: {
    dot: "bg-brand-accent",
    card: "border-skab-coral-200 bg-skab-coral-50 text-accent-text",
  },
  olive: {
    dot: "bg-[#899A31]",
    card: "border-[#E0E5C3] bg-[#FEFEFA] text-[#3D4424]",
  },
  sand: {
    dot: "bg-[#D7A46F]",
    card: "border-[#EEDFCC] bg-[#FFFDFA] text-[#4B392A]",
  },
  rose: {
    dot: "bg-[#E95C87]",
    card: "border-[#F6D5DF] bg-[#FFFCFD] text-[#502D38]",
  },
  neutral: {
    dot: "bg-[#888888]",
    card: "border-[#DEDEDA] bg-[#FBFBF9] text-[#444444]",
  },
  mine: {
    dot: "bg-brand-primary",
    card: "border-skab-cobalt-200 bg-skab-cobalt-50 text-skab-cobalt-600",
  },
};

/**
 * Calendar event meaning is defined once so cards and the legend cannot drift
 * to different colours for the same kind of booking.
 */
export const calendarEventSemantics = Object.freeze({
  class: Object.freeze({ legendKey: "class", tone: "cobalt" }),
  sharedOpenStudio: Object.freeze({
    legendKey: "openStudio",
    tone: "olive",
  }),
  exclusiveOpenStudio: Object.freeze({
    legendKey: "private",
    tone: "coral",
  }),
  privateStudio: Object.freeze({ legendKey: "blocked", tone: "neutral" }),
});

export const calendarLegendItems = Object.freeze(
  Object.values(calendarEventSemantics).map(({ legendKey, tone }) =>
    Object.freeze({ key: legendKey, tone }),
  ),
);

export const getCalendarEventTone = (kind) =>
  calendarEventSemantics[kind]?.tone || "cobalt";

const GLOBAL_BLOCKING_KINDS = new Set([
  "private",
  "block",
  "privateStudio",
  "exclusiveOpenStudio",
]);

export const isGlobalBlockingKind = (kind) =>
  GLOBAL_BLOCKING_KINDS.has(String(kind || ""));

export const capacityTone = {
  available: "border-[#BDD1AA] bg-[#F1F6ED] text-[#3F6F27]",
  limited: "border-[#FFC1B5] bg-[#FFF0EB] text-[#DA3D26]",
  full: "border-[#D8D8D5] bg-[#EFEFEC] text-[#70706D]",
};
