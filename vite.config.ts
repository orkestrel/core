import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Vite config to bundle the library (ESM only)
export default defineConfig({
	build: {
		sourcemap: true,
		emptyOutDir: true,
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			formats: ['es'],
			fileName: () => 'index.js',
		},
		rollupOptions: {
			// Do not bundle Node built-ins or node: protocol imports
			external: [
				...builtinModules,
				/^node:.*/,
			],
		},
	},
})
