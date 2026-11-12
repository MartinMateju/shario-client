"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { initializeLanguage } from "@/lib/features/language/languageSlice";

/**
 * Component that initializes language from cookies when the app loads
 */
export default function LanguageInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize language from cookie on app start
    dispatch(initializeLanguage());
  }, [dispatch]);

  return children;
}
