import type { LogLevel, LoggerInterface } from '../types.js'

/**
 * Console-like logger adapter.
 *
 * Provides per-level methods (debug, info, warn, error) similar to console,
 * plus a compatibility `log(level, message, fields?)` method.
 *
 * All methods accept a message string and optional args. When the first extra
 * arg is an object it will be treated as structured fields and logged along
 * with the message.
 *
 * @example
 * ```ts
 * const lg = new LoggerAdapter()
 * lg.info('started', { env: 'dev' })
 * ```
 */
export class LoggerAdapter implements LoggerInterface {
	/**
	 * Debug-level log.
	 *
	 * A short debug message; additional args may include a fields object.
	 *
	 * @param message - Human readable message to log
	 * @param args - Optional extra arguments or a fields object
	 * @returns void
	 * @example
	 * ```ts
	 * logger.debug('initialized', { port: 3000 })
	 * ```
	 */
	debug(message: string, ...args: unknown[]): void {
		const payload = this.#buildPayload(message, args)
		this.#safeConsoleCall('debug', payload)
	}

	/**
	 * Info-level log.
	 *
	 * Informational message for normal operations.
	 *
	 * @param message - Human readable message to log
	 * @param args - Optional extra arguments or a fields object
	 * @returns void
	 * @example
	 * ```ts
	 * logger.info('listening', { host: '0.0.0.0' })
	 * ```
	 */
	info(message: string, ...args: unknown[]): void {
		const payload = this.#buildPayload(message, args)
		this.#safeConsoleCall('info', payload)
	}

	/**
	 * Warn-level log.
	 *
	 * Non-fatal warning indicating a potential issue.
	 *
	 * @param message - Human readable message to log
	 * @param args - Optional extra arguments or a fields object
	 * @returns void
	 * @example
	 * ```ts
	 * logger.warn('slow-response', { ms: 1024 })
	 * ```
	 */
	warn(message: string, ...args: unknown[]): void {
		const payload = this.#buildPayload(message, args)
		this.#safeConsoleCall('warn', payload)
	}

	/**
	 * Error-level log.
	 *
	 * @param message - Human readable message to log
	 * @param args - Optional extra arguments or a fields object
	 * @returns void
	 * @example
	 * ```ts
	 * logger.error('failed', { err })
	 * ```
	 */
	error(message: string, ...args: unknown[]): void {
		const payload = this.#buildPayload(message, args)
		this.#safeConsoleCall('error', payload)
	}

	/**
	 * Generic log method for compatibility with LoggerPort interface. The
	 * optional fields parameter is supported for existing callers.
	 *
	 * @param level - Log level to use
	 * @param message - Message to log
	 * @param fields - Optional structured fields object
	 * @returns void
	 * @example
	 * ```ts
	 * logger.log('info', 'app.started', { version: '1.0' })
	 * ```
	 */
	log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
		// Normalize to the per-level methods so behavior is consistent.
		if (level === 'debug') this.debug(message, fields)
		else if (level === 'info') this.info(message, fields)
		else if (level === 'warn') this.warn(message, fields)
		else this.error(message, fields)
	}

	// Build a payload object combining the message and optional structured fields.
	#buildPayload(message: string, args: unknown[]): unknown {
		const first = args[0]
		if (first && typeof first === 'object' && !Array.isArray(first)) {
			const fields: Record<string, unknown> = {}
			for (const [k, v] of Object.entries(first)) {
				fields[k] = v
			}
			return { msg: message, ...fields }
		}
		if (args.length > 0) return [message, ...args]
		return message
	}

	// Internal helper to call console methods safely.
	#safeConsoleCall(level: LogLevel, payload: unknown): void {
		try {
			if (level === 'debug') console.debug(payload)
			else if (level === 'info') console.info(payload)
			else if (level === 'warn') console.warn(payload)
			else console.error(payload)
		}
		catch {
			// swallow
		}
	}
}

/**
 * No-op logger that discards messages and exposes the same shape as LoggerAdapter.
 *
 * @example
 * ```ts
 * const n = new NoopLogger(); n.info('x')
 * ```
 */
export class NoopLogger implements LoggerInterface {
	/**
	 * No-op debug method.
	 *
	 * @param _message - ignored
	 * @param _args - ignored
	 * @returns void
	 * @example
	 * ```ts
	 * new NoopLogger().debug('x')
	 * ```
	 */
	debug(_message: string, ..._args: unknown[]): void { /* no-op */ }
	/**
	 * No-op info method.
	 *
	 * @param _message - ignored
	 * @param _args - ignored
	 * @returns void
	 * @example
	 * ```ts
	 * new NoopLogger().info('x')
	 * ```
	 */
	info(_message: string, ..._args: unknown[]): void { /* no-op */ }
	/**
	 * No-op warn method.
	 *
	 * @param _message - ignored
	 * @param _args - ignored
	 * @returns void
	 * @example
	 * ```ts
	 * new NoopLogger().warn('x')
	 * ```
	 */
	warn(_message: string, ..._args: unknown[]): void { /* no-op */ }
	/**
	 * No-op error method.
	 *
	 * @param _message - ignored
	 * @param _args - ignored
	 * @returns void
	 * @example
	 * ```ts
	 * new NoopLogger().error('x')
	 * ```
	 */
	error(_message: string, ..._args: unknown[]): void { /* no-op */ }
	/**
	 * No-op generic log method.
	 *
	 * @param _level - ignored
	 * @param _message - ignored
	 * @param _fields - ignored
	 * @returns void
	 * @example
	 * ```ts
	 * new NoopLogger().log('info', 'x')
	 * ```
	 */
	log(_level: LogLevel, _message: string, _fields?: Record<string, unknown>): void { /* no-op */ }
}

/**
 * Lightweight in-memory logger intended for tests.
 *
 * Implements the `LoggerPort` interface and captures log entries in-memory so
 * unit tests can assert on messages, levels and structured fields. This helper
 * mirrors the public surface of `LoggerAdapter` but is not intended for
 * production use.
 *
 * @example
 * ```ts
 * const lg = new FakeLogger()
 * lg.info('started', { env: 'test' })
 * // assert on captured entries
 * expect(lg.entries[0]).toMatchObject({ level: 'info', message: 'started', fields: { env: 'test' } })
 * ```
 */
export class FakeLogger implements LoggerInterface {
	public entries: { level: LogLevel; message: string; fields?: Record<string, unknown> }[] = []

	// Extract fields from payload using Object.entries to avoid type assertions.
	#extractFields(payload: unknown): Record<string, unknown> | undefined {
		if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
			const fields: Record<string, unknown> = {}
			for (const [k, v] of Object.entries(payload)) {
				fields[k] = v
			}
			return fields
		}
		return undefined
	}

	/**
	 * Capture a debug-level entry.
	 *
	 * @param message - Human readable message
	 * @param payload - Optional structured payload or extra args
	 * @returns void
	 * @example
	 * ```ts
	 * const lg = new FakeLogger()
	 * lg.debug('verbose', { key: 'value' })
	 * ```
	 */
	debug(message: string, payload?: unknown): void { this.entries.push({ level: 'debug', message, fields: this.#extractFields(payload) }) }

	/**
	 * Capture an info-level entry.
	 *
	 * @param message - Human readable message
	 * @param payload - Optional structured payload or extra args
	 * @returns void
	 * @example
	 * ```ts
	 * const lg = new FakeLogger()
	 * lg.info('started', { env: 'test' })
	 * ```
	 */
	info(message: string, payload?: unknown): void { this.entries.push({ level: 'info', message, fields: this.#extractFields(payload) }) }

	/**
	 * Capture a warn-level entry.
	 *
	 * @param message - Human readable message
	 * @param payload - Optional structured payload or extra args
	 * @returns void
	 * @example
	 * ```ts
	 * const lg = new FakeLogger()
	 * lg.warn('slow-response', { ms: 123 })
	 * ```
	 */
	warn(message: string, payload?: unknown): void { this.entries.push({ level: 'warn', message, fields: this.#extractFields(payload) }) }

	/**
	 * Capture an error-level entry.
	 *
	 * @param message - Human readable message
	 * @param payload - Optional structured payload or extra args
	 * @returns void
	 * @example
	 * ```ts
	 * const lg = new FakeLogger()
	 * lg.error('failed', { err: new Error('boom') })
	 * ```
	 */
	error(message: string, payload?: unknown): void { this.entries.push({ level: 'error', message, fields: this.#extractFields(payload) }) }

	/**
	 * Compatibility log method.
	 *
	 * @param level - Log level
	 * @param message - Human readable message
	 * @param fields - Optional structured fields
	 * @returns void
	 * @example
	 * ```ts
	 * const lg = new FakeLogger()
	 * lg.log('info', 'app.started', { version: '1.0' })
	 * ```
	 */
	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void { this.entries.push({ level, message, fields }) }
}
