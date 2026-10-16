import eslint from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["dist", "node_modules"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: ["src/test/renderWithProviders.tsx"],
    // This test utility deliberately exports a render function and a wrapper
    // factory; it is not a production Fast Refresh component entry point.
    rules: { "react-refresh/only-export-components": "off" },
  },
])

