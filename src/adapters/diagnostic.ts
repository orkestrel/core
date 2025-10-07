import type { DiagnosticAdapterOptions, DiagnosticErrorContext, DiagnosticPort, LogLevel, LoggerPort, MessageMapEntry } from '../types.js'

/**
 * Diagnostics adapter that delegates all output to a provided LoggerPort.
 * Uses a single keyed messages array for overriding level/message across
 * logs, metrics, traces, events, and errors.
 */
export class DiagnosticAdapter implements DiagnosticPort {
	private readonly logger: LoggerPort
	private readonly overrides: Readonly<Record<string, MessageMapEntry>>

	constructor(options: DiagnosticAdapterOptions) {
		this.logger = options.logger
		// Build an index from the provided messages array (later entries win on duplicate keys)
		const idx: Record<string, MessageMapEntry> = {}
		for (const m of options.messages ?? []) idx[m.key] = { level: m.level, message: m.message }
		this.overrides = idx
	}

	log(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
		const { level: lvl, message: msg } = this.lookup(message, { level, message })
		this.safe(() => this.logger.log(lvl ?? level, msg ?? message, fields))
	}

	error(err: unknown, context: DiagnosticErrorContext = {}): void {
		const e = err instanceof Error ? err : new Error(String(err))
		const key = context.code ?? e.name ?? 'error'
		const { level, message } = this.lookup(String(key), { level: 'error', message: e.message })
		this.safe(() => this.logger.log(level ?? 'error', message ?? e.message, { err: { name: e.name, message: e.message, stack: e.stack }, ...context }))
	}

	metric(name: string, value: number, tags: Record<string, string | number | boolean> = {}): void {
		const { level, message } = this.lookup(name, { level: 'info', message: name })
		this.safe(() => this.logger.log(level ?? 'info', message ?? name, { value, ...tags }))
	}

	trace(name: string, payload: Record<string, unknown> = {}): void {
		const { level, message } = this.lookup(name, { level: 'debug', message: name })
		this.safe(() => this.logger.log(level ?? 'debug', message ?? name, payload))
	}

	event(name: string, payload: Record<string, unknown> = {}): void {
		const { level, message } = this.lookup(name, { level: 'info', message: name })
		this.safe(() => this.logger.log(level ?? 'info', message ?? name, payload))
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
