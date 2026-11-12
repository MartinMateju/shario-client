import { DEFAULT_PLATFORM_BILLING_CURRENCY } from "@/config/currencies";

export const ONBOARDING_STEPS = ["essentials"];

export const toVisibleOnboardingStep = () => 1;

export const INITIAL_ONBOARDING_FORM = {
  studioName: "",
  businessType: "coworking_space",
  country: "",
  currency: DEFAULT_PLATFORM_BILLING_CURRENCY,
  timezone: "UTC",
  bookingTypes: ["open_studio"],
};

export const STUDIO_TYPES = [
  { value: "coworking_space", icon: "shared" },
  { value: "rehearsal_space", icon: "shared" },
  { value: "community_space", icon: "shared" },
  { value: "art_studio", icon: "art" },
  { value: "photography_studio", icon: "photography" },
  { value: "wellness_studio", icon: "wellness" },
  { value: "other", icon: "other" },
];

// Retained as a compatibility catalog for translations and older clients.
// Team size is intentionally not requested by the essentials-only launch form.
export const TEAM_SIZES = [
  { value: "just_me" },
  { value: "2_5" },
  { value: "6_15" },
  { value: "16_plus" },
];

export const BOOKING_OPTIONS = [
  {
    value: "open_studio",
    icon: "openStudio",
  },
  {
    value: "class",
    icon: "classes",
  },
];

export const CONFIRMATION_OPTIONS = [{ value: "instant" }, { value: "manual" }];
