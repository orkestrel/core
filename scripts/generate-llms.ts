#!/usr/bin/env node
/*
Generates LLM-friendly indexes from Markdown docs in the llmstxt.org style.
- llms.txt: site header + optional summary + Table of Contents with Markdown links
- llms-full.txt: site header + optional summary + concatenated full content with section headers and separators

Usage (Windows-friendly):
  tsx scripts\generate-llms.ts --base-url https://orkestrel.github.io/core --docs docs --out docs [--site-title "Orkestrel Core"] [--site-summary "Short summary"]
*/

import { readFileSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs as parseCliArgs } from 'node:util'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

export interface GenerateOptions { baseUrl: string, docsDir: string, outDir: string, siteTitle?: string, siteSummary?: string }

// Walk a directory tree yielding .md/.mdx files
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

// Compute a public URL from a docs-relative file path
function relToUrl(baseUrl: string, docsDirAbs: string, filePathAbs: string): string {
	const rel = path.relative(docsDirAbs, filePathAbs).replace(/\\/g, '/')
	const withoutExt = rel.replace(/\.(md|mdx)$/i, '')
	return `${baseUrl}/${withoutExt}`
}

// Extract the first heading text as a title, falling back to filename
function extractTitle(markdown: string, fallback: string): string {
	const h1 = markdown.match(/^#\s+(.+)$/m)
	if (h1?.[1]) return h1[1].trim()
	const any = markdown.match(/^#{1,6}\s+(.+)$/m)
	if (any?.[1]) return any[1].trim()
	return fallback
}

// Detect YAML frontmatter with draft: true (CRLF/LF safe)
function isDraft(markdown: string): boolean {
	const fm = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
	if (!fm) return false
	return /\bdraft\s*:\s*true\b/i.test(fm[1])
}

// Remove YAML frontmatter block if present (CRLF/LF safe)
function stripFrontmatter(markdown: string): string {
	return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

// Ensure a directory exists recursively
async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true })
}

// Provide ordering weight: curated order for guide pages; fallback groups others later
function computeWeight(docsDirAbs: string, filePathAbs: string): number {
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
		return 100
	}
	return 1000
}

// Read package name/description from the current working directory
async function readPkgMeta(cwd: string): Promise<{ name?: string, description?: string }> {
	try {
		const pkgRaw = await fs.readFile(path.join(cwd, 'package.json'), 'utf8')
		const pkg = JSON.parse(pkgRaw) as { name?: string, description?: string }
		return { name: pkg.name, description: pkg.description }
	}
	catch {
		return {}
	}
}

// Capitalize the first character (for folder disambiguators)
function toProperCase(s: string): string {
	if (!s) return s
	return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Generate llms.txt (compact index) and llms-full.txt (full corpus) following llmstxt.org conventions.
 *
 * The compact file contains a header, optional summary, and a Table of Contents with Markdown links.
 * The full file contains a header, optional summary, then an H2 section for each document with separators.
 * Draft pages (frontmatter `draft: true`) are excluded, and YAML frontmatter is stripped from content.
 * Duplicate titles in the full file are made unique with folder suffixes or numeric counters.
 *
 * @param opts - Generation options:
 * - baseUrl: Base URL for computed links (no trailing slash)
 * - docsDir: Directory to scan for .md/.mdx files
 * - outDir: Directory to write llms.txt and llms-full.txt
 * - siteTitle: Optional site title to use in headers; defaults to package name or "Documentation"
 * - siteSummary: Optional site summary (blockquote); defaults to package description if present
 *
 * @returns Object containing the number of included entries and output file paths.
 *
 * @example
 * ```ts
 * import { generateLlms } from './scripts/generate-llms'
 *
 * const { count, files } = await generateLlms({
 *   baseUrl: 'https://example.com/docs',
 *   docsDir: 'docs',
 *   outDir: 'docs',
 *   siteTitle: 'Example Docs',
 *   siteSummary: 'All docs in compact and full forms.'
 * })
 * console.log('Entries:', count)
 * console.log('Generated:', files)
 * ```
 *
 * @remarks
 * - Ordering prioritizes a curated sequence of guide pages, then others by URL for stability.
 * - Content headings equal to the document title are removed to avoid duplication under the H2 section headers.
 */
export async function generateLlms(opts: GenerateOptions): Promise<{ count: number, files: string[] }> {
	const { baseUrl, docsDir, outDir, siteTitle: cliTitle, siteSummary: cliSummary } = opts
	const absDocs = path.resolve(docsDir)
	const absOut = path.resolve(outDir)
	await ensureDir(absOut)

	const pkg = await readPkgMeta(process.cwd())
	const siteTitle = cliTitle || pkg.name || 'Documentation'
	const siteSummary = cliSummary || pkg.description || ''

	type Entry = { title: string, url: string, content: string, weight: number, relPath: string }
	const entries: Entry[] = []

	for await (const file of walk(absDocs)) {
		let raw = await fs.readFile(file, 'utf8')
		if (isDraft(raw)) continue
		const title = extractTitle(raw, path.basename(file, path.extname(file)))
		const url = relToUrl(baseUrl, absDocs, file)
		const weight = computeWeight(absDocs, file)
		const relPath = path.relative(absDocs, file).replace(/\\/g, '/')
		raw = stripFrontmatter(raw)
		entries.push({ title, url, content: raw, weight, relPath })
	}

	entries.sort((a, b) => (a.weight - b.weight) || a.url.localeCompare(b.url))

	// Build llms.txt
	let compact = `# ${siteTitle}\n\n`
	if (siteSummary) compact += `> ${siteSummary}\n\n`
	compact += `This file contains links to all documentation sections following the llmstxt.org standard.\n\n`
	compact += `## Table of Contents\n\n`
	compact += entries.map(e => `- [${e.title}](${e.url}): # ${e.title}`).join('\n') + '\n'
	const llmsTxt = path.join(absOut, 'llms.txt')
	await fs.writeFile(llmsTxt, compact, 'utf8')

	// Build llms-full.txt with header deduplication and unique section titles
	let full = `# ${siteTitle}\n\n`
	if (siteSummary) full += `> ${siteSummary}\n\n`
	full += `This file contains all documentation content in a single document following the llmstxt.org standard.\n\n`

	const usedHeaders = new Set<string>()

	for (let i = 0; i < entries.length; i++) {
		const e = entries[i]

		// Compute a unique section header
		const baseHeader = e.title
		let uniqueHeader = baseHeader
		let attempt = 1
		const dirname = path.posix.dirname(e.relPath)
		const folderName = dirname && dirname !== '.' ? dirname.split('/').pop() || '' : ''
		while (usedHeaders.has(uniqueHeader.toLowerCase())) {
			attempt++
			if (folderName && attempt === 2) {
				uniqueHeader = `${baseHeader} (${toProperCase(folderName)})`
			}
			else {
				uniqueHeader = `${baseHeader} (${attempt})`
			}
		}
		usedHeaders.add(uniqueHeader.toLowerCase())

		// If content starts with a heading equal to the title, drop that first heading
		const trimmed = e.content.trim()
		const firstLine = trimmed.split(/\r?\n/)[0] || ''
		const m = firstLine.match(/^#{1,6}\s+(.+)$/)
		let rest = trimmed
		if (m && m[1].trim() === e.title.trim()) {
			rest = trimmed.split(/\r?\n/).slice(1).join('\n')
		}

		full += `## ${uniqueHeader}\n\n${rest}\n\n`
		if (i < entries.length - 1) {
			full += `---\n\n`
		}
	}
	const llmsFullTxt = path.join(absOut, 'llms-full.txt')
	await fs.writeFile(llmsFullTxt, full, 'utf8')

	return { count: entries.length, files: [llmsTxt, llmsFullTxt] }
}

// CLI helpers
function usage(): string {
	return [
		'Usage:',
		'  tsx scripts\\generate-llms.ts [options]',
		'',
		'Options:',
		'  -u, --base-url [url]        Base URL for links (default: http://localhost)',
		'  -d, --docs [dir]            Directory to scan for .md/.mdx (default: docs)',
		'  -o, --out [dir]             Directory to write outputs (default: docs)',
		'  -t, --site-title [title]    Site title (default: package name or "Documentation")',
		'  -s, --site-summary [text]   Site summary blockquote (default: package description)',
		'  -i, --interactive           Prompt for values interactively',
		'  -h, --help                  Show this help',
		'  -v, --version               Show version',
	].join('\n')
}

async function promptInteractive(defaults: GenerateOptions): Promise<GenerateOptions> {
	// Fallback for non-TTY environments: use provided defaults without prompting
	if (!input.isTTY) return defaults
	const rl = readline.createInterface({ input, output })
	try {
		const ask = async (q: string, def: string | undefined): Promise<string> => {
			const suffix = def ? ` [${def}]` : ''
			const ans = await rl.question(`${q}${suffix}: `)
			return ans.trim() || (def ?? '')
		}
		const baseUrl = await ask('Base URL', defaults.baseUrl)
		const docsDir = await ask('Docs directory', defaults.docsDir)
		const outDir = await ask('Output directory', defaults.outDir)
		const siteTitle = await ask('Site title', defaults.siteTitle)
		const siteSummary = await ask('Site summary', defaults.siteSummary)
		return { baseUrl: baseUrl.replace(/\/$/, ''), docsDir, outDir, siteTitle, siteSummary }
	}
	finally {
		rl.close()
	}
}

function readVersionSync(cwd: string): string | undefined {
	try {
		const raw = readFileSync(path.join(cwd, 'package.json'), 'utf8')
		const pkg = JSON.parse(raw) as { version?: string }
		return pkg.version
	}
	catch { return undefined }
}

function parseArgs(argv: string[]): { opts: GenerateOptions, interactive: boolean, help: boolean, version: boolean } {
	const parsed = parseCliArgs({
		args: argv.slice(2),
		options: {
			'base-url': { type: 'string', short: 'u' },
			'docs': { type: 'string', short: 'd' },
			'out': { type: 'string', short: 'o' },
			'site-title': { type: 'string', short: 't' },
			'site-summary': { type: 'string', short: 's' },
			'interactive': { type: 'boolean', short: 'i' },
			'help': { type: 'boolean', short: 'h' },
			'version': { type: 'boolean', short: 'v' },
		},
		allowPositionals: false,
	})
	const baseUrl = String(parsed.values['base-url'] ?? 'http://localhost').replace(/\/$/, '')
	const docsDir = String(parsed.values['docs'] ?? 'docs')
	const outDir = String(parsed.values['out'] ?? 'docs')
	const siteTitle = parsed.values['site-title'] as string | undefined
	const siteSummary = parsed.values['site-summary'] as string | undefined
	const interactive = Boolean(parsed.values['interactive'])
	const help = Boolean(parsed.values['help'])
	const version = Boolean(parsed.values['version'])
	return { opts: { baseUrl, docsDir, outDir, siteTitle, siteSummary }, interactive, help, version }
}

// CLI entrypoint
async function main() {
	const { opts: baseOpts, interactive, help, version } = parseArgs(process.argv)
	if (help) {
		console.log(usage())
		return
	}
	if (version) {
		console.log(readVersionSync(process.cwd()) ?? '0.0.0')
		return
	}
	let opts = baseOpts
	if (interactive) {
		// Pre-populate defaults with pkg metadata when available
		try {
			const raw = await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf8')
			const pkg = JSON.parse(raw) as { name?: string, description?: string }
			opts.siteTitle = opts.siteTitle || pkg.name || 'Documentation'
			opts.siteSummary = opts.siteSummary || pkg.description || ''
		}
		catch { /* ignore */ }
		opts = await promptInteractive(opts)
	}
	const { count } = await generateLlms(opts)
	console.log(`Generated ${count} entries -> ${path.join(opts.outDir, 'llms.txt')} and llms-full.txt`)
}

const isMain = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
	main().catch((err) => {
		console.error(err)
		process.exit(1)
	})
}
