import { configureStore } from "@reduxjs/toolkit";
import { NextIntlClientProvider } from "next-intl";
import { Provider } from "react-redux";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import messagesEn from "@/messages/en.json";
import { apiSlice } from "@/lib/features/api/apiSlice";
import authReducer from "@/lib/features/auth/authSlice";
import cartReducer from "@/lib/features/cart/cartSlice";
import configReducer from "@/lib/features/config/configSlice";
import creditsReducer from "@/lib/features/credits/creditsSlice";
import languageReducer from "@/lib/features/language/languageSlice";
import passReducer from "@/lib/features/pass/passSlice";
import studioContextReducer from "@/lib/features/studio/studioContextSlice";

export const makeTestStore = (preloadedState) =>
  configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: authReducer,
      cart: cartReducer,
      config: configReducer,
      credits: creditsReducer,
      language: languageReducer,
      pass: passReducer,
      studioContext: studioContextReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
    preloadedState,
  });

export const renderWithProviders = (
  ui,
  {
    locale = "en",
    messages = messagesEn,
    preloadedState,
    store = makeTestStore(preloadedState),
    ...renderOptions
  } = {},
) => {
  function TestProviders({ children }) {
    return (
      <Provider store={store}>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
        >
          {children}
        </NextIntlClientProvider>
      </Provider>
    );
  }

  return {
    store,
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: TestProviders,
      ...renderOptions,
    }),
  };
};

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
