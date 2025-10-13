import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __rootdir = resolve(__dirname)

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		// setupFiles: ['./tests/setup.ts'],
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],
		testTimeout: 10000,
		hookTimeout: 10000,
	},
	resolve: {
		alias: {
			'@orkestrel/core': resolve(__rootdir, 'src', 'index.ts'),
		},
	},
})
