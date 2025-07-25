import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import tailwindcss from "eslint-plugin-tailwindcss";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.ts",
      "vite.config.ts",
      "postcss.config.js",
      "tailwind.config.js",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Browser
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        Audio: "readonly",
        HTMLElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLSpanElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        KeyboardEvent: "readonly",
        React: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        fetch: "readonly",
        crypto: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        // Node
        process: "readonly",
        // Jest
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      react: react,
      "react-hooks": reactHooks,
      import: importPlugin,
      prettier: prettier,
      tailwindcss: tailwindcss,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {},
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,

      // TypeScript
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",

      // Disallow classes - prefer functions and objects
      "no-restricted-syntax": [
        "error",
        {
          selector: "ClassDeclaration",
          message: "Classes are not allowed. Use functions and objects instead.",
        },
        {
          selector: "ClassExpression",
          message: "Classes are not allowed. Use functions and objects instead.",
        },
      ],

      // Prefer arrow functions
      "prefer-arrow-callback": "error",
      "func-style": ["error", "expression", { allowArrowFunctions: true }],

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import - Unused exports detection
      // Disabled due to flat config incompatibility
      // Use 'npm run check-exports' instead
      // 'import/no-unused-modules': ['warn', { unusedExports: true }],

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Prettier integration
      "prettier/prettier": ["error", {}, { usePrettierrc: true }],

      // Tailwind CSS
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": [
        "warn",
        {
          whitelist: ["shadow-xs", "toaster"],
        },
      ],
      "tailwindcss/no-contradicting-classname": "error",

      // Disable rules that conflict with Prettier
      ...prettierConfig.rules,
    },
  },
];
