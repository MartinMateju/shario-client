// Deliberately differs from production amounts: clients must display server data.
export const subscriptionCatalog = {
  offerId: "server_catalog_test",
  currencies: [
    "EUR",
    "USD",
    "CZK",
    "GBP",
    "CHF",
    "PLN",
    "DKK",
    "SEK",
    "NOK",
    "CAD",
    "AUD",
  ],
  plans: ["starter", "professional", "studio_plus", "enterprise"].map(
    (id, index) => ({
      id,
      monthly: {
        EUR: {
          amountMinor: 4321 + index * 1000,
          available: true,
          type: id === "enterprise" ? "from" : "fixed",
        },
        CZK: {
          amountMinor: 108765 + index * 10000,
          available: true,
          type: id === "enterprise" ? "from" : "fixed",
        },
        USD: { amountMinor: null, available: false, type: "fixed" },
      },
      yearly: {
        EUR: {
          amountMinor: id === "enterprise" ? null : 43210 + index * 10000,
          available: id !== "enterprise",
          type: id === "enterprise" ? "custom" : "fixed",
        },
        CZK: {
          amountMinor: id === "enterprise" ? null : 1087650 + index * 100000,
          available: id !== "enterprise",
          type: id === "enterprise" ? "custom" : "fixed",
        },
      },
    }),
  ),
};
