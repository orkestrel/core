import type { DiagnosticAdapterOptions, DiagnosticErrorContext, DiagnosticPort, LogLevel, LoggerPort, MessageMapEntry, LifecycleErrorDetail } from '../types.js'
import { DIAGNOSTIC_MESSAGES } from '../diagnostics.js'
import { LoggerAdapter } from './logger'

/**
 * Diagnostics adapter that delegates all output to a provided LoggerPort.
 * Uses a single keyed messages array for overriding level/message across
 * logs, metrics, traces, events, and errors.
 */
export class DiagnosticAdapter implements DiagnosticPort {
	readonly #logger: LoggerPort
	private readonly overrides: Readonly<Record<string, MessageMapEntry>>

	constructor(options?: DiagnosticAdapterOptions) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		// Build an index from the default messages, then apply provided overrides (later entries win on duplicate keys)
		const idx: Record<string, MessageMapEntry> = {}
		for (const m of DIAGNOSTIC_MESSAGES) idx[m.key] = { level: m.level, message: m.message }
		for (const m of options?.messages ?? []) idx[m.key] = { level: m.level, message: m.message }
		this.overrides = idx
	}

	get logger(): LoggerPort { return this.#logger }

	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		const { level: lvl, message: msg } = this.lookup(message, { level, message })
		this.safe(() => this.#logger.log(lvl ?? level, msg ?? message, fields))
	}

	error(err: unknown, context: DiagnosticErrorContext = {}): void {
		const e = err instanceof Error ? err : new Error(String(err))
		const key = context.code ?? e.name ?? 'error'
		const { level, message } = this.lookup(String(key), { level: 'error', message: e.message })
		this.safe(() => this.#logger.log(level ?? 'error', message ?? e.message, { err: { name: e.name, message: e.message, stack: e.stack }, ...context }))
	}

	fail(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.overrides[key]
		const level = entry?.level ?? 'error'
		const msg = overrideMsg ?? entry?.message ?? key
		const e = new Error(msg) as Error & { code?: string, helpUrl?: string, name?: string }
		// Prefer provided code; otherwise use key when it looks like an ORK code
		const codeToEmit = (rest.code as string | undefined) ?? (/^ORK\d{4}$/.test(key) ? key : undefined)
		e.code = codeToEmit ?? key
		if (helpUrl) e.helpUrl = helpUrl
		if (name) e.name = name
		this.safe(() => this.#logger.log(level, msg, { err: { name: e.name, message: e.message, stack: e.stack }, ...rest, ...(codeToEmit ? { code: codeToEmit as never } : {}) }))
		throw e
	}

	help(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): Error {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.overrides[key]
		const msg = overrideMsg ?? entry?.message ?? key
		const e = new Error(msg) as Error & { code?: string, helpUrl?: string, name?: string }
		const codeToEmit = (rest.code as string | undefined) ?? (/^ORK\d{4}$/.test(key) ? key : undefined)
		e.code = codeToEmit ?? key
		if (helpUrl) e.helpUrl = helpUrl
		if (name) e.name = name
		return e
	}

	aggregate(key: string, detailsOrErrors: ReadonlyArray<LifecycleErrorDetail | Error>, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		// Normalize inputs to details and errors arrays
		const details: LifecycleErrorDetail[] = []
		for (const e of detailsOrErrors) {
			if (e instanceof Error) {
				details.push({ tokenDescription: 'unknown', phase: 'start', context: 'normal', timedOut: false, durationMs: 0, error: e })
			}
			else {
				details.push(e)
			}
		}
		const e = this.help(key, context) as Error & { details?: LifecycleErrorDetail[], errors?: Error[] }
		e.details = details
		e.errors = details.map(d => d.error)
		const entry = this.overrides[key]
		const level = entry?.level ?? 'error'
		const msg = (context.message ?? entry?.message ?? key)
		this.safe(() => this.#logger.log(level, msg, { err: { name: e.name, message: e.message, stack: e.stack }, ...context, details }))
		throw e
	}

	metric(name: string, value: number, tags: Record<string, string | number | boolean> = {}): void {
		const { level, message } = this.lookup(name, { level: 'info', message: name })
		this.safe(() => this.#logger.log(level ?? 'info', message ?? name, { value, ...tags }))
	}

	trace(name: string, payload: Record<string, unknown> = {}): void {
		const { level, message } = this.lookup(name, { level: 'debug', message: name })
		this.safe(() => this.#logger.log(level ?? 'debug', message ?? name, payload))
	}

	event(name: string, payload: Record<string, unknown> = {}): void {
		const { level, message } = this.lookup(name, { level: 'info', message: name })
		this.safe(() => this.#logger.log(level ?? 'info', message ?? name, payload))
	}

	private lookup(key: string, fallback: MessageMapEntry): MessageMapEntry {
		const entry = this.overrides[key]
		return entry ? { level: entry.level ?? fallback.level, message: entry.message ?? fallback.message } : fallback
	}

	private safe(fn: () => void): void {
		try {
			fn()
		}
		catch { /* swallow */ }
	}
}
