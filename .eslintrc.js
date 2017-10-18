/* eslint-env node */
module.exports = {

	env: {
		es6: true,
	},

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
		ecmaVersion: 2017,
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
