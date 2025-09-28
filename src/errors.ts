export class LifecycleError extends Error {
	constructor(message: string, public readonly cause?: unknown) {
		super(message)
		this.name = 'LifecycleError'
		Object.setPrototypeOf(this, new.target.prototype)
	}
}

export class InvalidTransitionError extends LifecycleError {
	constructor(public readonly from: string, public readonly to: string) {
		super(`Invalid lifecycle transition from '${from}' to '${to}'`)
		this.name = 'InvalidTransitionError'
	}
}

export class TimeoutError extends LifecycleError {
	constructor(public readonly hook: string, public readonly ms: number) {
		super(`Lifecycle hook '${hook}' timed out after ${ms}ms`)
		this.name = 'TimeoutError'
	}
}

// Telemetry types for aggregated lifecycle operations
export type LifecyclePhase = 'start' | 'stop' | 'destroy'
export type LifecycleContext = 'normal' | 'rollback' | 'container'
export interface LifecycleErrorDetail {
	tokenDescription: string
	tokenKey?: symbol
	phase: LifecyclePhase
	context: LifecycleContext
	timedOut: boolean
	durationMs: number
	error: Error
}

export class AggregateLifecycleError extends LifecycleError {
	public readonly errors: Error[]
	public readonly details: LifecycleErrorDetail[]
	constructor(message: string, detailsOrErrors: LifecycleErrorDetail[] | Error[]) {
		const details = detailsOrErrors.map((e: LifecycleErrorDetail | Error): LifecycleErrorDetail => {
			if (e instanceof Error) {
				return {
					tokenDescription: 'unknown',
					phase: 'start',
					context: 'normal',
					timedOut: false,
					durationMs: 0,
					error: e,
				}
			}
			return e
		})
		super(message, details[0]?.error)
		this.name = 'AggregateLifecycleError'
		this.details = details
		this.errors = details.map(d => d.error)
	}
}
