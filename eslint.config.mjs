import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "node_modules/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // These legacy components predate the React Compiler lint rules. Keep the
    // rest of the application strict while they are migrated incrementally.
    files: [
      "src/components/bookings/**/*.{js,jsx}",
      "src/components/calendars/**/*.{js,jsx}",
      "src/components/carousel/**/*.{js,jsx}",
      "src/components/forms/**/*.{js,jsx}",
      "src/components/galleries/**/*.{js,jsx}",
      "src/components/menu/**/*.{js,jsx}",
      "src/components/modals/**/*.{js,jsx}",
      "src/components/tables/**/*.{js,jsx}",
      "src/components/views/**/*.{js,jsx}",
    ],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
