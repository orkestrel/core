import type { DiagnosticErrorContext, LifecycleErrorDetail } from './types.js'

/**
 * Base error class for all Orkestrel errors.
 * Provides consistent error structure with optional diagnostic context.
 */
export class OrkestrelError extends Error {
	readonly code: string
	readonly helpUrl: string | undefined
	readonly context: DiagnosticErrorContext | undefined

	constructor(
		code: string,
		message: string,
		options?: { helpUrl?: string; context?: DiagnosticErrorContext; cause?: unknown },
	) {
		super(message, { cause: options?.cause })
		this.name = 'OrkestrelError'
		this.code = code
		this.helpUrl = options?.helpUrl
		this.context = options?.context
	}
}

/**
 * Error thrown when a required resource is not found.
 * Used by `resolve()` methods when lookup fails.
 */
export class NotFoundError extends OrkestrelError {
	readonly key: string | symbol

	constructor(
		code: string,
		message: string,
		key: string | symbol,
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'NotFoundError'
		this.key = key
	}
}

/**
 * Error thrown when a lifecycle transition is invalid.
 */
export class InvalidTransitionError extends OrkestrelError {
	readonly fromState: string
	readonly toState: string

	constructor(
		code: string,
		message: string,
		fromState: string,
		toState: string,
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'InvalidTransitionError'
		this.fromState = fromState
		this.toState = toState
	}
}

/**
 * Error thrown when a lifecycle hook times out.
 */
export class TimeoutError extends OrkestrelError {
	readonly timeoutMs: number

	constructor(
		code: string,
		message: string,
		timeoutMs: number,
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'TimeoutError'
		this.timeoutMs = timeoutMs
	}
}

/**
 * Error that aggregates multiple lifecycle errors.
 * Used when multiple components fail during a lifecycle phase.
 */
export class AggregateLifecycleError extends OrkestrelError {
	readonly details: readonly LifecycleErrorDetail[]
	readonly errors: readonly Error[]

	constructor(
		code: string,
		message: string,
		details: readonly LifecycleErrorDetail[],
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'AggregateLifecycleError'
		this.details = details
		this.errors = details.map(d => d.error)
	}
}

/**
 * Error thrown when a container is accessed after destruction.
 */
export class ContainerDestroyedError extends OrkestrelError {
	constructor(
		code: string,
		message: string,
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'ContainerDestroyedError'
	}
}

/**
 * Error thrown when a circular dependency is detected.
 */
export class CircularDependencyError extends OrkestrelError {
	readonly cycle: readonly string[]

	constructor(
		code: string,
		message: string,
		cycle: readonly string[],
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'CircularDependencyError'
		this.cycle = cycle
	}
}

/**
 * Error thrown when a duplicate registration is attempted.
 */
export class DuplicateRegistrationError extends OrkestrelError {
	readonly tokenDescription: string

	constructor(
		code: string,
		message: string,
		tokenDescription: string,
		options?: { helpUrl?: string; context?: DiagnosticErrorContext },
	) {
		super(code, message, options)
		this.name = 'DuplicateRegistrationError'
		this.tokenDescription = tokenDescription
	}
}
