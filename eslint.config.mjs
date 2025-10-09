import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default await createConfigForNuxt({
	features: {
		stylistic: {
			indent: 'tab',
		},
	},
}).override('nuxt/typescript/rules', {
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
	},
})
