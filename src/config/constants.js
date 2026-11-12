const STATUS_TYPES = ["Recieved", "Processing", "Delivered"];
const PRODUCT_TYPES = [
  "course",
  "workshop",
  "membership",
  "credit-pack",
  "gift-card",
  "physical-product",
  "coupon",
  "service",
  "booking-addon",
  "system",
];
const LABEL_COLORS = [
  "none",
  "indigo",
  "cherish",
  "yellow",
  "orange",
  "blue",
  "pink",
  "purple",
  "red",
];
const PRIVACY_OPTIONS = ["public", "private"];

const EMAIL_REGEX =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const EMAIL_MAX_LENGTH = 254;

// Password must be at least 8 characters and contain at least 1 number
const PWD_REGEX = /^(?=.*[0-9]).{8,}$/;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_RESET_OTP_LENGTH = 6;

// Name should allow letters with Czech diacritics and spaces
const NAME_REGEX = /^[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚÝŽ\s]{2,}$/;

// Phone number validation (more flexible)
const PHONE_REGEX = /^[\s()+-]*([0-9][\s()+-]*){9,20}$/;

const SLOT_STEP_MINUTES = 30;
const MIN_BOOKING_DURATION_MIN = 30;

export {
  EMAIL_REGEX,
  EMAIL_MAX_LENGTH,
  PWD_REGEX,
  PASSWORD_MAX_LENGTH,
  PASSWORD_RESET_OTP_LENGTH,
  NAME_REGEX,
  PHONE_REGEX,
  STATUS_TYPES,
  PRODUCT_TYPES,
  LABEL_COLORS,
  PRIVACY_OPTIONS,
  SLOT_STEP_MINUTES,
  MIN_BOOKING_DURATION_MIN,
};
