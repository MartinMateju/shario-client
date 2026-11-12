import { useHydrated } from "@/hooks/useHydrated";

/*
 * The server's year (UTC, or the build time of a prerendered page) can differ
 * from the visitor's around New Year. Render the year on an element that has
 * suppressHydrationWarning and yearKey as its key: hydration keeps the server
 * text, then the element is re-created with the browser's year.
 */
export const useCurrentYear = () => {
  const hydrated = useHydrated();

  return {
    year: new Date().getFullYear(),
    yearKey: hydrated ? "browser-year" : "server-year",
  };
};
