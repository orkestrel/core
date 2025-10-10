#!/usr/bin/env node
/*
Generates LLM-friendly indexes from Markdown docs in the llmstxt.org style.
- llms.txt: site header + optional summary + Table of Contents with Markdown links
- llms-full.txt: site header + optional summary + concatenated full content with section headers and separators

Usage (Windows-friendly):
  tsx scripts\generate-llms.ts --base-url https://example.com/docs --docs docs --out docs [--site-title "My Site"] [--site-summary "Short summary"] [--keep-extensions] [--validate-links] [--fail-fast-links] [--validate-progress]
*/

import { readFileSync, promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs as parseCliArgs } from 'node:util'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

/**
 * Minimal fetch-like function interface used for link validation.
 * Accepts a URL and optional init with method/signal, and resolves with an object exposing HTTP status.
 */
type FetchLike = (url: string, init?: { method?: string, signal?: AbortSignal | null }) => Promise<{ status: number }>

export interface GenerateOptions {
	baseUrl: string
	docsDir: string
	outDir: string
	siteTitle?: string
	siteSummary?: string
	keepExtensions?: boolean
	validateLinks?: boolean
	failFastLinks?: boolean
	validateProgress?: boolean
	fetchImpl?: FetchLike
	requestTimeoutMs?: number
}

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
function relToUrl(baseUrl: string, docsDirAbs: string, filePathAbs: string, keepExtensions: boolean): string {
	const rel = path.relative(docsDirAbs, filePathAbs).replace(/\\/g, '/')
	const final = keepExtensions ? rel : rel.replace(/\.(md|mdx)$/i, '')
	return `${baseUrl}/${final}`
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

// Tiny color helpers (simple ANSI; disabled when NO_COLOR env is set)
const useColor = !process.env.NO_COLOR
const color = {
	green: (s: string) => useColor ? `\x1b[32m${s}\x1b[0m` : s,
	red: (s: string) => useColor ? `\x1b[31m${s}\x1b[0m` : s,
}

// Validate that URLs respond with 200 OK; tries HEAD first, falls back to GET for 405/501
async function validateUrls(urls: readonly string[], fetchImpl: FetchLike, timeoutMs: number = 8000, failFast: boolean = false, showProgress: boolean = false): Promise<{ url: string, status?: number, error?: string }[]> {
	const failures: { url: string, status?: number, error?: string }[] = []
	let firstFailure: { url: string, status?: number, error?: string } | null = null
	const total = urls.length
	let processed = 0

	const tick = () => {
		if (!showProgress) return
		const remaining = total - processed
		const statusText = failures.length === 0 ? color.green('PASSING') : color.red('FAIL')
		const msg = `\r[links] ${processed}/${total} checked, ${remaining} left - ${statusText}`
		process.stdout.write(msg)
	}

	for (const url of urls) {
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), timeoutMs)
		let shouldStop = false
		try {
			let res = await fetchImpl(url, { method: 'HEAD', signal: controller.signal })
			if (res.status !== 200) {
				if (res.status === 405 || res.status === 501) {
					// Retry with GET if HEAD not allowed/implemented
					res = await fetchImpl(url, { method: 'GET', signal: controller.signal })
				}
			}
			if (res.status !== 200) {
				if (failFast) {
					firstFailure = { url, status: res.status }
					shouldStop = true
				}
				else {
					failures.push({ url, status: res.status })
				}
			}
		}
		catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err)
			if (failFast) {
				firstFailure = { url, error: message }
				shouldStop = true
			}
			else {
				failures.push({ url, error: message })
			}
		}
		finally {
			processed++
			tick()
			clearTimeout(timer)
		}
		if (shouldStop) break
	}
	if (showProgress) process.stdout.write(`\n`)
	if (firstFailure) {
		const msg = firstFailure.status != null
			? `Link validation failed: ${firstFailure.url} (status ${firstFailure.status})`
			: `Link validation error: ${firstFailure.url} (${firstFailure.error ?? 'unknown error'})`
		throw new Error(msg)
	}
	return failures
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
 * - keepExtensions: If true, preserve .md/.mdx in links (useful for raw file hosts like GitHub). Default false.
 * - validateLinks: If true, verify that each URL returns HTTP 200.
 * - failFastLinks: If true and validateLinks is enabled, fail on the first invalid link (default: false; collect all failures by default).
 * - validateProgress: If true and validateLinks is enabled, show a small colored progress line during validation.
 * - fetchImpl: Optional fetch implementation override for validation (defaults to global fetch)
 * - requestTimeoutMs: Optional timeout per request (ms) for validation (default: 8000)
 *
 * @returns Object containing the number of included entries and output file paths.
 *
 * @example
 * ```ts
 * import { generateLlms } from '../scripts/generate-llms.js'
 *
 * // Basic usage (extensionless links for static sites)
 * await generateLlms({
 *   baseUrl: 'https://example.com/docs',
 *   docsDir: 'docs',
 *   outDir: 'docs',
 *   siteTitle: 'My Docs',
 *   siteSummary: 'Compact and full LLM docs.'
 * })
 *
 * // Preserve .md/.mdx in links (e.g., for GitHub blob URLs)
 * await generateLlms({
 *   baseUrl: 'https://github.com/owner/repo/blob/main/docs',
 *   docsDir: 'docs',
 *   outDir: 'docs',
 *   keepExtensions: true
 * })
 *
 * // Validate links with small progress indicator (collect all failures)
 * await generateLlms({
 *   baseUrl: 'https://example.com/docs',
 *   docsDir: 'docs',
 *   outDir: 'docs',
 *   validateLinks: true,
 *   validateProgress: true
 * })
 *
 * // Validate links: fail fast on the first invalid URL
 * await generateLlms({
 *   baseUrl: 'https://example.com/docs',
 *   docsDir: 'docs',
 *   outDir: 'docs',
 *   validateLinks: true,
 *   failFastLinks: true,
 *   validateProgress: true
 * })
 * ```
 */
export async function generateLlms(opts: GenerateOptions): Promise<{ count: number, files: string[] }> {
	const { baseUrl, docsDir, outDir, siteTitle: cliTitle, siteSummary: cliSummary, keepExtensions = false } = opts
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
		const url = relToUrl(baseUrl, absDocs, file, keepExtensions)
		const weight = computeWeight(absDocs, file)
		const relPath = path.relative(absDocs, file).replace(/\\/g, '/')
		raw = stripFrontmatter(raw)
		entries.push({ title, url, content: raw, weight, relPath })
	}

	entries.sort((a, b) => (a.weight - b.weight) || a.url.localeCompare(b.url))

	// Optional link validation
	if (opts.validateLinks) {
		const fetchImpl: FetchLike | undefined = (globalThis.fetch ? (globalThis.fetch as unknown as FetchLike) : undefined)
		const usedFetch = opts.fetchImpl ?? fetchImpl
		if (typeof usedFetch !== 'function') {
			throw new Error('Link validation requested but no fetch implementation is available. Provide fetchImpl or run on Node 18+.')
		}
		if (opts.failFastLinks) {
			// Will throw on first failure
			await validateUrls(entries.map(e => e.url), usedFetch, opts.requestTimeoutMs, true, Boolean(opts.validateProgress))
		}
		else {
			const failures = await validateUrls(entries.map(e => e.url), usedFetch, opts.requestTimeoutMs, false, Boolean(opts.validateProgress))
			if (failures.length > 0) {
				const lines = failures.map(f => ` - ${f.url} ${f.status ? `(status ${f.status})` : f.error ? `(error ${f.error})` : ''}`)
				throw new Error(`Link validation failed for ${failures.length} URL(s):\n${lines.join('\n')}`)
			}
		}
	}

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
		'  -e, --keep-extensions       Preserve .md/.mdx extensions in links (default: false)',
		'  -l, --validate-links        Validate that links return 200 OK (may be slow)',
		'  -f, --fail-fast-links       When validating, fail on the first invalid link (default: false)',
		'  -p, --validate-progress     Show a small colored progress line during link validation',
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
		const askBool = async (q: string, def: boolean | undefined): Promise<boolean> => {
			const show = def === undefined ? '' : ` [${def ? 'Y' : 'N'}]`
			const ans = (await rl.question(`${q}${show}: `)).trim().toLowerCase()
			if (!ans) return def ?? false
			return ans.startsWith('y')
		}
		const baseUrl = await ask('Base URL', defaults.baseUrl)
		const docsDir = await ask('Docs directory', defaults.docsDir)
		const outDir = await ask('Output directory', defaults.outDir)
		const siteTitle = await ask('Site title', defaults.siteTitle)
		const siteSummary = await ask('Site summary', defaults.siteSummary)
		const keepExtensions = await askBool('Keep .md/.mdx extensions in links? (y/N)', defaults.keepExtensions)
		const validateLinks = await askBool('Validate links (200 OK)? (y/N)', defaults.validateLinks)
		const failFastLinks = validateLinks ? await askBool('Fail fast on first invalid link? (y/N)', defaults.failFastLinks) : false
		const validateProgress = validateLinks ? await askBool('Show progress while validating? (y/N)', defaults.validateProgress) : false
		return { baseUrl: baseUrl.replace(/\/$/, ''), docsDir, outDir, siteTitle, siteSummary, keepExtensions, validateLinks, failFastLinks, validateProgress }
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
			'keep-extensions': { type: 'boolean', short: 'e' },
			'validate-links': { type: 'boolean', short: 'l' },
			'fail-fast-links': { type: 'boolean', short: 'f' },
			'validate-progress': { type: 'boolean', short: 'p' },
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
	const keepExtensions = Boolean(parsed.values['keep-extensions'])
	const validateLinks = Boolean(parsed.values['validate-links'])
	const failFastLinks = Boolean(parsed.values['fail-fast-links'])
	const validateProgress = Boolean(parsed.values['validate-progress'])
	const interactive = Boolean(parsed.values['interactive'])
	const help = Boolean(parsed.values['help'])
	const version = Boolean(parsed.values['version'])
	return { opts: { baseUrl, docsDir, outDir, siteTitle, siteSummary, keepExtensions, validateLinks, failFastLinks, validateProgress }, interactive, help, version }
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
