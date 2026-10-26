import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/", "public/charting_library/", "src/charting_library/"]),
  {
    files: ["**/*.{js,cjs,mjs,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // Existing exchange and TradingView boundaries are intentionally loosely typed.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
