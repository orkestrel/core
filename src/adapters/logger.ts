import type { LogLevel, LoggerPort } from '../types.js'

/**
 * Minimal console-backed logger implementation that routes log messages by level.
 *
 * Routes log messages to the appropriate console method based on level (debug/info/warn/error).
 * Swallows any console errors to avoid cascading failures.
 *
 * @example
 * ```ts
 * import { LoggerAdapter } from '@orkestrel/core'
 * const logger = new LoggerAdapter()
 * logger.log('info', 'Application started', { version: '1.0.0', user: 'alice' })
 * logger.log('error', 'Failed to connect', { retries: 3 })
 * ```
 */
export class LoggerAdapter implements LoggerPort {
	/**
	 * Log a message with the specified level and optional structured fields.
	 *
	 * @param level - Log level: 'debug', 'info', 'warn', or 'error'
	 * @param message - Human-readable log message
	 * @param fields - Optional structured data to include with the log entry
	 * @returns void (writes to console methods)
	 *
	 * @example
	 * ```ts
	 * logger.log('info', 'User logged in', { userId: '123', sessionId: 'abc' })
	 * ```
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
 * Silent logger implementation that discards all log messages.
 *
 * Useful for tests or when you need to disable logging entirely without changing code.
 *
 * @example
 * ```ts
 * import { NoopLogger } from '@orkestrel/core'
 * const logger = new NoopLogger()
 * logger.log('info', 'This will not be logged')
 * ```
 */
export class NoopLogger implements LoggerPort {
	/**
	 * No-op log method that intentionally does nothing with log messages.
	 *
	 * @param _level - Log level (ignored)
	 * @param _message - Log message (ignored)
	 * @param _fields - Optional fields (ignored)
	 * @returns void
	 */
	log(_level: LogLevel, _message: string, _fields?: Record<string, unknown>): void {
		// intentionally no-op
	}
}
