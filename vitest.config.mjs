import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // The application intentionally keeps many React components in `.js`
  // files. Vite 8 otherwise parses those files as plain JavaScript before
  // the React transform sees them.
  oxc: {
    include: /\.[cm]?jsx?$/,
    exclude: /node_modules/,
    lang: "jsx",
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: [
      "src/**/*.test.{js,jsx,mjs}",
      "tests/unit/**/*.test.{js,jsx,mjs}",
    ],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: false,
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text-summary", "json-summary", "lcov", "html"],
      include: ["src/**/*.{js,mjs}"],
      exclude: [
        "src/**/*.test.{js,jsx,mjs}",
        "src/test/**",
        "src/messages/**",
        "src/translations/**",
        // This unreferenced legacy component imports two Embla packages that
        // are not declared by the application. Keep the baseline deterministic
        // while the code-review finding is resolved (restore coverage if the
        // component is revived, or remove the dead component).
        "src/components/carousel/EmblaCarousel.js",
      ],
      // Protect the business-critical coverage already earned while the global
      // baseline is raised incrementally. Whole-source global thresholds would
      // hide the real starting point by forcing broad exclusions.
      thresholds: {
        lines: 5,
        statements: 5,
        functions: 4,
        branches: 3,
        "src/utils/money.js": {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 90,
        },
        "src/config/permissions.js": {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 90,
        },
        "src/components/calendar/calendar.utils.js": {
          lines: 100,
          statements: 95,
          functions: 100,
          branches: 80,
        },
        "src/utils/locationBookingUtils.js": {
          lines: 100,
          statements: 95,
          functions: 100,
          branches: 75,
        },
        "src/lib/features/cart/cartSlice.js": {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 90,
        },
      },
    },
  },
});
