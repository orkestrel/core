import type {
	DiagnosticAdapterOptions,
	DiagnosticErrorContext,
	DiagnosticPort,
	LifecycleErrorDetail,
	LogLevel,
	LoggerPort,
	MessageMapEntry,
} from '../types.js'
import { LoggerAdapter } from './logger'

/**
 * DiagnosticAdapter: a thin, safe delegator to a LoggerPort with keyed message overrides.
 *
 * Goals
 * - Keep API minimal but sufficient for core (log/error/fail/help/aggregate + metric/trace/event)
 * - Be replaceable (only depends on LoggerPort)
 * - Be safe (adapter never throws outward; failures are swallowed)
 * - Be deterministic (stable override resolution)
 */
export class DiagnosticAdapter implements DiagnosticPort {
	readonly #logger: LoggerPort
	/** Keyed message overrides, seeded with defaults then user overrides. */
	readonly #messages: ReadonlyMap<string, MessageMapEntry>

	constructor(options?: DiagnosticAdapterOptions) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		// Only seed with provided messages (domain-specific maps supplied by callers)
		const m = new Map<string, MessageMapEntry>()
		for (const d of options?.messages ?? []) m.set(d.key, { level: d.level, message: d.message })
		this.#messages = m
	}

	get logger(): LoggerPort { return this.#logger }

	// ---------------------------
	// Public API (DiagnosticPort)
	// ---------------------------

	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		const resolved = this.resolve(message, { level, message })
		this.safeLog(resolved.level ?? level, resolved.message ?? message, fields)
	}

	error(err: unknown, context: DiagnosticErrorContext = {}): void {
		const e = err instanceof Error ? err : new Error(String(err))
		const key = String(context.code ?? e.name ?? 'error')
		const resolved = this.resolve(key, { level: 'error', message: e.message })
		this.safeLog(resolved.level ?? 'error', resolved.message ?? e.message, { err: this.shapeErr(e), ...context })
	}

	fail(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = overrideMsg ?? entry?.message ?? key
		const e = this.buildError(key, msg, { helpUrl, name, context: rest })
		// Emit and throw; include code when it is an ORK*-style code or explicitly provided.
		this.safeLog(level, msg, { err: this.shapeErr(e), ...rest, ...(e.code ? { code: e.code } : {}) })
		throw e
	}

	help(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): Error {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const msg = overrideMsg ?? entry?.message ?? key
		return this.buildError(key, msg, { helpUrl, name, context: rest })
	}

	aggregate(key: string, detailsOrErrors: ReadonlyArray<LifecycleErrorDetail | Error>, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const details = this.normalizeAggregateDetails(detailsOrErrors)
		const e = this.help(key, context) as Error & { details?: LifecycleErrorDetail[], errors?: Error[] }
		e.details = details
		e.errors = details.map(d => d.error)
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = (context.message ?? entry?.message ?? key)
		this.safeLog(level, msg, { err: this.shapeErr(e), ...context, details })
		throw e
	}

	metric(name: string, value: number, tags: Record<string, string | number | boolean> = {}): void {
		const resolved = this.resolve(name, { level: 'info', message: name })
		this.safeLog(resolved.level ?? 'info', resolved.message ?? name, { value, ...tags })
	}

	trace(name: string, payload: Record<string, unknown> = {}): void {
		const resolved = this.resolve(name, { level: 'debug', message: name })
		this.safeLog(resolved.level ?? 'debug', resolved.message ?? name, payload)
	}

	event(name: string, payload: Record<string, unknown> = {}): void {
		const resolved = this.resolve(name, { level: 'info', message: name })
		this.safeLog(resolved.level ?? 'info', resolved.message ?? name, payload)
	}

	// ---------------------------
	// Internals
	// ---------------------------

	private resolve(key: string, fallback: MessageMapEntry): MessageMapEntry {
		const entry = this.#messages.get(key)
		return entry ? { level: entry.level ?? fallback.level, message: entry.message ?? fallback.message } : fallback
	}

	private safeLog(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		try {
			this.#logger.log(level, message, fields)
		}
		catch { /* swallow */ }
	}

	private shapeErr(e: Error): { name: string, message: string, stack?: string } {
		return { name: e.name, message: e.message, stack: e.stack }
	}

	private buildError(key: string, message: string, opts: { helpUrl?: string, name?: string, context?: DiagnosticErrorContext }): Error & { code?: string, helpUrl?: string } {
		const { helpUrl, name, context } = opts
		const e = new Error(message) as Error & { code?: string, helpUrl?: string }
		// Prefer provided context.code; otherwise if key looks like an ORK code, use it; else fall back to key for code.
		const provided = context?.code as string | undefined
		const orkLike = /^ORK\d{4}$/.test(key) ? key : undefined
		e.code = provided ?? orkLike ?? key
		if (helpUrl) e.helpUrl = helpUrl
		if (name) e.name = name
		return e
	}

	private normalizeAggregateDetails(items: ReadonlyArray<LifecycleErrorDetail | Error>): LifecycleErrorDetail[] {
		const out: LifecycleErrorDetail[] = []
		for (const it of items) {
			if (it instanceof Error) {
				out.push({ tokenDescription: 'unknown', phase: 'start', context: 'normal', timedOut: false, durationMs: 0, error: it })
			}
			else {
				out.push(it)
			}
		}
		return out
	}
}
