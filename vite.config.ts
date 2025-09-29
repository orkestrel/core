import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __rootdir = path.resolve(__dirname)

// Vite config to bundle the library (ESM only)
export default defineConfig({
	root: path.resolve(__rootdir, 'src'),
	resolve: {
		alias: {
			'@orkestrel/core': path.resolve(__rootdir, 'src', 'index.ts'),
		},
	},
	build: {
		sourcemap: true,
		emptyOutDir: false,
		outDir: path.resolve(__rootdir, 'dist'),
		lib: {
			entry: 'index.ts',
			formats: ['es'],
			fileName: () => 'index.js',
		},
		rollupOptions: {
			external: [
				...builtinModules,
				/^node:.*/,
			],
		},
	},
})
