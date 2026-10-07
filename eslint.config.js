const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const robloxTs = require("eslint-plugin-roblox-ts");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
	{ ignores: ["out/**"] },
	js.configs.recommended,
	...tsPlugin.configs["flat/recommended"],
	{
		files: ["**/*.ts", "**/*.tsx"],
		plugins: { "roblox-ts": robloxTs },
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaFeatures: { jsx: true },
				ecmaVersion: 2018,
				sourceType: "module",
				project: "./tsconfig.json",
			},
		},
		rules: {
			...robloxTs.configs.recommended.rules,
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
		},
	},
	prettierRecommended,
	{ rules: { "prettier/prettier": "warn" } },
];
