import type { LogLevel, LoggerPort } from '../types.js'

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

export class NoopLogger implements LoggerPort {
	log(_level: LogLevel, _message: string, _fields?: Record<string, unknown>): void {
		// intentionally no-op
	}
}
