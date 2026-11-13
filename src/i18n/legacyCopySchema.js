export const legacyCopySchema = {
  otp: {
    digit: {
      parameters: ["position"],
    },
    resendCountdown: {
      parameters: ["seconds"],
    },
  },
  passwordRequest: {},
  passwordReset: {},
  passwordSuccess: {},
  portalError: {},
  portalLocations: {
    changed: {
      parameters: ["studio"],
    },
  },
  portalTour: {
    progress: {
      parameters: ["current", "total"],
    },
  },
  portalGate: {},
  portalHelp: {
    "topics.createBooking.steps": {
      array: true,
    },
    "topics.redeemVoucher.steps": {
      array: true,
    },
    "topics.cancelBooking.steps": {
      array: true,
    },
    "topics.editBooking.steps": {
      array: true,
    },
    "topics.useCredits.steps": {
      array: true,
    },
  },
  studioSwitcher: {
    changed: {
      parameters: ["name"],
    },
  },
  portalDashboard: {},
  bookingStatus: {},
  cartPayment: {},
  paymentMethods: {},
  bookingSidebar: {},
  customerDefaults: {
    "website.home.description": {
      parameters: [["studio"]],
    },
    "website.book.title": {
      parameters: [["studio"]],
    },
    "website.book.description": {
      parameters: [],
    },
    "website.courses.title": {
      parameters: [["studio"]],
    },
    "website.courses.description": {
      parameters: [],
    },
    "website.memberships.title": {
      parameters: [["studio"]],
    },
    "website.memberships.description": {
      parameters: [],
    },
    "website.vouchers.title": {
      parameters: [],
    },
    "website.vouchers.description": {
      parameters: [["studio"]],
    },
    "website.help.title": {
      parameters: [],
    },
    "website.help.description": {
      parameters: [],
    },
  },
  cart: {
    itemCount: {
      parameters: ["count"],
    },
  },
  creditBalance: {},
  creditHistory: {},
  creditsPage: {},
  bookingAvailability: {
    guestCount: {
      parameters: ["count"],
    },
  },
};
