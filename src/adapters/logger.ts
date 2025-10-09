import type { LogLevel, LoggerPort } from '../types.js'

/**
 * LoggerAdapter: minimal console-backed LoggerPort implementation.
 * - Routes by level to console.debug/info/warn/error.
 * - Swallows any console errors to avoid cascading failures.
 *
 * Example
 * -------
 * ```ts
 * const logger = new LoggerAdapter()
 * logger.log('info', 'hello', { user: 'alice' })
 * ```
 */
export class LoggerAdapter implements LoggerPort {
	/**
	 *
	 * @param level
	 * @param message
	 * @param fields
	 * @returns -
	 * @example
	 */
	log(level: LogLevel, message: string, fields: Record<string, unknown> = {}): void {
		const payload = { msg: message, ...fields }
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
 * NoopLogger: silent LoggerPort useful in tests or to disable logs.
 */
export class NoopLogger implements LoggerPort {
	/**
	 *
	 * @param _level
	 * @param _message
	 * @param _fields
	 * @returns -
	 * @example
	 */
	log(_level: LogLevel, _message: string, _fields?: Record<string, unknown>): void {
		// intentionally no-op
	}
}
