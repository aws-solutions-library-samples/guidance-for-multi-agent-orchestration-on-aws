import js from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["**/dist", "**/cdk.out"] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        linterOptions: {
            reportUnusedDisableDirectives: false,
        },
        plugins: {
            prettier: prettier,
        },
        rules: {
            "no-empty": ["error", { allowEmptyCatch: true }],
            "prettier/prettier": "warn",
            "@typescript-eslint/no-unused-vars": "warn",
        },
    }
);
