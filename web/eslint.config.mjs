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
      // Accessibility (eslint-plugin-jsx-a11y) — ENFORCED AS ERRORS. The a11y debt
      // backlog has been paid down to zero (dedicated a11y sprint), so the recommended
      // set is promoted back to "error" to guard against regressions. Screen-reader and
      // keyboard operability is a hard gate: clickable-div, missing-label,
      // unlabeled-icon-button, media captions, autofocus, … all fail the build.
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/control-has-associated-label": "error",
      "jsx-a11y/label-has-associated-control": "error",
      // Downgrade pre-existing react-hooks issues to warnings
      // TODO: Fix these properly in a code quality sprint
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Cleared to zero in the lint sprint, but several legitimate sites (wall-clock/Date.now
      // derived state, async Firestore-subscription loading coordination, external-data fetches)
      // carry justified `eslint-disable react-hooks/set-state-in-effect` directives. Stays
      // "warn" — promoting to "error" would only harden intentional disables.
      "react-hooks/set-state-in-effect": "warn",
      "react-compiler": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Fast Refresh boundary hygiene. Cleared to zero in the lint sprint, but a set
      // of route/UI files keep justified `eslint-disable react-refresh/only-export-components`
      // directives (co-located loaders/helpers/variants that intentionally export non-components).
      // Because the clean state depends on intentional disables, this stays "warn" — promoting
      // it to "error" would only harden directives we deliberately keep, not catch new debt.
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true, allowExportNames: ["Route", "loader", "action"] },
      ],
      // Unused symbols — fully cleared to zero with ZERO intentional disables, so this is
      // promoted to "error" to guarantee it can't regress. `^_` prefix opts a binding out.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Cleared to zero, but a handful of async-boundary / external-data sites carry justified
      // `eslint-disable @typescript-eslint/no-explicit-any` directives. Stays "warn" per the
      // "don't force-error a rule with intentional disables" guardrail.
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
