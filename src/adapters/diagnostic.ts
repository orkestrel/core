import type {
	DiagnosticAdapterOptions,
	DiagnosticPort,
	DiagnosticErrorContext,
	LoggerPort,
	LogLevel,
	LifecycleErrorDetail,
	MessageMapEntry,
} from '../types.js'
import { safeInvoke } from '../helpers.js'
import { LoggerAdapter } from './logger.js'

class BaseError extends Error {
	constructor(message: string, public code?: string, public helpUrl?: string) {
		super(message)
	}
}
class AggregateLifecycleError extends BaseError {
	constructor(message: string, public details: LifecycleErrorDetail[], public errors: Error[], code?: string, helpUrl?: string) {
		super(message, code, helpUrl)
	}
}

/**
 * DiagnosticAdapter: safe delegator to a LoggerPort with keyed message overrides.
 * - Provides log/error/fail/help/aggregate and metric/trace/event methods.
 * - Never throws outward except fail/aggregate which build and throw errors after logging.
 *
 * Example
 * -------
 * ```ts
 * import { DiagnosticAdapter } from '@orkestrel/core'
 *
 * const diag = new DiagnosticAdapter()
 * // Emit an error and throw with a stable code
 * try {
 *   diag.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
 * } catch (e) {
 *   // e is an Error with optional code/helpUrl
 * }
 *
 * // Aggregate multiple lifecycle errors
 * const errs = [new Error('boom'), new Error('bye')]
 * try {
 *   diag.aggregate('ORK1017', errs, { scope: 'orchestrator', message: 'Errors during destroy' })
 * } catch (e) {}
 * ```
 */
export class DiagnosticAdapter implements DiagnosticPort {
	readonly #logger: LoggerPort
	/** Keyed message overrides, seeded with defaults then user overrides. */
	readonly #messages: ReadonlyMap<string, MessageMapEntry>

	/**
	 *
	 * @param options
	 * @returns -
	 * @example
	 */
	constructor(options?: DiagnosticAdapterOptions) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		// Only seed with provided messages (domain-specific maps supplied by callers)
		const m = new Map<string, MessageMapEntry>()
		for (const d of options?.messages ?? []) m.set(d.key, { level: d.level, message: d.message })
		this.#messages = m
	}

	/**
	 *
	 * @example
	 */
	get logger(): LoggerPort { return this.#logger }

	// ---------------------------
	// Public API (DiagnosticPort)
	// ---------------------------

	/**
	 * Write a log entry with a level, message key, and optional fields.
	 * The key is resolved via the message map to a final level/message.
	 * @param level
	 * @param message
	 * @param fields
	 * @returns -
	 * @example
	 */
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		const resolved = this.resolve(message, { level, message })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? level, resolved.message ?? message, fields)
	}

	/**
	 * Report an error to the logger with optional context fields.
	 * Does not throw; use fail() to throw with a code.
	 * @param err
	 * @param context
	 * @returns -
	 * @example
	 */
	error(err: unknown, context: DiagnosticErrorContext = {}): void {
		const e = err instanceof Error ? err : new Error(String(err))
		const key = String(context.code ?? e.name ?? 'error')
		const resolved = this.resolve(key, { level: 'error', message: e.message })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'error', resolved.message ?? e.message, { err: this.shapeErr(e), ...context })
	}

	/**
	 * Build an Error using a key/code, log it, and throw it.
	 *
	 * @param key - Code or name used to resolve a message and severity.
	 * @param context - Optional structured context including message override and helpUrl.
	 * @throws Error with optional .code and .helpUrl.
	 * @returns -
	 * @example
	 */
	fail(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = overrideMsg ?? entry?.message ?? key
		const e = this.buildError(key, msg, { helpUrl, name, context: rest })
		// Emit and throw; include code when it is an ORK*-style code or explicitly provided.
		safeInvoke(this.#logger.log.bind(this.#logger), level, msg, { err: this.shapeErr(e), ...rest, ...(e.code ? { code: e.code } : {}) })
		throw e
	}

	/**
	 * Build a helpful Error using a known key/code without throwing.
	 * Useful when you want to attach the error to other structures.
	 * @param key
	 * @param context
	 * @returns -
	 * @example
	 */
	help(key: string, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): Error {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const msg = overrideMsg ?? entry?.message ?? key
		return this.buildError(key, msg, { helpUrl, name, context: rest })
	}

	/**
	 * Build and throw an aggregate error from a set of lifecycle details or errors.
	 *
	 * @param key - Code used for the aggregate error (e.g., ORK1013).
	 * @param detailsOrErrors - Collection of details or errors (mixed).
	 * @param context - Optional message override and helpUrl.
	 * @throws Aggregate error containing .details and .errors arrays.
	 * @returns -
	 * @example
	 */
	aggregate(key: string, detailsOrErrors: ReadonlyArray<LifecycleErrorDetail | Error>, context: (DiagnosticErrorContext & { message?: string, helpUrl?: string, name?: string }) = {}): never {
		const details = this.normalizeAggregateDetails(detailsOrErrors)
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = (context.message ?? entry?.message ?? key)
		const e = new AggregateLifecycleError(msg, details, details.map(d => d.error))
		// prefer code if provided or if key is ORK-like
		e.code = context.code ?? (/^ORK\d{4}$/.test(key) ? key : key)
		if (context.helpUrl) e.helpUrl = context.helpUrl
		if (context.name) e.name = context.name
		safeInvoke(this.#logger.log.bind(this.#logger), level, msg, { err: this.shapeErr(e), ...context, details })
		throw e
	}

	/**
	 * Emit a metric with a numeric value and optional tags.
	 * @param name
	 * @param value
	 * @param tags
	 * @returns -
	 * @example
	 */
	metric(name: string, value: number, tags: Record<string, string | number | boolean> = {}): void {
		const resolved = this.resolve(name, { level: 'info', message: name })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'info', resolved.message ?? name, { value, ...tags })
	}

	/**
	 * Emit a trace-level payload for debugging.
	 * @param name
	 * @param payload
	 * @returns -
	 * @example
	 */
	trace(name: string, payload: Record<string, unknown> = {}): void {
		const resolved = this.resolve(name, { level: 'debug', message: name })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'debug', resolved.message ?? name, payload)
	}

	/**
	 * Emit a general event payload for analytics/telemetry.
	 * @param name
	 * @param payload
	 * @returns -
	 * @example
	 */
	event(name: string, payload: Record<string, unknown> = {}): void {
		const resolved = this.resolve(name, { level: 'info', message: name })
		safeInvoke(this.#logger.log.bind(this.#logger), resolved.level ?? 'info', resolved.message ?? name, payload)
	}

	// ---------------------------
	// Internals
	// ---------------------------

	private resolve(key: string, fallback: MessageMapEntry): MessageMapEntry {
		const entry = this.#messages.get(key)
		return entry ? { level: entry.level ?? fallback.level, message: entry.message ?? fallback.message } : fallback
	}

	private shapeErr(e: Error): { name: string, message: string, stack?: string } {
		return { name: e.name, message: e.message, stack: e.stack }
	}

	private buildError(key: string, message: string, opts: { helpUrl?: string, name?: string, context?: DiagnosticErrorContext }): BaseError {
		const { helpUrl, name, context } = opts
		const orkLike = /^ORK\d{4}$/.test(key) ? key : undefined
		const code = context?.code ?? orkLike ?? key
		const e = new BaseError(message, code, helpUrl)
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
