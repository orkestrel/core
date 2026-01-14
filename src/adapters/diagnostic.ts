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

// Base error enriched with optional diagnostic code and help URL.
class BaseError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
		public readonly helpUrl?: string,
	) { super(message) }
}

// Aggregate error for lifecycle operations enriched with details and original errors.
class AggregateDiagnosticError extends Error {
	constructor(
		message: string,
		public readonly details: readonly LifecycleErrorDetail[],
		public readonly errors: readonly Error[],
		public readonly code?: string,
		public readonly helpUrl?: string,
	) { super(message) }
}

/**
 * Diagnostic adapter providing safe logging, error reporting, and telemetry.
 *
 * Acts as a delegator to a LoggerPort with keyed message overrides for consistent
 * log levels and messages. Provides methods for logging (log), error reporting (error),
 * error construction and throwing (fail), building errors without throwing (help),
 * aggregating lifecycle errors (aggregate), and telemetry (metric/trace/event).
 *
 * Never throws from safe methods (log, error, metric, trace, event). Only fail() and
 * aggregate() throw errors after logging them.
 *
 * @example
 * ```ts
 * import { DiagnosticAdapter, ORCHESTRATOR_MESSAGES } from '@orkestrel/core'
 *
 * const diag = new DiagnosticAdapter({ messages: ORCHESTRATOR_MESSAGES })
 * diag.log('info', 'orchestrator.phase', { phase: 'start' })
 *
 * // Build and throw an error with a code
 * try {
 *   diag.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
 * } catch (e) {
 *   const error = e as Error & { code?: string }
 *   console.error('Caught:', error.code, error.message)
 * }
 *
 * // Aggregate multiple errors
 * const errors = [new Error('task1 failed'), new Error('task2 failed')]
 * try {
 *   diag.aggregate('ORK1017', errors, { scope: 'orchestrator', message: 'Errors during destroy' })
 * } catch (e) {
 *   // e is an AggregateLifecycleError with .details and .errors
 * }
 * ```
 */
export class DiagnosticAdapter implements DiagnosticPort {
	readonly #logger: LoggerPort
	readonly #messages: ReadonlyMap<string, MessageMapEntry>

	/**
	 * Construct a DiagnosticAdapter with optional logger and message overrides.
	 *
	 * @param options - Configuration options:
	 * - logger: Optional logger port for emitting log entries (default: LoggerAdapter)
	 * - messages: Array of diagnostic messages with keys, levels, and message templates
     *
	 */
	constructor(options?: DiagnosticAdapterOptions) {
		this.#logger = options?.logger ?? new LoggerAdapter()
		const m = new Map<string, MessageMapEntry>()
		for (const d of options?.messages ?? []) m.set(d.key, { level: d.level, message: d.message })
		this.#messages = m
	}

	/**
	 * Access the logger port used by this diagnostic adapter.
	 *
	 * @returns The configured LoggerPort instance
	 */
	get logger(): LoggerPort { return this.#logger }

	/**
	 * Write a log entry with a level, message key, and optional structured fields.
	 *
	 * @param level - Fallback log level when the key is not found in the message map
	 * @param message - Message key or literal message string
	 * @param fields - Optional structured data to include with the log entry
	 * @returns void (logs the message if possible)
     *
	 * @example
	 * ```ts
	 * diag.log('info', 'orchestrator.phase', { phase: 'start', layer: 1 })
	 * ```
	 */
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		const resolved = this.#resolve(message, { level, message })
		this.#emit(resolved.level ?? level, resolved.message ?? message, fields)
	}

	/**
	 * Report an error to the logger with optional context fields.
	 *
	 * @param err - Error instance or value to report
	 * @param context - Optional structured context including code, scope, and extra fields
	 * @returns void (reports the error safely)
     *
	 * @example
	 * ```ts
	 * diag.error(new Error('boom'), { scope: 'orchestrator', code: 'ORK1013' })
	 * ```
	 */
	error(err: unknown, context: DiagnosticErrorContext = {}): void {
		const e = err instanceof Error ? err : new Error(String(err))
		const key = String(context.code ?? e.name ?? 'error')
		const resolved = this.#resolve(key, { level: 'error', message: e.message })
		this.#emit(resolved.level ?? 'error', resolved.message ?? e.message, { err: this.#shapeErr(e), ...context })
	}

	/**
	 * Build an Error using a key/code, log it, and throw it.
	 *
	 * @param key - Code or message key (e.g., 'ORK1007') used to resolve message and severity
	 * @param context - Optional structured context including message override, helpUrl, name, and scope
	 * @throws Error with optional .code and .helpUrl properties
     *
	 * @example
	 * ```ts
	 * diag.fail('ORK1007', { scope: 'orchestrator', message: 'Duplicate registration' })
	 * ```
	 */
	fail(key: string, context: (DiagnosticErrorContext & { message?: string; helpUrl?: string; name?: string }) = {}): never {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = overrideMsg ?? entry?.message ?? key
		const e = this.#buildError(key, msg, { helpUrl, name, context: rest })
		this.#emit(level, msg, { err: this.#shapeErr(e), ...rest, ...(e.code ? { code: e.code } : {}) })
		throw e
	}

	/**
	 * Build an Error using a key/code and return it (without throwing).
	 *
	 * @param key - Code or message key (e.g., 'ORK1010') used to resolve message and severity
	 * @param context - Optional structured context including message override, helpUrl, name, and scope
	 * @returns The constructed Error instance
     *
	 * @example
	 * ```ts
	 * const timeoutErr = diag.help('ORK1021', { message: 'Hook onStart timed out' })
	 * ```
	 */
	help(key: string, context: (DiagnosticErrorContext & { message?: string; helpUrl?: string; name?: string }) = {}): Error {
		const { message: overrideMsg, helpUrl, name, ...rest } = context
		const entry = this.#messages.get(key)
		const msg = overrideMsg ?? entry?.message ?? key
		return this.#buildError(key, msg, { helpUrl, name, context: rest })
	}

	/**
	 * Aggregate multiple errors into a single structured AggregateDiagnosticError and throw it.
	 *
	 * @param key - Code used to identify the aggregate error (e.g., 'ORK1016')
	 * @param errors - Array of Error instances to aggregate (or already-normalized details)
	 * @param context - Optional structured context including scope, message, helpUrl, and name
	 * @throws AggregateDiagnosticError containing details and errors
	 * @example
	 * ```ts
	 * const errs = [new Error('A'), new Error('B')]
	 * diag.aggregate('ORK1017', errs, { scope: 'orchestrator' })
	 * ```
	 */
	aggregate(key: string, errors: readonly (LifecycleErrorDetail | Error)[], context: (DiagnosticErrorContext & { message?: string; helpUrl?: string; name?: string }) = {}): never {
		const details = this.#normalizeAggregateDetails(errors)
		const entry = this.#messages.get(key)
		const level = entry?.level ?? 'error'
		const msg = (context.message ?? entry?.message ?? key)
		const code = context.code ?? (/^ORK\d{4}$/.test(key) ? key : key)
		const agg = new AggregateDiagnosticError(msg, details, details.map(d => d.error), code, context.helpUrl)
		this.#emit(level, msg, { err: this.#shapeErr(agg), ...context, details })
		throw agg
	}

	/**
	 * Emit a metric with a numeric value and optional tags.
	 *
	 * @param name - Metric name (e.g., 'queue.size')
	 * @param value - Numeric value to record
	 * @param tags - Optional tags to include with the metric
	 *
     * @example
	 * ```ts
	 * diag.metric('queue.size', 42, { queueName: 'tasks' })
	 * ```
	 */
	metric(name: string, value: number, tags?: Record<string, string | number | boolean>): void {
		const resolved = this.#resolve(name, { level: 'info', message: name })
		const fields = { value, ...(tags ?? {}) }
		this.#emit(resolved.level ?? 'info', resolved.message ?? name, fields)
	}

	/**
	 * Emit a trace span with a name and optional fields.
	 *
	 * @param name - Span name (e.g., 'orchestrator.start')
	 * @param payload - Optional structured fields for the trace
	 * @returns void (emits a trace entry)
     *
	 * @example
	 * ```ts
	 * diag.trace('lifecycle.transition', { from: 'created', to: 'started' })
	 * ```
	 */
	trace(name: string, payload?: Record<string, unknown>): void {
		const resolved = this.#resolve(name, { level: 'debug', message: name })
		this.#emit(resolved.level ?? 'debug', resolved.message ?? name, payload)
	}

	/**
	 * Emit a telemetry event with a name and payload.
	 *
	 * @param name - Event name (e.g., 'lifecycle.transition')
	 * @param payload - Arbitrary event payload
     * @returns void (emits an event entry)
     *
	 * @example
	 * ```ts
	 * diag.event('orchestrator.component.start', { token: 'Database' })
	 * ```
	 */
	event(name: string, payload?: Record<string, unknown>): void {
		const resolved = this.#resolve(name, { level: 'info', message: name })
		this.#emit(resolved.level ?? 'info', resolved.message ?? name, payload)
	}

	// Emit to the underlying logger using level-specific methods.
	#emit(level: LogLevel, message: string, payload?: unknown): void {
		try {
			if (level === 'debug') safeInvoke(this.#logger.debug.bind(this.#logger), message, payload)
			else if (level === 'info') safeInvoke(this.#logger.info.bind(this.#logger), message, payload)
			else if (level === 'warn') safeInvoke(this.#logger.warn.bind(this.#logger), message, payload)
			else safeInvoke(this.#logger.error.bind(this.#logger), message, payload)
		}
		catch {
			// swallow - safeInvoke already swallows but be defensive
		}
	}

	#resolve(key: string, fallback: MessageMapEntry): MessageMapEntry {
		const entry = this.#messages.get(key)
		return entry ? { level: entry.level ?? fallback.level, message: entry.message ?? fallback.message } : fallback
	}

	#buildError(key: string, message: string, opts: { helpUrl?: string; name?: string; context?: DiagnosticErrorContext }): BaseError {
		const { helpUrl, name, context } = opts
		const code = context?.code ?? (/^ORK\d{4}$/.test(key) ? key : key)
		const e = new BaseError(message, code, helpUrl)
		if (name) e.name = name
		return e
	}

	#normalizeAggregateDetails(items: readonly (LifecycleErrorDetail | Error)[]): LifecycleErrorDetail[] {
		const out: LifecycleErrorDetail[] = []
		for (const it of items) {
			if (it instanceof Error) {
				out.push({ tokenDescription: 'unknown', phase: 'destroy', context: 'normal', timedOut: false, durationMs: 0, error: it })
			}
			else {
				out.push(it)
			}
		}
		return out
	}

	#shapeErr(e: Error): { name: string; message: string; stack?: string } {
		return { name: e.name, message: e.message, stack: e.stack }
	}
}
