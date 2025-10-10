#!/usr/bin/env node
/*
Generates LLM-friendly indexes from Markdown docs.
- llms.txt: compact title + URL list
- llms-full.txt: concatenated full content with URL/title headers

Usage:
  tsx scripts/generate-llms.ts --base-url https://orkestrel.github.io/core --docs docs --out docs
*/

import { promises as fs } from 'node:fs'
import path from 'node:path'

interface Args { baseUrl: string, docsDir: string, outDir: string }

function parseArgs(argv: string[]): Args {
	const args: Record<string, string> = {}
	for (let i = 2; i < argv.length; i += 2) {
		const key = argv[i]
		const val = argv[i + 1]
		if (!key?.startsWith('--') || !val) continue
		args[key.slice(2)] = val
	}
	const baseUrl = args['base-url']?.replace(/\/$/, '') || 'http://localhost/'
	const docsDir = args['docs'] || 'docs'
	const outDir = args['out'] || 'docs'
	return { baseUrl, docsDir, outDir }
}

async function* walk(dir: string): AsyncGenerator<string> {
	const entries = await fs.readdir(dir, { withFileTypes: true })
	for (const e of entries) {
		const p = path.join(dir, e.name)
		if (e.isDirectory()) {
			yield* walk(p)
		}
		else if (e.isFile() && (p.endsWith('.md') || p.endsWith('.mdx'))) {
			yield p
		}
	}
}

function relToUrl(baseUrl: string, docsDirAbs: string, filePathAbs: string): string {
	const rel = path.relative(docsDirAbs, filePathAbs).replace(/\\/g, '/')
	const withoutExt = rel.replace(/\.(md|mdx)$/i, '')
	return `${baseUrl}/${withoutExt}/`
}

function extractTitle(markdown: string, fallback: string): string {
	const h1 = markdown.match(/^#\s+(.+)$/m)
	if (h1?.[1]) return h1[1].trim()
	const any = markdown.match(/^#{1,6}\s+(.+)$/m)
	if (any?.[1]) return any[1].trim()
	return fallback
}

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true })
}

function computeWeight(docsDirAbs: string, filePathAbs: string): number {
	// Prioritize guide pages in a specific order, then other guides, then everything else
	const rel = path.relative(docsDirAbs, filePathAbs).replace(/\\/g, '/')
	const lower = rel.toLowerCase()
	if (lower.startsWith('guide/')) {
		const guideOrder = [
			'overview',
			'start',
			'concepts',
			'core',
			'ecosystem',
			'examples',
			'tips',
			'tests',
			'contribute',
		]
		for (let i = 0; i < guideOrder.length; i++) {
			const name = guideOrder[i]
			if (lower === `guide/${name}.md` || lower === `guide/${name}.mdx`) return i
		}
		// Other guide pages after the curated set
		return 100 + rel.localeCompare('') // stable but after curated
	}
	// Non-guide (e.g., API) comes after guides
	return 1000 + (rel ? rel.localeCompare('') : 0)
}

async function main() {
	const { baseUrl, docsDir, outDir } = parseArgs(process.argv)
	const absDocs = path.resolve(docsDir)
	const absOut = path.resolve(outDir)
	await ensureDir(absOut)

	type Entry = { title: string, url: string, content: string, weight: number }
	const entries: Entry[] = []

	for await (const file of walk(absDocs)) {
		const raw = await fs.readFile(file, 'utf8')
		const title = extractTitle(raw, path.basename(file, path.extname(file)))
		const url = relToUrl(baseUrl, absDocs, file)
		const weight = computeWeight(absDocs, file)
		entries.push({ title, url, content: raw, weight })
	}

	entries.sort((a, b) => (a.weight - b.weight) || a.url.localeCompare(b.url))

	const compact = entries.map(e => `${e.title}\n${e.url}`).join('\n\n') + '\n'
	await fs.writeFile(path.join(absOut, 'llms.txt'), compact, 'utf8')

	const full = entries.map(e => `URL: ${e.url}\nTitle: ${e.title}\n\n${e.content}\n\n---\n`).join('\n')
	await fs.writeFile(path.join(absOut, 'llms-full.txt'), full, 'utf8')

	console.log(`Generated ${entries.length} entries -> ${path.join(outDir, 'llms.txt')} and llms-full.txt`)
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
