import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import jsdoc from 'eslint-plugin-jsdoc'
import tsdoc from 'eslint-plugin-tsdoc'

// Generate Nuxt + TypeScript base config
const base = await createConfigForNuxt({
	features: { stylistic: { indent: 'tab' } },
})

// Project TypeScript rule hardening
const orkTs = {
	name: 'orkestrel/typescript',
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
	},
}

// Common AST selectors for exported declarations
const exportedFns = [
	'ExportNamedDeclaration > FunctionDeclaration',
	'ExportDefaultDeclaration > FunctionDeclaration',
]
const exportedClasses = [
	'ExportNamedDeclaration > ClassDeclaration',
	'ExportDefaultDeclaration > ClassDeclaration',
]
const exportedMethods = [
	'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind=\'method\'][accessibility!=private][accessibility!=protected]',
	'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind=\'method\'][accessibility!=private][accessibility!=protected]',
]
const exportedGetters = [
	'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind=\'get\'][accessibility!=private][accessibility!=protected]',
	'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind=\'get\'][accessibility!=private][accessibility!=protected]',
]
const exportedSetters = [
	'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind=\'set\'][accessibility!=private][accessibility!=protected]',
	'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind=\'set\'][accessibility!=private][accessibility!=protected]',
]

// Project-specific TSDoc/JSDoc rules aligned with docs/contribute.md
const tsdocConfig = {
	name: 'orkestrel/tsdoc',
	plugins: { jsdoc, tsdoc },
	settings: {
		jsdoc: { mode: 'typescript', tagNamePreference: { returns: 'returns' } },
	},
	rules: {
		// Enforce TSDoc syntax compliance
		'tsdoc/syntax': 'error',
		// Disallow typing in JSDoc; TypeScript owns types
		'jsdoc/no-types': 'error',
		// Require documentation for exported/public API only
		'jsdoc/require-jsdoc': ['error', {
			publicOnly: { ancestorsOnly: false, cjs: true, esm: true },
			contexts: [
				...exportedFns,
				...exportedClasses,
				...exportedMethods,
				...exportedGetters,
				...exportedSetters,
			],
			checkConstructors: false,
		}],
		// Require a description on documented API
		'jsdoc/require-description': ['error', {
			contexts: [
				...exportedFns,
				...exportedClasses,
				...exportedMethods,
				...exportedGetters,
				...exportedSetters,
			],
		}],
		// Require @param for exported/public functions and methods
		'jsdoc/require-param': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
		'jsdoc/require-param-description': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
		// Require @returns with description for exported/public functions, methods, and getters
		'jsdoc/require-returns': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
		'jsdoc/require-returns-description': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
		// Require @example for exported/public functions, methods, and classes
		'jsdoc/require-example': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedClasses] }],
	},
}

export default [
	// Ignore docs from linting
	{ name: 'orkestrel/ignores', ignores: ['docs/**'] },
	...base,
	orkTs,
	// Enable example processing and defaults via built-in jsdoc config for ESLint 9
	...jsdoc.configs.examples,
	tsdocConfig,
]
