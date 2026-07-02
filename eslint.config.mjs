import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // API routes use `any` extensively for external service payloads
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars in catch blocks are common pattern
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      // Module assignment pattern used in some legacy API routes
      "@next/next/no-assign-module-variable": "warn",
    },
  },
]);

export default eslintConfig;
