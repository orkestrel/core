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

export class AggregateLifecycleError extends LifecycleError {
	constructor(message: string, public readonly errors: Error[]) {
		super(message, errors[0])
		this.name = 'AggregateLifecycleError'
	}
}
