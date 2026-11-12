import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import PlanEditorDialog from "@/components/memberships/PlanEditorDialog";

const labels = {
  createEyebrow: "New membership",
  editEyebrow: "Plan draft",
  createTitle: "Create membership plan",
  editTitle: "Edit membership plan",
  close: "Close plan editor",
  name: "Plan name",
  description: "Description",
  pricingTitle: "Pricing",
  pricingHint: "Plan prices",
  currency: "Currency",
  amount: "Amount",
  removePrice: "Remove price",
  addPrice: "Add price",
  billingType: "Billing type",
  recurring: "Recurring",
  fixed: "Fixed term",
  interval: "Interval",
  monthly: "Monthly",
  yearly: "Yearly",
  intervalCount: "Interval count",
  durationDays: "Duration in days",
  locationsTitle: "Locations",
  allLocations: "All locations",
  selectedLocations: "Selected locations",
  sharedSelectedLocations: "Shared locations",
  hourQuantity: "Hours per paid period",
  hoursValidation: "Hours must equal whole minutes",
  rolloverPercent: "Carryover limit",
  rolloverHint: "Monthly only, up to 25 percent",
  oneProductDiscount: "Choose one product or personal course discount",
  "benefitTypes.studio_hours.title": "Personal studio hours",
  "benefitTypes.course_discount.title": "Personal course discount",
  "benefitDefaults.studio_hours": "Open Studio hours",
  "benefitDefaults.course_discount": "My course discount",
  benefitsTitle: "Benefits",
  benefitsHint: "Add plan benefits",
  "benefitTypes.monthly_credits.title": "Monthly credits",
  "benefitTypes.monthly_credits.description": "Credits every month",
  "benefitTypes.monthly_credits.editorHint": "Monthly credit allowance",
  "benefitTypes.product_discount.title": "Product discount",
  "benefitTypes.product_discount.description": "Discount products",
  "benefitTypes.product_discount.editorHint": "Automatic discount",
  "benefitTypes.custom_perk.title": "Custom perk",
  "benefitTypes.custom_perk.description": "Describe another perk",
  "benefitTypes.custom_perk.editorHint": "Customer-facing perk",
  "benefitDefaults.monthly_credits": "Monthly studio credits",
  "benefitDefaults.product_discount": "Product discount",
  "benefitDefaults.custom_perk": "Member lounge access",
  alreadyAdded: "Already added",
  noBenefits: "No benefits",
  removeBenefit: "Remove benefit",
  benefitLabel: "Benefit label",
  monthlyCreditQuantity: "Credits per month",
  monthlyCreditResetHint: "Refreshes monthly",
  percentage: "Discount percentage",
  productDiscountHint: "Applied at checkout",
  "legacyBenefit.title": "Legacy benefit",
  "legacyBenefit.description": "Preserved for compatibility",
  "legacyBenefit.preserved": "Saved unchanged",
  terms: "Terms",
  termsHint: "Customer terms",
  positivePriceRequired: "Enter a price greater than zero",
  locationRequired: "Select at least one studio location",
  requestError: "Plan could not be saved",
  cancel: "Cancel",
  save: "Save plan",
  saving: "Saving plan",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => labels[key] || key,
}));

const locations = [
  { id: "brno", name: "Brno" },
  { id: "prague", name: "Prague" },
];

const renderEditor = (props = {}) => {
  const onClose = vi.fn();
  const onSave = vi.fn();

  const view = render(
    <PlanEditorDialog
      open
      plan={null}
      locations={locations}
      defaultCurrency="CZK"
      saving={false}
      requestError={false}
      onClose={onClose}
      onSave={onSave}
      {...props}
    />,
  );

  return { onClose, onSave, ...view };
};

describe("membership plan editor", () => {
  it("serializes shared personal hours and a selected-course discount without granting guests benefits", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      courses: [
        { id: "wheel", name: { EN: "Wheel course", CZ: "Točení" } },
        { id: "glaze", name: "Glazing" },
      ],
    });
    fireEvent.change(screen.getByLabelText("Plan name"), {
      target: { value: "Shared member" },
    });
    fireEvent.change(screen.getByLabelText("Amount"), {
      target: { value: "1690" },
    });
    await user.click(screen.getByLabelText("Shared locations"));
    await user.click(screen.getByLabelText("Brno"));
    await user.click(screen.getByLabelText("Prague"));
    await user.click(
      screen.getByRole("button", { name: /Personal studio hours/ }),
    );
    fireEvent.change(screen.getByLabelText(/Hours per paid period/), {
      target: { value: "4.5" },
    });
    fireEvent.change(screen.getByLabelText(/Carryover limit/), {
      target: { value: "25" },
    });
    await user.click(
      screen.getByRole("button", { name: /Personal course discount/ }),
    );
    expect(
      screen.getByRole("button", { name: /Product discount/ }),
    ).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Discount percentage/), {
      target: { value: "10" },
    });
    await user.click(screen.getByLabelText("Wheel course"));
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        locationScope: {
          type: "shared_selected",
          locationIds: ["brno", "prague"],
        },
        benefits: [
          expect.objectContaining({
            type: "allowance",
            unit: "minute",
            quantity: 270,
            usageScope: "open_studio",
            memberOnly: true,
            rolloverPercent: 25,
          }),
          expect.objectContaining({
            type: "percentage",
            percentageBps: 1000,
            appliesTo: "products",
            productScope: "courses",
            memberOnly: true,
            eligibleProductIds: ["wheel"],
          }),
        ],
      }),
    );
  });

  it("preserves personal benefit scope when editing and rejects fractional minutes and nonmonthly carryover", async () => {
    const user = userEvent.setup();
    const benefits = [
      {
        key: "hours",
        label: "Hours",
        type: "allowance",
        unit: "minute",
        quantity: 270,
        usageScope: "open_studio",
        memberOnly: true,
        rolloverPercent: 25,
      },
      {
        key: "course",
        label: "Courses",
        type: "percentage",
        percentageBps: 500,
        appliesTo: "products",
        productScope: "courses",
        memberOnly: true,
        eligibleProductIds: ["old-course"],
      },
    ];
    const { onSave } = renderEditor({
      plan: {
        name: "Hours",
        prices: [{ amountMinor: 100000, currency: "CZK" }],
        billing: { type: "recurring", interval: "month", intervalCount: 1 },
        locationScope: {
          type: "shared_selected",
          locationIds: ["brno", "prague"],
        },
        benefits,
      },
    });
    expect(screen.getByLabelText(/Hours per paid period/)).toHaveValue(4.5);
    expect(screen.getByLabelText("Shared locations")).toBeChecked();
    expect(screen.getByLabelText("old-course")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave.mock.calls[0][0].benefits).toEqual(benefits);
    onSave.mockClear();
    fireEvent.change(screen.getByLabelText(/Hours per paid period/), {
      target: { value: "1.01" },
    });
    fireEvent.submit(
      screen.getByLabelText(/Hours per paid period/).closest("form"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Hours must equal whole minutes",
    );
    fireEvent.change(screen.getByLabelText(/Hours per paid period/), {
      target: { value: "4.5" },
    });
    await user.selectOptions(screen.getByLabelText("Interval"), "year");
    fireEvent.submit(
      screen.getByLabelText(/Hours per paid period/).closest("form"),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Monthly only, up to 25 percent",
    );
    expect(onSave).not.toHaveBeenCalled();
  });
  it("builds a fixed, location-scoped plan with all supported benefits", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.type(screen.getByLabelText("Plan name"), "Studio Member");
    await user.type(screen.getByLabelText("Description"), "Monthly access");
    await user.type(screen.getByLabelText("Amount"), "1990");
    await user.selectOptions(screen.getByLabelText("Billing type"), "fixed");
    await user.clear(screen.getByLabelText("Duration in days"));
    await user.type(screen.getByLabelText("Duration in days"), "90");
    await user.click(screen.getByLabelText("Selected locations"));
    await user.click(screen.getByLabelText("Brno"));

    await user.click(screen.getByRole("button", { name: /Monthly credits/ }));
    await user.clear(screen.getByLabelText(/Credits per month/));
    await user.type(screen.getByLabelText(/Credits per month/), "8");
    await user.click(screen.getByRole("button", { name: /Product discount/ }));
    expect(
      screen.getByRole("button", { name: /Personal course discount/ }),
    ).toBeDisabled();
    await user.type(screen.getByLabelText(/Discount percentage/), "15.5");
    await user.click(screen.getByRole("button", { name: /Custom perk/ }));
    await user.type(screen.getByLabelText(/Terms/), "Renews after 90 days.");
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Studio Member",
      description: "Monthly access",
      terms: "Renews after 90 days.",
      prices: [{ currency: "CZK", amountMinor: 199000 }],
      billing: { type: "fixed", durationDays: 90 },
      locationScope: { type: "selected", locationIds: ["brno"] },
      benefits: [
        expect.objectContaining({
          type: "allowance",
          unit: "credit",
          quantity: 8,
        }),
        expect.objectContaining({
          type: "percentage",
          appliesTo: "products",
          percentageBps: 1550,
        }),
        expect.objectContaining({ type: "boolean", enabled: true }),
      ],
    });
  });

  it("hydrates an existing version and preserves unsupported legacy benefits", async () => {
    const user = userEvent.setup();
    const legacyBenefit = {
      key: "priority",
      label: "Priority booking",
      type: "limit",
      limit: 3,
      appliesTo: "bookings",
    };
    const plan = {
      id: "plan-1",
      sortOrder: 4,
      draftVersion: {
        name: "Annual member",
        description: "Annual plan",
        terms: "Existing terms",
        prices: [{ currency: "CZK", amountMinor: 12345 }],
        billing: { type: "recurring", interval: "year", intervalCount: 2 },
        locationScope: { type: "selected", locationIds: ["prague"] },
        benefits: [legacyBenefit],
      },
    };
    const { onSave } = renderEditor({ plan });

    expect(
      screen.getByRole("dialog", { name: "Edit membership plan" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Plan name")).toHaveValue("Annual member");
    expect(screen.getByLabelText("Amount")).toHaveValue(123.45);
    expect(screen.getByLabelText("Interval")).toHaveValue("year");
    expect(screen.getByLabelText("Interval count")).toHaveValue(2);
    expect(screen.getByLabelText("Prague")).toBeChecked();
    expect(screen.getByLabelText("Benefit label")).toHaveValue(
      "Priority booking",
    );

    await user.click(screen.getByRole("button", { name: "Save plan" }));

    expect(onSave).toHaveBeenCalledWith({
      name: "Annual member",
      description: "Annual plan",
      terms: "Existing terms",
      sortOrder: 4,
      prices: [{ currency: "CZK", amountMinor: 12345 }],
      billing: { type: "recurring", interval: "year", intervalCount: 2 },
      locationScope: { type: "selected", locationIds: ["prague"] },
      benefits: [legacyBenefit],
    });
  });

  it("surfaces request state and relies on native required-field validation", async () => {
    const user = userEvent.setup();
    const { onClose, onSave, unmount } = renderEditor({
      saving: true,
      requestError: true,
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Plan could not be saved",
    );
    expect(screen.getByRole("button", { name: "Saving plan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).not.toHaveBeenCalled();
    unmount();

    const { onSave: invalidSave } = renderEditor();
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(invalidSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Plan name"), "Fixed plan");
    await user.type(screen.getByLabelText("Amount"), "0");
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(screen.getByLabelText("Amount")).toBeInvalid();
    expect(invalidSave).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "500");
    await user.selectOptions(screen.getByLabelText("Billing type"), "fixed");
    await user.clear(screen.getByLabelText("Duration in days"));
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(invalidSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Duration in days")).toBeInvalid();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("requires a location for a selected-location plan", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.type(screen.getByLabelText("Plan name"), "Local plan");
    await user.type(screen.getByLabelText("Amount"), "500");
    await user.click(screen.getByLabelText("Selected locations"));
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select at least one studio location",
    );
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText("Brno"));
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("rejects a hydrated plan containing both discount variants until one is removed", () => {
    const { onSave } = renderEditor({
      plan: {
        name: "Invalid mixed discounts",
        prices: [{ amountMinor: 100000, currency: "CZK" }],
        benefits: [
          {
            key: "all",
            label: "All products",
            type: "percentage",
            percentageBps: 1000,
            appliesTo: "products",
          },
          {
            key: "course",
            label: "Courses",
            type: "percentage",
            percentageBps: 500,
            appliesTo: "products",
            productScope: "courses",
            memberOnly: true,
            eligibleProductIds: [],
          },
        ],
      },
    });
    fireEvent.submit(screen.getByLabelText("Plan name").closest("form"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose one product or personal course discount",
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves secondary-language names, descriptions, terms and benefit labels without changing primary text", async () => {
    const user = userEvent.setup();
    const plan = {
      name: "Chvíle pro sebe",
      description: "Čtyři hodiny tvoření",
      terms: "České podmínky",
      prices: [{ currency: "CZK", amountMinor: 89000 }],
      benefits: [
        {
          key: "materials",
          type: "boolean",
          label: "Materiály v ceně",
          enabled: true,
        },
      ],
    };
    const { onSave } = renderEditor({
      plan,
      languageSettings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
    });

    expect(screen.getByLabelText("Plan name · Čeština")).toHaveValue(
      "Chvíle pro sebe",
    );
    expect(
      screen.queryByLabelText("Plan name · Deutsch"),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Plan name · English"),
      "Time for yourself",
    );
    await user.type(
      screen.getByLabelText("Description · English"),
      "Four hours of making",
    );
    await user.type(
      screen.getByLabelText("Terms · English"),
      "English conditions",
    );
    await user.type(
      screen.getByLabelText("Benefit label · English"),
      "Materials included",
    );
    await user.click(screen.getByRole("button", { name: "Save plan" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: plan.name,
        description: plan.description,
        terms: plan.terms,
        translations: {
          en: {
            name: "Time for yourself",
            description: "Four hours of making",
            terms: "English conditions",
          },
        },
        benefits: [
          {
            ...plan.benefits[0],
            translations: { en: { label: "Materials included" } },
          },
        ],
      }),
    );
  });

  it("preserves translations for an inactive language and legacy benefit rules while editing the selected language", async () => {
    const user = userEvent.setup();
    const legacy = {
      key: "priority-booking",
      label: "Přednostní rezervace",
      type: "limit",
      limit: 3,
      appliesTo: "bookings",
      translations: { en: { label: "Priority booking" } },
    };
    const existingTranslations = {
      en: {
        name: "Time for yourself",
        description: "English description",
        terms: "English terms",
      },
    };
    const { onSave } = renderEditor({
      languageSettings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "de"],
      },
      plan: {
        publishedVersion: {
          name: "Chvíle pro sebe",
          description: "Popis",
          terms: "Podmínky",
          translations: existingTranslations,
          prices: [
            { currency: "CZK", amountMinor: 89000 },
            { currency: "EUR", amountMinor: 3500 },
          ],
          benefits: [legacy],
        },
      },
    });
    expect(
      screen.queryByLabelText("Plan name · English"),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Plan name · Deutsch"),
      "Zeit für dich",
    );
    await user.type(
      screen.getByLabelText("Benefit label · Deutsch"),
      "Bevorzugte Buchung",
    );
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: {
          ...existingTranslations,
          de: { name: "Zeit für dich" },
        },
        prices: [
          { currency: "CZK", amountMinor: 89000 },
          { currency: "EUR", amountMinor: 3500 },
        ],
        benefits: [
          {
            ...legacy,
            translations: {
              ...legacy.translations,
              de: { label: "Bevorzugte Buchung" },
            },
          },
        ],
      }),
    );
  });

  it("allows clearing a secondary translation for fallback while primary names remain required", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      languageSettings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
      plan: {
        name: "Člen",
        translations: { en: { name: "Member" } },
        prices: [{ currency: "CZK", amountMinor: 89000 }],
      },
    });
    const primaryName = screen.getByLabelText("Plan name · Čeština");
    const secondaryName = screen.getByLabelText("Plan name · English");
    expect(primaryName).toBeRequired();
    expect(secondaryName).not.toBeRequired();
    await user.clear(secondaryName);
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Člen",
        translations: { en: { name: "" } },
      }),
    );
    onSave.mockClear();
    await user.clear(primaryName);
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(primaryName).toBeInvalid();
    expect(onSave).not.toHaveBeenCalled();
    await user.type(primaryName, "   ");
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(primaryName).toBeInvalid();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps a new benefit focused while typing its primary and secondary labels", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      languageSettings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
      plan: {
        name: "Člen",
        prices: [{ currency: "CZK", amountMinor: 89000 }],
      },
    });
    await user.click(screen.getByRole("button", { name: /Custom perk/ }));
    const primaryLabel = screen.getByLabelText("Benefit label · Čeština");
    await user.clear(primaryLabel);
    await user.type(primaryLabel, "Přednostní rezervace");
    expect(primaryLabel).toHaveFocus();
    expect(primaryLabel).toHaveValue("Přednostní rezervace");
    await user.type(
      screen.getByLabelText("Benefit label · English"),
      "Priority booking",
    );
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        benefits: [
          expect.objectContaining({
            label: "Přednostní rezervace",
            translations: { en: { label: "Priority booking" } },
          }),
        ],
      }),
    );
  });

  it("moves primary-language content without losing the previous language or stale primary-map edits", async () => {
    const user = userEvent.setup();
    const original = {
      sourceLanguage: "cs",
      name: "Členství",
      description: "Český popis",
      terms: "České podmínky",
      translations: {
        en: {
          name: "Membership",
          description: "English description",
          terms: "English terms",
        },
      },
      prices: [{ currency: "CZK", amountMinor: 89000 }],
      benefits: [
        {
          key: "member-priority",
          type: "boolean",
          enabled: true,
          label: "Přednostní rezervace",
          translations: { en: { label: "Priority booking" } },
        },
      ],
    };
    const first = renderEditor({
      languageSettings: {
        publicDefaultLanguage: "en",
        supportedPublicLanguages: ["en", "de"],
      },
      plan: { publishedVersion: original },
    });
    expect(screen.getByLabelText("Plan name · English")).toHaveValue(
      "Membership",
    );
    expect(screen.getByLabelText("Description · English")).toHaveValue(
      "English description",
    );
    expect(screen.getByLabelText(/^Terms · English/)).toHaveValue(
      "English terms",
    );
    expect(screen.getByLabelText("Benefit label · English")).toHaveValue(
      "Priority booking",
    );
    await user.clear(screen.getByLabelText("Plan name · English"));
    await user.type(
      screen.getByLabelText("Plan name · English"),
      "New membership",
    );
    await user.clear(screen.getByLabelText("Benefit label · English"));
    await user.type(
      screen.getByLabelText("Benefit label · English"),
      "Early booking",
    );
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    const payload = first.onSave.mock.calls[0][0];
    expect(payload).toMatchObject({
      sourceLanguage: "en",
      name: "New membership",
      translations: {
        cs: {
          name: "Členství",
          description: "Český popis",
          terms: "České podmínky",
        },
        en: {
          name: "New membership",
          description: "English description",
          terms: "English terms",
        },
      },
      benefits: [
        {
          key: "member-priority",
          label: "Early booking",
          translations: {
            cs: { label: "Přednostní rezervace" },
            en: { label: "Early booking" },
          },
        },
      ],
    });
    first.unmount();
    const second = renderEditor({
      languageSettings: {
        publicDefaultLanguage: "cs",
        supportedPublicLanguages: ["cs", "en"],
      },
      plan: { draftVersion: payload },
    });
    expect(screen.getByLabelText("Plan name · Čeština")).toHaveValue(
      "Členství",
    );
    expect(screen.getByLabelText("Benefit label · Čeština")).toHaveValue(
      "Přednostní rezervace",
    );
    expect(screen.getByLabelText("Plan name · English")).toHaveValue(
      "New membership",
    );
    expect(screen.getByLabelText("Benefit label · English")).toHaveValue(
      "Early booking",
    );
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(second.onSave).toHaveBeenCalledWith(
      expect.objectContaining({ sourceLanguage: "cs", name: "Členství" }),
    );
  });

  it("edits only the primary price and preserves existing alternate prices unchanged", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      plan: {
        name: "Member",
        prices: [
          { currency: "EUR", amountMinor: 3533 },
          { currency: "CZK", amountMinor: 89000 },
        ],
      },
    });
    expect(screen.getByLabelText("Currency")).toHaveValue("CZK");
    expect(screen.getByLabelText("Currency")).toHaveAttribute("readonly");
    expect(
      screen.queryByRole("combobox", { name: "Currency" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add price" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove price" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Amount")).toHaveLength(1);
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "990");
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        prices: [
          { currency: "EUR", amountMinor: 3533 },
          { currency: "CZK", amountMinor: 99000 },
        ],
      }),
    );
  });

  it("requires adding a missing primary price without overwriting the legacy alternate price", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      plan: {
        name: "Member",
        prices: [{ currency: "EUR", amountMinor: 3533 }],
      },
    });
    const amount = screen.getByLabelText("Amount");
    expect(amount).toHaveValue(null);
    expect(amount).toBeRequired();
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).not.toHaveBeenCalled();
    await user.type(amount, "890");
    await user.click(screen.getByRole("button", { name: "Save plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        prices: [
          { currency: "EUR", amountMinor: 3533 },
          { currency: "CZK", amountMinor: 89000 },
        ],
      }),
    );
  });
});
