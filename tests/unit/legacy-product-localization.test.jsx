import React from "react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { NextIntlClientProvider } from "next-intl";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ErrorModal from "@/components/modals/ErrorModal";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";

const store = configureStore({
  reducer: (state = { language: { language: "EN" } }) => state,
});

const catalogs = {
  de: {
    Legacy: {
      CLOSE: "Schließen",
      screens: {
        otp: {
          digit: "Ziffer {position} des Bestätigungscodes",
          resendCountdown: "Neuen Code in {seconds} Sekunden senden",
        },
      },
    },
  },
  el: {
    Legacy: {
      CLOSE: "Κλείσιμο",
      screens: {
        otp: {
          digit: "Ψηφίο {position} του κωδικού επαλήθευσης",
          resendCountdown: "Αποστολή νέου κωδικού σε {seconds} δευτερόλεπτα",
        },
      },
    },
  },
};

function LocaleProvider({ locale, children }) {
  return (
    <Provider store={store}>
      <NextIntlClientProvider
        locale={locale}
        messages={catalogs[locale]}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </Provider>
  );
}

function LegacyLabels() {
  const translation = useLegacyTranslation();
  const copy = useLegacyCopy("otp");
  return (
    <>
      <span>{translation.CLOSE.EN}</span>
      <span>{copy.digit(3)}</span>
      <span>{copy.resendCountdown(12)}</span>
    </>
  );
}

describe("legacy product localization", () => {
  it("uses the active locale for legacy dialogs even when Redux still says EN", () => {
    render(
      <LocaleProvider locale="de">
        <ErrorModal
          open
          setOpen={() => {}}
          title="Fehler"
          text="Bitte erneut versuchen."
        />
      </LocaleProvider>,
    );
    expect(screen.getAllByRole("button", { name: "Schließen" })).toHaveLength(
      2,
    );
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("updates labels and interpolated recovery messages when the locale changes", () => {
    const { rerender } = render(
      <LocaleProvider locale="de">
        <LegacyLabels />
      </LocaleProvider>,
    );
    expect(screen.getByText("Schließen")).toBeInTheDocument();
    expect(
      screen.getByText("Ziffer 3 des Bestätigungscodes"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Neuen Code in 12 Sekunden senden"),
    ).toBeInTheDocument();
    rerender(
      <LocaleProvider locale="el">
        <LegacyLabels />
      </LocaleProvider>,
    );
    expect(screen.getByText("Κλείσιμο")).toBeInTheDocument();
    expect(
      screen.getByText("Ψηφίο 3 του κωδικού επαλήθευσης"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Αποστολή νέου κωδικού σε 12 δευτερόλεπτα"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Schließen")).not.toBeInTheDocument();
  });
});
