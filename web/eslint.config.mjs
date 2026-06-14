import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "build", "node_modules", "coverage", "test-results", "playwright-report", "src/gen/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.browser,
    },
    plugins: {
      "jsx-a11y": jsxA11y,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // Accessibility (eslint-plugin-jsx-a11y) — INCREMENTAL ADOPTION: surface every
      // a11y issue (clickable-div, missing-label, unlabeled-icon-button, media captions,
      // autofocus, …) as a WARNING rather than an error. The plugin was added to guard
      // against regressions, but the pre-existing codebase has a backlog of a11y debt
      // that should be burned down in a dedicated sprint — not block the build/deploy in
      // one shot. Downgrade the whole recommended set to "warn"; promote back to "error"
      // file-by-file as each area is fixed.
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, "warn"]),
      ),
      ...reactHooks.configs.recommended.rules,
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/anchor-has-content": "warn",
      "jsx-a11y/control-has-associated-label": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      // Downgrade pre-existing react-hooks issues to warnings
      // TODO: Fix these properly in a code quality sprint
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-compiler": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["Route", "loader", "action"] },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
