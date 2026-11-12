const CUSTOMER_FACING_CUSTOMIZATION_DEFAULTS = Object.freeze({
  en: Object.freeze({
    login: Object.freeze({
      eyebrow: "Your creative place",
      headline: "Welcome back.",
      description:
        "Sign in to keep your bookings, memberships and credits together in one calm place.",
    }),
    register: Object.freeze({
      eyebrow: "One account for this studio",
      headline: "Everything you create, kept together.",
      description:
        "A simple way to access your bookings, pieces, courses and credits with this studio.",
    }),
    portal: Object.freeze({
      eyebrow: "Your studio",
      headline: "Welcome back",
      description:
        "Your bookings, creative work and studio benefits in one calm place.",
    }),
    website: Object.freeze({
      home: Object.freeze({
        description: ({ studio }) =>
          `Discover ${studio}, explore the ways to visit and find everything you need before your next studio day.`,
      }),
      book: Object.freeze({
        title: ({ studio }) => `See when ${studio} is occupied`,
        description: () =>
          "Choose a studio and browse the occupied periods currently shown before you sign in.",
      }),
      courses: Object.freeze({
        title: ({ studio }) => `Classes at ${studio}`,
        description: () =>
          "Discover published classes. Sign in to continue to available dates.",
      }),
      memberships: Object.freeze({
        title: ({ studio }) => `Memberships at ${studio}`,
        description: () =>
          "Compare published plans, locations, prices, monthly credits, automatic discounts and included perks.",
      }),
      vouchers: Object.freeze({
        title: () => "A thoughtful studio gift",
        description: ({ studio }) =>
          `Choose a published gift voucher and send someone the freedom to create at ${studio}.`,
      }),
      help: Object.freeze({
        title: () => "Everything you need for your next studio visit",
        description: () =>
          "Find approved studio guides, videos, answers and useful resources in one place.",
      }),
    }),
  }),
  cs: Object.freeze({
    login: Object.freeze({
      eyebrow: "Váš prostor pro tvoření",
      headline: "Vítejte zpět.",
      description:
        "Přihlaste se a mějte rezervace, výrobky i kredity přehledně na jednom místě.",
    }),
    register: Object.freeze({
      eyebrow: "Jeden účet pro toto studio",
      headline: "Vše, co tvoříte, přehledně spolu.",
      description:
        "Jednoduchý přístup k rezervacím, výrobkům, kurzům i kreditům tohoto studia.",
    }),
    portal: Object.freeze({
      eyebrow: "Vaše studio",
      headline: "Vítejte zpět",
      description:
        "Rezervace, vaše tvorba a výhody studia na jednom klidném místě.",
    }),
    website: Object.freeze({
      home: Object.freeze({
        description: ({ studio }) =>
          `Objevte ${studio}, prohlédněte si možnosti návštěvy a zjistěte vše potřebné před dalším dnem ve studiu.`,
      }),
      book: Object.freeze({
        title: ({ studio }) => `Podívejte se, kdy je ${studio} obsazené`,
        description: () =>
          "Vyberte studio a ještě před přihlášením si prohlédněte zobrazené obsazené časy.",
      }),
      courses: Object.freeze({
        title: ({ studio }) => `Kurzy v ${studio}`,
        description: () =>
          "Objevte zveřejněné kurzy. Pro pokračování k termínům se přihlaste.",
      }),
      memberships: Object.freeze({
        title: ({ studio }) => `Členství ve studiu ${studio}`,
        description: () =>
          "Porovnejte zveřejněné plány, pobočky, ceny, měsíční kredity, automatické slevy a zahrnuté výhody.",
      }),
      vouchers: Object.freeze({
        title: () => "Dárek pro radost z tvorby",
        description: ({ studio }) =>
          `Vyberte zveřejněný dárkový poukaz a darujte někomu svobodu tvořit ve studiu ${studio}.`,
      }),
      help: Object.freeze({
        title: () => "Vše potřebné pro vaši další návštěvu studia",
        description: () =>
          "Najděte ověřené návody, videa, odpovědi a užitečné materiály studia na jednom místě.",
      }),
    }),
  }),
});

const localeKey = (locale) =>
  String(locale ?? "")
    .trim()
    .toLowerCase()
    .startsWith("cs")
    ? "cs"
    : "en";

export const getCustomerAuthCustomizationDefaults = (mode, locale) => {
  const surface = mode === "register" ? "register" : "login";
  return CUSTOMER_FACING_CUSTOMIZATION_DEFAULTS[localeKey(locale)][surface];
};

export const getCustomerPortalCustomizationDefaults = (locale) =>
  CUSTOMER_FACING_CUSTOMIZATION_DEFAULTS[localeKey(locale)].portal;

export const getPublicWebsitePageCustomizationDefaults = ({
  page,
  locale,
  studio = "",
}) => {
  const website =
    CUSTOMER_FACING_CUSTOMIZATION_DEFAULTS[localeKey(locale)].website;
  const definition = website[page] || website.home;
  const context = { studio: String(studio || "").trim() };

  return {
    title: definition.title?.(context) || "",
    description: definition.description?.(context) || "",
  };
};
