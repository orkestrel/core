import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { generateLlms } from '../scripts/generate-llms.js'

const projectRoot = process.cwd()
const pkgRaw = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')
const pkg = JSON.parse(pkgRaw) as { version?: string }

async function write(p: string, content: string) {
	await fs.mkdir(path.dirname(p), { recursive: true })
	await fs.writeFile(p, content, 'utf8')
}

async function cleanupDir(p: string) {
	try {
		await fs.rm(p, { recursive: true, force: true })
	}
	catch {
		// ignore cleanup errors
	}
}

function countOccurrences(haystack: string, needle: string): number {
	return haystack.split(needle).length - 1
}

function runCli(args: string[], opts: { cwd?: string, input?: string } = {}): Promise<{ code: number | null, stdout: string, stderr: string }> {
	return new Promise((resolve) => {
		const cwd = opts.cwd ?? projectRoot
		const scriptAbs = path.join(projectRoot, 'scripts', 'generate-llms.ts')
		const child = spawn('tsx', [scriptAbs, ...args], { cwd, shell: true })

		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (d) => {
			stdout += d.toString()
		})
		child.stderr.on('data', (d) => {
			stderr += d.toString()
		})
		child.on('close', code => resolve({ code, stdout, stderr }))
		if (opts.input) {
			child.stdin.write(opts.input)
			child.stdin.end()
		}
	})
}

async function mkdocs(tmpRoot: string): Promise<string> {
	const docs = path.join(tmpRoot, 'docs')
	await fs.mkdir(docs, { recursive: true })
	await fs.writeFile(path.join(docs, 'index.md'), `# Home\n\nWelcome.\n`, 'utf8')
	return docs
}

// LLM generator tests (library API)

test('LLM suite', async (t) => {
	await t.test('basic structure, duplicates, separators, and draft filtering', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-llms-'))
		try {
			const docsDir = path.join(tmpRoot, 'docs')
			const outDir = path.join(tmpRoot, 'out')

			await write(path.join(docsDir, 'guide', 'intro.md'), `# Getting Started\n\nWelcome to the guide.\n`)
			await write(path.join(docsDir, 'advanced', 'getting-started.md'), `# Getting Started\n\nAdvanced details.\n`)
			await write(path.join(docsDir, 'api', 'reference.md'), `# API Reference\n\nAPI details here.\n`)
			await write(path.join(docsDir, 'guide', 'draft.md'), `---\n title: Draft Page\n draft: true\n---\n\n# Draft Page\n\nShould not appear.\n`)

			const baseUrl = 'https://example.com/docs'
			const siteTitle = 'Test Docs'
			const siteSummary = 'Test summary'

			const { files, count } = await generateLlms({ baseUrl, docsDir, outDir, siteTitle, siteSummary })
			assert.equal(count, 3)

			const [llmsTxtPath, llmsFullPath] = files
			const compact = await fs.readFile(llmsTxtPath, 'utf8')
			const full = await fs.readFile(llmsFullPath, 'utf8')

			const actual = {
				compact: {
					startsWithTitle: compact.startsWith(`# ${siteTitle}`),
					hasSummary: compact.includes(`> ${siteSummary}`),
					hasTOC: compact.includes('## Table of Contents'),
					links: [
						compact.includes('- [Getting Started]('),
						compact.includes(`${baseUrl}/guide/intro`),
						compact.includes(`${baseUrl}/advanced/getting-started`),
					],
					excludesDraft: !compact.includes('Draft Page'),
				},
				full: {
					sectionHeaders: [
						full.includes('## Getting Started'),
						full.includes('## Getting Started (Advanced)'),
						full.includes('## API Reference'),
					],
					noDuplicateH1: !full.includes('## Getting Started\n\n# Getting Started'),
					separatorCount: countOccurrences(full, '\n---\n\n'),
					excludesDraft: !full.includes('Draft Page'),
				},
			}
			const expected = {
				compact: {
					startsWithTitle: true,
					hasSummary: true,
					hasTOC: true,
					links: [true, true, true],
					excludesDraft: true,
				},
				full: {
					sectionHeaders: [true, true, true],
					noDuplicateH1: true,
					separatorCount: 2,
					excludesDraft: true,
				},
			}
			assert.deepStrictEqual(actual, expected)
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})

	await t.test('frontmatter stripping (non-draft) and content presence', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-llms-'))
		try {
			const docsDir = path.join(tmpRoot, 'docs')
			const outDir = path.join(tmpRoot, 'out')

			await write(path.join(docsDir, 'guide', 'page.md'), `---\r\n title: Visible Title\r\n custom: keep\r\n---\r\n\r\n# Visible Title\r\n\r\nThis content should show without frontmatter.\r\n`)

			const { files } = await generateLlms({ baseUrl: 'https://x.y', docsDir, outDir })
			const full = await fs.readFile(files[1], 'utf8')
			const actual = {
				hasHeader: full.includes('## Visible Title'),
				hasContent: full.includes('This content should show'),
				frontmatterStripped: !full.includes('custom: keep'),
			}
			const expected = { hasHeader: true, hasContent: true, frontmatterStripped: true }
			assert.deepStrictEqual(actual, expected)
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})

	await t.test('CRLF newlines handling and header dedup', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-llms-'))
		try {
			const docsDir = path.join(tmpRoot, 'docs')
			const outDir = path.join(tmpRoot, 'out')

			await write(path.join(docsDir, 'topic.md'), `# Win Title\r\n\r\nAfter CRLF line breaks.\r\n`)

			const { files } = await generateLlms({ baseUrl: 'https://x.y', docsDir, outDir })
			const full = await fs.readFile(files[1], 'utf8')
			assert.deepStrictEqual({
				sectionPresent: full.includes('## Win Title'),
				noDuplicate: !full.includes('## Win Title\r\n\r\n# Win Title'),
			}, {
				sectionPresent: true,
				noDuplicate: true,
			})
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})

	await t.test('MDX files are included', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-llms-'))
		try {
			const docsDir = path.join(tmpRoot, 'docs')
			const outDir = path.join(tmpRoot, 'out')

			await write(path.join(docsDir, 'x.mdx'), `# MDX Page\n\nSimple content.\n`)

			const { files } = await generateLlms({ baseUrl: 'https://x.y', docsDir, outDir })
			const compact = await fs.readFile(files[0], 'utf8')
			const full = await fs.readFile(files[1], 'utf8')
			assert.deepStrictEqual({
				compactHasLink: compact.includes('[MDX Page]('),
				fullHasSection: full.includes('## MDX Page'),
				fullHasContent: full.includes('Simple content.'),
			}, {
				compactHasLink: true,
				fullHasSection: true,
				fullHasContent: true,
			})
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})

	await t.test('fallback title when no heading exists', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-llms-'))
		try {
			const docsDir = path.join(tmpRoot, 'docs')
			const outDir = path.join(tmpRoot, 'out')

			await write(path.join(docsDir, 'no-heading.md'), `Plain content without headings.\n`)

			const baseUrl = 'https://example.com/base'
			const { files } = await generateLlms({ baseUrl, docsDir, outDir })
			const compact = await fs.readFile(files[0], 'utf8')
			const full = await fs.readFile(files[1], 'utf8')
			assert.deepStrictEqual({
				compactHasLink: compact.includes('- [no-heading]('),
				urlNormalized: compact.includes(`${baseUrl}/no-heading`),
				fullHasSection: full.includes('## no-heading'),
				fullHasContent: full.includes('Plain content without headings.'),
			}, {
				compactHasLink: true,
				urlNormalized: true,
				fullHasSection: true,
				fullHasContent: true,
			})
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})

	await t.test('--help shows usage', async () => {
		const { code, stdout } = await runCli(['--help'], { cwd: projectRoot })
		assert.deepStrictEqual({ code, usage: stdout.includes('Usage:'), hasBaseUrl: stdout.includes('--base-url') }, { code: 0, usage: true, hasBaseUrl: true })
	})

	await t.test('--version shows package version', async () => {
		const { code, stdout } = await runCli(['--version'], { cwd: projectRoot })
		const actual = { code, hasAny: stdout.trim().length > 0, matchesPkg: pkg.version ? stdout.trim() === pkg.version : true }
		const expected = { code: 0, hasAny: true, matchesPkg: true }
		assert.deepStrictEqual(actual, expected)
	})

	await t.test('flag-based generation writes files', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-cli-'))
		try {
			const docsDir = await mkdocs(tmpRoot)
			const outDir = path.join(tmpRoot, 'out')
			const args = [
				'--base-url', 'https://example.com/docs',
				'--docs', docsDir,
				'--out', outDir,
				'--site-title', 'MyDocs',
				'--site-summary', 'Summary',
			]
			const { code, stdout, stderr } = await runCli(args, { cwd: projectRoot })
			assert.equal(code, 0, stderr)
			const compact = await fs.readFile(path.join(outDir, 'llms.txt'), 'utf8')
			const full = await fs.readFile(path.join(outDir, 'llms-full.txt'), 'utf8')
			const actual = {
				stdoutHasGenerated: stdout.includes('Generated'),
				compact: {
					title: compact.includes('# MyDocs'),
					summary: compact.includes('> Summary'),
					linkHome: compact.includes('[Home]('),
				},
				full: { hasHomeSection: full.includes('## Home') },
			}
			const expected = { stdoutHasGenerated: true, compact: { title: true, summary: true, linkHome: true }, full: { hasHomeSection: true } }
			assert.deepStrictEqual(actual, expected)
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})

	await t.test('interactive mode prompts and writes files', async () => {
		const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ork-cli-'))
		try {
			const docsDir = await mkdocs(tmpRoot)
			const outDir = path.join(tmpRoot, 'out')
			const baseUrl = 'https://i.example.com/base'
			const answers = [baseUrl, docsDir, outDir, '', ''].join(os.EOL) + os.EOL
			const args = ['--interactive', '--base-url', baseUrl, '--docs', docsDir, '--out', outDir]
			const { code, stdout, stderr } = await runCli(args, { cwd: projectRoot, input: answers })
			assert.equal(code, 0, stderr)
			const compactPath = path.join(outDir, 'llms.txt')
			const fullPath = path.join(outDir, 'llms-full.txt')
			const compact = await fs.readFile(compactPath, 'utf8')
			const full = await fs.readFile(fullPath, 'utf8')
			const actual = {
				stdoutHasGenerated: stdout.includes('Generated'),
				compactNonEmpty: compact.length > 0,
				fullNonEmpty: full.length > 0,
				compactHasH1: /^#\s+.+/m.test(compact),
			}
			const expected = { stdoutHasGenerated: true, compactNonEmpty: true, fullNonEmpty: true, compactHasH1: true }
			assert.deepStrictEqual(actual, expected)
		}
		finally {
			await cleanupDir(tmpRoot)
		}
	})
})
