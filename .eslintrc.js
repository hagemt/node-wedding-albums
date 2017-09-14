/* eslint-env node */
module.exports = {

	extends: [
		'eslint:recommended',
		'plugin:import/recommended',
		'plugin:mocha/recommended',
		'plugin:react/recommended',
	],

	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		sourceType: 'module',
	},

	plugins: [
		'import',
		'mocha',
		'react',
	],

	rules: {
		'import/unambiguous': ['off'],
		'indent': ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		'quotes': ['error', 'single'],
		'semi': ['error', 'never'],
	},

}
