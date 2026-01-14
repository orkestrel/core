import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
	test: {
		include: ['tests/**/*.test.ts'],
		testTimeout: 10000,
		hookTimeout: 10000,
		teardownTimeout: 5000,
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [
				{ browser: 'chromium' },
			],
		},
		setupFiles: ['./tests/setup.ts'],
	},
	resolve: {
		alias: {
			'@orkestrel/core': resolve(__dirname, 'src', 'index.ts'),
		},
	},
})
