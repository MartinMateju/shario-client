"use client";

import { createSlice } from "@reduxjs/toolkit";

import { normalizeLegacyLanguage } from "@/i18n/locales";

const languageSlice = createSlice({
  name: "language",
  initialState: { language: "EN" },
  reducers: {
    updateLanguage: (state, action) => {
      const validLanguage = normalizeLegacyLanguage(action.payload);
      state.language = validLanguage;
    },
  },
});

export const { updateLanguage } = languageSlice.actions;

export default languageSlice.reducer;

export const selectCurrentLanguage = (state) => state.language.language;
