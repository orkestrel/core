import type { LogLevel, LoggerPort } from '../types.js'

/**
 * LoggerAdapter: minimal console-backed LoggerPort implementation.
 * - Routes by level to console.debug/info/warn/error.
 * - Swallows any console errors to avoid cascading failures.
 */
export class LoggerAdapter implements LoggerPort {
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
	log(_level: LogLevel, _message: string, _fields?: Record<string, unknown>): void {
		// intentionally no-op
	}
}
