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
	},
})
